const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ ERROR: MONGODB_URI is not defined in environment variables!');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        // MongoDB connection success
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

module.exports = { connectDB };
