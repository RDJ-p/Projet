const pool = require('../config/db'); 

const productController = {
    getAllProducts: async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM products");
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching all products:', error);
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
