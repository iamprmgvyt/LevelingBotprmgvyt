const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// This finds the passport-setup.js file regardless of deep nesting
const passportPath = path.join(__dirname, '..', 'config', 'passport-setup.js');
require(passportPath);

const app = express();
const PORT = process.env.PORT || 3000;

const startDashboard = () => {
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'keyboard-cat-leveling',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Basic Landing Page Route
    app.get('/', (req, res) => {
        res.render('index', { user: req.user });
    });

    // RENDER FIX: Listen on 0.0.0.0
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard is live on port ${PORT}`);
    });
};

module.exports = { startDashboard };
