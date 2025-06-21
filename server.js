    const path = require('path');
    const express = require('express');
    const helmet = require('helmet');
    const cors = require('cors');
    const rateLimit = require('express-rate-limit');
    const bodyParser = require('body-parser');
    const session = require('express-session'); 
    const cookieParser = require('cookie-parser');
    const fs = require('fs');
    const multer = require('multer');

    require('dotenv').config();

    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(cookieParser());   

    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } 
    }));

    const cartRoutes = require('./Routes/cartRoutes');
    const productRoutes = require('./Routes/productRoutes');
    const authRoutes = require('./Routes/authRoutes');
    const exchangeRoutes = require('./Routes/exchange');
    const adminRoutes = require('./Routes/adminRoutes');
    const orderRoutes = require('./Routes/orderRoutes');
    const authMiddleware = require('./middlewares/authMiddleware');
    const wishlistRoutes = require('./routes/wishlistRoutes');
    const bookRoutes = require('./Routes/bookRoutes');
    const chatRoutes = require('./Routes/chatRoutes');
    const userRoutes = require('./Routes/userRoutes');
    const reviewRoutes = require('./Routes/reviewRoutes');

    app.use(helmet());
    app.use(cors({
        origin: 'http://localhost:3000', 
        credentials: true
    }));

    app.use(bodyParser.json());
    app.use(express.urlencoded({ extended: true }));

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
    });

    app.use('/api/cart', cartRoutes);
    app.use('/api/products', productRoutes);
    app.use('/auth', authLimiter, authRoutes);
    app.use('/api/exchange', authMiddleware.isAuthenticated, exchangeRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/wishlist', wishlistRoutes);
    app.use('/api/books', bookRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/posts', require('./routes/blogPostRoutes'));

    app.get('/api/user', authMiddleware.isAuthenticated, (req, res) => {
        const { id, name, email, role } = req.user;
        res.json({
            success: true,
            id,
            name,
            email,
            role
        });
    });


    app.get('/dashboard', authMiddleware.isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, 'public/dashboard.html'));
    });

    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, 'public/ERROR.html'));
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    });

    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
    });
