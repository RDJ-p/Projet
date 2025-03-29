const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

router.post('/', authMiddleware.isAuthenticated, upload.single('file_upload'), async (req, res) => {
    try {
        const { upload_title, upload_type, exchange_option, exchange_title, exchange_reason } = req.body;
        const file_path = req.file ? req.file.path : null;
        const user_id = req.session.user.id;

        const result = await pool.query(
            'INSERT INTO exchanges (user_id, title, type, file_path, exchange_option, desired_title, reason) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [user_id, upload_title, upload_type, file_path, exchange_option, exchange_title, exchange_reason]
        );

        res.status(201).json({ message: 'Exchange request submitted', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/my-requests', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const result = await pool.query('SELECT * FROM exchanges WHERE user_id = $1', [user_id]);

        res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exchanges ORDER BY created_at DESC');
        res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const { id } = req.params;

        const result = await pool.query('DELETE FROM exchanges WHERE id = $1 AND user_id = $2 RETURNING *', [id, user_id]);

        if (result.rowCount === 0) {
            return res.status(403).json({ error: 'Not authorized to delete this request' });
        }

        res.json({ success: true, message: 'Exchange request deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
