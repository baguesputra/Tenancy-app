Berikut roadmap staged dari nol:

FASE A — Web (Laravel + Inertia + React)

Stage 1 — Fondasi project

Install Laravel 13, setup Docker Compose (Fedora) + Laragon (Windows), pastikan konsisten dua environment
Setup Inertia.js + React + Tailwind
Konfigurasi MySQL, .env per environment
Git repo + branching strategy dasar

Stage 2 — Auth & role dasar

Setup auth (mengacu ke pola koperasi: apakah pakai SSO OAuth2 yang sama, atau auth mandiri untuk project ini — perlu dikonfirmasi)
Install Spatie Permission, definisikan role awal: staff, manager, admin_pusat
Buat middleware/policy dasar untuk branch-scoping (yang sudah kita bahas)

Stage 3 — Skema database inti

Migration: branches, tenants (+ business_type, is_anchor, floor/block/unit)
Migration: checklist_templates, checklist_sections, checklist_items
Seeder dari kedua Excel form (F&B & Fashion) yang sudah kita petakan

Stage 4 — Dynamic form builder (admin)

CRUD web untuk admin mengatur template, section, item checklist
UI builder (drag-drop urutan item, atur label pasangan jawaban, toggle wajib foto)
Ini fondasi penting sebelum lanjut, karena Stage 5 & mobile nanti bergantung ke sini

Stage 5 — Modul sidak (inti bisnis)

Migration: inspection_sessions, inspections, inspection_answers, inspection_photos
Fitur web: mulai sesi, isi checklist per tenant, upload foto, submit
List riwayat sidak + detail (termasuk foto)

Stage 6 — Dashboard & laporan

Dashboard manager: filter lintas cabang, rekap status per tenant/kategori
Export (Excel/PDF) kalau dibutuhkan untuk laporan resmi
Branch-scoping penuh diterapkan (staff vs manager)

Stage 7 — QR Code

Generate QR per tenant (isi: UUID tenant)
Halaman scan/lookup di web (opsional, kalau perlu juga di web selain mobile)

Stage 8 — REST API untuk mobile

Setup Sanctum untuk token-based auth
Endpoint: login, tenants, checklist-templates, inspection-history, submit session/inspection, upload foto
Idempotency by UUID, validasi branch_id server-side
Testing API pakai Postman/Insomnia sebelum mobile mulai konsumsi
FASE B — Mobile (React Native / Expo)

Stage 9 — Setup project Expo

Init Expo project, TypeScript, struktur folder
Install dependencies inti: React Navigation, TanStack Query, Zustand, RHF+Zod

Stage 10 — Auth flow

Login form → Sanctum token → simpan di expo-secure-store
Auto-login kalau token masih ada (termasuk saat offline)

Stage 11 — Local storage & sync engine

Setup expo-sqlite (skema tabel cache: tenants, checklist_templates, tenant_history, local sessions/inspections/answers)
Setup expo-file-system untuk simpan foto lokal
Logic sync: download referensi data saat online, queue upload saat offline→online (pakai netinfo)

Stage 12 — Fitur QR Scan

expo-camera barcode scanning
Lookup tenant dari SQLite lokal berdasarkan UUID hasil scan

Stage 13 — UI/UX form sidak (perlu dibahas detail terpisah, seperti sudah kita catat sebelumnya)

Layar checklist dinamis (render sesuai checklist_snapshot dari server)
Validasi foto wajib saat jawaban negatif
Indikator status sync (pending/syncing/synced/failed) per sesi

Stage 14 — Riwayat & history tenant

Tampilkan 3 kunjungan terakhir per tenant (dari cache lokal)
Thumbnail foto histori + fetch full-size on-demand saat online

Stage 15 — Build & distribusi

EAS Build untuk APK internal
EAS Update untuk OTA update
Uji coba lapangan (field testing) dengan koneksi buram/simulasi offline