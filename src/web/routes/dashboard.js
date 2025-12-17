const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// 1. Server List
router.get('/', isAuthenticated, (req, res) => {
    const client = req.app.get('discordClient');
    const guilds = req.user.guilds.filter(g => {
        const perms = new PermissionsBitField(BigInt(g.permissions));
        return perms.has(PermissionsBitField.Flags.Administrator);
    }).map(g => ({
        ...g,
        inBot: client.guilds.cache.has(g.id)
    }));

    res.render('dashboard', { user: req.user, guilds });
});

// 2. Specific Guild Settings (Safety Fixed)
router.get('/:guildId', isAuthenticated, async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const guild = client.guilds.cache.get(req.params.guildId);

        if (!guild) {
            return res.status(404).send("Bot is not in this server. Invite it first!");
        }

        // Fetch config. If it doesn't exist, getGuildConfig should return a default object.
        let config = await getGuildConfig(req.params.guildId);
        
        // Ensure properties exist so EJS doesn't crash
        if (!config) config = { prefix: '!', levelingEnabled: true };

        res.render('guildConfig', { user: req.user, guild, config });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Internal Server Error: Check console logs.");
    }
});

module.exports = router;
