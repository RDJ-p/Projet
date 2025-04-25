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
    res.status(500).json({ success: false, error: 'Failed to fetch exchanges' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;

    const exchangeInfo = await pool.query(
      `SELECT * FROM exchanges WHERE id = $1`,
      [exchangeId]
    );

    if (exchangeInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    const currentExchange = exchangeInfo.rows[0];

    // Check if user is part of any reciprocal exchange
    const isParticipant = await pool.query(
      `SELECT 1 FROM exchanges 
       WHERE user_id = $1 AND (
         (title = $2 AND desired_title = $3) OR 
         (title = $3 AND desired_title = $2)
       )`,
      [userId, currentExchange.title, currentExchange.desired_title]
    );

    if (currentExchange.user_id !== userId && isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this exchange' });
    }

    // Get messages from ALL reciprocal exchanges
    const messages = await pool.query(
      `SELECT m.*, u.first_name || ' ' || u.last_name as sender_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE exchange_id IN (
         SELECT id FROM exchanges 
         WHERE (title = $1 AND desired_title = $2)
            OR (title = $2 AND desired_title = $1)
       )
       ORDER BY timestamp ASC`,
      [currentExchange.title, currentExchange.desired_title]
    );

    res.json(messages.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Message content required' });
    }

    await pool.query(
      `INSERT INTO messages (exchange_id, sender_id, content)
       VALUES ($1, $2, $3)`,
      [exchangeId, userId, content.trim()]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};
