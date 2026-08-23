require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const botWorker = require('./services/bot-worker');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.originalUrl.includes('/api/logs') && !req.originalUrl.includes('/api/bot/status')) {
      console.log(`[${new Date().toLocaleTimeString('id-ID')}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '..')));

// Mount Studio API Routes
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/bot', require('./routes/bot'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/pinterest', require('./routes/pinterest'));
app.use('/api/telegram', require('./routes/telegram'));

// Mount Core Scraper & Integration Routes
app.use('/api/ai', require('./routes/ai'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sheets', require('./routes/sheets'));
app.use('/api/affiliate', require('./routes/affiliate'));
app.use('/api/n8n', require('./routes/n8n'));
app.use('/api/teable', require('./routes/teable'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'racun cuan.id - Super App Khusus Pinterest & Telegram Affiliate Automation',
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    bot: botWorker.getStatus(),
    telegram: {
      bot: '@linkaffiliatorbot',
      status: 'OPERATIONAL'
    }
  });
});

// Root route redirect to Racun Cuan.id Studio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Privacy Policy page for Pinterest Developer verification
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'privacy.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
=====================================================
✨ RACUN CUAN.ID - PINTEREST & TELEGRAM SUPER APP
=====================================================
🌐 Super App Hub    : http://localhost:${PORT}
🩺 Health Check     : http://localhost:${PORT}/api/health
📌 Pinterest API v5 : Active
📢 Telegram Bot     : @linkaffiliatorbot (Active)
🚀 Bot Engine       : Active & Operational
=====================================================
  `);

  // Initialize bot scheduler background worker
  botWorker.init();
});
