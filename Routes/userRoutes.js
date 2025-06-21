const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/info', authMiddleware.isAuthenticated, async (req, res) => {
const { first_name, last_name, phone, address, age } = req.body;
    try {
await pool.query(
  'UPDATE users SET first_name = $1, last_name = $2, phone = $3, address = $4, age = $5 WHERE id = $6',
  [first_name, last_name, phone, address, age, req.user.id]
);

        res.json({
            success: true,
            message: 'User info updated successfully'
        });
    } catch (err) {
        console.error('User info update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update user info' });
    }
});
router.get('/info', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, first_name, last_name, email, phone, address, age, role, verified, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Error fetching user info:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user info' });
    }
});

module.exports = router;
