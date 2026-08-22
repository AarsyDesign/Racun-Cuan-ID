const express = require('express');
const router = express.Router();

// POST /api/affiliate/convert - Convert clean Shopee URL with Sub-ID
router.post('/convert', (req, res) => {
  try {
    const { url, subId } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const targetSubId = subId || process.env.DEFAULT_AFFILIATE_SUB_ID || 'pinterest_pins';
    const cleanUrl = url.split('?')[0];
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const affiliateUrl = `${cleanUrl}${separator}sub_id=${encodeURIComponent(targetSubId)}`;

    res.json({
      success: true,
      originalUrl: url,
      cleanUrl: cleanUrl,
      subId: targetSubId,
      affiliateUrl: affiliateUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
