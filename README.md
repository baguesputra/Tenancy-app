# Tenant

Sistem manajemen tenant mall — administrasi tenant (kontrak, dokumen, kategori),
inspeksi/sidak, dan modul terkait lainnya. Backend web pakai Laravel 13 + 
Inertia.js + React + Tailwind CSS + MySQL. Companion mobile app 
(React Native/Expo) menyusul di fase terpisah.

## Deployment production (shared hosting)

Salin `.env.production.example` ke `.env`, isi nilainya, lalu jalankan:

```bash
php artisan config:cache route:cache view:cache
php artisan migrate --force
```

### Cron (wajib — 2 entri di panel hosting)

```cron
* * * * * php /path/ke/artisan schedule:run
* * * * * php /path/ke/artisan queue:work --stop-when-empty
```

Dengan cron aktif, set `GATE_PACU_ENABLED=false` agar scheduler **tidak**
dijalankan dari dalam request HTTP (menahan response user).

### Break-glass login lokal

Production berjalan `AUTH_MODE=sso` + `ALLOW_LOCAL_LOGIN=false`, jadi tidak ada
jalur login lokal yang aktif. Jika SSO Gate down dan butuh masuk:

1. Set `ALLOW_LOCAL_LOGIN=true` di `.env`, hapus cache config
   (`php artisan config:cache`).
2. Login via `/login` dengan NIK + password akun lokal.
3. **Kembalikan** `ALLOW_LOCAL_LOGIN=false` + `config:cache` setelah selesai.

Catatan: akun hasil sinkronisasi Gate tidak punya password (SSO-only);
jalur ini hanya untuk akun yang password-nya pernah diisi manual.

### Checklist sebelum go-live

- [ ] `APP_DEBUG=false`, `APP_ENV=production`, `LOG_LEVEL=error`, `LOG_STACK=daily`
- [ ] `SESSION_SECURE_COOKIE=true`, `APP_URL` = domain HTTPS final
- [ ] `AUTH_MODE=sso`, `ALLOW_LOCAL_LOGIN=false`, `GATE_PACU_ENABLED=false`
- [ ] 2 cron di atas aktif
- [ ] `GATE_TOKEN` terisi & `GATE_TIMEOUT` ≤ 8
- [ ] `SAML_SP_CERT` / `SAML_SP_PRIVATE_KEY` diisi jika diminta Gate
- [ ] `php artisan config:cache route:cache view:cache` dijalankan