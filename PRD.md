# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD) v2.1

## Project Name: **Affiliator Killer** (Shopee to Pinterest & Multi-Channel Automation)
**Platform**: Google Chrome Extension (Manifest V3 with Side Panel)  
**Target Users**: Shopee Affiliator, Content Creators, Digital Marketers, Automation Builders  
**Primary Goal**: Ekstensi browser all-in-one untuk scraping produk Shopee dari layar aktif, AI multi-model copy generation (Gemini, OpenCode/OpenAI, OpenRouter, Groq, Ollama), auto affiliate link builder, integrasi database **Google Sheets / Teable / Local History**, webhook **n8n** untuk automasi lanjutan, dan posting langsung ke **Pinterest** serta multi-platform.

---

## 1. Problem Statement & Enhanced Value Proposition

### 1.1 Masalah Affiliator
1. **Repetisi Tinggi**: Copy data produk, gambar, harga, dan membuat link affiliasi secara berulang puluhan kali per hari.
2. **Keterbatasan AI Model Tunggal**: Kebutuhan fleksibilitas model AI (ingin menggunakan Gemini, OpenAI, OpenCode, Groq, OpenRouter, atau model lokal bebas kuota).
3. **Pencatatan & Tracking**: Perlu cara yang **sangat mudah** (seperti **Google Sheets** atau file **Excel/CSV**) untuk mencatat produk yang sudah di-scrape / di-post agar tidak hilang dan tidak terjadi duplikasi.
4. **Keterbatasan Posting Single Channel**: Ingin bisa otomatisasi multi-channel (Pinterest, Telegram, Threads, Instagram) melalui pipeline workflow (n8n).

### 1.2 Solusi: Affiliator Killer Ecosystem
- 🔍 **Active Visual Shopee Scraper**: Ekstraksi produk instan dari layar browser (Search, Category, Flash Sale, Shop, Detail Produk).
- 🧠 **Universal Multi-LLM Engine**: Dukungan Google Gemini API + Provider OpenAI-Compatible (OpenCode, OpenAI GPT-4o, OpenRouter, DeepSeek, Groq, Ollama lokal) dengan custom prompt & tone selector.
- 📊 **Google Sheets & Spreadsheet Auto-Logger**:
  - **Google Sheets Webhook (Apps Script)**: 1-klik auto-insert baris baru ke spreadsheet pengguna secara otomatis tanpa setup rumit.
  - **Local History & CSV Export**: Riwayat tersimpan rapi di dalam ekstensi dan bisa diunduh kapan saja ke format CSV / Excel / Pinterest Bulk Pin.
  - **Teable Sync (Opsional)**: Tetap didukung bagi pengguna yang ingin menggunakan database Teable.
