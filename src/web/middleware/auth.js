const { PermissionsBitField } = require('discord.js');

/**
 * Ensures the user is logged in before accessing a route.
 */
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // Set a session variable to redirect them to the page they wanted after login
    req.session.returnTo = req.originalUrl; 
    res.redirect('/auth/discord'); 
}

/**
 * Checks if the authenticated user has administrative permissions in the target guild.
 * This is used for protecting POST routes.
 * @param {string} guildId - The ID of the guild being checked.
 */
function isAdmin(req, res, next) {
    const guildId = req.params.guildId || req.body.guildId; // Get guild ID from route params or body
    
    if (!req.isAuthenticated()) {
        return res.status(401).send({ success: false, message: 'Authentication required.' });
    }

    const targetGuild = req.user.guilds.find(g => g.id === guildId);

    if (!targetGuild) {
        return res.status(403).send({ success: false, message: 'Guild not found in your list.' });
    }

    // Check for Administrator permission
    const permissions = new PermissionsBitField(BigInt(targetGuild.permissions));
    if (permissions.has(PermissionsBitField.Flags.Administrator)) {
        return next();
    }

    return res.status(403).send({ success: false, message: 'You must have Administrator permissions in the guild to modify settings.' });
}

module.exports = { isAuthenticated, isAdmin };