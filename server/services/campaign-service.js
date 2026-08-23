/**
 * Campaign Service - Modular 4-Field Prompt Matrix & Campaign Management
 */

const dbService = require('./db-service');
const aiService = require('./ai-service');

// Curated aesthetic image fallbacks for high-fashion, modest, home decor, lifestyle
const VISUAL_PRESETS = [
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80'
];

class CampaignService {
  getCampaigns() {
    return dbService.getCampaigns();
  }

  getCampaignById(id) {
    return dbService.getCampaignById(id);
  }

  createOrUpdateCampaign(data) {
    const campaign = {
      id: data.id || `camp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: data.name || 'Campaign Baru',
      status: data.status || 'ACTIVE',
      approvalMode: data.approvalMode || 'AUTO',
      automationType: data.automationType || 'DAILY',
      goalCurrent: Number(data.goalCurrent) || 0,
      goalTarget: Number(data.goalTarget) || 20,
      windowStart: data.windowStart || '00:00',
      windowEnd: data.windowEnd || '23:59',
      windowLabel: data.windowLabel || `${data.windowStart || '00:00'}-${data.windowEnd || '23:59'}`,
      targetBoard: data.targetBoard || 'Inspirasi & Rekomendasi Produk',
      subjects: data.subjects || '',
      objectOutfit: data.objectOutfit || '',
      locations: data.locations || '',
      vibes: data.vibes || '',
      affiliateSubId: data.affiliateSubId || 'racuncuan_auto',
      customAffiliateUrl: data.customAffiliateUrl || '',
      updatedAt: new Date().toISOString()
    };

    dbService.saveCampaign(campaign);
    dbService.addLog('INFO', 'CAMPAIGN', `Campaign disave: "${campaign.name}" [${campaign.status}]`);
    return campaign;
  }

  deleteCampaign(id) {
    const deleted = dbService.deleteCampaign(id);
    dbService.addLog('INFO', 'CAMPAIGN', `Campaign dihapus: ${id}`);
    return deleted;
  }

  toggleStatus(id) {
    const toggled = dbService.toggleCampaignStatus(id);
    if (toggled) {
      dbService.addLog('INFO', 'CAMPAIGN', `Status Campaign "${toggled.name}" diubah ke: ${toggled.status}`);
    }
    return toggled;
  }

  /**
   * Generates pin items from a campaign's Prompt Matrix and enqueues them
   */
  async enqueueCampaign(campaignId, count = 1, options = {}) {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) throw new Error(`Campaign with ID ${campaignId} not found`);

    dbService.addLog('INFO', 'QUEUE', `Enqueuing ${count} Pin item(s) untuk Campaign: "${campaign.name}"`);

    const enqueuedItems = [];
    const promptCombined = `Subject: ${campaign.subjects}\nObject/Outfit: ${campaign.objectOutfit}\nLocation: ${campaign.locations}\nVibe: ${campaign.vibes}`;

    for (let i = 0; i < count; i++) {
      let copyResult = null;

      // Synthesize SEO copy using AI or smart template
      try {
        const mockProduct = {
          title: campaign.name,
          price: 129000,
          discountedPrice: 89000,
          discount: '31%',
          rating: '4.9',
          soldCount: '2.5RB+',
          shopLocation: 'Jakarta Selatan',
          category: campaign.targetBoard
        };

        copyResult = await aiService.generateCopy({
          product: mockProduct,
          tone: 'aesthetic',
          provider: options.provider || 'gemini',
          config: options.aiConfig || {}
        });
      } catch (err) {
        console.warn('[CampaignService] AI synthesis error:', err);
      }

      // Fallback copy if needed
      if (!copyResult || !copyResult.pinTitle) {
        copyResult = {
          pinTitle: `${campaign.name} - Rekomendasi & Inspo Terkini`,
          pinDescription: `Inspirasi gaya dan rekomendasi pilihan ${campaign.name}.\n\n• Detail: ${campaign.objectOutfit || 'Kualitas premium & nyaman'}\n• Suasana: ${campaign.vibes || 'Aesthetic lookbook'}\n• Cek promo dan ketersediaan stok melalui tautan produk.`,
          hashtags: ['#ShopeeInspo', '#RacunShopee', '#AestheticOOTD', '#RekomendasiProduk']
        };
      }

      const randomImage = VISUAL_PRESETS[Math.floor(Math.random() * VISUAL_PRESETS.length)];
      const affiliateLink = campaign.customAffiliateUrl || `https://s.shopee.co.id/aff_${campaign.affiliateSubId || 'racuncuan'}_${Date.now().toString().slice(-4)}`;

      const queueItem = {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.approvalMode === 'AUTO' ? 'QUEUED' : 'PENDING_APPROVAL',
        title: copyResult.pinTitle,
        description: copyResult.pinDescription,
        hashtags: copyResult.hashtags || [],
        imageUrl: options.imageUrl || randomImage,
        targetBoard: campaign.targetBoard,
        affiliateUrl: affiliateLink,
        subId: campaign.affiliateSubId,
        promptMatrix: {
          subjects: campaign.subjects,
          objectOutfit: campaign.objectOutfit,
          locations: campaign.locations,
          vibes: campaign.vibes
        },
        scheduledFor: new Date(Date.now() + (i + 1) * 300000).toISOString() // +5 min intervals
      };

      const added = dbService.addToQueue(queueItem);
      enqueuedItems.push(added);

      // Increment campaign goal current
      campaign.goalCurrent = (campaign.goalCurrent || 0) + 1;
      dbService.saveCampaign(campaign);
    }

    dbService.addLog('SUCCESS', 'QUEUE', `✅ Berhasil memasukkan ${enqueuedItems.length} item ke Preview Queue.`);
    return enqueuedItems;
  }
}

module.exports = new CampaignService();
