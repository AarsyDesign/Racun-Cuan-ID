const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed campaigns mirroring Pinlume Studio reference
const DEFAULT_CAMPAIGNS = [
  {
    id: 'camp_outfit_01',
    name: 'Outfit Feeds Modest Daily',
    status: 'ACTIVE',
    approvalMode: 'AUTO',
    automationType: 'TARGET',
    goalCurrent: 11,
    goalTarget: 75,
    windowStart: '00:00',
    windowEnd: '23:59',
    windowLabel: 'Until done',
    targetBoard: 'Modest Fashion & OOTD',
    subjects: 'contemporary islamic fashion model in clean eye-level portrait, modern modest fashion influencer styling soft silk pashmina',
    objectOutfit: 'eye-level medium shot and warm studio rim lighting, variation of breathable modal silk pashmina in warm sage with minimalist gold magnetic pin',
    locations: 'bright daylight editorial photo studio with soft morning shadows, minimalist beige marble gallery space with lofty ceilings',
    vibes: 'premium editorial photography with natural soft shadows, sleek clean neutral backdrop',
    affiliateSubId: 'pin_modest_ootd',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastRunAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'camp_baju_02',
    name: 'Baju Muslimah Modern 2026',
    status: 'PAUSED',
    approvalMode: 'AUTO',
    automationType: 'DAILY',
    goalCurrent: 2,
    goalTarget: 5,
    windowStart: '23:00',
    windowEnd: '23:59',
    windowLabel: '23:00-23:59',
    targetBoard: 'Gamis & Dress Elegan',
    subjects: 'elegant asian female model standing gracefully in modern flowy abaya dress',
    objectOutfit: 'flowy linen abaya with intricate embroidery details on sleeve cuffs, matching textured shawl',
    locations: 'modern architectural terrace with tropical plants and soft evening sunlight',
    vibes: 'warm aesthetic editorial vibe, cinematic depth of field, high-end lookbook',
    affiliateSubId: 'pin_baju_muslimah',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastRunAt: null
  },
  {
    id: 'camp_pria_03',
    name: 'Pria Muslim Style Lookbook',
    status: 'PAUSED',
    approvalMode: 'AUTO',
    automationType: 'DAILY',
    goalCurrent: 0,
    goalTarget: 3,
    windowStart: '23:00',
    windowEnd: '00:00',
    windowLabel: '23:00-00:00',
    targetBoard: 'Men Fashion & Koko Modern',
    subjects: 'handsome young man in modern minimalist koko shirt, casual yet neat posture',
    objectOutfit: 'mandarin collar cotton koko shirt in earthy olive tone with slim fit chino pants',
    locations: 'urban coffee shop with wooden interior and natural window lighting',
    vibes: 'clean masculine lifestyle photography, crisp textures, sharp focus',
    affiliateSubId: 'pin_pria_muslim',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastRunAt: null
  },
  {
    id: 'camp_jubah_04',
    name: 'Jubah & Gamis Pria Premium',
    status: 'PAUSED',
    approvalMode: 'AUTO',
    automationType: 'DAILY',
    goalCurrent: 8,
    goalTarget: 20,
    windowStart: '22:00',
    windowEnd: '03:12',
    windowLabel: '22:00-03:12',
    targetBoard: 'Jubah Pria Haramain',
    subjects: 'stylish middle eastern & southeast asian model in tailored luxury thobe',
    objectOutfit: 'crisp white luxury saudi thobe with subtle glossy stitching on collar',
    locations: 'grand marble mosque courtyard with gentle ambient morning light',
    vibes: 'regal, clean, high-fashion modesty, pristine clarity',
    affiliateSubId: 'pin_jubah_pria',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastRunAt: null
  },
  {
    id: 'camp_pria_jas_05',
    name: 'Pria Berjas & Formal Inspo',
    status: 'PAUSED',
    approvalMode: 'AUTO',
    automationType: 'DAILY',
    goalCurrent: 3,
    goalTarget: 10,
    windowStart: '22:57',
    windowEnd: '00:00',
    windowLabel: '22:57-00:00',
    targetBoard: 'Gentleman Formal Wear',
    subjects: 'charismatic male professional in tailored navy suit walking confidently',
    objectOutfit: 'slim-fit charcoal blazer, crisp white dress shirt, minimalist leather watch',
    locations: 'modern skyscraper lobby with glass architecture and dramatic lighting',
    vibes: 'high-end executive luxury, sleek reflection, sharp contrast',
    affiliateSubId: 'pin_pria_jas',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastRunAt: null
  },
  {
    id: 'camp_hijab_06',
    name: 'Hijab Autumn Aesthetic Palette',
    status: 'PAUSED',
    approvalMode: 'AUTO',
    automationType: 'DAILY',
    goalCurrent: 1,
    goalTarget: 4,
    windowStart: '21:00',
    windowEnd: '23:00',
    windowLabel: '21:00-23:00',
    targetBoard: 'Hijab Aesthetic Moodboard',
    subjects: 'warm smile female hijab influencer holding a ceramic latte cup',
    objectOutfit: 'chunky knitted beige cardigan paired with burnt orange pleated skirt and chiffon hijab',
    locations: 'cozy bookstore corner surrounded by warm timber shelves',
    vibes: 'autumn warmth, soft grain, golden hour tones',
    affiliateSubId: 'pin_hijab_autumn',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastRunAt: null
  },
  {
    id: 'camp_hijab_pin_07',
    name: 'Hijab Pins & Silk Styling',
    status: 'PAUSED',
    approvalMode: 'MANUAL',
    automationType: 'DAILY',
    goalCurrent: 0,
    goalTarget: 1,
    windowStart: '18:00',
    windowEnd: '20:00',
    windowLabel: '18:00-20:00',
    targetBoard: 'Hijab Accessories & Tutorial',
    subjects: 'close up aesthetic tutorial model demonstrating magnetic pin placement',
    objectOutfit: 'lustrous mulberry silk scarf in pearl white, paired with brushed brass magnetic hijab pins',
    locations: 'vanity mirror station with soft diffused beauty ring lighting',
    vibes: 'macro luxury product detail, creamy bokeh, ultra sharp texture',
    affiliateSubId: 'pin_hijab_pins',
    createdAt: new Date().toISOString(),
    lastRunAt: null
  }
];

