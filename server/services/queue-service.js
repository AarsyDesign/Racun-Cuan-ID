/**
 * Queue Service - Manages Preview Queue & Dispatch Lifecycle
 */

const dbService = require('./db-service');
const pinterestPublisher = require('./pinterest-publisher');

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
   * Dispatches a queue item directly to Pinterest
   */
  async dispatchItem(id, options = {}) {
    const item = this.getQueueItemById(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    dbService.updateQueueItem(id, { status: 'PROCESSING' });

    try {
      const publishRes = await pinterestPublisher.publishPin(item, options);
      // Remove from queue after success and update status
      dbService.removeFromQueue(id);

      return {
        success: true,
        item,
        publishRes
      };
    } catch (err) {
      dbService.updateQueueItem(id, {
        status: 'FAILED',
        lastError: err.message
      });
      throw err;
    }
  }
}

module.exports = new QueueService();
