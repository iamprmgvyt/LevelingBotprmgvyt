const express = require('express');
const router = express.Router();
const passport = require('passport');

// 1. Initial Login Request
router.get('/login', passport.authenticate('discord'));
router.get('/discord', passport.authenticate('discord'));

// 2. The Callback handler (Discord sends the user here)
router.get('/discord/callback', passport.authenticate('discord', {
    successRedirect: '/dashboard',
    failureRedirect: '/'
}));

// 3. Logout handler
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
