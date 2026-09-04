const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../services/email.service');

// Generate 6-digit random verification code

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//   Check if OTP code has expired

function isCodeExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
}

//  Generate JWT token

function generateToken(userId, role) {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}


//  REGISTER USER - Creates temporary unverified user record

async function registerUser(req, res) {
    try {
        const { username, email, password, role } = req.validateData;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate OTP and expiry
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 60 * 1000); // 1 minute

        let user;

        // Check if unverified user already exists
        const existingUser = await userModel.findOne({ email });

        if (existingUser && !existingUser.isVerified) {
            // Update existing unverified user with new details and OTP
            user = await userModel.findByIdAndUpdate(
                existingUser._id,
                {
                    username: username.toLowerCase(),
                    password: hashedPassword,
                    role,
                    verificationCode,
                    verificationCodeExpires,
                    createdAt: new Date() // Reset timestamp
                },
                { new: true }
            );
            console.log('📝 Updated existing unverified user:', user.email);
        } else {
            // Create new unverified user
            user = await userModel.create({
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password: hashedPassword,
                role,
                isVerified: false,
                verificationCode,
                verificationCodeExpires
            });
            console.log('✅ New user created (unverified):', user.email);
        }

        // Send OTP email
        try {
            await emailService.sendOTPEmail(email, verificationCode, username);
        } catch (emailError) {
            console.error('⚠️ Email send failed:', emailError.message);
            // Delete user if email fails
            await userModel.findByIdAndDelete(user._id);
            return res.status(500).json({
                message: 'Failed to send verification email. Please try again.'
            });
        }

        res.status(200).json({
            message: 'Verification code sent successfully! Please check your email.',
            email: email,
            expiresIn: 60 // seconds
        });

    } catch (error) {
        console.error('❌ Error in registration:', error);
        res.status(500).json({
            message: 'Registration failed',
            error: error.message
        });
    }
}


//   2. VERIFY EMAIL OTP 

async function verifyEmail(req, res) {
    try {
        const { email, code } = req.body;

        // Validation
        if (!email || !code) {
            return res.status(400).json({
                message: 'Email and verification code are required.'
            });
        }

        if (code.length !== 6 || isNaN(code)) {
            return res.status(400).json({
                message: 'Invalid verification code format.'
            });
        }

        // Find user
        const user = await userModel.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                message: 'User not found. Please register first.'
            });
        }

        // Check if already verified
        if (user.isVerified) {
            return res.status(400).json({
                message: 'Email already verified. Please log in.'
            });
        }

        // Check OTP validity
        if (user.verificationCode !== code) {
            return res.status(400).json({
                message: 'Invalid verification code.'
            });
        }

        // Check OTP expiry
        if (isCodeExpired(user.verificationCodeExpires)) {
            return res.status(400).json({
                message: 'Verification code has expired. Please request a new code.',
                action: 'resend' // Frontend should show resend button
            });
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();

        console.log('User verified:', user.email);

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            message: 'Email verified! Account created successfully!',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Error in email verification:', error);
        res.status(500).json({
            message: 'Verification failed',
            error: error.message
        });
    }
}

//   3. RESEND VERIFICATION CODE - For expired codes

async function resendCode(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required.'
            });
        }

        const user = await userModel.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                message: 'User not found. Please register first.'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: 'Email already verified. Please log in.'
            });
        }

        // Generate new OTP
        const newCode = generateVerificationCode();
        const newExpires = new Date(Date.now() + 60 * 1000); // 1 minute

        user.verificationCode = newCode;
        user.verificationCodeExpires = newExpires;
        await user.save();

        // Send new OTP email
        try {
            await emailService.sendOTPEmail(email, newCode, user.username);
        } catch (emailError) {
            return res.status(500).json({
                message: 'Failed to send verification email. Please try again.'
            });
        }

        res.status(200).json({
            message: 'New verification code sent successfully!',
            expiresIn: 60 // seconds
        });

    } catch (error) {
        console.error('Error resending code:', error);
        res.status(500).json({
            message: 'Failed to resend code',
            error: error.message
        });
    }
}


//   4. LOGIN USER - Only verified users can log in
 
async function loginUser(req, res) {
    try {
        const savedUser = req.user; // From validateLogin middleware

        // Block unverified accounts
        if (!savedUser.isVerified) {
            return res.status(403).json({
                message: 'Your account is not verified. Please verify your email first.',
                action: 'verify' // Frontend should redirect to verify screen
            });
        }

        // Generate token
        const token = generateToken(savedUser._id, savedUser.role);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'Logged in successfully!',
            token: token,
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role
            }
        });

    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            message: 'Login failed',
            error: error.message
        });
    }
}

module.exports = {
    registerUser,
    verifyEmail,
    resendCode,
    loginUser
};
