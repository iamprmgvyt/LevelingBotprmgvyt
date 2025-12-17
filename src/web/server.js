const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

const startDashboard = (client) => {
    const app = express();
    app.set('discordClient', client);

    // --- CRITICAL DATA PARSERS ---
    app.use(express.json());
    app.use(express.urlencoded({ extended: true })); 

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'secret-key',
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => res.render('index', { user: req.user }));

    app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
        console.log(`🌐 Dashboard Online`);
    });
};

module.exports = { startDashboard };
