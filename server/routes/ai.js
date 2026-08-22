const express = require('express');
const router = express.Router();
const aiService = require('../services/ai-service');

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { product, tone, provider, config } = req.body;
    if (!product) {
      return res.status(400).json({ error: 'Product data is required' });
    }

    const aiConfig = config || {
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      customBaseUrl: process.env.CUSTOM_AI_BASE_URL,
      customApiKey: process.env.CUSTOM_AI_API_KEY,
      customModelName: process.env.CUSTOM_AI_MODEL
    };

    const result = await aiService.generateCopy({
      product,
      tone: tone || 'aesthetic',
      provider: provider || 'gemini',
      config: aiConfig
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Route AI] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/batch-generate
router.post('/batch-generate', async (req, res) => {
  try {
    const { products, tone, provider, config } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Array of products is required' });
    }

    const aiConfig = config || {
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      customBaseUrl: process.env.CUSTOM_AI_BASE_URL,
      customApiKey: process.env.CUSTOM_AI_API_KEY,
      customModelName: process.env.CUSTOM_AI_MODEL
    };

    const results = [];
    for (const product of products) {
      const generated = await aiService.generateCopy({
        product,
        tone: tone || 'aesthetic',
        provider: provider || 'gemini',
        config: aiConfig
      });
      results.push({ id: product.id, itemId: product.itemId, aiContent: generated });
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error('[Route AI Batch] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
