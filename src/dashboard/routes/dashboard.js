const router = require('express').Router();
const fetch = require('node-fetch');
const GuildConfig = require('../../models/GuildConfig');
const UserLevel = require('../../models/UserLevel');

const BOT_TOKEN = process.env.DISCORD_TOKEN; // Needed to verify permissions and fetch guild members/roles

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
};

// Middleware to check if user manages the guild
const checkGuildManager = async (req, res, next) => {
    const { guildId } = req.params;
    const userGuilds = req.user.guilds;

    // Check if user is in the guild and has Administrator permission (or Manage Server)
    const guild = userGuilds.find(g => g.id === guildId);
    if (!guild || !((guild.permissions & 0x8) === 0x8)) { // 0x8 is Administrator flag
        return res.status(403).send('You do not have permission to manage this server.');
    }
    
    // Fetch or create config
    req.guildConfig = await GuildConfig.findOne({ guildId }) || new GuildConfig({ guildId });
    next();
};


// GET: List all managed guilds for the user
router.get('/select-guild', isAuthenticated, (req, res) => {
    // Filter req.user.guilds to only show guilds where the user has Administrator permission (0x8)
    const managedGuilds = req.user.guilds.filter(guild => (guild.permissions & 0x8) === 0x8);
    res.render('select-guild', { user: req.user, guilds: managedGuilds });
});


// GET: Display settings for a specific guild
router.get('/dashboard/:guildId', isAuthenticated, checkGuildManager, async (req, res) => {
    const config = req.guildConfig;
    
    // Fetch guild data from Discord API using BOT token (to get roles, channels, etc.)
    const guildData = await fetch(`https://discord.com/api/v10/guilds/${req.params.guildId}`, {
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
    }).then(r => r.json());

    // Basic leaderboard preview
    const topUsers = await UserLevel.find({ guildId: req.params.guildId })
        .sort({ level: -1, xp: -1 })
        .limit(5);

    res.render('guild-settings', {
        user: req.user,
        guild: guildData,
        config: config,
        topUsers: topUsers // Pass data to EJS template
    });
});

// POST: Handle updating the XP rate
router.post('/dashboard/:guildId/xprate', isAuthenticated, checkGuildManager, async (req, res) => {
    const config = req.guildConfig;
    const { xpRate } = req.body;

    const rate = parseFloat(xpRate);
    if (isNaN(rate) || rate <= 0) {
        return res.status(400).send('Invalid XP rate.');
    }

    config.xpRate = rate;
    await config.save();
    
    // Success redirect
    res.redirect(`/dashboard/${req.params.guildId}?status=xprate_updated`);
});

// ... Add routes for toggling leveling, setting channels, roles, etc.

module.exports = router;