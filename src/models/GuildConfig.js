const { Schema, model } = require('mongoose');

const GuildConfigSchema = new new Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: process.env.BOT_PREFIX || ',' },
    levelingEnabled: { type: Boolean, default: true },
    xpRate: { type: Number, default: 1.0 },
    levelupChannelId: { type: String, default: null },
    levelupMessage: { 
        type: String, 
        default: '🎉 Congratulations {user}! You reached **Level {level}**!' 
    },
    blacklistedChannels: [{ type: String }],
    blacklistedRoles: [{ type: String }],
    roleRewards: [{
        level: { type: Number, required: true },
        roleId: { type: String, required: true }
    }],
    embedColor: { type: String, default: '#3498db' }
});

module.exports = model('GuildConfig', GuildConfigSchema);