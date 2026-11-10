import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { redisClient, keys } from '../services/redis.js';
import User from '../models/User.js';

/**
 * Validates the Bearer JWT and attaches req.user.
 * Checks Redis to reject invalidated (logged-out) tokens.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check Redis blacklist (logout)
  const blacklisted = await redisClient.exists(keys.session(payload.jti));
  if (blacklisted) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  // Fetch user (lightweight — ID only after first request if desired)
  const user = await User.findById(payload.sub).select('-password_hash').lean();
  if (!user || user.deleted_at) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.jti = payload.jti;
  next();
}

/**
 * Optional auth — sets req.user if token is valid, but doesn't fail.
 */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwt.secret);
    const blacklisted = await redisClient.exists(keys.session(payload.jti));
    if (!blacklisted) {
      req.user = await User.findById(payload.sub).select('-password_hash').lean();
      req.jti = payload.jti;
    }
  } catch { /* ignore */ }
  next();
}
