const pool = require('../config/db');

exports.createExchange = async (req, res) => {
  const userId = req.user?.id;
  const { upload_title, upload_type, exchange_title, exchange_reason } = req.body;

  if (!userId || !upload_title || !upload_type || !exchange_title || !exchange_reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO exchanges (user_id, title, type, exchange_op, desired_title, reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [
      userId,
      upload_title,
      upload_type,
      'exchange', 
      exchange_title,
      exchange_reason
    ];

    const result = await pool.query(query, values);

    res.status(201).json({ success: true, exchange: result.rows[0] });
  } catch (err) {
    console.error('Exchange insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
