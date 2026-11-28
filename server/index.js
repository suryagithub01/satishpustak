import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDB, saveDB, savePublicFile, hashPassword, verifyPassword } from './db.js';
import { sendOrderConfirmationEmail, sendPromoEmail, sendActivityEmail } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/spb-uploads' : path.join(__dirname, 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Ensure real-time fresh API data (never stale CDN/browser cache)
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Memory storage so uploaded images go straight to permanent Vercel Blob (or local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Simple HMAC token auth for Admin & Customers
function signToken(username, secret, role = 'admin', userId = null) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, role, userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!decoded.exp || decoded.exp < Date.now()) return null;
  return decoded;
}

async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const db = await loadDB();
    const decoded = verifyToken(token, db.admin.secret);
    if (!decoded || (decoded.role && decoded.role !== 'admin')) {
      return res.status(401).json({ error: 'Unauthorized. Please log in as admin.' });
    }
    req.adminUser = decoded.u;
    req.db = db;
    next();
  } catch (err) {
    next(err);
  }
}

function getOptionalCustomer(req, db) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const decoded = verifyToken(token, db.admin.secret);
  if (!decoded || decoded.role !== 'customer' || !decoded.userId) return null;
  return (db.users || []).find((u) => u.id === decoded.userId) || null;
}

async function requireCustomer(req, res, next) {
  try {
    const db = await loadDB();
    const user = getOptionalCustomer(req, db);
    if (!user) {
      return res.status(401).json({ error: 'Please sign in to access your account.' });
    }
    req.customer = user;
    req.db = db;
    next();
  } catch (err) {
    next(err);
  }
}

function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email || '',
    emailVerified: Boolean(u.emailVerified),
    address: u.address || '',
    city: u.city || '',
    pincode: u.pincode || '',
    preferredPayment: u.preferredPayment || 'COD',
    savedUpiId: u.savedUpiId || '',
    wishlist: Array.isArray(u.wishlist) ? u.wishlist : [],
    activityLog: Array.isArray(u.activityLog) ? u.activityLog.slice(0, 20) : [],
    createdAt: u.createdAt,
  };
}

function addUserActivity(user, title, detail = '', emailPreviewUrl = '') {
  if (!user) return;
  if (!Array.isArray(user.activityLog)) user.activityLog = [];
  user.activityLog.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    detail,
    emailPreviewUrl,
    at: new Date().toISOString(),
  });
  user.activityLog = user.activityLog.slice(0, 25);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function calculateCouponDiscount(db, code, subtotal) {
  if (!code || !String(code).trim()) return { coupon: null, discount: 0 };
  const normalized = String(code).trim().toUpperCase();
  const coupon = (db.coupons || []).find(
    (c) => c.code.toUpperCase() === normalized && c.active !== false
  );
  if (!coupon) return { error: 'Invalid or expired coupon code.' };
  if (subtotal < (coupon.minOrder || 0)) {
    return { error: `Minimum order of ₹${coupon.minOrder} required for ${coupon.code}.` };
  }
  const discount =
    coupon.type === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);
  return { coupon, discount };
}

