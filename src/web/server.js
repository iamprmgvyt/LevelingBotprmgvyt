const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

require(path.join(__dirname, '..', 'config', 'passport-setup.js'));

const app = express();
const PORT = process.env.PORT || 3000;

const startDashboard = () => {
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'dark-mode-secret',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // --- ROUTES ---
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard')); // FIXED: Dashboard route added

    app.get('/', (req, res) => {
        res.render('index', { user: req.user });
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard live at port ${PORT}`);
    });
};

module.exports = { startDashboard };
