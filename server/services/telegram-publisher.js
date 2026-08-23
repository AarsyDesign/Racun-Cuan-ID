/**
 * Telegram Publisher Service
 * Handles broadcasting to Telegram Channels using Telegram Bot API
 * Features:
 * - HTML formatted messages with clean typography
 * - High-definition image dispatch with inline CTA buttons
 * - Shopee affiliate link integration
 * - Channel verification and test pinging
 */

const dbService = require('./db-service');

class TelegramPublisher {
  constructor() {
    this.defaultToken = process.env.TELEGRAM_BOT_TOKEN || '';
  }

  getApiBaseUrl(token = null) {
    const activeToken = (token || this.getToken()).trim();
    return `https://api.telegram.org/bot${activeToken}`;
  }

  getToken() {
    const connections = dbService.getConnections();
    return connections.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || this.defaultToken;
  }

  getChannelId() {
    const connections = dbService.getConnections();
    return connections.telegramChannelId || process.env.TELEGRAM_CHANNEL_ID || '';
  }

  /**
   * Verifies Bot Token using getMe
   */
  async verifyBot(token = null) {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      throw new Error('Telegram Bot Token belum diisi.');
    }

    const url = `${this.getApiBaseUrl(activeToken)}/getMe`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      throw new Error(`Telegram API Error: ${data.description || 'Token bot tidak valid'}`);
    }

    return data.result;
  }

  /**
   * Retrieves Chat / Channel info using getChat
   */
  async getChatInfo(chatId = null, token = null) {
    const activeChatId = chatId || this.getChannelId();
    if (!activeChatId) {
      throw new Error('Channel ID atau Username (@channel) belum diisi.');
    }

    const url = `${this.getApiBaseUrl(token)}/getChat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChatId })
    });

    const data = await res.json();
    if (!data.ok) {
      let desc = data.description || 'Gagal mengakses channel';
      if (desc.includes('chat not found')) {
        desc = `Channel "${activeChatId}" tidak ditemukan. Pastikan username benar (contoh: @namachannel) atau bot sudah dimasukkan ke channel tersebut.`;
      } else if (desc.includes('bot is not a member') || desc.includes('bot was kicked')) {
        desc = `Bot belum menjadi anggota channel "${activeChatId}". Silakan buka Pengaturan Channel -> Administrators -> Tambahkan Bot @linkaffiliatorbot sebagai Admin.`;
      }
      throw new Error(desc);
    }

    return data.result;
  }

  /**
   * Sends a test message to the configured channel
   */
  async sendTestMessage(chatId = null, token = null) {
    const activeChatId = chatId || this.getChannelId();
    if (!activeChatId) {
      throw new Error('Channel ID belum diisi. Masukkan username channel (misal: @racuncuan_id) atau ID numerik.');
    }

    const botInfo = await this.verifyBot(token);

    const message = `✨ <b>RACUN CUAN.ID - TELEGRAM BOT ACTIVE</b> ✨\n\n` +
      `🤖 <b>Bot:</b> @${botInfo.username || 'Bot'} (${botInfo.first_name || 'Link Affiliate'})\n` +
      `📢 <b>Target Channel:</b> <code>${activeChatId}</code>\n` +
      `⚡ <b>Status:</b> Terhubung & Siap Broadcast Promo Shopee\n` +
      `⏱️ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n\n` +
      `<i>Bot ini siap mengirimkan ribuan rekomendasi produk & link affiliate Shopee otomatis ke channel ini!</i> 🚀`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🛍️ Kunjungi Shopee Promo', url: 'https://shopee.co.id' }
        ]
      ]
    };

    const res = await this.sendMessage({
      chatId: activeChatId,
      text: message,
      replyMarkup: inlineKeyboard,
      token
    });

    dbService.addLog('SUCCESS', 'TELEGRAM', `✅ Test pesan Telegram berhasil dikirim ke ${activeChatId}`);
    return res;
  }

  /**
   * Low-level sendMessage
   */
  async sendMessage({ chatId, text, parseMode = 'HTML', replyMarkup = null, token = null, disableWebPagePreview = false }) {
    const url = `${this.getApiBaseUrl(token)}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Gagal kirim pesan Telegram (${data.error_code}): ${data.description}`);
    }

    return data.result;
  }

  /**
   * Low-level sendPhoto
   */
  async sendPhoto({ chatId, photo, caption, parseMode = 'HTML', replyMarkup = null, token = null }) {
    const url = `${this.getApiBaseUrl(token)}/sendPhoto`;
    const payload = {
      chat_id: chatId,
      photo,
      caption: caption ? caption.substring(0, 1024) : '', // Telegram photo caption max 1024 chars
      parse_mode: parseMode
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Gagal kirim foto Telegram (${data.error_code}): ${data.description}`);
    }

    return data.result;
  }

  /**
   * Helper to detect clean category name from title or board
   */
  detectCategory(title = '', board = '') {
    if (board && board !== 'Inspirasi & Rekomendasi Shopee' && board !== 'General' && board !== 'Shopee Scraped Products' && board !== 'Inspirasi & Rekomendasi Produk') {
      return board;
    }
    const t = (title || '').toLowerCase();
    if (t.includes('sepatu') || t.includes('sandal') || t.includes('sneaker') || t.includes('heels') || t.includes('boots')) return 'Sepatu & Sandal';
    if (t.includes('celana') || t.includes('kaos') || t.includes('baju') || t.includes('kemeja') || t.includes('jaket') || t.includes('hoodie') || t.includes('dress') || t.includes('rok') || t.includes('t-shirt') || t.includes('sweater') || t.includes('outer') || t.includes('vest') || t.includes('cargo')) return 'Pakaian & Fashion';
    if (t.includes('tas') || t.includes('dompet') || t.includes('backpack') || t.includes('tote') || t.includes('waistbag') || t.includes('slingbag')) return 'Tas & Aksesoris';
    if (t.includes('parfum') || t.includes('perfume') || t.includes('skincare') || t.includes('serum') || t.includes('lip') || t.includes('cream') || t.includes('body') || t.includes('lotion') || t.includes('cushion') || t.includes('sunscreen') || t.includes('edp') || t.includes('edt')) return 'Kecantikan & Perawatan';
    if (t.includes('mug') || t.includes('termos') || t.includes('tumbler') || t.includes('botol') || t.includes('gelas') || t.includes('dapur') || t.includes('lampu') || t.includes('sprei') || t.includes('bantal') || t.includes('sapu') || t.includes('rak')) return 'Perlengkapan Rumah & Living';
    if (t.includes('headset') || t.includes('tws') || t.includes('earphone') || t.includes('speaker') || t.includes('case') || t.includes('charger') || t.includes('holder') || t.includes('kabel') || t.includes('hp') || t.includes('gadget') || t.includes('powerbank') || t.includes('smartwatch') || t.includes('keyboard') || t.includes('mouse')) return 'Gadget & Elektronik';
    if (t.includes('snack') || t.includes('makanan') || t.includes('minuman') || t.includes('kopi') || t.includes('tea') || t.includes('coklat') || t.includes('biskuit')) return 'Makanan & Minuman';
    if (t.includes('jam') || t.includes('kalung') || t.includes('cincin') || t.includes('gelang') || t.includes('kacamata') || t.includes('topi') || t.includes('ikat pinggang') || t.includes('sabuk')) return 'Aksesoris & Fashion';
    if (t.includes('bayi') || t.includes('anak') || t.includes('mainan') || t.includes('pampers')) return 'Ibu & Bayi';
    return (board && board.trim()) ? board : 'Produk Pilihan';
  }

  /**
   * Builds clean, concise Telegram HTML caption (Judul, Harga, Rating, Kategori, Link, Hashtag)
   */
  buildCleanCaption(item, safeAffiliateUrl) {
    const title = this.escapeHtml((item.title || 'Rekomendasi Produk Pilihan').trim());
    const category = this.detectCategory(item.title, item.category || item.targetBoard);

    // Extract price
    let priceFormatted = null;
    let originalPrice = item.originalPrice ? `Rp ${Number(item.originalPrice).toLocaleString('id-ID')}` : null;
    const discount = item.discount || (item.discountPercentage ? `${item.discountPercentage}%` : null);

    if (item.discountedPrice) {
      priceFormatted = `Rp ${Number(item.discountedPrice).toLocaleString('id-ID')}`;
    } else if (item.price) {
      priceFormatted = `Rp ${Number(item.price).toLocaleString('id-ID')}`;
    } else if (item.description) {
      const match = item.description.match(/(?:Harga(?:\s*Diskon)?:\s*)?(Rp\s*[\d\.\,]+)/i);
      if (match) priceFormatted = match[1].replace(/\s+/g, ' ');
    }

    // Extract rating & sold
    let rating = item.rating || '4.9';
    let sold = item.soldCount ? `${item.soldCount} terjual` : 'Terlaris';
    if (item.description && (!item.rating || !item.soldCount)) {
      const rMatch = item.description.match(/Rating:\s*([\d\.]+)(?:\s*\(([^)]+)\))?/i);
      if (rMatch) {
        rating = rMatch[1];
        if (rMatch[2]) sold = rMatch[2].includes('terjual') ? rMatch[2] : `${rMatch[2]} terjual`;
      }
    }

    // Build structured clean caption
    let caption = `✨ <b>${title}</b>\n\n`;

    if (priceFormatted) {
      if (originalPrice && originalPrice !== priceFormatted) {
        caption += `💰 <b>Harga:</b> <s>${originalPrice}</s> ➡️ <b>${priceFormatted}</b>`;
        if (discount) caption += ` <i>(${discount} OFF)</i>`;
        caption += `\n`;
      } else {
        caption += `💰 <b>Harga:</b> <b>${priceFormatted}</b>\n`;
      }
    }

    caption += `⭐ <b>Rating:</b> ${rating} (${sold})\n`;
    caption += `🏷️ <b>Kategori:</b> ${this.escapeHtml(category)}\n\n`;

    caption += `🛒 <b>Link Pembelian Shopee:</b>\n`;
    caption += `👉 <a href="${safeAffiliateUrl}">${safeAffiliateUrl}</a>\n\n`;

    // Hashtags
    const tags = item.aiContent?.hashtags || item.hashtags || ['#ShopeeHaul', '#RacunShopee', '#RekomendasiShopee', '#ShopeeAffiliate'];
    caption += tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');

    return caption;
  }

  /**
   * Formats and publishes a Shopee Product to Telegram Channel
   */
  async publishProduct(product, options = {}) {
    const startTime = Date.now();
    const token = options.token || this.getToken();
    const chatId = options.chatId || this.getChannelId();

    if (!chatId) {
      throw new Error('Telegram Channel ID belum dikonfigurasi. Silakan atur di menu Connections.');
    }

    const safeAffiliateUrl = this.ensureValidPublicUrl(product.affiliateUrl || product.productUrl || 'https://shopee.co.id', product.title);
    const imageUrl = product.imageUrl || product.galleryImages?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80';

    // Build concise, clean caption
    const caption = this.buildCleanCaption(product, safeAffiliateUrl);

    const inlineButtons = [
      [
        { text: '🛍️ BELI SEKARANG DI SHOPEE', url: safeAffiliateUrl }
      ]
    ];

    if (options.includeStudioLink) {
      inlineButtons.push([
        { text: '🔍 Lihat Rekomendasi Lainnya', url: 'https://shopee.co.id' }
      ]);
    }

    const replyMarkup = { inline_keyboard: inlineButtons };

    dbService.addLog('INFO', 'TELEGRAM', `Mengirim produk "${product.title.substring(0, 35)}..." ke Channel: ${chatId}`);

    let telegramRes = null;
    if (imageUrl && imageUrl.startsWith('http')) {
      try {
        telegramRes = await this.sendPhoto({
          chatId,
          photo: imageUrl,
          caption,
          replyMarkup,
          token
        });
      } catch (err) {
        // Fallback to text message if photo fails
        console.warn('[TelegramPublisher] Send photo failed, falling back to text:', err.message);
        telegramRes = await this.sendMessage({
          chatId,
          text: `🖼️ <a href="${imageUrl}">[Foto Produk]</a>\n\n${caption}`,
          replyMarkup,
          token
        });
      }
    } else {
      telegramRes = await this.sendMessage({
        chatId,
        text: caption,
        replyMarkup,
        token
      });
    }

    const durationMs = Date.now() - startTime;
    const postLink = this.formatPostLink(chatId, telegramRes.message_id);

    // Save to History
    const historyRecord = dbService.addHistoryRecord({
      campaignName: 'Telegram Broadcast',
      title: product.title,
      platform: 'TELEGRAM',
      channelId: chatId,
      affiliateUrl: safeAffiliateUrl,
      telegramPostUrl: postLink,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      durationMs
    });

    dbService.addLog('SUCCESS', 'TELEGRAM', `✅ Berhasil broadcast ke Telegram Channel! ${postLink ? `Link: ${postLink}` : ''} (${durationMs}ms)`);

    return {
      success: true,
      platform: 'TELEGRAM',
      messageId: telegramRes.message_id,
      postUrl: postLink,
      historyId: historyRecord.id,
      durationMs
    };
  }

  /**
   * Formats and publishes a Queue/Campaign Item to Telegram Channel
   */
  async publishPin(queueItem, options = {}) {
    const startTime = Date.now();
    const token = options.token || this.getToken();
    const chatId = options.chatId || this.getChannelId();

    if (!chatId) {
      throw new Error('Telegram Channel ID belum dikonfigurasi.');
    }

    const safeAffiliateUrl = this.ensureValidPublicUrl(queueItem.affiliateUrl || 'https://shopee.co.id', queueItem.title);
    const imageUrl = queueItem.imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80';

    // Build concise clean caption
    const caption = this.buildCleanCaption(queueItem, safeAffiliateUrl);

    const inlineButtons = [
      [
        { text: '🛍️ LIHAT PRODUK & ORDER DI SHOPEE', url: safeAffiliateUrl }
      ]
    ];

    if (queueItem.pinterestPinUrl && queueItem.pinterestPinUrl.startsWith('http') && !queueItem.pinterestPinUrl.includes('localhost')) {
      inlineButtons.push([
        { text: '📌 Lihat Pin di Pinterest', url: queueItem.pinterestPinUrl }
      ]);
    }

    const replyMarkup = { inline_keyboard: inlineButtons };

    dbService.addLog('INFO', 'TELEGRAM', `Mengirim Queue Item "${queueItem.title.substring(0, 35)}..." ke Channel: ${chatId}`);

    let telegramRes = null;
    if (imageUrl && imageUrl.startsWith('http')) {
      try {
        telegramRes = await this.sendPhoto({
          chatId,
          photo: imageUrl,
          caption,
          replyMarkup,
          token
        });
      } catch (err) {
        console.warn('[TelegramPublisher] Send photo error, falling back to text:', err.message);
        telegramRes = await this.sendMessage({
          chatId,
          text: `🖼️ <a href="${imageUrl}">[Lihat Visual]</a>\n\n${caption}`,
          replyMarkup,
          token
        });
      }
    } else {
      telegramRes = await this.sendMessage({
        chatId,
        text: caption,
        replyMarkup,
        token
      });
    }

    const durationMs = Date.now() - startTime;
    const postLink = this.formatPostLink(chatId, telegramRes.message_id);

    // Save to History
    const historyRecord = dbService.addHistoryRecord({
      campaignName: queueItem.campaignName || 'Campaign Studio',
      title: queueItem.title,
      platform: 'TELEGRAM',
      channelId: chatId,
      affiliateUrl: safeAffiliateUrl,
      telegramPostUrl: postLink,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      durationMs
    });

    dbService.addLog('SUCCESS', 'TELEGRAM', `✅ Item berhasil dibroadcast ke Telegram Channel! (${durationMs}ms)`);

    return {
      success: true,
      platform: 'TELEGRAM',
      messageId: telegramRes.message_id,
      postUrl: postLink,
      historyId: historyRecord.id,
      durationMs
    };
  }

  ensureValidPublicUrl(url, title = '') {
    if (!url || typeof url !== 'string') {
      return title ? `https://shopee.co.id/search?keyword=${encodeURIComponent(title)}` : 'https://shopee.co.id';
    }
    let trimmed = url.trim();
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return title ? `https://shopee.co.id/search?keyword=${encodeURIComponent(title)}` : 'https://shopee.co.id';
    }
    // Convert internal affiliate dashboard offer links into real Shopee buyer search links
    if (trimmed.includes('/offer/product_offer/') || trimmed.includes('/offer/')) {
      return title ? `https://shopee.co.id/search?keyword=${encodeURIComponent(title)}` : 'https://shopee.co.id';
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    try {
      new URL(trimmed);
      return trimmed;
    } catch (e) {
      return title ? `https://shopee.co.id/search?keyword=${encodeURIComponent(title)}` : 'https://shopee.co.id';
    }
  }

  formatPostLink(chatId, messageId) {
    if (!chatId || !messageId) return null;
    if (chatId.startsWith('@')) {
      const cleanUsername = chatId.replace('@', '');
      return `https://t.me/${cleanUsername}/${messageId}`;
    } else if (chatId.startsWith('-100')) {
      const cleanId = chatId.replace('-100', '');
      return `https://t.me/c/${cleanId}/${messageId}`;
    }
    return null;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

module.exports = new TelegramPublisher();
