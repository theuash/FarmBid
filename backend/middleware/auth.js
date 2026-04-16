const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches the decoded user payload to req.user
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token format'
    });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_random_string_change_this';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * Middleware to authorize user role
 * Usage: authorizeRole('admin', 'farmer', 'buyer')
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' not authorized for this resource`
      });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRole
};
