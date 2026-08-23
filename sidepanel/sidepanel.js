/**
 * Affiliator Killer - Side Panel UI Controller (v2.1 Redesign)
 * Full Multi-Model AI + Shopee Affiliate Center Scraper + Excel & Sheets Auto-Sync
 */
import { SAMPLE_SHOPEE_PRODUCTS, DEFAULT_SETTINGS } from './mock-data.js';

class AffiliatorKillerApp {
  constructor() {
    this.products = [];
    this.selectedProductIds = new Set();
    this.activeAiProductId = null;
    this.history = [];
    this.backendOnline = false;
    this.backendUrl = 'http://localhost:3000';
    this.settings = { ...DEFAULT_SETTINGS, backendUrl: 'http://localhost:3000', useBackend: true };

    this.init();
  }

  async init() {
    await this.loadStoredSettings();
    await this.loadStoredHistory();
    this.applyTheme(this.settings.theme);

    // Initial products population
    await this.loadInitialProducts();

    // DOM Elements & Event Listeners
    this.cacheDomElements();
    this.bindEvents();
    this.renderProducts();
    this.renderHistory();
    this.populateSettingsForm();
    this.checkActiveShopeeTab();
    
    // Check Backend Server Status
    await this.checkBackendStatus();

    // Select first product for AI Studio by default if available
    if (this.products.length > 0) {
      this.selectProductForAi(this.products[0].id);
    }
  }

