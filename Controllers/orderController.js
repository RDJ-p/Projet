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
      const isAdmin = req.user.role === 'admin';
      const userId = req.user.id;

      const baseQuery = `
        SELECT o.id, o.user_id, o.total, o.status, o.created_at, o.tracking_number,
               json_agg(json_build_object(
                  'product_id', oi.product_id,
                  'product_name', oi.product_name,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'image_url', p.image
               )) AS items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
      `;

      const whereClause = isAdmin ? '' : 'WHERE o.user_id = $1';
      const groupOrderClause = 'GROUP BY o.id ORDER BY o.created_at DESC';

      const fullQuery = [baseQuery, whereClause, groupOrderClause].join(' ');
      const values = isAdmin ? [] : [userId];

      const result = await pool.query(fullQuery, values);

      res.json({ success: true, orders: result.rows });

    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
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
  },

  // ✏️ Admin: Update order status and tracking number
  updateShippingStatus: async (req, res) => {
    const { orderId } = req.params;
    const { status, tracking_number } = req.body;

    try {
let finalStatus = status;
if (finalStatus === undefined || finalStatus === null) {
  const existing = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, error: "Order not found" });
  }
  finalStatus = existing.rows[0].status;
}

const result = await pool.query(
  `UPDATE orders
   SET status = $1, tracking_number = $2
   WHERE id = $3
   RETURNING id, status, tracking_number`,
  [finalStatus, tracking_number, orderId]
);



      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      res.json({ success: true, order: result.rows[0] });
    } catch (error) {
      console.error('Error updating shipping:', error);
      res.status(500).json({ success: false, error: 'Failed to update shipping info' });
    }
  },

  deleteUnconfirmedOrder: async (req, res) => {
    const { orderId } = req.params;

    try {
      const check = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);

      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (check.rows[0].status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Only pending orders can be deleted' });
      }

      await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);

      res.json({ success: true, message: 'Order deleted successfully' });

    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete order' });
    }
  },

  deleteAllUnconfirmedOrders: async (req, res) => {
    try {
      const pendingOrders = await pool.query(
        'SELECT id FROM orders WHERE status = $1',
        ['pending']
      );

      const orderIds = pendingOrders.rows.map(row => row.id);

      if (orderIds.length === 0) {
        return res.json({ success: true, message: 'No pending orders to delete' });
      }

      await pool.query('DELETE FROM order_items WHERE order_id = ANY($1)', [orderIds]);
      await pool.query('DELETE FROM orders WHERE id = ANY($1)', [orderIds]);

      res.json({ success: true, message: `${orderIds.length} unconfirmed orders deleted` });

    } catch (error) {
      console.error('Error bulk deleting unconfirmed orders:', error);
      res.status(500).json({ success: false, error: 'Failed to delete unconfirmed orders' });
    }
  }
};

module.exports = orderController;
