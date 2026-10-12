const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const allowedOrigins = String(process.env.ALLOWED_ORIGIN || '').split(',').map(item => item.trim()).filter(Boolean);
const publicBuckets = new Map();

function jsonError(res, status, error, fields) {
  return res.status(status).json({ error, ...(fields ? { fields } : {}) });
}

function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimit({ windowMs = 60_000, max = 20, key = req => getClientIp(req) }) {
  return (req, res, next) => {
    const bucketKey = `${req.path}:${key(req)}`;
    const current = publicBuckets.get(bucketKey);
    const timestamp = Date.now();
    if (!current || current.resetAt <= timestamp) {
      publicBuckets.set(bucketKey, { count: 1, resetAt: timestamp + windowMs });
      return next();
    }
    if (current.count >= max) return jsonError(res, 429, 'Too many requests. Please try again later.');
    current.count += 1;
    next();
  };
}

function sanitizeText(value, maxLength = 500) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim().slice(0, maxLength) : '';
}

function parseCookies(req, res, next) {
  req.cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
  next();
}

function setSessionCookie(res, token) {
  const options = auth.sessionCookieOptions();
  const attributes = [`ridecare_session=${encodeURIComponent(token)}`, `Max-Age=${Math.floor(options.maxAge / 1000)}`, 'HttpOnly', `SameSite=${options.sameSite}`, 'Path=/'];
  if (options.secure) attributes.push('Secure');
  res.append('Set-Cookie', attributes.join('; '));
}

function clearSessionCookie(res) {
  res.append('Set-Cookie', 'ridecare_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/');
}

function audit(req, action, entityType, entityId, details) {
  return db.logAudit(req.adminUser?.username, action, entityType, entityId, details).catch(err => console.warn('[AUDIT]', err.message));
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return jsonError(res, 403, 'Origin is not allowed.');
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(parseCookies);

app.get('/api/health', async (req, res) => {
  try {
    await db.ready();
    res.json({ status: 'online', service: 'Velocity Motors API', timestamp: new Date().toISOString() });
  } catch {
    jsonError(res, 503, 'Database is unavailable.');
  }
});

/* Public content and customer flows */
app.get('/api/public/content', async (req, res) => {
  try { res.json(await db.getPublicContent()); } catch (err) { jsonError(res, 500, 'Unable to load public content.'); }
});
app.get('/api/services', async (req, res) => { try { res.json(await db.getServices(true)); } catch { jsonError(res, 500, 'Unable to load services.'); } });
app.get('/api/services/:slug', async (req, res) => {
  try {
    const service = await db.getServiceBySlug(req.params.slug);
    if (!service) return jsonError(res, 404, 'Service not found.');
    res.json(service);
  } catch { jsonError(res, 500, 'Unable to load service.'); }
});
app.get('/api/settings', async (req, res) => { try { res.json(await db.getSettings()); } catch { jsonError(res, 500, 'Unable to load site settings.'); } });
app.get('/api/reviews', async (req, res) => { try { res.json(await db.getAllReviews(true)); } catch { jsonError(res, 500, 'Unable to load reviews.'); } });
app.get('/api/booking-options', async (req, res) => {
  try {
    const [brands, slots, settings] = await Promise.all([db.getBrands(true), db.getSlots(true), db.getSettings()]);
    res.json({ brands, slots, pickupFee: settings.pickupFee, pickupMessage: settings.pickupMessage });
  } catch { jsonError(res, 500, 'Unable to load booking options.'); }
});
app.get('/api/calculator-config', async (req, res) => { try { res.json(await db.getCalculatorConfig()); } catch { jsonError(res, 500, 'Unable to load calculator configuration.'); } });
app.post('/api/quote', rateLimit({ max: 60 }), async (req, res) => {
  try { res.json(await db.getQuote(req.body || {})); } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to calculate estimate.'); }
});
app.post('/api/bookings', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    if (req.body?.website_url || req.body?.rider_fax || req.body?.company_website) return res.status(201).json({ success: true });
    const booking = await db.createBooking(req.body || {});
    await db.logAudit('public', 'create', 'booking', booking.id, { source: 'website' });
    res.status(201).json(booking);
  } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to create booking.'); }
});
app.post('/api/tracking/lookup', rateLimit({ max: 12 }), async (req, res) => {
  try {
    const jobId = sanitizeText(req.body?.jobId, 32).toUpperCase();
    const phoneLastFour = sanitizeText(req.body?.phoneLastFour, 4).replace(/\D/g, '');
    if (!jobId || phoneLastFour.length !== 4) return jsonError(res, 400, 'Enter your job-card number and the last four digits of your phone number.');
    const booking = await db.getTrackedBooking(jobId, phoneLastFour);
    if (!booking) return jsonError(res, 404, 'No booking matches those details.');
    res.json(booking);
  } catch { jsonError(res, 500, 'Unable to look up this booking.'); }
});
app.post('/api/inquiries', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    if (req.body?.website_url || req.body?.rider_fax || req.body?.company_website) return res.status(201).json({ success: true });
    const inquiry = await db.createInquiry(req.body || {});
    await db.logAudit('public', 'create', 'inquiry', inquiry.id, { source: 'website' });
    res.status(201).json(inquiry);
  } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to submit inquiry.'); }
});
app.post('/api/reviews', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), async (req, res) => {
  try {
    const review = await db.createReview(req.body || {});
    res.status(201).json({ id: review.id, message: 'Thank you. Your review will be published after approval.' });
  } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to submit review.'); }
});

