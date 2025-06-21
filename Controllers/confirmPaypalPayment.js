const axios = require('axios');
const pool = require('../config/db');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const getPaypalAccessToken = async () => {
    const response = await axios({
        method: 'post',
        url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            username: PAYPAL_CLIENT_ID,
            password: PAYPAL_CLIENT_SECRET
        },
        data: 'grant_type=client_credentials'
    });

    return response.data.access_token;
};

const getPaypalOrderDetails = async (orderId, accessToken) => {
    const response = await axios({
        method: 'get',
        url: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    return response.data;
};

const confirmPaypalPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paypalOrderId } = req.body;

        const accessToken = await getPaypalAccessToken();
        const orderDetails = await getPaypalOrderDetails(paypalOrderId, accessToken);

        const payerEmail = orderDetails.payer.email_address;

        const orderResult = await pool.query(`
            SELECT id FROM orders
            WHERE user_id = $1 AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No pending order to update' });
        }

        const orderId = orderResult.rows[0].id;

        await pool.query(`
            UPDATE orders
            SET status = 'processed',
                paypal_order_id = $1,
                payer_email = $2,
                payment_status = 'paid'
            WHERE id = $3
        `, [paypalOrderId, payerEmail, orderId]);

        res.json({ success: true, message: 'Order updated to processed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Payment confirmation failed' });
    }
};

module.exports = {
    confirmPaypalPayment
};
