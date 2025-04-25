const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('../config/db');
const nodemailer = require('nodemailer');

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

            const payload = { 
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role 
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            console.log('Authenticated user:', payload);

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
                if (existingUser.rows[0].verified) {
                    return res.status(400).json({ success: false, error: 'Email already verified' });
                }
                await authController.sendVerificationEmail(existingUser.rows[0]);
                return res.status(400).json({ success: false, error: 'Please verify your email' });
            }
    
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
                [firstName.trim(), lastName.trim(), email.trim(), hashedPassword]
            );
    
            await authController.sendVerificationEmail(result.rows[0]);
    
            const payload = {
                id: result.rows[0].id,
                email: result.rows[0].email,
                name: `${firstName.trim()} ${lastName.trim()}`,
                verified: result.rows[0].verified
            };
    
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
            console.log('Authenticated user:', payload);
    
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
    },

    sendVerificationEmail: async (user) => {
        const verificationToken = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        await pool.query(
            'UPDATE users SET verification_token = $1, token_expiration = NOW() + interval \'1 hour\' WHERE id = $2',
            [verificationToken, user.id]
        );

        const transporter = nodemailer.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 2525,
            auth: {
                user: '010cd747abe60d',
                pass: '8a838f20ed6406'
            }
        });

        const verificationLink = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verify your email',
            html: `
                <p>Hello ${user.first_name},</p>
                <p>Thanks for registering! Please click the link below to verify your email:</p>
                <a href="${verificationLink}">${verificationLink}</a>
                <p>This link will expire in 1 hour.</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Email sending error:', error);
            }
            console.log('Verification email sent:', info.response);
        });
    },

    verifyEmail: async (req, res) => {
        try {
            const { token } = req.params;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1 AND verification_token = $2 AND token_expiration > NOW()',
                [decoded.email, token]
            );
    
            if (result.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid or expired token' });
            }
    
            await pool.query(
                'UPDATE users SET verified = true, verification_token = NULL WHERE email = $1',
                [decoded.email]
            );
    
            res.redirect('/dashbord.html?verified=true');
        } catch (error) {
            res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }
    },

    resendVerification: async (req, res) => {
        try {
            const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
            if (!user.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });
            
            await authController.sendVerificationEmail(user.rows[0]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
            
            if (!user.rows[0]) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.rows[0].password);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Current password is incorrect' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
            
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    }
};

module.exports = authController;
