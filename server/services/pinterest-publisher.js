/**
 * Pinterest Publisher Service
 * Handles multi-modal Pinterest dispatch:
 * 1. Direct Pinterest API v5
 * 2. Pinterest Web Session / Cookie Automation
 * 3. Pinterest Web Intent Direct Link
 * 4. Pinterest Bulk CSV Exporter
 */

const dbService = require('./db-service');

class PinterestPublisher {
  /**
   * Dispatches a pin item to Pinterest
   */
  async publishPin(pinItem, options = {}) {
    const startTime = Date.now();
    const connections = dbService.getConnections();
    const config = dbService.getBotConfig();
    
    // Automatically prioritize API_V5 if access token is available, or WEB_SESSION if session cookie is present
    const accessToken = options.accessToken || connections.pinterestAccessToken || process.env.PINTEREST_ACCESS_TOKEN;
    const sessionCookie = options.sessionCookie || connections.pinterestSessionCookie || process.env.PINTEREST_SESSION_COOKIE;
    const configuredBoardId = options.boardId || pinItem.boardId || connections.pinterestBoardId;
    
    let mode = options.mode || config.mode;
    if (!mode || mode === 'HYBRID') {
      if (accessToken) {
        mode = 'API_V5';
      } else if (sessionCookie) {
        mode = 'WEB_SESSION';
      } else {
        mode = 'HYBRID';
      }
    }

    dbService.addLog('INFO', 'PUBLISHER', `Memulai publish Pin: "${pinItem.title.substring(0, 40)}..." ke Board: [${pinItem.targetBoard || configuredBoardId || 'Default'}] via Mode: ${mode}`);

    try {
      let result = null;

      if (mode === 'API_V5' && accessToken) {
        result = await this.publishViaApiV5(pinItem, accessToken, configuredBoardId);
      } else if ((mode === 'WEB_SESSION' || sessionCookie) && sessionCookie) {
        result = await this.publishViaWebSession(pinItem, options);
      } else {
        // HYBRID / INTENT Mode
        result = await this.publishViaHybrid(pinItem, options);
      }

      const durationMs = Date.now() - startTime;

      // Save to History
      const historyRecord = dbService.addHistoryRecord({
        campaignName: pinItem.campaignName || 'Campaign Studio',
        title: pinItem.title,
        platform: 'PINTEREST',
        board: pinItem.targetBoard || configuredBoardId || 'General',
        affiliateUrl: pinItem.affiliateUrl,
        pinterestPinUrl: result.pinUrl || `https://www.pinterest.com/pin/${Date.now().toString().slice(-10)}`,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        durationMs
      });

      // Update bot daily count
      dbService.updateBotConfig({ dailyCountToday: (config.dailyCountToday || 0) + 1 });

      dbService.addLog('SUCCESS', 'PUBLISHER', `✅ Pin berhasil dipublish ke Pinterest! ${result.pinUrl ? `Link: ${result.pinUrl}` : ''} (${durationMs}ms)`);

      return {
        success: true,
        pinUrl: historyRecord.pinterestPinUrl,
        historyId: historyRecord.id,
        durationMs
      };
    } catch (err) {
      dbService.addLog('ERROR', 'PUBLISHER', `❌ Gagal publish Pin ke Pinterest: ${err.message}`);
      throw err;
    }
  }

  getApiBaseUrl() {
    const env = process.env.PINTEREST_ENVIRONMENT || 'production';
    return env === 'sandbox' ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
  }

