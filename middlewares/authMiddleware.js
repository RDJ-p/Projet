const jwt = require('jsonwebtoken');

const authMiddleware = {
    isAuthenticated: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Authorization token required' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(403).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }
    },

    isGuest: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        if (!token) return next();
        
        res.status(403).json({ 
            success: false,
            message: 'You are already logged in' 
        });
    }
};


module.exports = authMiddleware;