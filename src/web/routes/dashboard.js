const express = require('express');
const router = express.Router(); // Fixed: Added the router definition
const GuildConfig = require('../../models/GuildConfig');

// Middleware: Ensures only logged-in users access this
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

// GET /dashboard - List servers
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    try {
        const managedGuilds = req.user.guilds.filter(guild => {
            const perms = BigInt(guild.permissions);
            return (perms & BigInt(0x8)) === BigInt(0x8) || (perms & BigInt(0x20)) === BigInt(0x20);
        });
        res.render('dashboard/index', { user: req.user, guilds: managedGuilds, client });
    } catch (err) { res.status(500).send('Dashboard Error'); }
});

// GET /dashboard/server/:guildId - Settings page
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    try {
        let config = await GuildConfig.findOne({ guildId }) || await GuildConfig.create({ guildId, prefix: ',' });
        res.render('dashboard/server', { user: req.user, guild, config });
    } catch (err) { res.status(500).send('Settings Error'); }
});

// POST /dashboard/server/:guildId/save - Save settings
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    try {
        await GuildConfig.findOneAndUpdate(
            { guildId },
            { 
                prefix: req.body.prefix, 
                levelingEnabled: req.body.levelingEnabled === 'on',
                xpRate: parseFloat(req.body.xpRate) || 1.0,
                embedColor: req.body.embedColor
            },
            { upsert: true, new: true }
        );
        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (err) { res.status(500).send('Save Error'); }
});

module.exports = router;
