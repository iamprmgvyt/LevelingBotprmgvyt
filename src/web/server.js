const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

require('../config/passport-setup');

const startDashboard = (client) => {
    const app = express();
    
    // Allow routes to access the Discord Client
    app.set('discordClient', client);

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    // CRITICAL: Allows reading data from forms/buttons
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'dark-mode-secret',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => res.render('index', { user: req.user }));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard live on port ${PORT}`);
    });
};

module.exports = { startDashboard };
