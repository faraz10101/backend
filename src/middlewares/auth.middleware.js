const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');

async function validateRegistration(req, res, next) {
    try {
        const {username, email, password, role = 'user' } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            // Agar pehle se account bana hua hai aur VERIFIED hai
            if (existingUser.isVerified) {
                return res.status(409).json({
                    message: 'User with this username or email already exists. Please login.'
                });
            }
            // Agar unverified hai, to registerUser controller isey overwrite/update kar dega!
        }

        req.validateData = {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: password,
            role: role
        };

        next();
    } catch (error) {
        console.error('Error validating registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function validateLogin(req, res, next) {
    try {
        let { username, email, password } = req.body || {};
 
        console.log('=== LOGIN REQUEST ===');
        console.log('Raw input:', { username, email, password: '***' });
 
        // Validation: Check if username or email provided
        if (!username && !email) {
            return res.status(400).json({
                message: 'Please provide either username or email'
            });
        }
 
        // Validation: Check if password provided
        if (!password) {
            return res.status(400).json({
                message: 'Please provide password'
            });
        }
 
        // ✅ SMART DETECTION: If username contains @ treat it as email
        if (username && username.includes('@')) {
            console.log('Detected @ in username, treating as email');
            email = username;
            username = undefined;
        }
 
        console.log('After detection:', { username, email: email ? email.substring(0, 5) + '...' : 'none' });
 
        // Build query object dynamically
        const queryConditions = [];
 
        if (username) {
            queryConditions.push({ username: username.toLowerCase() });
        }
 
        if (email) {
            queryConditions.push({ email: email.toLowerCase() });
        }
 
        console.log('Query conditions:', queryConditions);
 
        const query = { $or: queryConditions };
 
        // Search in database
        const savedUser = await userModel.findOne(query);
 
        console.log('Database search result:', savedUser ? 'USER FOUND' : 'USER NOT FOUND');
 
        // If user not found
        if (!savedUser) {
            console.log('User not found with:', { username, email });
            return res.status(404).json({
                message: 'User not found with this username or email'
            });
        }
 
        console.log('User found:', {
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            isVerified: savedUser.isVerified
        });
 
        // Check if email is verified
        if (!savedUser.isVerified) {
            return res.status(403).json({
                message: 'Your email is not verified. Please verify your email first.',
                action: 'verify'
            });
        }
 
        // Check if password is correct
        const isPasswordCorrect = await bcrypt.compare(password, savedUser.password);
 
        if (!isPasswordCorrect) {
            console.log('Password mismatch');
            return res.status(401).json({
                message: 'Incorrect password'
            });
        }
 
        console.log('Login validation successful');
 
        // Store user in request
        req.user = savedUser;
        next();
 
    } catch (error) {
        console.error('ERROR in validateLogin:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
 

module.exports = { validateRegistration, validateLogin };