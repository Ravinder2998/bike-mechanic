const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server', 'server.js');
let code = fs.readFileSync(serverPath, 'utf8');

// Replace standard route signatures with async
code = code.replace(/app\.get\('\/api\/stats', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.get(\'/api/stats\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.get\('\/api\/bookings', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.get(\'/api/bookings\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.get\('\/api\/bookings\/:id', \(req, res\) => {/g, 'app.get(\'/api/bookings/:id\', async (req, res) => {');
code = code.replace(/app\.post\('\/api\/bookings', \(req, res\) => {/g, 'app.post(\'/api/bookings\', async (req, res) => {');
code = code.replace(/app\.patch\('\/api\/bookings\/:id', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.patch(\'/api/bookings/:id\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.delete\('\/api\/bookings\/:id', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.delete(\'/api/bookings/:id\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.get\('\/api\/inquiries', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.get(\'/api/inquiries\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.post\('\/api\/inquiries', \(req, res\) => {/g, 'app.post(\'/api/inquiries\', async (req, res) => {');
code = code.replace(/app\.patch\('\/api\/inquiries\/:id', auth\.requireAdminAuth, \(req, res\) => {/g, 'app.patch(\'/api/inquiries/:id\', auth.requireAdminAuth, async (req, res) => {');
code = code.replace(/app\.get\('\/api\/reviews', \(req, res\) => {/g, 'app.get(\'/api/reviews\', async (req, res) => {');
code = code.replace(/app\.post\('\/api\/reviews', \(req, res\) => {/g, 'app.post(\'/api/reviews\', async (req, res) => {');

// Replace db calls with await
code = code.replace(/db\.getStats\(\)/g, 'await db.getStats()');
code = code.replace(/db\.getAllBookings\(\)/g, 'await db.getAllBookings()');
code = code.replace(/db\.getBookingById/g, 'await db.getBookingById');
code = code.replace(/db\.createBooking/g, 'await db.createBooking');
code = code.replace(/db\.updateBooking/g, 'await db.updateBooking');
code = code.replace(/db\.deleteBooking/g, 'await db.deleteBooking');
code = code.replace(/db\.getAllInquiries\(\)/g, 'await db.getAllInquiries()');
code = code.replace(/db\.createInquiry/g, 'await db.createInquiry');
code = code.replace(/db\.updateInquiryStatus/g, 'await db.updateInquiryStatus');
code = code.replace(/db\.getAllReviews\(\)/g, 'await db.getAllReviews()');
code = code.replace(/db\.createReview/g, 'await db.createReview');

fs.writeFileSync(serverPath, code);
console.log('server.js rewritten for async database access.');
