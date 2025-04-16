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
      SELECT * FROM exchanges 
      WHERE user_id != $1
        AND title = $2
        AND desired_title = $3;
    `;
    const matchValues = [userId, insertedExchange.desired_title, insertedExchange.title];
    const matchResult = await pool.query(matchQuery, matchValues);

    const reverseMatchQuery = `
      SELECT * FROM exchanges 
      WHERE user_id != $1
        AND title = $2
        AND desired_title = $3;
    `;
    const reverseMatchValues = [userId, insertedExchange.title, insertedExchange.desired_title];
    const reverseMatchResult = await pool.query(reverseMatchQuery, reverseMatchValues);

    const matches = [...matchResult.rows, ...reverseMatchResult.rows];

    res.status(201).json({
      success: true,
      exchange: insertedExchange,
      matches: matches.length > 0 ? matches : null
    });
  } catch (err) {
    console.error('Exchange insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
  
};
