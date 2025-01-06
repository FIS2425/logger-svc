import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

export const verifyAdminAuth = (req, res, next) => {
  const token = req.cookies && req.cookies.token

  if (!token) {
    logger.error('Error on token validation', {
      method: req.method,
      url: req.originalUrl,
      ip: req.headers && req.headers['x-forwarded-for'] || req.ip,
      requestId: req.headers && req.headers['x-request-id'] || null,
      error: 'Access denied: No token provided',
    });
    return res.status(401).send({ error: 'Access denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.roles.includes('admin')) {
      logger.error('Error on token validation', {
        method: req.method,
        url: req.originalUrl,
        ip: req.headers && req.headers['x-forwarded-for'] || req.ip,
        requestId: req.headers && req.headers['x-request-id'] || null,
        userId: decoded.userId,
        error: 'Access denied. Insufficient permissions.',
        roles: decoded.roles
      });
      return res.status(403).send({ error: 'Access denied: Insufficient permissions' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Error on token validation', {
      method: req.method,
      url: req.originalUrl,
      ip: req.headers && req.headers['x-forwarded-for'] || req.ip,
      requestId: req.headers && req.headers['x-request-id'] || null,
      error: error.message
    });
    res.status(400).send({ error: 'Invalid token', message: error.message });
  }
};