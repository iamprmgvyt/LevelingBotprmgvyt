const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use the URI from your Render Environment Variables
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// Export as an object
module.exports = { connectDB };
