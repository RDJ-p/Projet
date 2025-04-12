const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.get('/users', authMiddleware.isAuthenticated, adminMiddleware.isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, first_name, last_name, created_at FROM users');
        res.json({ users: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/stats', authMiddleware.isAuthenticated, adminMiddleware.isAdmin, async (req, res) => {
    try {
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const productsCount = await pool.query('SELECT COUNT(*) FROM products');
        const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
        
        res.json({
            users: parseInt(usersCount.rows[0].count),
            products: parseInt(productsCount.rows[0].count),
            orders: parseInt(ordersCount.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;