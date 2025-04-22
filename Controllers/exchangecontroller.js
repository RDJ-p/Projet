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
      upload_title.trim().toLowerCase(),
      upload_type,
      'exchange',
      exchange_title.trim().toLowerCase(),
      exchange_reason
    ];

    const result = await pool.query(query, values);
    const insertedExchange = result.rows[0];

    const matchQuery = `
      SELECT e.*, u.first_name, u.last_name, u.email AS user_email
      FROM exchanges e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id != $1
        AND ((e.title = $2 AND e.desired_title = $3) OR (e.title = $3 AND e.desired_title = $2))
    `;
  
    const matchValues = [userId, insertedExchange.title, insertedExchange.desired_title];
    const matchResult = await pool.query(matchQuery, matchValues);

    res.status(201).json({
      success: true,
      exchange: insertedExchange,
      matches: matchResult.rows.length > 0 ? matchResult.rows : null
    });
  } catch (err) {
    console.error('Exchange insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExchanges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const pendingRequests = await pool.query(
      'SELECT * FROM exchanges WHERE user_id = $1', 
      [userId]
    );

    const matchesQuery = `
      SELECT e.*, u.first_name, u.last_name, u.email AS user_email 
      FROM exchanges e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id != $1
        AND e.desired_title IN (SELECT title FROM exchanges WHERE user_id = $1)
        AND e.title IN (SELECT desired_title FROM exchanges WHERE user_id = $1)
    `;
    const matchesResult = await pool.query(matchesQuery, [userId]);

    res.json({
      success: true,
      pending: pendingRequests.rows,
      matches: matchesResult.rows
    });
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchanges' });
  }
};