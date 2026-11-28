import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { put, get } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.VERCEL ? '/tmp/spb-data' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const BLOB_DB_PATH = 'store/db.json';

const DEFAULT_SECRET = process.env.AUTH_SECRET || 'spb-satish-pustak-bhandar-hmac-key-v1';

const DEFAULT_SETTINGS = {
  shopName: 'Satish Pustak Bhandar',
  tagline: 'Books, Fine Stationery & Thoughtful Gifts',
  logoUrl: '',
  heroImageUrl: '/images/hero-banner.jpg',
  heroTitle: 'Satish Pustak Bhandar',
  heroSubtitle:
    'From crisp exam registers, fountain pens, and artist watercolor kits to ribbon-tied festive gift hampers — shop everything online or order directly on WhatsApp.',
  whatsappNumber: '919876543210',
  phone: '+91 98765 43210',
  alternatePhone: '',
  email: 'orders@satishpustakbhandar.in',
  address: 'Main Market Road, Near Gandhi Chowk, City Center',
  googleMapsUrl: 'https://maps.google.com/?q=Main+Market+Road+Gandhi+Chowk',
  openingHours: 'Mon–Sat: 9:30 AM – 8:30 PM | Sun: 11:00 AM – 6:00 PM',
  instagramUrl: '',
  facebookUrl: '',
  gstNumber: '',
  freeDeliveryAbove: 499,
  deliveryCharge: 40,
  announcementBanner:
    'Free Local Delivery on orders above ₹499  •  Instant WhatsApp Ordering & Gift Wrapping Available',
  upiId: 'satishpustak@upi',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
};

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

