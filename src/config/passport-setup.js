const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { getGuildConfig } = require('../utils/database');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.DASHBOARD_URL}/auth/discord/callback`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // This passes the user profile to the session
    return done(null, profile);
}));
