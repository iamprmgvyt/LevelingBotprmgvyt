const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// 1. Load the passport config
const passportPath = path.join(__dirname, '..', 'config', 'passport-setup.js');
require(passportPath);

const app = express();
const PORT = process.env.PORT || 3000;

const startDashboard = () => {
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'keyboard-cat-leveling',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // 2. LINK THE AUTH ROUTES HERE
    const authRoutes = require('./routes/auth');
    app.use('/auth', authRoutes);

    // Landing Page
    app.get('/', (req, res) => {
        res.render('index', { user: req.user });
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard is live on port ${PORT}`);
    });
};

module.exports = { startDashboard };
