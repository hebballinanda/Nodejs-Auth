const express = require('express');
const User = require('../models/user');
const router = express.Router();
const crypto = require('crypto');

const nodemailer = require('nodemailer');
const { SESClient } = require('@aws-sdk/client-ses');

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/signup', (req, res) => {
    res.render('signup');
});

router.get('/reset-password', (req, res) => {
    res.render('reset-password');
});

router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    console.log()
    const user = await User.findOne({ email });
    if (!user) return console.log('User not found');
    console.log(user);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour validity
    await user.save();

    const ses = new SESClient({
        region: 'us-east-1', // Replace with your SES region
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        SES: { ses, aws: require('@aws-sdk/client-ses') },
    });

    const mailOptions = {
        from: process.env.SENDER_MAIL, // Replace with your verified sender email
        to: process.env.REVEIVER_MAIL, // Recipient email address
        subject: 'Reset Password',
        text: `Click on link for reseting password : http://localhost:3000/auth/set-password/${resetToken}`,
    };

    // Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`Email sent successfully: ${info.response}`);
    } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`Error sending email: ${err.message}`);
    }

});


// GET route to verify token and render the password reset page
router.get('/set-password/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }, // Check if the token is still valid
        });

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }

        // Render the reset password page (adjust this based on your frontend setup)
        res.render('set-password', { email: user.email });
    } catch (err) {
        res.status(500).send('Error validating token');
    }
});

// POST route to set a new password
router.post('/set-password/:token', async (req, res) => {
    const { password,email } = req.body;
    const { token } = req.params;

    try {
        const user = await User.findOne({email});

        if (!user) {
            console.log('Invalid user or token');
            return res.redirect('/auth/reset-password');
        }

        user.password = password;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        console.log(user);

        res.status(200).send('Password has been reset successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error resetting password');
    }
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
    const sessionId = req.session._id; // Capture the session ID

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
