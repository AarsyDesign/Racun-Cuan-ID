const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// GET /api/stats - High level overview KPI metrics
router.get('/', (req, res) => {
  try {
    const products = dbService.getProducts();
    const campaigns = dbService.getCampaigns();
    const queue = dbService.getQueue();
    const history = dbService.getHistory();
    const botConfig = dbService.getBotConfig();

    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    const todayStr = new Date().toISOString().split('T')[0];
    const historyToday = history.filter(h => (h.publishedAt || '').startsWith(todayStr));

    const stats = {
      totalProductsScanned: products.length,
      totalPinsGenerated: history.length + queue.length,
      publishedToday: historyToday.length,
      dailyCap: botConfig.dailyCap || 50,
      queueTotal: queue.length,
      queuePending: queue.filter(q => q.status === 'PENDING_APPROVAL').length,
      queueReady: queue.filter(q => q.status === 'QUEUED').length,
      activeCampaignsCount: activeCampaigns.length,
      totalCampaignsCount: campaigns.length,
      botRunning: !!botConfig.isRunning,
      botIntervalMinutes: botConfig.intervalMinutes || 35,
      systemHealth: 'OPERATIONAL'
    };

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
