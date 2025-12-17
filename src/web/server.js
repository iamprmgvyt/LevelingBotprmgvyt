// ... existing imports ...

const startDashboard = (client) => { // Accept client as argument
    const app = express();
    app.set('discordClient', client); // Store client for the routes to use

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    // Standard Middlewares (Session, Passport, etc)
    // ... app.use(session...) app.use(passport...)

    // Body parser for the POST requests
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/auth', require('./routes/auth'));
    app.use('/dashboard', require('./routes/dashboard')); // MOUNTED AT /dashboard

    app.get('/', (req, res) => res.render('index', { user: req.user }));

    app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
        console.log("🌐 Web Server Ready");
    });
};
