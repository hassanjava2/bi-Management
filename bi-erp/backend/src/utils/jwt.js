/**
 * BI ERP - JWT utilities
 */

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/auth');
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '7d';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function generateToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_ACCESS_EXPIRES });
}

function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, SECRET_KEY, { expiresIn: JWT_REFRESH_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (e) {
    if (e.name === 'TokenExpiredError') return { expired: true, error: 'TOKEN_EXPIRED' };
    if (e.name === 'JsonWebTokenError') return { invalid: true, error: 'INVALID_TOKEN' };
    return null;
  }
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { generateToken, generateRefreshToken, verifyToken, decodeToken };