function buildCustomersList(db) {
  const map = new Map();
  for (const u of db.users || []) {
    const key = normalizePhone(u.phone) || u.email || u.id;
    map.set(key, {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email || '',
      address: u.address || '',
      city: u.city || '',
      pincode: u.pincode || '',
      preferredPayment: u.preferredPayment || 'COD',
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      lastOrderNumber: '',
      createdAt: u.createdAt,
    });
  }
  for (const o of db.orders || []) {
    const key = normalizePhone(o.phone) || o.customerEmail || o.id;
    let rec = map.get(key);
    if (!rec) {
      rec = {
        id: `cust-${key}`,
        name: o.customerName,
        phone: o.phone,
        email: o.customerEmail || '',
        address: o.address || '',
        city: o.city || '',
        pincode: o.pincode || '',
        preferredPayment: o.paymentMethod || 'COD',
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: null,
        lastOrderNumber: '',
        createdAt: o.createdAt,
      };
      map.set(key, rec);
    }
    if (!rec.email && o.customerEmail) rec.email = o.customerEmail;
    if (!rec.address && o.address) rec.address = o.address;
    if (!rec.city && o.city) rec.city = o.city;
    if (o.status !== 'Cancelled') {
      rec.totalOrders += 1;
      rec.totalSpent += Number(o.total || 0);
    }
    if (!rec.lastOrderAt || new Date(o.createdAt) > new Date(rec.lastOrderAt)) {
      rec.lastOrderAt = o.createdAt;
      rec.lastOrderNumber = o.orderNumber;
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
}

function buildDashboardData(db) {
  const validOrders = db.orders.filter((o) => o.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = db.orders.filter((o) => o.status === 'Pending').length;
  const lowStockProducts = db.products.filter((p) => p.stock <= 10);

  const statusCounts = {
    Pending: 0,
    Confirmed: 0,
    Packed: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };
  for (const o of db.orders) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  }

  return {
    stats: {
      totalRevenue,
      totalOrders: db.orders.length,
      pendingOrders,
      totalProducts: db.products.length,
      totalCategories: db.categories.length,
      lowStockCount: lowStockProducts.length,
      newQuotesCount: (db.booklistQuotes || []).filter((q) => q.status === 'New').length,
    },
    statusCounts,
    lowStockProducts,
    recentOrders: db.orders.slice(0, 6),
  };
}

// ==========================================
// PUBLIC STOREFRONT ENDPOINTS
// ==========================================

app.get('/api/store', async (_req, res) => {
  const db = await loadDB();
  const { smtpPass, smtpUser, smtpHost, smtpPort, smtpFrom, ...publicSettings } = db.settings || {};
  res.json({
    settings: publicSettings,
    categories: db.categories,
    products: db.products.filter((p) => p.active !== false),
  });
});

app.get('/api/products', async (req, res) => {
  const db = await loadDB();
  const { category, search, featured, sort } = req.query;
  let list = db.products.filter((p) => p.active !== false);

  if (category && category !== 'all') {
    list = list.filter((p) => p.categoryId === category);
  }
  if (featured === 'true') {
    list = list.filter((p) => p.featured);
  }
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);

  res.json({ products: list });
});

app.post('/api/coupons/validate', async (req, res) => {
  const { code, subtotal } = req.body || {};
  const db = await loadDB();
  const result = calculateCouponDiscount(db, code, Number(subtotal) || 0);
  if (result.error) return res.status(400).json({ error: result.error });
  if (!result.coupon) return res.status(400).json({ error: 'Please enter a coupon code.' });
  res.json({ coupon: result.coupon, discount: result.discount });
});

app.post('/api/booklist-quotes', upload.single('photo'), async (req, res) => {
  const { customerName, phone, schoolOrClass, notes } = req.body || {};
  if (!customerName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Your name and phone number are required.' });
  }
  let imageUrl = '';
  if (req.file) {
    const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
    const fname = `booklist-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    imageUrl = await savePublicFile('booklists', fname, req.file.buffer, req.file.mimetype);
  }
  const db = await loadDB();
  const quote = {
    id: `bq-${Date.now()}`,
    customerName: customerName.trim(),
    phone: phone.trim(),
    schoolOrClass: (schoolOrClass || '').trim(),
    notes: (notes || '').trim(),
    imageUrl,
    status: 'New',
    createdAt: new Date().toISOString(),
  };
  db.booklistQuotes.unshift(quote);
  await saveDB(db);
  res.status(201).json({ quote });
});

app.post('/api/orders', async (req, res) => {
  const {
    customerName,
    customerEmail,
    phone,
    address,
    city,
    pincode,
    notes,
    paymentMethod,
    couponCode,
    accountPassword,
    items,
  } = req.body || {};

  if (!customerName?.trim() || !phone?.trim() || !address?.trim()) {
    return res.status(400).json({ error: 'Name, phone number, and delivery address are required.' });
  }
  const db = await loadDB();
  let loggedInUser = getOptionalCustomer(req, db);
  const cleanP = normalizePhone(phone);
  const resolvedEmail = (customerEmail || loggedInUser?.email || '').trim().toLowerCase();
  if (!resolvedEmail || !resolvedEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required for order confirmation.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const resolvedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product not found: ${item.productId}` });
    }
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (product.stock < qty) {
      return res.status(400).json({
        error: `Only ${product.stock} left in stock for "${product.name}".`,
      });
    }
    resolvedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.image,
    });
    subtotal += product.price * qty;
  }

  for (const ri of resolvedItems) {
    const prod = db.products.find((p) => p.id === ri.productId);
    if (prod) prod.stock = Math.max(0, prod.stock - ri.quantity);
  }

  const couponResult = calculateCouponDiscount(db, couponCode, subtotal);
  if (couponResult.error) {
    return res.status(400).json({ error: couponResult.error });
  }
  const discount = couponResult.discount || 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const deliveryCharge =
    discountedSubtotal >= (db.settings.freeDeliveryAbove ?? 499)
      ? 0
      : (db.settings.deliveryCharge ?? 40);
  const total = discountedSubtotal + deliveryCharge;

  const seq = db.nextOrderSeq || 1001;
  db.nextOrderSeq = seq + 1;

  let issuedToken = null;
  let isNewAccount = false;

  if (!loggedInUser) {
    const existing = (db.users || []).find(
      (u) =>
        (cleanP.length === 10 && normalizePhone(u.phone) === cleanP) ||
        (u.email && u.email.toLowerCase() === resolvedEmail)
    );
    if (existing) {
      loggedInUser = existing;
    } else {
      const initialPass =
        accountPassword && String(accountPassword).trim().length >= 4
          ? String(accountPassword).trim()
          : cleanP || '123456';
      loggedInUser = {
        id: `usr-${Date.now()}`,
        name: customerName.trim(),
        phone: cleanP || phone.trim(),
        email: resolvedEmail,
        passwordHash: hashPassword(initialPass),
        address: address.trim(),
        city: (city || '').trim(),
        pincode: (pincode || '').trim(),
        preferredPayment: paymentMethod || 'COD',
        savedUpiId: '',
        wishlist: [],
        createdAt: new Date().toISOString(),
      };
      db.users = [loggedInUser, ...(db.users || [])];
      isNewAccount = true;
    }
    issuedToken = signToken(loggedInUser.phone, db.admin.secret, 'customer', loggedInUser.id);
  }

  if (loggedInUser) {
    loggedInUser.name = customerName.trim() || loggedInUser.name;
    loggedInUser.address = address.trim();
    if (resolvedEmail) loggedInUser.email = resolvedEmail;
    if (city?.trim()) loggedInUser.city = city.trim();
    if (pincode?.trim()) loggedInUser.pincode = pincode.trim();
    if (paymentMethod) loggedInUser.preferredPayment = paymentMethod;
  }

  const order = {
    id: `ord-${seq}`,
    orderNumber: `SPB-${seq}`,
    userId: loggedInUser ? loggedInUser.id : null,
    customerName: customerName.trim(),
    customerEmail: resolvedEmail,
    phone: phone.trim(),
    address: address.trim(),
    city: (city || '').trim(),
    pincode: (pincode || '').trim(),
    notes: (notes || '').trim(),
    paymentMethod: paymentMethod || 'COD',
    paymentStatus: paymentMethod === 'WhatsApp UPI' ? 'UPI Pending Verification' : 'Pay on Delivery',
    status: 'Pending',
    items: resolvedItems,
    subtotal,
    discount,
    couponCode: couponResult.coupon ? couponResult.coupon.code : '',
    deliveryCharge,
    total,
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(order);

  // Run permanent DB save and confirmation email in parallel for fastest checkout response
  const [, emailStatus] = await Promise.all([
    saveDB(db),
    sendOrderConfirmationEmail(order, db.settings),
  ]);

  res.status(201).json({
    order,
    emailStatus,
    ...(issuedToken ? { token: issuedToken } : {}),
    user: loggedInUser ? sanitizeUser(loggedInUser) : null,
    isNewAccount,
  });
});

