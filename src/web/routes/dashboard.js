const express = require('express');
const router = express.Router();
const GuildConfig = require('../../models/GuildConfig');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
};

// SERVER SETTINGS PAGE (GET)
router.get('/server/:guildId', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(guildId);

    if (!guild) return res.redirect('/dashboard');

    try {
        // Find existing config or create a default one
        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
            config = await GuildConfig.create({ guildId });
        }

        res.render('dashboard/server', {
            user: req.user,
            guild: guild,
            config: config // This sends the SAVED data to the HTML
        });
    } catch (error) {
        res.status(500).send("Error loading settings");
    }
});

// SAVE SETTINGS (POST)
router.post('/server/:guildId/save', isAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    
    // Logic for checkbox: if it's missing in req.body, it means it's OFF
    const levelingEnabled = req.body.levelingEnabled === 'on';

    try {
        await GuildConfig.findOneAndUpdate(
            { guildId: guildId },
            { 
                prefix: req.body.prefix,
                levelingEnabled: levelingEnabled,
                xpRate: parseFloat(req.body.xpRate),
                embedColor: req.body.embedColor
            },
            { upsert: true, new: true } // Upsert ensures it creates it if it doesn't exist
        );

        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).send("Error saving settings");
    }
});

module.exports = router;
