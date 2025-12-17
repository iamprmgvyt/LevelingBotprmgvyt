const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

// --- Helper Functions ---

const getManageableGuilds = (req, userGuilds) => {
    // Access client via the app instance to avoid circular require issues
    const client = req.app.get('discordClient'); 
    
    return userGuilds
        .filter(guild => {
            // Check if user is Administrator (0x8)
            const permissions = new PermissionsBitField(BigInt(guild.permissions));
            return permissions.has(PermissionsBitField.Flags.Administrator);
        })
        .map(guild => {
            const botGuild = client.guilds.cache.get(guild.id);
            return {
                ...guild,
                inBot: !!botGuild,
                iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
            };
        });
};

// --- Middleware ---
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// --- Routes ---

// 1. Dashboard Home (Guild Selection)
router.get('/', isAuthenticated, (req, res) => {
    const manageableGuilds = getManageableGuilds(req, req.user.guilds);
    res.render('dashboard', {
        user: req.user,
        guilds: manageableGuilds
    });
});

// 2. Guild Configuration Page
router.get('/:guildId', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    const guildId = req.params.guildId;
    
    // Permission Check
    const targetGuild = req.user.guilds.find(g => g.id === guildId);
    if (!targetGuild || !getManageableGuilds(req, [targetGuild]).length) {
        return res.status(403).send("You don't have permission for this server.");
    }

    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) return res.send("Bot is not in this server! <a href='/'>Invite it</a>");

    try {
        const config = await getGuildConfig(guildId);
        
        // Prepare data for the template
        const roleRewards = (config.roleRewards || [])
            .map(r => ({ level: r.level, role: botGuild.roles.cache.get(r.roleId) }))
            .filter(r => r.role);

        res.render('guildConfig', {
            user: req.user,
            guild: targetGuild,
            config: config,
            roleRewards: roleRewards,
            // Pass simple lists for the UI
            channels: botGuild.channels.cache.filter(c => c.type === 0), 
            roles: botGuild.roles.cache.filter(r => r.name !== '@everyone')
        });
    } catch (error) {
        res.status(500).send("Database Error");
    }
});

module.exports = router;
