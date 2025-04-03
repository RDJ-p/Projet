const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('../config/db');

const authController = {
    showLogin: (req, res) => {
        res.sendFile(path.join(__dirname, '../public/Login page.html'));
    },

    showRegister: (req, res) => {
        res.sendFile(path.join(__dirname, '../public/register.html'));
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Please provide email and password' 
                });
            }

            const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    name: `${user.first_name} ${user.last_name}` 
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
  res.cookie('token', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/' 
}).redirect('/main.html');

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error during authentication' 
            });
        }
    },

    register: async (req, res) => {
        try {
            const { firstName, lastName, email, password } = req.body;

            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'All fields are required' 
                });
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid email format' 
                });
            }

            if (password.length < 8) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Password must be at least 8 characters' 
                });
            }

            const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    error: 'Email already registered' 
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
                [firstName.trim(), lastName.trim(), email.trim(), hashedPassword]
            );

            const token = jwt.sign(
                { 
                    id: result.rows[0].id, 
                    email: result.rows[0].email, 
                    name: `${firstName} ${lastName}` 
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.cookie('token', token, {
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            }).redirect('/main.html');

        } catch (error) {
            console.error('Registration Error:', error);
            const errorMessage = error.code === '23505' ? 'Email already exists' : 'Registration failed';
            res.status(500).json({ 
                success: false, 
                error: errorMessage 
            });
        }
    },

    logout: (req, res) => {
        res.clearCookie('token', {
            path: '/',
            secure: process.env.NODE_ENV === 'production'
        }).redirect('/main.html');
    }
};


module.exports = authController;