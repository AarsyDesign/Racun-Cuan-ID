/**
 * Realistic Mock Data based on Shopee Product Page & Affiliate Dashboard
 * Compliant with strict No-AI-Slop standards.
 */

export const SAMPLE_SHOPEE_PRODUCTS = [
  {
    id: 'prod_aff_001',
    itemId: '2283940192',
    shopId: '78291038',
    title: 'Qeela.Official - Celana Sweatpants Loose Pria Celana Panjang Casual Daily',
    originalPrice: 75000,
    discountedPrice: 34500,
    discount: 'Flash Sale (Rp34.500)',
    commissionRate: '34.5%',
    commissionPercent: 34.5,
    estimatedCommissionRp: 11902,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.7,
    soldCount: '10RB+ Terjual',
    shopName: 'Qeela.Official',
    shopLocation: 'Kab. Pekalongan',
    shopType: 'Star',
    imageUrl: 'assets/qeela_sweatpants.jpg',
    galleryImages: [
      'assets/qeela_sweatpants.jpg',
      'assets/qeela_sweatpants_detail.jpg'
    ],
    productUrl: 'https://shopee.co.id/product/78291038/2283940192',
    affiliateUrl: 'https://s.shopee.co.id/aff_qeela_sweatpants?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Celana Sweatpants Loose Pria Casual Daily Bahan Adem Tebal',
      pinDescription: 'Celana sweatpants cutting loose casual dari Qeela.Official. Bahan fleece tebal lembut, pinggang karet elastis bertali, cocok untuk daily wear atau hangout.\n\n• Flash Sale: Rp 34.500 (Diskon 54%)\n• Rating: 4.7 dari 12,7RB ulasan (10RB+ Terjual)\n• Pilihan Warna: Hitam, Abu Tua, Greymarl, Beige, Denim, Olive\n• Klik link produk untuk cek ukuran M-XXXL.',
      hashtags: ['#SweatpantsPria', '#CelanaCasual', '#OOTDPria', '#RacunShopee', '#ShopeeHaul']
    }
  },
  {
    id: 'prod_aff_002',
    itemId: '2847291048',
    shopId: '98410294',
    title: 'MYKONOS ALL VARIAN DECANT | 3ml 5ml 10ml ORIGINAL SHARE IN JAR Parfum Tahan Lama',
    originalPrice: 35000,
    discountedPrice: 22900,
    discount: '34.5% Komisi',
    commissionRate: '34.5%',
    commissionPercent: 34.5,
    estimatedCommissionRp: 7900,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.9,
    soldCount: '5RB+ Terjual',
    shopName: 'Mykonos Official Decant',
    shopLocation: 'Jakarta Barat',
    shopType: 'Star',
    imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80'
    ],
    productUrl: 'https://shopee.co.id/product/98410294/2847291048',
    affiliateUrl: 'https://s.shopee.co.id/aff_mykonos_001?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Decant Parfum Mykonos Original Share in Jar 3ml 5ml 10ml',
      pinDescription: 'Solusi coba varian parfum Mykonos sebelum beli full size. Botol kaca spray steril dengan seal anti bocor.\n\n• Harga mulai: Rp 22.900\n• Komisi: 34.5% (Komisi XTRA)\n• Rating: 4.9 dari 5.000+ pembeli\n• Cek list aroma lengkap di link produk.',
      hashtags: ['#ParfumMykonos', '#DecantParfum', '#RacunShopee', '#ParfumLokal', '#ShopeeHaul']
    }
  },
  {
    id: 'prod_aff_003',
    itemId: '1948201948',
    shopId: '47201948',
    title: 'Rambut Kering Elastin Curl Cream Melembabkan Tidak Lepek Vitamin Styling',
    originalPrice: 130000,
    discountedPrice: 78000,
    discount: '41.5% Komisi',
    commissionRate: '41.5%',
    commissionPercent: 41.5,
    estimatedCommissionRp: 32370,
    hasKomisiXtra: true,
    hasFreeSample: false,
    rating: 4.9,
    soldCount: '4.2RB+ Terjual',
    shopName: 'Beauty Hair Official',
    shopLocation: 'Kota Surabaya',
    shopType: 'Star',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'
    ],
    productUrl: 'https://shopee.co.id/product/47201948/1948201948',
    affiliateUrl: 'https://s.shopee.co.id/aff_curlycream_002?sub_id=pinterest_pins',
    status: 'Ready to Post',
    aiContent: {
      pinTitle: 'Elastin Curl Cream Rambut Keriting & Gelombang Anti-Lepek',
      pinDescription: 'Krim penata rambut ikal dan bergelombang. Menutrisi batang rambut, menjaga elastisitas ikal seharian tanpa rasa kaku.\n\n• Harga Promo: Rp 78.000 (Diskon 40%)\n• Komisi Tinggi: 41.5% Komisi XTRA\n• Rating: 4.9/5.0\n• Kunjungi tautan produk untuk promo toko.',
      hashtags: ['#CurlHairCare', '#PerawatanRambut', '#RambutIkal', '#StylingCream', '#RacunShopee']
    }
  }
];

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  backendUrl: 'http://localhost:3000',
  useBackend: true,
  aiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  customBaseUrl: 'https://api.opencode.ai/v1',
  customApiKey: '',
  customModelName: 'opencode-v1',
  customPromptTemplate: `Buat copy Pinterest menarik & natural (No AI Slop) untuk produk: {title} seharga {price}.`,
  sheetsWebhookUrl: '',
  n8nWebhookUrl: '',
  n8nAuthToken: '',
  affiliateSubId: 'pinterest_pins'
};