/* Admin authentication */
app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    const result = await auth.login(req.body?.username, req.body?.password, req);
    if (!result.success) return jsonError(res, result.status || 401, result.error);
    setSessionCookie(res, result.token);
    await db.logAudit(result.user.username, 'login', 'session', null, { ip: getClientIp(req) });
    res.json({ authenticated: true, user: result.user, expiresAt: result.expiresAt });
  } catch { jsonError(res, 500, 'Unable to sign in.'); }
});
app.post('/api/admin/logout', auth.requireAdminAuth, async (req, res) => {
  auth.logout(req.adminToken); clearSessionCookie(res); await audit(req, 'logout', 'session'); res.json({ success: true });
});
app.get('/api/admin/me', auth.requireAdminAuth, (req, res) => res.json({ authenticated: true, user: req.adminUser }));
app.post('/api/admin/change-password', auth.requireAdminAuth, async (req, res) => {
  try {
    const result = await auth.changePassword(req.adminUser.username, req.body?.oldPassword, req.body?.newPassword);
    if (!result.success) return jsonError(res, 400, result.error);
    auth.logout(req.adminToken); clearSessionCookie(res); await audit(req, 'change-password', 'admin', req.adminUser.username); res.json(result);
  } catch { jsonError(res, 500, 'Unable to change password.'); }
});

