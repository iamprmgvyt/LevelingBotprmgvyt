const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    // On Render, ensure your CALLBACK_URL env variable looks like:
    // https://your-app-name.onrender.com/auth/discord/callback
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // We pass the profile (user data) to the session
        return done(null, profile);
    } catch (err) {
        console.error('Passport Error:', err);
        return done(err, null);
    }
}));
