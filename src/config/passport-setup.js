const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

// 1. Serialize User: Determines which data of the user object should be stored in the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// 2. Deserialize User: Used to retrieve the user object from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// 3. Configure Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    // CRITICAL: Must be the full HTTPS URL of your Render app
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        /**
         * 'profile' contains all the user's Discord data.
         * We pass it to 'done' so it can be saved to the session.
         */
        return done(null, profile);
    } catch (err) {
        console.error('Passport Strategy Error:', err);
        return done(err, null);
    }
}));
