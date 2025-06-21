const pool = require('../config/db');

exports.getAllBlogBooks = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY title ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load blog books' });
  }
};

exports.getBlogBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load book' });
  }
};