// Initial default queue items
const DEFAULT_QUEUE = [
  {
    id: 'q_item_001',
    campaignId: 'camp_outfit_01',
    campaignName: 'Outfit Feeds Modest Daily',
    status: 'PENDING_APPROVAL',
    title: 'Pashmina Silk Premium Sage Green Lembut & Mewah',
    description: 'Rekomendasi pashmina silk premium dengan material adem, mudah dibentuk, dan kilau mewah natural. Cocok untuk daily outfit maupun pesta formal.\n\n• Bahan: Mulberry Silk Premium\n• Warna: Sage Green, Mocca, Pearl\n• Rating: 4.9/5.0 (5RB+ Terjual)\n• Cek promo diskon hari ini lewat link produk di pin.',
    hashtags: ['#PashminaSilk', '#HijabOOTD', '#RacunShopee', '#OutfitHijab', '#ShopeeHaul'],
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    targetBoard: 'Modest Fashion & OOTD',
    affiliateUrl: 'https://s.shopee.co.id/aff_preview_01',
    subId: 'pin_modest_ootd',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    scheduledFor: new Date(Date.now() + 600000).toISOString()
  },
  {
    id: 'q_item_002',
    campaignId: 'camp_baju_02',
    campaignName: 'Baju Muslimah Modern 2026',
    status: 'QUEUED',
    title: 'Abaya Linen Flowy Bordir Elegan - Gamis Kekinian',
    description: 'Dress abaya muslimah potongan A-line dengan aksen bordir minimalis di bagian lengan. Bahan linen airflow jatuh, tidak menerawang, dan sangat nyaman dipakai seharian.\n\n• Harga Promo: Rp 145.000\n• Stok Terbatas & Diskon 35%\n• Klik link produk untuk pilihan warna & size chart.',
    hashtags: ['#AbayaModern', '#GamisElegan', '#BajuMuslimah', '#RacunShopeeAffiliate'],
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    targetBoard: 'Gamis & Dress Elegan',
    affiliateUrl: 'https://s.shopee.co.id/aff_preview_02',
    subId: 'pin_baju_muslimah',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    scheduledFor: new Date(Date.now() + 1800000).toISOString()
  },
  {
    id: 'q_item_003',
    campaignId: 'camp_jubah_04',
    campaignName: 'Jubah & Gamis Pria Premium',
    status: 'QUEUED',
    title: 'Gamis Jubah Pria Saudi Haramain Bahan Katun Spun Poly',
    description: 'Jubah pria model Saudi kerah shanghai dengan jahitan rapi dan bahan tidak mudah kusut. Pilihan utama untuk ibadah harian, tarawih, dan acara formal keluarga.\n\n• Warna: Putih Bersih, Navy, Hitam, Abu Semen\n• Pengiriman Cepat & Garansi Original\n• Buka link untuk diskon voucher toko.',
    hashtags: ['#JubahPria', '#GamisPria', '#KokoSaudi', '#PriaMuslim'],
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=80',
    targetBoard: 'Jubah Pria Haramain',
    affiliateUrl: 'https://s.shopee.co.id/aff_preview_03',
    subId: 'pin_jubah_pria',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    scheduledFor: new Date(Date.now() + 3600000).toISOString()
  }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod_aff_001',
    itemId: '2283940192',
    shopId: '78291038',
    title: 'Qeela.Official - Celana Sweatpants Loose Pria Celana Panjang Casual Daily',
    originalPrice: 75000,
    discountedPrice: 34500,
    discount: 'Flash Sale (54% OFF)',
    commissionRate: '34.5%',
    commissionPercent: 34.5,
    estimatedCommissionRp: 11902,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.7,
    soldCount: '10RB+ Terjual',
    shopName: 'Qeela.Official',
    shopLocation: 'Kab. Pekalongan',
    shopType: 'Star',
    imageUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80'
    ],
    productUrl: 'https://shopee.co.id/product/78291038/2283940192',
    affiliateUrl: 'https://s.shopee.co.id/aff_qeela_sweatpants?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Celana Sweatpants Loose Pria Casual Daily Bahan Adem Tebal',
      pinDescription: 'Celana sweatpants cutting loose casual dari Qeela.Official. Bahan fleece tebal lembut, pinggang karet elastis bertali, cocok untuk daily wear atau hangout.\n\n• Flash Sale: Rp 34.500 (Diskon 54%)\n• Rating: 4.7 dari 10RB+ Terjual\n• Klik link produk untuk cek ukuran M-XXXL.',
      hashtags: ['#SweatpantsPria', '#CelanaCasual', '#OOTDPria', '#RacunShopee', '#ShopeeHaul']
    }
  },
  {
    id: 'prod_aff_002',
    itemId: '2847291048',
    shopId: '98410294',
    title: 'MYKONOS ALL VARIAN DECANT | 3ml 5ml 10ml ORIGINAL SHARE IN JAR Parfum Tahan Lama',
    originalPrice: 35000,
    discountedPrice: 22900,
    discount: '34.5% Komisi XTRA',
    commissionRate: '34.5%',
    commissionPercent: 34.5,
    estimatedCommissionRp: 7900,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.9,
    soldCount: '5RB+ Terjual',
    shopName: 'Mykonos Official Decant',
    shopLocation: 'Jakarta Barat',
    shopType: 'Star',
    imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80'
    ],
    productUrl: 'https://shopee.co.id/product/98410294/2847291048',
    affiliateUrl: 'https://s.shopee.co.id/aff_mykonos_001?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Decant Parfum Mykonos Original Share in Jar 3ml 5ml 10ml',
      pinDescription: 'Solusi coba varian parfum Mykonos sebelum beli full size. Botol kaca spray steril dengan seal anti bocor.\n\n• Harga mulai: Rp 22.900\n• Komisi: 34.5% (Komisi XTRA)\n• Rating: 4.9 dari 5.000+ pembeli\n• Cek list aroma lengkap di link produk.',
      hashtags: ['#ParfumMykonos', '#DecantParfum', '#RacunShopee', '#ParfumLokal', '#ShopeeHaul']
    }
  },
  {
    id: 'prod_aff_003',
    itemId: '1948201948',
    shopId: '47201948',
    title: 'Rambut Kering Elastin Curl Cream Melembabkan Tidak Lepek Vitamin Styling',
    originalPrice: 130000,
    discountedPrice: 78000,
    discount: '41.5% Komisi XTRA',
    commissionRate: '41.5%',
    commissionPercent: 41.5,
    estimatedCommissionRp: 32370,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.9,
    soldCount: '4.2RB+ Terjual',
    shopName: 'Beauty Hair Official',
    shopLocation: 'Kota Surabaya',
    shopType: 'Star',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80'
    ],
    productUrl: 'https://shopee.co.id/product/47201948/1948201948',
    affiliateUrl: 'https://s.shopee.co.id/aff_curlycream_002?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Elastin Curl Cream Rambut Keriting & Gelombang Anti-Lepek',
      pinDescription: 'Krim penata rambut ikal dan bergelombang. Menutrisi batang rambut, menjaga elastisitas ikal seharian tanpa rasa kaku.\n\n• Harga Promo: Rp 78.000 (Diskon 40%)\n• Komisi Tinggi: 41.5% Komisi XTRA\n• Rating: 4.9/5.0\n• Kunjungi tautan produk untuk promo toko.',
      hashtags: ['#CurlHairCare', '#PerawatanRambut', '#RambutIkal', '#StylingCream', '#RacunShopee']
    }
  }
];