export function isBlobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function createSeedData() {
  return {
    nextOrderSeq: 1001,
    admin: {
      username: process.env.ADMIN_USERNAME || 'satish_admin',
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'Spb@Store#2026!'),
      secret: DEFAULT_SECRET,
    },
    settings: { ...DEFAULT_SETTINGS },
    categories: [
      { id: 'cat-notebooks', name: 'Notebooks & Registers', slug: 'notebooks-registers', icon: 'BookOpen' },
      { id: 'cat-pens', name: 'Pens & Writing', slug: 'pens-writing', icon: 'PenTool' },
      { id: 'cat-art', name: 'Art & Craft Supplies', slug: 'art-craft', icon: 'Palette' },
      { id: 'cat-school', name: 'School & Office', slug: 'school-office', icon: 'Calculator' },
      { id: 'cat-gifts', name: 'Gift Items & Hampers', slug: 'gift-hampers', icon: 'Gift' },
      { id: 'cat-books', name: 'Books & Planners', slug: 'books-planners', icon: 'Bookmark' },
    ],
    products: [
      {
        id: 'prod-1',
        name: 'Heritage Hardcover Notebook & Spiral Pack (Set of 4)',
        sku: 'SPB-NB-001',
        categoryId: 'cat-notebooks',
        price: 349,
        mrp: 450,
        stock: 42,
        image: '/images/products/notebooks-set.jpg',
        featured: true,
        badge: 'Bestseller',
        description:
          'Smooth 100 GSM ivory acid-free pages ideal for fountain pens, gel pens, and daily study notes. Includes 2 stitched leatherette hardcover journals and 2 wire-o spiral notebooks.',
        highlights: ['100 GSM bleed-resistant paper', 'Set of 4 assorted sizes (A5 & B5)', 'Lay-flat binding with ribbon bookmark'],
        active: true,
      },
      {
        id: 'prod-2',
        name: 'Royal Brass & Lacquer Fountain Pen Gift Box',
        sku: 'SPB-PN-002',
        categoryId: 'cat-pens',
        price: 799,
        mrp: 1099,
        stock: 18,
        image: '/images/products/fountain-pen-set.jpg',
        featured: true,
        badge: 'Gift Pick',
        description:
          'Precision German-iridium medium nib fountain pen paired with a matching rollerball pen and 30ml royal blue ink bottle inside a velvet-lined wooden presentation box.',
        highlights: ['Velvet-lined wooden gift case', 'Includes ink bottle & converter', 'Complimentary gift wrapping available'],
        active: true,
      },
      {
        id: 'prod-3',
        name: 'Master Artist 24-Shade Watercolor & Brush Studio Kit',
        sku: 'SPB-AR-003',
        categoryId: 'cat-art',
        price: 649,
        mrp: 850,
        stock: 25,
        image: '/images/products/art-watercolor-kit.jpg',
        featured: true,
        badge: 'Top Rated',
        description:
          'Richly pigmented 24-pan artist watercolor set with 6 synthetic sable brushes, 12 blending colored pencils, and a 300 GSM cold-pressed cotton sketchbook.',
        highlights: ['24 vibrant artist-grade shades', 'Includes 300 GSM watercolor pad', 'Ideal for students & hobbyists'],
        active: true,
      },
      {
        id: 'prod-4',
        name: 'Festive Luxury Gift Hamper Box (Diary, Pen & Candle)',
        sku: 'SPB-GF-004',
        categoryId: 'cat-gifts',
        price: 1199,
        mrp: 1599,
        stock: 14,
        image: '/images/products/gift-hamper.jpg',
        featured: true,
        badge: 'Festive Special',
        description:
          'Curated celebration hamper wrapped in our signature marigold satin ribbon. Features an embossed A5 journal, matte metallic pen, soy-wax vanilla candle, and handwritten greeting card.',
        highlights: ['Ready-to-gift luxury rigid box', 'Free personalized message card', 'Perfect for birthdays, teachers & corporate gifting'],
        active: true,
      },
      {
        id: 'prod-5',
        name: 'Walnut & Brass Executive Desk Organizer Set',
        sku: 'SPB-OF-005',
        categoryId: 'cat-school',
        price: 899,
        mrp: 1150,
        stock: 11,
        image: '/images/products/desk-organizer.jpg',
        featured: true,
        badge: 'New Arrival',
        description:
          'Keep your study table or office desk clutter-free with this handcrafted wooden caddy complete with brass scissors, tape dispenser, stapler, sticky notes, and pen stand.',
        highlights: ['Solid seasoned wood finish', '6-piece desk accessory bundle', 'Non-slip felt base'],
        active: true,
      },
      {
        id: 'prod-6',
        name: 'Precision Geometry Box & Scientific Calculator Combo',
        sku: 'SPB-SC-006',
        categoryId: 'cat-school',
        price: 575,
        mrp: 720,
        stock: 36,
        image: '/images/products/geometry-school-kit.jpg',
        featured: false,
        badge: 'Exam Ready',
        description:
          'Everything a high-school or engineering student needs: rust-proof stainless steel compass & divider set paired with a 240-function dual-line scientific calculator.',
        highlights: ['240-function exam-approved calculator', 'Self-centering steel compass', 'Shatterproof transparent rulers'],
        active: true,
      },
      {
        id: 'prod-7',
        name: '2026–27 Linen Hardcover Daily Planner & Highlighter Set',
        sku: 'SPB-BK-007',
        categoryId: 'cat-books',
        price: 499,
        mrp: 650,
        stock: 29,
        image: '/images/products/daily-planner.jpg',
        featured: true,
        badge: 'Popular',
        description:
          'Plan your academic year, habits, and goals with a tactile woven-linen hardcover daily planner, gold ribbon marker, monthly tabs, and 4 pastel mildliners.',
        highlights: ['Monthly, weekly & habit trackers', 'Includes 4 pastel highlighters', 'Expandable back pocket for receipts'],
        active: true,
      },
      {
        id: 'prod-8',
        name: 'Handcrafted Greeting Cards & Boutique Gift Wrap Pack',
        sku: 'SPB-GF-008',
        categoryId: 'cat-gifts',
        price: 299,
        mrp: 399,
        stock: 55,
        image: '/images/products/greeting-cards-wrap.jpg',
        featured: false,
        badge: 'Value Pack',
        description:
          'Assorted pack of 8 artisanal textured greeting cards with envelopes, 4 thick designer wrapping sheets, and 2 spools of satin ribbon for every celebration.',
        highlights: ['8 blank-inside occasion cards', '4 jumbo 120 GSM wrap sheets', 'Matching gold & marigold ribbons'],
        active: true,
      },
      {
        id: 'prod-9',
        name: 'Curated Classic Literature & Study Reference Bundle',
        sku: 'SPB-BK-009',
        categoryId: 'cat-books',
        price: 949,
        mrp: 1299,
        stock: 9,
        image: '/images/products/books-bundle.jpg',
        featured: false,
        badge: 'Collector Set',
        description:
          'A handpicked bundle of 5 cloth-bound timeless classics and motivational study guides tied in natural twine — makes a memorable gift for avid readers.',
        highlights: ['5 cloth-bound collector editions', 'Includes free brass bookmark', 'Ideal library starter pack'],
        active: true,
      },
      {
        id: 'prod-10',
        name: 'Classmate & Premium Exam Register Bundle (6 × 300 Pages)',
        sku: 'SPB-NB-010',
        categoryId: 'cat-notebooks',
        price: 420,
        mrp: 510,
        stock: 60,
        image: '/images/products/notebooks-set.jpg',
        featured: false,
        badge: 'Bulk Save',
        description:
          'Extra-long ruled registers with bright white 70 GSM pages and laminated water-resistant covers built for heavy college and coaching notes.',
        highlights: ['6 jumbo 300-page registers', 'Smudge-free bright white paper', 'Strong center-stitched spine'],
        active: true,
      },
      {
        id: 'prod-11',
        name: 'Calligraphy Dip Pen & Smooth Gel Pen Pack (12 pcs)',
        sku: 'SPB-PN-011',
        categoryId: 'cat-pens',
        price: 249,
        mrp: 320,
        stock: 48,
        image: '/images/products/fountain-pen-set.jpg',
        featured: false,
        badge: '',
        description:
          'Ultra-smooth 0.5mm waterproof gel pens in blue, black, and red plus a beginner calligraphy pen for neat exam presentation and journaling.',
        highlights: ['Quick-dry waterproof ink', 'Ergonomic soft rubber grip', 'Pack of 12 assorted pens'],
        active: true,
      },
      {
        id: 'prod-12',
        name: 'Complete School Art & Craft Project Box',
        sku: 'SPB-AR-012',
        categoryId: 'cat-art',
        price: 399,
        mrp: 499,
        stock: 15,
        image: '/images/products/art-watercolor-kit.jpg',
        featured: false,
        badge: '',
        description:
          'All-in-one craft kit containing origami sheets, oil pastels, glitter glue, safety scissors, sketch pens, and an A4 drawing book for school projects.',
        highlights: ['Non-toxic child-safe colors', '50 colorful origami & chart sheets', 'Sturdy carry handle box'],
        active: true,
      },
    ],
    // Clean production slate: zero fake orders, zero fake customers, zero fake quotes
    orders: [],
    coupons: [
      {
        id: 'cpn-1',
        code: 'WELCOME50',
        type: 'flat',
        value: 50,
        minOrder: 299,
        description: 'Flat ₹50 off on orders above ₹299',
        active: true,
      },
      {
        id: 'cpn-2',
        code: 'FESTIVE10',
        type: 'percent',
        value: 10,
        minOrder: 500,
        description: '10% off on festive & school orders above ₹500',
        active: true,
      },
    ],
    booklistQuotes: [],
    users: [],
    suppliers: [],
    purchaseOrders: [],
    nextPoSeq: 1001,
  };
}

