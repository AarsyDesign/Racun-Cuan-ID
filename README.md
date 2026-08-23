# 💎 Racun Cuan ID — Super App & Affiliate Automation Suite
> **Automated Shopee Product Scraper, Universal Affiliate Link Generator, Multi-Channel Publisher (Pinterest & Telegram), and Scheduled Bot Engine.**

<div align="center">
  <img src="icons/logo-racuncuan.png" alt="Racun Cuan ID Logo" width="380" style="max-width: 100%; border-radius: 12px; margin-bottom: 12px;">
  
  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
    <img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension">
    <img src="https://img.shields.io/badge/Pinterest_API-v5-E60023?style=for-the-badge&logo=pinterest&logoColor=white" alt="Pinterest API">
    <img src="https://img.shields.io/badge/Telegram_Bot-API-24A1DE?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot">
    <img src="https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Railway Deploy">
  </p>
</div>

---

## 🌟 Tentang Racun Cuan ID

**Racun Cuan ID** (Affiliator Killer) adalah platform otomatisasi terintegrasi (*all-in-one productivity suite*) yang dirancang khusus untuk affiliate marketer dan content creator. 

Sistem ini menggabungkan **Chrome Extension (Side Panel & DOM Scraper)** dengan **Super App Web Studio** dan **Express Background Worker**, memungkinkan pengguna untuk memindai produk Shopee, menghasilkan link affiliate ber-SubID otomatis, memproduksi konten visual & SEO, serta menjadwalkan publikasi otomatis ke **Pinterest** dan channel **Telegram** secara konsisten dengan interval aman anti-ban.

---

## ✨ Fitur Utama (*Key Features*)

### 🛒 1. Shopee Scraper & Universal Affiliate Generator
* **1-Click DOM Scraper**: Memindai katalog produk atau halaman rincian produk Shopee langsung dari browser tab aktif.
* **Universal Affiliate Link Engine**: Menghasilkan link affiliate berpelacak (*SubID*) secara otomatis dengan parameter kustom (`sub_id=racuncuan_auto`).
* **Auto-Deck Sync**: Produk yang di-scan langsung tersimpan di database lokal/cloud dan siap ditransfer ke antrean posting.

### 🗂️ 2. Preview Queue & Scheduled Bot Engine
* **Horizontal Compact Density Cards**: Desain kartu antrean yang ramping, padat, dan elegan dengan layout horizontal (thumbnail 92px di sebelah kiri, detail teks dan aksi di kanan).
* **Live Real-Time Countdown Timer (`⏱️ Next Post: MM:SS`)**: Bar atas menampilkan hitung mundur hidup setiap detik yang tersinkronisasi langsung dengan jadwal produk terdepan di antrean.
* **Deterministic 35-Minute Interval Scheduling**: Jadwal rilis setiap kartu antrean terkunci secara presisi di database (*fixed timestamp*) dengan interval bertahap 35 menit per produk (+35m, +70m, +105m, dst.).
* **Kontrol Seleksi Massal (Batch Actions)**:
  * **Checkbox Selektif**: Kotak centang di pojok kiri setiap kartu untuk memilih produk tertentu.
  * **Pilih Semua Antrean (`Select All`)**: Memilih seluruh antrean dalam sekali klik.
  * **`🗑️ Hapus Terpilih`** & **`✓ Approve Terpilih`**: Menghapus atau menyetujui sejumlah item terpilih.
  * **`🗑️ Hapus Semua (Clear All)`**: Membersihkan seluruh isi antrean secara instan.

### 📢 3. Multi-Channel Publisher (Pinterest & Telegram)
* **📌 Pinterest API v5**: 
  * Membuat Pin berformat 2:3 dengan foto produk berkualitas tinggi.
  * Pemilihan target board otomatis / dinamis.
  * Judul dan deskripsi dilengkapi tagar SEO trending (`#RacunShopee`, `#ShopeeHaul`, dsb.).
* **📢 Telegram Channel Broadcaster**:
  * Otomatis memposting kartu produk HD ke Channel Telegram dengan format harga diskon (*strikethrough*), rating, dan ulasan.
  * Dilengkapi tombol CTA interaktif (*Inline Keyboard Button*) langsung ke link affiliate Shopee (`🛍️ Beli di Shopee`).

### 📊 4. Unified Multi-Platform Job History
* **Log Publikasi Terpadu**: Tabel riwayat pengiriman produk yang mencakup publikasi ke Telegram maupun Pinterest.
* **Filter Platform**: Filter chip sekali klik untuk menyaring riwayat berdasarkan `🌐 Semua Platform`, `📢 Telegram`, atau `📌 Pinterest`.
* **Tautan Langsung**: Dilengkapi link langsung ke postingan yang telah live di Pinterest atau channel Telegram.

### 🤖 5. Campaign Studio & AI Copywriter
* Mengatur template gaya, subjek, mood, dan outfit untuk kampanye promosi otomatis.
* Terintegrasi dengan Google Gemini AI untuk pembuatan judul kreatif dan deskripsi penawaran yang memikat.

### 📑 6. Google Sheets & Webhook Data Hub
* Ekspor antrean dan riwayat publikasi dalam format CSV / Excel.
* Sinkronisasi data ke Google Sheets melalui integrasi Webhook (n8n / Make / Apps Script).

