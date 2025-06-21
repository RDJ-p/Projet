const pool = require('../config/db');

exports.getMyBooks = async (req, res) => {
  const userId = req.user.id;
 const result = await pool.query(
  'SELECT * FROM user_books WHERE user_id = $1 AND exchanged = false ORDER BY added_at DESC',
  [userId]
);
  res.json(result.rows);
};

exports.getAvailableBooks = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  const {
    search = '',
    type,
    condition,
    genre,
    city,
    sort = 'recent'
  } = req.query;

  let filters = [`user_id != $1`, `available = true`];
  let values = [userId];
  let i = 2;

  if (search) {
    filters.push(`(LOWER(title) LIKE $${i} OR LOWER(author) LIKE $${i})`);
    values.push(`%${search.toLowerCase()}%`);
    i++;
  }

  if (type) {
    filters.push(`type = $${i}`);
    values.push(type);
    i++;
  }

  if (condition) {
    filters.push(`condition = $${i}`);
    values.push(condition);
    i++;
  }

  if (genre) {
    filters.push(`LOWER(genre) = $${i}`);
    values.push(genre.toLowerCase());
    i++;
  }

  if (city) {
    filters.push(`LOWER(city) = $${i}`);
    values.push(city.toLowerCase());
    i++;
  }

  let sortQuery = 'ORDER BY added_at DESC';
  if (sort === 'title_asc') sortQuery = 'ORDER BY title ASC';
  if (sort === 'title_desc') sortQuery = 'ORDER BY title DESC';

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT * FROM user_books 
       ${whereClause} 
       ${sortQuery}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM user_books 
       ${whereClause}`,
      values
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      books: result.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available books' });
  }
};

exports.addBook = async (req, res) => {
  const { title, type, author, condition, genre, notes, image_url, city } = req.body;
  const userId = req.user.id;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  const result = await pool.query(
    `INSERT INTO user_books 
      (user_id, title, type, author, condition, genre, notes, image_url, city) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId,
      title.trim(),
      type,
      author?.trim() || null,
      condition || null,
      genre?.trim() || null,
      notes?.trim() || null,
      image_url?.trim() || null,
      city?.trim() || null
    ]
  );

  res.status(201).json(result.rows[0]);
};

exports.proposeExchange = async (req, res) => {
  const {
    target_book_id,
    offer_title,
    reason,
    offer_author,
    offer_condition,
    offer_genre,
    offer_notes,
    offer_image_url,
    city
  } = req.body;

  const senderId = req.user.id;

  if (!target_book_id || !offer_title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await pool.query(
    `INSERT INTO exchange_proposals (
       sender_id, target_book_id, offer_title, reason,
       offer_author, offer_condition, offer_genre, offer_notes,
       offer_image_url, city
     ) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     RETURNING *`,
    [
      senderId,
      target_book_id,
      offer_title.trim(),
      reason || '',
      offer_author || null,
      offer_condition || null,
      offer_genre || null,
      offer_notes || null,
      offer_image_url || null,
      city?.trim() || null
    ]
  );

  res.status(201).json(result.rows[0]);
};

exports.getReceivedProposals = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(`
    SELECT 
      ep.*, 
      ub.title AS target_title,
      ub.image_url AS target_image_url,
      ub.author AS target_author,
      ub.genre AS target_genre,
      ub.condition AS target_condition,
      u.first_name || ' ' || u.last_name AS sender_name,
      CASE 
        WHEN ep.sender_id = $1 THEN ep.sender_confirmed 
        WHEN ub.user_id = $1 THEN ep.recipient_confirmed 
        ELSE false 
      END AS current_user_confirmed
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    JOIN users u ON ep.sender_id = u.id
    WHERE ub.user_id = $1 AND ep.status IN ('pending', 'accepted', 'completed', 'failed', 'rejected')
    ORDER BY ep.created_at DESC
  `, [userId]);

  res.json(result.rows);
};


exports.getSentProposals = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(`
    SELECT 
      ep.id,
      ep.status,
      ep.reason,
      ep.offer_title,
      ep.offer_author,
      ep.offer_condition,
      ep.offer_genre,
      ep.offer_notes,
      ep.offer_image_url,
      ep.city,
      ep.sender_confirmed,
      ep.recipient_confirmed,
      ub.title AS target_title,
      ub.image_url AS target_image_url,
      ub.author AS target_author,
      ub.genre AS target_genre,
      ub.condition AS target_condition,
      u.first_name || ' ' || u.last_name AS recipient_name,
      CASE 
        WHEN ep.sender_id = $1 THEN ep.sender_confirmed 
        WHEN ub.user_id = $1 THEN ep.recipient_confirmed 
        ELSE false 
      END AS current_user_confirmed
    FROM exchange_proposals ep
    LEFT JOIN user_books ub ON ep.target_book_id = ub.id
    JOIN users u ON ub.user_id = u.id
    WHERE ep.sender_id = $1
    ORDER BY ep.created_at DESC
  `, [userId]);

  res.json(result.rows);
};


