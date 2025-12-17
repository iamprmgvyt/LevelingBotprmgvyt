const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        // console.log('✅ MongoDB connected'); // Optional, since you log it in index.js
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// Ensure this matches!
module.exports = { connectDB };