app.get('/api/orders/track/:orderNumber', async (req, res) => {
  const db = await loadDB();
  const query = String(req.params.orderNumber || '').trim().toUpperCase();
  const order = db.orders.find(
    (o) => o.orderNumber.toUpperCase() === query || o.phone.replace(/\D/g, '').endsWith(query)
  );
  if (!order) {
    return res.status(404).json({ error: 'No order found with that Order ID.' });
  }
  res.json({ order });
});

// ==========================================
// CUSTOMER AUTH & ACCOUNT ENDPOINTS
// ==========================================

app.post('/api/auth/signup', async (req, res) => {
  const { name, phone, email, password } = req.body || {};
  const cleanP = normalizePhone(phone);
  if (!name?.trim() || cleanP.length < 10 || String(password || '').trim().length < 4) {
    return res
      .status(400)
      .json({ error: 'Name, 10-digit phone number, and password (min 4 chars) are required.' });
  }
  const db = await loadDB();
  const exists = (db.users || []).find(
    (u) =>
      normalizePhone(u.phone) === cleanP ||
      (email?.trim() && u.email && u.email.toLowerCase() === email.trim().toLowerCase())
  );
  if (exists) {
    return res.status(400).json({ error: 'An account with this phone or email already exists.' });
  }
  const user = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    phone: cleanP,
    email: (email || '').trim().toLowerCase(),
    emailVerified: false,
    verificationCode: generateOtp(),
    passwordHash: hashPassword(String(password).trim()),
    address: '',
    city: '',
    pincode: '',
    preferredPayment: 'COD',
    savedUpiId: '',
    wishlist: [],
    activityLog: [],
    createdAt: new Date().toISOString(),
  };

  let verificationEmail = null;
  if (user.email) {
    verificationEmail = await sendActivityEmail({
      to: user.email,
      customerName: user.name,
      badge: 'Email Verification',
      title: 'Verify Your Email Address',
      highlightCode: user.verificationCode,
      details: [
        `Enter this 6-digit code in My Account to verify <strong>${user.email}</strong>.`,
        `Phone registered: ${user.phone}`,
      ],
      settings: db.settings,
    });
  }
  addUserActivity(
    user,
    'Account Created',
    `Signed up with ${user.phone}${user.email ? ` & ${user.email}` : ''}`,
    verificationEmail?.previewUrl || ''
  );

  db.users = [user, ...(db.users || [])];
  await saveDB(db);
  const token = signToken(user.phone, db.admin.secret, 'customer', user.id);
  res.status(201).json({ token, user: sanitizeUser(user), verificationEmail });
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  const idStr = String(identifier || '').trim();
  const cleanP = normalizePhone(idStr);
  const db = await loadDB();
  const user = (db.users || []).find(
    (u) =>
      (cleanP.length === 10 && normalizePhone(u.phone) === cleanP) ||
      (u.email && u.email.toLowerCase() === idStr.toLowerCase())
  );
  if (!user || !verifyPassword(String(password || '').trim(), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid phone/email or password.' });
  }
  let loginEmail = null;
  if (user.email) {
    loginEmail = await sendActivityEmail({
      to: user.email,
      customerName: user.name,
      badge: 'Security & Login Alert',
      title: 'New Sign-In to Your Account',
      details: [
        `Account: <strong>${user.name}</strong> (${user.phone})`,
        `Signed in at ${new Date().toLocaleString('en-IN')}`,
      ],
      settings: db.settings,
    });
  }
  addUserActivity(user, 'Signed In', 'Successful account login', loginEmail?.previewUrl || '');
  await saveDB(db);
  const token = signToken(user.phone, db.admin.secret, 'customer', user.id);
  res.json({ token, user: sanitizeUser(user), loginEmail });
});