// Initial DB structure
const INITIAL_DATA = {
  products: DEFAULT_PRODUCTS,
  campaigns: DEFAULT_CAMPAIGNS,
  queue: DEFAULT_QUEUE,
  history: [
    {
      id: 'hist_seed_01',
      campaignName: 'Outfit Feeds Modest Daily',
      title: 'Pashmina Plisket Ceruty Babydoll Premium',
      board: 'Modest Fashion & OOTD',
      affiliateUrl: 'https://s.shopee.co.id/aff_demo_01',
      pinterestPinUrl: 'https://www.pinterest.com/pin/1029384756',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 4500000).toISOString(),
      durationMs: 4200
    },
    {
      id: 'hist_seed_02',
      campaignName: 'Minimalist Bedroom Decor',
      title: 'Lampu Meja Kamar Tidur Minimalis Nordic Warm Light',
      board: 'Minimalist Home Decor',
      affiliateUrl: 'https://s.shopee.co.id/aff_demo_02',
      pinterestPinUrl: 'https://www.pinterest.com/pin/2039485761',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 9200000).toISOString(),
      durationMs: 3800
    }
  ],
  logs: [
    {
      id: 'log_01',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'INFO',
      tag: 'SYSTEM',
      message: 'Pinlume Studio Bot Engine initialized. All systems operational.'
    },
    {
      id: 'log_02',
      timestamp: new Date(Date.now() - 95000).toISOString(),
      level: 'INFO',
      tag: 'CONNECTION',
      message: 'Pinterest Web session verified. Status: LIVE (Connected).'
    },
    {
      id: 'log_03',
      timestamp: new Date(Date.now() - 45000).toISOString(),
      level: 'SUCCESS',
      tag: 'GEMINI',
      message: 'Gemini 2.5 Flash ready for Prompt Matrix generation.'
    }
  ],
  botConfig: {
    isRunning: true,
    intervalMinutes: 5,
    antiBanMinDelaySeconds: 180, // 3 minutes
    antiBanMaxDelaySeconds: 480, // 8 minutes
    dailyCap: 50,
    dailyCountToday: 12,
    mode: 'HYBRID', // HYBRID, WEB_SESSION, API_V5, WEB_INTENT
    imageGenerator: 'ENHANCED_VISUAL' // ENHANCED_VISUAL, AI_IMAGEN, SHOPEE_FRAME
  },
  connections: {
    pinterestStatus: 'CONNECTED',
    pinterestUsername: 'Pinterest Web Live',
    pinterestApiConnected: true,
    geminiStatus: 'CONNECTED',
    geminiModel: 'gemini-2.5-flash',
    sheetsStatus: 'READY',
    n8nStatus: 'CONNECTED'
  },
  settings: {},
  lastUpdated: new Date().toISOString()
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2));
      return { ...INITIAL_DATA };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    
    // Ensure all properties exist in case of schema migration
    if (!data.campaigns) data.campaigns = DEFAULT_CAMPAIGNS;
    if (!data.queue) data.queue = DEFAULT_QUEUE;
    if (!data.logs) data.logs = INITIAL_DATA.logs;
    if (!data.botConfig) data.botConfig = INITIAL_DATA.botConfig;
    if (!data.connections) data.connections = INITIAL_DATA.connections;

    return data;
  } catch (err) {
    console.error('[DB] Read error:', err);
    return { ...INITIAL_DATA };
  }
}

