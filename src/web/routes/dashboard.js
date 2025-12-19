const express = require('express');
const router = express.Router();
const GuildConfig = require('../../models/GuildConfig');

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

// 1. MAIN DASHBOARD (List of Servers)
// Access via: /dashboard
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    try {
        // Filter for servers where user is Admin or has Manage Server perms
        const managedGuilds = req.user.guilds.filter(guild => {
            const perms = BigInt(guild.permissions);
            return (perms & BigInt(0x8)) === BigInt(0x8) || (perms & BigInt(0x20)) === BigInt(0x20);
        });

        res.render('dashboard/index', {
            user: req.user,
            guilds: managedGuilds,
            client: client
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// 2. SERVER SETTINGS PAGE (The one you were missing!)
// Access via: /dashboard/server/[ID]
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    
    // Check if the bot is actually in that server
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).send('Bot is not in this server.');

    try {
        // Find existing config or create default
        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
            config = await GuildConfig.create({ guildId, prefix: ',' });
        }

        res.render('dashboard/server', {
            user: req.user,
            guild: guild,
            config: config
        });
    } catch (error) {
        console.error('Settings Load Error:', error);
        res.status(500).send('Error loading server settings');
    }
});

// 3. SAVE SETTINGS (POST)
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const levelingEnabled = req.body.levelingEnabled === 'on';

    try {
        await GuildConfig.findOneAndUpdate(
            { guildId },
            { 
                prefix: req.body.prefix,
                levelingEnabled: levelingEnabled,
                xpRate: parseFloat(req.body.xpRate),
                embedColor: req.body.embedColor
            },
            { upsert: true, new: true }
        );

        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (error) {
        res.status(500).send('Error saving settings');
    }
});

module.exports = router;