app.post('/api/auth/verify-email', requireCustomer, async (req, res) => {
  const { code } = req.body || {};
  const user = req.customer;
  if (!code || String(code).trim() !== String(user.verificationCode || '')) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email.' });
  }
  user.emailVerified = true;
  user.verificationCode = '';
  const emailRes = await sendActivityEmail({
    to: user.email,
    customerName: user.name,
    badge: 'Verified Account',
    title: 'Your Email Is Now Verified!',
    details: [`Email <strong>${user.email}</strong> has been verified successfully.`],
    settings: req.db.settings,
  });
  addUserActivity(user, 'Email Verified', `${user.email} verified`, emailRes?.previewUrl || '');
  await saveDB(req.db);
  res.json({ user: sanitizeUser(user), emailRes });
});

app.post('/api/auth/resend-verification', requireCustomer, async (req, res) => {
  const user = req.customer;
  if (!user.email) {
    return res.status(400).json({ error: 'Please add an email address in your profile first.' });
  }
  user.verificationCode = generateOtp();
  user.emailVerified = false;
  const emailRes = await sendActivityEmail({
    to: user.email,
    customerName: user.name,
    badge: 'Email Verification',
    title: 'Your New Verification Code',
    highlightCode: user.verificationCode,
    details: [`Use this 6-digit code to verify <strong>${user.email}</strong>.`],
    settings: req.db.settings,
  });
  addUserActivity(user, 'Verification Code Sent', `Sent to ${user.email}`, emailRes?.previewUrl || '');
  await saveDB(req.db);
  res.json({ user: sanitizeUser(user), emailRes });
});