function writeDb(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('[DB] Write error:', err);
    return false;
  }
}

module.exports = {
  getDb: readDb,
  saveDb: writeDb,

  // Products
  getProducts() {
    return readDb().products || [];
  },

  saveProducts(newProducts) {
    const db = readDb();
    const existing = db.products || [];
    const seen = new Set(existing.map(p => p.itemId || p.title));

    newProducts.forEach(np => {
      const key = np.itemId || np.title;
      if (!seen.has(key)) {
        existing.unshift(np);
        seen.add(key);
      }
    });

    db.products = existing.slice(0, 500);
    writeDb(db);
    return db.products;
  },

  deleteProduct(productId) {
    const db = readDb();
    db.products = (db.products || []).filter(p => p.id !== productId && p.itemId !== productId);
    writeDb(db);
    return db.products;
  },

  clearProducts() {
    const db = readDb();
    db.products = [];
    writeDb(db);
    return [];
  },

  // Campaigns
  getCampaigns() {
    return readDb().campaigns || [];
  },

  getCampaignById(id) {
    const campaigns = readDb().campaigns || [];
    return campaigns.find(c => c.id === id);
  },

  saveCampaign(campaign) {
    const db = readDb();
    if (!db.campaigns) db.campaigns = [];
    const index = db.campaigns.findIndex(c => c.id === campaign.id);
    if (index >= 0) {
      db.campaigns[index] = { ...db.campaigns[index], ...campaign, updatedAt: new Date().toISOString() };
    } else {
      const newCamp = {
        id: campaign.id || `camp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        status: campaign.status || 'ACTIVE',
        goalCurrent: campaign.goalCurrent || 0,
        createdAt: new Date().toISOString(),
        ...campaign
      };
      db.campaigns.unshift(newCamp);
    }
    writeDb(db);
    return db.campaigns;
  },

  deleteCampaign(id) {
    const db = readDb();
    db.campaigns = (db.campaigns || []).filter(c => c.id !== id);
    writeDb(db);
    return db.campaigns;
  },

  toggleCampaignStatus(id) {
    const db = readDb();
    const campaign = (db.campaigns || []).find(c => c.id === id);
    if (campaign) {
      campaign.status = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      writeDb(db);
    }
    return campaign;
  },

  // Queue
  getQueue() {
    return readDb().queue || [];
  },

  addToQueue(item) {
    const db = readDb();
    if (!db.queue) db.queue = [];
    const newItem = {
      id: item.id || `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: item.status || 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      ...item
    };
    db.queue.unshift(newItem);
    writeDb(db);
    return newItem;
  },

  updateQueueItem(id, updates) {
    const db = readDb();
    const item = (db.queue || []).find(q => q.id === id);
    if (item) {
      Object.assign(item, updates);
      writeDb(db);
    }
    return item;
  },

  removeFromQueue(id) {
    const db = readDb();
    db.queue = (db.queue || []).filter(q => q.id !== id);
    writeDb(db);
    return db.queue;
  },

  clearQueue() {
    const db = readDb();
    db.queue = [];
    writeDb(db);
    return [];
  },

  // History & Anti-Duplicate
  getHistory() {
    return readDb().history || [];
  },

  addHistoryRecord(record) {
    const db = readDb();
    const history = db.history || [];
    const newRecord = {
      id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...record
    };
    history.unshift(newRecord);
    db.history = history.slice(0, 500);
    writeDb(db);
    return newRecord;
  },

  clearHistory() {
    const db = readDb();
    db.history = [];
    writeDb(db);
    return [];
  },

  checkDuplicate(itemId, cleanUrl) {
    const db = readDb();
    const history = db.history || [];
    return history.some(h => (itemId && h.itemId === itemId) || (cleanUrl && h.productUrl === cleanUrl));
  },

  // Activity Logs
  getLogs(limit = 100) {
    const db = readDb();
    return (db.logs || []).slice(0, limit);
  },

  addLog(level, tag, message) {
    const db = readDb();
    if (!db.logs) db.logs = [];
    const logItem = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level: level || 'INFO',
      tag: tag || 'WORKER',
      message: message || ''
    };
    db.logs.unshift(logItem);
    db.logs = db.logs.slice(0, 300); // keep last 300 logs
    writeDb(db);
    return logItem;
  },

  clearLogs() {
    const db = readDb();
    db.logs = [];
    writeDb(db);
    return [];
  },

  // Bot Config & Connections
  getBotConfig() {
    return readDb().botConfig || INITIAL_DATA.botConfig;
  },

  updateBotConfig(config) {
    const db = readDb();
    db.botConfig = { ...db.botConfig, ...config };
    writeDb(db);
    return db.botConfig;
  },

  getConnections() {
    return readDb().connections || INITIAL_DATA.connections;
  },

  updateConnections(connections) {
    const db = readDb();
    db.connections = { ...db.connections, ...connections };
    writeDb(db);
    return db.connections;
  }
};
