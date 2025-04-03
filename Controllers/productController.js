const pool = require('../config/db'); 

const productController = {
    getAllProducts: async (req, res) => {
        try {
            let { page = 1, limit = 12, minPrice = 0, maxPrice = 10000, category = '', search = '', sort = 'asc' } = req.query;
            
            page = parseInt(page);
            limit = parseInt(limit);
            minPrice = parseFloat(minPrice);
            maxPrice = parseFloat(maxPrice);
            sort = sort === "desc" ? "DESC" : "ASC";
    
            const offset = (page - 1) * limit;
    
            let query = `SELECT * FROM products WHERE price BETWEEN $1 AND $2`;
            let values = [minPrice, maxPrice];
    
            if (category) {
                query += ` AND LOWER(category) = LOWER($3)`;
                values.push(category);
            }
    
            if (search) {
                query += ` AND (LOWER(title) LIKE $${values.length + 1} OR LOWER(author) LIKE $${values.length + 1})`;
                values.push(`%${search}%`);
            }
    
            query += ` ORDER BY price ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
            values.push(limit, offset);
    
            const result = await pool.query(query, values);
            const totalCountQuery = await pool.query(`SELECT COUNT(*) FROM products WHERE price BETWEEN $1 AND $2`, [minPrice, maxPrice]);
    
            res.json({
                products: result.rows,
                totalPages: Math.ceil(totalCountQuery.rows[0].count / limit),
                totalProducts: totalCountQuery.rows[0].count,
                maxPrice
            });
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    },
    getProductById: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching product by ID:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }
};

module.exports = productController;