/* Protected workshop CMS */
app.get('/api/stats', auth.requireAdminAuth, async (req, res) => { try { res.json(await db.getStats()); } catch { jsonError(res, 500, 'Unable to load dashboard statistics.'); } });
app.get('/api/bookings', auth.requireAdminAuth, async (req, res) => {
  try {
    let bookings = await db.getAllBookings();
    const search = sanitizeText(req.query.search, 100).toLowerCase();
    if (req.query.stage) bookings = bookings.filter(item => String(item.stage) === String(req.query.stage));
    if (search) bookings = bookings.filter(item => [item.id, item.customer, item.bike, item.reg].some(value => String(value || '').toLowerCase().includes(search)));
    res.json(bookings);
  } catch { jsonError(res, 500, 'Unable to load bookings.'); }
});
app.patch('/api/bookings/:id', auth.requireAdminAuth, async (req, res) => {
  try {
    const booking = await db.updateBooking(req.params.id, req.body || {});
    if (!booking) return jsonError(res, 404, 'Booking not found.');
    await audit(req, 'update', 'booking', booking.id, req.body); res.json(booking);
  } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to update booking.'); }
});
app.delete('/api/bookings/:id', auth.requireAdminAuth, async (req, res) => {
  try {
    if (!await db.deleteBooking(req.params.id)) return jsonError(res, 404, 'Booking not found.');
    await audit(req, 'delete', 'booking', req.params.id); res.json({ success: true });
  } catch { jsonError(res, 500, 'Unable to delete booking.'); }
});
app.get('/api/inquiries', auth.requireAdminAuth, async (req, res) => { try { res.json(await db.getAllInquiries()); } catch { jsonError(res, 500, 'Unable to load inquiries.'); } });
app.patch('/api/inquiries/:id', auth.requireAdminAuth, async (req, res) => {
  try {
    const inquiry = await db.updateInquiryStatus(req.params.id, req.body?.status || 'Contacted');
    if (!inquiry) return jsonError(res, 404, 'Inquiry not found.');
    await audit(req, 'update', 'inquiry', inquiry.id, { status: inquiry.status }); res.json(inquiry);
  } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to update inquiry.'); }
});
app.get('/api/admin/services', auth.requireAdminAuth, async (req, res) => { try { res.json(await db.getServices(false)); } catch { jsonError(res, 500, 'Unable to load services.'); } });
app.post('/api/admin/services', auth.requireAdminAuth, async (req, res) => {
  try { const service = await db.createService(req.body || {}); await audit(req, 'create', 'service', service.slug); res.status(201).json(service); } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to create service.'); }
});
app.patch('/api/admin/services/:slug', auth.requireAdminAuth, async (req, res) => {
  try { const service = await db.updateService(req.params.slug, req.body || {}); if (!service) return jsonError(res, 404, 'Service not found.'); await audit(req, 'update', 'service', service.slug); res.json(service); } catch (err) { jsonError(res, err.statusCode || 400, err.message || 'Unable to update service.'); }
});
app.delete('/api/admin/services/:slug', auth.requireAdminAuth, async (req, res) => {
  try { if (!await db.archiveService(req.params.slug)) return jsonError(res, 404, 'Service not found.'); await audit(req, 'archive', 'service', req.params.slug); res.json({ success: true }); } catch { jsonError(res, 500, 'Unable to archive service.'); }
});
app.get('/api/admin/settings', auth.requireAdminAuth, async (req, res) => { try { res.json(await db.getSettings()); } catch { jsonError(res, 500, 'Unable to load settings.'); } });
app.patch('/api/admin/settings', auth.requireAdminAuth, async (req, res) => {
  try { const settings = await db.updateSettings(req.body || {}); await audit(req, 'update', 'settings', '1'); res.json(settings); } catch { jsonError(res, 400, 'Unable to update settings.'); }
});
app.get('/api/admin/reviews', auth.requireAdminAuth, async (req, res) => { try { res.json(await db.getAllReviews(false)); } catch { jsonError(res, 500, 'Unable to load reviews.'); } });
app.patch('/api/admin/reviews/:id', auth.requireAdminAuth, async (req, res) => {
  try { const review = await db.updateReview(req.params.id, req.body || {}); if (!review) return jsonError(res, 404, 'Review not found.'); await audit(req, 'update', 'review', review.id); res.json(review); } catch { jsonError(res, 400, 'Unable to update review.'); }
});
app.delete('/api/admin/reviews/:id', auth.requireAdminAuth, async (req, res) => {
  try { if (!await db.deleteReview(req.params.id)) return jsonError(res, 404, 'Review not found.'); await audit(req, 'delete', 'review', req.params.id); res.json({ success: true }); } catch { jsonError(res, 500, 'Unable to delete review.'); }
});

const projectRoot = path.join(__dirname, '..');
app.use((req, res, next) => {
  const rawPath = decodeURIComponent(req.path).toLowerCase();
  if (rawPath.startsWith('/data') || rawPath.startsWith('/server') || rawPath.includes('package.json') || rawPath.includes('package-lock.json') || rawPath.includes('.env') || rawPath.includes('.git') || rawPath.endsWith('.sqlite') || rawPath.endsWith('.json')) return jsonError(res, 403, 'Protected resource.');
  next();
});
app.get('/admin', (req, res) => res.sendFile(path.join(projectRoot, 'admin.html')));
app.use(express.static(projectRoot, { index: 'index.html', extensions: ['html'] }));
app.use('/api', (req, res) => jsonError(res, 404, 'API route not found.'));
app.use((req, res) => res.status(404).sendFile(path.join(projectRoot, 'index.html')));
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  jsonError(res, 500, 'Unexpected server error.');
});

async function start() {
  await db.ready();
  await auth.ensureInitialAdmin();
  app.listen(PORT, () => console.log(`Velocity Motors is running at http://localhost:${PORT}`));
}

if (require.main === module) start().catch(err => { console.error(err); process.exit(1); });
module.exports = { app, start };
