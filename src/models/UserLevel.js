const { Schema, model } = require('mongoose');

const UserLevelSchema = new Schema({ 
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    lastMessage: { type: Date, default: Date.now },
    lastDaily: { type: Date, default: null } // New field for the daily command
});

UserLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = model('UserLevel', UserLevelSchema);
