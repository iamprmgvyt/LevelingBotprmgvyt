require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const { connectDB } = require('../utils/database');

// Database connection
connectDB();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Passport Setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: ['identify', 'guilds'] // Need 'guilds' scope to see servers
}, (accessToken, refreshToken, profile, done) => {
    // Save user info/tokens to session
    process.nextTick(() => done(null, profile));
}));

// Express Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'a_very_secret_key', // Change this in production
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Global Check for Authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
};

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
app.use('/', dashboardRoutes); // Use '/' for general dashboard routes

app.listen(PORT, () => {
    console.log(`🌍 Dashboard running at ${process.env.DASHBOARD_URL}`);
});