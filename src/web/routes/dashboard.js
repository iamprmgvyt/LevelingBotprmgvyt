const router = require('express').Router();
const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// 1. Dashboard Main List (GET)
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

// 2. Server Configuration Page (GET)
router.get('/:guildId', isAuthenticated, async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).send("Bot not in server.");

        const config = await getGuildConfig(req.params.guildId);
        const roleRewards = (config.roleRewards || [])
            .map(r => ({ level: r.level, role: guild.roles.cache.get(r.roleId) }))
            .filter(r => r.role)
            .sort((a, b) => a.level - b.level);

        res.render('guildConfig', { user: req.user, guild, config, roleRewards });
    } catch (err) {
        res.status(500).send("Internal Error");
    }
});

// 3. Update Settings Handler (POST) - FULL FIXED
router.post('/:guildId/update', isAuthenticated, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.get('discordClient');

        // Security: Verify Admin perms again
        const userGuild = req.user.guilds.find(g => g.id === guildId);
        const perms = new PermissionsBitField(BigInt(userGuild.permissions));
        if (!perms.has(PermissionsBitField.Flags.Administrator)) return res.status(403).send("Forbidden");

        const config = await getGuildConfig(guildId);
        
        // Update values from the form body
        if (req.body.prefix) config.prefix = req.body.prefix.substring(0, 5);
        
        // HTML checkboxes only exist in req.body if checked
        config.levelingEnabled = req.body.levelingEnabled === 'on';

        await config.save();
        
        // Redirect back to page with a success flag
        res.redirect(`/dashboard/${guildId}?success=true`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to save settings.");
    }
});

module.exports = router;
