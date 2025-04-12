const pool = require('../config/db');

const orderController = {
    createOrder: async (req, res) => {
        try {
            const userId = req.user.id;
            
            const cartResult = await pool.query(
                'SELECT * FROM carte WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot create order with empty cart' 
                });
            }

            const totalResult = await pool.query(
                'SELECT SUM(price * quantity) AS total FROM carte WHERE user_id = $1',
                [userId]
            );
            const total = totalResult.rows[0].total;

            const orderResult = await pool.query(
                `INSERT INTO orders (user_id, total, status)
                 VALUES ($1, $2, 'pending')
                 RETURNING id, created_at`,
                [userId, total]
            );
            
            const orderId = orderResult.rows[0].id;

            for (const item of cartResult.rows) {
                const productResult = await pool.query(
                    'SELECT title FROM products WHERE id = $1', 
                    [item.product_id]
                );
                
                const productTitle = productResult.rows[0]?.title || 'Unknown Product';  

                await pool.query(
                    `INSERT INTO order_items 
                        (order_id, product_id, product_name, quantity, price)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, item.product_id, productTitle, item.quantity, item.price]  
                );
            }

            await pool.query('DELETE FROM carte WHERE user_id = $1', [userId]);

            res.json({
                success: true,
                orderId,
                total,
                items: cartResult.rows,
                createdAt: orderResult.rows[0].created_at
            });
            
        } catch (error) {
            console.error('Error creating order:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create order' 
            });
        }
    },

    getOrders: async (req, res) => {
        try {
            const userId = req.user.id;
            
            const result = await pool.query(
                `SELECT o.id, o.total, o.status, o.created_at,
                        json_agg(json_build_object(
                            'product_id', oi.product_id,
                            'product_name', oi.product_name,
                            'quantity', oi.quantity,
                            'price', oi.price
                        )) AS items
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 WHERE o.user_id = $1
                 GROUP BY o.id, o.total, o.status, o.created_at
                 ORDER BY o.created_at DESC`,
                [userId]
            );

            res.json({ success: true, orders: result.rows });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch orders' 
            });
        }
    },

    getOrderById: async (req, res) => {
        try {
            const userId = req.user.id;
            const orderId = req.params.id;

            const result = await pool.query(
                `SELECT o.id, o.total, o.status, o.created_at,
                        json_agg(json_build_object(
                            'product_id', oi.product_id,
                            'product_name', oi.product_name,
                            'quantity', oi.quantity,
                            'price', oi.price
                        )) AS items
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 WHERE o.user_id = $1 AND o.id = $2
                 GROUP BY o.id`,
                [userId, orderId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Order not found' 
                });
            }

            res.json({ success: true, order: result.rows[0] });
        } catch (error) {
            console.error('Error fetching order:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch order' 
            });
        }
    }
};

module.exports = orderController;
