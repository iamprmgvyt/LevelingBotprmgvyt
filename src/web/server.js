const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Added for session stability
const passport = require('passport');
const path = require('path');

const startDashboard = (client) => {
    const app = express();
    app.set('trust proxy', 1);
    app.set('discordClient', client);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // SESSION FIX: Uses MongoDB instead of MemoryStore
    app.use(session({
        secret: process.env.SESSION_SECRET || 'bot-secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: { secure: process.env.NODE_ENV === 'production' }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard'));

    app.get('/', (req, res) => res.render('index', { user: req.user, client }));

    app.listen(process.env.PORT || 3000, () => console.log('🌐 Dashboard Online'));
};

module.exports = { startDashboard };
