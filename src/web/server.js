const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('../../config/passport-setup'); // Ensure this exists for Discord OAuth

const app = express();

// RENDER FIX: Use process.env.PORT (Render's dynamic port)
const PORT = process.env.PORT || 3000;

const startDashboard = () => {
    // Middleware
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'fallback-secret',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.get('/', (req, res) => {
        res.render('index', { user: req.user });
    });

    // Add your other routes here (auth, dashboard, etc.)
    // app.use('/auth', require('./routes/auth'));
    // app.use('/dashboard', require('./routes/dashboard'));

    // RENDER FIX: Must listen on '0.0.0.0' to be detected by Render's proxy
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard is live and listening on port ${PORT}`);
    });
};

module.exports = { startDashboard };
