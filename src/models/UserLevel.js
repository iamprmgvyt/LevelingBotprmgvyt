const { Schema, model } = require('mongoose');

const UserLevelSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true, index: true },
    level: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    lastMessage: { type: Date, default: new Date(0) } // Anti-spam cooldown
});

UserLevelSchema.index({ guildId: 1, level: -1, xp: -1 });
UserLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = model('UserLevel', UserLevelSchema);