const pool = require('../config/db');

const cartController = {
    getCart: async (req, res) => {
        try {
            const userId = req.user.id; 

            const result = await pool.query(`
                SELECT 
                    product_id AS "productId", 
                    product_name AS "productName", 
                    price, 
                    quantity, 
                    image 
                FROM carte
                WHERE user_id = $1  -- Only fetch items for the authenticated user
            `, [userId]);

            res.json({ success: true, items: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    },

    addToCart: async (req, res) => {
        try {
            const userId = req.user.id; 
            const productId = parseInt(req.body.productId, 10);
            const quantity = parseInt(req.body.quantity, 10);
            
            if (isNaN(productId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Valid Product ID is required' 
                });
            }

            const productResult = await pool.query(
                'SELECT * FROM products WHERE id = $1',
                [productId]
            );
            if (productResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Product not found' 
                });
            }

            const product = productResult.rows[0];
            const newItem = {
                productId: product.id,
                productName: product.title, 
                price: product.price,
                quantity: quantity,
                image: product.image
            };

            const existingItem = await pool.query(
                'SELECT * FROM carte WHERE product_id = $1 AND user_id = $2',
                [productId, userId]
            );

            if (existingItem.rows.length > 0) {
                await pool.query(
                    'UPDATE carte SET quantity = quantity + $1 WHERE product_id = $2 AND user_id = $3',
                    [quantity, productId, userId]
                );
            } else {
                await pool.query(
                    `INSERT INTO carte 
                        (product_id, product_name, price, quantity, image, user_id) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [productId, product.title, product.price, quantity, product.image, userId]
                );
            }

            res.json({ 
                success: true, 
                message: 'Item added to cart', 
                item: newItem 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    },

    removeFromCart: async (req, res) => {
        try {
            const userId = req.user.id; 
            const productId = parseInt(req.params.productId, 10);
            
            if (isNaN(productId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Valid Product ID is required" 
                });
            }

            const result = await pool.query(
                'DELETE FROM carte WHERE product_id = $1 AND user_id = $2 RETURNING *',
                [productId, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: "Item not found" 
                });
            }

            res.json({ 
                success: true, 
                message: "Item removed from cart" 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                success: false, 
                error: "Server error" 
            });
        }
    },

    clearCart: async (req, res) => {
        try {
            const userId = req.user.id; 
            await pool.query('DELETE FROM carte WHERE user_id = $1', [userId]);
            res.json({ success: true, message: 'Cart cleared' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    },

    updateCartQuantity: async (req, res) => {
        try {
            const userId = req.user.id; 
            const productId = parseInt(req.params.productId, 10);
            const quantity = parseInt(req.body.quantity, 10);

            if (isNaN(productId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Valid Product ID is required" 
                });
            }

            if (quantity <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Quantity must be greater than 0' 
                });
            }

            const result = await pool.query(
                'UPDATE carte SET quantity = $1 WHERE product_id = $2 AND user_id = $3 RETURNING *',
                [quantity, productId, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Item not found' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Quantity updated', 
                item: result.rows[0] 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error' 
            });
        }
    }
};

module.exports = cartController;
