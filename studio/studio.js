/**
 * PinMatrix Studio - Interactive Frontend Controller
 */

class PinMatrixStudio {
  constructor() {
    const storedBackend = (typeof localStorage !== 'undefined') ? localStorage.getItem('pinmatrix_backend_url') : null;
    if (storedBackend && storedBackend.trim().startsWith('http')) {
      const clean = storedBackend.trim().replace(/\/+$/, '');
      this.apiBase = clean.endsWith('/api') ? clean : `${clean}/api`;
    } else {
      this.apiBase = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
        ? `${window.location.origin}/api`
        : 'http://localhost:3000/api';
    }
    this.activeTab = 'overview';
    this.products = [];
    this.productFilter = 'fresh';
    this.productSearch = '';
    this.campaigns = [];
    this.queue = [];
    this.history = [];
    this.historyFilter = 'all';
    this.logs = [];
    this.botStatus = {};
    this.connections = {};
    this.selectedCampaignIds = new Set();
    this.selectedStudioProductIds = new Set();
    this.selectedQueueIds = new Set();
    this.pollInterval = null;
    this.countdownInterval = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupPromptHelpers();
    this.initBackendSettingsUI();
    this.startLiveCountdown();
    await this.fetchAllData();
    this.startLivePolling();
  }

  initBackendSettingsUI() {
    const input = document.getElementById('setting-studio-backend-url');
    const status = document.getElementById('backend-conn-status');
    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('pinmatrix_backend_url') : null;
    if (input) {
      input.value = stored || (this.apiBase ? this.apiBase.replace(/\/api$/, '') : 'http://localhost:3000');
    }
    if (status) {
      if (stored && !stored.includes('localhost')) {
        status.textContent = '● Cloud / Hosted';
        status.style.color = '#38bdf8';
      } else {
        status.textContent = '● Localhost / Auto';
        status.style.color = 'var(--accent-green)';
      }
    }
  }

