const { verifyToken } = require('../utils/jwt');
const { User } = require('../../models');

/**
 * Protect routes - verify user is authenticated via JWT session token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No session token provided.' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, error: 'Access denied. Invalid or expired token.' });
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Access denied. User no longer exists.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, error: 'Access denied. User account is not active.' });
    }

    // Expose user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 * @param {...string} roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Permission denied. Required role: [${roles.join(', ')}]. Current role: [${req.user ? req.user.role : 'None'}].`
      });
    }
    next();
  };
};
