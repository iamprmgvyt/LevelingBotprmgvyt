const express = require('express');
const router = express.Router();
const UserLevel = require('../../models/UserLevel');
const GuildConfig = require('../../models/GuildConfig');

// Middleware to protect the route
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

// This handles: GET /dashboard
router.get('/', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    try {
        // Filter guilds where the user has Manage Server (0x20) or Admin (0x8) permissions
        const managedGuilds = req.user.guilds.filter(guild => {
            const perms = BigInt(guild.permissions);
            return (perms & BigInt(0x20)) === BigInt(0x20) || (perms & BigInt(0x8)) === BigInt(0x8);
        });

        res.render('dashboard/index', {
            user: req.user,
            guilds: managedGuilds,
            client: client
        });
    } catch (error) {
        console.error('Dashboard Load Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Other routes like /server/:guildId follow below...
module.exports = router;
