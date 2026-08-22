const excelService = require('./server/services/excel-service');

async function init() {
  const { SAMPLE_SHOPEE_PRODUCTS } = await import('./sidepanel/mock-data.js');
  console.log('Generating initial Shopee_Affiliate_Database.xlsx & .csv...');
  for (const prod of SAMPLE_SHOPEE_PRODUCTS) {
    await excelService.appendProductToSpreadsheet({
      ...prod,
      status: 'Ready to Post'
    });
  }
  console.log('✅ Spreadsheet generated successfully in workspace root!');
}

init().catch(console.error);