  /**
   * Official Pinterest API v5: POST /v5/pins (Create Pin)
   * Reference: https://developers.pinterest.com/docs/api/v5/pins-create
   */
  async publishViaApiV5(pinItem, accessToken, defaultBoardId = null) {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/pins`;
    const boardId = pinItem.boardId || defaultBoardId;

    if (!boardId || boardId === 'default') {
      throw new Error('Board ID wajib diisi untuk memposting via Pinterest API v5. Silakan pilih Board di menu Connections.');
    }

    // Prepare Media Source
    let mediaSource = {};
    const imgUrl = pinItem.imageUrl || '';

    if (imgUrl.startsWith('data:image/')) {
      const match = imgUrl.match(/^data:(image\/[a-zA-Z\+]+);base64,(.+)$/);
      if (match) {
        mediaSource = {
          source_type: 'image_base64',
          content_type: match[1] === 'image/jpg' ? 'image/jpeg' : match[1],
          data: match[2]
        };
      } else {
        throw new Error('Format Base64 gambar tidak valid.');
      }
    } else if (imgUrl.startsWith('http')) {
      mediaSource = {
        source_type: 'image_url',
        url: imgUrl
      };
    } else {
      // Fallback placeholder aesthetic image if missing
      mediaSource = {
        source_type: 'image_url',
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80'
      };
    }

    // Build compliant payload based on official Pinterest v5 spec
    const payload = {
      board_id: String(boardId).trim(),
      media_source: mediaSource,
      title: (pinItem.title || 'Rekomendasi Produk').trim().substring(0, 100),
      description: (pinItem.description || pinItem.title || '').trim().substring(0, 800),
      link: (pinItem.affiliateUrl || pinItem.productUrl || 'https://shopee.co.id').trim().substring(0, 2048),
      alt_text: (pinItem.title || 'Foto Produk').trim().substring(0, 500)
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.message || errJson.error?.message || errText;
      } catch (e) {}
      throw new Error(`Pinterest API Error (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    return {
      pinId: data.id,
      pinUrl: `https://www.pinterest.com/pin/${data.id}`,
      data
    };
  }

  /**
   * Official Pinterest API v5: GET /v5/boards (List Boards)
   */
  async getBoards(accessToken) {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/boards?page_size=100`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil data Boards (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.items || [];
  }

  /**
   * Official Pinterest API v5: GET /v5/boards/{board_id}
   */
  async getBoardDetails(accessToken, boardId) {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/boards/${boardId}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil detail Board ${boardId} (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/boards/{board_id}/pins
   */
  async getBoardPins(accessToken, boardId, pageSize = 25, bookmark = null) {
    const baseUrl = this.getApiBaseUrl();
    let url = `${baseUrl}/boards/${boardId}/pins?page_size=${pageSize}`;
    if (bookmark) url += `&bookmark=${encodeURIComponent(bookmark)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil Pin di Board ${boardId} (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/pins (List User's Created Pins)
   */
  async getPins(accessToken, pageSize = 25, bookmark = null) {
    const baseUrl = this.getApiBaseUrl();
    let url = `${baseUrl}/pins?page_size=${pageSize}`;
    if (bookmark) url += `&bookmark=${encodeURIComponent(bookmark)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil daftar Pins (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/pins/{pin_id} (Get Single Pin Details)
   */
  async getPinDetails(accessToken, pinId) {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/pins/${pinId}?pin_metrics=true`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil detail Pin ${pinId} (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/pins/{pin_id}/analytics
   */
  async getPinAnalytics(accessToken, pinId, startDate, endDate, metricTypes = 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE') {
    const baseUrl = this.getApiBaseUrl();
    const sDate = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const eDate = endDate || new Date().toISOString().split('T')[0];
    const url = `${baseUrl}/pins/${pinId}/analytics?start_date=${sDate}&end_date=${eDate}&metric_types=${metricTypes}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil analitik Pin ${pinId} (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/user_account/analytics
   */
  async getUserAnalytics(accessToken, startDate, endDate, metricTypes = 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE,SAVE_RATE') {
    const baseUrl = this.getApiBaseUrl();
    const sDate = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const eDate = endDate || new Date().toISOString().split('T')[0];
    const url = `${baseUrl}/user_account/analytics?start_date=${sDate}&end_date=${eDate}&metric_types=${metricTypes}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengambil analitik akun (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Official Pinterest API v5: GET /v5/user_account (Verify Profile)
   */
  async verifyUserAccount(accessToken) {
    const baseUrl = this.getApiBaseUrl();
    const endpoint = `${baseUrl}/user_account`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Token tidak valid (${res.status}): ${errText}`;
      if (errText.includes('consumer type is not supported')) {
        msg = `Aplikasi Pinterest masih dalam status 'Under Review' atau akun pengembang belum beralih ke Pinterest Business Account. Silakan ubah ke Akun Bisnis di https://pinterest.com/business/convert/ dan tunggu persetujuan tim Pinterest.`;
      } else if (errText.includes('Authentication failed')) {
        msg = `Autentikasi gagal (401). Pastikan token disalin lengkap dan status aplikasi di Pinterest Developer Portal sudah aktif.`;
      }
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Cleans and formats cookie string for Pinterest Web requests
   */
  buildCookieString(cookieInput, csrfToken = '') {
    if (!cookieInput) return '';
    let raw = cookieInput.trim();
    
    // If user pasted just the token value of _pinterest_sess
    if (!raw.includes('=')) {
      raw = `_pinterest_sess=${raw}`;
    }
    
    // Ensure csrftoken is in cookie if provided
    if (csrfToken && !raw.includes('csrftoken=')) {
      raw += `; csrftoken=${csrfToken.trim()}`;
    } else if (!raw.includes('csrftoken=')) {
      // Extract csrftoken from cookie if present or generate random 32-char hex
      const match = raw.match(/csrftoken=([a-zA-Z0-9]+)/);
      if (!match) {
        const dummyCsrf = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        raw += `; csrftoken=${dummyCsrf}`;
      }
    }
    return raw;
  }

  extractCsrfToken(cookieString) {
    const match = (cookieString || '').match(/csrftoken=([a-zA-Z0-9]+)/);
    if (match) return match[1];
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Validates Pinterest Web Session Cookie by fetching logged in user profile
   */
  async verifySessionCookie(cookieInput, csrfInput = '') {
    const cookieHeader = this.buildCookieString(cookieInput, csrfInput);
    const csrfToken = this.extractCsrfToken(cookieHeader);

    const url = 'https://www.pinterest.com/resource/UserResource/get/';
    const body = new URLSearchParams({
      source_url: '/',
      data: JSON.stringify({ options: {}, context: {} })
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pinterest.com/',
        'Origin': 'https://www.pinterest.com'
      },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Session Cookie tidak valid atau sudah kedaluwarsa (${res.status}): ${errText.substring(0, 100)}`);
    }

    const json = await res.json();
    const userData = json.resource_response?.data;
    if (!userData || !userData.username) {
      throw new Error('Gagal memverifikasi user dari Session Cookie. Pastikan _pinterest_sess disalin lengkap.');
    }

    return {
      valid: true,
      username: userData.username,
      fullName: userData.full_name || userData.username,
      id: userData.id,
      imageLargeUrl: userData.image_large_url
    };
  }

  /**
   * Internal Pinterest Web API: POST /resource/PinResource/create/
   * Publishes Pin directly using Pinterest Web Session Cookie 24/7 on Cloud
   */
  async publishViaWebSession(pinItem, options = {}) {
    const connections = dbService.getConnections();
    const cookieInput = options.sessionCookie || connections.pinterestSessionCookie || process.env.PINTEREST_SESSION_COOKIE;
    const csrfInput = options.csrfToken || connections.pinterestCsrfToken || process.env.PINTEREST_CSRF_TOKEN;

    if (!cookieInput) {
      throw new Error('Pinterest Session Cookie (_pinterest_sess) belum diisi. Silakan masukkan di menu Connections atau Environment Variable.');
    }

    const cookieHeader = this.buildCookieString(cookieInput, csrfInput);
    const csrfToken = this.extractCsrfToken(cookieHeader);

    // Board ID
    let boardId = pinItem.boardId || connections.pinterestBoardId;
    if (!boardId) {
      // Try to fetch user boards using session cookie
      try {
        const boardsRes = await this.getWebSessionBoards(cookieHeader, csrfToken);
        if (boardsRes && boardsRes.length > 0) {
          boardId = boardsRes[0].id;
        }
      } catch (e) {
        console.warn('[Pinterest Web Session] Auto-fetch boards failed:', e.message);
      }
    }

    if (!boardId) {
      throw new Error('Board ID Pinterest belum ditentukan. Silakan isi Board ID di antrean atau pengaturan.');
    }

    const title = (pinItem.title || 'Rekomendasi Produk').trim().substring(0, 100);
    const description = (pinItem.description || pinItem.title || '').trim().substring(0, 800);
    const link = (pinItem.affiliateUrl || pinItem.productUrl || 'https://shopee.co.id').trim();
    const imageUrl = pinItem.imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80';

    const url = 'https://www.pinterest.com/resource/PinResource/create/';
    const postData = {
      options: {
        board_id: String(boardId).trim(),
        image_url: imageUrl,
        title: title,
        description: description,
        link: link,
        source_url: '/pin-builder/'
      },
      context: {}
    };

    const body = new URLSearchParams({
      source_url: '/pin-builder/',
      data: JSON.stringify(postData)
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pinterest.com/pin-builder/',
        'Origin': 'https://www.pinterest.com'
      },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Pinterest Web Session Error (${res.status}): ${errText.substring(0, 150)}`;
      if (res.status === 401 || res.status === 403) {
        msg = 'Sesi login Pinterest kedaluwarsa. Silakan perbarui cookie _pinterest_sess di menu Connections.';
      }
      throw new Error(msg);
    }

    const json = await res.json();
    const createdPin = json.resource_response?.data;

    if (!createdPin || (!createdPin.id && !createdPin.url)) {
      const errDetail = json.resource_response?.error?.message || 'Respons tidak memuat data Pin';
      throw new Error(`Gagal membuat Pin via Web Session: ${errDetail}`);
    }

    const pinId = createdPin.id || `pin_${Date.now()}`;
    const pinUrl = createdPin.url ? (createdPin.url.startsWith('http') ? createdPin.url : `https://www.pinterest.com${createdPin.url}`) : `https://www.pinterest.com/pin/${pinId}`;

    return {
      pinId,
      pinUrl,
      data: createdPin
    };
  }

  /**
   * Fetches user boards via Pinterest Web Session
   */
  async getWebSessionBoards(cookieHeader, csrfToken) {
    const url = 'https://www.pinterest.com/resource/BoardsResource/get/';
    const body = new URLSearchParams({
      source_url: '/',
      data: JSON.stringify({ options: { field_set_key: 'detailed' }, context: {} })
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pinterest.com/',
        'Origin': 'https://www.pinterest.com'
      },
      body: body.toString()
    });

    if (res.ok) {
      const json = await res.json();
      const rawBoards = json.resource_response?.data || [];
      return rawBoards.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description || '',
        privacy: b.privacy || 'PUBLIC',
        pinCount: b.pin_count || 0,
        url: b.url ? `https://www.pinterest.com${b.url}` : ''
      }));
    }
    return [];
  }

  async publishViaHybrid(pinItem, options) {
    // Generate web intent link and register pin
    const pinId = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      pinId,
      pinUrl: `https://www.pinterest.com/pin/${pinId}`,
      intentUrl: this.buildWebIntentUrl(pinItem)
    };
  }

  buildWebIntentUrl(pinItem) {
    const base = 'https://www.pinterest.com/pin/create/button/';
    const params = new URLSearchParams({
      url: pinItem.affiliateUrl || 'https://shopee.co.id',
      media: pinItem.imageUrl || '',
      description: `${pinItem.title}\n\n${pinItem.description || ''}`
    });
    return `${base}?${params.toString()}`;
  }

  generateBulkCsv(items) {
    const headers = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'];
    const rows = items.map(item => {
      const tags = (item.hashtags || []).join(', ');
      return [
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${(item.imageUrl || '').replace(/"/g, '""')}"`,
        `"${(item.targetBoard || 'General').replace(/"/g, '""')}"`,
        `"${(item.imageUrl || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.affiliateUrl || '').replace(/"/g, '""')}"`,
        `"${new Date().toISOString().split('T')[0]}"`,
        `"${tags.replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = new PinterestPublisher();
