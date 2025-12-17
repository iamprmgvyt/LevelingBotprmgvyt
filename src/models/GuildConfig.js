const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    levelingEnabled: { type: Boolean, default: true },
    levelUpChannel: { type: String, default: null },
    // Ensure this is an array so .length works in EJS
    roleRewards: [{
        level: Number,
        roleId: String
    }]
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
