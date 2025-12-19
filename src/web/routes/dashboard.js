const express = require('express');
const router = express.Router();
const GuildConfig = require('../../models/GuildConfig');

/**
 * MIDDLEWARE: isAuthenticated
 * Ensures the user is logged in before accessing dashboard routes.
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

/**
 * GET /dashboard
 * The main landing page showing all servers the user manages.
 */
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    try {
        // Filter: Show only servers where user has Manage Server (0x20) or Administrator (0x8)
        const managedGuilds = req.user.guilds.filter(guild => {
            const perms = BigInt(guild.permissions);
            const canManage = (perms & BigInt(0x20)) === BigInt(0x20);
            const isAdmin = (perms & BigInt(0x8)) === BigInt(0x8);
            return canManage || isAdmin;
        });

        res.render('dashboard/index', {
            user: req.user,
            guilds: managedGuilds,
            client: client
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * GET /dashboard/server/:guildId
 * The specific settings page for one server.
 */
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(guildId);

    // If the bot isn't in the server, redirect back
    if (!guild) return res.redirect('/dashboard');

    // Security check: Ensure the user actually has permissions for THIS specific server
    const userGuild = req.user.guilds.find(g => g.id === guildId);
    if (!userGuild) return res.redirect('/dashboard');
    
    const perms = BigInt(userGuild.permissions);
    if (!((perms & BigInt(0x20)) === BigInt(0x20) || (perms & BigInt(0x8)) === BigInt(0x8))) {
        return res.status(403).send('Unauthorized');
    }

    try {
        // Find existing config or create a default one if it doesn't exist
        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
            config = await GuildConfig.create({ guildId, prefix: ',' });
        }

        res.render('dashboard/server', {
            user: req.user,
            guild: guild,
            config: config // This allows the EJS to show current saved settings
        });
    } catch (error) {
        console.error('Error loading server settings:', error);
        res.status(500).send('Error loading settings');
    }
});

/**
 * POST /dashboard/server/:guildId/save
 * Receives data from the settings form and saves it to MongoDB.
 */
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    
    // Checkbox logic: If unchecked, it's missing from req.body
    const levelingEnabled = req.body.levelingEnabled === 'on';

    try {
        // The core "Remembering" logic: findOneAndUpdate with upsert
        await GuildConfig.findOneAndUpdate(
            { guildId: guildId },
            { 
                prefix: req.body.prefix,
                levelingEnabled: levelingEnabled,
                xpRate: parseFloat(req.body.xpRate) || 1.0,
                embedColor: req.body.embedColor || '#5865f2'
            },
            { upsert: true, new: true }
        );

        // Redirect back with a success parameter for the UI alert
        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (error) {
        console.error('Database Save Error:', error);
        res.status(500).send('Failed to save settings to database.');
    }
});

module.exports = router;
