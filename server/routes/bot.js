const express = require('express');
const router = express.Router();
const botWorker = require('../services/bot-worker');
const dbService = require('../services/db-service');

// GET /api/bot/status - Get bot worker health and status
router.get('/status', (req, res) => {
  try {
    const status = botWorker.getStatus();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/start - Start bot worker
router.post('/start', (req, res) => {
  try {
    botWorker.start();
    res.json({ success: true, message: 'Bot worker started', status: botWorker.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/pause - Pause bot worker
router.post('/pause', (req, res) => {
  try {
    botWorker.pause();
    res.json({ success: true, message: 'Bot worker paused', status: botWorker.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/trigger - Trigger immediate 1-tick execution
router.post('/trigger', async (req, res) => {
  try {
    const result = await botWorker.triggerManualRun(req.body.campaignId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bot/config - Get bot settings
router.get('/config', (req, res) => {
  try {
    const config = dbService.getBotConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bot/config - Update bot settings
router.post('/config', (req, res) => {
  try {
    const updated = dbService.updateBotConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
