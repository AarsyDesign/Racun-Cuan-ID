const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_CAMPAIGNS = [];
const DEFAULT_QUEUE = [];
const DEFAULT_PRODUCTS = [];

const INITIAL_DATA = {
  products: [],
  campaigns: [],
  queue: [],
  history: [],
  logs: [
    {
      id: 'log_init',
      timestamp: new Date().toISOString(),
      level: 'INFO',
      tag: 'SYSTEM',
      message: 'racun cuan.id Super App initialized. Ready for production use.'
    }
  ],
  botConfig: {
    isRunning: true,
    intervalMinutes: 5,
    antiBanMinDelaySeconds: 180, // 3 minutes
    antiBanMaxDelaySeconds: 480, // 8 minutes
    dailyCap: 50,
    dailyCountToday: 0,
    mode: 'API_V5', // API_V5, HYBRID, WEB_SESSION
    imageGenerator: 'ENHANCED_VISUAL' // ENHANCED_VISUAL, AI_IMAGEN, SHOPEE_FRAME
  },
  connections: {
    pinterestStatus: 'STANDBY',
    pinterestUsername: '',
    pinterestAccessToken: '',
    pinterestBoardId: '',
    pinterestApiConnected: false,
    geminiStatus: 'STANDBY',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    sheetsStatus: 'STANDBY',
    sheetsWebhookUrl: '',
    n8nStatus: 'STANDBY',
    n8nWebhookUrl: ''
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
    
    // Ensure all arrays exist
    if (!data.products) data.products = [];
    if (!data.campaigns) data.campaigns = [];
    if (!data.queue) data.queue = [];
    if (!data.history) data.history = [];
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
