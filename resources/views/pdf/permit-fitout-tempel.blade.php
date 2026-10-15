<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 10mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; margin: 0; }
        .kop img { width: 100%; }
        .guide img { width: 100%; }
        .title { text-align: center; margin: 14px 0 2px; font-size: 22px; font-weight: bold; letter-spacing: 1px; }
        .title u { text-decoration-thickness: 2px; text-underline-offset: 4px; }
        .subtitle { text-align: center; font-size: 12px; color: #374151; margin-bottom: 12px; }
        table.unit { width: 86%; margin: 0 auto 16px; border-collapse: collapse; }
        table.unit th { font-size: 13px; letter-spacing: 1px; border: 1px solid #111827; padding: 6px 8px; background: #f3f4f6; }
        table.unit td { font-size: 22px; font-weight: bold; text-align: center; border: 1px solid #111827; padding: 8px; }
        table.rows { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.rows td { padding: 8px 2px; vertical-align: top; font-size: 15px; font-weight: bold; }
        table.rows td.k { width: 250px; white-space: nowrap; }
        table.rows td.sep { width: 16px; }
        .barang-note { text-align: center; font-size: 11px; color: #374151; margin: 2px 0 6px; }
        .sign { margin-top: 40px; }
        .sign table { width: 100%; border-collapse: collapse; }
        .sign td { vertical-align: top; font-size: 14px; }
        .sign .right { text-align: center; width: 280px; }
        .sign .name { font-weight: bold; text-decoration: underline; text-underline-offset: 3px; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="Fit Out Guide">@endif
    </div>

    <div class="title"><u>IJIN KERJA FITTING OUT / RENOVASI</u></div>
    <div class="subtitle">( UNTUK DILEKATKAN DI DEPAN UNIT )</div>

    <table class="unit">
        <tr><th>LANTAI</th><th>BLOK</th><th>NOMOR</th></tr>
        <tr>
            <td>{{ $lantai }}</td>
            <td>{{ $blok }}</td>
            <td>{{ $nomor }}</td>
        </tr>
    </table>

    <table class="rows">
        <tr><td class="k">NAMA TENANT</td><td class="sep">:</td><td>{{ $namaTenant }}</td></tr>
        <tr><td class="k">PENANGGUNG JAWAB</td><td class="sep">:</td><td>{{ $penanggungJawab }}</td></tr>
        <tr><td class="k">PEKERJAAN</td><td class="sep">:</td><td>{{ $pekerjaan }}</td></tr>
        <tr><td class="k">TANGGAL KERJA</td><td class="sep">:</td><td>{{ $tanggalKerja }}</td></tr>
        <tr><td class="k">JAM KERJA</td><td class="sep">:</td><td>{{ $jamKerja }}</td></tr>
        <tr><td class="k">JUMLAH PEKERJA</td><td class="sep">:</td><td>{{ $jumlahPekerja }}</td></tr>
    </table>
    <div class="barang-note">(Keluar masuk barang/material pukul 22.00-09.30 WITA)</div>

    <div class="sign">
        <table>
            <tr>
                <td></td>
                <td class="right">
                    {{ $kota }}, {{ $tanggalSurat }}<br>
                    Dikeluarkan Oleh,<br><br><br><br>
                    <span class="name">M. Nazaruddin Alamsyah</span><br>
                    Spv. Tenancy &amp; FO Department
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
