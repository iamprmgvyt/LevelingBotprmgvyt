const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: ',' },
    levelingEnabled: { type: Boolean, default: true },
    xpRate: { type: Number, default: 1.0 },
    embedColor: { type: String, default: '#5865f2' }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
