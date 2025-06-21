const pool = require('../config/db');

exports.createPost = async (req, res) => {
  const {
    title,
    content,
    book_title,
    author,
    genre,
    language,
    pages,
    published,
    summary,
    quote,
    cover
  } = req.body;

  const userId = req.user.id;

  if (
    !title || !content || !book_title || !author || !genre ||
    !language || !pages || !published || !summary || !quote || !cover
  ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO blog_posts 
        (user_id, title, content, book_title, author, genre, language, pages, published, summary, quote, cover)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        title,
        content,
        book_title,
        author,
        genre,
        language,
        pages,
        published,
        summary,
        quote,
        cover
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.addComment = async (req, res) => {
  const { postId } = req.params;
  const { content, rating, parent_comment_id } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO blog_comments (post_id, user_id, content, rating, parent_comment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        postId,
        userId,
        content,
        rating === undefined ? null : rating, // allow null for replies
        parent_comment_id || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

exports.getComments = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS name
       FROM blog_comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = $1 
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
const result = await pool.query(
  `SELECT bp.*, 
       bp.author AS book_author,
       u.first_name || ' ' || u.last_name AS posted_by
   FROM blog_posts bp
   JOIN users u ON bp.user_id = u.id
   ORDER BY bp.created_at DESC`
);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
};

exports.getPostById = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await pool.query(
      `SELECT bp.*, 
       bp.author AS book_author,
       u.first_name || ' ' || u.last_name AS posted_by
       FROM blog_posts bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.id = $1`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};
exports.getUserPosts = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT bp.*, 
              bp.author AS book_author,
              u.first_name || ' ' || u.last_name AS posted_by
       FROM blog_posts bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.user_id = $1
       ORDER BY bp.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load user posts' });
  }
};
exports.deletePost = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.id;

  try {
    const check = await pool.query('SELECT * FROM blog_posts WHERE id = $1 AND user_id = $2', [postId, userId]);

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    const check = await pool.query(
      'SELECT * FROM blog_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    await pool.query('DELETE FROM blog_comments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
