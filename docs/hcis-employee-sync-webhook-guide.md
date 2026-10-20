# HCIS Employee Sync Webhook API

Dokumentasi endpoint webhook integrasi data karyawan dari HCIS (Single Source of Truth) ke Portal-DM.

## Overview

- **Endpoint**: `POST /api/v1/ingest/employee-sync`
- **Content-Type**: `application/json`
- **Auth**: HMAC-SHA256 signature via header `X-HCIS-Signature`
- **Config Key**: `services.hcis.webhook_secret` (ENV: `HCIS_WEBHOOK_SECRET`)

---

## Authentication & Verification

Setiap request wajib menyertakan signature pada header HTTP:

| Header | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `X-HCIS-Signature` | String | Ya | Hash HMAC-SHA256 dari raw request body menggunakan secret yang disepakati. |

Contoh kalkulasi signature (PHP):
```php
$signature = hash_hmac('sha256', $rawBodyContent, env('HCIS_WEBHOOK_SECRET'));
```

---

## Request Body Schema

```json
{
  "event": "employee.created",
  "timestamp": "2026-10-15T08:30:00Z",
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Budi Santoso",
    "email": "budi.santoso@company.com",
    "nik": "EMP-00123",
    "phone": "081234567890",
    "photo": "https://cdn.hcis.com/photos/budi.jpg",
    "nickname": "Budi",
    "callsign": "BS-1",
    "is_active": true
  }
}
```

### Parameter Details

| Field | Tipe | Wajib | Aturan / Validasi | Keterangan |
|---|---|---|---|---|
| `event` | string | Ya | `in:employee.created,employee.updated,employee.deactivated` | Event aksi dari HCIS |
| `timestamp` | string | Tidak | Format ISO8601 | Waktu kejadian di HCIS |
| `data` | object | Ya | Object payload | Data detail karyawan |
| `data.id` | string (UUID) | Ya | `uuid` | ID unik SSOT dari HCIS (disimpan sebagai `user.id`) |
| `data.name` | string | Ya | `max:255` | Nama lengkap karyawan |
| `data.email` | string | Ya | `email, max:255` | Email valid |
| `data.nik` | string | Tidak | `max:50` | Nomor Induk Karyawan |
| `data.phone` | string | Tidak | `max:50` | Nomor kontak (disimpan ke `whatsapp_number`) |
| `data.photo` | string | Tidak | `max:1000` | URL foto profil |
| `data.nickname` | string | Tidak | `max:100` | Nama panggilan |
| `data.callsign` | string | Tidak | `max:50` | Callsign / inisial |
| `data.is_active` | boolean | Tidak | `boolean` | Status keaktifan (default: `true`) |

---

## Business Logic & Behavior

1. **User Resolution**:
   - Sistem mencari user berdasarkan urutan: `id` (UUID HCIS) -> `email` -> `nik`.
   - Jika user belum ada dan event bukan deaktifasi: user dibuat baru menggunakan UUID dari HCIS, random password, `onboarded = false`, dan diberikan default role `user`.
2. **Deactivation & Token Revocation**:
   - Jika `event = "employee.deactivated"` atau `data.is_active = false`:
     - Status akun diubah jadi `is_active = false`.
     - Seluruh OAuth access token & refresh token dicabut (revoked).
     - Seluruh sesi login aktif (session database) dihapus seketika.
3. **Deactivation Non-Existent User**:
   - Jika event deaktifasi dikirim untuk user yang belum terdaftar di Portal-DM, sistem merespons sukses (acknowledged & skipped) tanpa error.

---

## Responses

### 200 OK (Sukses)

```json
{
  "status": "success",
  "message": "User updated successfully via HCIS sync.",
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "nik": "EMP-00123",
    "email": "budi.santoso@company.com",
    "is_active": true,
    "action": "updated"
  }
}
```

*Nilai `action`: `created` | `updated` | `deactivated`*

### 401 Unauthorized (Signature Tidak Valid)

```json
{
  "status": "error",
  "message": "Invalid webhook signature."
}
```

### 422 Unprocessable Content (Validasi Gagal)

```json
{
  "message": "The data.email field must be a valid email address.",
  "errors": {
    "data.email": [
      "The data.email field must be a valid email address."
    ]
  }
}
```