- ⚡ **n8n Automation Webhook**: 1-klik kirim payload data produk ke [n8n](https://github.com/n8n-io/n8n) webhook untuk alur kerja otomatisasi lanjutan.
- 📌 **Direct Pinterest & Social Publisher**: Direct Web Pin Creator, Pinterest API v5, format teks siap copy, dan CSV bulk export.
- 🎨 **Penpot-Inspired Modern UI**: Tampilan Side Panel modern, sleek, minimalis, presisi tinggi terinspirasi oleh desain UI [Penpot](https://github.com/penpot/penpot).

---

## 2. System Architecture & Integrations

```mermaid
graph TD
    subgraph Browser & Shopee
        A[Halaman Shopee: shopee.co.id] -->|Content Script Scraper| B[Side Panel: Affiliator Killer]
    end

    subgraph AI Engine Multi-Model
        B -->|Gemini API / OpenCode / OpenAI / Groq / Ollama| C[AI Copy & SEO Pin Engine]
    end

    subgraph Database, Sheets & Tracking
        B -->|Auto Sync Webhook| D[📊 Google Sheets]
        B -->|Direct Download| E[📄 CSV / Excel File]
        B -->|Local Storage Cache| F[💾 In-App History Tab]
        B -->|Optional Sync| G[🗄️ Teable Database]
    end

    subgraph Publishing & Automation
        B -->|Direct Pin / Web Intent / API v5| H[Pinterest]
        B -->|Webhook Trigger| I[n8n Automation Workflows]
        I --> J[Telegram / Threads / IG / TikTok / Schedulers]
        B -->|Bulk CSV / Clipboard| K[Social Media / Clipboard Copy]
    end
```

---

## 3. Detailed Technical Specifications

### 3.1 Smart Shopee DOM Scraper (`scripts/content.js`)
- Mendeteksi jenis halaman Shopee (`/search`, `/shop`, `/flash_sale`, `/product`, dll).
- Ekstraksi elemen visual:
  - `title`: Judul produk lengkap.
  - `originalPrice` & `discountedPrice`: Harga asli dan diskon.
  - `discountPercentage`: Diskon dalam persen.
  - `imageUrl`: URL gambar utama HD dan array gambar galeri.
  - `productUrl`: Clean link produk, `itemId`, dan `shopId`.
  - `rating`: Rating bintang (e.g. 4.9).
  - `soldCount`: Total item terjual (e.g. "10RB+ Terjual").
  - `shopLocation` & `shopType`: Mall / Star+ / Regular, Lokasi Toko.

### 3.2 Universal Multi-LLM Provider Engine (`scripts/ai-engine.js`)
Mendukung switching provider AI secara fleksibel:
1. **Google Gemini API**: `gemini-2.5-flash`, `gemini-2.5-pro`.
2. **OpenCode / OpenAI-Compatible Provider**: Base URL kustom + API Key + Model ID (kompatibel OpenCode, OpenAI, OpenRouter, Groq, DeepSeek, Ollama lokal).
3. **Prompt & Template Engine**:
   - Preset: *Aesthetic & Korean Vibe*, *Spill Racun Diskon & Flash Sale*, *Review Jujur & Solutif*, *Short Viral Caption*.
   - Dynamic Variables: `{title}`, `{price}`, `{discount}`, `{rating}`, `{sold}`, `{shop_location}`, `{affiliate_link}`.
   - Structured Output: Judul Pin SEO (max 100 char), Deskripsi persuasif + CTA (max 500 char), dan Hashtags relevan.

### 3.3 Google Sheets & Spreadsheet Logging (`scripts/sheets.js`)
- **Metode Google Sheets Webhook (Paling Praktis)**:
  - Pengguna hanya perlu menempelkan URL Web App dari Google Apps Script (template skrip kami sediakan 10 baris kode gratis).
  - Setiap produk yang di-save atau di-post otomatis menambahkan baris baru di Google Sheets secara real-time:
    `[Tanggal, Nama Produk, Harga Asli, Harga Diskon, Link Affiliate, URL Gambar, Judul Pin AI, Deskripsi AI, Hashtag, Status]`
- **Local In-App History**:
  - Semua produk yang pernah di-scrape/di-generate disimpan di memori lokal ekstensi (`chrome.storage.local`).
  - Tab "History" di Side Panel memungkinkan user melihat, menyalin, atau menghapus riwayat produk.
- **1-Click CSV Export**:
  - Tombol *"Download as CSV/Excel"* untuk mengunduh semua data produk ke spreadsheet offline.
- **Teable Client (`scripts/teable.js`)**:
  - Tetap tersedia sebagai opsi jika pengguna ingin menggunakan database Teable di masa mendatang.

### 3.4 n8n Webhook & Automation Trigger (`scripts/n8n.js`)
- Mengirimkan payload JSON lengkap ke n8n webhook untuk alur kerja lanjutan (watermark gambar, broadcast Telegram, post TikTok/Instagram).

### 3.5 Affiliate Link Engine (`scripts/affiliate.js`)
- Konfigurasi parameter Sub-ID tracking (e.g. `sub_id=pinterest_pins`).
- Auto-conversion link Shopee Universal Link template.

### 3.6 Pinterest Posting & Export (`scripts/pinterest.js`)
- **Web Pin Intent Share**: Popup dialog resmi Pinterest dengan pre-filled metadata.
- **Pinterest API v5**: Direct post ke Board pilihan.
- **CSV Bulk Export**: Standar Pinterest CSV format.
- **Rich Clipboard Copy**: Format salin cepat untuk WA/Telegram/Medsos.

---

## 4. UI/UX Design System (Penpot-Inspired Aesthetics)

- Layout Side Panel modern terinspirasi dari Penpot:
  1. **Top Bar**: Status halaman Shopee aktif, Indikator Sheets/Teable & n8n status, Dark/Light Mode, API model badge.
  2. **Scraper Action Bar**: Tombol *"⚡ Scan Layar"*, *"Scan Semua"*, Filter Diskon/Rating/Terjual, Bulk Select.
  3. **Product Deck / Grid**: List kartu produk dengan visual cover HD, label diskon, rating, status (New/Saved/Posted).
  4. **AI & Quick Action Bar per Card**: Tombol *"✨ AI Copy"*, *"📌 Pin"*, *"📊 Save to Sheets"*, *"⚡ n8n"*, *"📋 Copy"*.
  5. **Drawer / Settings Modal**:
     - AI Provider Settings (Gemini / OpenCode / OpenAI / Custom Endpoint).
     - Storage Settings (Pilih: **Google Sheets Webhook URL** / **Local CSV** / **Teable**).
     - n8n Webhook Settings.
     - Shopee Affiliate Sub-ID.
