const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// 1. LOAD STRATEGY
require('../config/passport-setup'); 

const startDashboard = (client) => {
    const app = express();
    
    // Attach client to app for use in routes
    app.set('discordClient', client);

    // 2. MIDDLEWARE & PARSERS
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // 3. SESSION CONFIG (Optimized for Render)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'discord-dashboard-secret',
        resave: false,
        saveUninitialized: false,
        // Set secure to true only if you have an SSL certificate (Render does this automatically)
        cookie: { secure: process.env.NODE_ENV === 'production' } 
    }));

    // 4. PASSPORT INITIALIZATION
    app.use(passport.initialize());
    app.use(passport.session());

    // 5. HEALTH CHECK (CRITICAL FOR RENDER)
    // This tells Render the bot is healthy so it doesn't start a second one
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });

    // 6. ROUTES
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => {
        res.render('index', { 
            user: req.user,
            client: client 
        });
    });

    // 7. START SERVER
    const PORT = process.env.PORT || 3000;
    
    // Explicitly binding to 0.0.0.0 is required for Render
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard Online on port ${PORT}`);
    });

    // Handle server errors to prevent crashing the whole bot
    server.on('error', (err) => {
        console.error('Web Server Error:', err);
    });
};

module.exports = { startDashboard };
