const express = require('express');
const router = express.Router();
const passport = require('passport');

// This starts the Discord login process
router.get('/discord', passport.authenticate('discord'));

// This is where Discord sends the user back after they click "Authorize"
router.get('/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/'); // Successful login, send them back to home
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router;
