/**
 * AI Service - Multi-LLM Provider Engine with Strict No-AI-Slop Filtering
 */

// Anti-slop post-processor to clean AI output
function sanitizeNoAiSlop(text) {
  if (!text) return '';
  let cleaned = text;

  // Remove common throat-clearing patterns
  cleaned = cleaned.replace(/^(Tahukah kamu,?|Banyak yang belum tahu kalau|Here's the thing,?|Pernah gak sih kamu ngerasa|Jujurly,?)\s*/gi, '');
  
  // Remove binary contrast clichés ("Ini bukan sekadar X, ini Y")
  cleaned = cleaned.replace(/Ini bukan (sekadar|hanya) [^,\.]+[,\.] tapi /gi, '');
  cleaned = cleaned.replace(/Bukan cuma [^,\.]+[,\.] tapi /gi, '');

  // Remove dramatic fragmentation ("Bagus banget. Titik. Gak usah mikir lagi.")
  cleaned = cleaned.replace(/Titik\.\s*(Gak usah mikir lagi|Itu saja)\.?/gi, '');

  // Reduce excessive emojis (max 1 emoji per sentence)
  cleaned = cleaned.replace(/([\u{1F300}-\u{1F9FF}]){2,}/gu, '$1');

  return cleaned.trim();
}

// Smart Local Fallback Template
function generateSmartTemplate(product, tone) {
  const cleanTitle = (product.title || 'Produk Shopee').replace(/[\(\)\[\]]/g, '').trim();
  const shortTitle = cleanTitle.length > 55 ? cleanTitle.substring(0, 52) + '...' : cleanTitle;
  const priceFormatted = `Rp ${(product.discountedPrice || product.price || 0).toLocaleString('id-ID')}`;
  const disc = product.discount ? `diskon ${product.discount}` : 'harga promo';

  if (tone === 'aesthetic') {
    return {
      pinTitle: `${shortTitle} (${priceFormatted})`,
      pinDescription: `Rekomendasi ${product.title} untuk look sehari-hari. Desain simpel, bahan nyaman dan potongan pas.\n\n• Harga: ${priceFormatted} (${disc})\n• Rating: ${product.rating || '4.9'} dari ${product.soldCount || 'ribuan pembeli'}\n• Buka link produk untuk melihat detail toko dan ulasan aslinya.`,
      hashtags: ['#ShopeeLook', '#OutfitInspo', '#KoreanStyle', '#RacunShopee', '#AestheticRoom']
    };
  } else if (tone === 'honest_review') {
    return {
      pinTitle: `Review Produk: ${shortTitle}`,
      pinDescription: `Spesifikasi dan ulasan singkat ${product.title}. Kualitas material rapi dengan harga terjangkau.\n\n• Harga saat ini: ${priceFormatted}\n• Terjual: ${product.soldCount || '4.8RB+'}\n• Cek ketersediaan stok & ukuran pada link produk.`,
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

async function generateWithGemini(product, tone, apiKey, model = 'gemini-2.5-flash') {
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
- Harga Diskon: Rp ${product.discountedPrice || product.price} (Harga Asli: Rp ${product.originalPrice}, Diskon: ${product.discount})
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(rawText);
  return {
    pinTitle: sanitizeNoAiSlop(parsed.pinTitle),
    pinDescription: sanitizeNoAiSlop(parsed.pinDescription),
    hashtags: parsed.hashtags || []
  };
}

async function generateWithOpenAiCompatible(product, tone, baseUrl, apiKey, model) {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const prompt = `Buatkan copy Pinterest SEO spesifik & natural (No AI Slop: tanpa basa-basi, tanpa kontras biner klise, tanpa emoji berlebihan) untuk produk Shopee: "${product.title}" seharga Rp ${product.discountedPrice || product.price} (Diskon ${product.discount}). Output JSON: {"pinTitle": "...", "pinDescription": "...", "hashtags": ["#tag1", "#tag2"]}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'opencode-v1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Custom AI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse JSON from Custom AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    pinTitle: sanitizeNoAiSlop(parsed.pinTitle),
    pinDescription: sanitizeNoAiSlop(parsed.pinDescription),
    hashtags: parsed.hashtags || []
  };
}

module.exports = {
  async generateCopy({ product, tone = 'aesthetic', provider = 'gemini', config = {} }) {
    try {
      if (provider === 'gemini' && config.geminiApiKey) {
        return await generateWithGemini(product, tone, config.geminiApiKey, config.geminiModel);
      } else if (provider === 'opencode' && config.customApiKey) {
        return await generateWithOpenAiCompatible(
          product,
          tone,
          config.customBaseUrl || 'https://api.opencode.ai/v1',
          config.customApiKey,
          config.customModelName || 'opencode-v1'
        );
      }
    } catch (err) {
      console.warn('[AI Service] API failed, falling back to smart template:', err.message);
    }

    // Fallback
    return generateSmartTemplate(product, tone);
  },

  async generateCampaignMatrixPrompts({ campaignName = 'Fashion & Lifestyle', provider = 'gemini', config = {} }) {
    const cleanName = (campaignName || 'General Campaign').trim();

    // Try Gemini if configured
    if (provider === 'gemini' && config.geminiApiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel || 'gemini-2.5-flash'}:generateContent?key=${config.geminiApiKey}`;
        const prompt = `Anda adalah Creative Director & Prompt Engineer untuk Pinterest Pin Studio & Shopee Affiliate.
Berdasarkan Nama Kampanye: "${cleanName}", buatkan 4-Field Modular Prompt Matrix profesional (Bahasa Inggris/Indonesia) untuk generate visual dan caption produk.

Format output WAJIB JSON:
{
  "subjects": "Deskripsi model/subjek fotografi yang menarik, natural dan relevan (maks 150 karakter)",
  "objectOutfit": "Deskripsi outfit, produk utama, detail material/tekstur dan sudut kamera (maks 200 karakter)",
  "locations": "Deskripsi latar belakang lokasi/studio foto bernuansa aesthetic (maks 150 karakter)",
  "vibes": "Deskripsi lighting, color grading, mood, dan suasana visual (maks 150 karakter)",
  "targetBoard": "Nama Board Pinterest rekomendasi (contoh: Fashion Pria / Home Living)",
  "subId": "affiliate sub_id ringkas tanpa spasi (contoh: pin_menfashion)"
}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[AI Service] Gemini campaign prompt failed, using smart fallback:', e.message);
      }
    }

    // Smart Local Fallback Matrix based on keyword recognition
    const n = cleanName.toLowerCase();
    let subId = 'pin_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);

    if (n.includes('pria') || n.includes('men') || n.includes('man') || n.includes('cowok')) {
      return {
        subjects: "Charismatic Indonesian/Asian male model in his 20s, clean modern haircut, confident relaxed posture",
        objectOutfit: "Eye-level medium shot, variation of tailored slim-fit cargo pants, minimalist cotton shirt, leather watch, premium texture",
        locations: "Modern industrial cafe terrace or minimalist concrete architecture with natural soft daylight",
        vibes: "Clean editorial street photography, neutral earth tones, subtle warm highlights, 8k crisp details",
        targetBoard: "Inspirasi Gaya Pria",
        subId: "pin_menstyle"
      };
    } else if (n.includes('wanita') || n.includes('women') || n.includes('cewek') || n.includes('hijab') || n.includes('dress') || n.includes('ootd')) {
      return {
        subjects: "Chic modern Asian fashion model with natural glow, graceful smiling expression, candid look",
        objectOutfit: "Medium full-body shot, breathable flowy linen dress or elegant modest blouse, minimalist accessories",
        locations: "Bright daylight Scandinavian aesthetic room with sheer curtains and soft morning shadows",
        vibes: "Pastel warm aesthetic, luxury lifestyle magazine tone, dreamy creamy bokeh, Pinterest trending",
        targetBoard: "OOTD & Fashion Wanita",
        subId: "pin_womenootd"
      };
    } else if (n.includes('skincare') || n.includes('beauty') || n.includes('cantik') || n.includes('kulit') || n.includes('glowing')) {
      return {
        subjects: "Clean flawless glass skin close-up, natural minimal makeup, fresh radiant complexion",
        objectOutfit: "Macro detail shot of skincare serum bottle, water droplets, clear acrylic pedestal, minimalist packaging",
        locations: "Sunlit aesthetic bathroom marble counter with fresh eucalyptus leaves and soft pastel reflection",
        vibes: "Clean clinical aesthetic, refreshing morning light, ultra HD sharp product clarity",
        targetBoard: "Racun Skincare & Beauty",
        subId: "pin_skincare"
      };
    } else if (n.includes('dapur') || n.includes('kitchen') || n.includes('masak') || n.includes('cook') || n.includes('makan')) {
      return {
        subjects: "Organized aesthetic kitchen showcase, hands preparing healthy drink or meal in aesthetic setup",
        objectOutfit: "Eye-level product focus, Nordic ceramic cookware, wooden cutting board, stainless utensils",
        locations: "Clean white tile modern kitchen with wooden shelves and warm ambient spotlight",
        vibes: "Warm cozy homeware mood, inviting atmosphere, crisp realistic texture",
        targetBoard: "Perlengkapan Dapur & Masak",
        subId: "pin_kitchendecor"
      };
    } else if (n.includes('rumah') || n.includes('home') || n.includes('decor') || n.includes('kamar') || n.includes('room')) {
      return {
        subjects: "Cozy minimalist bedroom setup with aesthetic bedding, ambient warm lamps, and indoor plants",
        objectOutfit: "Wide angle perspective, aesthetic bedside organizer, ambient LED light, soft textured linen fabric",
        locations: "Minimalist Scandinavian bedroom space with sun ray casting artistic soft shadows",
        vibes: "Peaceful hygge atmosphere, warm golden hour tones, modern aesthetic interior photography",
        targetBoard: "Home Decor & Kamar Estetik",
        subId: "pin_homedecor"
      };
    } else if (n.includes('gadget') || n.includes('tech') || n.includes('hp') || n.includes('headset') || n.includes('elektronik')) {
      return {
        subjects: "Minimalist modern desk setup showcase with laptop, ambient lighting, and sleek tech workspace",
        objectOutfit: "High-angle product focus, sleek wireless gadgets, matte black and space grey finishes, clean cable management",
        locations: "Dark mode aesthetic studio workspace with subtle blue/orange RGB accent lights",
        vibes: "Futuristic clean tech vibe, high-contrast crisp product lighting, ultra-sharp detail",
        targetBoard: "Gadget & Setup Inspirasi",
        subId: "pin_gadgettech"
      };
    } else {
      return {
        subjects: `Contemporary lifestyle creator showcasing ${cleanName}, confident natural look`,
        objectOutfit: `Eye-level commercial product shot of ${cleanName}, premium materials, fine finish, accurate colors`,
        locations: "Bright daylight studio setting with minimalist neutral backdrop and architectural props",
        vibes: "High-converting Pinterest commercial visual, balanced studio lighting, vibrant natural colors",
        targetBoard: `Inspirasi ${cleanName}`,
        subId: subId
      };
    }
  }
};
