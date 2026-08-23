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
    return dbService.removeFromQueue(id);
  }

  clearQueue() {
    return dbService.clearQueue();
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

    // 1. Pinterest dispatch attempt
    try {
      publishRes = await pinterestPublisher.publishPin(item, options);
    } catch (pErr) {
      errors.push(`Pinterest: ${pErr.message}`);
    }

    // 2. Telegram scheduled dispatch attempt
    const connections = dbService.getConnections();
    if (connections.telegramAutoPost && connections.telegramChannelId) {
      try {
        telegramRes = await telegramPublisher.publishPin({
          ...item,
          pinterestPinUrl: publishRes?.pinUrl || null
        });
      } catch (tgErr) {
        errors.push(`Telegram: ${tgErr.message}`);
        dbService.addLog('WARNING', 'TELEGRAM', `Auto-post Telegram gagal: ${tgErr.message}`);
      }
    }

    if (publishRes || telegramRes) {
      dbService.removeFromQueue(id);
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
