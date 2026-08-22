const express = require('express');
const router = express.Router();
const queueService = require('../services/queue-service');
const pinterestPublisher = require('../services/pinterest-publisher');

// GET /api/queue - List queue items (optional ?status=PENDING_APPROVAL)
router.get('/', (req, res) => {
  try {
    const status = req.query.status || null;
    const queue = queueService.getQueue(status);
    res.json({ success: true, count: queue.length, queue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/queue/:id - Get single queue item
router.get('/:id', (req, res) => {
  try {
    const item = queueService.getQueueItemById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue - Add manual item
router.post('/', (req, res) => {
  try {
    const item = queueService.addItem(req.body);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/queue/:id - Update item (edit copy, tags, image, board)
router.put('/:id', (req, res) => {
  try {
    const updated = queueService.updateItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/queue/:id - Remove item
router.delete('/:id', (req, res) => {
  try {
    const queue = queueService.removeItem(req.params.id);
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/:id/approve - Approve single item
router.post('/:id/approve', async (req, res) => {
  try {
    const autoDispatch = req.body.autoDispatch === true;
    const result = await queueService.approveItem(req.params.id, autoDispatch);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/batch-approve - Approve all or selected items
router.post('/batch-approve', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    const result = await queueService.batchApprove(ids);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/queue/:id/dispatch - Dispatch item to Pinterest immediately
router.post('/:id/dispatch', async (req, res) => {
  try {
    const result = await queueService.dispatchItem(req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/queue/export/csv - Export queue items as Pinterest CSV
router.get('/export/csv', (req, res) => {
  try {
    const queue = queueService.getQueue();
    const csvContent = pinterestPublisher.generateBulkCsv(queue);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pinlume_pinterest_queue.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
