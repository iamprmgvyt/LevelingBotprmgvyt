const express = require('express');
const router = express.Router(); // This line fixes your error!
const GuildConfig = require('../../models/GuildConfig');

/**
 * MIDDLEWARE: isAuthenticated
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

/**
 * GET /dashboard - Main list of servers
 */
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    try {
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
        res.status(500).send('Internal Server Error');
    }
});

/**
 * GET /dashboard/server/:guildId - Specific settings page
 */
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(guildId);

    if (!guild) return res.redirect('/dashboard');

    try {
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
        res.status(500).send('Error loading settings');
    }
});

/**
 * POST /dashboard/server/:guildId/save - Saving data
 */
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const levelingEnabled = req.body.levelingEnabled === 'on';

    try {
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

        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (error) {
        res.status(500).send('Error saving settings');
    }
});

module.exports = router;
