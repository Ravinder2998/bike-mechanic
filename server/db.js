const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ridecare.sqlite');
const LEGACY_DATA_PATH = path.join(__dirname, '..', 'data', 'ridecare_db.json');

const stageDescriptions = {
  1: { status: 'Vehicle Inward & Check-in', desc: 'Bike checked in at workshop, visual inspection completed.' },
  2: { status: 'Technical Diagnostic & Disassembly', desc: 'Mechanic testing engine, fluids, brakes, and electricals.' },
  3: { status: 'Active Servicing & Spares Replacement', desc: 'Replacing genuine parts, fresh synthetic oil, and precision tuning.' },
  4: { status: 'Quality Inspection & Road Test', desc: 'Senior technician safety check and test ride.' },
  5: { status: 'Ready for Delivery', desc: 'Quality checks complete and the bike is ready for collection.' }
};

const DEFAULT_SETTINGS = {
  businessName: 'Velocity Motors',
  tagline: 'Expert Care for Every Ride',
  heroLead: 'Professional bike servicing & repair solutions to keep you moving always. State-of-the-art diagnostics, genuine spares, and master mechanics.',
  phone: '+91 98765 43210',
  email: 'support@ridecare.in',
  address: '123 Service Road, Tonk Road Hub, Jaipur, Rajasthan, 302015',
  mapUrl: 'https://maps.google.com',
  weekdayHours: 'Monday – Saturday: 08:30 AM – 08:30 PM',
  weekendHours: 'Sunday: 09:00 AM – 03:00 PM',
  emergencyHours: 'Emergency Roadside Support: 24/7 Available',
  pickupFee: 199,
  pickupMessage: 'Free Doorstep Pickup Available',
  publicStats: { yearsExperience: 5, bikesServiced: '10K+', satisfaction: '98%' },
  socialLinks: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    linkedin: 'https://linkedin.com'
  }
};

