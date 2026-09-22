<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; margin: 0; padding: 10px 12px 14px; color: #0F1E36; }
        .kop { text-align: center; border-bottom: 2px solid #0F1E36; padding-bottom: 8px; margin-bottom: 8px; }
        .kop img.logo { height: 44px; }
        .kop .brand { font-size: 13px; font-weight: bold; letter-spacing: 3px; margin-top: 4px; }
        .kop .sub { font-size: 9px; color: #64748b; letter-spacing: 1px; }
        .title { text-align: center; font-size: 13px; font-weight: bold; margin: 6px 0 2px; }
        .number { text-align: center; font-size: 17px; font-weight: bold; font-family: monospace; }
        .store { text-align: center; font-size: 11px; color: #475569; margin: 2px 0 6px; }
        .meta { font-size: 9.5px; color: #334155; margin-bottom: 6px; }
        .meta table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 1.5px 0; vertical-align: top; }
        .meta td.k { width: 74px; color: #64748b; }
        .qr { text-align: center; margin: 6px 0; }
        .qr img { width: 150px; height: 150px; border: 2px solid #E2E5EA; }
        .expired { text-align: center; font-size: 10px; font-weight: bold; background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 5px 6px; margin-bottom: 8px; }
        .rules { font-size: 8.5px; line-height: 1.5; color: #1e293b; border-top: 1px solid #E2E5EA; padding-top: 6px; }
        .rules .h { font-size: 9.5px; font-weight: bold; margin-bottom: 3px; }
        .rules ol { margin: 0; padding-left: 14px; }
        .rules li { margin-bottom: 2px; }
    </style>
</head>
<body>
    <div class="kop">
        @if (! empty($logoData))
            <img class="logo" src="{{ $logoData }}" alt="Logo tenant">
        @endif
        <div class="brand">DUTA MALL</div>
        <div class="sub">KARTU LOADING BARANG TENANT</div>
    </div>

    <div class="title">{{ $isGoods ? 'KARTU LOADING — MASUK BARANG' : 'SURAT IZIN' }}</div>
    <div class="number">{{ $permit->permit_number }}</div>
    <div class="store">{{ $permit->store_name_snapshot }}</div>

    <div class="meta">
        <table>
            <tr><td class="k">Jadwal</td><td>: {{ $schedule }}</td></tr>
            <tr><td class="k">Jam</td><td>: {{ $time }}</td></tr>
            @if ($permit->contractor_company)
                <tr><td class="k">Vendor</td><td>: {{ $permit->contractor_company }}</td></tr>
            @endif
            <tr><td class="k">PIC</td><td>: {{ $permit->pic_name ?? '—' }} ({{ $permit->pic_phone ?? '—' }})</td></tr>
        </table>
    </div>

    <div class="qr">
        @if ($permit->scanUrl)
            <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(220)->generate($permit->scanUrl)) }}" alt="QR {{ $permit->permit_number }}">
        @endif
    </div>

    <div class="expired">BERLAKU s/d: {{ $expiresLabel }}</div>

    @if ($isGoods)
        <div class="rules">
            <div class="h">PERATURAN KARTU LOADING</div>
            <ol>
                <li>Kartu loading hanya berlaku untuk izin MASUK BARANG.</li>
                <li>Waktu masuk barang: 07.30 – 10.00 WITA, 15.00 – 17.00 WITA, 22.00 – 23.00 WITA.</li>
                <li>Masuk barang hanya melalui Lift loading Mall A (Utara/Pos Pagar) dan Lift loading Mall B (Selatan/Pos loading DM2).</li>
                <li>KELUAR BARANG WAJIB mengurus surat izin ke kantor manajemen.</li>
            </ol>
        </div>
    @endif
</body>
</html>
