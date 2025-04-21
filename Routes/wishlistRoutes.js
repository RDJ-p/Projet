const express = require('express');
const router = express.Router();
const pool = require('../config/db'); 

router.post('/', async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        await pool.query(
            'INSERT INTO wishlist (user_id, book_id) VALUES ($1, $2)',
            [userId, bookId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Could not add to wishlist' });
    }
});

router.get('/', async (req, res) => {
    const userId = req.query.userId;
    try {
        const result = await pool.query(`
            SELECT p.* FROM products p
            JOIN wishlist w ON p.id = w.book_id
            WHERE w.user_id = $1
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Could not fetch wishlist' });
    }
});

router.delete('/', async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        await pool.query(
            'DELETE FROM wishlist WHERE user_id = $1 AND book_id = $2',
            [userId, bookId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Could not remove from wishlist' });
    }
});

module.exports = router;