  bindEvents() {
    // Global Event Delegation (100% CSP compliant in Chrome Extension and Web)
    document.addEventListener('click', (e) => {
      // 1. Tab Navigation triggers
      const navTrigger = e.target.closest('.nav-trigger, .nav-item');
      if (navTrigger) {
        const tab = navTrigger.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
          return;
        }
      }

      // 1.5 Queue Card Checkbox handling
      if (e.target.classList.contains('queue-card-checkbox')) {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedQueueIds.add(id);
        } else {
          this.selectedQueueIds.delete(id);
        }
        this.updateQueueBulkBar();
        return;
      }

      // 2. Action buttons with data-action
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        const id = actionBtn.getAttribute('data-id');

        switch (action) {
          case 'toggle-campaign':
            if (id) this.toggleCampaign(id);
            break;
          case 'enqueue-campaign':
            if (id) this.enqueueSingle(id);
            break;
          case 'delete-campaign':
            if (id) this.deleteCampaign(id);
            break;
          case 'approve-queue':
            if (id) this.approveQueueItem(id);
            break;
          case 'dispatch-queue':
            if (id) this.dispatchQueueItem(id);
            break;
          case 'dispatch-telegram':
            if (id) this.dispatchQueueItemToTelegram(id);
            break;
          case 'dispatch-all':
            if (id) this.dispatchQueueItemMultiChannel(id);
            break;
          case 'remove-queue':
            if (id) this.removeQueueItem(id);
            break;
          case 'enqueue-matrix':
            if (id) this.enqueueProductToMatrix(id);
            break;
          case 'post-pinterest':
            if (id) this.postProductToPinterest(id);
            break;
          case 'post-telegram':
            if (id) this.postProductToTelegram(id);
            break;
          case 'save-sheets':
            if (id) this.saveProductToSheets(id);
            break;
          case 'edit-product-link':
            if (id) this.editProductLink(id);
            break;
          case 'delete-product':
            if (id) this.deleteProduct(id);
            break;
        }
      }
    });

    // Bot toggle in topbar
    const botToggle = document.getElementById('btn-toggle-bot');
    if (botToggle) {
      botToggle.addEventListener('click', () => this.toggleBotWorker());
    }

    // Shopee Scan Buttons (Tab Header)
    document.querySelectorAll('#btn-scan-shopee-dom, #btn-scan-shopee-now').forEach(btn => {
      btn.addEventListener('click', () => this.scanShopeeActiveTab());
    });

    // Shopee Products Refresh & Seed
    const syncProductsBtn = document.getElementById('btn-sync-shopee-products');
    if (syncProductsBtn) {
      syncProductsBtn.addEventListener('click', () => this.fetchProducts(true));
    }

    // Shopee Filter Chips
    document.querySelectorAll('#product-filter-chips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#product-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.productFilter = chip.getAttribute('data-filter') || 'all';
        this.renderProducts();
      });
    });

    // Shopee Search Input
    const searchProdInput = document.getElementById('input-search-products');
    if (searchProdInput) {
      searchProdInput.addEventListener('input', (e) => {
        this.productSearch = e.target.value.toLowerCase().trim();
        this.renderProducts();
      });
    }

    // Shopee Studio Batch Actions
    const selectAllStudioProducts = document.getElementById('checkbox-studio-select-all');
    if (selectAllStudioProducts) {
      selectAllStudioProducts.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (checked) {
          this.products.forEach(p => this.selectedStudioProductIds.add(p.id || p.itemId));
        } else {
          this.selectedStudioProductIds.clear();
        }
        this.renderProducts();
      });
    }

    const batchEnqueueBtn = document.getElementById('btn-batch-enqueue-products');
    if (batchEnqueueBtn) {
      batchEnqueueBtn.addEventListener('click', () => this.handleBatchEnqueueProducts());
    }

    const batchTelegramBtn = document.getElementById('btn-batch-telegram-products');
    if (batchTelegramBtn) {
      batchTelegramBtn.addEventListener('click', () => this.handleBatchTelegramProducts());
    }

    const batchDeleteBtn = document.getElementById('btn-batch-delete-products');
    if (batchDeleteBtn) {
      batchDeleteBtn.addEventListener('click', () => this.handleBatchDeleteProducts());
    }

    // Campaign Form Submit
    const campaignForm = document.getElementById('new-campaign-form');
    if (campaignForm) {
      campaignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCampaign();
      });
    }

    // Enqueue All / Selected CTA
    const enqueueAllBtn = document.getElementById('btn-enqueue-selected');
    if (enqueueAllBtn) {
      enqueueAllBtn.addEventListener('click', () => this.handleEnqueueSelected());
    }

    // Queue actions
    const approveAllBtn = document.getElementById('btn-queue-approve-all');
    if (approveAllBtn) {
      approveAllBtn.addEventListener('click', () => this.handleBatchApproveQueue());
    }

    const clearAllQueueBtn = document.getElementById('btn-clear-all-queue');
    if (clearAllQueueBtn) {
      clearAllQueueBtn.addEventListener('click', () => this.handleClearAllQueue());
    }

    const selectAllQueueCb = document.getElementById('checkbox-queue-select-all');
    if (selectAllQueueCb) {
      selectAllQueueCb.addEventListener('change', (e) => this.handleToggleSelectAllQueue(e.target.checked));
    }

    const batchApproveSelectedQueueBtn = document.getElementById('btn-batch-approve-selected-queue');
    if (batchApproveSelectedQueueBtn) {
      batchApproveSelectedQueueBtn.addEventListener('click', () => this.handleBatchApproveSelectedQueue());
    }

    const batchDeleteSelectedQueueBtn = document.getElementById('btn-batch-delete-selected-queue');
    if (batchDeleteSelectedQueueBtn) {
      batchDeleteSelectedQueueBtn.addEventListener('click', () => this.handleBatchDeleteSelectedQueue());
    }

    const exportCsvBtn = document.getElementById('btn-export-queue-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        window.open(`${this.apiBase}/queue/export/csv`, '_blank');
      });
    }

    // Clear logs
    const clearLogsBtn = document.getElementById('btn-clear-logs');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    // Pinterest Token Verification
    const verifyPinterestBtn = document.getElementById('btn-verify-pinterest-token');
    if (verifyPinterestBtn) {
      verifyPinterestBtn.addEventListener('click', () => this.handleVerifyPinterestToken());
    }

    const testPinterestBtn = document.getElementById('btn-test-pinterest');
    if (testPinterestBtn) {
      testPinterestBtn.addEventListener('click', () => this.testConnection('pinterest'));
    }

    const testGeminiBtn = document.getElementById('btn-test-gemini');
    if (testGeminiBtn) {
      testGeminiBtn.addEventListener('click', () => this.testConnection('gemini'));
    }

    // Telegram Configuration & Actions
    const saveTgBtn = document.getElementById('btn-save-telegram-config');
    if (saveTgBtn) {
      saveTgBtn.addEventListener('click', () => this.handleSaveTelegramConfig());
    }

    const testTgBtn = document.getElementById('btn-test-telegram-channel');
    if (testTgBtn) {
      testTgBtn.addEventListener('click', () => this.handleTestTelegramChannel());
    }

    const verifyTgBtn = document.getElementById('btn-verify-telegram-bot');
    if (verifyTgBtn) {
      verifyTgBtn.addEventListener('click', () => this.handleVerifyTelegramBot());
    }

    const testBackendBtn = document.getElementById('btn-test-studio-backend');
    if (testBackendBtn) {
      testBackendBtn.addEventListener('click', () => this.handleTestStudioBackend());
    }

    const saveSettingsBtn = document.getElementById('btn-save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());
    }

    // Pinterest Board Selection Change
    const selectBoard = document.getElementById('select-pinterest-board');
    if (selectBoard) {
      selectBoard.addEventListener('change', (e) => this.handleBoardSelectionChange(e.target.value));
    }

    const refreshPinterestBtn = document.getElementById('btn-refresh-pinterest-explorer');
    if (refreshPinterestBtn) {
      refreshPinterestBtn.addEventListener('click', () => this.fetchPinterestData(true));
    }

    // Sheets Webhook Save
    const saveSheetsBtn = document.getElementById('btn-save-sheets-webhook');
    if (saveSheetsBtn) {
      saveSheetsBtn.addEventListener('click', () => this.handleSaveSheetsWebhook());
    }

    const exportSheetsCsvBtn = document.getElementById('btn-export-sheets-csv');
    if (exportSheetsCsvBtn) {
      exportSheetsCsvBtn.addEventListener('click', () => {
        window.open(`${this.apiBase}/queue/export/csv`, '_blank');
      });
    }

    // Shopee Products Refresh & Clear
    const syncShopeeBtn = document.getElementById('btn-sync-shopee-products');
    if (syncShopeeBtn) {
      syncShopeeBtn.addEventListener('click', async () => {
        await this.fetchProducts();
        this.showToast('🔄 Daftar produk Shopee diperbarui', 'info');
      });
    }

    const clearShopeeBtn = document.getElementById('btn-clear-shopee-products');
    if (clearShopeeBtn) {
      clearShopeeBtn.addEventListener('click', async () => {
        if (confirm('Hapus semua produk Shopee yang tersimpan di database?')) {
          try {
            await fetch(`${this.apiBase}/products`, { method: 'DELETE' });
            await this.fetchProducts();
            await this.fetchStats();
            this.showToast('🗑️ Semua produk berhasil dibersihkan', 'success');
          } catch (e) {
            this.showToast('Gagal membersihkan produk', 'error');
          }
        }
      });
    }

    // Job History Actions & Filter Chips
    const refreshHistoryBtn = document.getElementById('btn-refresh-history');
    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', () => this.fetchHistory(true));
    }

    const clearHistoryBtn = document.getElementById('btn-clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());
    }

    document.querySelectorAll('#history-filter-chips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#history-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.historyFilter = chip.getAttribute('data-platform') || 'all';
        this.renderHistory();
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(nav => {
      const isMatch = nav.getAttribute('data-tab') === tabId;
      nav.classList.toggle('active', isMatch);
      if (isMatch) {
        nav.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });

    // Update header quick buttons active state
    document.querySelectorAll('.header-action-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update view panes
    document.querySelectorAll('.studio-view-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `view-${tabId}`);
    });

    // Update breadcrumb
    const breadcrumbActive = document.getElementById('breadcrumb-current');
    if (breadcrumbActive) {
      const titles = {
        'overview': 'Overview',
        'shopee-products': 'Shopee Products & Deck',
        'connections': 'Connections',
        'campaign-studio': 'Campaign Studio',
        'preview-queue': 'Preview Queue',
        'pinterest-explorer': 'Pinterest Explorer',
        'sheets-hub': 'Sheets & Database Hub',
        'job-history': 'Job History',
        'activity-logs': 'Activity Logs',
        'settings': 'Settings',
        'help-docs': 'Help & Docs'
      };
      breadcrumbActive.textContent = titles[tabId] || tabId;
    }

    if (tabId === 'pinterest-explorer') {
      this.fetchPinterestData();
    } else if (tabId === 'shopee-products') {
      this.fetchProducts();
    } else if (tabId === 'sheets-hub') {
      this.fetchSheetsData();
    } else if (tabId === 'job-history') {
      this.fetchHistory();
    }
  }

  setupPromptHelpers() {
    // Quick chips to inject into prompt textareas
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const targetId = chip.getAttribute('data-target');
        const val = chip.getAttribute('data-val');
        const target = document.getElementById(targetId);
        if (target && val) {
          const current = target.value.trim();
          target.value = current ? `${current}, ${val}` : val;
          target.focus();
        }
      });
    });
  }

  async fetchAllData() {
    try {
      await Promise.all([
        this.fetchProducts(),
        this.fetchCampaigns(),
        this.fetchQueue(),
        this.fetchLogs(),
        this.fetchBotStatus(),
        this.fetchStats(),
        this.fetchConnections(),
        this.fetchSheetsData(),
        this.fetchHistory()
      ]);
    } catch (err) {
      console.warn('[AffiliatorKillerMatrix] Fetch error:', err);
    }
  }

  startLivePolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      if (this.activeTab === 'activity-logs') {
        await this.fetchLogs();
      } else if (this.activeTab === 'preview-queue') {
        await this.fetchQueue();
      } else if (this.activeTab === 'job-history') {
        await this.fetchHistory();
      }
      await this.fetchBotStatus();
    }, 4000);
  }

  async fetchCampaigns() {
    try {
      const res = await fetch(`${this.apiBase}/campaigns`);
      const data = await res.json();
      if (data.success) {
        this.campaigns = data.campaigns || [];
        this.renderCampaignLibrary();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async scanShopeeActiveTab() {
    this.showToast('Memindai halaman Shopee...', 'info');
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || !tabs[0]) {
          this.showToast('Buka tab Shopee terlebih dahulu untuk memindai.', 'warning');
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_SHOPEE_PAGE' }, async (response) => {
          if (chrome.runtime.lastError) {
            this.showToast('Harap buka halaman produk/katalog Shopee di tab aktif.', 'warning');
            return;
          }
          if (response && response.success && response.products && response.products.length > 0) {
            await this.saveScrapedProducts(response.products);
            this.showToast(`✅ Berhasil mendeteksi ${response.products.length} produk Shopee!`, 'success');
          } else {
            this.showToast('Tidak ada produk yang terdeteksi di halaman Shopee ini.', 'info');
          }
        });
      } catch (err) {
        console.error(err);
        this.showToast('Gagal memindai: ' + err.message, 'error');
      }
    } else {
      this.showToast('⚡ Buka Ekstensi racun cuan.id di Side Panel untuk scan Shopee otomatis.', 'info');
    }
  }

  async saveScrapedProducts(products) {
    try {
      const res = await fetch(`${this.apiBase}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });
      const data = await res.json();
      if (data.success) {
        this.products = data.products || [];
        this.renderProducts();
        this.renderStats({ activeCampaigns: this.campaigns?.length, queueLength: this.queue?.length });
        if (this.activeTab !== 'shopee-products') {
          this.switchTab('shopee-products');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchQueue() {
    try {
      const res = await fetch(`${this.apiBase}/queue`);
      const data = await res.json();
      if (data.success) {
        this.queue = data.queue || [];
        this.renderPreviewQueue();
        this.updateQueueBadge();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchLogs() {
    try {
      const res = await fetch(`${this.apiBase}/logs?limit=80`);
      const data = await res.json();
      if (data.success) {
        this.logs = data.logs || [];
        this.renderLogs();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchBotStatus() {
    try {
      const res = await fetch(`${this.apiBase}/bot/status`);
      const data = await res.json();
      if (data.success) {
        this.botStatus = data.status || {};
        this.renderBotStatus();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchStats() {
    try {
      const res = await fetch(`${this.apiBase}/stats`);
      const data = await res.json();
      if (data.success && data.stats) {
        this.renderStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  }

  renderStats(stats) {
    if (!stats) return;
    const kpiShopee = document.getElementById('kpi-shopee-count');
    if (kpiShopee) kpiShopee.textContent = this.products?.length || 0;

    const kpiActive = document.getElementById('kpi-active-campaigns');
    if (kpiActive) kpiActive.textContent = stats.activeCampaigns !== undefined ? stats.activeCampaigns : (this.campaigns.filter(c => c.status === 'ACTIVE').length);

    const kpiQueue = document.getElementById('kpi-queue-count');
    if (kpiQueue) kpiQueue.textContent = stats.queueLength !== undefined ? stats.queueLength : (this.queue?.length || 0);

    const kpiPublished = document.getElementById('kpi-published-today');
    if (kpiPublished) kpiPublished.textContent = `${stats.dailyCountToday || 0} / ${stats.dailyCap || 50}`;
  }

  renderCampaignLibrary() {
    const tbody = document.getElementById('campaign-table-body');
    if (!tbody) return;

    if (this.campaigns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada campaign. Buat campaign baru di sebelah kiri.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.campaigns.map(camp => {
      const isSelected = this.selectedCampaignIds.has(camp.id);
      const isActive = camp.status === 'ACTIVE';
      const isAuto = camp.approvalMode === 'AUTO';
      const goalDisplay = camp.automationType === 'DAILY' ? `${camp.goalTarget || 5}/day` : `${camp.goalCurrent || 0}/${camp.goalTarget || 75}`;

      return `
        <tr data-id="${camp.id}">
          <td>
            <input type="checkbox" class="camp-select-checkbox" data-id="${camp.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="campaign-name-cell" title="${camp.name}">
            ${camp.name}
          </td>
          <td>
            <span class="badge-status ${isActive ? 'active' : 'paused'}">
              ${camp.status}
            </span>
          </td>
          <td>
            <span class="badge-mode ${isAuto ? 'auto' : ''}">
              ${camp.approvalMode || 'AUTO'}
            </span>
          </td>
          <td>
            <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">
              ${camp.automationType || 'DAILY'}
            </span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11.5px;">
            ${goalDisplay}
          </td>
          <td style="font-size: 11px; color: var(--text-muted);">
            ${camp.windowLabel || camp.windowStart + '-' + camp.windowEnd}
          </td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="table-action-btn ${isActive ? 'pause' : 'play'}" data-action="toggle-campaign" data-id="${camp.id}" title="${isActive ? 'Pause Campaign' : 'Activate Campaign'}">
                ${isActive ? '⏸' : '▶'}
              </button>
              <button class="table-action-btn" data-action="enqueue-campaign" data-id="${camp.id}" title="Enqueue 1 Pin">
                ⚡
              </button>
              <button class="table-action-btn" data-action="delete-campaign" data-id="${camp.id}" title="Hapus Campaign" style="color: #f87171;">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind checkboxes
    tbody.querySelectorAll('.camp-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-id');
        if (cb.checked) {
          this.selectedCampaignIds.add(id);
        } else {
          this.selectedCampaignIds.delete(id);
        }
      });
    });
  }

  renderPreviewQueue() {
    const container = document.getElementById('queue-cards-container');
    if (!container) return;

    if (this.queue.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <h3 style="color: #fff; font-size: 16px;">Antrean Kosong</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Pilih campaign di Campaign Studio atau produk Shopee lalu klik "Acc Queue" untuk membuat antrean konten baru.</p>
        </div>
      `;
      this.updateQueueBulkBar();
      return;
    }

    // Determine interval and base time for queuing calculation
    const intervalMins = this.botStatus.intervalMinutes || 35;
    const intervalMs = intervalMins * 60 * 1000;
    
    let baseTimeMs = Date.now();
    if (this.botStatus.nextDispatchAt) {
      const nextMs = new Date(this.botStatus.nextDispatchAt).getTime();
      baseTimeMs = nextMs > Date.now() ? nextMs : Date.now();
    }

    let queuedIndex = 0;

    container.innerHTML = this.queue.map(item => {
      const isPending = item.status === 'PENDING_APPROVAL';
      const isQueued = item.status === 'QUEUED';
      const isSelected = this.selectedQueueIds.has(item.id);
      const tags = (item.hashtags || []).map(t => `<span style="font-size: 10px; color: var(--accent-orange);">${t}</span>`).join(' ');

      let scheduleHtml = '';
      if (isQueued) {
        const itemScheduleMs = item.scheduledAt ? new Date(item.scheduledAt).getTime() : (baseTimeMs + (queuedIndex * intervalMs));
        const scheduleDate = new Date(itemScheduleMs);
        const timeStr = scheduleDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        
        const diffSeconds = Math.floor((itemScheduleMs - Date.now()) / 1000);
        let relativeText = '⚡ Segera Diposting';
        if (diffSeconds > 60) {
          const mins = Math.ceil(diffSeconds / 60);
          relativeText = `⏱️ ±${mins} mnt lagi`;
        } else if (diffSeconds > 0) {
          relativeText = `⏱️ ${diffSeconds} detik lagi`;
        }

        scheduleHtml = `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 6px 10px; margin: 6px 0 2px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #34d399; font-weight: 700; display: flex; align-items: center; gap: 4px;">
              <span>📅 Jadwal:</span> <strong style="color: #fff;">${timeStr}</strong>
            </span>
            <span style="color: #a7f3d0; font-size: 10.5px; background: rgba(16, 185, 129, 0.18); padding: 1px 6px; border-radius: 4px; font-weight: 600;">
              ${relativeText}
            </span>
          </div>
        `;
        queuedIndex++;
      } else {
        scheduleHtml = `
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px; padding: 6px 10px; margin: 6px 0 2px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #fbbf24; font-weight: 600;">⏳ Belum di-Acc</span>
            <span style="color: var(--text-muted); font-size: 10px;">Klik Approve utk antrikan</span>
          </div>
        `;
      }

      return `
        <div class="queue-card ${isSelected ? 'selected' : ''}" data-id="${item.id}" style="${isSelected ? 'border-color: #f97316; box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.4);' : ''}">
          <div class="queue-card-image-wrap">
            <div style="position: absolute; top: 4px; left: 4px; z-index: 10;">
              <input type="checkbox" class="queue-card-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''} style="accent-color: var(--accent-orange); width: 16px; height: 16px; cursor: pointer; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));">
            </div>
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'}" alt="${this.escapeHtml(item.title)}" class="queue-card-image" onerror="this.src='https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'">
            <div class="queue-card-status-badge">
              <span class="badge-status ${isPending ? 'paused' : 'active'}" style="font-size: 8.5px; padding: 1px 5px;">
                ${isQueued ? 'QUEUED' : 'PENDING'}
              </span>
            </div>
            <div style="position: absolute; bottom: 3px; left: 4px; right: 4px; background: rgba(0,0,0,0.8); backdrop-filter: blur(2px); padding: 1px 4px; border-radius: 3px; font-size: 8.5px; color: var(--accent-orange); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              📌 ${this.escapeHtml(item.targetBoard || 'General')}
            </div>
          </div>
          <div class="queue-card-body">
            <div>
              <h4 class="queue-card-title" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</h4>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-muted); margin-bottom: 2px;">
                <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🎯 ${this.escapeHtml(item.campaignName || 'Shopee')}</span>
                <a href="${item.affiliateUrl || '#'}" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 600;">🔗 Link Aff ↗</a>
              </div>
            </div>
            
            ${scheduleHtml}

            <div class="queue-card-actions">
              ${isPending ? `
                <button class="btn-primary" style="padding: 4px 10px; font-size: 10.5px; background: #10b981; border-radius: 4px; width: auto;" data-action="approve-queue" data-id="${item.id}">
                  ✓ Approve
                </button>
              ` : `
                <button class="btn-primary" style="padding: 4px 8px; font-size: 10px; background: linear-gradient(135deg, #e60023, #b91c1c); border-radius: 4px; width: auto;" data-action="dispatch-queue" data-id="${item.id}" title="Publish sekarang ke Pinterest">
                  📌 Pin
                </button>
                <button class="btn-primary" style="padding: 4px 8px; font-size: 10px; background: #24a1de; border-radius: 4px; width: auto;" data-action="dispatch-telegram" data-id="${item.id}" title="Broadcast sekarang ke Telegram Channel">
                  📢 TG
                </button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 10px; border-color: rgba(255,255,255,0.25); border-radius: 4px; width: auto;" data-action="dispatch-all" data-id="${item.id}" title="Publish ke Pinterest & Telegram Sekaligus">
                  🚀 All
                </button>
              `}
              <button class="btn-secondary" style="padding: 4px 6px; font-size: 10px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); border-radius: 4px; width: auto;" data-action="remove-queue" data-id="${item.id}" title="Hapus dari antrean">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.updateQueueBulkBar();
  }

  renderLogs() {
    const container = document.getElementById('terminal-log-stream');
    if (!container) return;

    if (this.logs.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">Menunggu event worker...</div>`;
      return;
    }

    container.innerHTML = this.logs.map(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID');
      const tagClass = `tag-${log.level || 'INFO'}`;
      return `
        <div class="log-entry">
          <span class="log-time">${timeStr}</span>
          <span class="log-tag ${tagClass}">[${log.tag || log.level}]</span>
          <span class="log-message">${this.escapeHtml(log.message)}</span>
        </div>
      `;
    }).join('');
  }

  renderBotStatus() {
    const toggleBtn = document.getElementById('btn-toggle-bot');
    const statusText = document.getElementById('bot-running-status-text');

    if (toggleBtn && statusText) {
      if (this.botStatus.isRunning) {
        toggleBtn.classList.remove('paused');
        statusText.textContent = 'Worker: RUNNING';
      } else {
        toggleBtn.classList.add('paused');
        statusText.textContent = 'Worker: PAUSED';
      }
    }
  }

  renderStats(stats) {
    if (!stats) return;
    const elTotal = document.getElementById('kpi-total-pins');
    const elTotalTrend = document.getElementById('kpi-total-pins-trend');
    const elDispatched = document.getElementById('kpi-dispatched-today');
    const elDispatchedTrend = document.getElementById('kpi-dispatched-trend');
    const elQueue = document.getElementById('kpi-queue-pending');
    const elQueueTrend = document.getElementById('kpi-queue-trend');
    const elActiveCamp = document.getElementById('kpi-active-campaigns');
    const elCampTrend = document.getElementById('kpi-campaigns-trend');

    const totalPins = stats.totalPinsGenerated !== undefined ? stats.totalPinsGenerated : (this.queue?.length || 0) + (this.history?.length || 0);
    const pubToday = stats.publishedToday !== undefined ? stats.publishedToday : (this.history?.length || 0);
    const dailyCap = stats.dailyCap || 50;
    const qTotal = stats.queueTotal !== undefined ? stats.queueTotal : (this.queue?.length || 0);
    const qPending = stats.queuePending !== undefined ? stats.queuePending : (this.queue?.filter(q => q.status === 'PENDING_APPROVAL').length || 0);
    const activeCamps = stats.activeCampaignsCount !== undefined ? stats.activeCampaignsCount : (this.campaigns?.filter(c => c.status === 'ACTIVE').length || 0);
    const totalCamps = stats.totalCampaignsCount !== undefined ? stats.totalCampaignsCount : (this.campaigns?.length || 0);

    if (elTotal) elTotal.textContent = totalPins;
    if (elTotalTrend) elTotalTrend.textContent = `${pubToday} dipublish hari ini`;

    if (elDispatched) elDispatched.textContent = `${pubToday} / ${dailyCap}`;
    if (elDispatchedTrend) elDispatchedTrend.textContent = stats.botRunning ? '● Bot Active & Running' : '⏸️ Bot Paused';

    if (elQueue) elQueue.textContent = qTotal;
    if (elQueueTrend) elQueueTrend.textContent = `${qPending} butuh approval`;

    if (elActiveCamp) elActiveCamp.textContent = activeCamps;
    if (elCampTrend) elCampTrend.textContent = `${totalCamps} total campaign`;
  }

  updateQueueBadge() {
    const badge = document.getElementById('queue-nav-badge');
    if (badge) {
      badge.textContent = this.queue.length;
    }
  }

  async handleSaveCampaign() {
    const name = document.getElementById('camp-name')?.value;
    const subjects = document.getElementById('camp-subjects')?.value;
    const objectOutfit = document.getElementById('camp-object-outfit')?.value;
    const locations = document.getElementById('camp-locations')?.value;
    const vibes = document.getElementById('camp-vibes')?.value;
    const targetBoard = document.getElementById('camp-target-board')?.value;
    const goalTarget = document.getElementById('camp-goal-target')?.value;
    const automationType = document.getElementById('camp-automation-type')?.value;
    const approvalMode = document.getElementById('camp-approval-mode')?.value;
    const windowStart = document.getElementById('camp-window-start')?.value || '00:00';
    const windowEnd = document.getElementById('camp-window-end')?.value || '23:59';
    const affiliateSubId = document.getElementById('camp-subid')?.value || 'pinlume_auto';

    if (!name || !subjects) {
      this.showToast('⚠️ Nama Campaign dan Subjects wajib diisi!', 'warning');
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subjects,
          objectOutfit,
          locations,
          vibes,
          targetBoard,
          goalTarget,
          automationType,
          approvalMode,
          windowStart,
          windowEnd,
          affiliateSubId
        })
      });

      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ Campaign "${name}" berhasil dibuat!`, 'success');
        document.getElementById('new-campaign-form').reset();
        await this.fetchCampaigns();
      }
    } catch (err) {
      this.showToast(`❌ Gagal simpan campaign: ${err.message}`, 'error');
    }
  }

  async handleEnqueueSelected() {
    let ids = Array.from(this.selectedCampaignIds);
    if (ids.length === 0) {
      // If none selected, enqueue active campaigns
      ids = this.campaigns.filter(c => c.status === 'ACTIVE').map(c => c.id);
    }

    if (ids.length === 0) {
      this.showToast('⚠️ Tidak ada campaign aktif yang dipilih.', 'warning');
      return;
    }

    this.showToast(`⏳ Mengenerate konten untuk ${ids.length} campaign...`, 'info');

    try {
      const res = await fetch(`${this.apiBase}/campaigns/enqueue-selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: ids, countPerCampaign: 1 })
      });

      const data = await res.json();
      if (data.success) {
        this.showToast(`✨ Berhasil menambahkan ${data.totalEnqueued} Pin ke Preview Queue!`, 'success');
        await this.fetchQueue();
        await this.fetchCampaigns();
        this.switchTab('preview-queue');
      }
    } catch (err) {
      this.showToast(`❌ Gagal enqueue: ${err.message}`, 'error');
    }
  }

  async toggleCampaign(id) {
    try {
      const res = await fetch(`${this.apiBase}/campaigns/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Status campaign diubah: ${data.campaign.status}`, 'info');
        await this.fetchCampaigns();
      }
    } catch (e) {
      this.showToast('Gagal toggle campaign', 'error');
    }
  }

  async enqueueSingle(id) {
    try {
      this.showToast('⏳ Mengenerate Pin...', 'info');
      const res = await fetch(`${this.apiBase}/campaigns/${id}/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ Pin berhasil ditambahkan ke antrean!', 'success');
        await this.fetchQueue();
      }
    } catch (e) {
      this.showToast('Gagal enqueue Pin', 'error');
    }
  }

  async deleteCampaign(id) {
    if (!confirm('Hapus campaign ini?')) return;
    try {
      await fetch(`${this.apiBase}/campaigns/${id}`, { method: 'DELETE' });
      this.showToast('Campaign dihapus', 'info');
      await this.fetchCampaigns();
    } catch (e) {
      this.showToast('Gagal hapus campaign', 'error');
    }
  }

  async approveQueueItem(id) {
    try {
      const res = await fetch(`${this.apiBase}/queue/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDispatch: false })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ Pin di-approve dan siap diposting!', 'success');
        await this.fetchQueue();
      }
    } catch (e) {
      this.showToast('Gagal approve pin', 'error');
    }
  }

  async dispatchQueueItem(id) {
    try {
      this.showToast('📌 Mempublish Pin ke Pinterest...', 'info');
      const res = await fetch(`${this.apiBase}/queue/${id}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('✨ Pin berhasil dipublish ke Pinterest!', 'success');
        await this.fetchQueue();
        await this.fetchLogs();
      }
    } catch (e) {
      this.showToast('Gagal dispatch pin', 'error');
    }
  }

  async removeQueueItem(id) {
    try {
      await fetch(`${this.apiBase}/queue/${id}`, { method: 'DELETE' });
      await this.fetchQueue();
    } catch (e) {
      this.showToast('Gagal hapus item', 'error');
    }
  }

  async handleBatchApproveQueue() {
    try {
      const res = await fetch(`${this.apiBase}/queue/batch-approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ Berhasil meng-approve ${data.count} item!`, 'success');
        await this.fetchQueue();
      }
    } catch (e) {
      this.showToast('Gagal batch approve', 'error');
    }
  }

  updateQueueBulkBar() {
    const countSelected = document.getElementById('count-queue-selected');
    const countTotal = document.getElementById('count-queue-total');
    const cbAll = document.getElementById('checkbox-queue-select-all');
    const total = this.queue ? this.queue.length : 0;
    const selected = this.selectedQueueIds ? this.selectedQueueIds.size : 0;

    if (countSelected) countSelected.textContent = selected;
    if (countTotal) countTotal.textContent = total;
    if (cbAll) {
      cbAll.checked = total > 0 && selected === total;
      cbAll.indeterminate = selected > 0 && selected < total;
    }
  }

  handleToggleSelectAllQueue(checked) {
    if (checked) {
      this.selectedQueueIds = new Set((this.queue || []).map(q => q.id));
    } else {
      this.selectedQueueIds.clear();
    }
    this.renderPreviewQueue();
  }

  async handleClearAllQueue() {
    if (!this.queue || this.queue.length === 0) {
      this.showToast('ℹ️ Antrean Preview Queue sudah kosong.', 'info');
      return;
    }
    if (!confirm(`⚠️ Hapus SEMUA (${this.queue.length}) item dari Preview Queue? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      this.showToast('⏳ Membersihkan semua antrean...', 'info');
      let isSuccess = false;
      try {
        const res = await fetch(`${this.apiBase}/queue`, { method: 'DELETE' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) isSuccess = true;
        }
      } catch (_) {}

      // Fallback: If DELETE /api/queue returned HTML or failed, delete individual items in parallel
      if (!isSuccess) {
        await Promise.all(this.queue.map(q => fetch(`${this.apiBase}/queue/${q.id}`, { method: 'DELETE' })));
      }

      this.selectedQueueIds.clear();
      this.showToast('🧹 Semua item di Preview Queue berhasil dibersihkan!', 'success');
      await this.fetchQueue();
      await this.fetchLogs();
    } catch (err) {
      this.showToast(`❌ Gagal membersihkan antrean: ${err.message}`, 'error');
    }
  }

  async handleBatchDeleteSelectedQueue() {
    const ids = Array.from(this.selectedQueueIds || []);
    if (ids.length === 0) {
      this.showToast('⚠️ Pilih minimal satu item antrean dengan mencentang checkbox!', 'warning');
      return;
    }
    if (!confirm(`⚠️ Hapus ${ids.length} item antrean yang dipilih?`)) return;

    try {
      this.showToast(`⏳ Menghapus ${ids.length} item antrean...`, 'info');
      
      // Try batch-delete endpoint first
      let success = false;
      try {
        const res = await fetch(`${this.apiBase}/queue/batch-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) success = true;
        }
      } catch (_) {
        success = false;
      }

      // Fallback to parallel individual deletes if batch-delete returned 404/HTML (e.g. while server is deploying)
      if (!success) {
        await Promise.all(ids.map(id => fetch(`${this.apiBase}/queue/${id}`, { method: 'DELETE' })));
      }

      this.selectedQueueIds.clear();
      this.showToast(`🗑️ Berhasil menghapus ${ids.length} item terpilih!`, 'success');
      await this.fetchQueue();
      await this.fetchLogs();
    } catch (err) {
      this.showToast(`❌ Gagal menghapus item terpilih: ${err.message}`, 'error');
    }
  }

  async handleBatchApproveSelectedQueue() {
    const ids = Array.from(this.selectedQueueIds || []);
    if (ids.length === 0) {
      this.showToast('⚠️ Pilih minimal satu item antrean dengan mencentang checkbox!', 'warning');
      return;
    }

    try {
      this.showToast(`⏳ Meng-approve ${ids.length} item antrean...`, 'info');

      let success = false;
      try {
        const res = await fetch(`${this.apiBase}/queue/batch-approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) success = true;
        }
      } catch (_) {
        success = false;
      }

      // Fallback to single approve if batch endpoint returned HTML
      if (!success) {
        await Promise.all(ids.map(id => fetch(`${this.apiBase}/queue/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoDispatch: false })
        })));
      }

      this.selectedQueueIds.clear();
      this.showToast(`✅ Berhasil meng-approve ${ids.length} item terpilih!`, 'success');
      await this.fetchQueue();
      await this.fetchLogs();
    } catch (err) {
      this.showToast(`❌ Gagal approve item terpilih: ${err.message}`, 'error');
    }
  }

  async toggleBotWorker() {
    const isRunning = this.botStatus.isRunning;
    const endpoint = isRunning ? '/bot/pause' : '/bot/start';
    try {
      const res = await fetch(`${this.apiBase}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.botStatus = data.status;
        this.renderBotStatus();
        this.showToast(data.message, 'info');
      }
    } catch (e) {
      this.showToast('Gagal toggle bot worker', 'error');
    }
  }

  async clearLogs() {
    try {
      await fetch(`${this.apiBase}/logs`, { method: 'DELETE' });
      this.logs = [];
      this.renderLogs();
      this.showToast('Log dibersihkan', 'info');
    } catch (e) {
      console.error(e);
    }
  }

  async fetchConnections() {
    try {
      const res = await fetch(`${this.apiBase}/connections`);
      const data = await res.json();
      if (data.success) {
        this.connections = data.connections || {};
        this.renderConnections();
      }
    } catch (e) {
      console.warn('[PinMatrixStudio] Connections fetch error:', e);
    }
  }

  renderConnections() {
    const conn = this.connections || {};
    const tokenInput = document.getElementById('input-pinterest-token');
    const badge = document.getElementById('pinterest-conn-badge');
    const userMeta = document.getElementById('pinterest-user-meta');
    const selectBoard = document.getElementById('select-pinterest-board');

    if (tokenInput && conn.pinterestAccessToken) {
      tokenInput.value = conn.pinterestAccessToken;
    }

    if (badge) {
      if (conn.pinterestAccessToken && conn.pinterestApiConnected) {
        badge.textContent = 'CONNECTED (API v5)';
        badge.className = 'conn-status-badge connected';
      } else {
        badge.textContent = 'NOT CONNECTED';
        badge.className = 'conn-status-badge';
      }
    }

    if (userMeta && conn.pinterestUsername) {
      userMeta.innerHTML = `<span style="color:#34d399;">● Terhubung: @${this.escapeHtml(conn.pinterestUsername)}</span>`;
    }

    if (selectBoard && conn.availableBoards && conn.availableBoards.length > 0) {
      selectBoard.innerHTML = conn.availableBoards.map(b => `
        <option value="${b.id}" ${b.id === conn.pinterestBoardId ? 'selected' : ''}>
          ${this.escapeHtml(b.name)} (${b.privacy || 'PUBLIC'})
        </option>
      `).join('');
    }

    // Telegram Elements Rendering
    const tgTokenInput = document.getElementById('input-telegram-token');
    const tgChannelInput = document.getElementById('input-telegram-channel');
    const tgAutoPostToggle = document.getElementById('toggle-telegram-autopost');
    const tgBadge = document.getElementById('telegram-conn-badge');
    const tgBotMeta = document.getElementById('telegram-bot-meta');

    if (tgTokenInput && conn.telegramBotToken) {
      tgTokenInput.value = conn.telegramBotToken;
    }
    if (tgChannelInput && conn.telegramChannelId) {
      tgChannelInput.value = conn.telegramChannelId;
    }
    if (tgAutoPostToggle) {
      tgAutoPostToggle.checked = !!conn.telegramAutoPost;
    }
    if (tgBadge) {
      if (conn.telegramBotUsername) {
        tgBadge.textContent = `CONNECTED (@${conn.telegramBotUsername})`;
        tgBadge.className = 'conn-status-badge connected';
      } else {
        tgBadge.textContent = 'STANDBY';
        tgBadge.className = 'conn-status-badge';
      }
    }
    if (tgBotMeta && conn.telegramBotUsername) {
      tgBotMeta.innerHTML = `<span style="color:#34d399;">● Bot: <strong>@${this.escapeHtml(conn.telegramBotUsername)}</strong> (${this.escapeHtml(conn.telegramBotName || 'Link Affiliate')})</span>`;
    }
  }

  async handleVerifyPinterestToken() {
    const tokenInput = document.getElementById('input-pinterest-token');
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!token) {
      this.showToast('Masukkan Pinterest Access Token terlebih dahulu.', 'warning');
      return;
    }

    try {
      this.showToast('🔑 Memverifikasi token ke Pinterest API v5...', 'info');
      const res = await fetch(`${this.apiBase}/connections/pinterest/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token })
      });

      const data = await res.json();
      if (data.success) {
        this.connections = data.connections || {};
        this.renderConnections();
        this.showToast(`✨ Sukses! Terhubung ke @${data.user.username} (${data.boards.length} Boards ditemukan)`, 'success');
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (e) {
      this.showToast(`❌ Terjadi kesalahan: ${e.message}`, 'error');
    }
  }

  async handleSaveTelegramConfig() {
    const tokenInput = document.getElementById('input-telegram-token');
    const channelInput = document.getElementById('input-telegram-channel');
    const autoPostToggle = document.getElementById('toggle-telegram-autopost');

    const botToken = tokenInput ? tokenInput.value.trim() : '';
    const channelId = channelInput ? channelInput.value.trim() : '';
    const autoPost = autoPostToggle ? autoPostToggle.checked : false;

    try {
      this.showToast('💾 Menyimpan konfigurasi Telegram...', 'info');
      const res = await fetch(`${this.apiBase}/telegram/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, channelId, autoPost })
      });
      const data = await res.json();
      if (data.success) {
        this.connections = data.connections || {};
        this.renderConnections();
        this.showToast('✅ Konfigurasi Telegram berhasil disimpan!', 'success');
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (e) {
      this.showToast(`❌ Error: ${e.message}`, 'error');
    }
  }

  async handleVerifyTelegramBot() {
    const tokenInput = document.getElementById('input-telegram-token');
    const token = tokenInput ? tokenInput.value.trim() : '';

    try {
      this.showToast('🤖 Memeriksa status Bot Telegram...', 'info');
      const res = await fetch(`${this.apiBase}/telegram/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        this.connections = data.connections || {};
        this.renderConnections();
        this.showToast(`✨ Bot @${data.bot.username} (${data.bot.first_name}) aktif & siap digunakan!`, 'success');
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Bot error: ${data.error}`, 'error');
      }
    } catch (e) {
      this.showToast(`❌ Error: ${e.message}`, 'error');
    }
  }

  async handleTestTelegramChannel() {
    const channelInput = document.getElementById('input-telegram-channel');
    const tokenInput = document.getElementById('input-telegram-token');
    const chatId = channelInput ? channelInput.value.trim() : '';
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!chatId) {
      this.showToast('Masukkan Target Channel ID / Username terlebih dahulu (misal: @namachannel)', 'warning');
      return;
    }

    try {
      this.showToast(`📨 Mengirim pesan test ke ${chatId}...`, 'info');
      const res = await fetch(`${this.apiBase}/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, token })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Sukses! Pesan test berhasil masuk ke channel ${chatId}`, 'success');
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal kirim ke channel: ${data.error}`, 'error');
      }
    } catch (e) {
      this.showToast(`❌ Error: ${e.message}`, 'error');
    }
  }

  async scanShopeeActiveTab() {
    this.showToast('🔍 Memindai produk & komisi di halaman Shopee...', 'info');

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let targetTab = activeTab;

        if (!targetTab?.url?.includes('shopee')) {
          const allTabs = await chrome.tabs.query({});
          const shopeeTab = allTabs.find(t => t.url && (t.url.includes('shopee.co.id') || t.url.includes('affiliate.shopee')));
          if (shopeeTab) {
            targetTab = shopeeTab;
          }
        }

        if (targetTab && targetTab.id) {
          chrome.tabs.sendMessage(targetTab.id, { action: 'SCAN_SHOPEE_PAGE', mode: 'viewport' }, async (response) => {
            if (chrome.runtime.lastError || !response || !response.products || response.products.length === 0) {
              this.showToast('Belum ada produk terdeteksi. Scroll halaman Shopee lalu scan kembali.', 'warning');
              return;
            }

            try {
              const res = await fetch(`${this.apiBase}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: response.products })
              });

              if (res.ok) {
                await this.fetchProducts();
                await this.fetchStats();
                this.showToast(`✨ Berhasil memindai ${response.products.length} produk Shopee!`, 'success');
              } else {
                this.showToast('Gagal menyimpan hasil scan ke database.', 'error');
              }
            } catch (err) {
              console.error('Save scanned products error:', err);
              this.showToast('Gagal sinkronisasi ke server.', 'error');
            }
          });
          return;
        }
      } catch (e) {
        console.warn('Scan extension error:', e);
      }
    }

    this.showToast('Buka tab Shopee Affiliate di browser untuk memulai scan.', 'warning');
  }

  async handleBoardSelectionChange(boardId) {
    if (!boardId) return;
    try {
      await fetch(`${this.apiBase}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinterestBoardId: boardId })
      });
      this.showToast('✅ Target Board default disimpan!', 'success');
      await this.fetchConnections();
    } catch (e) {
      this.showToast('Gagal menyimpan Board', 'error');
    }
  }

  async fetchPinterestData(showToastFeedback = false) {
    try {
      if (showToastFeedback) {
        this.showToast('🔄 Membaca data langsung dari Pinterest API v5...', 'info');
      }

      const [profRes, boardsRes, pinsRes] = await Promise.allSettled([
        fetch(`${this.apiBase}/pinterest/profile`),
        fetch(`${this.apiBase}/pinterest/boards`),
        fetch(`${this.apiBase}/pinterest/pins?page_size=30`)
      ]);

      let profile = null;
      let boards = [];
      let pins = [];

      if (profRes.status === 'fulfilled' && profRes.value.ok) {
        const profData = await profRes.value.json();
        if (profData.success) profile = profData.profile;
      }

      if (boardsRes.status === 'fulfilled' && boardsRes.value.ok) {
        const boardsData = await boardsRes.value.json();
        if (boardsData.success) boards = boardsData.boards || [];
      }

      if (pinsRes.status === 'fulfilled' && pinsRes.value.ok) {
        const pinsData = await pinsRes.value.json();
        if (pinsData.success) pins = pinsData.items || [];
      }

      this.renderPinterestExplorer(profile, boards, pins);

      if (showToastFeedback) {
        if (profile || boards.length > 0 || pins.length > 0) {
          this.showToast(`✨ Sukses membaca ${boards.length} Boards & ${pins.length} Pins dari Pinterest!`, 'success');
        } else {
          this.showToast('Koneksikan token Pinterest di menu Connections terlebih dahulu.', 'warning');
        }
      }
    } catch (err) {
      console.warn('Fetch Pinterest data error:', err);
      if (showToastFeedback) {
        this.showToast('Gagal menarik data Pinterest: ' + err.message, 'error');
      }
    }
  }

  renderPinterestExplorer(profile, boards = [], pins = []) {
    const avatarEl = document.getElementById('pe-avatar');
    const usernameEl = document.getElementById('pe-username');
    const accountTypeEl = document.getElementById('pe-account-type');
    const boardsCountEl = document.getElementById('pe-boards-count');
    const pinsCountEl = document.getElementById('pe-pins-count');
    const apiStatusEl = document.getElementById('pe-api-status');
    const boardsContainer = document.getElementById('pe-boards-container');
    const pinsContainer = document.getElementById('pe-pins-container');

    if (profile) {
      if (avatarEl) {
        if (profile.profile_image) {
          avatarEl.innerHTML = `<img src="${this.escapeHtml(profile.profile_image)}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
          avatarEl.textContent = (profile.username || 'P')[0].toUpperCase();
        }
      }
      if (usernameEl) usernameEl.textContent = `@${profile.username || 'User'}`;
      if (accountTypeEl) accountTypeEl.textContent = `Tipe Akun: ${profile.account_type || 'BUSINESS'} ${profile.website_url ? `• ${profile.website_url}` : ''}`;
      if (apiStatusEl) apiStatusEl.innerHTML = '● TERKONEKSI (API v5)';
    } else {
      if (apiStatusEl) apiStatusEl.innerHTML = '<span style="color:var(--text-muted);">● Menunggu Token</span>';
    }

    if (boardsCountEl) boardsCountEl.textContent = boards.length || '-';
    if (pinsCountEl) pinsCountEl.textContent = pins.length || '-';

    // Render Boards
    if (boardsContainer) {
      if (boards.length === 0) {
        boardsContainer.innerHTML = `
          <div style="font-size: 12px; color: var(--text-muted); padding: 24px; text-align: center; grid-column: 1 / -1;">
            Belum ada Board ditemukan. Silakan hubungkan token di menu <strong>Connections</strong> lalu klik <strong>"Tarik Data Pinterest Terbaru"</strong>.
          </div>
        `;
      } else {
        boardsContainer.innerHTML = boards.map(b => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                <h4 style="color:#fff; font-size: 13.5px; font-weight:700;">${this.escapeHtml(b.name)}</h4>
                <span style="font-size: 10px; background: rgba(255,255,255,0.08); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px;">
                  ${this.escapeHtml(b.privacy || 'PUBLIC')}
                </span>
              </div>
              <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px; min-height: 28px;">
                ${this.escapeHtml(b.description || 'Tidak ada deskripsi board.')}
              </p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; font-size: 11px;">
              <span style="color: var(--accent-orange); font-weight: 600;">📌 ${b.pin_count !== undefined ? b.pin_count : '-'} Pins</span>
              <a href="https://pinterest.com" target="_blank" style="color: #60a5fa; text-decoration: none; font-size: 11px;">Buka ↗</a>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Pins
    if (pinsContainer) {
      if (pins.length === 0) {
        pinsContainer.innerHTML = `
          <div style="font-size: 12px; color: var(--text-muted); padding: 24px; text-align: center; grid-column: 1 / -1;">
            Belum ada data Pin langsung yang terbaca. Jika Anda baru membuat Pin, klik <strong>"Tarik Data Pinterest Terbaru"</strong>.
          </div>
        `;
      } else {
        pinsContainer.innerHTML = pins.map(p => {
          const imgUrl = p.media?.images?.['600x']?.url || p.media?.images?.['1200x']?.url || p.media?.images?.originals?.url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
          const linkUrl = p.link || 'https://shopee.co.id';
          const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja';

          return `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
              <div style="height: 180px; width: 100%; background: #111; position: relative;">
                <img src="${this.escapeHtml(imgUrl)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80'">
                <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); font-size: 10px; color: #fff; padding: 2px 6px; border-radius: 4px;">
                  ${createdDate}
                </div>
              </div>
              <div style="padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 13px; color: #fff; font-weight: 700; margin-bottom: 6px; line-height: 1.35;">
                    ${this.escapeHtml(p.title || 'Untitled Pin')}
                  </h4>
                  <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${this.escapeHtml(p.description || '')}
                  </p>
                </div>
                <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                  <a href="${this.escapeHtml(linkUrl)}" target="_blank" style="color: var(--accent-orange); text-decoration: none; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    🔗 ${this.escapeHtml(linkUrl.replace('https://', ''))}
                  </a>
                  <a href="https://www.pinterest.com/pin/${p.id || ''}" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
                    Buka Pin ↗
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // ==========================================
  // SHOPEE PRODUCTS & DECK (AFFILIATOR KILLER)
  // ==========================================

  async fetchProducts(showToast = false) {
    try {
      const res = await fetch(`${this.apiBase}/products`);
      const data = await res.json();
      this.products = data.data || [];

      // Update badge
      const badge = document.getElementById('products-nav-badge');
      if (badge) badge.textContent = this.products.length;

      const countAll = document.getElementById('count-filter-all');
      if (countAll) countAll.textContent = this.products.length;

      this.renderProducts();

      if (showToast) {
        this.showToast(`✅ ${this.products.length} produk Shopee termuat.`, 'success');
      }
    } catch (err) {
      console.warn('[Shopee] Fetch products error:', err);
    }
  }

  renderProducts() {
    const container = document.getElementById('shopee-products-grid');
    if (!container) return;

    let filtered = [...this.products];

    // Filter counts
    const freshCount = this.products.filter(p => !p.isEnqueued && p.status !== 'Queued').length;
    const queuedCount = this.products.filter(p => p.isEnqueued || p.status === 'Queued').length;
    const countFreshEl = document.getElementById('count-filter-fresh');
    const countQueuedEl = document.getElementById('count-filter-queued');
    const countAllEl = document.getElementById('count-filter-all');
    if (countFreshEl) countFreshEl.textContent = String(freshCount);
    if (countQueuedEl) countQueuedEl.textContent = String(queuedCount);
    if (countAllEl) countAllEl.textContent = String(this.products.length);

    // Filter type
    if (this.productFilter === 'fresh') {
      filtered = filtered.filter(p => !p.isEnqueued && p.status !== 'Queued');
    } else if (this.productFilter === 'queued') {
      filtered = filtered.filter(p => p.isEnqueued || p.status === 'Queued');
    } else if (this.productFilter === 'komisi-xtra') {
      filtered = filtered.filter(p => p.hasKomisiXtra || (p.commissionPercent && p.commissionPercent >= 20));
    } else if (this.productFilter === 'star-mall') {
      filtered = filtered.filter(p => p.shopType === 'Mall' || p.shopType === 'Star' || p.shopType === 'Star+');
    } else if (this.productFilter === 'high-rating') {
      filtered = filtered.filter(p => (parseFloat(p.rating) || 0) >= 4.8);
    }

    // Search query
    if (this.productSearch) {
      filtered = filtered.filter(p => 
        (p.title || '').toLowerCase().includes(this.productSearch) ||
        (p.shopName || '').toLowerCase().includes(this.productSearch)
      );
    }

    // Update studio batch selection counters
    const countSelectedEl = document.getElementById('count-studio-selected');
    const countTotalEl = document.getElementById('count-studio-total');
    const selectAllCheckbox = document.getElementById('checkbox-studio-select-all');
    if (countSelectedEl) countSelectedEl.textContent = String(this.selectedStudioProductIds.size);
    if (countTotalEl) countTotalEl.textContent = String(filtered.length);
    if (selectAllCheckbox) selectAllCheckbox.checked = this.selectedStudioProductIds.size === filtered.length && filtered.length > 0;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 12px;">🛒</div>
          <div style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Belum Ada Produk Shopee yang Sesuai</div>
          <p style="font-size: 12px; margin-bottom: 16px;">Klik tombol "✨ Muat Produk Viral" untuk memasukkan contoh produk atau scan Shopee dari ekstensi browser.</p>
          <button class="btn-primary" style="display: inline-block; width: auto;" onclick="window.studio.handleSeedProducts()">
            ✨ Muat Produk Viral
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(prod => {
      const prodId = prod.id || prod.itemId;
      const isSelected = this.selectedStudioProductIds.has(prodId);
      const img = prod.imageUrl || prod.galleryImages?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
      const priceDiscounted = (prod.discountedPrice || 0).toLocaleString('id-ID');
      const priceOrig = prod.originalPrice ? (prod.originalPrice).toLocaleString('id-ID') : null;
      const commRp = prod.estimatedCommissionRp ? `+Rp ${(prod.estimatedCommissionRp).toLocaleString('id-ID')}` : (prod.commissionRate || 'Komisi XTRA');
      const isMall = prod.shopType === 'Mall';
      const isStar = prod.shopType === 'Star' || prod.shopType === 'Star+';

      return `
        <div class="shopee-card ${isSelected ? 'selected' : ''}" data-product-id="${this.escapeHtml(prodId)}" style="${isSelected ? 'border-color: #10b981; box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.4);' : ''}">
          <div class="shopee-card-img-wrap" style="position: relative;">
            <div style="position: absolute; top: 8px; left: 8px; z-index: 20; background: rgba(0,0,0,0.6); padding: 4px; border-radius: 6px; display: flex; align-items: center;">
              <input type="checkbox" class="studio-product-checkbox" data-id="${this.escapeHtml(prodId)}" ${isSelected ? 'checked' : ''} style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;">
            </div>
            <img src="${this.escapeHtml(img)}" alt="${this.escapeHtml(prod.title)}" class="shopee-card-img" onerror="this.src='https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80'">
            <div class="shopee-badge-top-left" style="margin-left: 32px;">
              ${isMall ? '<span class="badge-tag-mall">MALL</span>' : ''}
              ${isStar ? '<span class="badge-tag-star">STAR+</span>' : ''}
            </div>
            ${prod.hasKomisiXtra ? `<span class="badge-tag-komisi">🔥 ${this.escapeHtml(prod.commissionRate || 'Komisi XTRA')}</span>` : ''}
          </div>

          <div class="shopee-card-body">
            <div>
              <h3 class="shopee-card-title" title="${this.escapeHtml(prod.title)}">
                ${this.escapeHtml(prod.title)}
              </h3>

              <div class="shopee-price-row">
                <span class="shopee-price-current">Rp ${priceDiscounted}</span>
                ${priceOrig ? `<span class="shopee-price-orig">Rp ${priceOrig}</span>` : ''}
              </div>

              <div class="shopee-comm-est">
                💰 Komisi Est: <strong>${commRp}</strong>
              </div>

              <div class="shopee-meta-row">
                <span>⭐ ${prod.rating || '4.8'} (${this.escapeHtml(prod.soldCount || 'Terjual')})</span>
                <span>📍 ${this.escapeHtml(prod.shopLocation || prod.shopName || 'Shopee ID')}</span>
              </div>
            </div>

            <div class="shopee-card-actions">
              <button class="btn-card-action btn-card-matrix" title="Acc & Masukkan produk ini ke antrean Matrix AI" data-action="enqueue-matrix" data-id="${this.escapeHtml(prodId)}" style="color: #10b981; border-color: rgba(16, 185, 129, 0.3);">
                📥 Acc Queue
              </button>
              <button class="btn-card-action btn-card-telegram" title="Kirim produk ke Channel Telegram" data-action="post-telegram" data-id="${this.escapeHtml(prodId)}" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
                📢 TG
              </button>
              <button class="btn-card-action btn-card-pin-direct" title="Langsung posting ke Pinterest" data-action="post-pinterest" data-id="${this.escapeHtml(prodId)}">
                📌 Pin
              </button>
              <button class="btn-card-action btn-card-sheets" title="Simpan ke Google Sheets" data-action="save-sheets" data-id="${this.escapeHtml(prodId)}">
                📊
              </button>
              <button class="btn-card-action" title="Edit / Pasang Link Affiliate Shopee" data-action="edit-product-link" data-id="${this.escapeHtml(prodId)}" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.3);">
                🔗
              </button>
              <button class="btn-card-action btn-card-delete" title="Hapus dari daftar produk" data-action="delete-product" data-id="${this.escapeHtml(prodId)}">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach checkbox listeners
    container.querySelectorAll('.studio-product-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedStudioProductIds.add(id);
        } else {
          this.selectedStudioProductIds.delete(id);
        }
        if (countSelectedEl) countSelectedEl.textContent = String(this.selectedStudioProductIds.size);
        if (selectAllCheckbox) selectAllCheckbox.checked = this.selectedStudioProductIds.size === this.products.length && this.products.length > 0;
        const card = container.querySelector(`.shopee-card[data-product-id="${id}"]`);
        if (card) {
          card.classList.toggle('selected', e.target.checked);
          card.style.borderColor = e.target.checked ? '#10b981' : '';
          card.style.boxShadow = e.target.checked ? '0 0 0 1px rgba(16, 185, 129, 0.4)' : '';
        }
      });
    });
  }

  async handleBatchEnqueueProducts() {
    const selectedIds = Array.from(this.selectedStudioProductIds);
    if (selectedIds.length === 0) {
      this.showToast('Centang minimal 1 produk pada kartu untuk Acc ke Queue', 'info');
      return;
    }

    this.showToast(`📥 Memasukkan ${selectedIds.length} produk ke Antrean Matrix...`, 'info');

    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`${this.apiBase}/products/${id}/enqueue-matrix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          const prod = this.products.find(p => (p.id || p.itemId) === id);
          if (prod) {
            prod.isEnqueued = true;
            prod.status = 'Queued';
            prod.queuedAt = new Date().toISOString();
          }
        }
      } catch (err) {
        console.warn('Batch enqueue error:', err);
      }
    }

    this.selectedStudioProductIds.clear();

    await fetch(`${this.apiBase}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: this.products })
    }).catch(() => {});

    await this.fetchQueue();
    this.renderProducts();
    this.showToast(`🎉 ${successCount} produk di-Acc & dipindahkan ke Antrean Matrix!`, 'success');
  }

  async handleBatchTelegramProducts() {
    const selectedIds = Array.from(this.selectedStudioProductIds);
    if (selectedIds.length === 0) {
      this.showToast('Centang minimal 1 produk untuk broadcast ke Telegram', 'info');
      return;
    }

    this.showToast(`📢 Memulai broadcast ${selectedIds.length} produk ke Telegram...`, 'info');

    let sent = 0;
    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      try {
        const res = await fetch(`${this.apiBase}/products/${id}/publish-telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.success) sent++;
        // Anti-flood delay 1.5s
        if (i < selectedIds.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        console.warn('Batch TG error:', err);
      }
    }

    this.selectedStudioProductIds.clear();
    this.renderProducts();
    this.showToast(`🎉 Selesai! ${sent} produk berhasil di-broadcast ke Telegram Channel!`, 'success');
  }

  async handleBatchDeleteProducts() {
    const selectedIds = Array.from(this.selectedStudioProductIds);
    if (selectedIds.length === 0) {
      this.showToast('Centang produk yang ingin dihapus', 'info');
      return;
    }

    if (!confirm(`Hapus ${selectedIds.length} produk terpilih?`)) return;

    this.products = this.products.filter(p => !selectedIds.includes(p.id || p.itemId));
    this.selectedStudioProductIds.clear();

    try {
      await fetch(`${this.apiBase}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: this.products })
      });
      this.renderProducts();
      this.showToast('Produk terpilih berhasil dihapus', 'info');
    } catch (e) {
      this.showToast('Gagal menghapus produk', 'error');
    }
  }

  async enqueueProductToMatrix(productId) {
    try {
      this.showToast('Memasukkan produk ke Antrean Matrix...', 'info');
      const res = await fetch(`${this.apiBase}/products/${productId}/enqueue-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        const prod = this.products.find(p => (p.id || p.itemId) === productId);
        if (prod) {
          prod.isEnqueued = true;
          prod.status = 'Queued';
          prod.queuedAt = new Date().toISOString();
        }
        this.selectedStudioProductIds.delete(productId);
        await fetch(`${this.apiBase}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: this.products })
        }).catch(() => {});

        this.showToast('✅ Produk di-Acc & dipindahkan ke Preview Queue!', 'success');
        await this.fetchQueue();
        this.renderProducts();
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async editProductLink(productId) {
    const prod = this.products.find(p => (p.id || p.itemId) === productId);
    if (!prod) return;

    let activeModalLink = null;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let targetTab = activeTab;
        if (!targetTab?.url?.includes('shopee')) {
          const allTabs = await chrome.tabs.query({});
          targetTab = allTabs.find(t => t.url && (t.url.includes('shopee.co.id') || t.url.includes('affiliate.shopee')));
        }
        if (targetTab && targetTab.id) {
          const res = await new Promise(resolve => {
            chrome.tabs.sendMessage(targetTab.id, { action: 'GET_ACTIVE_MODAL_SHORTLINK' }, (resp) => {
              if (chrome.runtime.lastError) resolve(null);
              else resolve(resp);
            });
          });
          if (res && res.success && res.shortlink) {
            activeModalLink = res.shortlink;
          }
        }
      } catch (e) {}
    }

    if (activeModalLink) {
      prod.affiliateUrl = activeModalLink;
      prod.productUrl = activeModalLink;
      try {
        await fetch(`${this.apiBase}/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateUrl: activeModalLink, productUrl: activeModalLink })
        });
        await fetch(`${this.apiBase}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: this.products })
        });
        this.renderProducts();
        this.showToast(`🎯 Berhasil menangkap link affiliate dari Shopee: ${activeModalLink}`, 'success');
        return;
      } catch (e) {}
    }

    const currentLink = prod.affiliateUrl?.includes('s.shopee.co.id') ? prod.affiliateUrl : '';
    const newLink = prompt('Masukkan Link Affiliate Shopee (contoh: https://s.shopee.co.id/xxxxxx):', currentLink);
    if (newLink && newLink.trim().startsWith('http')) {
      prod.affiliateUrl = newLink.trim();
      prod.productUrl = newLink.trim();
      try {
        await fetch(`${this.apiBase}/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateUrl: newLink.trim(), productUrl: newLink.trim() })
        });
        await fetch(`${this.apiBase}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: this.products })
        });
        this.renderProducts();
        this.showToast('✅ Link Affiliate berhasil diperbarui!', 'success');
      } catch (e) {
        this.showToast('Gagal menyimpan link affiliate', 'error');
      }
    }
  }

  async postProductToPinterest(productId) {
    try {
      const prod = this.products.find(p => p.id === productId || p.itemId === productId);
      if (!prod) return;

      this.showToast('Memublikasikan langsung ke Pinterest...', 'info');
      const queueItemRes = await fetch(`${this.apiBase}/products/${productId}/enqueue-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const queueData = await queueItemRes.json();

      if (queueData.success && queueData.queueItem) {
        const dispatchRes = await fetch(`${this.apiBase}/queue/${queueData.queueItem.id}/dispatch`, {
          method: 'POST'
        });
        const dispatchData = await dispatchRes.json();
        if (dispatchData.success) {
          this.showToast(`🎉 Berhasil diposting ke Pinterest! URL: ${dispatchData.pinUrl || 'Published'}`, 'success');
          await this.fetchQueue();
          await this.fetchLogs();
        } else {
          this.showToast(`⚠️ Enqueued tapi dispatch gagal: ${dispatchData.error}`, 'warning');
        }
      }
    } catch (err) {
      this.showToast(`❌ Error post Pinterest: ${err.message}`, 'error');
    }
  }

  async postProductToTelegram(productId) {
    try {
      const prod = this.products.find(p => p.id === productId || p.itemId === productId);
      if (!prod) return;

      this.showToast('📢 Mengirim produk ke Channel Telegram...', 'info');
      const res = await fetch(`${this.apiBase}/products/${productId}/publish-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Berhasil broadcast ke Telegram Channel! ${data.result?.postUrl ? `Link: ${data.result.postUrl}` : ''}`, 'success');
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal kirim ke Telegram: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error Telegram: ${err.message}`, 'error');
    }
  }

  async dispatchQueueItemToTelegram(id) {
    try {
      this.showToast('📢 Mengirim item antrean ke Telegram...', 'info');
      const res = await fetch(`${this.apiBase}/queue/${id}/dispatch-telegram`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('🎉 Berhasil dikirim ke Channel Telegram!', 'success');
        await this.fetchQueue();
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal Telegram: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async dispatchQueueItemMultiChannel(id) {
    try {
      this.showToast('🚀 Memublikasikan serentak ke Pinterest & Telegram...', 'info');
      const res = await fetch(`${this.apiBase}/queue/${id}/dispatch-all`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('🎉 Berhasil dipublikasikan ke Multi-Channel!', 'success');
        await this.fetchQueue();
        await this.fetchLogs();
      } else {
        this.showToast(`❌ Gagal Multi-Channel: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async saveProductToSheets(productId) {
    try {
      const prod = this.products.find(p => p.id === productId || p.itemId === productId);
      if (!prod) return;

      this.showToast('Menyimpan produk ke Spreadsheet & Google Sheets...', 'info');
      const res = await fetch(`${this.apiBase}/sheets/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: prod })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ Berhasil tersimpan di Excel & Google Sheets!', 'success');
        await this.fetchSheetsData();
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Yakin ingin menghapus produk ini dari daftar?')) return;
    try {
      const res = await fetch(`${this.apiBase}/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        this.products = this.products.filter(p => p.id !== productId && p.itemId !== productId);
        this.renderProducts();
        this.showToast('🗑️ Produk dihapus', 'info');
      }
    } catch (err) {
      this.showToast(`❌ Error hapus: ${err.message}`, 'error');
    }
  }

  async handleSeedProducts() {
    try {
      this.showToast('Memuat produk viral rekomendasi...', 'info');
      await this.fetchProducts(true);
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async scanShopeeActiveTab() {
    this.showToast('🔍 Memindai layar produk Shopee di tab browser...', 'info');

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.id) {
          this.showToast('⚠️ Tidak ada tab aktif yang ditemukan.', 'warning');
          return;
        }

        const tabUrl = activeTab.url || '';
        if (!tabUrl.includes('shopee.co.id') && !tabUrl.includes('affiliate.shopee')) {
          this.showToast('⚠️ Buka halaman Shopee / Shopee Affiliate Center di sebelah kiri terlebih dahulu!', 'warning');
          return;
        }

        // Send SCAN_SHOPEE_PAGE to content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'SCAN_SHOPEE_PAGE', mode: 'all' }, async (response) => {
          if (chrome.runtime.lastError || !response) {
            console.log('[Scanner] Injecting content script and retrying...', chrome.runtime.lastError?.message);
            try {
              if (chrome.scripting && chrome.scripting.executeScript) {
                await chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ['scripts/content.js']
                });

                // Retry message
                chrome.tabs.sendMessage(activeTab.id, { action: 'SCAN_SHOPEE_PAGE', mode: 'all' }, async (retryRes) => {
                  if (retryRes && retryRes.success && retryRes.products?.length > 0) {
                    await this.saveScrapedProducts(retryRes.products);
                  } else {
                    this.showToast('⚠️ Tidak ada produk Shopee terdeteksi pada tampilan saat ini. Coba scroll halaman Shopee sedikit lalu klik scan kembali.', 'warning');
                  }
                });
              } else {
                this.showToast('⚠️ Reload tab Shopee lalu coba klik Scan lagi.', 'warning');
              }
            } catch (injErr) {
              this.showToast(`❌ Gagal terhubung ke tab Shopee: ${injErr.message}`, 'error');
            }
            return;
          }

          if (response.success && response.products && response.products.length > 0) {
            await this.saveScrapedProducts(response.products);
          } else {
            this.showToast('⚠️ Tidak ada produk Shopee terdeteksi pada tampilan saat ini. Coba scroll halaman Shopee sedikit lalu klik scan kembali.', 'warning');
          }
        });
      } catch (err) {
        this.showToast(`❌ Error scanning: ${err.message}`, 'error');
      }
    } else {
      this.showToast('ℹ️ Scanner berjalan langsung melalui Chrome Extension sidepanel.', 'info');
    }
  }

  async saveScrapedProducts(products) {
    try {
      this.showToast(`Menyimpan ${products.length} produk Shopee ke database...`, 'info');
      const res = await fetch(`${this.apiBase}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Berhasil menyimpan ${products.length} produk dari Shopee!`, 'success');
        await this.fetchProducts();
        this.switchTab('shopee-products');
      } else {
        this.showToast(`❌ Gagal menyimpan produk: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error menyimpan produk: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // SHEETS & DATABASE HUB
  // ==========================================

  async fetchSheetsData() {
    try {
      const res = await fetch(`${this.apiBase}/products/history`);
      const data = await res.json();
      const records = data.data || [];

      const countEl = document.getElementById('sheets-records-count');
      if (countEl) countEl.textContent = `Total: ${records.length} baris`;

      const tbody = document.getElementById('sheets-table-body');
      if (!tbody) return;

      if (records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
              Belum ada riwayat produk tersimpan di database spreadsheet.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = records.map(r => {
        const time = r.timestamp ? new Date(r.timestamp).toLocaleString('id-ID') : 'Baru saja';
        const title = r.title || r.pinTitle || '-';
        const price = r.discountedPrice ? `Rp ${Number(r.discountedPrice).toLocaleString('id-ID')}` : '-';
        const board = r.board || 'Default Board';
        const affUrl = r.affiliateUrl || r.productUrl || '#';
        const status = r.status || 'Saved';

        return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${time}</td>
            <td style="font-weight: 600; color: #fff; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${this.escapeHtml(title)}
            </td>
            <td style="color: #10B981; font-weight: 700; font-family: var(--font-mono);">${price}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.06); color: #e2e8f0; font-size: 11px;">${this.escapeHtml(board)}</span></td>
            <td>
              <a href="${this.escapeHtml(affUrl)}" target="_blank" style="color: var(--accent-orange); text-decoration: none; font-size: 11px;">
                Link Produk ↗
              </a>
            </td>
            <td>
              <span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 11px;">${this.escapeHtml(status)}</span>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.warn('[Sheets] Fetch data error:', err);
    }
  }

  async handleSaveSheetsWebhook() {
    const input = document.getElementById('input-sheets-webhook-url');
    if (!input || !input.value.trim()) {
      this.showToast('Masukkan URL Apps Script Webhook terlebih dahulu', 'warning');
      return;
    }

    try {
      this.showToast('Menyimpan & testing Google Sheets Webhook...', 'info');
      const res = await fetch(`${this.apiBase}/sheets/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: input.value.trim() })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ Google Sheets Webhook terhubung & aktif!', 'success');
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async testConnection(type) {
    try {
      this.showToast(`Testing koneksi ${type}...`, 'info');
      const res = await fetch(`${this.apiBase}/connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ ${data.result.service}: ${data.result.account || data.result.status}`, 'success');
      } else {
        this.showToast(`❌ Gagal: ${data.error}`, 'error');
      }
    } catch (e) {
      this.showToast(`❌ Gagal test koneksi: ${e.message}`, 'error');
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Clean previous toasts to prevent stacking spam
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Truncate message if too long to prevent taking up screen
    let displayMsg = String(message || '');
    if (displayMsg.length > 110) {
      displayMsg = displayMsg.substring(0, 107) + '...';
    }
    
    toast.innerHTML = `<span class="toast-text">${displayMsg}</span><span class="toast-close">×</span>`;

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 200);
    });

    container.appendChild(toast);

    // Auto dismiss after 2.6 seconds
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 200);
      }
    }, 2600);
  }

  async handleTestStudioBackend() {
    const input = document.getElementById('setting-studio-backend-url');
    const status = document.getElementById('backend-conn-status');
    let rawUrl = (input ? input.value : '').trim();
    if (!rawUrl) {
      this.showToast('⚠️ Masukkan URL backend terlebih dahulu!', 'warning');
      return;
    }

    // Auto-prepend https:// if user omitted protocol
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
      if (input) input.value = rawUrl;
    }

    const cleanUrl = rawUrl.replace(/\/+$/, '');
    const testEndpoint = cleanUrl.endsWith('/api') ? `${cleanUrl}/health` : `${cleanUrl}/api/health`;

    this.showToast(`Menguji koneksi ke ${cleanUrl}...`, 'info');
    try {
      const res = await fetch(testEndpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (status) {
          status.textContent = '● Online (Terhubung)';
          status.style.color = 'var(--accent-green)';
        }
        this.showToast(`✅ Server Online & Terhubung: ${cleanUrl}`, 'success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      if (status) {
        status.textContent = '● Gagal Terhubung';
        status.style.color = '#ef4444';
      }
      this.showToast(`❌ Gagal terhubung (${e.message}). Pastikan URL memakai https://`, 'error');
    }
  }

  async handleSaveSettings() {
    const input = document.getElementById('setting-studio-backend-url');
    const status = document.getElementById('backend-conn-status');
    if (input) {
      let rawUrl = input.value.trim();
      if (rawUrl) {
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = `https://${rawUrl}`;
          input.value = rawUrl;
        }
        const clean = rawUrl.replace(/\/+$/, '');
        localStorage.setItem('pinmatrix_backend_url', clean);
        this.apiBase = clean.endsWith('/api') ? clean : `${clean}/api`;
        if (status) {
          status.textContent = clean.includes('localhost') ? '● Localhost / Auto' : '● Cloud / Hosted';
          status.style.color = clean.includes('localhost') ? 'var(--accent-green)' : '#38bdf8';
        }
        await this.fetchAllData();
      } else {
        localStorage.removeItem('pinmatrix_backend_url');
        this.apiBase = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
          ? `${window.location.origin}/api`
          : 'http://localhost:3000/api';
        await this.fetchAllData();
      }
    }
    this.showToast('✅ Semua pengaturan berhasil disimpan & disinkronkan!', 'success');
  }

  // ==========================================
  // REAL-TIME LIVE POST COUNTDOWN TIMER
  // ==========================================
  startLiveCountdown() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      const timerEl = document.getElementById('bot-countdown-text');
      const badgeWrap = document.getElementById('topbar-countdown-wrap');
      if (!timerEl) return;

      if (!this.botStatus || this.botStatus.isRunning === false) {
        timerEl.textContent = 'PAUSED';
        timerEl.style.color = '#ef4444';
        if (badgeWrap) badgeWrap.style.opacity = '0.6';
        return;
      }

      if (badgeWrap) badgeWrap.style.opacity = '1';

      if (this.botStatus && this.botStatus.isProcessing) {
        timerEl.textContent = 'POSTING...';
        timerEl.style.color = '#34d399';
        return;
      }

      // Check QUEUED items from queue or botStatus
      const queuedItems = (this.queue || []).filter(q => q.status === 'QUEUED');
      let targetIso = this.botStatus?.nextDispatchAt || null;
      if (queuedItems.length > 0 && queuedItems[0].scheduledAt) {
        targetIso = queuedItems[0].scheduledAt;
      }

      if (targetIso) {
        const targetMs = new Date(targetIso).getTime();
        const diffSeconds = Math.floor((targetMs - Date.now()) / 1000);

        if (diffSeconds <= 0) {
          timerEl.textContent = '⚡ POSTING SEGERA';
          timerEl.style.color = '#34d399';
        } else {
          const mins = Math.floor(diffSeconds / 60);
          const secs = diffSeconds % 60;
          timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          timerEl.style.color = '#fff';
        }
      } else if (queuedItems.length === 0) {
        timerEl.textContent = 'IDLE (Kosong)';
        timerEl.style.color = 'var(--text-muted)';
      } else {
        const mins = this.botStatus?.intervalMinutes || 35;
        timerEl.textContent = `${mins}:00`;
        timerEl.style.color = '#fff';
      }
    }, 1000);
  }

  // ==========================================
  // UNIFIED MULTI-CHANNEL HISTORY (TELEGRAM & PINTEREST)
  // ==========================================
  async fetchHistory(showToast = false) {
    try {
      const res = await fetch(`${this.apiBase}/history`);
      const data = await res.json();
      if (data.success) {
        this.history = data.history || [];
        this.renderHistory();
        if (showToast) this.showToast('🔄 Riwayat publikasi diperbarui', 'info');
      }
    } catch (e) {
      console.error('[Studio History Error]', e);
    }
  }

  renderHistory() {
    const tbody = document.getElementById('history-table-body');
    const countAll = document.getElementById('count-hist-all');
    const countTg = document.getElementById('count-hist-tg');
    const countPin = document.getElementById('count-hist-pin');

    if (countAll) countAll.textContent = this.history.length;
    if (countTg) countTg.textContent = this.history.filter(h => (h.platform || '').toUpperCase() === 'TELEGRAM').length;
    if (countPin) countPin.textContent = this.history.filter(h => (h.platform || '').toUpperCase() === 'PINTEREST' || !h.platform).length;

    if (!tbody) return;

    let filtered = this.history;
    if (this.historyFilter && this.historyFilter !== 'all') {
      filtered = this.history.filter(h => (h.platform || 'PINTEREST').toUpperCase() === this.historyFilter.toUpperCase());
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 28px; color: var(--text-muted);">Belum ada riwayat publikasi ${this.historyFilter !== 'all' ? `untuk ${this.historyFilter}` : ''}.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const dateStr = item.publishedAt || item.createdAt || new Date().toISOString();
      const formattedTime = new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      const isTelegram = (item.platform || '').toUpperCase() === 'TELEGRAM';
      const platformBadge = isTelegram 
        ? `<span class="badge-status" style="background: rgba(36, 161, 222, 0.15); color: #38bdf8; border: 1px solid rgba(36, 161, 222, 0.35); font-weight: 700;">📢 Telegram <span style="font-size: 10px; opacity: 0.85;">(${item.channelId || '@channel'})</span></span>`
        : `<span class="badge-status" style="background: rgba(230, 0, 35, 0.15); color: #f87171; border: 1px solid rgba(230, 0, 35, 0.35); font-weight: 700;">📌 Pinterest <span style="font-size: 10px; opacity: 0.85;">[${item.board || 'General'}]</span></span>`;

      let linkHtml = '-';
      if (item.telegramPostUrl) {
        linkHtml = `<a href="${item.telegramPostUrl}" target="_blank" style="color: #38bdf8; font-weight: 600; text-decoration: none;">↗ Buka Telegram</a>`;
      } else if (item.pinterestPinUrl) {
        linkHtml = `<a href="${item.pinterestPinUrl}" target="_blank" style="color: #f87171; font-weight: 600; text-decoration: none;">↗ Buka Pin</a>`;
      } else if (item.affiliateUrl) {
        linkHtml = `<a href="${item.affiliateUrl}" target="_blank" style="color: #60a5fa; font-weight: 600; text-decoration: none;">🔗 Link Aff</a>`;
      }

      return `
        <tr>
          <td style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">${formattedTime}</td>
          <td>${platformBadge}</td>
          <td style="font-weight: 600; color: #fff; font-size: 13px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(item.title || '')}">
            ${this.escapeHtml(item.title || 'Produk Promo')}
          </td>
          <td><span class="badge-status active">PUBLISHED</span></td>
          <td>${linkHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async handleClearHistory() {
    if (confirm('Hapus seluruh riwayat publikasi (Telegram & Pinterest)?')) {
      try {
        const res = await fetch(`${this.apiBase}/history`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          this.history = [];
          this.renderHistory();
          this.showToast('🗑️ Seluruh riwayat publikasi berhasil dibersihkan', 'success');
        }
      } catch (e) {
        this.showToast('Gagal membersihkan riwayat: ' + e.message, 'error');
      }
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Global instance
window.addEventListener('DOMContentLoaded', () => {
  window.studio = new PinMatrixStudio();
});