const DEFAULT_SERVICES = [
  {
    slug: 'general', title: 'General Service', icon: '🛠️', basePrice: 999, duration: '3 - 4 Hours', intervalText: 'Every 3,000 km or 3 Months', sortOrder: 1,
    imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=600&fit=crop',
    altText: 'General service mechanic tools', shortDescription: 'Complete 40-point inspection, tune-up, lubrication & wash for a smooth ride.',
    detailTitle: 'General Service & 40-Point Inspection',
    inclusions: ['Comprehensive 40-point safety and mechanical check', 'Engine oil drain & fresh grade replenishment', 'Air filter cleaning / replacement check', 'Spark plug clean, gap adjustment and testing', 'Chain cleaning, slack adjustment and heavy lube', 'Front and rear brake pad inspection & caliper de-dusting', 'Cables lubrication (clutch, throttle, choke)', 'Free complete high-pressure water wash & shine polish']
  },
  {
    slug: 'engine', title: 'Engine Repair', icon: '⚙️', basePrice: 799, duration: '4 - 6 Hours', intervalText: 'As needed or during annual overhaul', sortOrder: 2,
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=600&fit=crop', altText: 'Motorcycle engine repair',
    shortDescription: 'Expert diagnosis, compression test & repair for maximum torque and life.', detailTitle: 'Engine Repair & Precision Tuning',
    inclusions: ['Digital compression test & cylinder head diagnosis', 'Tappet & valve clearance shimming with feeler gauges', 'Carburetor / throttle-body ultrasonic cleaning', 'Timing-chain tensioner inspection', 'Clutch plate wear analysis & friction disc overhaul', 'Engine noise, vibration & harshness calibration']
  },
  {
    slug: 'brake', title: 'Brake Service', icon: '🛑', basePrice: 499, duration: '1.5 - 2 Hours', intervalText: 'Every 5,000 km or when spongy', sortOrder: 3,
    imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=600&fit=crop', altText: 'Motorcycle brake disc',
    shortDescription: 'Caliper bleeding, pad replacement & DOT-4 fluid flush for reliable stopping.', detailTitle: 'Brake Service & ABS Calibration',
    inclusions: ['Brake rotor runout and thickness measurement', 'DOT 4 / DOT 5.1 synthetic brake fluid flush', 'Caliper piston degreasing', 'Brake pad replacement & anti-squeal compound', 'ABS wheel speed sensor testing & diagnostic scan', 'Emergency-stop brake feel optimization']
  },
  {
    slug: 'oil', title: 'Oil Change', icon: '🛢️', basePrice: 1299, duration: '45 Minutes', intervalText: 'Every 4,000 - 6,000 km', sortOrder: 4,
    imageUrl: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=800&h=600&fit=crop', altText: 'Motor oil for motorcycle service',
    shortDescription: 'Premium Motul synthetic oils & OEM filters for peak engine performance.', detailTitle: 'High-Performance Engine Oil Change',
    inclusions: ['OEM-spec synthetic engine oil', 'OEM magnetic sump plug washer replacement', 'Original high-flow oil filter swap', 'Sump flush to remove sludge and metal particulate', 'Wet-clutch friction compatibility check', 'Engine temperature and smooth-shift inspection']
  },
  {
    slug: 'tyre', title: 'Tyre Service', icon: '🛞', basePrice: 399, duration: '1 Hour', intervalText: 'Every 5,000 km or tyre replacement', sortOrder: 5,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop', altText: 'Motorcycle tyre service',
    shortDescription: 'Fitment, laser alignment, dynamic balancing & premium tyre replacement.', detailTitle: 'Tyre Service, Balancing & Alignment',
    inclusions: ['Digital laser wheel alignment', 'High-speed computerized dynamic wheel balancing', 'Tubeless tyre puncture vulcanization repair', 'Tread depth and uneven-wear analysis', 'Nitrogen air filling', 'Premium tyre fitment consultation']
  },
  {
    slug: 'battery', title: 'Battery Care', icon: '🔋', basePrice: 249, duration: '30 Minutes', intervalText: 'Every 6 Months', sortOrder: 6,
    imageUrl: 'https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800&h=600&fit=crop', altText: 'Motorcycle battery diagnostics',
    shortDescription: 'Testing, charging & genuine high-CCA battery replacement with warranty.', detailTitle: 'Battery Diagnostics, Charging & Care',
    inclusions: ['Digital conductance load test', 'Alternator charging voltage & stator diode test', 'Terminal anti-corrosion coating', 'Deep-cycle trickle pulse charging', 'Parasitic current-drain detection', 'Warranty replacement consultation']
  },
  {
    slug: 'electrical', title: 'Electrical Work', icon: '⚡', basePrice: 549, duration: '2 Hours', intervalText: 'On check-engine light or intermittent starts', sortOrder: 7,
    imageUrl: 'assets/images/about_mechanic.jpg', altText: 'Electrical work on a motorcycle in a workshop',
    shortDescription: 'ECU diagnostics, wiring harness repair & full electrical system overhaul.', detailTitle: 'Advanced Electrical & ECU Scanning',
    inclusions: ['OBD-2 scanner diagnosis for fault codes', 'Main wiring harness resistance & continuity test', 'Ignition coil, spark lead & relay testing', 'Headlight relay and auxiliary harness installation', 'Handlebar switch-gear contact restoration', 'Regulator-rectifier voltage stability test']
  },
  {
    slug: 'custom', title: 'Custom Upgrades', icon: '✨', basePrice: 699, duration: 'Custom', intervalText: 'By rider requirement', sortOrder: 8,
    imageUrl: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop', altText: 'Custom motorcycle upgrades',
    shortDescription: 'Performance exhausts, LED kits, frame sliders & style enhancements.', detailTitle: 'Performance Tuning & Custom Upgrades',
    inclusions: ['Slip-on exhaust installation and tuning', 'Crash guards, frame sliders & radiator protectors', 'Handlebar risers, windscreens & mobile mounts', 'Chain and sprocket upgrades', 'Tail tidy, LED indicators & aesthetic enhancements', 'Bespoke dyno remap consultation']
  }
];

const DEFAULT_CALCULATOR = {
  segments: [
    ['commuter', 'Commuter (100cc - 125cc)', 0.85, 399, 1],
    ['premium', 'Premium (150cc - 180cc)', 1, 549, 2],
    ['sports', 'Sports / Tourer (200cc - 400cc)', 1.35, 799, 3],
    ['twin', 'Twin / Cruiser (500cc - 650cc)', 1.8, 1199, 4],
    ['superbike', 'Superbike (750cc+)', 2.5, 1899, 5]
  ],
  items: [
    ['labor', 'Workshop Labour', 599, 0, 1], ['oil', 'Premium Engine Oil', 950, 1, 2], ['oilFilter', 'OEM Oil Filter', 180, 0, 3],
    ['airFilter', 'Air Filter', 320, 0, 4], ['brakePads', 'Brake Pads', 480, 0, 5], ['sparkPlug', 'Spark Plug', 220, 0, 6],
    ['chainLube', 'Chain Lube', 250, 0, 7], ['coolantFlush', 'Coolant Flush', 450, 1, 8]
  ],
  coupons: [
    ['FIRST50', 'percentage', 15, '15% New Rider Discount Applied!', 1],
    ['RIDE200', 'flat', 200, '₹200 Flat Discount Applied!', 2]
  ]
};

