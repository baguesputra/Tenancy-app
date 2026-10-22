# Panduan Integrasi SAML 2.0 Single Sign-On (SSO) OptiGate

Dokumen ini berisi panduan teknis lengkap untuk mengintegrasikan aplikasi klien (**Service Provider / SP**) dengan **OptiGate (PT Tata Optima Property)** yang bertindak sebagai **Identity Provider (IdP)** berbasis protokol **SAML 2.0**.

---

## Daftar Isi
1. [Ikhtisar Arsitektur](#1-ikhtisar-arsitektur)
2. [Informasi Endpoint & Kredensial IdP OptiGate](#2-informasi-endpoint--kredensial-idp-optigate)
3. [Format NameID & Atribut Pengguna (Claims)](#3-format-nameid--atribut-pengguna-claims)
4. [Langkah Registrasi Klien di OptiGate](#4-langkah-registrasi-klien-di-optigate)
5. [Tutorial Integrasi Berdasarkan Aplikasi Populer](#5-tutorial-integrasi-berdasarkan-aplikasi-populer)
   - [A. Nextcloud (`user_saml`)](#a-nextcloud-user_saml)
   - [B. Google Workspace](#b-google-workspace)
   - [C. Aplikasi Laravel (PHP)](#c-aplikasi-laravel-php)
   - [D. Aplikasi PHP Native (Tanpa Framework)](#d-aplikasi-php-native-tanpa-framework)
   - [E. Aplikasi Node.js / Express (`passport-saml`)](#e-aplikasi-nodejs--express-passport-saml)
   - [F. AWS IAM Identity Center](#f-aws-iam-identity-center)
6. [Alur Otentikasi & Single Logout (SLO)](#6-alur-otentikasi--single-logout-slo)
7. [Troubleshooting & Solusi Masalah Umum](#7-troubleshooting--solusi-masalah-umum)

---

## 1. Ikhtisar Arsitektur

OptiGate berfungsi sebagai **Identity Provider (IdP)** terpusat untuk seluruh ekosistem aplikasi di lingkungan **PT Tata Optima Property**. Ketika pengguna membuka aplikasi Anda (Service Provider / SP) atau membuka portal OptiGate:

```text
[ Pengguna ]
     │
     ├── (1) Akses Aplikasi SP (e.g. Nextcloud / ERP / Google)
     │        │
     │        ▼
     │   [ Aplikasi Klien (SP) ] ── (2) Redirect AuthnRequest ──► [ OptiGate IdP ]
     │                                                                   │
     │                                                            (3) Cek Auth &
     │                                                                Hak Akses
     │                                                                   │
     ◄─── (4) Auto-POST SAMLResponse (Signed Assertion) ◄────────────────┘
     │
     ▼
[ Aplikasi Klien (SP) ] ── (5) Verifikasi Signature & Buat Sesi Lokal ──► [ Selesai ]
```

### Dua Alur SSO yang Didukung:
1. **SP-Initiated SSO**: Pengguna membuka aplikasi SP, memilih *"Login dengan OptiGate SSO"*, diarahkan ke OptiGate, lalu dikembalikan ke SP dengan status sudah login.
2. **IdP-Initiated SSO (Dashboard Launcher)**: Pengguna login ke Dashboard OptiGate, mengklik ikon aplikasi yang diizinkan, dan langsung masuk ke aplikasi tujuan tanpa perlu memasukkan password lagi.

---

## 2. Informasi Endpoint & Kredensial IdP OptiGate

Berikut adalah parameter IdP OptiGate yang wajib dimasukkan pada konfigurasi aplikasi klien Anda:

| Parameter | Nilai Variabel | URL Produksi (OptiGate) | Keterangan |
| :--- | :--- | :--- | :--- |
| **IdP Entity ID / Issuer** | `https://gate.appdutamall.com/saml/metadata` | `https://gate.appdutamall.com/saml/metadata` | Identitas unik OptiGate IdP |
| **Single Sign-On (SSO) URL** | `https://gate.appdutamall.com/saml/sso` | `https://gate.appdutamall.com/saml/sso` | Endpoint HTTP-Redirect / HTTP-POST login |
| **Single Logout (SLO) URL** | `https://gate.appdutamall.com/saml/slo` | `https://gate.appdutamall.com/saml/slo` | Endpoint HTTP-Redirect / HTTP-POST logout |
| **IdP Metadata XML** | `https://gate.appdutamall.com/saml/metadata` | `https://gate.appdutamall.com/saml/metadata` | URL untuk auto-import konfigurasi IdP |
| **Sertifikat X.509 Publik** | `https://gate.appdutamall.com/saml/certificate` | `https://gate.appdutamall.com/saml/certificate` | File `.crt` untuk memverifikasi tanda tangan assertion |
| **Algoritma Tanda Tangan** | `RSA-SHA256` | `RSA-SHA256` | Standar keamanan XML-DSig |

> 💡 **Tips Cepat:** Di OptiGate web (**https://gate.appdutamall.com**), buka menu **Admin -> Clients**, lalu klik tombol **"SAML IdP Config"** di kanan atas untuk menyalin nilai-nilai di atas dengan satu klik atau mengunduh file sertifikat publik.

---

## 3. Format NameID & Atribut Pengguna (Claims)

OptiGate mengirimkan identitas utama dan metadata pengguna di dalam elemen `<saml:Assertion>`:

### Subject NameID
* **Format**: `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
* **Nilai**: Alamat email resmi pengguna (contoh: `ridho.fatahillah@tataoptima.com`).

### Attribute Statement
Aplikasi klien dapat membaca atribut-atribut tambahan berikut:

| Nama Atribut (SAML Attribute) | Format | Contoh Nilai (PT Tata Optima Property) | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` / `user_id` | `basic` | `019fdfb7-4959-7b3b-9a99-bcfd4e963fa1` | UUID identitas pengguna di Portal-DM |
| `email` | `basic` | `ridho.fatahillah@tataoptima.com` | Email resmi pengguna (juga sebagai Subject NameID) |
| `name` | `basic` | `Muhammad Ridha Fatahillah` | Nama lengkap pengguna |
| `nickname` | `basic` | `Ridho` | Nama panggilan pengguna |
| `callsign` | `basic` | `ECHO-01` | Callsign / Radio code pengguna |
| `employee_id` | `basic` | `6371012304950001` | Nomor Induk Karyawan (NIK) pengguna |
| `phone_number` | `basic` | `081234567890` | Nomor WhatsApp / Telepon pengguna |
| `photo_url` | `basic` | `https://s3.tataoptima.com/.../avatar.jpg` | URL foto profil pengguna di storage/S3 |
| `company` | `basic` | `PT Tata Optima Property` | Nama perusahaan tempat bertugas |
| `company_id` | `basic` | `019fdfb7-0ee3-70ae-9a6a-8d3fa11b98ac` | UUID perusahaan tempat bertugas |
| `department` | `basic` | `Information Technology` | Nama departemen |
| `department_id` | `basic` | `019fe004-aa6f-73b2-857e-6131c99f4f23` | UUID departemen |
| `division` | `basic` | `Software Engineering` | Nama divisi (opsional) |
| `division_id` | `basic` | `019fe004-bb12-71c1-8411-123456789abc` | UUID divisi (opsional) |
| `position` | `basic` | `IT Manager` | Nama jabatan |
| `position_id` | `basic` | `019fe005-a4b0-706d-90f3-9ecdbb3cfc99` | UUID jabatan |
| `role` | `basic` | `super-admin,employee` | Daftar peran / hak akses pengguna |

#### Contoh Potongan XML Assertion:
```xml
<saml:AttributeStatement>
    <saml:Attribute Name="id" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">019fdfb7-4959-7b3b-9a99-bcfd4e963fa1</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">ridho.fatahillah@tataoptima.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">Muhammad Ridha Fatahillah</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="nickname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">Ridho</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="callsign" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">ECHO-01</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="employee_id" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">6371012304950001</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="phone_number" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">081234567890</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="photo_url" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">https://s3.tataoptima.com/storage/avatars/user.jpg</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="company" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">PT Tata Optima Property</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="company_id" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">019fdfb7-0ee3-70ae-9a6a-8d3fa11b98ac</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="department" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">Information Technology</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="department_id" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">019fe004-aa6f-73b2-857e-6131c99f4f23</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="position" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">IT Manager</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="position_id" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">019fe005-a4b0-706d-90f3-9ecdbb3cfc99</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="role" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">super-admin,employee</saml:AttributeValue>
    </saml:Attribute>
</saml:AttributeStatement>
```

---

## 4. Langkah Registrasi Klien di OptiGate

Untuk mendaftarkan aplikasi Anda ke OptiGate:

1. Masuk ke OptiGate sebagai **Super Admin**.
2. Buka menu **Admin -> Clients**.
3. Klik tombol **Tambah Client**.
4. Pilih protokol: **SAML 2.0 (Service Provider)**.
5. Lengkapi formulir pendaftaran:
   - **Nama Aplikasi**: Nama yang mudah dikenali pengguna (contoh: *Nextcloud Corporate*).
   - **URL Beranda Aplikasi**: Tautan halaman depan aplikasi (contoh: `https://cloud.tataoptima.com`). Tautan ini akan muncul di Dashboard launcher pengguna.
   - **SP Entity ID / Issuer**: Pengenal unik aplikasi klien (contoh: `https://cloud.tataoptima.com` atau `google.com`).
   - **Assertion Consumer Service (ACS) URL**: URL endpoint callback pada aplikasi klien tempat data otentikasi diterima (contoh: `https://cloud.tataoptima.com/index.php/apps/user_saml/saml/acs`).
   - **Single Logout (SLO) URL (Opsional)**: URL endpoint logout aplikasi klien (contoh: `https://cloud.tataoptima.com/index.php/apps/user_saml/saml/sls`).
   - **Khusus Jaringan Kantor**: Centang jika aplikasi ini hanya boleh diakses melalui WiFi/IP kantor PT Tata Optima Property yang terdaftar di sistem.
6. Klik **Simpan Client**.
7. *(Opsional)* Tentukan siapa saja yang boleh mengakses aplikasi ini melalui menu Perusahaan, Departemen, Divisi, Jabatan, atau penugasan langsung per Pengguna.

---

## 5. Tutorial Integrasi Berdasarkan Aplikasi Populer

### A. Nextcloud (`user_saml`)

1. Pada Nextcloud, aktifkan aplikasi **SSO & SAML authentication** (`user_saml`) dari App Store Nextcloud.
2. Masuk ke **Administration Settings -> SSO & SAML authentication**.
3. Pilih opsi **Use built-in SAML authentication**.
4. Isi konfigurasi Identity Provider:
   - **Identifier of the IdP entity**: Masukkan `https://gate.appdutamall.com/saml/metadata`.
   - **URL Target of the IdP where the SP will send the Authentication Request**: Masukkan `https://gate.appdutamall.com/saml/sso`.
   - **URL Location of the IdP where the SP will send the SLO Request**: Masukkan `https://gate.appdutamall.com/saml/slo`.
   - **Public X.509 Certificate of the IdP**: Buka file `https://gate.appdutamall.com/saml/certificate`, salin seluruh isinya (termasuk `-----BEGIN CERTIFICATE-----` dan `-----END CERTIFICATE-----`), lalu tempel di kotak ini.
5. Pemetaan Atribut:
   - **Attribute to map the UID to**: `email` (atau biarkan kosong untuk menggunakan NameID).
   - **Email attribute**: `email`
   - **Display name attribute**: `name`
6. Di OptiGate: Daftarkan Nextcloud dengan ACS URL: `https://cloud.tataoptima.com/index.php/apps/user_saml/saml/acs` dan SLO URL: `https://cloud.tataoptima.com/index.php/apps/user_saml/saml/sls`.

---

### B. Google Workspace

1. Buka [Google Admin Console](https://admin.google.com).
2. Navigasi ke **Security -> Authentication -> SSO with third party IdP**.
3. Centang **Set up SSO with third-party identity provider**.
4. Masukkan konfigurasi OptiGate:
   - **Sign-in page URL**: `https://gate.appdutamall.com/saml/sso`
   - **Sign-out page URL**: `https://gate.appdutamall.com/saml/slo`
   - **Verification certificate**: Unggah file sertifikat `.crt` yang diunduh dari `https://gate.appdutamall.com/saml/certificate`.
5. Di OptiGate:
   - **SP Entity ID**: `google.com` (atau domain Google Workspace Anda, misal `tataoptima.com`)
   - **ACS URL**: `https://www.google.com/a/tataoptima.com/acs`
   - **App URL**: `https://mail.google.com/a/tataoptima.com`

---

### C. Aplikasi Laravel (PHP)

Jika Anda membangun aplikasi internal di lingkungan **PT Tata Optima Property** menggunakan Laravel:

#### Menggunakan `aacotroneo/laravel-saml2`:
1. Install package:
   ```bash
   composer require aacotroneo/laravel-saml2
   php artisan vendor:publish --provider="Aacotroneo\Saml2\Saml2ServiceProvider"
   ```
2. Konfigurasi `config/saml2/saml2_settings.php`:
   ```php
   'idp' => [
       'entityId' => env('OPTIGATE_SAML_ENTITY_ID', 'https://gate.appdutamall.com/saml/metadata'),
       'singleSignOnService' => [
           'url' => env('OPTIGATE_SAML_SSO_URL', 'https://gate.appdutamall.com/saml/sso'),
       ],
       'singleLogoutService' => [
           'url' => env('OPTIGATE_SAML_SLO_URL', 'https://gate.appdutamall.com/saml/slo'),
       ],
       'x509cert' => env('OPTIGATE_SAML_CERT', 'MIIBxTCCAW6gAwIBAgIU...'),
   ],
   'sp' => [
       'entityId' => env('APP_URL', 'https://app.tataoptima.com') . '/saml2/metadata',
       'assertionConsumerService' => [
           'url' => env('APP_URL', 'https://app.tataoptima.com') . '/saml2/acs',
       ],
       'singleLogoutService' => [
           'url' => env('APP_URL', 'https://app.tataoptima.com') . '/saml2/sls',
       ],
   ],
   ```
3. Buat Event Listener untuk login otomatis saat SAML Assertion diterima:
   ```php
   // app/Listeners/SamlLoginListener.php
   namespace App\Listeners;

   use Aacotroneo\Saml2\Events\Saml2LoginEvent;
   use App\Models\User;
   use Illuminate\Support\Facades\Auth;

   class SamlLoginListener
   {
       public function handle(Saml2LoginEvent $event)
       {
           $samlUser = $event->getSaml2User();
           $email = $samlUser->getUserId(); // NameID: ridho.fatahillah@tataoptima.com
           $attributes = $samlUser->getAttributes();

           // Contoh data yang dikembalikan OptiGate:
           // $attributes['name'][0] => "Muhammad Ridha Fatahillah"
           // $attributes['company'][0] => "PT Tata Optima Property"
           // $attributes['position'][0] => "IT Manager"
           // $attributes['department'][0] => "Information Technology"

           $user = User::firstOrCreate(
               ['email' => $email],
               [
                   'name' => $attributes['name'][0] ?? 'Muhammad Ridha Fatahillah',
                   'password' => bcrypt(\Illuminate\Support\Str::random(32)),
               ]
           );

           Auth::login($user);
       }
   }
   ```

---

### D. Aplikasi PHP Native (Tanpa Framework)

Untuk aplikasi PHP murni (legacy/custom PHP tanpa framework), Anda dapat mengintegrasikan SAML 2.0 menggunakan toolkit standar **`onelogin/php-saml`** atau skrip callback langsung.

#### Opsi 1: Menggunakan Toolkit `onelogin/php-saml` (Direkomendasikan)

1. **Install library via Composer**:
   ```bash
   composer require onelogin/php-saml
   ```

2. **File Konfigurasi (`saml_settings.php`)**:
   ```php
   <?php
   // saml_settings.php
   return [
       'strict' => true,
       'debug' => true,
       'sp' => [
           'entityId' => 'https://app-native.tataoptima.com',
           'assertionConsumerService' => [
               'url' => 'https://app-native.tataoptima.com/acs.php',
               'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
           ],
           'singleLogoutService' => [
               'url' => 'https://app-native.tataoptima.com/sls.php',
               'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
           ],
           'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
       ],
       'idp' => [
           'entityId' => 'https://gate.appdutamall.com/saml/metadata',
           'singleSignOnService' => [
               'url' => 'https://gate.appdutamall.com/saml/sso',
               'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
           ],
           'singleLogoutService' => [
               'url' => 'https://gate.appdutamall.com/saml/slo',
               'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
           ],
           // Salin dari https://gate.appdutamall.com/saml/certificate atau file optigate-idp.crt
           'x509cert' => 'MIIDXTCCAkWgAwIBAgIU...',
       ],
   ];
   ```

3. **Inisiasi Login (`login.php`)**:
   ```php
   <?php
   // login.php - Redirect ke OptiGate SSO
   require_once __DIR__ . '/vendor/autoload.php';
   $settings = require __DIR__ . '/saml_settings.php';

   $auth = new OneLogin\Saml2\Auth($settings);
   $auth->login();
   ```

4. **Endpoint Menerima Assertion (`acs.php`)**:
   ```php
   <?php
   // acs.php - Assertion Consumer Service (Callback)
   session_start();
   require_once __DIR__ . '/vendor/autoload.php';
   $settings = require __DIR__ . '/saml_settings.php';

   $auth = new OneLogin\Saml2\Auth($settings);
   $auth->processResponse();

   $errors = $auth->getErrors();
   if (!empty($errors)) {
       die('Otentikasi SAML Gagal: ' . implode(', ', $errors));
   }

   if (!$auth->isAuthenticated()) {
       die('Pengguna tidak terautentikasi.');
   }

   // Ekstrak identitas pengguna dari OptiGate
   $email      = $auth->getNameId(); // ridho.fatahillah@tataoptima.com
   $attributes = $auth->getAttributes();
   $name       = $attributes['name'][0] ?? '';       // Muhammad Ridha Fatahillah
   $company    = $attributes['company'][0] ?? '';    // PT Tata Optima Property
   $department = $attributes['department'][0] ?? ''; // Information Technology
   $position   = $attributes['position'][0] ?? '';   // IT Manager
   $role       = $attributes['role'][0] ?? '';       // super-admin,employee

   // Simpan ke sesi lokal
   $_SESSION['user'] = [
       'email'      => $email,
       'name'       => $name,
       'company'    => $company,
       'department' => $department,
       'position'   => $position,
       'role'       => $role,
       'logged_in'  => true,
   ];

   $relayState = $_POST['RelayState'] ?? '/dashboard.php';
   header('Location: ' . $relayState);
   exit;
   ```

5. **Single Logout (`logout.php` & `sls.php`)**:
   ```php
   <?php
   // logout.php - Inisiasi Logout ke OptiGate
   session_start();
   require_once __DIR__ . '/vendor/autoload.php';
   $settings = require __DIR__ . '/saml_settings.php';

   $auth = new OneLogin\Saml2\Auth($settings);
   $auth->logout(); // Redirect ke https://gate.appdutamall.com/saml/slo
   ```
   ```php
   <?php
   // sls.php - Single Logout Callback
   session_start();
   session_destroy();
   header('Location: /login.php');
   exit;
   ```

#### Opsi 2: Skrip Pure PHP Native (Tanpa Composer)

Untuk server legacy tanpa Composer, Anda dapat memproses SAMLResponse menggunakan fungsi XML bawaan PHP:

```php
<?php
// acs-pure.php (Pure PHP Native tanpa external vendor)
session_start();

if (empty($_POST['SAMLResponse'])) {
    die('Akses tidak valid: SAMLResponse tidak ditemukan.');
}

// 1. Decode payload SAMLResponse (Base64)
$xmlString = base64_decode($_POST['SAMLResponse']);

// 2. Load DOM XML
$doc = new DOMDocument();
$doc->loadXML($xmlString);

// 3. Gunakan XPath untuk mengekstrak Subject dan Atribut
$xpath = new DOMXPath($doc);
$xpath->registerNamespace('samlp', 'urn:oasis:names:tc:SAML:2.0:protocol');
$xpath->registerNamespace('saml', 'urn:oasis:names:tc:SAML:2.0:assertion');

// Ambil NameID (Email)
$nameIdNode = $xpath->query('//saml:Subject/saml:NameID')->item(0);
$email = $nameIdNode ? $nameIdNode->nodeValue : null;

// Ambil data atribut pengguna (OptiGate)
$attributes = [];
$attributeNodes = $xpath->query('//saml:AttributeStatement/saml:Attribute');
foreach ($attributeNodes as $attrNode) {
    $attrName = $attrNode->getAttribute('Name');
    $valNode = $attrNode->getElementsByTagName('AttributeValue')->item(0);
    $attributes[$attrName] = $valNode ? $valNode->nodeValue : '';
}

// Contoh data yang diekstrak:
// $email                  => "ridho.fatahillah@tataoptima.com"
// $attributes['name']     => "Muhammad Ridha Fatahillah"
// $attributes['company']  => "PT Tata Optima Property"
// $attributes['position'] => "IT Manager"

$_SESSION['user'] = [
    'email'   => $email,
    'name'    => $attributes['name'] ?? '',
    'company' => $attributes['company'] ?? '',
    'logged_in' => true,
];

header('Location: /dashboard.php');
exit;
```

---

### E. Aplikasi Node.js / Express (`passport-saml`)

```javascript
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const fs = require('fs');

passport.use(new SamlStrategy(
  {
    path: '/login/callback',
    entryPoint: 'https://gate.appdutamall.com/saml/sso',
    issuer: 'https://erp.tataoptima.com',
    cert: fs.readFileSync('./optigate-idp.crt', 'utf-8'),
    logoutUrl: 'https://gate.appdutamall.com/saml/slo',
    logoutCallbackUrl: 'https://erp.tataoptima.com/logout/callback',
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  },
  function(profile, done) {
    // Data yang dikembalikan OptiGate:
    // profile.nameID = 'ridho.fatahillah@tataoptima.com'
    // profile.name = 'Muhammad Ridha Fatahillah'
    // profile.company = 'PT Tata Optima Property'
    // profile.position = 'IT Manager'
    // profile.department = 'Information Technology'
    return done(null, {
      id: profile.nameID,
      email: profile.email || profile.nameID,
      name: profile.name,
      company: profile.company,
      position: profile.position
    });
  }
));

// Route Login (Redirect ke OptiGate)
app.get('/login', passport.authenticate('saml'));

// Route Callback (ACS Endpoint)
app.post('/login/callback',
  passport.authenticate('saml', { failureRedirect: '/login-failed' }),
  (req, res) => res.redirect('/dashboard')
);
```

---

### F. AWS IAM Identity Center

1. Buka AWS Console -> **IAM Identity Center** -> **Settings** -> **Authentication transfer**.
2. Pilih **External identity provider** -> **SAML 2.0**.
3. Unduh metadata SAML IdP OptiGate dari `https://gate.appdutamall.com/saml/metadata` dan unggah ke AWS.
4. Salin **IAM Identity Center Assertion Consumer Service (ACS) URL** dan **IAM Identity Center issuer URL**.
5. Masukkan ACS URL dan Issuer URL tersebut saat mendaftarkan client baru di OptiGate.
6. Konfigurasi pemetaan atribut di AWS:
   - `Subject` / `Username`: `${email}`
   - `Email`: `${email}`
   - `GivenName`: `${name}`

---

## 6. Alur Otentikasi & Single Logout (SLO)

### Alur Single Sign-On (SSO):
1. **SP-Initiated SSO**:
   - Pengguna membuka SP -> SP membuat XML `<samlp:AuthnRequest>`, dikompres (deflate-raw), di-base64, dan dikirim via query string `?SAMLRequest=...` ke `https://gate.appdutamall.com/saml/sso`.
   - OptiGate memverifikasi sesi pengguna. Jika belum login, pengguna diminta login di OptiGate.
   - OptiGate memeriksa hak akses pengguna terhadap aplikasi tersebut.
   - OptiGate membuat XML `<samlp:Response>` bertanda tangan digital (RSA-SHA256) dan mengirimkannya melalui auto-submitting POST form ke ACS URL aplikasi klien.
2. **IdP-Initiated SSO**:
   - Pengguna mengklik aplikasi pada Dashboard OptiGate.
   - OptiGate langsung membuat SAML Response bertanda tangan digital dan mengirimkannya ke ACS URL klien.

### Alur Single Logout (SLO):
1. Pengguna mengklik **Logout** di aplikasi klien (SP).
2. SP mengirimkan XML `<samlp:LogoutRequest>` ke `https://gate.appdutamall.com/saml/slo`.
3. OptiGate memvalidasi request, menghancurkan sesi login lokal di OptiGate, lalu mengirimkan `<samlp:LogoutResponse>` kembali ke SLO URL aplikasi klien.
4. Sesi pengguna di OptiGate maupun di aplikasi klien berakhir serentak.

---

## 7. Troubleshooting & Solusi Masalah Umum

### 1. Pesan Error: *"SAML Service Provider '...' is not registered in OptiGate"*
* **Penyebab**: `Issuer` (SP Entity ID) yang dikirim oleh aplikasi klien tidak sama persis dengan **SP Entity ID** yang didaftarkan di form client OptiGate.
* **Solusi**: Periksa kesamaan huruf besar/kecil dan ada/tidaknya trailing slash (`/`). Contoh: `https://app.com` berbeda dengan `https://app.com/`.

### 2. Pesan Error: *"Signature verification failed"*
* **Penyebab**: Aplikasi klien belum memperbarui sertifikat publik X.509 milik OptiGate IdP, atau menggunakan algoritma SHA-1 lama.
* **Solusi**:
  1. Unduh sertifikat terbaru dari `https://gate.appdutamall.com/saml/certificate`.
  2. Pastikan aplikasi klien Anda dikonfigurasi menggunakan algoritma tanda tangan `SHA-256` (bukan SHA-1).

### 3. Pesan Error: *"403 Forbidden - You do not have permission to access this application"*
* **Penyebab**: Akun pengguna yang login di OptiGate tidak memiliki izin akses untuk aplikasi tersebut.
* **Solusi**: Di OptiGate, delegasikan aplikasi tersebut ke Perusahaan, Departemen, Divisi, atau Jabatan tempat pengguna bernaung, atau delegasikan langsung ke user tersebut.

### 4. Pesan Error: *"Assertion expired / Clock skew"*
* **Penyebab**: Perbedaan waktu jam server antara server OptiGate dan server aplikasi klien lebih dari batas toleransi (default: 300 detik).
* **Solusi**: Pastikan layanan NTP (Network Time Protocol) berjalan di server (`timedatectl` atau `chrony`) sehingga waktu kedua server tersinkronisasi presisi.

---

## Dukungan & Bantuan
Jika Anda mengalami kendala teknis dalam integrasi aplikasi, hubungi tim IT Administrator **PT Tata Optima Property** atau ajukan tiket melalui sistem dukungan internal OptiGate.
