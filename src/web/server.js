const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// Load Strategy
require('../config/passport-setup'); 

const startDashboard = (client) => {
    const app = express();
    
    // --- RENDER CRITICAL FIXES ---
    app.set('trust proxy', 1); // Tells Express to trust Render's proxy
    app.set('discordClient', client);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // --- SESSION FIX ---
    app.use(session({
        secret: process.env.SESSION_SECRET || 'keyboard-cat-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { 
            secure: process.env.NODE_ENV === 'production', // true if on Render (https)
            maxAge: 60000 * 60 * 24 // 24 hours
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Health Check
    app.get('/health', (req, res) => res.status(200).send('OK'));

    // Routes
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => {
        res.render('index', { user: req.user, client: client });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard Online on port ${PORT}`);
    });
};

module.exports = { startDashboard };