app.get('/api/auth/me', requireCustomer, (req, res) => {
  res.json({ user: sanitizeUser(req.customer) });
});

app.put('/api/auth/profile', requireCustomer, async (req, res) => {
  const { name, email, address, city, pincode, preferredPayment, savedUpiId, newPassword } =
    req.body || {};
  const user = req.customer;
  if (name !== undefined && String(name).trim()) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (address !== undefined) user.address = String(address).trim();
  if (city !== undefined) user.city = String(city).trim();
  if (pincode !== undefined) user.pincode = String(pincode).trim();
  if (preferredPayment !== undefined) user.preferredPayment = String(preferredPayment).trim();
  if (savedUpiId !== undefined) user.savedUpiId = String(savedUpiId).trim();
  if (newPassword && String(newPassword).trim().length >= 4) {
    user.passwordHash = hashPassword(String(newPassword).trim());
  }
  let activityEmail = null;
  if (user.email) {
    activityEmail = await sendActivityEmail({
      to: user.email,
      customerName: user.name,
      badge: 'Profile Update',
      title: newPassword ? 'Your Profile & Password Were Updated' : 'Your Account Profile Was Updated',
      details: [
        `Name: ${user.name}`,
        user.address ? `Saved Address: ${user.address}${user.city ? `, ${user.city}` : ''}` : null,
      ],
      settings: req.db.settings,
    });
  }
  addUserActivity(
    user,
    newPassword ? 'Profile & Password Updated' : 'Profile Updated',
    'Saved account details updated',
    activityEmail?.previewUrl || ''
  );
  await saveDB(req.db);
  res.json({ user: sanitizeUser(user), activityEmail });
});

app.post('/api/auth/wishlist/:productId', requireCustomer, async (req, res) => {
  const pid = req.params.productId;
  const user = req.customer;
  user.wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
  if (user.wishlist.includes(pid)) {
    user.wishlist = user.wishlist.filter((id) => id !== pid);
  } else {
    user.wishlist.push(pid);
  }
  await saveDB(req.db);
  res.json({ wishlist: user.wishlist, user: sanitizeUser(user) });
});

app.get('/api/auth/orders', requireCustomer, (req, res) => {
  const user = req.customer;
  const userPhone = normalizePhone(user.phone);
  const myOrders = (req.db.orders || []).filter(
    (o) => o.userId === user.id || (userPhone && normalizePhone(o.phone) === userPhone)
  );
  res.json({ orders: myOrders });
});

// ==========================================
// ADMIN AUTH & DASHBOARD
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const db = await loadDB();
  if (
    String(username || '').trim() === db.admin.username &&
    verifyPassword(String(password || '').trim(), db.admin.passwordHash)
  ) {
    const token = signToken(db.admin.username, db.admin.secret, 'admin');
    return res.json({ token, username: db.admin.username });
  }
  return res.status(401).json({ error: 'Invalid username or password.' });
});

app.get('/api/admin/bootstrap', requireAdmin, (req, res) => {
  const db = req.db;
  res.json({
    dashboard: buildDashboardData(db),
    products: db.products || [],
    categories: db.categories || [],
    orders: db.orders || [],
    settings: db.settings || {},
    coupons: db.coupons || [],
    quotes: db.booklistQuotes || [],
    customers: buildCustomersList(db),
    suppliers: db.suppliers || [],
    purchaseOrders: db.purchaseOrders || [],
  });
});

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  res.json(buildDashboardData(req.db));
});

// ==========================================
// ADMIN IMAGE UPLOAD (PERMANENT BLOB)
// ==========================================

