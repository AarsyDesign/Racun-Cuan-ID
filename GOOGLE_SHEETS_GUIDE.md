# 📊 PANDUAN INTEGRASI GOOGLE SHEETS DENGAN AFFILIATOR KILLER

Hanya butuh **1 menit** untuk menghubungkan ekstensi **Affiliator Killer** ke Google Spreadsheet Anda secara gratis dan real-time tanpa perlu API Key Google Cloud yang rumit.

---

## Langkah 1: Buat Google Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet Anda, misalnya: `Shopee Affiliate Database`.
3. Pada baris pertama (Row 1), buat judul kolom sebagai berikut:
   - **Kolom A**: `Tanggal & Waktu`
   - **Kolom B**: `Nama Produk`
   - **Kolom C**: `Harga Diskon`
   - **Kolom D**: `Harga Asli`
   - **Kolom E**: `Diskon (%)`
   - **Kolom F**: `Link Affiliate`
   - **Kolom G**: `URL Gambar`
   - **Kolom H**: `Judul Pin AI`
   - **Kolom I**: `Deskripsi Pin AI`
   - **Kolom J**: `Hashtag`
   - **Kolom K**: `Rating & Terjual`
   - **Kolom L**: `Status Posting`

---

## Langkah 2: Pasang Google Apps Script
1. Di menu atas Google Spreadsheet, klik **Ekstensi (Extensions)** > **Apps Script**.
2. Hapus semua kode default di editor, lalu **copy-paste kode di bawah ini**:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Format data yang akan dimasukkan ke baris baru
    var row = [
      new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), // A: Tanggal
      data.title || '',                                                // B: Nama Produk
      data.discountedPrice || data.price || '',                       // C: Harga Diskon
      data.originalPrice || '',                                       // D: Harga Asli
      data.discount || '',                                            // E: Diskon (%)
      data.affiliateUrl || data.productUrl || '',                     // F: Link Affiliate
      data.imageUrl || '',                                            // G: URL Gambar
      (data.aiContent && data.aiContent.pinTitle) ? data.aiContent.pinTitle : '',       // H: Judul Pin AI
      (data.aiContent && data.aiContent.pinDescription) ? data.aiContent.pinDescription : '', // I: Deskripsi Pin AI
      (data.aiContent && data.aiContent.hashtags) ? (Array.isArray(data.aiContent.hashtags) ? data.aiContent.hashtags.join(' ') : data.aiContent.hashtags) : '', // J: Hashtag
      (data.rating ? ('⭐ ' + data.rating + ' | ' + (data.soldCount || '')) : (data.soldCount || '')), // K: Rating & Terjual
      data.status || 'Saved to Sheets'                                // L: Status
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data produk berhasil ditambahkan ke Google Sheets!'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Affiliator Killer Google Sheets Webhook is active and running!");
}
```

---

## Langkah 3: Deploy sebagai Web App
1. Klik tombol biru **Terapkan (Deploy)** di pojok kanan atas > **Penerapan Baru (New Deployment)**.
2. Klik ikon gerigi ⚙️ di sebelah kiri jenis penerapan > Pilih **Aplikasi Web (Web App)**.
3. Isi konfigurasi:
   - **Deskripsi**: `Affiliator Killer Logger`
   - **Jalankan sebagai (Execute as)**: `Saya (emailanda@gmail.com)`
   - **Siapa yang memiliki akses (Who has access)**: **`Siapa saja (Anyone)`** *(Wajib pilih 'Anyone' agar ekstensi bisa mengirim data tanpa login ulang)*.
4. Klik **Terapkan (Deploy)**.
5. Jika muncul permintaan izin (*Authorization Required*):
   - Klik *Beri Izin (Authorize access)* > Pilih akun Google Anda > Klik *Lanjutan (Advanced)* > Klik *Buka (tidak aman) / Go to project (unsafe)* > Klik *Izinkan (Allow)*.
6. Salin **URL Aplikasi Web (Web App URL)** yang berformat `https://script.google.com/macros/s/.../exec`.

---

## Langkah 4: Tempelkan ke Ekstensi Affiliator Killer
1. Buka ekstensi **Affiliator Killer** di browser Anda.
2. Buka tab **Pengaturan (Settings)** > Pilih sub-tab **Database & Sheets**.
3. Tempelkan URL Web App tadi ke kolom **Google Sheets Webhook URL**.
4. Klik tombol **"⚡ Test Koneksi"** untuk memastikan berhasil!

🎉 **Selesai!** Sekarang setiap Anda klik tombol **"📊 Save to Sheets"** atau melakukan posting produk di Shopee, datanya langsung terisi rapi ke Google Spreadsheet Anda.
