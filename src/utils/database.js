const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');
const UserLevel = require('../models/UserLevel');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully.');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1); // Exit process if connection fails
    }
};

/**
 * Fetches the configuration for a guild. If it doesn't exist, a default config is created and saved.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<GuildConfig>} The guild configuration document.
 */
const getGuildConfig = async (guildId) => {
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        // Create default config if none is found
        config = new GuildConfig({ guildId });
        await config.save();
    }
    return config;
};

/**
 * Fetches the leveling data for a specific user in a guild. If it doesn't exist, a default record is created and saved.
 * @param {string} userId - The ID of the user.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<UserLevel>} The user's leveling document.
 */
const getUserLevel = async (userId, guildId) => {
    let userLevel = await UserLevel.findOne({ userId, guildId });
    if (!userLevel) {
        // Create default level data if none is found
        userLevel = new UserLevel({ userId, guildId });
        await userLevel.save();
    }
    return userLevel;
};

module.exports = { connectDB, getGuildConfig, getUserLevel };