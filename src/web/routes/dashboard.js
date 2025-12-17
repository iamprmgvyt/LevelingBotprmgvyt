const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database'); // FIXED IMPORT

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// Main Dashboard List
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

// Specific Server Settings
router.get('/:guildId', isAuthenticated, async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const guild = client.guilds.cache.get(req.params.guildId);

        if (!guild) return res.status(404).send("Bot is not in this server.");

        // This call will now work perfectly
        const config = await getGuildConfig(req.params.guildId);

        res.render('guildConfig', { user: req.user, guild, config });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