exports.acceptProposal = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const check = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1
  `, [id]);

  if (!check.rows.length || check.rows[0].owner_id !== userId) {
    return res.status(403).json({ error: 'Not authorized to accept this proposal' });
  }

  await pool.query(`UPDATE exchange_proposals SET status = 'accepted' WHERE id = $1`, [id]);
  await pool.query(`UPDATE user_books SET available = false WHERE id = $1`, [check.rows[0].target_book_id]);

  res.json({ success: true });
};

exports.rejectProposal = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const check = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1
  `, [id]);

  if (!check.rows.length || check.rows[0].owner_id !== userId) {
    return res.status(403).json({ error: 'Not authorized to reject this proposal' });
  }

  await pool.query(`UPDATE exchange_proposals SET status = 'rejected' WHERE id = $1`, [id]);

  res.json({ success: true });
};

exports.deleteProposal = async (req, res) => {
  const proposalId = req.params.id;
  const userId = req.user.id;

  const check = await pool.query(
    `SELECT * FROM exchange_proposals WHERE id = $1 AND sender_id = $2`,
    [proposalId, userId]
  );

  if (!check.rows.length) {
    return res.status(403).json({ error: 'Not authorized to delete this proposal' });
  }

  await pool.query(`DELETE FROM exchange_proposals WHERE id = $1`, [proposalId]);

  res.json({ success: true });
};

exports.deleteBook = async (req, res) => {
  const bookId = req.params.id;
  const userId = req.user.id;

  const check = await pool.query(
    'SELECT * FROM user_books WHERE id = $1 AND user_id = $2',
    [bookId, userId]
  );

  if (!check.rows.length) {
    return res.status(403).json({ error: 'Not authorized to delete this book' });
  }

  await pool.query('DELETE FROM user_books WHERE id = $1', [bookId]);

  res.json({ success: true });
};

exports.completeExchange = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const proposalResult = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1 AND ep.status = 'accepted'
  `, [id]);

  const proposal = proposalResult.rows[0];
  if (!proposal || (proposal.sender_id !== userId && proposal.owner_id !== userId)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (proposal.sender_id === userId) {
    await pool.query(`UPDATE exchange_proposals SET sender_confirmed = true WHERE id = $1`, [id]);
  } else if (proposal.owner_id === userId) {
    await pool.query(`UPDATE exchange_proposals SET recipient_confirmed = true WHERE id = $1`, [id]);
  }

  const updated = await pool.query(`SELECT sender_confirmed, recipient_confirmed FROM exchange_proposals WHERE id = $1`, [id]);
  const bothConfirmed = updated.rows[0].sender_confirmed && updated.rows[0].recipient_confirmed;

  if (bothConfirmed) {
    await pool.query(`
      UPDATE exchange_proposals 
      SET status = 'completed', exchanged_at = NOW()
      WHERE id = $1
    `, [id]);

    await pool.query(`
      UPDATE user_books 
      SET available = false, exchanged = true 
      WHERE id = $1 OR (title = $2 AND user_id = $3)
    `, [proposal.target_book_id, proposal.offer_title, proposal.sender_id]);
  }

  res.json({ success: true, bothConfirmed });
};


exports.revertExchange = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const proposalCheck = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
    WHERE ep.id = $1 AND ep.status = 'completed'
  `, [id]);

  const proposal = proposalCheck.rows[0];

  if (!proposal || (proposal.sender_id !== userId && proposal.owner_id !== userId)) {
    return res.status(403).json({ error: 'Not authorized to revert this exchange' });
  }

  const now = new Date();
  const exchangedAt = proposal.exchanged_at ? new Date(proposal.exchanged_at) : null;

if (exchangedAt && now - exchangedAt > 10 * 1000) {
  return res.status(403).json({ error: 'Revert window expired (10s passed).' });
}

  if (proposal.revert_count >= 1) {
    return res.status(403).json({ error: 'This exchange has already been reverted once and cannot be reverted again.' });
  }

  await pool.query(`
    UPDATE exchange_proposals 
    SET status = 'accepted', exchanged_at = NULL, revert_count = revert_count + 1,
        sender_confirmed = false, recipient_confirmed = false
    WHERE id = $1
  `, [id]);

  await pool.query(`
    UPDATE user_books 
    SET available = true, exchanged = false 
    WHERE id = $1 OR (title = $2 AND user_id = $3)
  `, [proposal.target_book_id, proposal.offer_title, proposal.sender_id]);

  res.json({ success: true });
};
exports.cancelProposal = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await pool.query(
    'UPDATE exchange_proposals SET status = $1 WHERE id = $2 AND sender_id = $3 RETURNING *',
    ['cancelled', id, userId]
  );

  if (!result.rows.length) {
    return res.status(403).json({ error: 'Not authorized to cancel this proposal' });
  }

  res.json({ success: true });
};


exports.failExchange = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  const check = await pool.query(`
    SELECT ep.*, ub.user_id AS owner_id
    FROM exchange_proposals ep
    JOIN user_books ub ON ep.target_book_id = ub.id
WHERE ep.id = $1 AND ep.status IN ('accepted', 'completed')
  `, [id]);

  const proposal = check.rows[0];

  if (!proposal || (proposal.sender_id !== userId && proposal.owner_id !== userId)) {
    return res.status(403).json({ error: 'Not authorized to fail this exchange' });
  }

  await pool.query(`
    UPDATE exchange_proposals 
    SET status = 'failed', failure_reason = $1, failed_at = NOW()
    WHERE id = $2
  `, [reason || null, id]);

  await pool.query(`
    UPDATE user_books 
    SET available = true, exchanged = false 
    WHERE id = $1 OR (title = $2 AND user_id = $3)
  `, [proposal.target_book_id, proposal.offer_title, proposal.sender_id]);

  res.json({ success: true });
};
