/**
 * Queue Service - Manages Preview Queue & Dispatch Lifecycle
 */

const dbService = require('./db-service');
const pinterestPublisher = require('./pinterest-publisher');
const telegramPublisher = require('./telegram-publisher');

class QueueService {
  getQueue(status = null) {
    const queue = dbService.getQueue();
    if (status) {
      return queue.filter(q => q.status === status);
    }
    return queue;
  }

  getQueueItemById(id) {
    const queue = dbService.getQueue();
    return queue.find(q => q.id === id);
  }

  addItem(data) {
    return dbService.addToQueue(data);
  }

  updateItem(id, updates) {
    const updated = dbService.updateQueueItem(id, updates);
    if (updated) {
      dbService.addLog('INFO', 'QUEUE', `Queue item ${id} diperbarui: "${updated.title.substring(0, 30)}..."`);
    }
    return updated;
  }

  removeItem(id) {
    const res = dbService.removeFromQueue(id);
    this.recalculateSchedules();
    return res;
  }

  batchRemove(ids = []) {
    ids.forEach(id => dbService.removeFromQueue(id));
    this.recalculateSchedules();
    dbService.addLog('INFO', 'QUEUE', `🗑️ Berhasil menghapus ${ids.length} item antrean.`);
    return dbService.getQueue();
  }

  clearQueue() {
    const res = dbService.clearQueue();
    dbService.addLog('INFO', 'QUEUE', '🧹 Semua antrean Preview Queue telah dibersihkan.');
    return res;
  }

  /**
   * Recalculates and stores fixed scheduledAt timestamps for all QUEUED items
   */
  recalculateSchedules() {
    const config = dbService.getBotConfig();
    const intervalMs = (config.intervalMinutes || 35) * 60 * 1000;
    const lastDispatchedAt = config.lastDispatchedAt ? new Date(config.lastDispatchedAt).getTime() : 0;
    const now = Date.now();

    let baseMs = now;
    if (lastDispatchedAt > 0 && (now - lastDispatchedAt) < intervalMs) {
      baseMs = lastDispatchedAt + intervalMs;
    } else {
      baseMs = now;
    }

    const queue = dbService.getQueue();
    let queuedIndex = 0;

    queue.forEach(item => {
      if (item.status === 'QUEUED') {
        const itemScheduleMs = baseMs + (queuedIndex * intervalMs);
        const schedIso = new Date(itemScheduleMs).toISOString();
        dbService.updateQueueItem(item.id, { scheduledAt: schedIso });
        queuedIndex++;
      }
    });
  }

