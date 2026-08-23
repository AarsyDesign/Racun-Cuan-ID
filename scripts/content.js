/**
 * Affiliator Killer - High-Precision Shopee & Shopee Affiliate Content Scraper
 * Features:
 * 1. Bulletproof Title Extractor (Eliminates "Shopee" generic fallback, extracts true product name)
 * 2. STRICT Hero Gallery Target: Grabs ONLY official product gallery images (TOP-LEFT).
 * 3. STRICT Blacklist: NEVER touches review photos, buyer comments, chat, or avatars.
 * 4. Multi-Gallery Extraction: Grabs all official seller product photos.
 * 5. Strict JSON-LD parser (Rejects WebSite/Breadcrumb schemas).
 */

(() => {
  // --- REAL SHOPEE SHORTLINK SNIFFER & MODAL OBSERVER ---
  let lastCapturedShortlink = null;

  function findModalShortlink() {
    // 1. Check all textareas and inputs
    const inputs = Array.from(document.querySelectorAll('textarea, input'));
    for (const el of inputs) {
      const val = (el.value || el.getAttribute('value') || el.innerText || el.textContent || '').trim();
      const match = val.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (match) return match[0];
    }
    // 2. Check full body text / modal innerHTML
    const fullHtml = document.body ? (document.body.innerHTML || '') : '';
    const bodyMatch = fullHtml.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/i);
    if (bodyMatch) return bodyMatch[0];

    return null;
  }

  function closeModal() {
    try {
      const closeButtons = Array.from(document.querySelectorAll('.shopee-modal__close, svg[class*="close"], button[class*="close"], i[class*="close"], div[class*="modal-close"], div[class*="close-btn"], .ant-modal-close'));
      for (const b of closeButtons) {
        try { b.click(); } catch (e) {}
      }
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
      document.dispatchEvent(escEvent);
      window.dispatchEvent(escEvent);
    } catch (e) {}
  }

  // Observe modal popup in real-time
  try {
    const modalObserver = new MutationObserver(() => {
      const link = findModalShortlink();
      if (link && link !== lastCapturedShortlink) {
        lastCapturedShortlink = link;
        console.log('[Affiliator Killer] 🎯 Captured Shopee Shortlink:', link);
        try {
          chrome.runtime.sendMessage({
            action: 'SHOPEE_SHORTLINK_CAPTURED',
            shortlink: link
          });
        } catch (e) {}
      }
    });
    modalObserver.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Listen to messages from Side Panel & Studio Hub
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SCAN_SHOPEE_PAGE') {
      (async () => {
        try {
          const mode = message.mode || 'viewport';
          const url = window.location.href;
          const isAffiliatePage = url.includes('affiliate.shopee') || url.includes('/offer/');
          // Default: always auto-grab shortlinks on affiliate dashboard
          const doAutoShortlinks = isAffiliatePage && (message.autoGenerateShortlinks !== false);

          let products = [];
          if (doAutoShortlinks) {
            products = await extractShopeeAffiliateDashboardWithAutoShortlinks(mode);
          } else {
            products = scanShopeePage(mode);
          }
          console.log(`[Affiliator Killer] Scanned ${products.length} products.`, products);
          sendResponse({ success: true, count: products.length, products });
        } catch (err) {
          console.error('[Affiliator Killer] Scraping error:', err);
          sendResponse({ success: false, error: err.message, products: [] });
        }
      })();
      return true; // Keep channel open for async
    }

    if (message.action === 'GET_ACTIVE_MODAL_SHORTLINK') {
      const link = findModalShortlink();
      sendResponse({ success: !!link, shortlink: link });
      return true;
    }
  });

  /**
   * Main Router for Scanner
   */
  function scanShopeePage(mode = 'viewport') {
    const url = window.location.href;
    const isAffiliateDashboard = url.includes('affiliate.shopee') || url.includes('/offer/');

    if (isAffiliateDashboard) {
      console.log('[Affiliator Killer] Scanning Shopee Affiliate Center...');
      return extractShopeeAffiliateDashboard(mode);
    }

    const isSingleProductPage = url.includes('/product/') || /\-i\.\d+\.\d+/.test(url) || !!document.querySelector('.page-product__name, h1, div[class*="product-briefing"]');
    if (isSingleProductPage && !url.includes('/search') && !url.includes('/shop/')) {
      const single = extractSingleProductDetails();
      if (single) return [single];
    }

    return extractMultipleProductCards(mode);
  }

  /**
   * =========================================================================
   * 1. EXTRACT FROM SHOPEE DETAIL PRODUCT PAGE (OFFICIAL GALLERY & TRUE TITLE)
   * =========================================================================
   */
  function extractSingleProductDetails() {
    try {
      // 1. JSON-LD metadata for base verification (Strictly product only)
      const jsonLd = extractJsonLdProduct();

      // 2. High-Precision Title Extractor
      const title = extractShopeeProductTitle(jsonLd);

      // 3. STRICT OFFICIAL GALLERY IMAGE EXTRACTION (TOP-LEFT CONTAINER ONLY)
      const galleryData = extractOfficialProductGallery();
      let primaryImage = galleryData.mainImage || jsonLd?.image || '';
      let galleryImages = galleryData.allImages || [];

      if (!primaryImage && galleryImages.length > 0) {
        primaryImage = galleryImages[0];
      }

      // 4. Price & Discount Extraction (Right Column Briefing)
      const briefingContainer = document.querySelector('div[class*="product-briefing"], div[class*="product-detail"], div[class*="page-product"]') || document.body;
      const allText = briefingContainer.innerText || briefingContainer.textContent || '';

      const prices = extractAllPricesFromText(allText);
      let discountedPrice = jsonLd?.price || (prices.length > 0 ? prices[0] : 0);
      let originalPrice = jsonLd?.price || (prices.length > 1 ? Math.max(...prices) : discountedPrice);

      let discountText = '';
      const discMatch = allText.match(/([0-9]+%)\s*(OFF|DISKON|diskon)?/i);
      if (discMatch) discountText = discMatch[1];

      // 5. Rating & Sold
      const ratingMatch = allText.match(/([45]\.[0-9])/);
      const rating = jsonLd?.rating || (ratingMatch ? parseFloat(ratingMatch[1]) : 4.8);

      const soldMatch = allText.match(/([0-9]+[A-Za-z\+\.]*)\s*(terjual|penilaian|sold)/i);
      const soldCount = soldMatch ? soldMatch[0] : '10RB+ Terjual';

      // 6. Shop & Badges
      const isMall = allText.includes('Mall') || !!document.querySelector('.shopee-badge--mall, div[class*="mall"]');
      const isStar = allText.includes('Star') || !!document.querySelector('.shopee-badge--preferred, div[class*="star"]');

      const shopNameEl = document.querySelector('._3Lybq5, .shop-name, a[href*="/shop/"], div[class*="shop-name"]');
      const shopName = jsonLd?.shopName || (shopNameEl ? shopNameEl.textContent.trim() : 'Official Store');

      const { shopId, itemId } = extractShopAndItemIds(window.location.href);

      return {
        id: `prod_${itemId || Date.now()}`,
        itemId: itemId || String(Date.now()),
        shopId: shopId || '',
        title: title || 'Produk Shopee',
        originalPrice: originalPrice || discountedPrice,
        discountedPrice: discountedPrice,
        discount: discountText || (originalPrice > discountedPrice ? `${Math.round((1 - discountedPrice/originalPrice)*100)}%` : 'Flash Sale'),
        rating: rating,
        soldCount: soldCount,
        shopName: shopName,
        shopLocation: 'Indonesia',
        shopType: isMall ? 'Mall' : (isStar ? 'Star+' : 'Star'),
        imageUrl: primaryImage || generateProductFallbackSvg(title, discountedPrice),
        galleryImages: galleryImages.length > 0 ? galleryImages : [primaryImage],
        productUrl: window.location.href.split('?')[0],
        scrapedAt: new Date().toISOString()
      };
    } catch (e) {
      console.warn('Single product extraction warning:', e);
      return null;
    }
  }

  /**
   * ULTRA-ROBUST TITLE EXTRACTOR FOR SHOPEE (TOP OF RIGHT PRODUCT SECTION)
   */
  function extractShopeeProductTitle(jsonLd) {
    const briefingEl = document.querySelector('div[class*="product-briefing"], div[class*="page-product"]') || document.body;

    // 1. Direct Visual Element: Positioned directly above Star Rating / Penilaian / Flash Sale
    try {
      // Find rating or review count container ("Penilaian", "Terjual", "Laporkan")
      const ratingRow = Array.from(briefingEl.querySelectorAll('div, section, span')).find(el => {
        const t = el.textContent || '';
        return (t.includes('Penilaian') && t.includes('Terjual')) || t.includes('Laporkan') || t.includes('Penilaian');
      });

      if (ratingRow) {
        let candidate = ratingRow.previousElementSibling;
        if (!candidate && ratingRow.parentElement) {
          candidate = ratingRow.parentElement.previousElementSibling;
        }
        if (candidate) {
          const clean = cleanTitleString(candidate.textContent || '');
          if (isValidProductTitle(clean)) return clean;
        }
      }
    } catch (e) {}

    // 2. Direct Visual Element: Positioned directly above Flash Sale bar
    try {
      const flashSaleBar = Array.from(briefingEl.querySelectorAll('div, section')).find(el => {
        const t = el.textContent || '';
        return t.includes('FLASH SALE') || (t.includes('BERAKHIR DALAM') && t.includes('Rp'));
      });

      if (flashSaleBar) {
        let candidate = flashSaleBar.previousElementSibling;
        if (!candidate && flashSaleBar.parentElement) {
          candidate = flashSaleBar.parentElement.previousElementSibling;
        }
        if (candidate) {
          // If candidate contains rating row, check its previous sibling
          if (candidate.textContent.includes('Penilaian') || candidate.textContent.includes('Terjual')) {
            const aboveRating = candidate.previousElementSibling || candidate.parentElement?.previousElementSibling;
            if (aboveRating) {
              const clean = cleanTitleString(aboveRating.textContent || '');
              if (isValidProductTitle(clean)) return clean;
            }
          }
          const clean = cleanTitleString(candidate.textContent || '');
          if (isValidProductTitle(clean)) return clean;
        }
      }
    } catch (e) {}

    // 3. Known Shopee Title Selectors in Right Column
    const titleSelectors = [
      'h1',
      '.page-product__name',
      'div.vR644q',
      'span._44qnta',
      'div._44qnta',
      'div[class*="product-name"]',
      'div[class*="title"]',
      'span[class*="title"]',
      'div.WBVL_7'
    ];

    for (const sel of titleSelectors) {
      const el = briefingEl.querySelector(sel);
      if (el && !isInsideExcludedSection(el)) {
        const clean = cleanTitleString(el.textContent || '');
        if (isValidProductTitle(clean)) return clean;
      }
    }

    // 4. OpenGraph & Twitter Meta Tags (<meta property="og:title">)
    const metaOg = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (metaOg) {
      const cleanOg = cleanTitleString(metaOg);
      if (isValidProductTitle(cleanOg)) return cleanOg;
    }

    const metaTwitter = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
    if (metaTwitter) {
      const cleanTw = cleanTitleString(metaTwitter);
      if (isValidProductTitle(cleanTw)) return cleanTw;
    }

    // 5. From strictly validated Product JSON-LD (if name is valid product title)
    if (jsonLd && jsonLd.name && typeof jsonLd.name === 'string') {
      const cleanJson = cleanTitleString(jsonLd.name);
      if (isValidProductTitle(cleanJson)) return cleanJson;
    }

    // 6. Scan all text elements in product briefing
    const allSpans = Array.from(briefingEl.querySelectorAll('span, div, h2, h3'));
    for (const el of allSpans) {
      if (isInsideExcludedSection(el)) continue;
      const text = el.textContent || '';
      if (text.length > 20 && text.length < 350) {
        const clean = cleanTitleString(text);
        if (isValidProductTitle(clean) && !clean.includes('Voucher Toko') && !clean.includes('Garansi')) {
          return clean;
        }
      }
    }

    // 7. Clean Document Title
    if (document.title) {
      const cleanDoc = cleanTitleString(document.title);
      if (isValidProductTitle(cleanDoc)) return cleanDoc;
    }

    return 'Produk Shopee';
  }

  function cleanTitleString(raw) {
    if (!raw) return '';
    // Normalize newlines and excess whitespace
    let clean = raw.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^Jual\s+/i, '');
    clean = clean.replace(/^Shopee\s+(Indonesia)?\s*[\:\|\-]\s*/i, '');
    clean = clean.replace(/^Shopee\s*\|\s*/i, '');
    clean = clean.replace(/\s*[\-\|]\s*Shopee\s*(Indonesia)?.*$/i, '');
    clean = clean.replace(/\s*\|\s*Shopee.*$/i, '');
    clean = clean.replace(/^(\s*Star\+?|\s*Star|\s*Mall|\s*Official Store|\s*Preferred\+?|\s*Diskon|\s*Promo)\s*/i, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }

  function isValidProductTitle(str) {
    if (!str || typeof str !== 'string') return false;
    const lower = str.toLowerCase().trim();
    if (lower === 'shopee' || lower === 'shopee indonesia' || lower === 'beranda' || lower === 'home') return false;
    if (str.length < 8) return false;
    if (str.startsWith('Rp') && str.length < 25) return false;
    if (lower.startsWith('flash sale') || lower.includes('berakhir dalam')) return false;
    return true;
  }

  /**
   * STRICT EXTRACTION OF OFFICIAL GALLERY (EXCLUDES REVIEWS & CHAT)
   */
  function extractOfficialProductGallery() {
    const imagesFound = [];

    const galleryContainers = Array.from(document.querySelectorAll(
      'div[class*="product-briefing"] > div:first-child, ' +
      'div[class*="product-briefing"] div[class*="page-product__image"], ' +
      'div[class*="product-briefing"] div[class*="carousel"], ' +
      'div[class*="product-briefing"] div[class*="gallery"], ' +
      'div[class*="product-briefing"] div._2FHg1q, ' +
      'div[class*="page-product"] div.flex-column:first-child'
    ));

    const searchScope = galleryContainers.length > 0 
      ? galleryContainers 
      : [document.querySelector('div[class*="product-briefing"], div[class*="page-product"]') || document.body];

    searchScope.forEach(scope => {
      if (!scope) return;

      // 1. Grab from <img> tags in gallery
      const imgs = Array.from(scope.querySelectorAll('img'));
      imgs.forEach(img => {
        if (isInsideExcludedSection(img)) return;

        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (isValidShopeeProductImage(src)) {
          const clean = cleanShopeeImageUrl(src);
          if (clean && !imagesFound.includes(clean)) {
            imagesFound.push(clean);
          }
        }
      });

      // 2. Grab from CSS background-image in gallery
      const bgElements = Array.from(scope.querySelectorAll('div[style*="background"], span[style*="background"]'));
      bgElements.forEach(el => {
        if (isInsideExcludedSection(el)) return;
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?(https?:\/\/[^'"\)]+)['"]?\)/i);
        if (match && isValidShopeeProductImage(match[1])) {
          const clean = cleanShopeeImageUrl(match[1]);
          if (clean && !imagesFound.includes(clean)) {
            imagesFound.push(clean);
          }
        }
      });

      // 3. Grab from <picture> sources
      const sources = Array.from(scope.querySelectorAll('picture source, img[srcset]'));
      sources.forEach(s => {
        if (isInsideExcludedSection(s)) return;
        const srcset = s.getAttribute('srcset') || '';
        const url = srcset.split(',')[0]?.trim().split(' ')[0];
        if (url && isValidShopeeProductImage(url)) {
          const clean = cleanShopeeImageUrl(url);
          if (clean && !imagesFound.includes(clean)) {
            imagesFound.push(clean);
          }
        }
      });
    });

    return {
      mainImage: imagesFound.length > 0 ? imagesFound[0] : '',
      allImages: imagesFound
    };
  }

  /**
   * Check if an element is inside review comments, ratings, chat, or footer
   */
  function isInsideExcludedSection(el) {
    if (!el) return true;
    const excludedClasses = [
      'product-ratings',
      'product-rating',
      'rating-comment',
      'shopee-product-rating',
      'review',
      'comment',
      'chat',
      'feedback',
      'shop-header',
      'header',
      'footer',
      'navbar',
      'recommend'
    ];

    let current = el;
    while (current && current !== document.body) {
      const cls = (current.className || '').toString().toLowerCase();
      const id = (current.id || '').toLowerCase();
      for (const exc of excludedClasses) {
        if (cls.includes(exc) || id.includes(exc)) {
          return true; // Excluded!
        }
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * =========================================================================
   * 2. EXTRACT FROM SHOPEE AFFILIATE DASHBOARD
   * =========================================================================
   */
  function extractShopeeAffiliateDashboard(mode = 'viewport') {
    const products = [];
    const seenKeys = new Set();
    const items = [];

    // Method 1: Locate directly via all product image elements on page
    const allImgs = Array.from(document.querySelectorAll('img')).filter(img => {
      const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!src || src.includes('.svg') || src.includes('label_xtra') || src.includes('avatar') || src.includes('static/img/')) return false;
      const isShopeeHost = src.includes('susercontent.com') || src.includes('cf.shopee.co.id');
      const w = img.offsetWidth || img.naturalWidth || img.getBoundingClientRect().width || 0;
      const h = img.offsetHeight || img.naturalHeight || img.getBoundingClientRect().height || 0;
      return (isShopeeHost || src.startsWith('http')) && (w >= 45 || h >= 45 || img.naturalWidth >= 45);
    });

    allImgs.forEach(img => {
      let card = img.parentElement;
      let matchedCard = null;
      while (card && card !== document.body && card !== document.documentElement) {
        const text = card.innerText || '';
        if (text.includes('Rp') && (text.includes('Buat Link') || text.includes('Komisi') || text.includes('KOMISI'))) {
          matchedCard = card;
          const p = card.parentElement;
          const pText = p ? p.innerText || '' : '';
          const btnCount = (pText.match(/Buat Link/gi) || []).length;
          if (btnCount > 1) {
            break;
          }
        }
        card = card.parentElement;
      }

      if (matchedCard) {
        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        items.push({
          card: matchedCard,
          imageUrl: cleanShopeeImageUrl(src)
        });
      }
    });

    // Method 2: Fallback if no images found via Method 1
    if (items.length === 0) {
      const actionButtons = Array.from(document.querySelectorAll('button, a, div')).filter(el => {
        const t = (el.innerText || el.textContent || '').trim();
        return (t === 'Buat Link' || t === 'Buat link') && el.offsetWidth > 30;
      });

      actionButtons.forEach(btn => {
        let card = btn.parentElement;
        let matchedCard = null;
        while (card && card !== document.body && card !== document.documentElement) {
          const text = card.innerText || '';
          if (text.includes('Rp')) {
            matchedCard = card;
            const p = card.parentElement;
            const pText = p ? p.innerText || '' : '';
            if ((pText.match(/Buat Link/gi) || []).length > 1) {
              break;
            }
          }
          card = card.parentElement;
        }

        if (matchedCard) {
          const imgUrl = extractImageFromCard(matchedCard);
          items.push({ card: matchedCard, imageUrl: imgUrl });
        }
      });
    }

    // Process all identified product cards
    items.forEach((item, index) => {
      const { card, imageUrl } = item;
      if (mode === 'viewport' && !isElementInViewport(card)) return;

      try {
        const text = card.innerText || card.textContent || '';

        // Extract Title
        let title = '';
        const titleEl = card.querySelector('div[class*="title"], div[class*="name"], span[class*="title"], h3, h4, h5, div[title]') || card.querySelector('img[alt]');
        if (titleEl) {
          title = titleEl.getAttribute('title') || titleEl.getAttribute('alt') || titleEl.innerText || titleEl.textContent || '';
        }
        if (!title || title.length < 5) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 8 && !l.startsWith('Rp') && !l.toLowerCase().includes('komisi') && !l.toLowerCase().includes('terjual') && !l.includes('Buat Link'));
          title = lines[0] || `Produk Penawaran Shopee #${index + 1}`;
        }
        title = cleanTitleString(title);
        if (!title) return;

        // Ensure real product image is used
        let finalImageUrl = imageUrl || extractImageFromCard(card);

        // Price
        const prices = extractAllPricesFromText(text);
        const discountedPrice = prices.length > 0 ? prices[0] : 0;
        const originalPrice = prices.length > 1 ? Math.max(...prices) : discountedPrice;

        // Commission
        let commissionRate = '';
        let commissionPercent = 0;
        const commMatch = text.match(/Komisi\s*(hingga)?\s*([0-9]+[,\.][0-9]+%|[0-9]+%)/i);
        if (commMatch) {
          commissionRate = commMatch[2] || commMatch[0];
          commissionPercent = parseFloat(commissionRate.replace(',', '.').replace('%', '')) || 0;
        }

        const estimatedCommissionRp = commissionPercent > 0 && discountedPrice > 0
          ? Math.round(discountedPrice * (commissionPercent / 100))
          : 0;

        // Badges
        const soldMatch = text.match(/([0-9]+[A-Za-z\+\.]*)\s*(terjual|sold)/i);
        const soldCount = soldMatch ? soldMatch[0] : 'Terjual';
        const isMall = text.includes('Mall');
        const isStar = text.includes('Star');
        const hasKomisiXtra = text.includes('KOMISI XTRA') || text.includes('Komisi Xtra') || text.includes('Komisi Ekstra');
        const hasFreeSample = text.includes('Sampel Gratis');

        // Link
        const linkEl = card.querySelector('a[href*="shopee.co.id"], a[href*="product"], a[href*="-i."], a[href*="offer"]');
        let rawHref = linkEl ? linkEl.getAttribute('href') : '';
        let cleanUrl = '';
        let shopId = '';
        let itemId = '';

        if (rawHref) {
          const fullRaw = rawHref.startsWith('http') ? rawHref : `https://shopee.co.id${rawHref}`;
          const ids = extractShopAndItemIds(fullRaw);
          shopId = ids.shopId;
          itemId = ids.itemId;
        }

        if (!itemId) {
          let hash = 0;
          for (let i = 0; i < title.length; i++) {
            hash = ((hash << 5) - hash) + title.charCodeAt(i);
            hash |= 0;
          }
          itemId = `aff_${Math.abs(hash).toString(36)}`;
        }

        // Generate REAL, working Shopee buyer link
        if (shopId && itemId && !itemId.startsWith('aff_')) {
          cleanUrl = `https://shopee.co.id/product/${shopId}/${itemId}`;
        } else {
          cleanUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(title)}`;
        }

        const uniqueKey = itemId + '_' + title;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);

        products.push({
          id: `prod_${itemId}`,
          itemId: itemId,
          shopId: shopId,
          title: title,
          originalPrice: originalPrice || discountedPrice,
          discountedPrice: discountedPrice,
          discount: commissionRate ? `Komisi ${commissionRate}` : 'Affiliate Offer',
          commissionRate: commissionRate || '10%',
          commissionPercent: commissionPercent,
          estimatedCommissionRp: estimatedCommissionRp,
          hasKomisiXtra: hasKomisiXtra,
          hasFreeSample: hasFreeSample,
          rating: 4.9,
          soldCount: soldCount,
          shopName: hasKomisiXtra ? 'Toko Komisi XTRA' : 'Shopee Verified Seller',
          shopLocation: 'Shopee Affiliate Offer',
          shopType: isMall ? 'Mall' : (isStar ? 'Star+' : 'Regular'),
          imageUrl: finalImageUrl || '',
          galleryImages: finalImageUrl ? [finalImageUrl] : [],
          productUrl: cleanUrl,
          isFromAffiliateDashboard: true,
          scrapedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[Affiliate Scraper Item Error]', err);
      }
    });

    return products;
  }

  // =========================================================================
  // AUTO AFFILIATE SHORTLINK GRABBER
  // Strategy: click every "Buat Link" button, wait for modal, read s.shopee.co.id link
  // =========================================================================

  /**
   * Find ALL "Buat Link" buttons on page.
   * Only targets the INNERMOST element with exactly that text to avoid selecting parent wrappers.
   */
  function findAllBuatLinkButtons() {
    const result = [];
    const seen = new Set();
    // Look only at buttons and spans — the most specific leaf element
    const candidates = Array.from(document.querySelectorAll('button, span, a'));
    for (const el of candidates) {
      // Must be visible
      if (el.offsetWidth < 5 || el.offsetHeight < 5) continue;
      // Must have EXACTLY "Buat Link" as own direct text
      const ownText = (el.innerText || el.textContent || '').trim();
      if (ownText !== 'Buat Link') continue;
      // Avoid selecting parent containers that contain child "Buat Link" elements
      const childWithSameText = Array.from(el.querySelectorAll('*')).find(c => {
        return (c.innerText || c.textContent || '').trim() === 'Buat Link' && c !== el;
      });
      if (childWithSameText) continue;
      if (!seen.has(el)) {
        seen.add(el);
        result.push(el);
      }
    }
    return result;
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /**
   * Wait for the Shopee "Link Penawaran Produk" modal to appear and return the shortlink.
   * We detect the modal by looking for "Mohon salin link singkat" in page text,
   * then read the textarea value.
   */
  async function waitForModal(timeoutMs = 5000, excludeLink = null) {
    const start = Date.now();
    const SHOPEE_LINK_RE = /https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/i;

    while (Date.now() - start < timeoutMs) {
      await sleep(100);

      // Check if modal text is present on the page
      const pageText = document.body ? (document.body.innerText || '') : '';
      const modalIsOpen = pageText.includes('Mohon salin link singkat') || pageText.includes('salin link singkat') || pageText.includes('Link Penawaran');

      if (modalIsOpen) {
        // Read from all visible textareas / inputs
        const inputs = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])')).filter(el => el.offsetWidth > 0);
        for (const el of inputs) {
          const val = (el.value || el.getAttribute('value') || el.placeholder || el.getAttribute('placeholder') || '').trim();
          const m = val.match(SHOPEE_LINK_RE);
          if (m && m[0] !== excludeLink) return m[0];
        }
        // Also try reading from modal text directly
        const m = pageText.match(SHOPEE_LINK_RE);
        if (m && m[0] !== excludeLink) return m[0];
      }
    }
    return null;
  }

  /**
   * Close the "Link Penawaran Produk" modal.
   */
  function closeActiveModal() {
    // Try clicking the × close button
    const allEls = Array.from(document.querySelectorAll('button, i, svg, div, span'));
    const closeBtns = allEls.filter(el => {
      if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const text = (el.innerText || el.textContent || '').trim();
      return aria.includes('close') || aria.includes('tutup') ||
             cls.includes('close') || cls.includes('dismiss') || cls.includes('modal__close') ||
             text === '×' || text === '✕' || text === 'Tutup' || text === 'Batal' || text === '✖';
    });
    if (closeBtns.length > 0) {
      try { closeBtns[0].click(); } catch (e) {}
    }
    // Escape key as additional fallback
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    } catch (e) {}
  }

  /**
   * MAIN: Extract all products from Shopee Affiliate, then auto-click each
   * "Buat Link" button, wait for modal, grab the s.shopee.co.id link.
   */
  async function extractShopeeAffiliateDashboardWithAutoShortlinks(mode = 'viewport') {
    const products = extractShopeeAffiliateDashboard(mode);
    if (products.length === 0) return products;

    console.log(`[Affiliator Killer] ⚡ Auto-grabbing shortlinks for ${products.length} products...`);

    const buatLinkBtns = findAllBuatLinkButtons();
    console.log(`[Affiliator Killer] Found ${buatLinkBtns.length} "Buat Link" buttons on page`);

    if (buatLinkBtns.length === 0) {
      console.warn('[Affiliator Killer] No "Buat Link" buttons found. Returning products without affiliate links.');
      return products;
    }

    const totalToProcess = Math.min(products.length, buatLinkBtns.length);
    let lastCaptured = null;

    for (let i = 0; i < totalToProcess; i++) {
      const btn = buatLinkBtns[i];

      try {
        // Notify progress
        try {
          chrome.runtime.sendMessage({
            action: 'AUTO_SHORTLINK_PROGRESS',
            current: i + 1,
            total: totalToProcess,
            title: products[i]?.title || 'Produk'
          });
        } catch (e) {}

        // 1. Scroll tombol ke tengah layar
        btn.scrollIntoView({ behavior: 'auto', block: 'center' });
        await sleep(200);

        // 2. Klik tombol "Buat Link" — ini trigger Shopee generate link
        btn.click();
        console.log(`[Affiliator Killer] 🖱️ Clicked "Buat Link" #${i + 1}`);

        // 3. Tunggu modal "Link Penawaran Produk" muncul dan baca shortlink
        const shortlink = await waitForModal(5000, lastCaptured);

        if (shortlink) {
          products[i].affiliateUrl = shortlink;
          products[i].productUrl = shortlink;
          lastCaptured = shortlink;
          console.log(`[Affiliator Killer] ✅ [${i + 1}/${totalToProcess}] ${shortlink}`);
        } else {
          console.warn(`[Affiliator Killer] ⚠️ No shortlink for product #${i + 1}: "${products[i]?.title}"`);
        }

        // 4. Tutup modal sebelum lanjut
        closeActiveModal();
        await sleep(350);

      } catch (err) {
        console.error(`[Affiliator Killer] Error at product #${i + 1}:`, err);
        closeActiveModal();
        await sleep(200);
      }
    }

    console.log(`[Affiliator Killer] 🎉 Done! Grabbed ${products.filter(p => p.affiliateUrl?.includes('s.shopee.co.id') || p.affiliateUrl?.includes('shope.ee')).length}/${totalToProcess} affiliate links.`);
    return products;
  }

  // Placeholder kept for backward compat (no longer used internally)
  function findMakeLinkButtonInCard(card) {
    if (!card) return null;

    // Priority 1: Exact text match on any clickable element (button, a, span, div)
    const allClickable = Array.from(card.querySelectorAll('button, a, [role="button"], span, div'));
    for (const el of allClickable) {
      const t = (el.innerText || el.textContent || '').trim();
      if (/^(buat link|buat tautan|dapatkan link|dapatkan tautan|get link|generate link)$/i.test(t) && el.offsetWidth > 0 && el.offsetHeight > 0) {
        return el;
      }
    }

    // Priority 2: Loose text match on visible buttons and <a> tags
    for (const el of allClickable) {
      const t = (el.innerText || el.textContent || '').trim();
      if (/buat|link|tautan|dapatkan/i.test(t) && el.offsetWidth > 20 && el.offsetHeight > 10) {
        return el;
      }
    }

    // Priority 3: Last visible button in card (typical position for "Buat Link")
    const visibleBtns = Array.from(card.querySelectorAll('button, [role="button"]')).filter(b => b.offsetWidth > 10 && b.offsetHeight > 10);
    if (visibleBtns.length > 0) return visibleBtns[visibleBtns.length - 1];

    return null;
  }


  /**
   * Helper: search for generated shortlink in modal, inputs, textareas, and DOM
   */
  function findModalShortlink() {
    // 1. Check all textareas, inputs, and editable elements (value, placeholder, attributes, text)
    const inputs = Array.from(document.querySelectorAll('textarea, input, [contenteditable="true"]'));
    for (const el of inputs) {
      const val = (
        el.value || 
        el.getAttribute('value') || 
        el.placeholder || 
        el.getAttribute('placeholder') || 
        el.innerText || 
        el.textContent || 
        ''
      ).trim();
      const match = val.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_\-\.\/]+/i);
      if (match) return match[0];
    }

    // 2. Check modal / dialog / popup elements
    const modals = Array.from(document.querySelectorAll('div[class*="modal"], div[class*="dialog"], div[role="dialog"], div[class*="popup"], div[class*="content"], div[class*="drawer"], div[class*="overlay"], div[class*="mask"], .shopee-modal, .shopee-popup'));
    for (const m of modals) {
      const text = m.innerText || m.textContent || '';
      const match = text.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_\-\.\/]+/i);
      if (match) return match[0];

      const html = m.innerHTML || '';
      const htmlMatch = html.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_\-\.\/]+/i);
      if (htmlMatch) return htmlMatch[0];
    }

    // 3. Search document body
    if (document.body) {
      const bodyText = document.body.innerText || '';
      const textMatch = bodyText.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_\-\.\/]+/i);
      if (textMatch) return textMatch[0];

      const html = document.body.innerHTML || '';
      const htmlMatch = html.match(/https:\/\/(s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_\-\.\/]+/i);
      if (htmlMatch) return htmlMatch[0];
    }

    return null;
  }

  /**
   * Helper: close any open modal
   */
  function closeModal() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

    const closeBtns = Array.from(document.querySelectorAll('button, svg, div[role="button"], i, span')).filter(el => {
      const aria = el.getAttribute('aria-label') || '';
      const cls = el.className || '';
      const text = (el.innerText || el.textContent || '').trim();
      return (
        aria.toLowerCase().includes('close') ||
        aria.toLowerCase().includes('tutup') ||
        (typeof cls === 'string' && (cls.includes('close') || cls.includes('dismiss'))) ||
        text === '×' || text === '✕' || text === 'Tutup' || text === 'Batal'
      ) && el.offsetWidth > 0;
    });
    if (closeBtns.length > 0) {
      try { closeBtns[0].click(); } catch (e) {}
    }

    const overlays = document.querySelectorAll('div[class*="mask"], div[class*="overlay"], div[class*="backdrop"]');
    overlays.forEach(o => {
      try { o.click(); } catch (e) {}
    });
  }


  // Real-time Mutation Observer for sniffing Shopee Affiliate Shortlink anytime modal appears
  try {
    const shortlinkObserver = new MutationObserver(() => {
      const link = findModalShortlink();
      if (link && link !== window.__lastDetectedShopeeShortlink) {
        window.__lastDetectedShopeeShortlink = link;
        console.log('[Affiliator Killer] 🎯 Real-time Shopee Shortlink Sniffed:', link);
        try {
          chrome.runtime.sendMessage({
            action: 'SHOPEE_SHORTLINK_SNIFFED',
            shortlink: link
          });
        } catch (e) {}
      }
    });

    if (document.body) {
      shortlinkObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        shortlinkObserver.observe(document.body, { childList: true, subtree: true });
      });
    }
  } catch (e) {}

  /**
   * =========================================================================
   * 3. EXTRACT FROM REGULAR SHOPEE SEARCH & CATEGORY GRIDS
   * =========================================================================
   */
  function extractMultipleProductCards(mode = 'viewport') {
    const products = [];
    const seenKeys = new Set();

    const cardSelectors = [
      'li.shopee-search-item-result__item',
      'div.shopee-search-item-result__item',
      'div[data-sq*="item"]',
      'a[data-sq*="item"]',
      'div.col-xs-2-4',
      'div[class*="product-card"]',
      'a[href*="-i."]',
      'div[class*="item-card"]'
    ];

    let candidateElements = [];
    for (const sel of cardSelectors) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length > 0) {
        candidateElements = els;
        break;
      }
    }

    const targetElements = mode === 'viewport'
      ? candidateElements.filter(el => isElementInViewport(el))
      : candidateElements;

    targetElements.forEach((el, index) => {
      try {
        const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="-i."], a[href*="/product/"], a');
        if (!linkEl) return;

        const rawHref = linkEl.getAttribute('href') || '';
        const fullUrl = rawHref.startsWith('http') ? rawHref : `https://shopee.co.id${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
        const cleanUrl = fullUrl.split('?')[0];

        const { shopId, itemId } = extractShopAndItemIds(cleanUrl);
        const uniqueKey = itemId || cleanUrl;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);

        const cardText = el.innerText || el.textContent || '';

        // Title
        const titleEl = el.querySelector('.C2D2O-, div[class*="name"], div[class*="title"], img[alt]') || linkEl;
        let title = '';
        if (titleEl) {
          title = titleEl.getAttribute('alt') || titleEl.textContent || '';
        }
        title = cleanTitleString(title);
        if (!isValidProductTitle(title)) return;

        // Image
        const imageUrl = extractImageFromCard(el);

        // Price
        const prices = extractAllPricesFromText(cardText);
        const discountedPrice = prices.length > 0 ? prices[0] : 0;
        const originalPrice = prices.length > 1 ? Math.max(...prices) : discountedPrice;

        // Discount
        const discMatch = cardText.match(/([0-9]+%)\s*(OFF|DISKON|diskon)?/i);
        const discountText = discMatch ? discMatch[1] : '';

        // Rating & Sold
        const ratingMatch = cardText.match(/([45]\.[0-9])/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.9;

        const soldMatch = cardText.match(/([0-9]+[A-Za-z\+\.]*)\s*(terjual|penilaian|sold)/i);
        const soldCount = soldMatch ? soldMatch[0] : 'Terjual';

        const isMall = cardText.includes('Mall') || !!el.querySelector('div[class*="mall"], img[alt*="Mall"]');
        const isStar = cardText.includes('Star') || !!el.querySelector('div[class*="star"], img[alt*="Star"]');

        products.push({
          id: `prod_${itemId || index}_${Date.now()}`,
          itemId: itemId || String(index),
          shopId: shopId || '',
          title: title,
          originalPrice: originalPrice || discountedPrice,
          discountedPrice: discountedPrice,
          discount: discountText,
          rating: rating,
          soldCount: soldCount,
          shopName: 'Shopee Seller',
          shopLocation: 'Indonesia',
          shopType: isMall ? 'Mall' : (isStar ? 'Star+' : 'Regular'),
          imageUrl: imageUrl,
          galleryImages: [imageUrl],
          productUrl: cleanUrl,
          scrapedAt: new Date().toISOString()
        });
      } catch (err) {}
    });

    return products;
  }

  // =========================================================================
  // HELPER UTILITIES
  // =========================================================================

  function extractJsonLdProduct() {
    try {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        const text = script.textContent;
        if (!text) continue;
        const parsed = JSON.parse(text);
        
        // Strictly check for Product type, not WebSite or BreadcrumbList!
        const isProductType = parsed['@type'] === 'Product' || (Array.isArray(parsed['@type']) && parsed['@type'].includes('Product'));
        const hasValidName = parsed.name && typeof parsed.name === 'string' && !parsed.name.toLowerCase().includes('shopee indonesia') && parsed.name.toLowerCase() !== 'shopee';

        if (isProductType || (hasValidName && parsed.offers)) {
          let img = '';
          if (typeof parsed.image === 'string') img = parsed.image;
          else if (Array.isArray(parsed.image) && parsed.image.length > 0) img = parsed.image[0];

          let price = 0;
          if (parsed.offers) {
            const offer = Array.isArray(parsed.offers) ? parsed.offers[0] : parsed.offers;
            price = parseFloat(offer.price) || 0;
          }

          return {
            name: parsed.name,
            image: cleanShopeeImageUrl(img),
            price: price,
            rating: parsed.aggregateRating ? parseFloat(parsed.aggregateRating.ratingValue) : 4.8,
            shopName: parsed.brand?.name || parsed.offers?.seller?.name || ''
          };
        }
      }
    } catch (e) {}
    return null;
  }

  function extractImageFromCard(card) {
    if (!card) return '';

    const candidates = [];

    // 1. Search all <img> in card and card.parentElement
    const imgs = Array.from(card.querySelectorAll('img'));
    if (imgs.length === 0 && card.parentElement) {
      imgs.push(...Array.from(card.parentElement.querySelectorAll('img')));
    }

    for (const img of imgs) {
      const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      if (isValidShopeeProductImage(src)) {
        const clean = cleanShopeeImageUrl(src);
        const w = img.offsetWidth || img.naturalWidth || 100;
        const h = img.offsetHeight || img.naturalHeight || 100;
        candidates.push({ url: clean, area: w * h });
      }
    }

    // 2. Search background-images in elements
    const bgEls = Array.from(card.querySelectorAll('div, span, a'));
    if (card.getAttribute('style')?.includes('background')) bgEls.unshift(card);
    for (const el of bgEls) {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(['"]?([^'"\)]+)['"]?\)/i);
      if (match) {
        let rawUrl = match[1].replace(/&quot;/g, '').replace(/&#39;/g, '').trim();
        if (isValidShopeeProductImage(rawUrl)) {
          const clean = cleanShopeeImageUrl(rawUrl);
          const w = el.offsetWidth || 100;
          const h = el.offsetHeight || 100;
          candidates.push({ url: clean, area: w * h });
        }
      }
    }

    // 3. Fallback: Any img with susercontent or shopee
    if (candidates.length === 0) {
      for (const img of imgs) {
        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && (src.includes('susercontent.com') || src.includes('cf.shopee.co.id'))) {
          if (!src.includes('label_xtra') && !src.includes('.svg')) {
            candidates.push({ url: cleanShopeeImageUrl(src), area: 50 });
          }
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.area - a.area);
      return candidates[0].url;
    }

    return '';
  }

  function isValidShopeeProductImage(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:image/svg') || url.includes('base64,R0lGOD') || url.includes('empty.png') || url.endsWith('.svg') || url.includes('.svg?')) return false;

    const lower = url.toLowerCase();
    // Exclude static ribbon/badge SVG assets and avatars
    if (lower.includes('label_xtra') || lower.includes('static/img/label') || lower.includes('avatar') || lower.includes('/icon_') || lower.includes('/icons/')) {
      return false;
    }

    // Must be valid Shopee image URL
    return url.includes('susercontent.com') || url.includes('cf.shopee.co.id') || url.includes('shopee') || url.startsWith('http');
  }

  function cleanShopeeImageUrl(url) {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('//')) clean = `https:${clean}`;

    // Remove downscale thumbnail suffixes while preserving file hash
    clean = clean.replace(/_tn(?=[@\?\.]|$)/gi, '');
    clean = clean.replace(/_xxhdpi(?=[@\?\.]|$)/gi, '');
    clean = clean.replace(/@resize_w[0-9]+_nl/gi, '');
    return clean;
  }

  function extractAllPricesFromText(text) {
    if (!text) return [];
    const prices = [];
    const regex = /Rp\s*([0-9\.\,]+)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const numStr = match[1].replace(/\./g, '').replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (val > 500 && val < 500000000) {
        prices.push(val);
      }
    }
    return prices;
  }

  function extractShopAndItemIds(url) {
    let shopId = '';
    let itemId = '';

    const matchI = url.match(/-i\.(\d+)\.(\d+)/);
    if (matchI) return { shopId: matchI[1], itemId: matchI[2] };

    const matchProd = url.match(/\/product\/(\d+)\/(\d+)/);
    if (matchProd) return { shopId: matchProd[1], itemId: matchProd[2] };

    return { shopId, itemId };
  }

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= -150 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 200 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  function generateProductFallbackSvg(title, price) {
    const cleanTitle = (title || 'Shopee Item').substring(0, 22);
    const priceStr = price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : 'Shopee Item';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="#0F172A" rx="12"/>
      <circle cx="150" cy="115" r="40" fill="#10B981" fill-opacity="0.18"/>
      <path d="M150 90 L165 115 L150 140 L135 115 Z" fill="#10B981"/>
      <text x="150" y="190" fill="#F8FAFC" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">${cleanTitle}</text>
      <text x="150" y="218" fill="#10B981" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">${priceStr}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  console.log('[Affiliator Killer] Bulletproof Title & Hero Gallery Scraper Active.');
})();
