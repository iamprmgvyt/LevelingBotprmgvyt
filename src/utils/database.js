const GuildConfig = require('../models/GuildConfig');

async function getGuildConfig(guildId) {
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        // Create default config if none exists
        config = new GuildConfig({ guildId, prefix: '!', levelingEnabled: true });
        await config.save();
    }
    return config;
}

module.exports = { getGuildConfig };