function normalizeDB(data) {
  data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  if (data.admin) data.admin.secret = DEFAULT_SECRET;
  if (!Array.isArray(data.products)) data.products = [];
  if (!Array.isArray(data.categories)) data.categories = [];
  if (!Array.isArray(data.orders)) data.orders = [];
  if (!Array.isArray(data.coupons)) data.coupons = [];
  if (!Array.isArray(data.booklistQuotes)) data.booklistQuotes = [];
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.suppliers)) data.suppliers = [];
  if (!Array.isArray(data.purchaseOrders)) data.purchaseOrders = [];
  if (!data.nextPoSeq) data.nextPoSeq = 1001;
  return data;
}

async function streamToText(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

export async function loadDB() {
  if (isBlobEnabled()) {
    try {
      const res = await get(BLOB_DB_PATH, { access: 'public', useCache: false });
      if (res && res.statusCode === 200 && res.stream) {
        const raw = await streamToText(res.stream);
        return normalizeDB(JSON.parse(raw));
      }
    } catch (err) {
      // Blob not found yet — will initialize cleanly below
      if (!String(err?.message || '').toLowerCase().includes('not found')) {
        console.error('Blob read warning:', err?.message || err);
      }
    }
    const seed = createSeedData();
    await saveDB(seed);
    return seed;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedData();
    await saveDB(seed);
    return seed;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return normalizeDB(JSON.parse(raw));
}

export async function saveDB(data) {
  const normalized = normalizeDB(data);
  if (isBlobEnabled()) {
    await put(BLOB_DB_PATH, JSON.stringify(normalized), {
      access: 'public',
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
      contentType: 'application/json',
    });
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export async function savePublicFile(folder, filename, buffer, contentType = 'application/octet-stream') {
  if (isBlobEnabled()) {
    const blob = await put(`${folder}/${filename}`, buffer, {
      access: 'public',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType,
    });
    return blob.url;
  }
  const dir = path.join(__dirname, 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}
