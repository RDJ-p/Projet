const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const submitExchangeRequest = async (req, res) => {
    try {
        console.log('File received:', req.file);
        console.log('Form data:', req.body);

        if (!req.file) {
            return res.status(400).json({ error: 'File upload failed' });
        }

        const { upload_title, upload_type, exchange_option, exchange_title, exchange_reason } = req.body;

        const file_data = req.file.buffer;

        const user_id = req.user.id;
        
        const result = await pool.query(
            'INSERT INTO exchanges (user_id, title, type, file_data, exchange_option, desired_title, reason) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [user_id, upload_title, upload_type, file_data, exchange_option, exchange_title, exchange_reason]
        );

        res.status(201).json({ message: 'Exchange request submitted', data: result.rows[0] });
    } catch (error) {
        console.error('Error in submitExchangeRequest:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getUserExchangeRequests = async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const result = await pool.query('SELECT * FROM exchanges WHERE user_id = $1', [user_id]);

        res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getAllExchangeRequests = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exchanges ORDER BY created_at DESC');
        res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteExchangeRequest = async (req, res) => {
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
};

module.exports = {
    submitExchangeRequest,
    getUserExchangeRequests,
    getAllExchangeRequests,
    deleteExchangeRequest
};
