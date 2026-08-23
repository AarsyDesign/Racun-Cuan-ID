/**
 * Bot Worker & Scheduler Engine
 * Orchestrates autonomous campaign processing, AI synthesis, and Pinterest dispatching
 */

const dbService = require('./db-service');
const campaignService = require('./campaign-service');
const queueService = require('./queue-service');
const pinterestPublisher = require('./pinterest-publisher');

class BotWorker {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
    this.sseClients = new Set();
  }

  init() {
    const config = dbService.getBotConfig();
    dbService.addLog('INFO', 'WORKER', '🤖 Bot Worker Service diinisialisasi.');
    if (config.isRunning) {
      this.start();
    }
  }

  start() {
    dbService.updateBotConfig({ isRunning: true });
    dbService.addLog('INFO', 'WORKER', '▶️ Bot Worker diaktifkan: Memulai pemantauan antrean & kampanye.');

    if (this.timer) clearInterval(this.timer);
    // Interval check every 10 seconds
    this.timer = setInterval(() => this.tick(), 10000);
    // Trigger immediate first check
    setTimeout(() => this.tick(), 1000);
  }

  pause() {
    dbService.updateBotConfig({ isRunning: false });
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    dbService.addLog('INFO', 'WORKER', '⏸️ Bot Worker dihentikan sementara.');
  }

  getStatus() {
    const config = dbService.getBotConfig();
    const queue = dbService.getQueue();
    const campaigns = dbService.getCampaigns();
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

    const intervalMinutes = config.intervalMinutes || 35;
    const intervalMs = intervalMinutes * 60 * 1000;
    const lastDispatchedAt = config.lastDispatchedAt ? new Date(config.lastDispatchedAt).getTime() : 0;
    const now = Date.now();

    let nextDispatchSeconds = 0;
    let nextDispatchAt = null;

    const queuedItems = queue.filter(q => q.status === 'QUEUED');
    const firstQueued = queuedItems.length > 0 ? queuedItems[0] : null;

    if (config.isRunning) {
      if (firstQueued) {
        if (firstQueued.scheduledAt) {
          nextDispatchAt = firstQueued.scheduledAt;
        } else {
          nextDispatchAt = (lastDispatchedAt > 0 && (now - lastDispatchedAt) < intervalMs)
            ? new Date(lastDispatchedAt + intervalMs).toISOString()
            : new Date().toISOString();
        }
        const diffMs = new Date(nextDispatchAt).getTime() - now;
        nextDispatchSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      } else {
        nextDispatchSeconds = 0;
        nextDispatchAt = null;
      }
    }

    const nextDispatchInMinutes = Math.ceil(nextDispatchSeconds / 60);

    return {
      isRunning: config.isRunning,
      isProcessing: this.isProcessing,
      intervalMinutes,
      nextDispatchSeconds,
      nextDispatchInMinutes,
      nextDispatchAt,
      lastDispatchedAt: config.lastDispatchedAt || null,
      dailyCap: config.dailyCap || 50,
      dailyCountToday: config.dailyCountToday || 0,
      queueCount: queue.length,
      pendingApprovalCount: queue.filter(q => q.status === 'PENDING_APPROVAL').length,
      readyToPublishCount: queuedItems.length,
      activeCampaignsCount: activeCampaigns.length,
      totalCampaignsCount: campaigns.length,
      lastTickAt: new Date().toISOString()
    };
  }

  /**
   * Main automation tick
   */
  async tick() {
    const config = dbService.getBotConfig();
    if (!config.isRunning || this.isProcessing) return;

    this.isProcessing = true;

    try {
      // 1. Process items ready in queue (status === 'QUEUED')
      const queue = dbService.getQueue();
      const readyItem = queue.find(q => q.status === 'QUEUED');

      if (readyItem) {
        const now = Date.now();

        // If scheduledAt exists, check if due
        if (readyItem.scheduledAt) {
          const schedTime = new Date(readyItem.scheduledAt).getTime();
          if (now < schedTime - 2000) {
            // Still waiting for this item's scheduled timestamp
            this.isProcessing = false;
            return;
          }
        } else {
          // If no scheduledAt, check cooldown interval
          const intervalMs = (config.intervalMinutes || 35) * 60 * 1000;
          const lastDispatchedAt = config.lastDispatchedAt ? new Date(config.lastDispatchedAt).getTime() : 0;
          const timeElapsed = now - lastDispatchedAt;
          if (lastDispatchedAt > 0 && timeElapsed < intervalMs) {
            this.isProcessing = false;
            return;
          }
        }

        dbService.addLog('INFO', 'WORKER', `⚡ Menemukan Produk siap diposting: "${readyItem.title.substring(0, 35)}..."`);
        await queueService.dispatchItem(readyItem.id);
        dbService.updateBotConfig({ 
          lastDispatchedAt: new Date().toISOString(),
          dailyCountToday: (config.dailyCountToday || 0) + 1
        });

        // Recalculate subsequent queue items schedules (+35m each)
        queueService.recalculateSchedules();

        this.isProcessing = false;
        return;
      }

      // 2. Check active campaigns and auto-replenish queue if under goal
      const campaigns = dbService.getCampaigns();
      const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

      for (const camp of activeCampaigns) {
        const remainingGoal = (camp.goalTarget || 20) - (camp.goalCurrent || 0);
        if (remainingGoal > 0) {
          // Check time window if applicable
          const now = new Date();
          const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          
          let inWindow = true;
          if (camp.windowStart && camp.windowEnd && camp.windowStart !== '00:00' && camp.windowEnd !== '23:59') {
            if (camp.windowStart <= camp.windowEnd) {
              inWindow = currentTimeStr >= camp.windowStart && currentTimeStr <= camp.windowEnd;
            } else {
              // Crosses midnight (e.g. 22:00 to 03:00)
              inWindow = currentTimeStr >= camp.windowStart || currentTimeStr <= camp.windowEnd;
            }
          }

          if (inWindow) {
            dbService.addLog('INFO', 'WORKER', `🎯 Memproses Campaign "${camp.name}" (Goal: ${camp.goalCurrent}/${camp.goalTarget}).`);
            await campaignService.enqueueCampaign(camp.id, 1);
            break; // Process one campaign per tick to pace actions
          }
        }
      }
    } catch (err) {
      dbService.addLog('ERROR', 'WORKER', `⚠️ Error pada Bot Worker tick: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Triggers a manual instantaneous tick for testing or 1-click execution
   */
  async triggerManualRun(campaignId = null) {
    dbService.addLog('INFO', 'WORKER', '⚡ Manual run dipicu oleh pengguna.');
    if (campaignId) {
      const items = await campaignService.enqueueCampaign(campaignId, 1);
      if (items && items.length > 0) {
        const item = items[0];
        if (item.status === 'QUEUED') {
          return await queueService.dispatchItem(item.id);
        }
      }
      return items;
    } else {
      await this.tick();
      return this.getStatus();
    }
  }
}

module.exports = new BotWorker();
