const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// POST /api/teable/sync - Sync product record to Teable Table
router.post('/sync', async (req, res) => {
  try {
    const { serverUrl, apiToken, tableId, product } = req.body;
    const targetUrl = (serverUrl || process.env.TEABLE_SERVER_URL || 'https://app.teable.io').replace(/\/$/, '');
    const token = apiToken || process.env.TEABLE_API_TOKEN;
    const tblId = tableId || process.env.TEABLE_TABLE_ID;

    if (!token || !tblId) {
      return res.status(400).json({ error: 'Teable API Token and Table ID are required' });
    }
    if (!product) {
      return res.status(400).json({ error: 'Product data is required' });
    }

    const endpoint = `${targetUrl}/api/table/${tblId}/record`;

    const teableFields = {
      'Product Name': product.title || '',
      'Original Price': product.originalPrice || 0,
      'Discount Price': product.discountedPrice || product.price || 0,
      'Discount': product.discount || '',
      'Affiliate Link': product.affiliateUrl || product.productUrl || '',
      'Image URL': product.imageUrl || '',
      'AI Pin Title': product.aiContent?.pinTitle || '',
      'AI Description': product.aiContent?.pinDescription || '',
      'Rating': product.rating || 4.9,
      'Status': 'Scraped'
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ records: [{ fields: teableFields }] })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Teable API error: ${errText}` });
    }

    const data = await response.json();

    // Add to history
    dbService.addHistoryRecord({
      title: product.title,
      pinTitle: product.aiContent?.pinTitle || product.title,
      affiliateUrl: product.affiliateUrl,
      imageUrl: product.imageUrl,
      status: 'Saved to Teable',
      platform: 'Teable'
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Route Teable] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teable/test - Test connection
router.post('/test', async (req, res) => {
  try {
    const { serverUrl, apiToken, tableId } = req.body;
    const targetUrl = (serverUrl || process.env.TEABLE_SERVER_URL || 'https://app.teable.io').replace(/\/$/, '');
    const token = apiToken || process.env.TEABLE_API_TOKEN;
    const tblId = tableId || process.env.TEABLE_TABLE_ID;

    if (!token || !tblId) return res.status(400).json({ error: 'Token and Table ID required' });

    const endpoint = `${targetUrl}/api/table/${tblId}/record?take=1`;
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      res.json({ success: true, message: 'Teable connection success' });
    } else {
      const errText = await response.text();
      res.status(response.status).json({ error: `Teable connection failed: ${errText}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
