import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { getCollection } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hashed] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(attempt, 'hex'));
}

export async function registerUser({ email, password }) {
  const users = await getCollection('users');
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Utilisateur déjà existant');
    err.status = 409;
    throw err;
  }
  const passwordHash = hashPassword(password);
  const now = new Date();
  const user = { email: email.toLowerCase(), passwordHash, createdAt: now, updatedAt: now };
  const { insertedId } = await users.insertOne(user);
  return { _id: insertedId, email: user.email };
}

export async function loginUser({ email, password }) {
  const users = await getCollection('users');
  const user = await users.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }
  const ok = verifyPassword(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign({ sub: String(user._id), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
  return { token };
}

export function requireAuth(req) {
  const auth = req.headers.authorization || '';
  const [scheme, value] = auth.split(' ');
  if (scheme !== 'Bearer' || !value) {
    const err = new Error('Non authentifié');
    err.status = 401;
    throw err;
  }
  try {
    const payload = jwt.verify(value, JWT_SECRET);
    return payload;
  } catch (_e) {
    const err = new Error('Token invalide');
    err.status = 401;
    throw err;
  }
}
