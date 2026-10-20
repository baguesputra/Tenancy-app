<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 10mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 11px; line-height: 1.6; margin: 0; }
        .kop img { width: 100%; }
        .guide img { width: 100%; }
        .title { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 1px; margin: 10px 0 8px; text-decoration: underline; }
        .narr { text-align: justify; margin: 6px 0; }
        table.bio { width: 100%; border-collapse: collapse; margin: 4px 0; }
        table.bio td { padding: 2px 4px; vertical-align: top; }
        table.bio td.k { width: 90px; }
        ol.goods { margin: 4px 0 4px 18px; padding: 0; text-align: justify; }
        ol.goods li { margin-bottom: 2px; min-height: 1.4em; }
        .note { text-align: justify; margin: 6px 0; font-size: 10.5px; }
        .date { text-align: left; margin: 8px 0 4px; }
        table.sig { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.sig td { width: 33.33%; text-align: center; vertical-align: top; padding: 4px 8px; font-size: 10.5px; }
        .sig .space { height: 44px; }
        .sig .line { border-top: 1px solid #111827; margin: 0 12px; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="Fit Out Guide">@endif
    </div>

    <div class="title">SURAT PERNYATAAN PENITIPAN BARANG</div>

    <p class="narr">Saya yang bertandatangan dibawah ini :</p>
    <table class="bio">
        <tr><td class="k">Nama</td><td>: {{ $nama }}</td></tr>
        <tr><td class="k">Tenant</td><td>: {{ $namaTenant }}</td></tr>
        <tr><td class="k">Lokasi</td><td>: {{ $unit }}</td></tr>
        <tr><td class="k">Telepon</td><td>: {{ $telepon }}</td></tr>
    </table>

    <p class="narr">Dengan ini meminta ijin kepada pihak Building Management bahwa akan melakukan loading dan penitipan sementara barang ke unit Tenant pada jam operasional di area loading dock DM 1.</p>
    <p class="narr">Adapun barang dan material yang akan diloading diantaranya:</p>
    <ol class="goods">
        <li>Material {{ $jenisLabel ?? 'Fit Out' }}</li>
        <li>Furniture / Meuble</li>
    </ol>

    <p class="narr">Demikian surat ini saya buat dengan sebenar-benarnya dan dapat dipertanggungjawabkan.</p>
    <p class="narr">Segala bentuk kehilangan dan kerusakan bukan menjadi tanggung jawab pihak Mall.</p>
    <p class="note">Note : Loading barang dan penitipan selama {{ strtolower($jenisLabel ?? 'Fit Out') }} berlangsung selama proses ({{ $periode }})</p>
    <p class="narr">Akses Loading Dock DM 1 (penitipan tidak boleh melebihi 24 jam, dari hari Senin – Jumat)</p>

    <p class="date">{{ $kota }}, {{ $tanggalSurat }}</p>

    <table class="sig">
        <tr>
            <td>
                <div>Pemberi pernyataan</div>
                <div class="space">&nbsp;</div>
                <div class="line">&nbsp;</div>
                <div>Tenant/Kontraktor</div>
            </td>
            <td>
                <div>Mengetahui,</div>
                <div>Tenancy &amp; FO Dept.</div>
                <div class="space">&nbsp;</div>
                <div class="line">&nbsp;</div>
                <div>&nbsp;</div>
            </td>
            <td>
                <div>&nbsp;</div>
                <div>Building Service</div>
                <div class="space">&nbsp;</div>
                <div class="line">&nbsp;</div>
                <div>&nbsp;</div>
            </td>
        </tr>
    </table>
</body>
</html>
