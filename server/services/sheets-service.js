/**
 * Google Sheets Service - Webhook Relay & Logger
 */

async function sendToSheetsWebhook(webhookUrl, productData) {
  if (!webhookUrl) {
    throw new Error('Google Sheets Webhook URL is not configured');
  }

  const payload = {
    title: productData.title || '',
    price: productData.discountedPrice || productData.price || 0,
    discountedPrice: typeof productData.discountedPrice === 'number' 
      ? `Rp ${productData.discountedPrice.toLocaleString('id-ID')}` 
      : (productData.discountedPrice || ''),
    originalPrice: typeof productData.originalPrice === 'number' 
      ? `Rp ${productData.originalPrice.toLocaleString('id-ID')}` 
      : (productData.originalPrice || ''),
    discount: productData.discount || '',
    productUrl: productData.productUrl || '',
    affiliateUrl: productData.affiliateUrl || productData.productUrl || '',
    imageUrl: productData.imageUrl || '',
    rating: productData.rating || '',
    soldCount: productData.soldCount || '',
    aiContent: {
      pinTitle: productData.aiContent?.pinTitle || '',
      pinDescription: productData.aiContent?.pinDescription || '',
      hashtags: productData.aiContent?.hashtags || []
    },
    status: productData.status || 'Saved via Backend',
    timestamp: new Date().toISOString()
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return { success: true, message: 'Dispatched to Google Sheets Webhook' };
}

module.exports = {
  sendToSheetsWebhook,

  async testConnection(webhookUrl) {
    return await sendToSheetsWebhook(webhookUrl, {
      title: 'TEST_KONEKSI_AFFILIATOR_KILLER_BACKEND',
      discountedPrice: 'Rp 99.000',
      status: 'Backend Connection Test Success'
    });
  }
};
