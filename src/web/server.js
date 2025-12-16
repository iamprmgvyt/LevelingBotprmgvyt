const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

// Load environment variables (from .env)
require('dotenv').config();

// --- Configuration ---
const PORT = process.env.DASHBOARD_PORT || 3000;

// Discord OAuth2 credentials
const discordCredentials = {
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DASHBOARD_URL + '/auth/discord/callback',
    scope: ['identify', 'guilds'], // Request user ID/tag and their guilds
};

// --- Passport Setup ---

// Serialize the user ID to store in the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize the user object from the session ID
passport.deserializeUser((obj, done) => {
    // In a real app, you would fetch user details from your database here
    done(null, obj); 
});

// Configure the Discord strategy
passport.use(new DiscordStrategy(discordCredentials, (accessToken, refreshToken, profile, done) => {
    // Save user profile data to be attached to req.user
    process.nextTick(() => done(null, profile));
}));

// --- Express App Initialization ---
const app = express();

// View engine setup (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-for-dashboard', // Should be a strong secret in .env
    resave: false,
    saveUninitialized: false,
}));

// Initialize Passport and session middleware
app.use(passport.initialize());
app.use(passport.session());

// Static file serving (CSS, JS, images for the dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
app.use('/', dashboardRoutes); // Main routes (/, /dashboard/:guildId)

// --- Start Server ---
const startDashboard = () => {
    app.listen(PORT, () => {
        console.log(`\n🌐 Dashboard running on: http://localhost:${PORT}`);
    });
};

module.exports = { startDashboard };