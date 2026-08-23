const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// GET /api/products - Get all scraped products
router.get('/', (req, res) => {
  const products = dbService.getProducts();
  res.json({ success: true, count: products.length, data: products });
});

// POST /api/products - Save new scraped products
router.post('/', (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Array of products is required' });
    }
    const saved = dbService.saveProducts(products);
    res.json({ success: true, count: saved.length, data: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id - Update product details (e.g. affiliateUrl)
router.put('/:id', (req, res) => {
  try {
    const products = dbService.getProducts();
    const idx = products.findIndex(p => p.id === req.params.id || p.itemId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }
    products[idx] = { ...products[idx], ...req.body };
    dbService.saveProducts(products);
    res.json({ success: true, product: products[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products/:id/enqueue-matrix - Transfer product directly into Matrix Queue
router.post('/:id/enqueue-matrix', (req, res) => {
  try {
    const products = dbService.getProducts();
    const prod = products.find(p => p.id === req.params.id || p.itemId === req.params.id);
    if (!prod) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }

    const { targetBoard, customTitle, customDescription, autoApprove } = req.body;
    const connections = dbService.getConnections();

    const queueItem = dbService.addToQueue({
      campaignName: 'Shopee Scraped Products',
      title: customTitle || prod.aiContent?.pinTitle || prod.title,
      description: customDescription || prod.aiContent?.pinDescription || `Rekomendasi Produk: ${prod.title}\n\nHarga Diskon: Rp ${(prod.discountedPrice || 0).toLocaleString('id-ID')}\nRating: ${prod.rating || '4.9'} (${prod.soldCount || 'Terjual'})\nCek promo di tautan produk.`,
      hashtags: prod.aiContent?.hashtags || ['#ShopeeHaul', '#RacunShopee', '#RekomendasiShopee', '#ShopeeAffiliate'],
      imageUrl: prod.imageUrl || prod.galleryImages?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      affiliateUrl: prod.affiliateUrl || prod.productUrl || 'https://shopee.co.id',
      targetBoard: targetBoard || connections.pinterestBoardName || 'Inspirasi & Rekomendasi Shopee',
      boardId: connections.pinterestBoardId || null,
      status: autoApprove ? 'QUEUED' : 'PENDING_APPROVAL',
      source: 'SHOPEE_SCRAPER'
    });

    const queueService = require('../services/queue-service');
    queueService.recalculateSchedules();

    dbService.addLog('SUCCESS', 'QUEUE', `📥 Produk Shopee "${prod.title.substring(0, 35)}..." dimasukkan ke Antrean Matrix.`);

    res.json({ success: true, queueItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const telegramPublisher = require('../services/telegram-publisher');

// POST /api/products/:id/publish-telegram - Direct broadcast product to Telegram Channel
router.post('/:id/publish-telegram', async (req, res) => {
  try {
    const products = dbService.getProducts();
    const prod = products.find(p => p.id === req.params.id || p.itemId === req.params.id);
    if (!prod) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }

    const { chatId, customCaption } = req.body;
    const result = await telegramPublisher.publishProduct(prod, { chatId, customCaption });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/products/:id - Delete single product
router.delete('/:id', (req, res) => {
  const updated = dbService.deleteProduct(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/products - Clear all products
router.delete('/', (req, res) => {
  const updated = dbService.clearProducts();
  res.json({ success: true, message: 'All products cleared', data: updated });
});

// GET /api/products/history - Get posting history
router.get('/history', (req, res) => {
  const history = dbService.getHistory();
  res.json({ success: true, count: history.length, data: history });
});

// POST /api/products/history - Add posting record
router.post('/history', (req, res) => {
  try {
    const record = dbService.addHistoryRecord(req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/history - Clear history
router.delete('/history', (req, res) => {
  const cleared = dbService.clearHistory();
  res.json({ success: true, message: 'History cleared', data: cleared });
});

// GET /api/products/check-duplicate?itemId=...&url=...
router.get('/check-duplicate', (req, res) => {
  const { itemId, url } = req.query;
  const isDuplicate = dbService.checkDuplicate(itemId, url);
  res.json({ isDuplicate });
});

module.exports = router;
