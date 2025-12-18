const express = require('express');
const router = express.Router();
const passport = require('passport');

// 1. THE MISSING ROUTE: /auth/login
router.get('/login', passport.authenticate('discord'));

// 2. THE CALLBACK: /auth/discord/callback
// This is where Discord sends the user back after they click "Authorize"
router.get('/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    // Redirect to the dashboard on successful login
    res.redirect('/dashboard');
});

// 3. THE LOGOUT: /auth/logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
