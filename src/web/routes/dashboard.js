const express = require('express');
const router = express.Router();
const UserLevel = require('../../models/UserLevel');
const { getGuildConfig } = require('../../utils/database');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

// 1. MAIN DASHBOARD PAGE (List of Servers)
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    // Filter servers where the user has 'Manage Guild' or 'Administrator' permissions
    const guilds = req.user.guilds.filter(guild => {
        const permissions = BigInt(guild.permissions);
        return (permissions & BigInt(0x20)) === BigInt(0x20) || (permissions & BigInt(0x8)) === BigInt(0x8);
    });

    res.render('dashboard/index', {
        user: req.user,
        guilds: guilds,
        client: client
    });
});

// 2. SERVER SETTINGS PAGE
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        return res.redirect('https://discord.com/api/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot');
    }

    try {
        const config = await getGuildConfig(guildId);
        const topUsers = await UserLevel.find({ guildId }).sort({ xp: -1 }).limit(5);

        res.render('dashboard/server', {
            user: req.user,
            guild: guild,
            config: config,
            topUsers: topUsers
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 3. SAVE SETTINGS (POST)
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const { prefix, levelingEnabled, xpRate, embedColor } = req.body;

    try {
        const config = await getGuildConfig(guildId);
        
        config.prefix = prefix || config.prefix;
        config.levelingEnabled = levelingEnabled === 'on';
        config.xpRate = parseFloat(xpRate) || 1.0;
        config.embedColor = embedColor || config.embedColor;

        await config.save();
        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).send('Error saving configuration');
    }
});

module.exports = router;
