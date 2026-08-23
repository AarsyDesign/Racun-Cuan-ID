const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// GET /api/history - Get all publishing history (Pinterest + Telegram)
router.get('/', (req, res) => {
  try {
    const platform = req.query.platform; // 'all', 'TELEGRAM', 'PINTEREST'
    let history = dbService.getHistory();

    if (platform && platform !== 'all') {
      history = history.filter(h => (h.platform || '').toUpperCase() === platform.toUpperCase());
    }

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/history - Clear all history records
router.delete('/', (req, res) => {
  try {
    const cleared = dbService.clearHistory();
    dbService.addLog('INFO', 'HISTORY', '🗑️ Riwayat publikasi berhasil dibersihkan.');
    res.json({ success: true, message: 'Riwayat berhasil dibersihkan', history: cleared });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
