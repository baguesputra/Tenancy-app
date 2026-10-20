<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 20mm 22mm 16mm; }
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #000;
            font-size: 10pt;
            line-height: 1.3;
            margin: 0;
        }
        .head { text-align: center; margin-bottom: 5mm; }
        .head .logo { display: block; width: 42mm; height: auto; margin: 0 auto 4mm; }
        .head .brand { font-size: 12pt; font-weight: bold; letter-spacing: 1.2px; margin-bottom: 4mm; }
        .head .title { font-size: 10pt; font-weight: bold; text-decoration: underline; }
        .head .number { font-size: 8pt; color: #4b5563; margin-top: 2mm; }
        .date { width: 100%; border-collapse: collapse; margin-bottom: 5mm; table-layout: fixed; }
        .date td { padding: 1mm 0; vertical-align: bottom; }
        .date .label { width: 18mm; }
        .date .value { width: 30mm; }
        .date .gap { width: 8mm; }
        .narr { margin: 0 0 3mm; }
        table.form { width: 100%; border-collapse: collapse; margin-bottom: 4mm; table-layout: fixed; }
        table.form td { padding: 1.6mm 0; vertical-align: top; }
        table.form td.label { width: 46mm; padding-right: 3mm; }
        table.form tr.first td { border-top: 0.5pt solid #000; padding-top: 2mm; }
        table.form tr.last td { border-bottom: 0.5pt solid #000; padding-bottom: 2mm; }
        .vehicle { font-weight: bold; }
        .statement { font-size: 9pt; margin: 3mm 0 0; }
        .notes { margin-top: 4mm; font-size: 10pt; font-weight: bold; }
        .notes ol { margin: 0; padding-left: 5mm; }
        .sign { margin-top: 6mm; page-break-inside: avoid; }
        table.sign { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.sign td { width: 50%; text-align: left; vertical-align: top; }
        .space { height: 23mm; }
        .foot { margin-top: 4mm; border-top: 0.5pt solid #d1d5db; padding-top: 1.5mm; font-size: 8pt; color: #6b7280; text-align: right; }
    </style>
</head>
<body>
    <div class="head">
        @if ($logoData)
            <img src="{{ $logoData }}" alt="Duta Mall" class="logo">
        @else
            <div class="brand">{{ strtoupper($permit->branch?->name ?? 'DUTA MALL') }}</div>
        @endif
        <div class="title">Form Langganan Parkir</div>
        <div class="number">No. Pengajuan: {{ $permit->permit_number }}</div>
    </div>

    <table class="date">
        <tr>
            <td class="label">Tanggal</td>
            <td class="value">{{ $tanggal }}</td>
            <td class="gap"></td>
            <td class="label">Bulan</td>
            <td class="value">{{ $bulan }}</td>
            <td class="gap"></td>
            <td class="label">Tahun</td>
            <td class="value">{{ $tahun }}</td>
        </tr>
    </table>

    <p class="narr">Form parkir ini sebagai pengantar langganan parkir dengan data sebagai berikut:</p>

    <table class="form">
        <tr class="first">
            <td class="label">Nama Tenant/Unit</td>
            <td>{{ $tenantName }}</td>
        </tr>
        <tr>
            <td class="label">Lokasi Tenant/Unit</td>
            <td>Lantai : {{ $lantai }} &nbsp;&nbsp; Blok : {{ $blok }} &nbsp;&nbsp; No : {{ $nomor }}</td>
        </tr>
        <tr>
            <td class="label">Nama Penanggung Jawab</td>
            <td>{{ $permit->pic_name ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Nama Pemohon</td>
            <td>{{ $permit->applicant_name ?: '—' }}</td>
        </tr>
        <tr class="last">
            <td class="label">NOPOL</td>
            <td><span class="vehicle">{{ strtoupper($permit->vehicle_plate ?: '—') }}</span> &nbsp;—&nbsp; {{ $vehicleTypeLabel }}</td>
        </tr>
    </table>

    <p class="statement">
        Dengan ini bersedia mengikuti seluruh peraturan yang diberlakukan oleh Management Duta Mall,
        apabila dikemudian hari ditemukan pelanggaran yang saya lakukan, maka saya bersedia menerima
        sanksi yang diberlakukan.
    </p>

    <div class="notes">
        <div>Langganan Parkir aktif dalam waktu 1x24 jam.</div>
        <div>Catatan:</div>
        <ol>
            <li>Pengisian form WAJIB diketik.</li>
            <li>Form WAJIB dicetak sebanyak 2 (dua) lembar.</li>
            <li>Form WAJIB diberikan stempel.</li>
            <li>Tenant WAJIB melampirkan surat pernyataan jika tidak memiliki stempel sebanyak 2 (dua) lembar.</li>
        </ol>
    </div>

    <div class="sign">
        <table class="sign">
            <tr>
                <td>
                    <div>Pemohon,</div>
                    <div class="space"></div>
                    <div>Nama : {{ $permit->applicant_name ?: '—' }}</div>
                    <div>Jabatan : {{ $permit->applicant_position ?: '—' }}</div>
                </td>
                <td>
                    <div>Diketahui,</div>
                    <div class="space"></div>
                    <div>Tenancy &amp; FO Dept.</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="foot">Dicetak dari sistem pada {{ $printedAt }} • {{ $permit->branch?->name ?? 'Duta Mall' }} • {{ $permit->permit_number }}</div>
</body>
</html>
