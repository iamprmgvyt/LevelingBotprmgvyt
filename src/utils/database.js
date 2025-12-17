const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig'); // Ensure this path is correct

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is missing in Environment Variables!');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

/**
 * Fetches guild config or creates a default one if it doesn't exist
 */
async function getGuildConfig(guildId) {
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        config = new GuildConfig({ 
            guildId, 
            prefix: '!', 
            levelingEnabled: true 
        });
        await config.save();
    }
    return config;
}

// FULL FIXED EXPORT
module.exports = { connectDB, getGuildConfig };