  // --- Backend Health Checker ---
  async checkBackendStatus() {
    const url = this.settings.backendUrl || this.backendUrl;
    try {
      const res = await fetch(`${url}/api/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        this.backendOnline = true;
        if (this.backendStatusPill) {
          this.backendStatusPill.className = 'status-chip status-ready';
          this.backendStatusText.textContent = 'Server Online';
        }
        console.log('[Affiliator Killer] Backend connected at:', url);
        return true;
      }
    } catch (e) {
      this.backendOnline = false;
      if (this.backendStatusPill) {
        this.backendStatusPill.className = 'status-chip status-not-ready';
        this.backendStatusText.textContent = 'Browser Mode';
      }
    }
    return false;
  }

  // --- Storage & State Loading ---
  async loadStoredSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['affiliator_settings']);
        if (stored.affiliator_settings) {
          this.settings = { ...DEFAULT_SETTINGS, ...stored.affiliator_settings };
        }
      } catch (e) {
        console.warn('Storage read error:', e);
      }
    } else {
      const local = localStorage.getItem('affiliator_settings');
      if (local) {
        try { this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(local) }; } catch (e) {}
      }
    }
  }

  async saveSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ affiliator_settings: this.settings });
    } else {
      localStorage.setItem('affiliator_settings', JSON.stringify(this.settings));
    }
  }

  async loadStoredHistory() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['affiliator_history']);
        if (stored.affiliator_history) {
          this.history = stored.affiliator_history;
        }
      } catch (e) {}
    } else {
      const local = localStorage.getItem('affiliator_history');
      if (local) {
        try { this.history = JSON.parse(local); } catch (e) {}
      }
    }
  }

  async saveHistory() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ affiliator_history: this.history });
    } else {
      localStorage.setItem('affiliator_history', JSON.stringify(this.history));
    }
  }

  async loadInitialProducts() {
    // If backend is online, try fetching from backend DB
    if (this.settings.useBackend) {
      try {
        const res = await fetch(`${this.settings.backendUrl}/api/products`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            this.products = json.data;
            return;
          }
        }
      } catch (e) {}
    }

    // Local storage fallback
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['affiliator_scraped_products']);
        if (stored.affiliator_scraped_products && stored.affiliator_scraped_products.length > 0) {
          this.products = stored.affiliator_scraped_products;
          return;
        }
      } catch (e) {}
    }

    // Fallback to sample data for interactive preview
    this.products = [...SAMPLE_SHOPEE_PRODUCTS];
  }

  async saveProductsToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ affiliator_scraped_products: this.products });
    }

    // Sync to backend DB if available
    if (this.backendOnline && this.settings.useBackend) {
      try {
        await fetch(`${this.settings.backendUrl}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: this.products })
        });
      } catch (e) {}
    }
  }

  // --- DOM Caching ---
  cacheDomElements() {
    // Header & Tabs
    this.themeToggleBtn = document.getElementById('btn-theme-toggle');
    this.headerSettingsBtn = document.getElementById('btn-header-settings');
    this.shopeeStatusPill = document.getElementById('shopee-status-pill');
    this.shopeeStatusText = document.getElementById('shopee-status-text');
    this.backendStatusPill = document.getElementById('backend-status-pill');
    this.backendStatusText = document.getElementById('backend-status-text');
    this.tabButtons = document.querySelectorAll('.tab-item');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.tabCountProducts = document.getElementById('tab-count-products');

    // Tab 1: Product Deck
    this.btnScanViewport = document.getElementById('btn-scan-viewport');
    this.btnScanFullpage = document.getElementById('btn-scan-fullpage');
    this.checkAutoShortlink = document.getElementById('check-auto-shortlink');
    this.inputSearchProducts = document.getElementById('input-search-products');
    this.selectFilterStatus = document.getElementById('select-filter-status');
    this.selectFilterSort = document.getElementById('select-filter-sort');
    this.checkboxSelectAll = document.getElementById('checkbox-select-all');
    this.countSelected = document.getElementById('count-selected');
    this.countTotal = document.getElementById('count-total');
    this.btnBulkQueue = document.getElementById('btn-bulk-queue');
    this.btnBulkTelegram = document.getElementById('btn-bulk-telegram');
    this.btnBulkAi = document.getElementById('btn-bulk-ai');
    this.btnBulkSheets = document.getElementById('btn-bulk-sheets');
    this.btnBulkExportCsv = document.getElementById('btn-bulk-export-csv');
    this.btnBulkClear = document.getElementById('btn-bulk-clear');
    this.productCardsContainer = document.getElementById('product-cards-container');
    this.deckEmptyState = document.getElementById('deck-empty-state');

    // Tab 2: AI Studio
    this.aiPreviewImg = document.getElementById('ai-preview-img');
    this.aiPreviewDiscount = document.getElementById('ai-preview-discount');
    this.aiPreviewTitle = document.getElementById('ai-preview-title');
    this.aiPreviewPrice = document.getElementById('ai-preview-price');
    this.aiPreviewShop = document.getElementById('ai-preview-shop');
    this.selectAiTone = document.getElementById('select-ai-tone');
    this.selectActiveAiModel = document.getElementById('select-active-ai-model');
    this.btnGenerateAiCopy = document.getElementById('btn-generate-ai-copy');
    this.inputPinTitle = document.getElementById('input-pin-title');
    this.inputPinDescription = document.getElementById('input-pin-description');
    this.inputPinHashtags = document.getElementById('input-pin-hashtags');
    this.inputPinLink = document.getElementById('input-pin-link');
    this.countPinTitle = document.getElementById('count-pin-title');
    this.countPinDesc = document.getElementById('count-pin-desc');
    this.btnAddViralTags = document.getElementById('btn-add-viral-tags');
    this.btnCopyAffLink = document.getElementById('btn-copy-aff-link');
    this.btnActionPinNow = document.getElementById('btn-action-pin-now');
    this.btnActionSaveSheet = document.getElementById('btn-action-save-sheet');
    this.btnActionSendTelegram = document.getElementById('btn-action-send-telegram');
    this.btnActionSendN8n = document.getElementById('btn-action-send-n8n');
    this.btnActionCopyAll = document.getElementById('btn-action-copy-all');

    // Tab 3: Sheets & History
    this.inputSearchHistory = document.getElementById('input-search-history');
    this.btnExportHistoryCsv = document.getElementById('btn-export-history-csv');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    this.historyItemsList = document.getElementById('history-items-list');
    this.historyEmptyState = document.getElementById('history-empty-state');

    // Tab 4: Settings
    this.settingBackendUrl = document.getElementById('setting-backend-url');
    this.btnTestBackend = document.getElementById('btn-test-backend');
    this.settingAiProvider = document.getElementById('setting-ai-provider');
    this.settingsProviderGemini = document.getElementById('settings-provider-gemini');
    this.settingsProviderCustom = document.getElementById('settings-provider-custom');
    this.settingGeminiApiKey = document.getElementById('setting-gemini-api-key');
    this.settingGeminiModel = document.getElementById('setting-gemini-model');
    this.settingCustomBaseUrl = document.getElementById('setting-custom-base-url');
    this.settingCustomApiKey = document.getElementById('setting-custom-api-key');
    this.settingCustomModelName = document.getElementById('setting-custom-model-name');
    this.settingCustomPrompt = document.getElementById('setting-custom-prompt');
    this.settingSheetsWebhookUrl = document.getElementById('setting-sheets-webhook-url');
    this.btnOpenSheetsGuide = document.getElementById('btn-open-sheets-guide');
    this.btnTestSheetsConnection = document.getElementById('btn-test-sheets-connection');
    this.settingTelegramBotToken = document.getElementById('setting-telegram-bot-token');
    this.settingTelegramChannelId = document.getElementById('setting-telegram-channel-id');
    this.btnTestTelegramConnection = document.getElementById('btn-test-telegram-connection');
    this.settingN8nWebhookUrl = document.getElementById('setting-n8n-webhook-url');
    this.settingN8nAuthToken = document.getElementById('setting-n8n-auth-token');
    this.btnTestN8nConnection = document.getElementById('btn-test-n8n-connection');
    this.settingAffiliateSubid = document.getElementById('setting-affiliate-subid');
    this.btnSaveAllSettings = document.getElementById('btn-save-all-settings');

    // Modal Guide
    this.modalSheetsGuide = document.getElementById('modal-sheets-guide');
    this.btnCloseModalGuide = document.getElementById('btn-close-modal-guide');
    this.btnGuideOk = document.getElementById('btn-guide-ok');
    this.toastContainer = document.getElementById('toast-container');
  }

  // --- Bind Event Handlers ---
  bindEvents() {
    // Theme toggle
    this.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
      this.applyTheme(nextTheme);
      this.settings.theme = nextTheme;
      this.saveSettings();
    });

    // Real-time Shopee Shortlink Sniffer listener
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'SHOPEE_SHORTLINK_CAPTURED' && msg.shortlink) {
          this.handleCapturedShortlink(msg.shortlink);
        } else if (msg.action === 'AUTO_SHORTLINK_PROGRESS') {
          this.showToast(`⚡ Mengambil link: ${msg.current}/${msg.total} (${(msg.title || '').substring(0, 20)}...)`, 'info');
        }
      });
    }

    // Quick Settings Button
    this.headerSettingsBtn.addEventListener('click', () => {
      this.switchTab('settings');
    });

    // Tab Navigation
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.getAttribute('data-tab');
        this.switchTab(tabTarget);
      });
    });

    // Scan Actions
    this.btnScanViewport.addEventListener('click', () => this.handleScanShopee('viewport'));
    this.btnScanFullpage.addEventListener('click', () => this.handleScanShopee('full'));

    // Search & Filter
    this.inputSearchProducts.addEventListener('input', () => this.renderProducts());
    if (this.selectFilterStatus) this.selectFilterStatus.addEventListener('change', () => this.renderProducts());
    this.selectFilterSort.addEventListener('change', () => this.renderProducts());

    // Bulk Select All
    this.checkboxSelectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        this.products.forEach(p => this.selectedProductIds.add(p.id));
      } else {
        this.selectedProductIds.clear();
      }
      this.renderProducts();
      this.updateBulkCounts();
    });

    // Bulk Actions
    if (this.btnBulkQueue) this.btnBulkQueue.addEventListener('click', () => this.handleBulkEnqueue());
    if (this.btnBulkTelegram) this.btnBulkTelegram.addEventListener('click', () => this.handleBulkTelegramBroadcast());
    this.btnBulkAi.addEventListener('click', () => this.handleBulkAi());
    this.btnBulkSheets.addEventListener('click', () => this.handleBulkSheets());
    this.btnBulkExportCsv.addEventListener('click', () => this.handleExportCsv(this.getSelectedProducts()));
    this.btnBulkClear.addEventListener('click', () => this.handleClearProducts());

    // AI Studio Inputs
    this.inputPinTitle.addEventListener('input', () => {
      this.countPinTitle.textContent = `${this.inputPinTitle.value.length}/100`;
      this.updateActiveProductAiData('pinTitle', this.inputPinTitle.value);
    });

    this.inputPinDescription.addEventListener('input', () => {
      this.countPinDesc.textContent = `${this.inputPinDescription.value.length}/500`;
      this.updateActiveProductAiData('pinDescription', this.inputPinDescription.value);
    });

    this.inputPinHashtags.addEventListener('input', () => {
      this.updateActiveProductAiData('hashtags', this.inputPinHashtags.value);
    });

    this.btnAddViralTags.addEventListener('click', () => {
      const viralTags = '#RacunShopee #ShopeeHaul #RekomendasiShopee #ShopeeAffiliate';
      if (!this.inputPinHashtags.value.includes('#RacunShopee')) {
        this.inputPinHashtags.value = (this.inputPinHashtags.value + ' ' + viralTags).trim();
        this.updateActiveProductAiData('hashtags', this.inputPinHashtags.value);
        this.showToast('Tag relevan ditambahkan!', 'info');
      }
    });

    this.btnCopyAffLink.addEventListener('click', () => {
      if (this.inputPinLink.value) {
        navigator.clipboard.writeText(this.inputPinLink.value);
        this.showToast('Link affiliate berhasil disalin!', 'info');
      }
    });

    // AI Generate Action
    this.btnGenerateAiCopy.addEventListener('click', () => this.handleGenerateAiCopy());

    // Publish & Actions
    this.btnActionPinNow.addEventListener('click', () => this.handlePostToPinterest());
    this.btnActionSaveSheet.addEventListener('click', () => this.handleSaveToGoogleSheets());
    if (this.btnActionSendTelegram) {
      this.btnActionSendTelegram.addEventListener('click', () => this.handleSendToTelegram());
    }
    this.btnActionSendN8n.addEventListener('click', () => this.handleSendToN8n());
    this.btnActionCopyAll.addEventListener('click', () => this.handleCopyFormattedText());

    // History Actions
    this.inputSearchHistory.addEventListener('input', () => this.renderHistory());
    this.btnExportHistoryCsv.addEventListener('click', () => this.handleExportCsv(this.history));
    this.btnClearHistory.addEventListener('click', () => this.handleClearHistory());

    // Settings Provider Toggle
    this.settingAiProvider.addEventListener('change', () => {
      const provider = this.settingAiProvider.value;
      if (provider === 'gemini') {
        this.settingsProviderGemini.classList.remove('hidden');
        this.settingsProviderCustom.classList.add('hidden');
      } else {
        this.settingsProviderGemini.classList.add('hidden');
        this.settingsProviderCustom.classList.remove('hidden');
      }
    });

    // Settings Modal Guide
    if (this.btnOpenSheetsGuide) {
      this.btnOpenSheetsGuide.addEventListener('click', () => {
        this.modalSheetsGuide.classList.remove('hidden');
      });
    }
    if (this.btnCloseModalGuide) {
      this.btnCloseModalGuide.addEventListener('click', () => {
        this.modalSheetsGuide.classList.add('hidden');
      });
    }
    if (this.btnGuideOk) {
      this.btnGuideOk.addEventListener('click', () => {
        this.modalSheetsGuide.classList.add('hidden');
      });
    }

    // Backend Test
    if (this.btnTestBackend) {
      this.btnTestBackend.addEventListener('click', async () => {
        const isOk = await this.checkBackendStatus();
        if (isOk) this.showToast('🟢 Terhubung ke Backend Server!', 'success');
        else this.showToast('Gagal terhubung ke Backend Server', 'error');
      });
    }

    // Save All Settings
    this.btnSaveAllSettings.addEventListener('click', () => this.handleSaveSettings());
    if (this.btnTestSheetsConnection) {
      this.btnTestSheetsConnection.addEventListener('click', () => this.testGoogleSheetsConnection());
    }
    if (this.btnTestTelegramConnection) {
      this.btnTestTelegramConnection.addEventListener('click', () => this.handleTestTelegramConnection());
    }
    if (this.btnTestN8nConnection) {
      this.btnTestN8nConnection.addEventListener('click', () => this.testN8nWebhook());
    }
  }

  // --- Theme Toggle ---
  applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    }
  }

  // --- Tab Navigation Switcher ---
  switchTab(targetTabId) {
    this.tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${targetTabId}`);
    });
  }

  // --- Shopee Tab Connection Checker ---
  async checkActiveShopeeTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
          if (tab.url.includes('affiliate.shopee')) {
            this.shopeeStatusPill.className = 'status-chip status-ready';
            this.shopeeStatusText.textContent = 'Affiliate Center';
          } else if (tab.url.includes('shopee.co.id') || tab.url.includes('shopee.sg') || tab.url.includes('shopee.com.my')) {
            this.shopeeStatusPill.className = 'status-chip status-ready';
            this.shopeeStatusText.textContent = 'Shopee Aktif';
          } else {
            this.shopeeStatusPill.className = 'status-chip status-not-ready';
            this.shopeeStatusText.textContent = 'Tab Non-Shopee';
          }
        }
      } catch (e) {
        this.shopeeStatusPill.className = 'status-chip status-ready';
        this.shopeeStatusText.textContent = 'Standby';
      }
    } else {
      this.shopeeStatusPill.className = 'status-chip status-ready';
      this.shopeeStatusText.textContent = 'Demo Mode';
    }
  }

  // --- Scan Shopee Handler ---
  async handleScanShopee(mode = 'viewport') {
    this.showToast('Memindai produk & link affiliate Shopee...', 'info');

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          const autoGenerateShortlinks = this.checkAutoShortlink ? this.checkAutoShortlink.checked : true;
          chrome.tabs.sendMessage(tab.id, { action: 'SCAN_SHOPEE_PAGE', mode, autoGenerateShortlinks }, (response) => {
            if (chrome.runtime.lastError || !response || !response.products || response.products.length === 0) {
              this.showToast('Belum ada produk baru terdeteksi. Scroll halaman lalu scan lagi.', 'info');
              return;
            }

            const newProducts = response.products.map(p => this.formatScrapedProduct(p));
            this.mergeScrapedProducts(newProducts);
            this.showToast(`✨ Berhasil memindai ${newProducts.length} produk & link affiliate Shopee!`, 'success');
          });
          return;
        }
      } catch (e) {
        console.warn('Scan extension error:', e);
      }
    }

    // Demo simulation fallback
    setTimeout(() => {
      this.showToast('Berhasil memindai 4 produk Shopee (Demo Mode)', 'success');
      this.mergeScrapedProducts(SAMPLE_SHOPEE_PRODUCTS);
    }, 400);
  }

  handleCapturedShortlink(shortlink) {
    if (!shortlink) return;
    if (this.inputPinLink) {
      this.inputPinLink.value = shortlink;
    }
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (product) {
      product.affiliateUrl = shortlink;
      product.productUrl = shortlink;
      this.saveLocalProducts();
    }
    this.showToast(`🎯 Link Affiliate Berhasil Ditangkap: ${shortlink}`, 'success');
  }

  formatScrapedProduct(raw) {
    const subId = this.settings.affiliateSubId || 'pinterest_pins';
    const cleanUrl = raw.productUrl || `https://shopee.co.id/product/${raw.shopId}/${raw.itemId}`;
    const affUrl = raw.affiliateUrl || this.buildAffiliateLink(cleanUrl, subId);

    const commRate = raw.commissionRate || (raw.discount?.includes('Komisi') ? raw.discount : '');
    const commPct = raw.commissionPercent || 0;
    const estComm = raw.estimatedCommissionRp || (commPct > 0 && raw.discountedPrice ? Math.round(raw.discountedPrice * (commPct / 100)) : 0);

    // Real Shopee image
    let productImg = raw.imageUrl || '';
    if (!productImg) {
      // Generate clean dynamic SVG thumbnail with title
      const cleanTitle = (raw.title || 'Shopee').substring(0, 20);
      productImg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%231E293B"/><text x="150" y="160" fill="%2310B981" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">${encodeURIComponent(cleanTitle)}</text></svg>`;
    }

    return {
      id: raw.id || `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      itemId: raw.itemId || '',
      shopId: raw.shopId || '',
      title: raw.title || 'Produk Shopee',
      originalPrice: raw.originalPrice || raw.price || 0,
      discountedPrice: raw.discountedPrice || raw.price || 0,
      discount: raw.discount || (commRate ? `Komisi ${commRate}` : ''),
      commissionRate: commRate,
      commissionPercent: commPct,
      estimatedCommissionRp: estComm,
      hasKomisiXtra: !!raw.hasKomisiXtra,
      hasFreeSample: !!raw.hasFreeSample,
      rating: raw.rating || 4.9,
      soldCount: raw.soldCount || 'Terjual',
      shopName: raw.shopName || (raw.hasKomisiXtra ? 'Toko Komisi XTRA' : 'Shopee Seller'),
      shopLocation: raw.shopLocation || 'Indonesia',
      shopType: raw.shopType || 'Regular',
      imageUrl: productImg,
      galleryImages: raw.galleryImages || [productImg],
      productUrl: cleanUrl,
      affiliateUrl: affUrl,
      status: 'Ready',
      aiContent: {
        pinTitle: `${raw.title ? raw.title.substring(0, 60) : 'Rekomendasi Produk'} (Rp ${(raw.discountedPrice || 0).toLocaleString('id-ID')})`,
        pinDescription: `• Harga: Rp ${(raw.discountedPrice || 0).toLocaleString('id-ID')}${commRate ? ` (${commRate})` : ''}\n• Rating: ${raw.rating || '4.9'} (${raw.soldCount || 'Terjual'})\n• Cek promo & toko di link produk.`,
        hashtags: ['#ShopeeHaul', '#RacunShopee', '#RekomendasiShopee', '#ShopeeAffiliate']
      }
    };
  }

  saveProductsToStorage() {
    try {
      localStorage.setItem('affiliator_killer_products', JSON.stringify(this.products));
      // Auto-sync seamlessly with Matrix Backend Server
      fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: this.products })
      }).catch(() => {});
    } catch (e) {
      console.warn('Save to storage warning:', e);
    }
  }

  mergeScrapedProducts(newProducts) {
    if (!newProducts || newProducts.length === 0) return;

    // Filter out sample products if we have real scanned products
    const isMock = (p) => p.id && p.id.startsWith('prod_aff_00');
    let baseList = this.products.filter(p => !isMock(p));

    const existingMap = new Map(baseList.map(p => [(p.itemId || p.title), p]));
    newProducts.forEach(np => {
      const key = np.itemId || np.title;
      if (!existingMap.has(key)) {
        baseList.unshift(np);
      } else {
        // Update existing with fresh scan
        const idx = baseList.findIndex(p => (p.itemId || p.title) === key);
        if (idx !== -1) baseList[idx] = np;
      }
    });

    this.products = baseList;
    this.saveProductsToStorage();
    this.renderProducts();
    this.updateBulkCounts();
    
    // Select the first real scanned product for AI studio
    if (this.products.length > 0) {
      this.selectProductForAi(this.products[0].id);
    }
  }

  // --- Render Product Deck ---
  renderProducts() {
    const searchTerm = (this.inputSearchProducts?.value || '').toLowerCase().trim();
    const sortValue = this.selectFilterSort?.value || 'default';
    const statusFilter = this.selectFilterStatus?.value || 'fresh';

    let filtered = [...this.products];

    // Status filter (fresh vs queued vs all)
    if (statusFilter === 'fresh') {
      filtered = filtered.filter(p => !p.isEnqueued && p.status !== 'Queued');
    } else if (statusFilter === 'queued') {
      filtered = filtered.filter(p => p.isEnqueued || p.status === 'Queued');
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm) || (p.shopName && p.shopName.toLowerCase().includes(searchTerm)));
    }

    // Sort
    if (sortValue === 'commission_desc') {
      filtered.sort((a, b) => (b.commissionPercent || 0) - (a.commissionPercent || 0));
    } else if (sortValue === 'commission_val_desc') {
      filtered.sort((a, b) => (b.estimatedCommissionRp || 0) - (a.estimatedCommissionRp || 0));
    } else if (sortValue === 'discount_desc') {
      filtered.sort((a, b) => parseInt(b.discount || '0') - parseInt(a.discount || '0'));
    } else if (sortValue === 'rating_desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortValue === 'price_asc') {
      filtered.sort((a, b) => (a.discountedPrice || 0) - (b.discountedPrice || 0));
    } else if (sortValue === 'price_desc') {
      filtered.sort((a, b) => (b.discountedPrice || 0) - (a.discountedPrice || 0));
    }

    // Empty state handling
    if (filtered.length === 0) {
      this.productCardsContainer.innerHTML = '';
      this.deckEmptyState.classList.remove('hidden');
      const freshCount = this.products.filter(p => !p.isEnqueued && p.status !== 'Queued').length;
      this.tabCountProducts.textContent = String(freshCount);
      this.countTotal.textContent = '0';
      return;
    }

    this.deckEmptyState.classList.add('hidden');
    const freshCount = this.products.filter(p => !p.isEnqueued && p.status !== 'Queued').length;
    this.tabCountProducts.textContent = String(freshCount);
    this.countTotal.textContent = String(filtered.length);

    // Build Cards HTML
    this.productCardsContainer.innerHTML = filtered.map(prod => {
      const isSelected = this.selectedProductIds.has(prod.id);
      const isMall = prod.shopType === 'Mall';
      const isStar = prod.shopType === 'Star+' || prod.shopType === 'Star';
      const shopBadgeClass = isMall ? 'badge-mall' : (isStar ? 'badge-star' : 'badge-regular');
      const shopBadgeText = isMall ? 'Mall' : (isStar ? 'Star+' : 'Toko');

      const commText = prod.commissionRate ? `🔥 Komisi ${prod.commissionRate}` : '';
      const commEst = prod.estimatedCommissionRp ? ` (~Rp ${prod.estimatedCommissionRp.toLocaleString('id-ID')})` : '';

      return `
        <div class="product-card ${isSelected ? 'selected' : ''}" data-id="${prod.id}">
          <div class="card-checkbox-wrapper">
            <input type="checkbox" class="product-checkbox" data-id="${prod.id}" ${isSelected ? 'checked' : ''} aria-label="Pilih ${this.escapeHtml(prod.title)}">
          </div>

          <div class="card-media">
            <img src="${prod.imageUrl}" alt="${this.escapeHtml(prod.title)}" loading="lazy">
            ${prod.discount ? `<span class="badge-discount-float">${prod.discount.includes('Komisi') ? prod.discount : `-${prod.discount}`}</span>` : ''}
          </div>

          <div class="card-content">
            <div>
              <div class="card-header-meta">
                <span class="badge-shop-type ${shopBadgeClass}">${shopBadgeText}</span>
                ${prod.hasKomisiXtra ? '<span class="badge-shop-type badge-komisi-xtra">Komisi XTRA</span>' : ''}
                ${prod.hasFreeSample ? '<span class="badge-shop-type badge-sample-free">Sampel Gratis</span>' : ''}
                <span class="shop-location">${this.escapeHtml(prod.shopLocation || prod.shopName)}</span>
              </div>
              <h4 class="product-title" title="${this.escapeHtml(prod.title)}">${this.escapeHtml(prod.title)}</h4>
              ${commText ? `<div class="badge-commission-pill">${commText}${commEst}</div>` : ''}
            </div>

            <div>
              <div class="price-rating-row" style="margin-top: 4px;">
                <div class="price-box">
                  <span class="price-current">Rp ${(prod.discountedPrice || 0).toLocaleString('id-ID')}</span>
                  ${prod.originalPrice && prod.originalPrice > prod.discountedPrice ? `<span class="price-original">Rp ${prod.originalPrice.toLocaleString('id-ID')}</span>` : ''}
                </div>
                <div class="rating-box">
                  <span class="rating-star-icon">★</span>
                  <span>${prod.rating || '4.9'}</span>
                  <span>(${prod.soldCount || 'Terjual'})</span>
                </div>
              </div>

              <div class="card-actions-row">
                <button class="btn-card-action btn-card-queue" data-action="enqueue" data-id="${prod.id}" title="Acc / Masukkan langsung ke Antrean Queue" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4);">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <span>Acc</span>
                </button>
                <button class="btn-card-action btn-card-tg" data-action="telegram" data-id="${prod.id}" title="Broadcast Langsung ke Telegram Channel" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.93-1.28 4.88-2.12 5.86-2.54 2.8-.1.18 3.37.24 3.73.24.06 0 .17-.01.24-.07.08-.08.1-.19.11-.27-.01-.06-.02-.15-.02-.19z"/></svg>
                  <span>TG</span>
                </button>
                <button class="btn-card-action btn-card-ai" data-action="ai" data-id="${prod.id}" title="Buka di AI Studio & Generate Pin (No-Slop)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>AI</span>
                </button>
                <button class="btn-card-action btn-card-pin" data-action="pin" data-id="${prod.id}" title="Post Langsung ke Pinterest">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.365-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
                  <span>Pin</span>
                </button>
                <button class="btn-card-action btn-card-sheets" data-action="sheets" data-id="${prod.id}" title="Simpan ke Google Sheets">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </button>
                <button class="btn-card-action" data-action="copy" data-id="${prod.id}" title="Salin Rich Caption">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button class="btn-card-action" data-action="edit-link" data-id="${prod.id}" title="Edit / Ganti Link Affiliate Shopee">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  <span>Link</span>
                </button>
                <button class="btn-card-action btn-danger-text" data-action="delete" data-id="${prod.id}" title="Hapus Produk">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    this.productCardsContainer.querySelectorAll('.product-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedProductIds.add(id);
        } else {
          this.selectedProductIds.delete(id);
        }
        this.updateBulkCounts();
        const card = this.productCardsContainer.querySelector(`.product-card[data-id="${id}"]`);
        if (card) card.classList.toggle('selected', e.target.checked);
      });
    });

    this.productCardsContainer.querySelectorAll('.btn-card-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const productId = btn.getAttribute('data-id');
        this.handleCardAction(action, productId);
      });
    });
  }

  updateBulkCounts() {
    this.countSelected.textContent = String(this.selectedProductIds.size);
    this.checkboxSelectAll.checked = this.selectedProductIds.size === this.products.length && this.products.length > 0;
  }

  getSelectedProducts() {
    if (this.selectedProductIds.size === 0) return [...this.products];
    return this.products.filter(p => this.selectedProductIds.has(p.id));
  }

  // --- Card Action Handler ---
  handleCardAction(action, productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    if (action === 'enqueue') {
      this.handleSingleProductEnqueue(product);
    } else if (action === 'telegram') {
      this.handleSingleProductTelegram(product);
    } else if (action === 'edit-link') {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'GET_ACTIVE_MODAL_SHORTLINK' }, (resp) => {
              if (resp && resp.success && resp.shortlink) {
                product.affiliateUrl = resp.shortlink;
                product.productUrl = resp.shortlink;
                this.saveProductsToStorage();
                this.renderProducts();
                this.showToast(`🎯 Berhasil menangkap link affiliate dari Shopee: ${resp.shortlink}`, 'success');
              } else {
                const currentLink = product.affiliateUrl?.includes('s.shopee.co.id') ? product.affiliateUrl : '';
                const newLink = prompt('Masukkan Link Affiliate Shopee (contoh: https://s.shopee.co.id/xxxxxx):', currentLink);
                if (newLink && newLink.trim().startsWith('http')) {
                  product.affiliateUrl = newLink.trim();
                  product.productUrl = newLink.trim();
                  this.saveProductsToStorage();
                  this.renderProducts();
                  this.showToast('✅ Link Affiliate berhasil diperbarui!', 'success');
                }
              }
            });
            return;
          }
          const currentLink = product.affiliateUrl?.includes('s.shopee.co.id') ? product.affiliateUrl : '';
          const newLink = prompt('Masukkan Link Affiliate Shopee (contoh: https://s.shopee.co.id/xxxxxx):', currentLink);
          if (newLink && newLink.trim().startsWith('http')) {
            product.affiliateUrl = newLink.trim();
            product.productUrl = newLink.trim();
            this.saveProductsToStorage();
            this.renderProducts();
            this.showToast('✅ Link Affiliate berhasil diperbarui!', 'success');
          }
        });
      } else {
        const currentLink = product.affiliateUrl?.includes('s.shopee.co.id') ? product.affiliateUrl : '';
        const newLink = prompt('Masukkan Link Affiliate Shopee (contoh: https://s.shopee.co.id/xxxxxx):', currentLink);
        if (newLink && newLink.trim().startsWith('http')) {
          product.affiliateUrl = newLink.trim();
          product.productUrl = newLink.trim();
          this.saveProductsToStorage();
          this.renderProducts();
          this.showToast('✅ Link Affiliate berhasil diperbarui!', 'success');
        }
      }
    } else if (action === 'ai') {
      this.selectProductForAi(productId);
      this.switchTab('generator');
    } else if (action === 'pin') {
      this.selectProductForAi(productId);
      this.handlePostToPinterest(product);
    } else if (action === 'sheets') {
      this.sendSingleProductToSheets(product);
    } else if (action === 'copy') {
      this.copyProductRichText(product);
    } else if (action === 'delete') {
      this.products = this.products.filter(p => p.id !== productId);
      this.selectedProductIds.delete(productId);
      this.saveProductsToStorage();
      this.renderProducts();
      this.updateBulkCounts();
      this.showToast('Produk dihapus', 'info');
    }
  }

  async handleSingleProductEnqueue(prod) {
    try {
      this.showToast(`📥 Memasukkan "${(prod.title || '').substring(0, 25)}..." ke Queue...`, 'info');
      const res = await fetch(`${this.settings.backendUrl}/api/products/${prod.id || prod.itemId}/enqueue-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customTitle: prod.aiContent?.pinTitle || prod.title,
          customDescription: prod.aiContent?.pinDescription || '',
          targetBoard: 'Shopee Affiliate Promo'
        })
      });
      const data = await res.json();
      if (data.success) {
        prod.isEnqueued = true;
        prod.status = 'Queued';
        prod.queuedAt = new Date().toISOString();
        this.selectedProductIds.delete(prod.id);
        this.saveProductsToStorage();
        this.renderProducts();
        this.updateBulkCounts();
        this.showToast(`✅ Produk di-Acc & dipindahkan ke Antrean Matrix!`, 'success');
      } else {
        this.showToast(`❌ Gagal: ${data.error || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async handleSingleProductTelegram(prod) {
    try {
      this.showToast(`📢 Mengirim ke Telegram: "${(prod.title || '').substring(0, 25)}..."`, 'info');
      const res = await fetch(`${this.settings.backendUrl}/api/products/${prod.id || prod.itemId}/publish-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Berhasil broadcast ke Telegram Channel!`, 'success');
      } else {
        this.showToast(`❌ Gagal Telegram: ${data.error || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async handleBulkEnqueue() {
    const selected = this.getSelectedProducts();
    if (selected.length === 0) {
      this.showToast('Pilih minimal 1 produk dengan mencentang kotak produk', 'info');
      return;
    }

    this.showToast(`📥 Memasukkan ${selected.length} produk ke Antrean Queue...`, 'info');

    let successCount = 0;
    for (const prod of selected) {
      try {
        const res = await fetch(`${this.settings.backendUrl}/api/products/${prod.id || prod.itemId}/enqueue-matrix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customTitle: prod.aiContent?.pinTitle || prod.title,
            customDescription: prod.aiContent?.pinDescription || '',
            targetBoard: 'Shopee Affiliate Promo'
          })
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          prod.isEnqueued = true;
          prod.status = 'Queued';
          prod.queuedAt = new Date().toISOString();
        }
      } catch (e) {
        console.warn('Enqueue error:', e);
      }
    }

    this.selectedProductIds.clear();
    this.saveProductsToStorage();
    this.renderProducts();
    this.updateBulkCounts();
    this.showToast(`🎉 ${successCount} produk berhasil di-Acc & dipindahkan ke Antrean Queue!`, 'success');
  }

  async handleBulkTelegramBroadcast() {
    const selected = this.getSelectedProducts();
    if (selected.length === 0) {
      this.showToast('Pilih minimal 1 produk dengan mencentang kotak produk', 'info');
      return;
    }

    this.showToast(`📢 Memulai broadcast ${selected.length} produk ke Telegram...`, 'info');

    let sent = 0;
    for (let i = 0; i < selected.length; i++) {
      const prod = selected[i];
      try {
        await fetch(`${this.settings.backendUrl}/api/products/${prod.id || prod.itemId}/publish-telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        sent++;
        this.showToast(`📢 Terkirim (${sent}/${selected.length}): ${(prod.title || '').substring(0, 20)}...`, 'info');
        if (i < selected.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (e) {}
    }

    this.showToast(`🎉 Selesai! ${sent} produk berhasil di-broadcast ke Telegram Channel!`, 'success');
  }

  // --- Select Product for AI Studio ---
  selectProductForAi(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.activeAiProductId = productId;
    this.aiPreviewImg.src = product.imageUrl;
    this.aiPreviewDiscount.textContent = product.discount ? product.discount : 'Promo';
    this.aiPreviewTitle.textContent = product.title;
    this.aiPreviewPrice.textContent = `Rp ${(product.discountedPrice || 0).toLocaleString('id-ID')}`;
    this.aiPreviewShop.textContent = `${product.shopName || ''} (${product.shopLocation || ''})`;

    const ai = product.aiContent || {};
    this.inputPinTitle.value = ai.pinTitle || '';
    this.countPinTitle.textContent = `${(ai.pinTitle || '').length}/100`;

    this.inputPinDescription.value = ai.pinDescription || '';
    this.countPinDesc.textContent = `${(ai.pinDescription || '').length}/500`;

    const hashtagsStr = Array.isArray(ai.hashtags) ? ai.hashtags.join(' ') : (ai.hashtags || '');
    this.inputPinHashtags.value = hashtagsStr;
    this.inputPinLink.value = product.affiliateUrl || product.productUrl || '';

    // Gallery Thumbnails Strip (Official Product Photos)
    const galleryPicker = document.getElementById('ai-gallery-picker');
    const galleryStrip = document.getElementById('ai-gallery-strip');
    const images = (product.galleryImages && product.galleryImages.length > 0) ? product.galleryImages : [product.imageUrl];

    if (images.length > 1 && galleryPicker && galleryStrip) {
      galleryPicker.classList.remove('hidden');
      galleryStrip.innerHTML = images.map((imgUrl, idx) => `
        <img src="${imgUrl}" class="gallery-thumb-item ${imgUrl === product.imageUrl ? 'active' : ''}" data-idx="${idx}" alt="Gallery ${idx + 1}" title="Gunakan foto ini sebagai cover Pin">
      `).join('');

      galleryStrip.querySelectorAll('.gallery-thumb-item').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const clickedSrc = thumb.getAttribute('src');
          product.imageUrl = clickedSrc;
          this.aiPreviewImg.src = clickedSrc;
          galleryStrip.querySelectorAll('.gallery-thumb-item').forEach(t => t.classList.toggle('active', t === thumb));
          this.saveProductsToStorage();
          this.renderProducts();
          this.showToast('Foto promosi terpilih!', 'info');
        });
      });
    } else if (galleryPicker) {
      galleryPicker.classList.add('hidden');
    }
  }

  updateActiveProductAiData(field, value) {
    if (!this.activeAiProductId) return;
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (product) {
      if (!product.aiContent) product.aiContent = {};
      product.aiContent[field] = value;
      this.saveProductsToStorage();
    }
  }

  // --- AI Generation Logic (Backend-First with Fallback) ---
  async handleGenerateAiCopy() {
    if (!this.activeAiProductId) {
      this.showToast('Pilih produk terlebih dahulu', 'error');
      return;
    }

    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (!product) return;

    const tone = this.selectAiTone.value;
    const modelChoice = this.selectActiveAiModel.value;

    this.btnGenerateAiCopy.disabled = true;
    this.btnGenerateAiCopy.innerHTML = `
      <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
      <span>Menulis Copy Alami (No-Slop)...</span>
    `;

    try {
      let generated = null;

      // 1. Try Backend AI Route first
      if (this.backendOnline && this.settings.useBackend) {
        try {
          const res = await fetch(`${this.settings.backendUrl}/api/ai/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product,
              tone,
              provider: modelChoice,
              config: {
                geminiApiKey: this.settings.geminiApiKey,
                geminiModel: this.settings.geminiModel,
                customBaseUrl: this.settings.customBaseUrl,
                customApiKey: this.settings.customApiKey,
                customModelName: this.settings.customModelName
              }
            })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data) generated = json.data;
          }
        } catch (e) {
          console.warn('Backend AI route fallback:', e);
        }
      }

      // 2. Direct Browser fallback
      if (!generated) {
        if (modelChoice === 'gemini' && this.settings.geminiApiKey) {
          generated = await this.callGeminiApi(product, tone);
        } else if (modelChoice === 'opencode' && this.settings.customApiKey) {
          generated = await this.callOpenAiCompatibleApi(product, tone);
        }
      }

      // 3. Fallback to smart template
      if (!generated) {
        generated = this.generateSmartTemplateCopy(product, tone);
      }

      // Apply generated result
      this.inputPinTitle.value = generated.pinTitle;
      this.countPinTitle.textContent = `${generated.pinTitle.length}/100`;

      this.inputPinDescription.value = generated.pinDescription;
      this.countPinDesc.textContent = `${generated.pinDescription.length}/500`;

      this.inputPinHashtags.value = Array.isArray(generated.hashtags) ? generated.hashtags.join(' ') : generated.hashtags;

      // Save to product state
      product.aiContent = generated;
      this.saveProductsToStorage();

      this.showToast('✨ AI Copy Alami (No-Slop) Siap!', 'success');
    } catch (err) {
      console.error('AI Gen Error:', err);
      const fallback = this.generateSmartTemplateCopy(product, tone);
      this.inputPinTitle.value = fallback.pinTitle;
      this.inputPinDescription.value = fallback.pinDescription;
      this.inputPinHashtags.value = fallback.hashtags.join(' ');
      product.aiContent = fallback;
      this.showToast('Menggunakan template bebas slop', 'info');
    } finally {
      this.btnGenerateAiCopy.disabled = false;
      this.btnGenerateAiCopy.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <span>Generate Copy Alami (No-Slop)</span>
      `;
    }
  }

  generateSmartTemplateCopy(product, tone) {
    const cleanTitle = product.title.replace(/[\(\)\[\]]/g, '').trim();
    const shortTitle = cleanTitle.length > 55 ? cleanTitle.substring(0, 52) + '...' : cleanTitle;
    const priceFormatted = `Rp ${(product.discountedPrice || 0).toLocaleString('id-ID')}`;
    const disc = product.discount ? product.discount : 'harga promo';

    if (tone === 'aesthetic') {
      return {
        pinTitle: `${shortTitle} (${priceFormatted})`,
        pinDescription: `Rekomendasi ${product.title} untuk look sehari-hari. Desain simpel, bahan nyaman dan potongan pas.\n\n• Harga: ${priceFormatted} (${disc})\n• Rating: ${product.rating || '4.9'} dari ${product.soldCount || 'ribuan pembeli'}\n• Buka link produk untuk melihat detail toko dan ulasan aslinya.`,
        hashtags: ['#ShopeeLook', '#OutfitInspo', '#KoreanStyle', '#RacunShopee', '#AestheticRoom']
      };
    } else if (tone === 'honest_review') {
      return {
        pinTitle: `Review Produk: ${shortTitle}`,
        pinDescription: `Spesifikasi dan ulasan singkat ${product.title}. Kualitas jahit/material rapi dengan harga terjangkau.\n\n• Harga saat ini: ${priceFormatted}\n• Terjual: ${product.soldCount || '4.8RB+'}\n• Cek ketersediaan stok & ukuran pada link produk.`,
        hashtags: ['#ReviewShopee', '#RekomendasiProduk', '#ShopeeHaul', '#RacunShopee']
      };
    } else if (tone === 'specs_detail') {
      return {
        pinTitle: `Detail & Spesifikasi: ${shortTitle}`,
        pinDescription: `Info produk: ${product.title}\n\n• Harga Diskon: ${priceFormatted}\n• Lokasi Pengiriman: ${product.shopLocation || 'Indonesia'}\n• Rating Toko: ${product.rating || '4.9'}/5.0\n• Klik tautan produk untuk langsung order.`,
        hashtags: ['#SpillProduk', '#ShopeeAffiliate', '#ShopeeHaul']
      };
    } else {
      return {
        pinTitle: `Spill Promo: ${shortTitle} Cuma ${priceFormatted}`,
        pinDescription: `Promo produk Shopee ${product.title} lagi turun harga jadi ${priceFormatted} (${disc}).\n\n• Toko: ${product.shopName || 'Shopee Seller'} (${product.shopLocation || 'Indonesia'})\n• Cek promo hari ini lewat link produk di pin.`,
        hashtags: ['#DiskonShopee', '#PromoShopee', '#RacunShopee', '#ShopeeAffiliate']
      };
    }
  }

  // --- Gemini Direct API Caller ---
  async callGeminiApi(product, tone) {
    const apiKey = this.settings.geminiApiKey;
    const model = this.settings.geminiModel || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Anda adalah copywriter Shopee Affiliate profesional yang mematuhi standar NO-AI-SLOP (alamiah, manusiawi, ringkas, tanpa klise).

ATURAN NO-AI-SLOP:
1. DILARANG pembuka basa-basi (JANGAN: "Tahukah kamu", "Banyak yang belum tahu", "Here's the thing").
2. DILARANG kontras biner (JANGAN: "Bukan sekadar X, tapi Y").
3. DILARANG kalimat dramatis terpotong (JANGAN: "Titik. Itu saja").
4. Batasi emoji maksimal 2-3 buah sebagai poin.
5. Sebutkan detail harga diskon, rating, dan bahan secara riil.

Data Produk:
- Judul: ${product.title}
- Harga Diskon: Rp ${product.discountedPrice} (Harga Asli: Rp ${product.originalPrice}, Diskon: ${product.discount})
- Rating: ${product.rating} | Terjual: ${product.soldCount}
- Lokasi Toko: ${product.shopLocation}
- Tone: ${tone}

Format Output WAJIB dalam JSON valid:
{
  "pinTitle": "Judul Pin Pinterest maks 90 karakter spesifik & kaya keyword",
  "pinDescription": "Deskripsi jelas & natural maks 400 karakter dengan rincian harga/fitur dan ajakan cek link di akhir",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');
    return JSON.parse(rawText);
  }

  // --- OpenAI / OpenCode Compatible API Caller ---
  async callOpenAiCompatibleApi(product, tone) {
    const baseUrl = this.settings.customBaseUrl || 'https://api.opencode.ai/v1';
    const apiKey = this.settings.customApiKey;
    const model = this.settings.customModelName || 'opencode-v1';

    const prompt = `Buatkan copy Pinterest SEO spesifik & natural (No AI Slop: tanpa basa-basi, tanpa kontras biner klise, tanpa emoji berlebihan) untuk produk Shopee: "${product.title}" seharga Rp ${product.discountedPrice} (Diskon ${product.discount}). Output JSON: {"pinTitle": "...", "pinDescription": "...", "hashtags": ["#tag1", "#tag2"]}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Could not parse JSON from OpenCode');
  }

  // --- Pinterest Direct Share Handler ---
  handlePostToPinterest(targetProduct = null) {
    const product = targetProduct || this.products.find(p => p.id === this.activeAiProductId);
    if (!product) {
      this.showToast('Pilih produk untuk di-pin', 'error');
      return;
    }

    const title = this.inputPinTitle.value || product.aiContent?.pinTitle || product.title;
    const desc = this.inputPinDescription.value || product.aiContent?.pinDescription || '';
    const tags = this.inputPinHashtags.value || (product.aiContent?.hashtags?.join(' ')) || '';
    const fullDesc = `${desc}\n\n${tags}`.trim();
    const mediaUrl = product.imageUrl;
    const affLink = product.affiliateUrl || product.productUrl;

    const pinterestShareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(affLink)}&media=${encodeURIComponent(mediaUrl)}&description=${encodeURIComponent(fullDesc)}`;

    window.open(pinterestShareUrl, '_blank', 'width=750,height=600,menubar=no,status=no');

    this.addHistoryRecord({
      title: product.title,
      pinTitle: title,
      discountedPrice: product.discountedPrice,
      originalPrice: product.originalPrice,
      discount: product.discount,
      affiliateUrl: affLink,
      imageUrl: mediaUrl,
      status: 'Posted to Pinterest',
      platform: 'Pinterest',
      createdAt: new Date().toISOString()
    });

    this.showToast('Membuka dialog Pin Pinterest...', 'success');
  }

  // --- Google Sheets & Local Excel Handler ---
  async handleSaveToGoogleSheets() {
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (!product) return;
    await this.sendSingleProductToSheets(product);
  }

  async sendSingleProductToSheets(product) {
    const webhookUrl = this.settings.sheetsWebhookUrl;
    
    // 1. Try Backend Sheets & Local Excel route
    if (this.backendOnline && this.settings.useBackend) {
      try {
        const res = await fetch(`${this.settings.backendUrl}/api/sheets/append`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl, product })
        });
        if (res.ok) {
          this.addHistoryRecord({
            title: product.title,
            pinTitle: product.aiContent?.pinTitle || product.title,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            discount: product.discount,
            affiliateUrl: product.affiliateUrl,
            imageUrl: product.imageUrl,
            status: 'Saved to Database',
            platform: 'Excel & Sheets',
            createdAt: new Date().toISOString()
          });
          this.showToast('✅ Tersimpan ke Database Spreadsheet!', 'success');
          return;
        }
      } catch (e) {}
    }

    // 2. Direct Browser mode
    if (!webhookUrl) {
      this.showToast('Isi URL Google Sheets Webhook di menu Pengaturan terlebih dahulu', 'error');
      this.switchTab('settings');
      return;
    }

    this.showToast('Menyimpan ke Google Sheets...', 'info');

    const payload = {
      title: product.title,
      price: product.discountedPrice,
      discountedPrice: `Rp ${(product.discountedPrice || 0).toLocaleString('id-ID')}`,
      originalPrice: `Rp ${(product.originalPrice || 0).toLocaleString('id-ID')}`,
      discount: product.discount || '',
      productUrl: product.productUrl,
      affiliateUrl: product.affiliateUrl,
      imageUrl: product.imageUrl,
      rating: product.rating,
      soldCount: product.soldCount,
      aiContent: {
        pinTitle: product.aiContent?.pinTitle || '',
        pinDescription: product.aiContent?.pinDescription || '',
        hashtags: product.aiContent?.hashtags || []
      },
      status: 'Saved to Sheets',
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.addHistoryRecord({
        ...payload,
        platform: 'Google Sheets',
        createdAt: new Date().toISOString()
      });

      this.showToast('✅ Berhasil disimpan ke Google Sheets!', 'success');
    } catch (e) {
      console.error('Sheets webhook error:', e);
      this.showToast('Gagal mengirim ke Google Sheets. Periksa URL Webhook.', 'error');
    }
  }

  // --- n8n Webhook Handler ---
  async handleSendToN8n() {
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (!product) return;

    const webhookUrl = this.settings.n8nWebhookUrl;

    if (this.backendOnline && this.settings.useBackend) {
      try {
        const res = await fetch(`${this.settings.backendUrl}/api/n8n/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl,
            authToken: this.settings.n8nAuthToken,
            payload: {
              product,
              aiContent: {
                pinTitle: this.inputPinTitle.value || product.aiContent?.pinTitle,
                pinDescription: this.inputPinDescription.value || product.aiContent?.pinDescription,
                hashtags: this.inputPinHashtags.value || product.aiContent?.hashtags
              }
            }
          })
        });
        if (res.ok) {
          this.showToast('⚡ Berhasil dikirim ke n8n (via Server)!', 'success');
          return;
        }
      } catch (e) {}
    }

    if (!webhookUrl) {
      this.showToast('Isi URL Webhook n8n di menu Pengaturan terlebih dahulu', 'error');
      this.switchTab('settings');
      return;
    }

    this.showToast('Mengirim payload ke n8n...', 'info');

    const payload = {
      event: 'affiliate_product_shared',
      timestamp: new Date().toISOString(),
      product: { ...product },
      aiContent: {
        pinTitle: this.inputPinTitle.value || product.aiContent?.pinTitle,
        pinDescription: this.inputPinDescription.value || product.aiContent?.pinDescription,
        hashtags: this.inputPinHashtags.value || product.aiContent?.hashtags
      }
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.settings.n8nAuthToken) headers['Authorization'] = this.settings.n8nAuthToken;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      this.addHistoryRecord({
        title: product.title,
        pinTitle: payload.aiContent.pinTitle,
        affiliateUrl: product.affiliateUrl,
        imageUrl: product.imageUrl,
        status: 'Sent to n8n',
        platform: 'n8n',
        createdAt: new Date().toISOString()
      });

      this.showToast('⚡ Berhasil dikirim ke n8n Workflow!', 'success');
    } catch (e) {
      console.error('n8n error:', e);
      this.showToast('Gagal mengirim ke n8n. Periksa URL Webhook.', 'error');
    }
  }

  // --- Telegram Channel Handler ---
  async handleSendToTelegram() {
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (!product) return;

    this.showToast('📢 Mengirim broadcast ke Channel Telegram...', 'info');

    if (this.backendOnline && this.settings.useBackend) {
      try {
        const res = await fetch(`${this.settings.backendUrl}/api/telegram/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              ...product,
              aiContent: {
                pinTitle: this.inputPinTitle.value || product.aiContent?.pinTitle,
                pinDescription: this.inputPinDescription.value || product.aiContent?.pinDescription,
                hashtags: (this.inputPinHashtags.value || '').split(/\s+/).filter(t => t.startsWith('#'))
              }
            },
            options: {
              chatId: this.settings.telegramChannelId,
              token: this.settings.telegramBotToken
            }
          })
        });
        const data = await res.json();
        if (data.success) {
          this.addHistoryRecord({
            title: product.title,
            pinTitle: this.inputPinTitle.value || product.title,
            affiliateUrl: product.affiliateUrl,
            imageUrl: product.imageUrl,
            status: 'Broadcasted to Telegram',
            platform: 'Telegram',
            createdAt: new Date().toISOString()
          });
          this.showToast('🎉 Berhasil broadcast ke Telegram Channel!', 'success');
          return;
        } else {
          this.showToast(`❌ Gagal: ${data.error}`, 'error');
          return;
        }
      } catch (e) {
        console.warn('Backend Telegram broadcast error, trying direct API:', e);
      }
    }

    // Direct Telegram API fallback if backend is offline
    const token = this.settings.telegramBotToken;
    const chatId = this.settings.telegramChannelId;

    if (!token) {
      this.showToast('Isi Telegram Bot Token di menu Pengaturan terlebih dahulu', 'error');
      this.switchTab('settings');
      return;
    }

    if (!chatId) {
      this.showToast('Isi Target Channel ID di menu Pengaturan terlebih dahulu', 'error');
      this.switchTab('settings');
      return;
    }

    try {
      const title = this.inputPinTitle.value || product.title;
      const desc = this.inputPinDescription.value || '';
      const tags = this.inputPinHashtags.value || '';
      const affLink = product.affiliateUrl || product.productUrl || 'https://shopee.co.id';
      const caption = `🔥 <b>${title}</b>\n\n💰 <b>Harga: Rp ${priceDiscounted}</b>\n⭐ <b>Rating: ${product.rating || '4.9'} (${product.soldCount || 'Terjual'})</b>\n\n📝 <i>${desc}</i>\n\n🛒 <b>Link Pembelian Shopee:</b>\n👉 <a href="${affLink}">${affLink}</a>\n\n${tags}`;

      const payload = {
        chat_id: chatId,
        photo: product.imageUrl,
        caption: caption.substring(0, 1024),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🛍️ BELI SEKARANG DI SHOPEE', url: affLink }]]
        }
      };

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        this.addHistoryRecord({
          title: product.title,
          pinTitle: title,
          affiliateUrl: affLink,
          imageUrl: product.imageUrl,
          status: 'Broadcasted to Telegram',
          platform: 'Telegram',
          createdAt: new Date().toISOString()
        });
        this.showToast('🎉 Berhasil broadcast ke Telegram Channel!', 'success');
      } else {
        this.showToast(`❌ Gagal Telegram: ${data.description}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  async handleTestTelegramConnection() {
    const token = this.settingTelegramBotToken?.value.trim() || this.settings.telegramBotToken;
    const chatId = this.settingTelegramChannelId?.value.trim() || this.settings.telegramChannelId;

    if (!chatId) {
      this.showToast('Masukkan Target Channel ID terlebih dahulu', 'error');
      return;
    }

    this.showToast(`📨 Menguji koneksi & broadcast ke ${chatId}...`, 'info');

    try {
      if (this.backendOnline && this.settings.useBackend) {
        const res = await fetch(`${this.settings.backendUrl}/api/telegram/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, token })
        });
        const data = await res.json();
        if (data.success) {
          this.showToast(`✅ Pesan uji coba berhasil masuk ke ${chatId}!`, 'success');
          return;
        }
      }

      // Direct test
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✨ <b>AFFILIATOR KILLER - TELEGRAM TEST SUCCESS</b> ✨\n\n🤖 Bot @linkaffiliatorbot terhubung ke channel ini.\n⏱️ Waktu: ${new Date().toLocaleTimeString('id-ID')}`,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      if (data.ok) {
        this.showToast(`✅ Pesan uji coba berhasil masuk ke ${chatId}!`, 'success');
      } else {
        this.showToast(`❌ Gagal Telegram: ${data.description}`, 'error');
      }
    } catch (err) {
      this.showToast(`❌ Error: ${err.message}`, 'error');
    }
  }

  // --- Copy Formatted Text ---
  handleCopyFormattedText() {
    const product = this.products.find(p => p.id === this.activeAiProductId);
    if (!product) return;
    this.copyProductRichText(product);
  }

  copyProductRichText(product) {
    const title = product.aiContent?.pinTitle || product.title;
    const desc = product.aiContent?.pinDescription || '';
    const tags = Array.isArray(product.aiContent?.hashtags) ? product.aiContent.hashtags.join(' ') : (product.aiContent?.hashtags || '');
    const link = product.affiliateUrl || product.productUrl;

    const fullText = `📌 ${title}\n\n${desc}\n\n${tags}\n\n🛒 Link Produk: ${link}`;
    navigator.clipboard.writeText(fullText);
    this.showToast('📋 Teks lengkap & link berhasil disalin!', 'success');
  }

  // --- Bulk Operations ---
  async handleBulkAi() {
    const selected = this.getSelectedProducts();
    if (selected.length === 0) {
      this.showToast('Tidak ada produk yang dipilih', 'error');
      return;
    }

    this.showToast(`Men-generate copy (No-Slop) untuk ${selected.length} produk...`, 'info');
    const tone = this.selectAiTone.value;

    selected.forEach(p => {
      p.aiContent = this.generateSmartTemplateCopy(p, tone);
    });

    this.saveProductsToStorage();
    this.renderProducts();
    if (this.activeAiProductId) this.selectProductForAi(this.activeAiProductId);
    this.showToast(`✨ Berhasil generate copy untuk ${selected.length} produk!`, 'success');
  }

  async handleBulkSheets() {
    const selected = this.getSelectedProducts();
    if (selected.length === 0) return;

    this.showToast(`Mengirim ${selected.length} produk ke Database Spreadsheet...`, 'info');
    for (const p of selected) {
      await this.sendSingleProductToSheets(p);
    }
    this.showToast(`✅ ${selected.length} produk berhasil dicatat ke Spreadsheet!`, 'success');
  }

  handleClearProducts() {
    this.products = [];
    this.selectedProductIds.clear();
    this.saveProductsToStorage();
    this.renderProducts();
    this.updateBulkCounts();
    this.showToast('Daftar produk dibersihkan', 'info');
  }

  // --- CSV Export Helper ---
  handleExportCsv(items) {
    if (!items || items.length === 0) {
      this.showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }

    const headers = ['No', 'Tanggal', 'Nama Produk', 'Harga Diskon', 'Komisi', 'Estimasi Cuan', 'Link Affiliate', 'URL Gambar', 'Judul Pin', 'Deskripsi Pin', 'Hashtags'];
    const rows = items.map((item, idx) => {
      const ai = item.aiContent || {};
      const tags = Array.isArray(ai.hashtags) ? ai.hashtags.join(' ') : (ai.hashtags || '');
      return [
        idx + 1,
        `"${new Date().toLocaleDateString('id-ID')}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${item.discountedPrice || item.price || ''}"`,
        `"${item.commissionRate || item.discount || ''}"`,
        `"${item.estimatedCommissionRp || ''}"`,
        `"${item.affiliateUrl || item.productUrl || ''}"`,
        `"${item.imageUrl || ''}"`,
        `"${(ai.pinTitle || item.pinTitle || '').replace(/"/g, '""')}"`,
        `"${(ai.pinDescription || item.pinDescription || '').replace(/"/g, '""')}"`,
        `"${tags.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shopee_affiliate_pins_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('📥 File CSV berhasil diunduh!', 'success');
  }

  // --- History Management ---
  addHistoryRecord(record) {
    this.history.unshift({
      id: `hist_${Date.now()}`,
      ...record
    });
    if (this.history.length > 100) this.history = this.history.slice(0, 100);
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    const searchTerm = (this.inputSearchHistory?.value || '').toLowerCase().trim();
    let filtered = [...this.history];

    if (searchTerm) {
      filtered = filtered.filter(h => (h.title && h.title.toLowerCase().includes(searchTerm)) || (h.pinTitle && h.pinTitle.toLowerCase().includes(searchTerm)));
    }

    if (filtered.length === 0) {
      this.historyItemsList.innerHTML = '';
      this.historyEmptyState.classList.remove('hidden');
      return;
    }

    this.historyEmptyState.classList.add('hidden');
    this.historyItemsList.innerHTML = filtered.map(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      let badgeClass = 'status-sheets';
      if (item.status?.includes('Pinterest')) badgeClass = 'status-posted';
      if (item.status?.includes('n8n')) badgeClass = 'status-n8n';

      return `
        <div class="history-card">
          <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=100&q=80'}" class="history-thumb" alt="thumb">
          <div class="history-info">
            <h4 class="history-heading" title="${this.escapeHtml(item.title || item.pinTitle)}">${this.escapeHtml(item.pinTitle || item.title)}</h4>
            <div class="history-meta">
              <span class="history-badge-status ${badgeClass}">${item.status || 'Saved'}</span>
              <span>${dateStr}</span>
              ${item.affiliateUrl ? `<a href="${item.affiliateUrl}" target="_blank" class="link-action">Buka Link ↗</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  handleClearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
    this.showToast('Riwayat dibersihkan', 'info');
  }

  // --- Settings Form Handler ---
  populateSettingsForm() {
    if (this.settingBackendUrl) this.settingBackendUrl.value = this.settings.backendUrl || 'http://localhost:3000';
    this.settingAiProvider.value = this.settings.aiProvider || 'gemini';
    this.settingGeminiApiKey.value = this.settings.geminiApiKey || '';
    this.settingGeminiModel.value = this.settings.geminiModel || 'gemini-2.5-flash';
    this.settingCustomBaseUrl.value = this.settings.customBaseUrl || 'https://api.opencode.ai/v1';
    this.settingCustomApiKey.value = this.settings.customApiKey || '';
    this.settingCustomModelName.value = this.settings.customModelName || 'opencode-v1';
    this.settingCustomPrompt.value = this.settings.customPromptTemplate || '';

    this.settingSheetsWebhookUrl.value = this.settings.sheetsWebhookUrl || '';
    if (this.settingTelegramBotToken) this.settingTelegramBotToken.value = this.settings.telegramBotToken || '';
    if (this.settingTelegramChannelId) this.settingTelegramChannelId.value = this.settings.telegramChannelId || '';
    this.settingN8nWebhookUrl.value = this.settings.n8nWebhookUrl || '';
    this.settingN8nAuthToken.value = this.settings.n8nAuthToken || '';
    this.settingAffiliateSubid.value = this.settings.affiliateSubId || 'pinterest_pins';

    if (this.settings.aiProvider === 'gemini') {
      this.settingsProviderGemini.classList.remove('hidden');
      this.settingsProviderCustom.classList.add('hidden');
    } else {
      this.settingsProviderGemini.classList.add('hidden');
      this.settingsProviderCustom.classList.remove('hidden');
    }
  }

  async handleSaveSettings() {
    if (this.settingBackendUrl) {
      let rawUrl = this.settingBackendUrl.value.trim();
      if (rawUrl) {
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = `https://${rawUrl}`;
          this.settingBackendUrl.value = rawUrl;
        }
        this.settings.backendUrl = rawUrl;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('pinmatrix_backend_url', rawUrl);
        }
      } else {
        this.settings.backendUrl = 'http://localhost:3000';
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('pinmatrix_backend_url');
        }
      }
    }
    this.settings.aiProvider = this.settingAiProvider.value;
    this.settings.geminiApiKey = this.settingGeminiApiKey.value.trim();
    this.settings.geminiModel = this.settingGeminiModel.value;
    this.settings.customBaseUrl = this.settingCustomBaseUrl.value.trim();
    this.settings.customApiKey = this.settingCustomApiKey.value.trim();
    this.settings.customModelName = this.settingCustomModelName.value.trim();
    this.settings.customPromptTemplate = this.settingCustomPrompt.value;

    this.settings.sheetsWebhookUrl = this.settingSheetsWebhookUrl.value.trim();
    if (this.settingTelegramBotToken) this.settings.telegramBotToken = this.settingTelegramBotToken.value.trim();
    if (this.settingTelegramChannelId) this.settings.telegramChannelId = this.settingTelegramChannelId.value.trim();
    this.settings.n8nWebhookUrl = this.settingN8nWebhookUrl.value.trim();
    this.settings.n8nAuthToken = this.settingN8nAuthToken.value.trim();
    this.settings.affiliateSubId = this.settingAffiliateSubid.value.trim() || 'pinterest_pins';

    await this.saveSettings();
    await this.checkBackendStatus();
    this.showToast('✅ Semua pengaturan berhasil disimpan permanen!', 'success');
  }

  async testGoogleSheetsConnection() {
    const url = this.settingSheetsWebhookUrl.value.trim() || this.settings.sheetsWebhookUrl;
    if (!url) {
      this.showToast('Masukkan URL Webhook Google Sheets terlebih dahulu', 'error');
      return;
    }

    this.showToast('Menguji koneksi Google Sheets...', 'info');
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'TEST_KONEKSI_AFFILIATOR_KILLER',
          discountedPrice: 'Rp 99.000',
          status: 'Test Connection Success'
        })
      });
      this.showToast('✅ Koneksi Google Sheets Berhasil!', 'success');
    } catch (e) {
      this.showToast('Gagal terhubung ke Google Sheets Webhook', 'error');
    }
  }

  async testN8nWebhook() {
    const url = this.settingN8nWebhookUrl.value.trim() || this.settings.n8nWebhookUrl;
    if (!url) {
      this.showToast('Masukkan URL Webhook n8n terlebih dahulu', 'error');
      return;
    }

    this.showToast('Menguji webhook n8n...', 'info');
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test_connection', message: 'Hello from Affiliator Killer' })
      });
      this.showToast('✅ Webhook n8n menerima test payload!', 'success');
    } catch (e) {
      this.showToast('Gagal menghubungi n8n. Periksa URL atau CORS.', 'error');
    }
  }

  // --- Toast Notification Helper ---
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.affiliatorApp = new AffiliatorKillerApp();
});
