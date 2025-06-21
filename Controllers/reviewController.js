const db = require('../config/db');

exports.getReviewsByBookId = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM reviews WHERE book_id = $1 ORDER BY created_at DESC',
      [bookId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error fetching reviews' });
  }
};

exports.postReview = async (req, res) => {
  try {
    const { book_id, content, stars } = req.body;
    const name = req.user.name;

    if (!book_id || !content || !stars) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    await db.query(
      'INSERT INTO reviews (book_id, name, content, stars) VALUES ($1, $2, $3, $4)',
      [book_id, name, content, stars]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error posting review' });
  }
};
