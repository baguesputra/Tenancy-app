<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 14mm 13mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; margin: 0; }
        .frame { border: 2px solid #111827; padding: 0; height: 267mm; }
        .inner { padding: 30px 36px 22px; }
        .kop { margin-bottom: 4px; }
        .kop img { width: 185px; }
        .title { text-align: center; margin: 20px 0 4px; font-size: 30px; font-weight: bold; letter-spacing: 1px; }
        .title u { text-decoration-thickness: 2.5px; text-underline-offset: 5px; }
        .subtitle { text-align: center; font-size: 12px; color: #374151; margin-bottom: 12px; }
        .nobox { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin-bottom: 16px; }
        table.unit { width: 86%; margin: 0 auto 22px; border-collapse: collapse; }
        table.unit th { font-size: 14px; letter-spacing: 1px; border: 1px solid #111827; padding: 7px 8px; background: #f3f4f6; }
        table.unit td { font-size: 24px; font-weight: bold; text-align: center; border: 1px solid #111827; padding: 9px 8px; }
        table.rows { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.rows td { padding: 10px 2px; vertical-align: top; font-size: 17px; font-weight: bold; }
        table.rows td.k { width: 270px; white-space: nowrap; }
        table.rows td.sep { width: 16px; }
        .sign { margin-top: 60px; }
        .sign table { width: 100%; border-collapse: collapse; }
        .sign td { vertical-align: top; font-size: 14px; }
        .sign .right { text-align: center; width: 280px; }
        .sign .name { font-weight: bold; text-decoration: underline; text-underline-offset: 3px; }
        .qrbox { width: 170px; text-align: center; }
        .qrbox img { width: 130px; height: 130px; border: 1px solid #9ca3af; }
        .qrbox .cap { font-size: 9px; color: #4b5563; margin-top: 3px; }
        .foot { margin-top: 50px; border-top: 1px solid #d1d5db; padding-top: 6px; font-size: 9px; color: #6b7280; text-align: right; }
    </style>
</head>
<body>
    <div class="frame">
        <div class="inner">
            <div class="kop">
                @if ($logoData)
                    <img src="{{ $logoData }}" alt="Duta Mall">
                @else
                    <div style="font-size: 20px; font-weight: bold;">Duta Mall</div>
                @endif
            </div>

            <div class="title"><u>{{ $title }}</u></div>
            <div class="subtitle">(DITEMPELKAN DILUAR UNIT TENANT)</div>
            <div class="nobox">NO. : {{ $permit->permit_number }}</div>

            <table class="unit">
                <tr><th>LANTAI</th><th>BLOK</th><th>NOMOR</th></tr>
                <tr>
                    <td>{{ strtoupper($permit->floor_snapshot ?? '—') }}</td>
                    <td>{{ strtoupper($permit->block_snapshot ?? '—') }}</td>
                    <td>{{ strtoupper($permit->unit_number_snapshot ?? '—') }}</td>
                </tr>
            </table>

            <table class="rows">
                <tr><td class="k">NAMA TENANT</td><td class="sep">:</td><td>{{ strtoupper($permit->tenant->name ?? $permit->store_name_snapshot) }}</td></tr>
                <tr><td class="k">PENANGGUNG JAWAB</td><td class="sep">:</td><td>{{ strtoupper($permit->pic_name ?? '—') }}</td></tr>
                <tr><td class="k">{{ strtoupper($nameLabel) }}</td><td class="sep">:</td><td>{{ strtoupper($permit->event_name ?? '—') }}</td></tr>
                <tr><td class="k">TANGGAL {{ $kindWord }}</td><td class="sep">:</td><td>{{ $tanggalStr }}</td></tr>
                <tr><td class="k">JAM {{ $kindWord }}</td><td class="sep">:</td><td>{{ $jamStr }}</td></tr>
                <tr><td class="k">AREA {{ $kindWord }}</td><td class="sep">:</td><td>{{ strtoupper($permit->event_area ?? '—') }}</td></tr>
            </table>

            <div class="sign">
                <table>
                    <tr>
                        <td class="qrbox">
                            @if ($scanUrl)
                                <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(200)->generate($scanUrl)) }}" alt="QR verifikasi">
                                <div class="cap">Pindai untuk verifikasi</div>
                            @endif
                        </td>
                        <td></td>
                        <td class="right">
                            {{ $kota }}, {{ $requestDate }}<br>
                            DIKELUARKAN OLEH,<br><br><br><br>
                            <span class="name">{{ $signerName }}</span><br>
                            {{ $signerRole }}
                        </td>
                    </tr>
                </table>
            </div>

            <div class="foot">Dicetak dari sistem pada {{ $printedAt }} • {{ $permit->permit_number }}</div>
        </div>
    </div>
</body>
</html>
