const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');
const telegramPublisher = require('../services/telegram-publisher');

// GET /api/telegram/status - Get Telegram bot & connection status
router.get('/status', async (req, res) => {
  try {
    const conn = dbService.getConnections();
    let botInfo = null;
    let botError = null;

    try {
      botInfo = await telegramPublisher.verifyBot(conn.telegramBotToken);
    } catch (err) {
      botError = err.message;
    }

    res.json({
      success: true,
      bot: botInfo || {
        id: 8277933275,
        username: conn.telegramBotUsername || 'linkaffiliatorbot',
        first_name: conn.telegramBotName || 'Link Affiliate'
      },
      configuredChannelId: conn.telegramChannelId || '',
      autoPostEnabled: !!conn.telegramAutoPost,
      isConnected: !botError && !!botInfo,
      error: botError
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/verify - Verify bot token
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  try {
    const botInfo = await telegramPublisher.verifyBot(token);
    const updatedConn = dbService.updateConnections({
      telegramBotToken: token || telegramPublisher.getToken(),
      telegramBotUsername: botInfo.username,
      telegramBotName: botInfo.first_name,
      telegramBotId: botInfo.id,
      telegramStatus: 'CONNECTED'
    });

    dbService.addLog('SUCCESS', 'TELEGRAM', `✅ Bot Telegram @${botInfo.username} (${botInfo.first_name}) terverifikasi.`);

    res.json({
      success: true,
      bot: botInfo,
      connections: updatedConn
    });
  } catch (err) {
    dbService.addLog('ERROR', 'TELEGRAM', `❌ Gagal verifikasi Bot Telegram: ${err.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/test - Send test message to Channel
router.post('/test', async (req, res) => {
  const { chatId, token } = req.body;
  try {
    const result = await telegramPublisher.sendTestMessage(chatId, token);
    res.json({
      success: true,
      message: `Pesan uji coba berhasil dikirim ke channel ${chatId || telegramPublisher.getChannelId()}`,
      result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/chat-info - Get channel metadata
router.post('/chat-info', async (req, res) => {
  const { chatId, token } = req.body;
  try {
    const info = await telegramPublisher.getChatInfo(chatId, token);
    res.json({ success: true, chat: info });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/config - Update Telegram configuration
router.post('/config', (req, res) => {
  try {
    const { channelId, botToken, autoPost } = req.body;
    const updates = {};

    if (channelId !== undefined) updates.telegramChannelId = channelId.trim();
    if (botToken !== undefined) updates.telegramBotToken = botToken.trim();
    if (autoPost !== undefined) updates.telegramAutoPost = Boolean(autoPost);

    const updated = dbService.updateConnections(updates);
    dbService.addLog('INFO', 'TELEGRAM', `Pengaturan Telegram diperbarui: Channel [${updates.telegramChannelId || updated.telegramChannelId || 'None'}], AutoPost: ${updated.telegramAutoPost ? 'ON' : 'OFF'}`);

    res.json({ success: true, connections: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/broadcast - Broadcast arbitrary product or queue item
router.post('/broadcast', async (req, res) => {
  try {
    const { product, queueItem, options } = req.body;
    let result = null;

    if (product) {
      result = await telegramPublisher.publishProduct(product, options);
    } else if (queueItem) {
      result = await telegramPublisher.publishPin(queueItem, options);
    } else {
      return res.status(400).json({ success: false, error: 'Product atau Queue Item wajib disertakan' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
