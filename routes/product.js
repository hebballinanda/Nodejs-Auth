const express = require('express');
const router = express.Router();
const User = require('../models/user');

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
}

router.get('/', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    let email = user.email;
    res.render('home', {
        email: email
    });
});

module.exports = router; // Ensure it exports a router
