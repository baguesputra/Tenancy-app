# AGENTS.md — Konfigurasi Project & Memory

## Identitas Project

- Nama: tenant-app
- Tipe: Web app (Tenant Management)
- Tech stack: Laravel + Inertia + React

## Memory & Dokumentasi

Simpan seluruh catatan penting project ini ke vault Obsidian di path berikut,
JANGAN tanya ulang lokasi vault di tiap sesi baru:

```
D:\SecondBrain\projects\tenant-app\
```

Gunakan sub-folder: `Decisions/`, `Context/`, `Patterns/`, `Mistakes/`, `Sessions/`.

Di awal setiap sesi baru, baca dulu isi folder `Context/` dan `Decisions/` untuk
memahami histori sebelum mulai kerja. Setelah menyelesaikan task signifikan,
simpan ringkasannya ke folder yang sesuai tanpa perlu diminta eksplisit.

## Vault Sync (docs/ -> vault)

- `docs/` di repo = arsip read-only. Sumber kebenaran = vault.
- Tiap sesi, cek file baru/berubah di `docs/`, salin isinya ke vault:
  - Roadmap/spesifikasi -> `Context/`
  - Data master (xlsx/csv) -> `Context/master-data/`
  - Keputusan desain -> `Decisions/`
  - Pola berulang -> `Patterns/`
- Jangan tulis balik dari vault ke `docs/` kecuali diminta eksplisit.
- File sekali-pakai / data test user (contoh: sample JSON berisi email) langsung buang, jangan masuk vault.

## Development Log

- Setiap perbaikan/perubahan catat ke `Sessions/YYYY-MM-DD-HHmm.md` memakai jam WITA (UTC+8).
- Format tiap entri: jam, tanggal, apa yang dilakukan, folder/file yang diubah lengkap.
- Contoh nama file: `Sessions/2026-09-24-1120-fix-qr-scan.md`.

## Memory Linking (Obsidian wikilink)

- Format link: `[[folder/nama-tanpa-md]]` (tanpa `.md`).
- Setiap file vault baru wajib di header:
  - Satu link balik `[[Index]]`.
  - Minimal satu link ke file terkait (`Context/`, `Decisions/`, `Patterns/`, atau `Sessions/`).
- Setiap sesi selesai, update `Index.md`: tambah baris link file baru + ubah `Last updated`.
- Setiap session log wajib bagian `Terkait:` berisi wikilink ke file relevan.
- Jangan biarkan file yatim (tanpa link masuk/keluar).

## Coding Philosophy

- Baca kode yang ada sebelum menulis kode baru. Ikuti pola project yang sudah ada.
- Perubahan minimal: hanya yang diminta. Jangan refactor di luar scope.
- Perbaiki akar masalah, bukan gejalanya.

## Safety

- Konfirmasi dulu sebelum: `git push --force`, `rm -rf`, `DROP TABLE`, hapus branch.
- Jangan pernah commit: `.env`, file kredensial, API key, secrets.