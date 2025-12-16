const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');
const { isAdmin } = require('../middleware/auth'); // We will define this next
const client = require('../../../index').client; // Access the Discord Client instance

// --- Helper Functions ---

/**
 * Filter and augment the user's guilds list with bot membership and admin status.
 * @param {Array<Object>} userGuilds - Guilds fetched from Discord API for the logged-in user.
 * @returns {Array<Object>} Filtered list of guilds the user can manage.
 */
const getManageableGuilds = (userGuilds) => {
    const guilds = userGuilds
        .filter(guild => {
            // Only show guilds the user has the Administrator permission in
            const permissions = new PermissionsBitField(BigInt(guild.permissions));
            return permissions.has(PermissionsBitField.Flags.Administrator);
        })
        .map(guild => {
            const botGuild = client.guilds.cache.get(guild.id);
            return {
                ...guild,
                inBot: !!botGuild, // Is the bot a member of this guild?
                iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
            };
        });

    return guilds;
};


// --- Middleware to Check Authentication ---
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/discord'); // Redirect to login if not authenticated
}


// --- Routes ---

// 1. Landing Page
router.get('/', (req, res) => {
    res.render('index', { 
        user: req.user // req.user is populated by Passport if authenticated
    });
});

// 2. Dashboard Home (Guild Selection)
router.get('/dashboard', isAuthenticated, (req, res) => {
    const manageableGuilds = getManageableGuilds(req.user.guilds);
    
    res.render('dashboard', {
        user: req.user,
        guilds: manageableGuilds
    });
});

// 3. Guild Configuration Page
router.get('/dashboard/:guildId', isAuthenticated, async (req, res) => {
    const guildId = req.params.guildId;
    const userGuilds = req.user.guilds;

    // A. Check if user is admin of the requested guild
    const targetGuild = userGuilds.find(g => g.id === guildId);
    if (!targetGuild || !getManageableGuilds([targetGuild]).length) {
        return res.status(403).render('error', { user: req.user, message: 'You do not have permission to manage this guild.' });
    }

    // B. Check if bot is in the guild
    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) {
        return res.status(404).render('error', { user: req.user, message: 'The bot is not in this guild. Invite it first!' });
    }

    try {
        // C. Fetch the guild configuration and other data
        const config = await getGuildConfig(guildId);
        
        // Prepare role rewards list
        const roleRewards = config.roleRewards
            .map(r => ({
                level: r.level,
                role: botGuild.roles.cache.get(r.roleId)
            }))
            .filter(r => r.role) // Filter out deleted roles
            .sort((a, b) => a.level - b.level);

        // Prepare blacklist lists
        const blacklistedChannels = config.blacklistedChannels
            .map(id => botGuild.channels.cache.get(id))
            .filter(c => c && c.type === 0); // Filter out deleted/non-text channels
            
        const blacklistedRoles = config.blacklistedRoles
            .map(id => botGuild.roles.cache.get(id))
            .filter(r => r); // Filter out deleted roles


        res.render('guildConfig', {
            user: req.user,
            guild: targetGuild,
            botGuild: botGuild, // Discord.js Guild object
            config: config,     // MongoDB GuildConfig object
            roleRewards: roleRewards,
            blacklistedChannels: blacklistedChannels,
            blacklistedRoles: blacklistedRoles
        });

    } catch (error) {
        console.error(`Error loading guild configuration for ${guildId}:`, error);
        res.status(500).render('error', { user: req.user, message: 'An error occurred while fetching the guild configuration.' });
    }
});

// 4. API Endpoint for Configuration Updates (POST)
// We only need one example here for the structure
router.post('/dashboard/:guildId/update', isAuthenticated, async (req, res) => {
    const guildId = req.params.guildId;
    const targetGuild = req.user.guilds.find(g => g.id === guildId);

    // Basic permission check (must be admin)
    if (!targetGuild || !getManageableGuilds([targetGuild]).length) {
        return res.status(403).send({ success: false, message: 'Permission denied.' });
    }

    // Example update logic (e.g., updating XP Rate)
    const { xpRate, levelingEnabled, prefix } = req.body;
    
    try {
        const config = await getGuildConfig(guildId);

        if (xpRate) {
            const rate = parseFloat(xpRate);
            if (!isNaN(rate) && rate > 0) {
                config.xpRate = rate;
            }
        }
        
        if (levelingEnabled !== undefined) {
             config.levelingEnabled = (levelingEnabled === 'true' || levelingEnabled === true);
        }

        if (prefix) {
             config.prefix = prefix.substring(0, 5); // Limit prefix length
        }

        await config.save();
        res.send({ success: true, message: 'Configuration updated successfully!' });

    } catch (error) {
        console.error(`Error updating config for ${guildId}:`, error);
        res.status(500).send({ success: false, message: 'Server error during update.' });
    }
});

module.exports = router;