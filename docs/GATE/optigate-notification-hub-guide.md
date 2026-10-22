# 🔔 Panduan Integrasi Notifikasi Terpusat (Notification Hub)
> **Portal DM (OptiGate)** • Real-Time Ingestion Hub, Actionable Alerts & Target Resolver  
> **Versi Dokumen:** `2.0` | **Terakhir Diperbarui:** `Oktober 2026`  
> **Base URL:** `https://gate.appdutamall.com/api/v1/notifications` *(atau `http://localhost:8000/api/v1/notifications` di lingkungan development)*

---

## 📌 Daftar Isi
1. [Gambaran Umum & Arsitektur](#1-gambaran-umum--arsitektur)
2. [Autentikasi & Header API](#2-autentikasi--header-api)
3. [Tiga Perilaku Notifikasi (`behavior`)](#3-tiga-perilaku-notifikasi-behavior)
   - [3.1 Informational (Informasi Biasa)](#31-informational-informasi-biasa)
   - [3.2 Actionable (Perlu Tindakan)](#32-actionable-perlu-tindakan)
   - [3.3 Persistent (Kritis & Wajib Dibaca)](#33-persistent-kritis--wajib-dibaca)
4. [Katalog Endpoint API](#4-katalog-endpoint-api)
   - [4.1 Mengirim Notifikasi (`POST /send`)](#41-mengirim-notifikasi-post-send)
   - [4.2 Menyelesaikan Notifikasi Otomatis (`POST /resolve`)](#42-menyelesaikan-notifikasi-otomatis-post-resolve)
   - [4.3 Menghapus Notifikasi Manual (`DELETE /by-reference`)](#43-menghapus-notifikasi-manual-delete-by-reference)
5. [Panduan Target Penerima (`target_type` & `target_id`)](#5-panduan-target-penerima-target_type--target_id)
6. [Contoh Kasus Penggunaan Nyata](#6-contoh-kasus-penggunaan-nyata)
   - [Kasus A: Notifikasi Tindakan Insiden / CCTV Down](#kasus-a-notifikasi-tindakan-insiden--cctv-down)
   - [Kasus B: Alur Approval Berjenjang (`resolve_previous: true`)](#kasus-b-alur-approval-berjenjang-resolve_previous-true)
   - [Kasus C: Broadcast Memo / Pengumuman Umum](#kasus-c-broadcast-memo--pengumuman-umum)
   - [Kasus D: Auto-Resolve Saat Insiden / Tugas Selesai](#kasus-d-auto-resolve-saat-insiden--tugas-selesai)
7. [Contoh Kode Integrasi Multi-Bahasa](#7-contoh-kode-integrasi-multi-bahasa)
   - [cURL](#curl)
   - [PHP / Laravel HTTP Client](#php--laravel-http-client)
   - [Node.js / TypeScript](#nodejs--typescript)
   - [Python](#python)
8. [Troubleshooting & FAQ](#8-troubleshooting--faq)

---

## 1. Gambaran Umum & Arsitektur

Notification Hub di Portal DM dirancang untuk menjadi gerbang tunggal pengiriman notifikasi dari seluruh aplikasi di ekosistem (Aplikasi Cuti, CCTV Monitoring, CRM, Ticketing, Presensi, Finance, dsb.).

### Keunggulan Utama:
- **Pengiriman Realtime Otomatis:** Setiap notifikasi yang masuk langsung disiarkan ke antarmuka web melalui **WebSockets (Laravel Reverb)** tanpa perlu refresh halaman, serta disalurkan ke browser offline via **Web Push Notification**.
- **Fan-Out Terisolasi:** Notifikasi yang dikirim ke divisi/departemen akan otomatis dipecah menjadi data terpisah untuk masing-masing user. Status dibaca (*read*) dan hapus (*dismiss*) user A tidak akan mempengaruhi user B.
- **Kategori Tindakan (Actionable Lock):** Untuk notifikasi penting yang butuh tindakan teknis/approval, user **tidak bisa menghapusnya manual** sampai sistem yang mengirimkan notifikasi menandai masalah tersebut telah selesai (`resolve`).

---

## 2. Autentikasi & Header API

Setiap panggilan ke API Notification Hub memerlukan autentikasi aplikasi klien yang terdaftar di Portal DM.

### Header yang Didukung:

**Opsi 1: Kredensial Klien (Direkomendasikan untuk Microservice/Cron)**
```http
Content-Type: application/json
Accept: application/json
X-Client-ID: <CLIENT_ID_ATAU_ENTITY_ID_APLIKASI>
X-Client-Secret: <CLIENT_SECRET_APLIKASI>
```

**Opsi 2: Bearer Token (Untuk Sistem yang Menggunakan Passport/PAT)**
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <ACCESS_TOKEN>
```

> 💡 **Cara Mendapatkan Kredensial:** Buka menu **Master Data > Klien OAuth / SAML** di dashboard Admin Portal DM, cari aplikasi Anda, klik tombol mata (*reveal*) untuk menyalin Secret.

---

## 3. Tiga Perilaku Notifikasi (`behavior`)

Parameter `behavior` menentukan bagaimana notifikasi diperlakukan di antarmuka pengguna:

| Nilai `behavior` | Status Hapus Manual | Muncul di Tab Mana? | Kapan Menghilang? | Contoh Kasus |
| :--- | :---: | :--- | :--- | :--- |
| **`informational`** *(default)* | ✅ Bisa dihapus user | **Semua** | Saat user klik ikon hapus / tandai baca. | Pengumuman libur, ucapan selamat datang, update status tiket santai. |
| **`actionable`** *(Perlu Tindakan)* | ❌ **Terkunci (Tidak bisa dihapus user)** | **🛡️ Perlu Tindakan** & **Semua** | Hanya hilang setelah aplikasi pembuat memanggil `/resolve` atau diselesaikan otomatis. | Insiden CCTV/NVR offline, approval cuti, tagihan jatuh tempo, server error. |
| **`persistent`** *(Kritis)* | ❌ **Terkunci & Selalu Unread** | **🛡️ Perlu Tindakan** & **Semua** | Selalu berstatus belum dibaca dan terkunci sampai di-resolve sistem. | Peringatan darurat kebakaran, bencana alam, kebocoran data aktif. |

---

## 4. Katalog Endpoint API

### 4.1 Mengirim Notifikasi (`POST /send`)
- **Endpoint:** `POST /api/v1/notifications/send`
- **Fungsi:** Mengirim notifikasi baru ke individu atau grup tertentu.

#### Parameter Request (JSON Body):

| Parameter | Tipe | Wajib? | Nilai / Format | Keterangan |
| :--- | :---: | :---: | :--- | :--- |
| **`target_type`** | `string` | **Ya** | `user`, `position`, `department`, `division`, `company`, `role`, `all` | Cakupan target penerima. |
| **`target_id`** | `string` | Kondisional | UUID, kode, email, atau NIK | Pengenal target (wajib diisi kecuali `target_type` = `all`). |
| **`title`** | `string` | **Ya** | Teks (maks. 255 karakter) | Judul ringkas notifikasi. |
| **`body`** | `string` | **Ya** | Teks panjang | Rincian lengkap pesan notifikasi. |
| **`behavior`** | `string` | Tidak | `informational`, `actionable`, `persistent` | **Default:** `informational`. Gunakan `actionable` untuk mengunci notifikasi agar tidak bisa dihapus user. |
| **`type`** | `string` | Tidak | `info`, `approval`, `warning`, `success`, `error` | Tema visual badge dan warna aksen notifikasi. |
| **`priority`** | `string` | Tidak | `low`, `normal`, `high`, `urgent` | Tingkat urgensi tampilan (mempengaruhi penataan urutan). |
| **`reference_id`** | `string` | Dianjurkan | Teks unik (misal: `NVR-L2-DOWN`, `CUTI-2026-091`) | ID unik dari sistem Anda. Kunci utama untuk fitur auto-resolve! |
| **`action_url`** | `string` | Tidak | URL valid (`https://...`) | Tautan tujuan tombol tindakan **"Buka"** pada notifikasi. |
| **`resolve_previous`** | `boolean` | Tidak | `true` atau `false` | Jika `true`, otomatis menyelesaikan notifikasi sebelumnya yang memiliki `reference_id` sama. |
| **`data`** | `object` | Tidak | Key-value JSON | Metadata tambahan bebas untuk kebutuhan frontend atau log. |

#### Contoh Respon Sukses (200 OK):
```json
{
  "success": true,
  "message": "Notifikasi berhasil dikirim.",
  "delivered_count": 8,
  "target_type": "division",
  "notification_ids": [
    "019fc128-dd08-73e7-af77-38a9409d5bb0",
    "019fc129-aa11-73e7-af77-38a9409d5bb1"
  ],
  "previous_resolved_count": 0
}
```

---

### 4.2 Menyelesaikan Notifikasi Otomatis (`POST /resolve`)
- **Endpoint:** `POST /api/v1/notifications/resolve`
- **Fungsi:** Menandai notifikasi sebagai terselesaikan (*resolved*). Notifikasi bertipe `actionable` yang terkunci akan otomatis selesai dan hilang dari antarmuka seluruh penerima secara serentak via WebSockets.

#### Parameter Request (JSON Body):
```json
{
  "reference_id": "cctv-nvr-fl2-offline"
}
```

#### Parameter Opsional untuk Filter Resolusi Parsial:
- `"user_id"`: Jika hanya ingin me-resolve untuk user tertentu.
- `"target_type"` & `"target_id"`: Jika hanya ingin me-resolve untuk divisi/departemen tertentu.

#### Contoh Respon Sukses (200 OK):
```json
{
  "success": true,
  "message": "Notifikasi berhasil diselesaikan / disinkronkan.",
  "resolved_count": 8
}
```

---

### 4.3 Menghapus Notifikasi Manual (`DELETE /by-reference`)
- **Endpoint:** `DELETE /api/v1/notifications/by-reference?reference_id=<id>`
- **Fungsi:** Menghapus paksa notifikasi dari database jika terjadi kesalahan kirim data.

---

## 5. Panduan Target Penerima (`target_type` & `target_id`)

Gunakan panduan berikut untuk menentukan nilai `target_id`. **Sangat disarankan menggunakan UUID** untuk menjamin data tidak terpengaruh perubahan nama divisi atau jabatan di kemudian hari:

| `target_type` | Nilai `target_id` Terbaik | Alternatif Nilai | Hasil Pengiriman |
| :--- | :--- | :--- | :--- |
| **`user`** | **UUID User** (`019fc128-...`) | Email aktif (`admin@tataoptima.com`), NIK | Tepat ke 1 akun pengguna. |
| **`position`** | **UUID Posisi** (`01a0426b-...`) | Level Jabatan (`"1"` s/d `"7"`), Nama Posisi | Seluruh staf yang memegang posisi/jabatan tersebut. |
| **`department`** | **UUID Departemen** (`01a0426b-...`) | Kode Departemen (`"TOP-IT"`), Nama Dept | Seluruh staf di departemen tersebut dan divisi anaknya. |
| **`division`** | **UUID Divisi** (`01a0426b-...`) | Kode Divisi (`"TOP-IT-CCTV"`), Nama Divisi | Seluruh anggota divisi tersebut. |
| **`company`** | **UUID Perusahaan** (`01a0426b-...`) | Kode Perusahaan (`"TOP"`, `"DUTA"`) | Seluruh staf yang bernaung di perusahaan tersebut. |
| **`role`** | **Nama Role Spatie** | `"super-admin"`, `"department-admin"`, `"user"` | Seluruh akun yang memiliki hak akses role tersebut. |
| **`all`** | *(Kosongkan / `null`)* | `null` | Broadcast ke seluruh pengguna aktif di portal. |

---

## 6. Contoh Kasus Penggunaan Nyata

### Kasus A: Notifikasi Tindakan Insiden / CCTV Down
Sistem monitoring jaringan mendeteksi NVR mati. Notifikasi wajib dikunci (`behavior: actionable`) agar teknisi tidak bisa menghilangkannya sebelum dicek fisik.

**Request:** `POST /api/v1/notifications/send`
```json
{
  "target_type": "division",
  "target_id": "01a0426b-c5ff-73c6-a824-1265c12dde63",
  "title": "NVR Lantai 2 Offline",
  "body": "Perangkat NVR Lantai 2 tidak merespon ping sejak 09:30. Segera lakukan pengecekan switch dan catu daya.",
  "behavior": "actionable",
  "type": "error",
  "priority": "urgent",
  "reference_id": "cctv-nvr-fl2-offline",
  "action_url": "http://192.168.1.50/admin/nvr/fl2",
  "resolve_previous": true,
  "data": {
    "device_ip": "192.168.1.50",
    "location": "Lantai 2 - Rack 03"
  }
}
```

---

### Kasus B: Alur Approval Berjenjang (`resolve_previous: true`)
Dokumen PO telah disetujui Manager, sekarang naik ke General Manager. Notifikasi di Manager lama harus otomatis hilang, dan notifikasi baru muncul di GM. Cukup sertakan `resolve_previous: true` dengan `reference_id` yang sama!

**Request:** `POST /api/v1/notifications/send`
```json
{
  "target_type": "position",
  "target_id": "01a08e44-c2f2-7380-acba-202ff610fcc7",
  "title": "Approval PO: Pengadaan Perangkat Jaringan",
  "body": "Pengajuan PO #PO-2026-88 telah disetujui Manager dan menunggu persetujuan akhir General Manager.",
  "behavior": "actionable",
  "type": "approval",
  "priority": "high",
  "reference_id": "PO-2026-88",
  "resolve_previous": true,
  "action_url": "https://purchasing.appdutamall.com/po/PO-2026-88"
}
```

---

### Kasus C: Broadcast Memo / Pengumuman Umum
Informasi santai yang tidak perlu dikunci, pengguna bebas menghapus kapan saja (`behavior: informational`).

**Request:** `POST /api/v1/notifications/send`
```json
{
  "target_type": "company",
  "target_id": "01a0426b-5950-7233-94dc-1cc1dfb07bf3",
  "title": "Jadwal Buka Puasa Bersama Perusahaan",
  "body": "Diberitahukan kepada seluruh rekan kerja acara buka puasa bersama akan diadakan Jumat pukul 17:30 WITA di Ballroom Lantai 5.",
  "behavior": "informational",
  "type": "info",
  "priority": "normal"
}
```

---

### Kasus D: Auto-Resolve Saat Insiden / Tugas Selesai
Ketika NVR sudah online kembali atau approval selesai:

**Request:** `POST /api/v1/notifications/resolve`
```json
{
  "reference_id": "cctv-nvr-fl2-offline"
}
```
*Hasil:* Seluruh notifikasi dengan reference ID tersebut otomatis hilang dari layar teknisi secara realtime.

---

## 7. Contoh Kode Integrasi Multi-Bahasa

### cURL
```bash
curl -X POST https://gate.appdutamall.com/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Client-ID: sistem-cctv-monitoring" \
  -H "X-Client-Secret: 4hE44tC6kUqJp2y8A..." \
  -d '{
    "target_type": "division",
    "target_id": "TOP-IT-CCTV",
    "title": "NVR Lantai 2 Offline",
    "body": "Koneksi ke NVR terputus. Segera lakukan pengecekan.",
    "behavior": "actionable",
    "type": "error",
    "priority": "urgent",
    "reference_id": "cctv-nvr-fl2-offline",
    "action_url": "http://192.168.1.50/admin"
  }'
```

### PHP / Laravel HTTP Client
```php
use Illuminate\Support\Facades\Http;

// 1. Kirim Notifikasi Tindakan
$response = Http::withHeaders([
    'X-Client-ID'     => config('services.portal.client_id'),
    'X-Client-Secret' => config('services.portal.client_secret'),
])->post('https://gate.appdutamall.com/api/v1/notifications/send', [
    'target_type'  => 'user',
    'target_id'    => '019fc128-dd08-73e7-af77-38a9409d5bb0',
    'title'        => 'Pengajuan Cuti Menunggu Persetujuan',
    'body'         => 'Pengajuan cuti tahunan 3 hari menunggu respon Anda.',
    'behavior'     => 'actionable',
    'type'         => 'approval',
    'priority'     => 'high',
    'reference_id' => 'CUTI-2026-001',
    'action_url'   => 'https://cuti.appdutamall.com/approval/001',
]);

// 2. Resolve Saat Cuti Telah Disetujui / Ditolak
Http::withHeaders([
    'X-Client-ID'     => config('services.portal.client_id'),
    'X-Client-Secret' => config('services.portal.client_secret'),
])->post('https://gate.appdutamall.com/api/v1/notifications/resolve', [
    'reference_id' => 'CUTI-2026-001',
]);
```

### Node.js / TypeScript
```typescript
import axios from 'axios';

const portalApi = axios.create({
  baseURL: 'https://gate.appdutamall.com/api/v1/notifications',
  headers: {
    'X-Client-ID': process.env.PORTAL_CLIENT_ID!,
    'X-Client-Secret': process.env.PORTAL_CLIENT_SECRET!,
    'Content-Type': 'application/json',
  },
});

// Kirim notifikasi tindakan
await portalApi.post('/send', {
  target_type: 'division',
  target_id: '01a0426b-c5ff-73c6-a824-1265c12dde63',
  title: 'Peringatan Kapasitas Storage > 95%',
  body: 'Storage server backup tersisa kurang dari 50GB.',
  behavior: 'actionable',
  type: 'warning',
  priority: 'high',
  reference_id: 'storage-backup-warning',
});

// Resolve saat storage sudah dibersihkan
await portalApi.post('/resolve', {
  reference_id: 'storage-backup-warning',
});
```

### Python
```python
import requests

headers = {
    "X-Client-ID": "sistem-monitoring",
    "X-Client-Secret": "secret-klien-anda",
    "Content-Type": "application/json"
}

# Kirim notifikasi tindakan
payload = {
    "target_type": "user",
    "target_id": "019fc128-dd08-73e7-af77-38a9409d5bb0",
    "title": "Server Database High CPU",
    "body": "Penggunaan CPU database mencapai 98% selama 5 menit berturut-turut.",
    "behavior": "actionable",
    "type": "error",
    "priority": "urgent",
    "reference_id": "db-cpu-spike-2026",
    "action_url": "https://monitor.appdutamall.com/db"
}

r = requests.post("https://gate.appdutamall.com/api/v1/notifications/send", json=payload, headers=headers)
print(r.json())
```

---

## 8. Troubleshooting & FAQ

#### Q: Mengapa pengguna tidak bisa menghapus notifikasi dengan tombol sampah?
> **A:** Notifikasi tersebut memiliki `"behavior": "actionable"` atau `"persistent"`. Desain ini dibuat sengaja agar tugas penting atau insiden tidak diabaikan/dihapus sembarangan. Notifikasi hanya akan hilang jika sistem pengirim memanggil endpoint `/resolve` dengan `reference_id` yang cocok.

#### Q: Notifikasi mengembalikan respon `delivered_count: 0`?
> **A:** Target tidak menemukan pengguna aktif. Pastikan:
> - Format UUID valid dan ada di database Portal DM.
> - Jika menggunakan email/NIK, pastikan akun pengguna dalam status aktif (`is_active = true`).
> - Jika target departemen/divisi, pastikan sudah ada staf yang ditugaskan ke unit kerja tersebut.

#### Q: Apakah aman mengirim notifikasi ke ratusan staf sekaligus?
> **A:** Sangat aman. Sistem menggunakan metode fan-out database dengan broadcast websocket event yang dioptimalkan, serta pengiriman Web Push dijalankan secara asynchronous/deferred agar API segera merespon dalam hitungan milidetik.
