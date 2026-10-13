<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 14mm 13mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; margin: 0; }
        .frame { border: 1.5px solid #111827; padding: 0; }
        .inner { padding: 22px 30px 18px; }
        .kop { margin-bottom: 4px; }
        .kop img { width: 150px; }
        .title { text-align: center; margin: 14px 0 2px; font-size: 21px; font-weight: bold; letter-spacing: 1px; }
        .title u { text-decoration-thickness: 2px; text-underline-offset: 4px; }
        .subtitle { text-align: center; font-size: 10px; color: #374151; margin-bottom: 10px; }
        .nobox { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; }
        table.unit { width: 78%; margin: 0 auto 18px; border-collapse: collapse; }
        table.unit th { font-size: 12px; letter-spacing: 1px; border: 1px solid #111827; padding: 5px 8px; background: #f3f4f6; }
        table.unit td { font-size: 19px; font-weight: bold; text-align: center; border: 1px solid #111827; padding: 6px 8px; }
        table.rows { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.rows td { padding: 7px 2px; vertical-align: top; font-size: 14px; font-weight: bold; }
        table.rows td.k { width: 235px; white-space: nowrap; }
        table.rows td.sep { width: 14px; }
        .sign { margin-top: 26px; }
        .sign table { width: 100%; border-collapse: collapse; }
        .sign td { vertical-align: top; font-size: 12px; }
        .sign .right { text-align: center; width: 250px; }
        .sign .name { font-weight: bold; text-decoration: underline; text-underline-offset: 3px; }
        .qrbox { width: 150px; text-align: center; }
        .qrbox img { width: 92px; height: 92px; border: 1px solid #9ca3af; }
        .qrbox .cap { font-size: 8px; color: #4b5563; margin-top: 2px; }
        .foot { margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 5px; font-size: 8.5px; color: #6b7280; text-align: right; }
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
                                <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(140)->generate($scanUrl)) }}" alt="QR verifikasi">
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
