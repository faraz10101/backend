const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Aapke package.json mein installed hai [2]
require('dotenv').config();

const authRoutes = require('./routes/auth.route');
const app = express();

// Secure CORS Configuration
const allowedOrigins = [
    'https://relic.shisham.dev', // Aapka live frontend domain
    'http://localhost:5173'      // Local testing ke liye (agar aap Vite use kar rahe hain)
];

app.use(cors({
    origin: function (origin, callback) {
        // Bina origin wali requests (jaise Postman/Mobile apps) ko allow karne ke liye
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true // Cookies aur Authorization headers ko securely handle karne ke liye
}));

app.use(cookieParser()); // Cookies read karne ke liye middleware register karein
app.use(express.json());
app.use('/api/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
    res.status(200).json({ message: "Server is up and running securely!" });
});

module.exports = app;
    