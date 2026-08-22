const express = require('express');
const router = express.Router();
const campaignService = require('../services/campaign-service');

// GET /api/campaigns - List all campaigns
router.get('/', (req, res) => {
  try {
    const campaigns = campaignService.getCampaigns();
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', (req, res) => {
  try {
    const campaign = campaignService.getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/campaigns - Create or update campaign
router.post('/', (req, res) => {
  try {
    const saved = campaignService.createOrUpdateCampaign(req.body);
    res.json({ success: true, campaign: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', (req, res) => {
  try {
    const saved = campaignService.createOrUpdateCampaign({ ...req.body, id: req.params.id });
    res.json({ success: true, campaign: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/campaigns/:id/toggle - Toggle status (ACTIVE/PAUSED)
router.post('/:id/toggle', (req, res) => {
  try {
    const campaign = campaignService.toggleStatus(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', (req, res) => {
  try {
    const campaigns = campaignService.deleteCampaign(req.params.id);
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/campaigns/:id/enqueue - Enqueue pins from campaign
router.post('/:id/enqueue', async (req, res) => {
  try {
    const count = Number(req.body.count) || 1;
    const items = await campaignService.enqueueCampaign(req.params.id, count, req.body);
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/campaigns/enqueue-selected - Enqueue multiple selected campaigns
router.post('/enqueue-selected', async (req, res) => {
  try {
    const { campaignIds, countPerCampaign = 1 } = req.body;
    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No campaign IDs provided' });
    }

    let allItems = [];
    for (const id of campaignIds) {
      const items = await campaignService.enqueueCampaign(id, countPerCampaign);
      allItems = allItems.concat(items);
    }

    res.json({ success: true, totalEnqueued: allItems.length, items: allItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
