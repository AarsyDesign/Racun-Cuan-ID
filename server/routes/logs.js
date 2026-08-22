const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// GET /api/logs - List recent activity logs
router.get('/', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = dbService.getLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/logs - Add a custom log entry
router.post('/', (req, res) => {
  try {
    const { level, tag, message } = req.body;
    const log = dbService.addLog(level, tag, message);
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/logs - Clear logs
router.delete('/', (req, res) => {
  try {
    const logs = dbService.clearLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
