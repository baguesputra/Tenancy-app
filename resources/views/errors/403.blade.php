<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>403 — Akses Ditolak</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .box { text-align: center; max-width: 26rem; }
        .code { font-size: 3.5rem; font-weight: 700; color: #0f1e36; letter-spacing: -0.02em; }
        h1 { font-size: 1.1rem; font-weight: 600; margin-top: 0.5rem; }
        p { font-size: 0.875rem; color: #64748b; margin-top: 0.5rem; line-height: 1.6; }
        a { display: inline-block; margin-top: 1.5rem; background: #0f1e36; color: #fff; font-size: 0.8125rem; font-weight: 500; padding: 0.6rem 1.25rem; border-radius: 0.5rem; text-decoration: none; }
        a:hover { background: #16294a; }
    </style>
</head>
<body>
    <div class="box">
        <div class="code">403</div>
        <h1>Akses Ditolak</h1>
        <p>Anda tidak punya izin untuk membuka halaman ini. Jika Anda merasa ini keliru, hubungi administrator.</p>
        <a href="{{ url('/') }}">Kembali ke Beranda</a>
    </div>
</body>
</html>
