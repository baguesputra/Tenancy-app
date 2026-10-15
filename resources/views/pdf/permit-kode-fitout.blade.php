<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 10mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 12px; line-height: 1.7; margin: 0; }
        .kop img { width: 100%; }
        .guide img { width: 100%; }
        .title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin: 14px 0 10px; }
        table.bio { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.bio td { padding: 3px 4px; vertical-align: top; font-weight: bold; }
        table.bio td.k { width: 200px; white-space: nowrap; }
        table.bio td.sep { width: 16px; }
        ol.workers { margin: 2px 0 2px 26px; padding: 0; font-weight: bold; }
        ol.workers li { margin-bottom: 2px; min-height: 1.4em; }
        .issuer { text-align: right; margin-top: 18px; font-weight: bold; }
        .issuer .space { height: 52px; }
        .issuer .name { text-decoration: underline; text-underline-offset: 3px; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="Fit Out Guide">@endif
    </div>

    <div class="title">FIT OUT</div>

    <table class="bio">
        <tr><td class="k">NAMA TENANT</td><td class="sep">:</td><td>{{ $namaTenant }}</td></tr>
        <tr><td class="k">LANTAI / BLOK</td><td class="sep">:</td><td>{{ $unit }}</td></tr>
        <tr><td class="k">PENANGGUNG JAWAB KONTRAKTOR</td><td class="sep">:</td><td>{{ $penanggungJawab }}</td></tr>
    </table>
    <table class="bio">
        <tr><td class="k">NAMA PEKERJA</td><td class="sep">:</td><td>
            <ol class="workers">
                <li>&nbsp;</li>
                <li>&nbsp;</li>
                <li>&nbsp;</li>
                <li>&nbsp;</li>
                <li>&nbsp;</li>
            </ol>
        </td></tr>
    </table>
    <table class="bio">
        <tr><td class="k">JUMLAH PEKERJA</td><td class="sep">:</td><td>{{ $jumlahPekerja }}</td></tr>
        <tr><td class="k">NO. TELEPON</td><td class="sep">:</td><td>{{ $telepon }}</td></tr>
        <tr><td class="k">TANGGAL FIT OUT</td><td class="sep">:</td><td>{{ $tanggalFitout }}</td></tr>
    </table>

    <div class="issuer">
        <div>DIKELUARKAN OLEH :</div>
        <div>BADAN PENGELOLA</div>
        <div>DUTA MALL</div>
        <div class="space">&nbsp;</div>
        <div class="name">M. Nazaruddin Alamsyah</div>
        <div>Spv. Tenancy &amp; FO Department</div>
    </div>
</body>
</html>