app.post('/api/admin/upload', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
  const fname = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const url = await savePublicFile('media', fname, req.file.buffer, req.file.mimetype);
  res.json({ url });
});

// ==========================================
// ADMIN PRODUCTS CRUD
// ==========================================

app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json({ products: req.db.products });
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const db = req.db;
  const {
    name,
    sku,
    categoryId,
    price,
    mrp,
    stock,
    image,
    featured,
    badge,
    description,
    highlights,
    active,
  } = req.body || {};

  if (!name?.trim() || !categoryId || Number(price) <= 0) {
    return res.status(400).json({ error: 'Product name, category, and valid price are required.' });
  }

  const product = {
    id: `prod-${Date.now()}`,
    name: name.trim(),
    sku: (sku || `SPB-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
    categoryId,
    price: Number(price),
    mrp: Number(mrp) || Number(price),
    stock: Math.max(0, parseInt(stock, 10) || 0),
    image: image?.trim() || '/images/products/notebooks-set.jpg',
    featured: Boolean(featured),
    badge: (badge || '').trim(),
    description: (description || '').trim(),
    highlights: Array.isArray(highlights)
      ? highlights.map((h) => String(h).trim()).filter(Boolean)
      : String(highlights || '')
          .split('\n')
          .map((h) => h.trim())
          .filter(Boolean),
    active: active !== false,
  };

  db.products.unshift(product);
  await saveDB(db);
  res.status(201).json({ product });
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

  const prev = db.products[idx];
  const body = req.body || {};
  const highlights =
    body.highlights !== undefined
      ? Array.isArray(body.highlights)
        ? body.highlights.map((h) => String(h).trim()).filter(Boolean)
        : String(body.highlights)
            .split('\n')
            .map((h) => h.trim())
            .filter(Boolean)
      : prev.highlights;

  db.products[idx] = {
    ...prev,
    name: body.name !== undefined ? String(body.name).trim() : prev.name,
    sku: body.sku !== undefined ? String(body.sku).trim() : prev.sku,
    categoryId: body.categoryId ?? prev.categoryId,
    price: body.price !== undefined ? Number(body.price) : prev.price,
    mrp: body.mrp !== undefined ? Number(body.mrp) : prev.mrp,
    stock: body.stock !== undefined ? Math.max(0, parseInt(body.stock, 10) || 0) : prev.stock,
    image: body.image !== undefined ? String(body.image).trim() : prev.image,
    featured: body.featured !== undefined ? Boolean(body.featured) : prev.featured,
    badge: body.badge !== undefined ? String(body.badge).trim() : prev.badge,
    description: body.description !== undefined ? String(body.description).trim() : prev.description,
    highlights,
    active: body.active !== undefined ? Boolean(body.active) : prev.active,
  };

  await saveDB(db);
  res.json({ product: db.products[idx] });
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== req.params.id);
  if (db.products.length === before) return res.status(404).json({ error: 'Product not found.' });
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN CATEGORIES CRUD
// ==========================================

app.get('/api/admin/categories', requireAdmin, (req, res) => {
  res.json({ categories: req.db.categories });
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const { name, icon } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Category name is required.' });
  const db = req.db;
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const category = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    slug: slug || `category-${Date.now()}`,
    icon: icon || 'Tag',
  };
  db.categories.push(category);
  await saveDB(db);
  res.status(201).json({ category });
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const inUse = db.products.some((p) => p.categoryId === req.params.id);
  if (inUse) {
    return res
      .status(400)
      .json({ error: 'Cannot delete a category that still has products. Move or delete those products first.' });
  }
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN ORDERS MANAGEMENT
// ==========================================

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  res.json({ orders: req.db.orders });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }
  const db = req.db;
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.status = status;
  order.updatedAt = new Date().toISOString();

  // Notify customer by email & record activity when order status changes
  if (order.customerEmail) {
    const emailRes = await sendActivityEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      badge: 'Order Status Update',
      title: `Order ${order.orderNumber} is now ${status}`,
      details: [
        `Order ID: <strong>${order.orderNumber}</strong>`,
        `Current Status: <strong>${status}</strong>`,
        `Order Total: ₹${Number(order.total || 0).toLocaleString('en-IN')} (${order.paymentMethod})`,
      ],
      settings: db.settings,
    });
    const matchedUser = (db.users || []).find(
      (u) => u.id === order.userId || normalizePhone(u.phone) === normalizePhone(order.phone)
    );
    if (matchedUser) {
      addUserActivity(
        matchedUser,
        `Order ${order.orderNumber} → ${status}`,
        `Order status updated to ${status}`,
        emailRes?.previewUrl || ''
      );
    }
  }

  await saveDB(db);
  res.json({ order });
});

app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN COUPONS CRUD
// ==========================================

app.get('/api/admin/coupons', requireAdmin, (req, res) => {
  res.json({ coupons: req.db.coupons || [] });
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  const { code, type, value, minOrder, description } = req.body || {};
  if (!code?.trim() || Number(value) <= 0) {
    return res.status(400).json({ error: 'Coupon code and valid discount value are required.' });
  }
  const db = req.db;
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  if ((db.coupons || []).some((c) => c.code.toUpperCase() === normalized)) {
    return res.status(400).json({ error: 'A coupon with this code already exists.' });
  }
  const coupon = {
    id: `cpn-${Date.now()}`,
    code: normalized,
    type: type === 'percent' ? 'percent' : 'flat',
    value: Number(value),
    minOrder: Math.max(0, Number(minOrder) || 0),
    description: (description || '').trim(),
    active: true,
  };
  db.coupons = [coupon, ...(db.coupons || [])];
  await saveDB(db);
  res.status(201).json({ coupon });
});

app.patch('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const coupon = (db.coupons || []).find((c) => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
  if (req.body.active !== undefined) coupon.active = Boolean(req.body.active);
  await saveDB(db);
  res.json({ coupon });
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  db.coupons = (db.coupons || []).filter((c) => c.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN BOOKLIST QUOTES MANAGEMENT
// ==========================================

app.get('/api/admin/booklist-quotes', requireAdmin, (req, res) => {
  res.json({ quotes: req.db.booklistQuotes || [] });
});

app.patch('/api/admin/booklist-quotes/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['New', 'Quoted', 'Completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const db = req.db;
  const q = (db.booklistQuotes || []).find((item) => item.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'Quote request not found.' });
  q.status = status;
  await saveDB(db);
  res.json({ quote: q });
});

app.delete('/api/admin/booklist-quotes/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  db.booklistQuotes = (db.booklistQuotes || []).filter((item) => item.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN CUSTOMERS CRM & UPSELL CAMPAIGNS
// ==========================================

app.get('/api/admin/customers', requireAdmin, (req, res) => {
  res.json({ customers: buildCustomersList(req.db) });
});

app.post('/api/admin/customers/send-email', requireAdmin, async (req, res) => {
  const { recipients, subject, message, couponCode } = req.body || {};
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Email subject and message are required.' });
  }
  const result = await sendPromoEmail({
    recipients,
    subject: subject.trim(),
    message: message.trim(),
    couponCode: (couponCode || '').trim().toUpperCase(),
    settings: req.db.settings,
  });
  if (result.sentCount === 0 && result.error) {
    return res.status(400).json({ error: result.error, previewUrl: result.previewUrl });
  }
  res.json(result);
});

// ==========================================
// ADMIN SUPPLIERS & PURCHASE ORDERS (PO)
// ==========================================

app.get('/api/admin/suppliers', requireAdmin, (req, res) => {
  res.json({ suppliers: req.db.suppliers || [] });
});

app.post('/api/admin/suppliers', requireAdmin, async (req, res) => {
  const { name, company, whatsapp, email, city, notes } = req.body || {};
  if (!name?.trim() || !whatsapp?.trim()) {
    return res.status(400).json({ error: 'Supplier name and WhatsApp number are required.' });
  }
  const db = req.db;
  const supplier = {
    id: `sup-${Date.now()}`,
    name: name.trim(),
    company: (company || '').trim(),
    whatsapp: whatsapp.trim(),
    email: (email || '').trim(),
    city: (city || '').trim(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };
  db.suppliers = [supplier, ...(db.suppliers || [])];
  await saveDB(db);
  res.status(201).json({ supplier });
});

app.delete('/api/admin/suppliers/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  db.suppliers = (db.suppliers || []).filter((s) => s.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

app.get('/api/admin/purchase-orders', requireAdmin, (req, res) => {
  res.json({ purchaseOrders: req.db.purchaseOrders || [] });
});

app.post('/api/admin/purchase-orders', requireAdmin, async (req, res) => {
  const { supplierId, supplierName, supplierWhatsapp, notes, items } = req.body || {};
  if (!supplierName?.trim() || !supplierWhatsapp?.trim()) {
    return res.status(400).json({ error: 'Supplier name and WhatsApp number are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the Purchase Order.' });
  }
  const db = req.db;
  const seq = db.nextPoSeq || 1001;
  db.nextPoSeq = seq + 1;

  const cleanItems = items
    .filter((it) => it.name?.trim() && Number(it.quantity) > 0)
    .map((it) => ({
      productId: it.productId || '',
      sku: it.sku || '',
      name: it.name.trim(),
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
      unitCost: Math.max(0, Number(it.unitCost) || 0),
    }));

  const estimatedTotal = cleanItems.reduce((s, it) => s + it.quantity * it.unitCost, 0);

  const po = {
    id: `po-${seq}`,
    poNumber: `PO-${seq}`,
    supplierId: supplierId || '',
    supplierName: supplierName.trim(),
    supplierWhatsapp: supplierWhatsapp.trim(),
    notes: (notes || '').trim(),
    items: cleanItems,
    estimatedTotal,
    status: 'Sent',
    stockAdded: false,
    createdAt: new Date().toISOString(),
  };

  db.purchaseOrders = [po, ...(db.purchaseOrders || [])];
  await saveDB(db);
  res.status(201).json({ purchaseOrder: po });
});

app.patch('/api/admin/purchase-orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['Draft', 'Sent', 'Received', 'Cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid PO status.' });
  const db = req.db;
  const po = (db.purchaseOrders || []).find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });

  // Automatically restock inventory when PO is marked Received for the first time!
  if (status === 'Received' && !po.stockAdded) {
    for (const it of po.items || []) {
      if (it.productId) {
        const prod = db.products.find((p) => p.id === it.productId);
        if (prod) prod.stock = (prod.stock || 0) + (it.quantity || 0);
      }
    }
    po.stockAdded = true;
  }

  po.status = status;
  po.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.json({ purchaseOrder: po });
});

app.delete('/api/admin/purchase-orders/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  db.purchaseOrders = (db.purchaseOrders || []).filter((p) => p.id !== req.params.id);
  await saveDB(db);
  res.json({ ok: true });
});

// ==========================================
// ADMIN STORE SETTINGS
// ==========================================

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({ settings: req.db.settings });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const db = req.db;
  const body = req.body || {};
  const fields = [
    'shopName',
    'tagline',
    'logoUrl',
    'heroImageUrl',
    'heroTitle',
    'heroSubtitle',
    'whatsappNumber',
    'phone',
    'alternatePhone',
    'email',
    'address',
    'googleMapsUrl',
    'openingHours',
    'instagramUrl',
    'facebookUrl',
    'gstNumber',
    'announcementBanner',
    'upiId',
    'smtpHost',
    'smtpUser',
    'smtpPass',
    'smtpFrom',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) db.settings[f] = String(body[f]).trim();
  }
  if (body.smtpPort !== undefined) {
    db.settings.smtpPort = Number(body.smtpPort) || 587;
  }
  if (body.freeDeliveryAbove !== undefined) {
    db.settings.freeDeliveryAbove = Math.max(0, Number(body.freeDeliveryAbove) || 0);
  }
  if (body.deliveryCharge !== undefined) {
    db.settings.deliveryCharge = Math.max(0, Number(body.deliveryCharge) || 0);
  }
  if (body.newPassword && String(body.newPassword).trim().length >= 4) {
    db.admin.passwordHash = hashPassword(String(body.newPassword).trim());
  }
  await saveDB(db);
  res.json({ settings: db.settings });
});

// Serve built frontend in production
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile('index.html', { root: DIST_DIR });
  });
}

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Server error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Satish Pustak Bhandar API server running on http://localhost:${PORT}`);
  });
}

export default app;
