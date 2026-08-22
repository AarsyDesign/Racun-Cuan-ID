const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Root file paths
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const EXCEL_FILE = path.join(WORKSPACE_DIR, 'Shopee_Affiliate_Database.xlsx');
const CSV_FILE = path.join(WORKSPACE_DIR, 'Shopee_Affiliate_Database.csv');

const COLUMNS = [
  { header: 'No', key: 'no', width: 6 },
  { header: 'Tanggal & Waktu', key: 'timestamp', width: 18 },
  { header: 'Nama Produk', key: 'title', width: 36 },
  { header: 'Harga Diskon (Rp)', key: 'discountedPrice', width: 16 },
  { header: 'Komisi (%)', key: 'commissionRate', width: 13 },
  { header: 'Estimasi Cuan (Rp)', key: 'estimatedCommissionRp', width: 18 },
  { header: 'Diskon/Badge', key: 'discount', width: 14 },
  { header: 'Rating & Terjual', key: 'ratingSold', width: 18 },
  { header: 'Link Affiliate Shopee', key: 'affiliateUrl', width: 35 },
  { header: 'URL Gambar Cover', key: 'imageUrl', width: 28 },
  { header: 'Judul Pin Pinterest (AI)', key: 'pinTitle', width: 32 },
  { header: 'Deskripsi Pin (AI)', key: 'pinDescription', width: 45 },
  { header: 'Hashtags', key: 'hashtags', width: 28 },
  { header: 'Status Posting', key: 'status', width: 16 }
];

async function getOrCreateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Affiliator Killer';
  workbook.lastModifiedBy = 'Affiliator Killer';
  workbook.created = new Date();

  if (fs.existsSync(EXCEL_FILE)) {
    try {
      await workbook.xlsx.readFile(EXCEL_FILE);
      return workbook;
    } catch (e) {
      console.warn('Creating fresh workbook:', e.message);
    }
  }

  // Create new sheet
  const worksheet = workbook.addWorksheet('Shopee Affiliate Offers', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  worksheet.columns = COLUMNS;

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate 800
    };
    cell.font = {
      name: 'Segoe UI',
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  return workbook;
}

async function appendProductToSpreadsheet(productData) {
  const workbook = await getOrCreateWorkbook();
  let worksheet = workbook.getWorksheet('Shopee Affiliate Offers') || workbook.worksheets[0];

  if (!worksheet) {
    worksheet = workbook.addWorksheet('Shopee Affiliate Offers');
    worksheet.columns = COLUMNS;
  }

  const rowCount = worksheet.rowCount;
  const currentNo = rowCount > 1 ? rowCount : 1;

  const nowStr = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const discPrice = typeof productData.discountedPrice === 'number' 
    ? productData.discountedPrice 
    : (parseInt(String(productData.discountedPrice || '0').replace(/[^0-9]/g, '')) || 0);

  const commRate = productData.commissionRate || (productData.discount?.includes('Komisi') ? productData.discount : '-');
  const estComm = productData.estimatedCommissionRp 
    || (productData.commissionPercent && discPrice ? Math.round(discPrice * (productData.commissionPercent / 100)) : 0);

  const ai = productData.aiContent || {};
  const tagsStr = Array.isArray(ai.hashtags) ? ai.hashtags.join(' ') : (ai.hashtags || '');

  const row = worksheet.addRow([
    currentNo,
    nowStr,
    productData.title || 'Produk Shopee',
    discPrice,
    commRate,
    estComm,
    productData.discount || (productData.hasKomisiXtra ? 'Komisi XTRA' : ''),
    `⭐ ${productData.rating || '4.9'} | ${productData.soldCount || 'Terjual'}`,
    productData.affiliateUrl || productData.productUrl || '',
    productData.imageUrl || '',
    ai.pinTitle || productData.title || '',
    ai.pinDescription || '',
    tagsStr,
    productData.status || 'Ready'
  ]);

  row.height = 24;
  row.alignment = { vertical: 'middle' };

  // Format currency cells (Col 4: Harga Diskon, Col 6: Estimasi Cuan)
  const discCell = row.getCell(4);
  discCell.numFmt = '"Rp "#,##0';
  discCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const commCell = row.getCell(6);
  commCell.numFmt = '"Rp "#,##0';
  commCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Save Excel file
  await workbook.xlsx.writeFile(EXCEL_FILE);

  // Also export CSV
  await exportCsvFile();

  console.log(`[Spreadsheet] Product "${productData.title}" appended.`);
  return {
    success: true,
    excelPath: EXCEL_FILE,
    csvPath: CSV_FILE,
    totalRows: worksheet.rowCount - 1
  };
}

async function exportCsvFile() {
  try {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(EXCEL_FILE)) {
      await workbook.xlsx.readFile(EXCEL_FILE);
      await workbook.csv.writeFile(CSV_FILE);
    }
  } catch (e) {
    console.warn('CSV export notice:', e.message);
  }
}

module.exports = {
  appendProductToSpreadsheet,
  getSpreadsheetPaths() {
    return {
      excelPath: EXCEL_FILE,
      csvPath: CSV_FILE,
      exists: fs.existsSync(EXCEL_FILE)
    };
  }
};
