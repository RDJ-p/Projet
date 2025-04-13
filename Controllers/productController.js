const pool = require('../config/db'); 

const productController = {
    getAllProducts: async (req, res) => {
        try {
            let {
                page = 1,
                limit = 12,
                minPrice = 0,
                maxPrice = 10000,
                category = '',
                search = '',
                sort = 'asc'
            } = req.query;
    
            page = parseInt(page);
            limit = parseInt(limit);
            minPrice = parseFloat(minPrice);
            maxPrice = parseFloat(maxPrice);
            sort = sort.toLowerCase() === "desc" ? "DESC" : "ASC";
    
            const offset = (page - 1) * limit;
            const filters = [`price BETWEEN $1 AND $2`];
            const values = [minPrice, maxPrice];
            let paramIndex = 3;
    
            if (category) {
                filters.push(`LOWER(category) = LOWER($${paramIndex++})`);
                values.push(category);
            }
    
            if (search) {
                filters.push(`(LOWER(title) LIKE $${paramIndex} OR LOWER(author) LIKE $${paramIndex})`);
                values.push(`%${search.toLowerCase()}%`);
                paramIndex++;
            }
    
            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
            // Get total count
            const totalCountQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
            const countResult = await pool.query(totalCountQuery, values);
            const totalProducts = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalProducts / limit);
    
            // Get max price for slider
            const maxPriceResult = await pool.query(`SELECT MAX(price) AS max FROM products`);
            const maxPriceAvailable = maxPriceResult.rows[0].max || 100;
    
            // Final product query
            const productQuery = `
                SELECT * FROM products
                ${whereClause}
                ORDER BY price ${sort}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            values.push(limit, offset);
    
            const result = await pool.query(productQuery, values);
    
            res.json({
                products: result.rows,
                totalPages,
                totalProducts,
                maxPrice: maxPriceAvailable
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
    },

    recommendBook: async (req, res) => {
        const { author = '', maxPrice = 10000, category = '' } = req.query;

        try {
            let query = `SELECT *, 
                            CASE 
                                WHEN LOWER(author) = LOWER($2) THEN 2
                                WHEN LOWER(author) LIKE LOWER($2) THEN 1
                                ELSE 0
                            END AS author_score,
                            ABS(price - $1) AS price_diff
                        FROM products
                        WHERE price <= $1`;
            let values = [maxPrice, `%${author}%`];

            if (category) {
                query += ` AND LOWER(category) = LOWER($3)`;
                values.push(category);
            }

            query += ` ORDER BY author_score DESC, price_diff ASC LIMIT 1`;

            const result = await pool.query(query, values);

            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.json({});
            }
        } catch (error) {
            console.error("Error in AI recommendation:", error);
            res.status(500).json({ error: "Failed to recommend a book." });
        }
    }
};

module.exports = productController;
