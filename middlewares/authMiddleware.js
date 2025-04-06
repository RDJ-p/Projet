const jwt = require('jsonwebtoken');

const authMiddleware = {
  isAuthenticated: (req, res, next) => {
    try {
      const authHeader = req.headers?.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;

      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Authorization token required' 
        });
      }

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
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;

    if (!token) return next();

    res.status(403).json({ 
      success: false,
      message: 'You are already logged in' 
    });
  }
};

module.exports = authMiddleware;
