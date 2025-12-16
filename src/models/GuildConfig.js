const { Schema, model } = require('mongoose');

// The fix is here: 'new Schema' instead of 'new new Schema'
const GuildConfigSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    levelingEnabled: { type: Boolean, default: true },
    xpRate: { type: Number, default: 1.0 },
    levelChannelId: { type: String, default: null }, // Channel for level-up announcements
    embedColor: { type: String, default: '#0099ff' },
    prefix: { type: String, default: ',' },

    // XP Blacklists
    blacklistedChannels: { type: [String], default: [] },
    blacklistedRoles: { type: [String], default: [] },

    // Role Rewards: [{ level: 5, roleId: '12345...' }]
    roleRewards: { 
        type: [
            {
                level: { type: Number, required: true },
                roleId: { type: String, required: true }
            }
        ], 
        default: [] 
    },
});

module.exports = model('GuildConfig', GuildConfigSchema);