### 🔒 7. Keamanan & Persistensi Kredensial Lokal
* Pengaturan server dan kredensial disimpan secara permanen di browser (`chrome.storage.local` & `localStorage`).
* Konfigurasi `.gitignore` ketat untuk memastikan tidak ada token atau file kredensial rahasia (`.env`, `credentials.json`) yang bocor ke repositori Git publik.

---

## 🏗️ Struktur Proyek (*Project Structure*)

```
Affiliator Killer/
├── icons/                      # Asset icon ekstensi dan logo aplikasi
├── manifest.json               # Konfigurasi Chrome Extension Manifest V3
├── index.html                  # Halaman utama Super App Studio Dashboard
├── studio/
│   ├── studio.js               # Logic kontroler interaktif frontend Studio
│   └── studio.css              # Sistem desain styling gelap, glassmorphism & responsive grid
├── sidepanel/
│   ├── sidepanel.html          # UI Side Panel Chrome Extension
│   ├── sidepanel.js            # Controller Side Panel & Shopee Scraper bridge
│   └── sidepanel.css           # Styling Side Panel
├── scripts/
│   ├── content.js              # Content Script pengeksekusi DOM Shopee Scraper
│   ├── background.js           # Service Worker background Chrome Extension
│   └── universal-affiliate.js  # Generator link affiliate Shopee dengan SubID
├── server/
│   ├── server.js               # Express.js Server API & background worker entrypoint
│   ├── Procfile                # Konfigurasi deployment Railway / Heroku
│   ├── data/
│   │   ├── database.json       # Database JSON lokal untuk produk, kampanye & antrean
│   │   └── database.example.json
│   ├── routes/
│   │   ├── bot.js              # Endpoint kontrol bot worker (start, pause, status)
│   │   ├── campaigns.js        # Endpoint CRUD Campaign Studio
│   │   ├── connections.js      # Endpoint status koneksi API (Pinterest, Telegram, AI)
│   │   ├── history.js          # Endpoint riwayat publikasi multi-platform
│   │   ├── products.js         # Endpoint katalog produk Shopee & transfer antrean
│   │   ├── queue.js            # Endpoint Preview Queue (approve, delete, batch)
│   │   └── stats.js            # Endpoint KPI metrik dashboard
│   └── services/
│       ├── bot-worker.js       # Background Scheduler Bot (35-min automated interval)
│       ├── db-service.js       # JSON Storage & CRUD Service Layer
│       ├── pinterest-publisher.js # Pinterest API v5 Dispatcher
│       ├── telegram-publisher.js  # Telegram Bot API Broadcaster
│       └── queue-service.js    # Queue & Schedule Management Service
└── README.md
```

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Prasyarat (*Prerequisites*)
* Node.js versi 18 atau yang lebih baru.
* Google Chrome, Brave, atau browser berbasis Chromium lainnya.

### 2. Menjalankan Backend Server (Lokal)
```bash
# 1. Masuk ke direktori server
cd server

# 2. Install dependensi
npm install

# 3. Jalankan server Express
node server.js
```
Server akan aktif di `http://localhost:3000`.

### 3. Memasang Chrome Extension (Side Panel)
1. Buka browser Chrome dan akses `chrome://extensions/`.
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik tombol **Load unpacked** (Muat yang belum dibongkar).
4. Pilih folder root proyek (`Affiliator Killer`).
5. Ekstensi **Racun Cuan ID** akan langsung terpasang dan dapat dibuka melalui toolbar atau icon puzzle di samping address bar!

---

## ☁️ Panduan Deployment Cloud (Railway)

Aplikasi ini sudah siap di-deploy langsung ke platform cloud seperti **Railway**:

1. Hubungkan repositori GitHub Anda (`https://github.com/AarsyDesign/Racun-Cuan-ID.git`) ke project baru di [Railway.app](https://railway.app).
2. Railway akan otomatis mendeteksi Node.js dan menjalankan perintah start melalui `Procfile` / `server/server.js`.
3. Setelah deployment selesai dan domain generated tersedia (contoh: `https://racun-cuan-id-production.up.railway.app`):
   * Buka menu **Settings** di Ekstensi / Web Studio.
   * Masukkan URL Railway tersebut pada kolom **Backend API URL**.
   * Klik **Simpan Pengaturan**.

---

## ⚙️ Variabel Lingkungan (*Environment Variables*)

Buat file `.env` di dalam folder `server/` (opsional jika ingin menggunakan env vars di server):

```env
PORT=3000
NODE_ENV=production
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_CHANNEL_ID=@namachannelanda
PINTEREST_ACCESS_TOKEN=pina_...
GEMINI_API_KEY=AIzaSy...
```

---

## 📄 Kebijakan Privasi (*Privacy Policy*)
Silakan baca [Kebijakan Privasi](privacy.html) kami untuk memahami bagaimana data Anda diproses secara aman dan privat sesuai dengan ketentuan developer platform.

---

## ⚖️ Lisensi (*License*)
Didistribusikan di bawah Lisensi **MIT**. &copy; 2026 Racun Cuan ID. Seluruh hak cipta dilindungi undang-undang.

