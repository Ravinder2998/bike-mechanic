const crypto = require('crypto');
const db = require('./db');

const activeSessions = new Map();
const loginAttempts = new Map();
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS) || 24;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function checkRateLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { allowed: false, message: `Too many failed attempts. Try again in ${Math.ceil((record.lockedUntil - Date.now()) / 60000)} minute(s).` };
  }
  if (record.lockedUntil) loginAttempts.delete(ip);
  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const record = loginAttempts.get(ip) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) record.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
  loginAttempts.set(ip, record);
  return record;
}

function fingerprint(req) {
  return crypto.createHash('sha256').update(`${req.ip || ''}|${req.headers['user-agent'] || ''}`).digest('hex');
}

async function ensureInitialAdmin() {
  const username = String(process.env.INITIAL_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const displayName = String(process.env.INITIAL_ADMIN_NAME || 'Workshop Administrator').trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const existing = await db.getAdminByUsername(username);
  if (existing || !password) return;
  if (password.length < 12) {
    console.warn('[AUTH] INITIAL_ADMIN_PASSWORD must be at least 12 characters. No initial admin was created.');
    return;
  }
  const { hash, salt } = hashPassword(password);
  await db.createAdmin({ username, displayName, passwordSalt: salt, passwordHash: hash });
  console.log(`[AUTH] Initial administrator '${username}' created.`);
}

async function login(username, password, req) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const limit = checkRateLimit(ip);
  if (!limit.allowed) return { success: false, status: 429, error: limit.message };
  const user = await db.getAdminByUsername(String(username || '').trim());
  if (!user || !user.isActive || !verifyPassword(String(password || ''), user.passwordSalt, user.passwordHash)) {
    const record = recordFailedAttempt(ip);
    return { success: false, status: 401, error: record.lockedUntil ? `Account locked. Try again in ${LOCKOUT_MINUTES} minutes.` : 'Invalid username or password.' };
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const session = { token, username: user.username, name: user.displayName, role: 'administrator', fingerprint: fingerprint(req), expiresAt };
  activeSessions.set(token, session);
  return { success: true, token, expiresAt: new Date(expiresAt).toISOString(), user: { username: session.username, name: session.name, role: session.role } };
}

function getToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.ridecare_session || null;
}

function validateSession(token, req) {
  const session = activeSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  if (req && session.fingerprint !== fingerprint(req)) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function logout(token) { return token ? activeSessions.delete(token) : false; }

async function changePassword(username, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 12) return { success: false, error: 'New password must contain at least 12 characters.' };
  const user = await db.getAdminByUsername(username);
  if (!user || !verifyPassword(oldPassword, user.passwordSalt, user.passwordHash)) return { success: false, error: 'Current password is incorrect.' };
  const { hash, salt } = hashPassword(newPassword);
  await db.updateAdminPassword(username, salt, hash);
  for (const [token, session] of activeSessions) if (session.username === username) activeSessions.delete(token);
  return { success: true, message: 'Password updated. Please sign in again.' };
}

function requireAdminAuth(req, res, next) {
  const token = getToken(req);
  const session = validateSession(token, req);
  if (!session) return res.status(401).json({ error: 'Unauthorized. Please sign in again.' });
  req.adminUser = session;
  req.adminToken = token;
  next();
}

function sessionCookieOptions() {
  return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000, path: '/' };
}

setInterval(() => {
  for (const [token, session] of activeSessions) if (Date.now() > session.expiresAt) activeSessions.delete(token);
}, 15 * 60 * 1000).unref();

module.exports = { ensureInitialAdmin, login, logout, validateSession, changePassword, requireAdminAuth, getToken, sessionCookieOptions };
