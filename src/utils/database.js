const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');
const UserLevel = require('../models/UserLevel');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is missing!');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

async function getGuildConfig(guildId) {
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        config = new GuildConfig({ guildId });
        await config.save();
    }
    return config;
}

async function getUserLevel(userId, guildId) {
    let user = await UserLevel.findOne({ userId, guildId });
    if (!user) {
        user = new UserLevel({ 
            userId, 
            guildId, 
            xp: 0, 
            level: 0, 
            lastMessage: new Date(0) 
        });
    }
    return user;
}

// FULL FIXED EXPORTS
module.exports = { 
    connectDB, 
    getGuildConfig, 
    getUserLevel 
};
