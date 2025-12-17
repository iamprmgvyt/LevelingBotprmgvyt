const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// 1. Dashboard Main List
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

// 2. Server Configuration Page (FIXED)
router.get('/:guildId', isAuthenticated, async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const guild = client.guilds.cache.get(req.params.guildId);

        if (!guild) return res.status(404).send("Bot not in server.");

        const config = await getGuildConfig(req.params.guildId);

        // Map role IDs to actual Discord role objects for the UI
        const roleRewards = (config.roleRewards || [])
            .map(r => ({
                level: r.level,
                role: guild.roles.cache.get(r.roleId)
            }))
            .filter(r => r.role) // Clean out deleted roles
            .sort((a, b) => a.level - b.level);

        // Fetch text channels for the "Level Up Message" channel dropdown
        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));

        res.render('guildConfig', { 
            user: req.user, 
            guild, 
            config, 
            roleRewards, // FIXED: Now explicitly defined
            channels 
        });

    } catch (err) {
        console.error("Dashboard Render Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