function now() { return new Date().toISOString(); }
function parseJson(value, fallback = []) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function cleanString(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function addColumn(db, table, definition) {
  const column = definition.split(/\s+/)[0];
  const columns = await db.all(`PRAGMA table_info(${table})`);
  if (!columns.some(item => item.name === column)) await db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

async function initDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, bike TEXT NOT NULL, reg TEXT, customer TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT, date TEXT, timeSlot TEXT, serviceType TEXT NOT NULL, services TEXT NOT NULL,
      total REAL NOT NULL, stage INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL,
      assignedTech TEXT, bay TEXT, startTime TEXT, estimatedReady TEXT, notes TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, bike TEXT, message TEXT,
      status TEXT NOT NULL DEFAULT 'New', createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, bike TEXT, rating INTEGER NOT NULL, avatar TEXT,
      quote TEXT NOT NULL, date TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 1, createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      detailTitle TEXT NOT NULL, icon TEXT NOT NULL, shortDescription TEXT NOT NULL,
      imageUrl TEXT NOT NULL, altText TEXT NOT NULL, basePrice REAL NOT NULL CHECK(basePrice >= 0),
      duration TEXT NOT NULL, intervalText TEXT NOT NULL, isActive INTEGER NOT NULL DEFAULT 1,
      sortOrder INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_inclusions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, serviceId INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      text TEXT NOT NULL, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bike_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, isActive INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS booking_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL UNIQUE, isActive INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS calculator_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, multiplier REAL NOT NULL,
      laborBase REAL NOT NULL, isActive INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS calculator_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, itemKey TEXT NOT NULL UNIQUE, name TEXT NOT NULL, basePrice REAL NOT NULL,
      scalesWithSegment INTEGER NOT NULL DEFAULT 0, isActive INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, discountType TEXT NOT NULL CHECK(discountType IN ('flat','percentage')),
      value REAL NOT NULL, message TEXT, isActive INTEGER NOT NULL DEFAULT 1, startsAt TEXT, endsAt TEXT, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, displayName TEXT NOT NULL,
      passwordSalt TEXT NOT NULL, passwordHash TEXT NOT NULL, isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT NOT NULL, entityType TEXT NOT NULL,
      entityId TEXT, details TEXT, createdAt TEXT NOT NULL
    );
  `);
  await addColumn(db, 'bookings', 'date TEXT');
  await addColumn(db, 'bookings', 'timeSlot TEXT');
  await addColumn(db, 'reviews', 'approved INTEGER NOT NULL DEFAULT 1');
  await addColumn(db, 'reviews', 'createdAt TEXT');
  await seedDatabase(db);
  return db;
}

async function seedDatabase(db) {
  const timestamp = now();
  const setting = await db.get('SELECT id FROM site_settings WHERE id = 1');
  if (!setting) await db.run('INSERT INTO site_settings (id, data, updatedAt) VALUES (1, ?, ?)', [JSON.stringify(DEFAULT_SETTINGS), timestamp]);

  const serviceCount = await db.get('SELECT COUNT(*) AS count FROM services');
  if (serviceCount.count === 0) {
    for (const service of DEFAULT_SERVICES) {
      const result = await db.run(
        `INSERT INTO services (slug, title, detailTitle, icon, shortDescription, imageUrl, altText, basePrice, duration, intervalText, isActive, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [service.slug, service.title, service.detailTitle, service.icon, service.shortDescription, service.imageUrl, service.altText, service.basePrice, service.duration, service.intervalText, service.sortOrder, timestamp, timestamp]
      );
      for (let index = 0; index < service.inclusions.length; index++) {
        await db.run('INSERT INTO service_inclusions (serviceId, text, sortOrder) VALUES (?, ?, ?)', [result.lastID, service.inclusions[index], index + 1]);
      }
    }
  }

  const brandCount = await db.get('SELECT COUNT(*) AS count FROM bike_brands');
  if (brandCount.count === 0) {
    for (const [index, name] of ['KTM', 'Royal Enfield', 'Yamaha', 'Honda', 'Bajaj', 'TVS', 'Kawasaki', 'Other Make'].entries()) {
      await db.run('INSERT INTO bike_brands (name, sortOrder) VALUES (?, ?)', [name, index + 1]);
    }
  }

  const slotCount = await db.get('SELECT COUNT(*) AS count FROM booking_slots');
  if (slotCount.count === 0) {
    for (const [index, label] of ['09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM'].entries()) {
      await db.run('INSERT INTO booking_slots (label, sortOrder) VALUES (?, ?)', [label, index + 1]);
    }
  }

  const segmentCount = await db.get('SELECT COUNT(*) AS count FROM calculator_segments');
  if (segmentCount.count === 0) {
    for (const segment of DEFAULT_CALCULATOR.segments) await db.run('INSERT INTO calculator_segments (slug, name, multiplier, laborBase, sortOrder) VALUES (?, ?, ?, ?, ?)', segment);
    for (const item of DEFAULT_CALCULATOR.items) await db.run('INSERT INTO calculator_items (itemKey, name, basePrice, scalesWithSegment, sortOrder) VALUES (?, ?, ?, ?, ?)', item);
    for (const coupon of DEFAULT_CALCULATOR.coupons) await db.run('INSERT INTO coupons (code, discountType, value, message, sortOrder) VALUES (?, ?, ?, ?, ?)', coupon);
  }

  const bookingCount = await db.get('SELECT COUNT(*) AS count FROM bookings');
  if (bookingCount.count === 0 && fs.existsSync(LEGACY_DATA_PATH)) {
    const legacy = parseJson(fs.readFileSync(LEGACY_DATA_PATH, 'utf8'), {});
    for (const booking of legacy.bookings || []) {
      const id = cleanString(booking.id, 32) || createId('RC');
      const existing = await db.get('SELECT id FROM bookings WHERE id = ?', [id]);
      if (existing) continue;
      const stage = Number(booking.stage) >= 1 && Number(booking.stage) <= 5 ? Number(booking.stage) : 1;
      const info = stageDescriptions[stage];
      await db.run(
        `INSERT INTO bookings (id, bike, reg, customer, phone, email, date, timeSlot, serviceType, services, total, stage, status, assignedTech, bay, startTime, estimatedReady, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, cleanString(booking.bike, 100) || 'Motorcycle', cleanString(booking.reg, 30), cleanString(booking.customer, 100) || 'Rider', cleanString(booking.phone, 30), cleanString(booking.email, 120), cleanString(booking.date, 20), cleanString(booking.timeSlot, 60), cleanString(booking.serviceType, 60) || 'Workshop Drop-off', JSON.stringify(Array.isArray(booking.services) ? booking.services.map(item => cleanString(item, 100)) : []), Number(booking.total) || 0, stage, info.status, cleanString(booking.assignedTech, 100), cleanString(booking.bay, 100), cleanString(booking.startTime, 100), cleanString(booking.estimatedReady, 100), cleanString(booking.notes, 1000), booking.createdAt || timestamp, booking.updatedAt || timestamp]
      );
    }
  }

  const reviewCount = await db.get('SELECT COUNT(*) AS count FROM reviews');
  if (reviewCount.count === 0 && fs.existsSync(LEGACY_DATA_PATH)) {
    const legacy = parseJson(fs.readFileSync(LEGACY_DATA_PATH, 'utf8'), {});
    for (const review of legacy.reviews || []) {
      await db.run('INSERT OR IGNORE INTO reviews (id, name, bike, rating, avatar, quote, date, approved, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)', [cleanString(review.id, 40) || createId('REV'), cleanString(review.name, 100) || 'Rider', cleanString(review.bike, 100), Math.min(5, Math.max(1, Number(review.rating) || 5)), cleanString(review.avatar, 300), cleanString(review.quote, 1000), cleanString(review.date, 50) || 'Recently', timestamp]);
    }
  }
}

const dbPromise = initDb();

async function getServiceRows(activeOnly = true) {
  const db = await dbPromise;
  const rows = await db.all(`SELECT * FROM services ${activeOnly ? 'WHERE isActive = 1' : ''} ORDER BY sortOrder, id`);
  const inclusions = await db.all('SELECT serviceId, text FROM service_inclusions ORDER BY sortOrder, id');
  const grouped = new Map();
  for (const inclusion of inclusions) {
    if (!grouped.has(inclusion.serviceId)) grouped.set(inclusion.serviceId, []);
    grouped.get(inclusion.serviceId).push(inclusion.text);
  }
  return rows.map(row => ({ ...row, isActive: Boolean(row.isActive), inclusions: grouped.get(row.id) || [] }));
}

async function getSettings() {
  const db = await dbPromise;
  const row = await db.get('SELECT data FROM site_settings WHERE id = 1');
  return { ...DEFAULT_SETTINGS, ...parseJson(row && row.data, {}) };
}

async function getQuote({ serviceSlugs = [], serviceType = 'workshop', segmentSlug, itemKeys = [], couponCode } = {}) {
  const db = await dbPromise;
  const cleanSlugs = [...new Set((Array.isArray(serviceSlugs) ? serviceSlugs : []).filter(value => typeof value === 'string'))];
  let selectedServices = [];
  if (cleanSlugs.length) {
    const placeholders = cleanSlugs.map(() => '?').join(',');
    selectedServices = await db.all(`SELECT slug, title, basePrice FROM services WHERE isActive = 1 AND slug IN (${placeholders})`, cleanSlugs);
    if (selectedServices.length !== cleanSlugs.length) throw Object.assign(new Error('One or more selected services are unavailable.'), { statusCode: 400 });
  }
  const settings = await getSettings();
  const pickupFee = serviceType === 'doorstep' ? Number(settings.pickupFee) || 0 : 0;
  const serviceSubtotal = selectedServices.reduce((sum, service) => sum + Number(service.basePrice), 0);

  let calculator = null;
  if (segmentSlug || itemKeys.length || couponCode) {
    const segment = await db.get('SELECT * FROM calculator_segments WHERE slug = ? AND isActive = 1', [segmentSlug || 'sports']);
    if (!segment) throw Object.assign(new Error('Selected bike segment is unavailable.'), { statusCode: 400 });
    const cleanKeys = [...new Set((Array.isArray(itemKeys) ? itemKeys : []).filter(value => typeof value === 'string'))];
    let items = [];
    if (cleanKeys.length) {
      const placeholders = cleanKeys.map(() => '?').join(',');
      items = await db.all(`SELECT * FROM calculator_items WHERE isActive = 1 AND itemKey IN (${placeholders})`, cleanKeys);
      if (items.length !== cleanKeys.length) throw Object.assign(new Error('One or more estimator items are unavailable.'), { statusCode: 400 });
    }
    const itemSubtotal = Number(segment.laborBase) + items.reduce((sum, item) => sum + Math.round(Number(item.basePrice) * (item.scalesWithSegment ? Number(segment.multiplier) : 1)), 0);
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await db.get(`SELECT * FROM coupons WHERE UPPER(code) = ? AND isActive = 1 AND (startsAt IS NULL OR startsAt <= ?) AND (endsAt IS NULL OR endsAt >= ?)`, [String(couponCode).toUpperCase(), now(), now()]);
      if (!coupon) throw Object.assign(new Error('Coupon is invalid or expired.'), { statusCode: 400 });
      discount = coupon.discountType === 'percentage' ? Math.round(itemSubtotal * Number(coupon.value) / 100) : Number(coupon.value);
    }
    calculator = { segment: { slug: segment.slug, name: segment.name }, items: items.map(item => ({ key: item.itemKey, name: item.name })), subtotal: itemSubtotal, discount: Math.min(itemSubtotal, discount), total: Math.max(0, itemSubtotal - discount), coupon: coupon ? { code: coupon.code, message: coupon.message } : null };
  }

  return { services: selectedServices, serviceSubtotal, pickupFee, total: serviceSubtotal + pickupFee, calculator };
}

const dbMethods = {
  stageDescriptions,
  ready: () => dbPromise,
  async getPublicContent() {
    const [settings, services, reviews, brands, slots, calculator] = await Promise.all([
      getSettings(), getServiceRows(true), this.getAllReviews(true), this.getBrands(true), this.getSlots(true), this.getCalculatorConfig()
    ]);
    return { settings, services, reviews, brands, slots, calculator };
  },
  getSettings,
  async updateSettings(changes) {
    const current = await getSettings();
    const allowed = ['businessName', 'tagline', 'heroLead', 'phone', 'email', 'address', 'mapUrl', 'weekdayHours', 'weekendHours', 'emergencyHours', 'pickupFee', 'pickupMessage', 'publicStats', 'socialLinks'];
    const next = { ...current };
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(changes, key)) next[key] = changes[key];
    next.businessName = cleanString(next.businessName, 100) || current.businessName;
    next.email = cleanString(next.email, 120);
    next.phone = cleanString(next.phone, 30);
    next.address = cleanString(next.address, 300);
    next.mapUrl = cleanString(next.mapUrl, 500);
    next.pickupFee = Math.max(0, Math.min(10000, Number(next.pickupFee) || 0));
    const db = await dbPromise;
    await db.run('UPDATE site_settings SET data = ?, updatedAt = ? WHERE id = 1', [JSON.stringify(next), now()]);
    return next;
  },
  getServices: getServiceRows,
  async getServiceBySlug(slug, includeInactive = false) {
    const services = await getServiceRows(!includeInactive);
    return services.find(service => service.slug === slug) || null;
  },
  async createService(input) {
    const db = await dbPromise;
    const timestamp = now();
    const slug = cleanString(input.slug, 50).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slug || !cleanString(input.title, 100)) throw Object.assign(new Error('A valid service slug and title are required.'), { statusCode: 400 });
    const result = await db.run(`INSERT INTO services (slug, title, detailTitle, icon, shortDescription, imageUrl, altText, basePrice, duration, intervalText, isActive, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [slug, cleanString(input.title, 100), cleanString(input.detailTitle, 150) || cleanString(input.title, 100), cleanString(input.icon, 12) || '🛠️', cleanString(input.shortDescription, 300), cleanString(input.imageUrl, 500), cleanString(input.altText, 200), Math.max(0, Number(input.basePrice) || 0), cleanString(input.duration, 60), cleanString(input.intervalText, 100), input.isActive === false ? 0 : 1, Number(input.sortOrder) || 0, timestamp, timestamp]);
    await this.replaceServiceInclusions(result.lastID, input.inclusions || []);
    return this.getServiceBySlug(slug, true);
  },
  async updateService(slug, input) {
    const current = await this.getServiceBySlug(slug, true);
    if (!current) return null;
    const next = {
      ...current,
      ...input,
      title: cleanString(input.title ?? current.title, 100),
      detailTitle: cleanString(input.detailTitle ?? current.detailTitle, 150),
      icon: cleanString(input.icon ?? current.icon, 12),
      shortDescription: cleanString(input.shortDescription ?? current.shortDescription, 300),
      imageUrl: cleanString(input.imageUrl ?? current.imageUrl, 500),
      altText: cleanString(input.altText ?? current.altText, 200),
      basePrice: Math.max(0, Number(input.basePrice ?? current.basePrice)),
      duration: cleanString(input.duration ?? current.duration, 60),
      intervalText: cleanString(input.intervalText ?? current.intervalText, 100),
      isActive: input.isActive === undefined ? current.isActive : Boolean(input.isActive),
      sortOrder: Number(input.sortOrder ?? current.sortOrder) || 0
    };
    const db = await dbPromise;
    await db.run(`UPDATE services SET title=?, detailTitle=?, icon=?, shortDescription=?, imageUrl=?, altText=?, basePrice=?, duration=?, intervalText=?, isActive=?, sortOrder=?, updatedAt=? WHERE slug=?`, [next.title, next.detailTitle, next.icon, next.shortDescription, next.imageUrl, next.altText, next.basePrice, next.duration, next.intervalText, next.isActive ? 1 : 0, next.sortOrder, now(), slug]);
    if (Array.isArray(input.inclusions)) await this.replaceServiceInclusions(current.id, input.inclusions);
    return this.getServiceBySlug(slug, true);
  },
  async replaceServiceInclusions(serviceId, values) {
    const db = await dbPromise;
    await db.run('DELETE FROM service_inclusions WHERE serviceId = ?', [serviceId]);
    for (const [index, value] of values.entries()) {
      const text = cleanString(value, 300);
      if (text) await db.run('INSERT INTO service_inclusions (serviceId, text, sortOrder) VALUES (?, ?, ?)', [serviceId, text, index + 1]);
    }
  },
  async archiveService(slug) {
    const db = await dbPromise;
    const result = await db.run('UPDATE services SET isActive = 0, updatedAt = ? WHERE slug = ?', [now(), slug]);
    return result.changes > 0;
  },
  getQuote,
  async getBrands(activeOnly = true) {
    const db = await dbPromise;
    return db.all(`SELECT id, name, isActive, sortOrder FROM bike_brands ${activeOnly ? 'WHERE isActive = 1' : ''} ORDER BY sortOrder, id`);
  },
  async getSlots(activeOnly = true) {
    const db = await dbPromise;
    return db.all(`SELECT id, label, isActive, sortOrder FROM booking_slots ${activeOnly ? 'WHERE isActive = 1' : ''} ORDER BY sortOrder, id`);
  },
  async getCalculatorConfig() {
    const db = await dbPromise;
    const [segments, items, coupons] = await Promise.all([
      db.all('SELECT slug, name, multiplier, laborBase, sortOrder FROM calculator_segments WHERE isActive = 1 ORDER BY sortOrder, id'),
      db.all('SELECT itemKey, name, basePrice, scalesWithSegment, sortOrder FROM calculator_items WHERE isActive = 1 ORDER BY sortOrder, id'),
      db.all(`SELECT code, discountType, value, message FROM coupons WHERE isActive = 1 AND (startsAt IS NULL OR startsAt <= ?) AND (endsAt IS NULL OR endsAt >= ?) ORDER BY sortOrder, id`, [now(), now()])
    ]);
    return { segments, items, coupons };
  },
  async createBooking(booking) {
    const db = await dbPromise;
    const customer = cleanString(booking.customer, 100);
    const phone = cleanString(booking.phone, 30).replace(/\s+/g, ' ');
    const bike = cleanString(booking.bike, 100);
    const date = cleanString(booking.date, 10);
    const timeSlot = cleanString(booking.timeSlot, 60);
    const serviceSlugs = Array.isArray(booking.serviceSlugs) ? booking.serviceSlugs : [];
    if (!customer || !phone || !bike || !date || !timeSlot || serviceSlugs.length === 0) throw Object.assign(new Error('Name, phone, bike, date, time slot, and one service are required.'), { statusCode: 400 });
    const slot = await db.get('SELECT id FROM booking_slots WHERE label = ? AND isActive = 1', [timeSlot]);
    if (!slot) throw Object.assign(new Error('Selected time slot is unavailable.'), { statusCode: 400 });
    const serviceType = booking.serviceType === 'doorstep' ? 'doorstep' : 'workshop';
    const quote = await getQuote({ serviceSlugs, serviceType });
    const id = createId('RC');
    const stage = 1;
    const info = stageDescriptions[stage];
    const timestamp = now();
    const record = {
      id, customer, phone, email: cleanString(booking.email, 120), bike, reg: cleanString(booking.reg, 30).toUpperCase(), date, timeSlot,
      serviceType: serviceType === 'doorstep' ? 'Free Doorstep Pickup' : 'Workshop Drop-off', services: quote.services.map(service => service.title), total: quote.total,
      stage, status: info.status, assignedTech: 'Master Tech Assigned', bay: 'Bay 1 (Inspection Bay)', startTime: 'Awaiting check-in', estimatedReady: 'Estimated 3-4 hours after check-in', notes: cleanString(booking.notes, 1000) || 'Online booking registered. Awaiting bike arrival / pickup.', createdAt: timestamp, updatedAt: timestamp
    };
    await db.run(`INSERT INTO bookings (id, bike, reg, customer, phone, email, date, timeSlot, serviceType, services, total, stage, status, assignedTech, bay, startTime, estimatedReady, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.id, record.bike, record.reg, record.customer, record.phone, record.email, record.date, record.timeSlot, record.serviceType, JSON.stringify(record.services), record.total, record.stage, record.status, record.assignedTech, record.bay, record.startTime, record.estimatedReady, record.notes, record.createdAt, record.updatedAt]);
    return record;
  },
  async getAllBookings() {
    const db = await dbPromise;
    const rows = await db.all('SELECT * FROM bookings ORDER BY createdAt DESC');
    return rows.map(row => ({ ...row, services: parseJson(row.services, []) }));
  },
  async getBookingById(id) {
    if (!id) return null;
    const db = await dbPromise;
    const row = await db.get('SELECT * FROM bookings WHERE UPPER(id) = ?', [String(id).trim().toUpperCase()]);
    return row ? { ...row, services: parseJson(row.services, []) } : null;
  },
  async getTrackedBooking(id, phone) {
    const booking = await this.getBookingById(id);
    const suppliedDigits = String(phone || '').replace(/\D/g, '');
    const storedDigits = String(booking?.phone || '').replace(/\D/g, '');
    if (!booking || suppliedDigits.length < 4 || !storedDigits.endsWith(suppliedDigits.slice(-4))) return null;
    return { id: booking.id, bike: booking.bike, reg: booking.reg, customer: booking.customer, services: booking.services, stage: booking.stage, status: booking.status, assignedTech: booking.assignedTech, bay: booking.bay, startTime: booking.startTime, estimatedReady: booking.estimatedReady, notes: booking.notes, updatedAt: booking.updatedAt };
  },
  async updateBooking(id, updates) {
    const current = await this.getBookingById(id);
    if (!current) return null;
    const stage = updates.stage === undefined ? current.stage : Number(updates.stage);
    if (!stageDescriptions[stage]) throw Object.assign(new Error('Stage must be between 1 and 5.'), { statusCode: 400 });
    const next = { ...current, stage, status: stageDescriptions[stage].status, assignedTech: cleanString(updates.assignedTech ?? current.assignedTech, 100), bay: cleanString(updates.bay ?? current.bay, 100), estimatedReady: cleanString(updates.estimatedReady ?? current.estimatedReady, 100), notes: cleanString(updates.notes ?? current.notes, 1000), updatedAt: now() };
    const db = await dbPromise;
    await db.run('UPDATE bookings SET stage=?, status=?, assignedTech=?, bay=?, estimatedReady=?, notes=?, updatedAt=? WHERE id=?', [next.stage, next.status, next.assignedTech, next.bay, next.estimatedReady, next.notes, next.updatedAt, current.id]);
    return next;
  },
  async deleteBooking(id) {
    const db = await dbPromise;
    const result = await db.run('DELETE FROM bookings WHERE UPPER(id) = ?', [String(id).trim().toUpperCase()]);
    return result.changes > 0;
  },
  async createInquiry(inquiry) {
    const name = cleanString(inquiry.name, 100);
    const phone = cleanString(inquiry.phone, 30);
    if (!name || !phone) throw Object.assign(new Error('Name and phone are required.'), { statusCode: 400 });
    const record = { id: createId('INQ'), name, phone, bike: cleanString(inquiry.bike, 100), message: cleanString(inquiry.message, 1000), status: 'New', createdAt: now() };
    const db = await dbPromise;
    await db.run('INSERT INTO inquiries (id, name, phone, bike, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', Object.values(record));
    return record;
  },
  async getAllInquiries() { const db = await dbPromise; return db.all('SELECT * FROM inquiries ORDER BY createdAt DESC'); },
  async updateInquiryStatus(id, status) {
    const permitted = ['New', 'Contacted', 'Resolved'];
    if (!permitted.includes(status)) throw Object.assign(new Error('Invalid inquiry status.'), { statusCode: 400 });
    const db = await dbPromise;
    await db.run('UPDATE inquiries SET status = ? WHERE id = ?', [status, id]);
    return db.get('SELECT * FROM inquiries WHERE id = ?', [id]);
  },
  async getAllReviews(approvedOnly = false) {
    const db = await dbPromise;
    return db.all(`SELECT id, name, bike, rating, avatar, quote, date, approved, createdAt FROM reviews ${approvedOnly ? 'WHERE approved = 1' : ''} ORDER BY createdAt DESC, id DESC`);
  },
  async createReview(review) {
    const name = cleanString(review.name, 100);
    const quote = cleanString(review.quote, 1000);
    const rating = Math.min(5, Math.max(1, Number(review.rating) || 5));
    if (!name || !quote) throw Object.assign(new Error('Name and review text are required.'), { statusCode: 400 });
    const record = { id: createId('REV'), name, bike: cleanString(review.bike, 100), rating, avatar: cleanString(review.avatar, 500) || 'assets/images/avatar_rahul.jpg', quote, date: 'Just now', approved: 0, createdAt: now() };
    const db = await dbPromise;
    await db.run('INSERT INTO reviews (id, name, bike, rating, avatar, quote, date, approved, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', Object.values(record));
    return record;
  },
  async updateReview(id, updates) {
    const db = await dbPromise;
    const current = await db.get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!current) return null;
    const rating = Math.min(5, Math.max(1, Number(updates.rating ?? current.rating)));
    await db.run('UPDATE reviews SET name=?, bike=?, rating=?, avatar=?, quote=?, approved=? WHERE id=?', [cleanString(updates.name ?? current.name, 100), cleanString(updates.bike ?? current.bike, 100), rating, cleanString(updates.avatar ?? current.avatar, 500), cleanString(updates.quote ?? current.quote, 1000), updates.approved === undefined ? current.approved : (updates.approved ? 1 : 0), id]);
    return db.get('SELECT * FROM reviews WHERE id = ?', [id]);
  },
  async deleteReview(id) { const db = await dbPromise; const result = await db.run('DELETE FROM reviews WHERE id = ?', [id]); return result.changes > 0; },
  async getStats() {
    const db = await dbPromise;
    const [bookingCount, inServicing, ready, revenue, inquiries] = await Promise.all([
      db.get('SELECT COUNT(*) AS value FROM bookings'), db.get('SELECT COUNT(*) AS value FROM bookings WHERE stage BETWEEN 2 AND 4'), db.get('SELECT COUNT(*) AS value FROM bookings WHERE stage = 5'), db.get("SELECT COALESCE(SUM(total), 0) AS value FROM bookings WHERE date(createdAt) = date('now')"), db.get("SELECT COUNT(*) AS value FROM inquiries WHERE status = 'New'")
    ]);
    return { totalBookings: bookingCount.value, inServicing: inServicing.value, readyForPickup: ready.value, todayRevenue: revenue.value, unreadInquiries: inquiries.value };
  },
  async logAudit(actor, action, entityType, entityId, details = {}) {
    const db = await dbPromise;
    await db.run('INSERT INTO audit_logs (actor, action, entityType, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [actor || null, action, entityType, entityId || null, JSON.stringify(details), now()]);
  },
  async getAdminByUsername(username) { const db = await dbPromise; return db.get('SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)', [username]); },
  async createAdmin(input) {
    const db = await dbPromise;
    const timestamp = now();
    await db.run('INSERT INTO admin_users (username, displayName, passwordSalt, passwordHash, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)', [input.username, input.displayName, input.passwordSalt, input.passwordHash, timestamp, timestamp]);
    return this.getAdminByUsername(input.username);
  },
  async updateAdminPassword(username, passwordSalt, passwordHash) {
    const db = await dbPromise;
    await db.run('UPDATE admin_users SET passwordSalt=?, passwordHash=?, updatedAt=? WHERE LOWER(username)=LOWER(?)', [passwordSalt, passwordHash, now(), username]);
  }
};

module.exports = dbMethods;
