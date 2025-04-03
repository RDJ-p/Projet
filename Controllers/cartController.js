const pool = require('../config/db'); 

const cartController = {
    getCart: (req, res) => {
        const cart = req.session.cart || [];
        res.json({ success: true, count: cart.length, items: cart });
        console.log("Session Data:", req.session);
    },

    addToCart: async (req, res) => {
        try {
            const { productId, quantity } = req.body;

            if (!productId || !quantity) {
                return res.status(400).json({ success: false, error: 'Product ID and quantity are required' });
            }

            const result = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }

            const product = result.rows[0]; 
            const newItem = {
                productId: product.id,
                productName: product.title,
                price: product.price,
                quantity: parseInt(quantity),
                image: product.image
            };

            if (!req.session.cart) req.session.cart = [];
            const existingItem = req.session.cart.find(item => item.productId === newItem.productId);

            if (existingItem) {
                existingItem.quantity += newItem.quantity;
            } else {
                req.session.cart.push(newItem);
            }

            res.json({ success: true, message: 'Item added to cart', item: newItem });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    },

    removeFromCart: (req, res) => {
        const { productId } = req.params;
        req.session.cart = req.session.cart.filter(item => item.productId !== parseInt(productId));
        res.json({ success: true, message: 'Item removed from cart' });
    },

    clearCart: (req, res) => {
        req.session.cart = [];
        res.json({ success: true, message: 'Cart cleared' });
    },

    updateCartQuantity: (req, res) => {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!req.session.cart) {
            return res.status(400).json({ success: false, error: 'Cart is empty' });
        }

        const item = req.session.cart.find(item => item.productId === parseInt(productId));
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        if (parseInt(quantity) <= 0) {
            return res.status(400).json({ success: false, error: 'Quantity must be greater than 0' });
        }

        item.quantity = parseInt(quantity);

        res.json({ success: true, message: 'Quantity updated', item });
    }
};

module.exports = cartController;
