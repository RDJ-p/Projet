const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'chat_images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({ storage });
exports.uploadMiddleware = upload.single('image');

exports.getMessagesByProposal = async (req, res) => {
  const proposalId = parseInt(req.params.proposalId, 10);
  const userId = req.user.id;

  if (isNaN(proposalId)) {
    return res.status(400).json({ error: 'Invalid proposal ID' });
  }

  const proposalQuery = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1 AND ep.status = 'accepted'
  `, [proposalId]);

  if (!proposalQuery.rows.length) {
    return res.status(404).json({ error: 'Proposal not found or not accepted' });
  }

  const prop = proposalQuery.rows[0];

  if (prop.sender_id !== userId && prop.owner_id !== userId) {
    return res.status(403).json({ error: 'Not authorized to view messages for this proposal' });
  }

  const messagesQuery = await pool.query(`
    SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.exchange_id = $1
    ORDER BY timestamp ASC
  `, [prop.chat_id]);

  const partnerId = prop.sender_id === userId ? prop.owner_id : prop.sender_id;

  const partnerQuery = await pool.query(`
    SELECT first_name, last_name FROM users WHERE id = $1
  `, [partnerId]);

  const partnerName = partnerQuery.rows.length
    ? `${partnerQuery.rows[0].first_name} ${partnerQuery.rows[0].last_name}`
    : 'Unknown User';

  res.json({
    messages: messagesQuery.rows,
    partnerName
  });
};

exports.sendMessageByProposal = async (req, res) => {
  const proposalId = parseInt(req.params.proposalId, 10);
  const userId = req.user.id;
  const content = req.body.content?.trim();
  const image = req.file ? `/uploads/chat_images/${req.file.filename}` : null;

  if (isNaN(proposalId)) {
    return res.status(400).json({ error: 'Invalid proposal ID' });
  }

  if (!content && !image) {
    return res.status(400).json({ error: 'Message content or image is required' });
  }

  const proposalQuery = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1 AND ep.status = 'accepted'
  `, [proposalId]);

  if (!proposalQuery.rows.length) {
    return res.status(404).json({ error: 'Proposal not found or not accepted' });
  }

  const prop = proposalQuery.rows[0];
  if (prop.sender_id !== userId && prop.owner_id !== userId) {
    return res.status(403).json({ error: 'Not authorized to send messages for this proposal' });
  }

  await pool.query(`
    INSERT INTO messages (exchange_id, sender_id, content, image_url)
    VALUES ($1, $2, $3, $4)
  `, [prop.chat_id, userId, content || null, image]);

  res.json({ success: true });
};

exports.getUserConversations = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(`
    SELECT ep.id, ep.chat_id, ep.offer_title, ep.reason, ep.created_at,
           ub.title AS target_title,
           u.first_name || ' ' || u.last_name AS other_user,
           CASE WHEN ep.sender_id = $1 THEN 'sent' ELSE 'received' END AS role
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    JOIN users u ON u.id = CASE WHEN ep.sender_id = $1 THEN ub.user_id ELSE ep.sender_id END
    WHERE (ep.sender_id = $1 OR ub.user_id = $1)
      AND ep.status = 'accepted'
    ORDER BY ep.created_at DESC
  `, [userId]);

  res.json(result.rows);
};

exports.reportMessage = async (req, res) => {
  const messageId = parseInt(req.params.messageId, 10);
  const userId = req.user.id;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  try {
    await pool.query(
      `INSERT INTO message_reports (message_id, reported_by, reason)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [messageId, userId, reason.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to report message:', err);
    res.status(500).json({ error: 'Database error while reporting message' });
  }
};

exports.deleteMessage = async (req, res) => {
  const messageId = parseInt(req.params.messageId, 10);
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or message not found' });
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
