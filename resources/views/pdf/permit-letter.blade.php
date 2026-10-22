<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Surat Ijin - {{ $permit->permit_number }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 7mm 12mm 6mm 12mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 8pt;
            line-height: 1.25;
            margin: 0;
            padding: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        /* Kop / Header */
        .kop-table {
            width: 100%;
            margin-bottom: 1.5mm;
        }
        .kop-table td {
            vertical-align: top;
            padding: 0;
            border: none;
        }
        .logo-col {
            width: 32%;
        }
        .logo-col img {
            width: 38mm;
            height: auto;
            display: block;
        }
        .tagline {
            font-family: 'Brush Script MT', cursive, Georgia, serif;
            font-size: 12pt;
            font-style: italic;
            color: #111;
            margin-top: 1px;
            display: block;
        }
        .title-col {
            width: 53%;
            text-align: center;
            padding-top: 1mm;
        }
        .main-title {
            font-size: 15pt;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0 0 3px 0;
        }
        .nomor-surat {
            font-size: 9pt;
            letter-spacing: 0.5px;
        }
        .qr-col {
            width: 15%;
            text-align: right;
            vertical-align: top;
        }
        .qr-col img {
            width: 16mm;
            height: 16mm;
            display: inline-block;
        }
        .qr-cap {
            font-size: 5.5pt;
            color: #444;
            text-align: center;
            margin-top: 1px;
        }

        /* Activity Types Checklist (1-6) */
        .activity-box {
            text-align: center;
            font-size: 7.3pt;
            font-weight: bold;
            margin: 1.5mm 0 1.5mm;
            line-height: 1.4;
            letter-spacing: 0.1px;
        }
        .act-item {
            margin: 0 3px;
            display: inline-block;
        }
        .act-on {
            text-decoration: underline;
            font-weight: 900;
        }
        .act-off {
            font-weight: normal;
            color: #333;
        }

        /* Hari / Tanggal line */
        .date-line {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 1.5mm;
        }

        /* Form Tables */
        table.tbl-form {
            width: 100%;
            border: 1px solid #000;
            margin-bottom: 1.5mm;
        }
        table.tbl-form td, table.tbl-form th {
            border: 1px solid #000;
            padding: 2.2px 4.5px;
            font-size: 7.8pt;
            vertical-align: middle;
        }
        table.tbl-form th {
            font-weight: bold;
            text-align: center;
            background-color: #fff;
        }
        .sec-head {
            font-size: 8pt;
            font-weight: bold;
            margin: 1.5mm 0 0.8mm;
        }

        /* Keterangan */
        .keterangan-row {
            font-size: 7.8pt;
            margin: 1.5mm 0 2mm;
            line-height: 1.25;
        }

        /* Tanda Tangan */
        table.tbl-ttd {
            width: 100%;
            margin-top: 1mm;
            margin-bottom: 1.5mm;
            border-collapse: collapse;
        }
        table.tbl-ttd td {
            vertical-align: top;
            padding: 0 4px;
            border: none;
            text-align: center;
        }
        .ttd-header {
            font-size: 8pt;
            font-weight: normal;
            margin-bottom: 2px;
        }
        .ttd-badge {
            font-size: 6.8pt;
            color: #047857;
            font-weight: bold;
            display: block;
            margin-bottom: 2px;
        }
        .ttd-space {
            height: 12mm;
        }
        .ttd-name {
            font-size: 8pt;
            font-weight: bold;
            display: inline-block;
            border-bottom: 1px solid #000;
            padding: 0 6px;
            line-height: 1.2;
        }
        .ttd-role {
            font-size: 8pt;
            font-weight: normal;
            margin-top: 2px;
        }
        .ttd-date {
            font-size: 6.5pt;
            color: #555;
            margin-top: 1px;
        }

        /* Footer Notes & Warnings */
        .warn-text {
            font-size: 7.2pt;
            font-weight: bold;
            text-align: center;
            margin: 1.5mm 0 1mm;
        }
        table.tbl-catatan {
            width: 100%;
            font-size: 6.8pt;
            margin-bottom: 1mm;
        }
        table.tbl-catatan td {
            border: none;
            padding: 0.5px 2px;
            vertical-align: top;
        }
        .mall-address {
            text-align: center;
            font-size: 6.8pt;
            border-top: 0.5px solid #000;
            padding-top: 1mm;
            margin-top: 1mm;
            line-height: 1.25;
        }
    </style>
</head>
<body>
    <!-- 1. HEADER: Logo + Judul + Nomor Surat + QR Verifikasi Digital -->
    <table class="kop-table">
        <tr>
            <td class="logo-col">
                @if (! empty($logoData))
                    <img src="{{ $logoData }}" alt="Duta Mall Banjarmasin">
                @else
                    <strong style="font-size: 14pt;">Duta Mall</strong>
                @endif
                <span class="tagline">Always Ahead...!</span>
            </td>
            <td class="title-col">
                <div class="main-title">SURAT IJIN</div>
                <div class="nomor-surat">
                    No. &nbsp;: &nbsp;<strong>{{ $permit->permit_number ?: '............ / TC / ......... / ...........' }}</strong>
                </div>
            </td>
            <td class="qr-col">
                @if (! empty($scanUrl))
                    <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(90)->generate($scanUrl)) }}" alt="QR">
                    <div class="qr-cap">Verifikasi Digital</div>
                @endif
            </td>
        </tr>
    </table>

    <!-- 2. Checklist Jenis Izin (1 - 6) -->
    <div class="activity-box">
        <span class="act-item {{ $isKerja ? 'act-on' : 'act-off' }}">{{ $isKerja ? '✓ ' : '' }}1. KERJA</span> &nbsp;&nbsp;&nbsp;
        <span class="act-item {{ $isLembur ? 'act-on' : 'act-off' }}">{{ $isLembur ? '✓ ' : '' }}2. LEMBUR</span> &nbsp;&nbsp;&nbsp;
        <span class="act-item {{ $isBarang ? 'act-on' : 'act-off' }}">{{ $isBarang ? '✓ ' : '' }}3. MASUK / KELUAR BARANG</span> &nbsp;&nbsp;&nbsp;
        <span class="act-item {{ $isAlat ? 'act-on' : 'act-off' }}">{{ $isAlat ? '✓ ' : '' }}4. MASUK / KELUAR ALAT KERJA / PROPERTI</span><br>
        <span class="act-item {{ $isBukaTutup ? 'act-on' : 'act-off' }}">{{ $isBukaTutup ? '✓ ' : '' }}5. BUKA / TUTUP OPERATIONAL</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span class="act-item {{ $isFitout ? 'act-on' : 'act-off' }}">{{ $isFitout ? '✓ ' : '' }}6. FIT OUT / PULL OUT / RENOVASI</span>
    </div>

    <!-- 3. Hari / Tanggal -->
    <div class="date-line">
        Hari/Tgl &nbsp;: &nbsp;<strong>{{ $hariTgl }}</strong>
    </div>

    <!-- 4. Data Toko -->
    <table class="tbl-form">
        <tr>
            <td colspan="2" style="width: 50%;">
                Nama Toko : &nbsp;<strong>{{ $permit->store_name_snapshot ?? ($permit->tenant->name ?? '-') }}</strong>
            </td>
            <td colspan="2" style="width: 50%;">
                Telp. Toko : &nbsp;<strong>{{ $tenantPhone }}</strong>
            </td>
        </tr>
        <tr>
            <td style="width: 25%;">Lokasi :</td>
            <td style="width: 25%;">Lantai : &nbsp;<strong>{{ $permit->floor_snapshot ?: '-' }}</strong></td>
            <td style="width: 25%;">Blok : &nbsp;<strong>{{ $permit->block_snapshot ?: '-' }}</strong></td>
            <td style="width: 25%;">No. : &nbsp;<strong>{{ $permit->unit_number_snapshot ?: '-' }}</strong></td>
        </tr>
        <tr>
            <td colspan="2" style="width: 50%;">
                Nama Penanggung Jawab : &nbsp;<strong>{{ $permit->pic_name ?: '-' }}</strong>
            </td>
            <td colspan="2" style="width: 50%;">
                Telp. : &nbsp;<strong>{{ $permit->pic_phone ?: '-' }}</strong>
            </td>
        </tr>
    </table>

    <!-- 5. Data Kontraktor -->
    <div class="sec-head">Data Kontraktor</div>
    <table class="tbl-form">
        <tr>
            <td style="width: 28%;">Nama Perusahaan</td>
            <td style="width: 72%;"><strong>{{ $permit->contractor_company ?: '-' }}</strong></td>
        </tr>
        <tr>
            <td>Penanggung Jawab</td>
            <td><strong>{{ $permit->contractor_pic ?: '-' }}</strong></td>
        </tr>
        <tr>
            <td>Alamat</td>
            <td>{{ $permit->contractor_address ?: '-' }}</td>
        </tr>
        <tr>
            <td>Telp./ HP / Fax</td>
            <td>{{ $permit->contractor_phone ?: '-' }}</td>
        </tr>
    </table>

    <!-- 6. Daftar Nama Pekerja (3 Kolom x 5 Baris = 15 Slot) -->
    <div class="sec-head">Daftar Nama Pekerja</div>
    <table class="tbl-form">
        <thead>
            <tr>
                <th style="width: 4%;">No.</th>
                <th style="width: 29%;">Nama</th>
                <th style="width: 4%;">No.</th>
                <th style="width: 29%;">Nama</th>
                <th style="width: 4%;">No.</th>
                <th style="width: 30%;">Nama</th>
            </tr>
        </thead>
        <tbody>
            @for ($row = 0; $row < 5; $row++)
                <tr>
                    <td style="text-align: center;">{{ $row + 1 }}</td>
                    <td>
                        {{ $workers[$row]->name ?? ($row === 0 && empty($workers[0]) && $permit->worker_count ? $permit->worker_count . ' orang terdaftar' : '') }}
                    </td>
                    <td style="text-align: center;">{{ $row + 6 }}</td>
                    <td>{{ $workers[$row + 5]->name ?? '' }}</td>
                    <td style="text-align: center;">{{ $row + 11 }}</td>
                    <td>{{ $workers[$row + 10]->name ?? '' }}</td>
                </tr>
            @endfor
        </tbody>
    </table>

    <!-- 7. Daftar Barang / Peralatan Kerja / Properti (5 Baris) -->
    <div class="sec-head">Daftar Barang / Peralatan Kerja / Properti</div>
    <table class="tbl-form">
        <tbody>
            @for ($i = 0; $i < 5; $i++)
                <tr>
                    <td style="width: 4%; text-align: center;">{{ $i + 1 }}</td>
                    <td style="width: 96%;">
                        @if (isset($goodsRows[$i]))
                            <strong>{{ $goodsRows[$i] }}</strong>
                        @endif
                    </td>
                </tr>
            @endfor
        </tbody>
    </table>

    <!-- 8. Pekerjaan -->
    <div class="sec-head">Pekerjaan</div>
    <table class="tbl-form">
        <tr>
            <td style="width: 28%;">Jenis Pekerjaan</td>
            <td colspan="3"><strong>{{ $permit->job_type ?: ($permit->event_name ?: '-') }}</strong></td>
        </tr>
        <tr>
            <td style="width: 28%;">Tanggal Pelaksanaan</td>
            <td style="width: 33%;"><strong>{{ $startDate }}</strong></td>
            <td style="width: 6%; text-align: center;">s.d</td>
            <td style="width: 33%;"><strong>{{ $endDate }}</strong></td>
        </tr>
        <tr>
            <td style="width: 28%;">Jam Pelaksanaan</td>
            <td style="width: 33%;"><strong>{{ $startTime }}</strong></td>
            <td style="width: 6%; text-align: center;">s.d</td>
            <td style="width: 33%;"><strong>{{ $endTime }}</strong></td>
        </tr>
        <tr>
            <td style="width: 28%;">Akses masuk / keluar</td>
            <td colspan="3"><strong>{{ $permit->access_route ?: '-' }}</strong></td>
        </tr>
    </table>

    <!-- 9. Keterangan -->
    <div class="keterangan-row">
        Keterangan &nbsp;: &nbsp;<strong>{{ $permit->notes ?: '................................................................................................................................................................................................' }}</strong>
    </div>

    <!-- 10. Tanda Tangan (Samakan dari sistem kita) -->
    <table class="tbl-ttd">
        <tr>
            <!-- Pemohon -->
            <td style="width: {{ $bsStep ? '33.33%' : '50%' }};">
                <div class="ttd-header">Pemohon,</div>
                <div class="ttd-badge">Diajukan secara digital</div>
                <div class="ttd-space"></div>
                <div><span class="ttd-name">{{ $permit->pic_name ?: $requestedByLabel }}</span></div>
                <div class="ttd-role">Tenant / Kontraktor</div>
                <div class="ttd-date">Tgl: {{ $requestDate }}</div>
            </td>

            @if ($bsStep)
                <!-- Building Service jika ada dalam workflow -->
                <td style="width: 33.33%;">
                    <div class="ttd-header">Mengetahui,</div>
                    @if ($bsStep->status === 'approved')
                        <div class="ttd-badge">Disetujui secara digital</div>
                        <div class="ttd-space"></div>
                        <div><span class="ttd-name">{{ $bsStep->approvedBy?->name ?? 'Building Service' }}</span></div>
                        <div class="ttd-role">Building Service</div>
                        <div class="ttd-date">{{ $bsStep->approved_at?->format('d/m/Y H:i') }} WITA</div>
                    @else
                        <div class="ttd-badge" style="color: #64748b;">Menunggu Persetujuan</div>
                        <div class="ttd-space"></div>
                        <div><span class="ttd-name">. . . . . . . . . . . . . . . . . . . .</span></div>
                        <div class="ttd-role">Building Service</div>
                    @endif
                </td>
            @endif

            <!-- Tenancy Department -->
            <td style="width: {{ $bsStep ? '33.33%' : '50%' }};">
                <div class="ttd-header">Mengetahui,</div>
                @if (($tenancyStep->status ?? null) === 'approved')
                    <div class="ttd-badge">Disetujui secara digital</div>
                    <div class="ttd-space"></div>
                    <div><span class="ttd-name">{{ $tenancyStep->approvedBy?->name ?? 'Tenancy Department' }}</span></div>
                    <div class="ttd-role">Tenancy Department</div>
                    <div class="ttd-date">{{ $tenancyStep->approved_at?->format('d/m/Y H:i') }} WITA</div>
                @else
                    <div class="ttd-badge" style="color: #64748b;">Menunggu Persetujuan</div>
                    <div class="ttd-space"></div>
                    <div><span class="ttd-name">. . . . . . . . . . . . . . . . . . . .</span></div>
                    <div class="ttd-role">Tenancy Department</div>
                @endif
            </td>
        </tr>
    </table>

    <!-- 11. Footer: Peringatan Security, Catatan 4 Lembar, dan Alamat Mall -->
    <div class="warn-text">
        Apabila form ini tidak diperlihatkan, maka security berhak menghentikan kegiatan.
    </div>

    <table class="tbl-catatan">
        <tr>
            <td style="width: 10%; font-weight: bold;">Catatan :</td>
            <td style="width: 45%;">1. Lembar putih untuk pemohon</td>
            <td style="width: 45%;">3. Lembar kuning untuk building service</td>
        </tr>
        <tr>
            <td></td>
            <td>2. Lembar biru untuk security loading dock</td>
            <td>4. Lembar merah untuk arsip</td>
        </tr>
    </table>

    <div class="mall-address">
        Jl. A. Yani Km. 2 Telp. 0511 - 327 8888 Fax. 0511 - 327 8888<br>
        Banjarmasin
    </div>
</body>
</html>
