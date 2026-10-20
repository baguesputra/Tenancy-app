<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 16mm 18mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 11px; line-height: 1.45; margin: 0; }
        .head { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
        .head .brand { font-size: 13px; font-weight: bold; letter-spacing: 1.5px; }
        .head .title { font-size: 18px; font-weight: bold; margin-top: 3px; }
        .head .number { font-size: 9.5px; color: #4b5563; margin-top: 3px; }
        .date { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .date td { padding: 2px 0; font-size: 11px; }
        .date .label { width: 62px; color: #374151; }
        .date .line { border-bottom: 1px solid #111827; width: 95px; }
        .date .gap { width: 16px; }
        .narr { margin: 0 0 10px; }
        table.form { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.form td { padding: 5px 6px; vertical-align: top; border-bottom: 1px dotted #9ca3af; }
        table.form td.k { width: 175px; color: #374151; }
        table.form td.s { width: 10px; }
        .vehicle { font-weight: bold; }
        .statement { text-align: justify; margin: 10px 0 0; }
        .notes { margin-top: 12px; font-size: 9.5px; color: #374151; }
        .notes .title { font-weight: bold; margin-bottom: 2px; }
        .notes ol { margin: 0; padding-left: 16px; }
        .sign { margin-top: 22px; }
        table.sign { width: 100%; border-collapse: collapse; }
        table.sign td { width: 50%; text-align: center; vertical-align: top; font-size: 11px; }
        .space { height: 54px; }
        .name { display: inline-block; min-width: 150px; border-bottom: 1px solid #111827; padding: 0 10px; font-weight: bold; }
        .role { margin-top: 2px; font-size: 10px; color: #374151; }
        .dept { font-weight: bold; margin-top: 2px; }
        .foot { margin-top: 14px; border-top: 1px solid #d1d5db; padding-top: 4px; font-size: 8.5px; color: #6b7280; text-align: right; }
    </style>
</head>
<body>
    <div class="head">
        <div class="brand">{{ strtoupper($permit->branch?->name ?? 'DUTA MALL') }}</div>
        <div class="title">FORM LANGGANAN PARKIR</div>
        <div class="number">No. Pengajuan: {{ $permit->permit_number }}</div>
    </div>

    <table class="date">
        <tr>
            <td class="label">Tanggal</td>
            <td class="line" style="text-align:center">{{ $tanggal }}</td>
            <td class="gap"></td>
            <td class="label">Bulan</td>
            <td class="line" style="text-align:center">{{ $bulan }}</td>
            <td class="gap"></td>
            <td class="label">Tahun</td>
            <td class="line" style="text-align:center">{{ $tahun }}</td>
        </tr>
    </table>

    <p class="narr">Form parkir ini sebagai pengantar langganan parkir dengan data sebagai berikut:</p>

    <table class="form">
        <tr>
            <td class="k">Nama Tenant/Unit</td>
            <td class="s">:</td>
            <td>{{ $tenantName }}</td>
        </tr>
        <tr>
            <td class="k">Lokasi Tenant/Unit</td>
            <td class="s">:</td>
            <td>{{ $location }}</td>
        </tr>
        <tr>
            <td class="k">Nama Penanggung Jawab</td>
            <td class="s">:</td>
            <td>{{ $permit->pic_name ?: '—' }}</td>
        </tr>
        <tr>
            <td class="k">Nama Pemohon</td>
            <td class="s">:</td>
            <td>{{ $permit->applicant_name ?: '—' }}</td>
        </tr>
        <tr>
            <td class="k">NOPOL</td>
            <td class="s">:</td>
            <td><span class="vehicle">{{ strtoupper($permit->vehicle_plate ?: '—') }}</span> &nbsp;—&nbsp; {{ $vehicleTypeLabel }}</td>
        </tr>
    </table>

    <p class="statement">
        Dengan ini bersedia mengikuti seluruh peraturan yang diberlakukan oleh Management Duta Mall,
        apabila dikemudian hari ditemukan pelanggaran yang saya lakukan, maka saya bersedia menerima
        sanksi yang diberlakukan.
    </p>

    <div class="notes">
        <div class="title">Catatan:</div>
        <div>Langganan Parkir aktif dalam waktu 1x24 jam.</div>
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
                    <div><span class="name">{{ $permit->applicant_name }}</span></div>
                    <div class="role">Jabatan: {{ $permit->applicant_position ?: '—' }}</div>
                </td>
                <td>
                    <div>Diketahui,</div>
                    <div class="space"></div>
                    <div class="dept">Tenancy &amp; FO Dept.</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="foot">Dicetak dari sistem pada {{ $printedAt }} • {{ $permit->permit_number }}</div>
</body>
</html>
