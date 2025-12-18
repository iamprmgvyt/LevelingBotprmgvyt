const express = require('express');
const router = express.Router();
const passport = require('passport');

// This handles BOTH /auth/login AND /auth/discord
router.get('/login', passport.authenticate('discord'));
router.get('/discord', passport.authenticate('discord'));

// The Callback (Must match your Discord Developer Portal Redirect URI)
router.get('/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
