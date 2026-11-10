import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { redisClient, keys } from '../services/redis.js';

export function generateAccessToken(userId) {
  const jti = uuidv4();
  const token = jwt.sign({ sub: userId, jti }, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  });
  return { token, jti };
}

export function generateRefreshToken(userId) {
  const jti = uuidv4();
  const token = jwt.sign({ sub: userId, jti, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
  return { token, jti };
}

/** Blacklist a JTI until its natural expiry */
export async function invalidateToken(jti, expiresIn = 900) {
  await redisClient.set(keys.session(jti), '1', 'EX', expiresIn);
}

/** Parse remaining lifetime from a JWT without verifying signature */
export function tokenRemainingSeconds(token, secret) {
  try {
    const { exp } = jwt.decode(token);
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}
