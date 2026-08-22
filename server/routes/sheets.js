const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sheetsService = require('../services/sheets-service');
const excelService = require('../services/excel-service');
const dbService = require('../services/db-service');

// POST /api/sheets/append - Save to local Excel/CSV spreadsheet & optional Google Sheets Webhook
router.post('/append', async (req, res) => {
  try {
    const { webhookUrl, product } = req.body;
    if (!product) {
      return res.status(400).json({ error: 'Product data is required' });
    }

    // 1. Always append to local Excel/CSV Spreadsheet file
    const excelResult = await excelService.appendProductToSpreadsheet(product);

    // 2. Also record in local DB history
    dbService.addHistoryRecord({
      title: product.title,
      pinTitle: product.aiContent?.pinTitle || product.title,
      discountedPrice: product.discountedPrice,
      originalPrice: product.originalPrice,
      discount: product.discount,
      affiliateUrl: product.affiliateUrl || product.productUrl,
      imageUrl: product.imageUrl,
      status: 'Saved to Spreadsheet',
      platform: 'Excel & Sheets'
    });

    // 3. If Webhook URL is provided, forward to Google Sheets Web App as well
    const targetUrl = webhookUrl || process.env.SHEETS_WEBHOOK_URL;
    let webhookResult = null;
    if (targetUrl) {
      try {
        webhookResult = await sheetsService.sendToSheetsWebhook(targetUrl, product);
      } catch (e) {
        console.warn('Google Sheets Webhook forward warning:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Product saved to Spreadsheet successfully!',
      spreadsheet: excelResult,
      webhook: webhookResult
    });
  } catch (err) {
    console.error('[Route Sheets] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sheets/download-excel - Download .xlsx file
router.get('/download-excel', (req, res) => {
  const { excelPath, exists } = excelService.getSpreadsheetPaths();
  if (!exists) {
    return res.status(404).json({ error: 'Spreadsheet belum memiliki data produk.' });
  }
  res.download(excelPath, 'Shopee_Affiliate_Database.xlsx');
});

// GET /api/sheets/download-csv - Download .csv file
router.get('/download-csv', (req, res) => {
  const { csvPath } = excelService.getSpreadsheetPaths();
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'CSV file not found.' });
  }
  res.download(csvPath, 'Shopee_Affiliate_Database.csv');
});

// GET /api/sheets/info - Get spreadsheet metadata
router.get('/info', (req, res) => {
  const paths = excelService.getSpreadsheetPaths();
  res.json({ success: true, ...paths });
});

// POST /api/sheets/test - Test connection
router.post('/test', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl || process.env.SHEETS_WEBHOOK_URL;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const result = await sheetsService.testConnection(targetUrl);
    res.json({ success: true, message: 'Google Sheets Webhook tested successfully', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