  /**
   * Approves a single pending queue item
   */
  async approveItem(id, autoDispatch = false) {
    const item = this.getQueueItemById(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    if (autoDispatch) {
      return await this.dispatchItem(id);
    }

    const updated = dbService.updateQueueItem(id, {
      status: 'QUEUED',
      approvedAt: new Date().toISOString()
    });

    this.recalculateSchedules();
    dbService.addLog('INFO', 'QUEUE', `Item ${id} di-approve dan siap dieksekusi oleh Bot Worker.`);
    return updated;
  }

  /**
   * Approves all pending items
   */
  async batchApprove(ids = []) {
    const queue = dbService.getQueue();
    const approved = [];

    const targetItems = ids.length > 0
      ? queue.filter(q => ids.includes(q.id) && q.status === 'PENDING_APPROVAL')
      : queue.filter(q => q.status === 'PENDING_APPROVAL');

    targetItems.forEach(item => {
      dbService.updateQueueItem(item.id, {
        status: 'QUEUED',
        approvedAt: new Date().toISOString()
      });
      approved.push(item.id);
    });

    this.recalculateSchedules();
    dbService.addLog('SUCCESS', 'QUEUE', `✅ Berhasil meng-approve ${approved.length} item antrean.`);
    return { count: approved.length, approvedIds: approved };
  }

  /**
   * Dispatches a queue item directly to Pinterest (and optionally auto-broadcast to Telegram)
   */
  async dispatchItem(id, options = {}) {
    const item = this.getQueueItemById(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    dbService.updateQueueItem(id, { status: 'PROCESSING' });

    let publishRes = null;
    let telegramRes = null;
    let errors = [];

    const connections = dbService.getConnections();

    // 1. Pinterest dispatch attempt
    const hasPinterest = !!(connections.pinterestAccessToken || options.accessToken);
    if (hasPinterest) {
      try {
        publishRes = await pinterestPublisher.publishPin(item, options);
      } catch (pErr) {
        errors.push(`Pinterest: ${pErr.message}`);
      }
    }

    // 2. Telegram scheduled dispatch attempt
    const tgToken = options.token || connections.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const tgChannel = options.chatId || connections.telegramChannelId || process.env.TELEGRAM_CHANNEL_ID;
    if (tgToken && tgChannel) {
      try {
        telegramRes = await telegramPublisher.publishPin({
          ...item,
          pinterestPinUrl: publishRes?.pinUrl || null
        }, options);
      } catch (tgErr) {
        errors.push(`Telegram: ${tgErr.message}`);
        dbService.addLog('WARNING', 'TELEGRAM', `Auto-post Telegram gagal: ${tgErr.message}`);
      }
    }

    // Fallback: If neither was configured, try hybrid / default mode
    if (!hasPinterest && !tgChannel) {
      try {
        publishRes = await pinterestPublisher.publishPin(item, options);
      } catch (pErr) {
        errors.push(`Publisher: ${pErr.message}`);
      }
    }

    if (publishRes || telegramRes) {
      dbService.removeFromQueue(id);
      this.recalculateSchedules();
      return {
        success: true,
        item,
        publishRes,
        telegramRes
      };
    } else {
      const errMsg = errors.join(' | ') || 'Gagal dispatch multi-channel';
      dbService.updateQueueItem(id, {
        status: 'FAILED',
        lastError: errMsg
      });
      dbService.addLog('ERROR', 'DISPATCH', `❌ Gagal dispatch "${item.title.substring(0, 30)}": ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  /**
   * Dispatches a queue item specifically to Telegram Channel
   */
  async dispatchToTelegram(id, options = {}) {
    const item = this.getQueueItemById(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    try {
      const telegramRes = await telegramPublisher.publishPin(item, options);
      return {
        success: true,
        item,
        telegramRes
      };
    } catch (err) {
      dbService.addLog('ERROR', 'TELEGRAM', `Gagal dispatch ke Telegram: ${err.message}`);
      throw err;
    }
  }

  /**
   * Dispatches a queue item to both Pinterest and Telegram simultaneously
   */
  async dispatchMultiChannel(id, options = {}) {
    const item = this.getQueueItemById(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    dbService.updateQueueItem(id, { status: 'PROCESSING' });

    const results = { pinterest: null, telegram: null, errors: [] };

    // 1. Pinterest
    try {
      results.pinterest = await pinterestPublisher.publishPin(item, options);
    } catch (pErr) {
      results.errors.push(`Pinterest: ${pErr.message}`);
    }

    // 2. Telegram
    try {
      results.telegram = await telegramPublisher.publishPin({
        ...item,
        pinterestPinUrl: results.pinterest?.pinUrl || null
      }, options);
    } catch (tErr) {
      results.errors.push(`Telegram: ${tErr.message}`);
    }

    if (results.pinterest || results.telegram) {
      dbService.removeFromQueue(id);
      return {
        success: true,
        item,
        results,
        partial: results.errors.length > 0,
        errors: results.errors
      };
    } else {
      const combinedErr = results.errors.join(' | ');
      dbService.updateQueueItem(id, {
        status: 'FAILED',
        lastError: combinedErr
      });
      throw new Error(combinedErr);
    }
  }
}

module.exports = new QueueService();
