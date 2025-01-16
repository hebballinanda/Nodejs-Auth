const express = require('express');
const User = require('../models/user');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/signup', (req, res) => {
    res.render('signup');
});

router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const newUser = new User({ email, password });
        await newUser.save();

        req.session.userId = newUser._id; // Set user ID in session
        res.redirect('/products');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error signing up');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.isPasswordValid(password))) {
            return res.status(400).send('Invalid email or password');
        }

        req.session.userId = user._id; // Set user ID in session
        res.redirect('/products');
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});

router.post('/logout', (req, res) => {
    const sessionId = req.session.id; // Capture the session ID

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }

        // Explicitly remove the session from the session store
        req.sessionStore.destroy(sessionId, (storeErr) => {
            if (storeErr) {
                console.error('Error removing session from store:', storeErr);
                return res.status(500).send('Error removing session from store');
            }

            res.redirect('/auth/login'); // Redirect to login page
        });
    });
});


module.exports = router; // Ensure it exports a router
