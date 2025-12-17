const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// 1. LOAD STRATEGY FIRST
require('../config/passport-setup'); 

const startDashboard = (client) => {
    const app = express();
    app.set('discordClient', client);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // 2. SESSION BEFORE PASSPORT
    app.use(session({
        secret: process.env.SESSION_SECRET || 'discord-dashboard-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // Set to true if using HTTPS/SSL
    }));

    // 3. INITIALIZE PASSPORT
    app.use(passport.initialize());
    app.use(passport.session());

    // 4. ROUTES LAST
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => res.render('index', { user: req.user }));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard Online on port ${PORT}`);
    });
};

module.exports = { startDashboard };
