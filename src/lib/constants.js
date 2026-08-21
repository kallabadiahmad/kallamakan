/* =============================================
   KALLA MAKAN - CONSTANTS & CONFIG (CTWA FOCUS)
   ============================================= */

export const CONFIG = {
  WA_NUMBER: '6282227418224',
  STORE_NAME: 'Kalla Makan',
  STORE_TAGLINE: 'Form Pemesanan Cepat Asinan Buah Segar',
  STORE_HOURS: '09:00 - 21:00 WIB',
  STORE_LOCATION: 'Jakarta Barat, DKI Jakarta',
  STORAGE_KEYS: {
    products: 'kalla_products_v5',
    orders: 'kalla_orders',
    expenses: 'kalla_expenses',
    settings: 'kalla_settings',
    password: 'kalla_admin_password',
    session: 'kalla_admin_session',
    cart: 'kalla_cart_v2',
  },
};

export const DEFAULT_PRODUCTS = [
  {
    id: 'prod_001',
    name: 'Asinan Kiamboy Spesial',
    description: 'Kedondong, mangga muda, jambu kristal, & bengkoang renyah berpadu kuah kiamboy merah asam manis segar melegakan dahaga.',
    category: 'kiamboy',
    badge: 'Best Seller',
    image: '/images/asinan-kiyamboy.jpg',
    active: true,
    variants: [
      { id: 'v_400', size: '400ml (Porsi Pas)', price: 35000, hpp: 18000 },
      { id: 'v_600', size: '600ml (Porsi Puas)', price: 60000, hpp: 30000 },
    ],
  },
  {
    id: 'prod_002',
    name: 'Asinan Pomegranate (Delima Merah)',
    description: 'Asinan buah premium bertabur butiran buah delima merah segar impor, kaya antioksidan dengan kuah delima segar eksklusif.',
    category: 'pomegranate',
    badge: 'Signature',
    image: '/images/asinan-pomegranate.jpg',
    active: true,
    variants: [
      { id: 'v_400', size: '400ml (Porsi Pas)', price: 85000, hpp: 45000 },
      { id: 'v_600', size: '600ml (Porsi Puas)', price: 135000, hpp: 70000 },
    ],
  },
];

export const SHIPPING_METHODS = [
  {
    id: 'kurir',
    name: 'Kurir Pengiriman',
    description: 'Diantar langsung ke alamat (Gojek / Grab / Paxel)',
    price: 0,
  },
  {
    id: 'pickup',
    name: 'Pick Up (Ambil Sendiri)',
    description: 'Ambil langsung di outlet / dapur toko',
    price: 0,
  },
];

export const PAYMENT_METHODS = [
  {
    id: 'transfer',
    name: 'Transfer Bank & E-Wallet',
    description: 'DANA / BCA / BNI (Kirim bukti ke WA)',
  },
  {
    id: 'cod',
    name: 'COD (Bayar Tunai di Tempat)',
    description: 'Bayar tunai saat kurir tiba / saat ambil',
  },
];

export const BANK_ACCOUNTS = [
  {
    bank: 'DANA',
    number: '0819 9823 0896',
    holder: 'Zultia Susanti',
    color: '#118EEA',
  },
  {
    bank: 'BCA',
    number: '0562 4712 92',
    holder: 'Zultia Susanti',
    color: '#0060AF',
  },
  {
    bank: 'BNI',
    number: '1914 1378 05',
    holder: 'Zultia Susanti',
    color: '#F15A24',
  },
];

export const PROMO_VOUCHERS = [
  {
    code: 'HEMAT10K',
    discount: 10000,
    minOrder: 80000,
    label: 'Diskon Rp 10.000 (Min. Rp 80rb)',
  },
  {
    code: 'KALLASEGAR',
    discount: 5000,
    minOrder: 50000,
    label: 'Diskon Rp 5.000 (Min. Rp 50rb)',
  },
];

export const DEFAULT_SETTINGS = {
  storeName: CONFIG.STORE_NAME,
  tagline: CONFIG.STORE_TAGLINE,
  whatsappNumber: CONFIG.WA_NUMBER,
  storeHours: CONFIG.STORE_HOURS,
  storeLocation: CONFIG.STORE_LOCATION,
  isOpen: true,
  announcement: '🛒 Form Pemesanan Resmi Kalla Makan • Fast Respon via WhatsApp',
};

export const DEFAULT_PASSWORD = '@Kalla123';

export const EXPENSE_CATEGORIES = {
  ads_ctwa: 'Biaya Iklan CTWA (Meta/TikTok Ads)',
  bahan_baku: 'Bahan Baku Buah & Bumbu',
  alat_packaging: 'Toples, Segel & Packaging',
  operasional: 'Listrik, Es Batu & Dapur',
  lainnya: 'Lain-lain',
};

export const ORDER_STATUSES = {
  pending: { label: '⏳ Menunggu Konfirmasi', class: 'pending', color: '#F59E0B' },
  transferred: { label: '💰 Sudah Transfer', class: 'transferred', color: '#3B82F6' },
  processing: { label: '📦 Sedang Dipersiapkan', class: 'processing', color: '#8B5CF6' },
  shipped: { label: '🛵 Sedang Dikirim', class: 'shipped', color: '#0D9488' },
  completed: { label: '✅ Selesai / Diterima', class: 'completed', color: '#10B981' },
  cancelled: { label: '❌ Dibatalkan', class: 'cancelled', color: '#EF4444' },
};

export const SENDER_INFO = {
  name: 'kallamakan',
  address: 'jl banda sraya gang buntu rumah ke4 sebelum rumah tingkat putih.',
  mapsLink: 'https://maps.app.goo.gl/CF4DohuVoD3c3gRQ6',
  phone: '082227418224',
};
