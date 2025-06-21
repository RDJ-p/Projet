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

            const totalCountQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
            const countResult = await pool.query(totalCountQuery, values);
            const totalProducts = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalProducts / limit);

            const maxPriceResult = await pool.query(`SELECT MAX(price) AS max FROM products`);
            const maxPriceAvailable = maxPriceResult.rows[0].max || 100;

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
        let values = [parseFloat(maxPrice), `%${author}%`];
        let query = `
            SELECT *,
                (
                    (CASE 
                        WHEN LOWER(author) = LOWER($2) THEN 3
                        WHEN LOWER(author) LIKE LOWER($2) THEN 2
                        ELSE 0
                    END) * 2 +
                    (CASE 
                        WHEN LOWER(category) = LOWER($3) THEN 2
                        ELSE 0
                    END) -
                    ABS(price - $1) / 10
                ) AS score
            FROM products
            WHERE price <= $1
              AND stock_status = 'In Stock'
        `;

        if (category) {
            values.push(category);
            query += ` AND LOWER(category) = LOWER($3)`;
        }

        query += ` ORDER BY score DESC LIMIT 5`;

        const result = await pool.query(query, values);

        res.json(result.rows.length > 0 ? result.rows : []);
    } catch (error) {
        console.error("Error in AI recommendation:", error);
        res.status(500).json({ error: "Failed to recommend a book." });
    }
},


    addToCart: async (req, res) => {
        const { productId, quantity } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié." });
        }

        try {
            const result = await pool.query("SELECT * FROM products WHERE id = $1", [productId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Produit introuvable." });
            }

            const product = result.rows[0];

            if (product.stock_status !== "In Stock") {
                return res.status(400).json({ error: "Ce produit est en rupture de stock." });
            }

            await pool.query(`
                INSERT INTO cart (user_id, product_id, quantity)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, product_id)
                DO UPDATE SET quantity = cart.quantity + $3
            `, [userId, productId, quantity]);

            res.json({ message: "Produit ajouté au panier." });

        } catch (error) {
            console.error("Erreur lors de l'ajout au panier :", error);
            res.status(500).json({ error: "Erreur serveur lors de l'ajout au panier." });
        }
    },

    getSimilarBooks: async (req, res) => {
        const { category, maxPrice = 10000 } = req.query;

        if (!category) {
            return res.status(400).json({ error: 'Category is required.' });
        }

        try {
            const query = `
                SELECT id, title, image, price 
                FROM products 
                WHERE LOWER(category) = LOWER($1) 
                  AND price <= $2
                ORDER BY RANDOM()
                LIMIT 6
            `;
            const values = [category, maxPrice];

            const result = await pool.query(query, values);

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching similar books:', error);
            res.status(500).json({ error: 'Failed to fetch similar books.' });
        }
    }
};

module.exports = productController;
