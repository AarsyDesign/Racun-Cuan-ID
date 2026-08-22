const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');

// POST /api/n8n/dispatch - Dispatch structured payload to n8n webhook
router.post('/dispatch', async (req, res) => {
  try {
    const { webhookUrl, authToken, payload } = req.body;
    const targetUrl = webhookUrl || process.env.N8N_WEBHOOK_URL;

    if (!targetUrl) {
      return res.status(400).json({ error: 'n8n Webhook URL is required' });
    }
    if (!payload) {
      return res.status(400).json({ error: 'Payload data is required' });
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = authToken || process.env.N8N_AUTH_TOKEN;
    if (token) {
      headers['Authorization'] = token;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        source: 'Affiliator Killer Backend',
        dispatchedAt: new Date().toISOString(),
        ...payload
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `n8n webhook error: ${errText}` });
    }

    // Save history
    if (payload.product) {
      dbService.addHistoryRecord({
        title: payload.product.title,
        pinTitle: payload.aiContent?.pinTitle || payload.product.title,
        affiliateUrl: payload.product.affiliateUrl,
        imageUrl: payload.product.imageUrl,
        status: 'Sent to n8n',
        platform: 'n8n'
      });
    }

    res.json({ success: true, message: 'Payload dispatched to n8n successfully' });
  } catch (err) {
    console.error('[Route n8n] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/n8n/test - Test webhook
router.post('/test', async (req, res) => {
  try {
    const { webhookUrl, authToken } = req.body;
    const targetUrl = webhookUrl || process.env.N8N_WEBHOOK_URL;
    if (!targetUrl) return res.status(400).json({ error: 'n8n Webhook URL is required' });

    const headers = { 'Content-Type': 'application/json' };
    const token = authToken || process.env.N8N_AUTH_TOKEN;
    if (token) headers['Authorization'] = token;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ event: 'test_connection', message: 'Hello from Affiliator Killer Backend' })
    });

    res.json({ success: true, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
