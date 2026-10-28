<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4 portrait; margin: 13mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9pt; line-height: 1.35; }
        .head { text-align: center; margin-bottom: 6mm; }
        .logo { width: 42mm; height: auto; margin-bottom: 2mm; }
        .brand { font-size: 13pt; font-weight: bold; letter-spacing: 1px; }
        h1 { font-size: 13pt; text-decoration: underline; margin: 2mm 0; }
        .number { color: #555; font-size: 8pt; }
        .section { margin: 4mm 0 1.5mm; font-weight: bold; font-size: 9pt; }
        table { width: 100%; border-collapse: collapse; }
        .fields td { padding: 1.3mm 1mm; vertical-align: top; border-bottom: .4pt solid #aaa; }
        .fields .label { width: 37%; }
        .fields .colon { width: 3%; text-align: center; }
        .amount { text-align: right; font-weight: bold; }
        .approval { margin-top: 5mm; padding: 3mm; border: .7pt solid #555; font-size: 8pt; }
        .signatures { margin-top: 7mm; page-break-inside: avoid; }
        .signatures td { width: 50%; vertical-align: top; text-align: center; }
        .space { height: 25mm; }
        .foot { margin-top: 5mm; padding-top: 2mm; border-top: .4pt solid #aaa; text-align: right; color: #666; font-size: 7pt; }
    </style>
</head>
<body>
    <div class="head">
        @if ($logoData)<img class="logo" src="{{ $logoData }}" alt="Duta Mall">@else<div class="brand">DUTA MALL BANJARMASIN</div>@endif
        <h1>FORM DATA CUSTOMER</h1>
        <div class="number">No. Pengajuan: {{ $permit->permit_number }}</div>
    </div>

    <div class="section">IDENTITAS PERUSAHAAN</div>
    <table class="fields">
        <tr><td class="label">Nama Perusahaan PT/CV</td><td class="colon">:</td><td>{{ $data['customer_company_name'] ?? '—' }}</td></tr>
        <tr><td class="label">Alamat Pengiriman Invoice</td><td class="colon">:</td><td>{{ $data['customer_invoice_address'] ?? '—' }}</td></tr>
        <tr><td class="label">No. Telp/HP Perusahaan</td><td class="colon">:</td><td>{{ $data['customer_company_phone'] ?? '—' }}</td></tr>
        <tr><td class="label">No. NPWP Perusahaan</td><td class="colon">:</td><td>{{ $data['customer_npwp_number'] ?: '—' }}</td></tr>
        <tr><td class="label">Nama di NPWP</td><td class="colon">:</td><td>{{ $data['customer_npwp_name'] ?: '—' }}</td></tr>
        <tr><td class="label">Alamat di NPWP</td><td class="colon">:</td><td>{{ $data['customer_npwp_address'] ?: '—' }}</td></tr>
    </table>

    <div class="section">DATA PERSON IN CHARGE (PIC)</div>
    <table class="fields">
        <tr><td class="label">Nama PIC</td><td class="colon">:</td><td>{{ $data['customer_pic_name'] ?? '—' }}</td></tr>
        <tr><td class="label">Jabatan</td><td class="colon">:</td><td>{{ $data['customer_pic_position'] ?? '—' }}</td></tr>
        <tr><td class="label">No. KTP</td><td class="colon">:</td><td>{{ $data['customer_pic_ktp'] ?? '—' }}</td></tr>
        <tr><td class="label">No. Telp/HP</td><td class="colon">:</td><td>{{ $data['customer_pic_phone'] ?? '—' }}</td></tr>
        <tr><td class="label">E-mail</td><td class="colon">:</td><td>{{ $data['customer_pic_email'] ?? '—' }}</td></tr>
    </table>

    <div class="section">RINCIAN TAGIHAN & TENANT</div>
    <table class="fields">
        <tr><td class="label">Hubungan Tenant</td><td class="colon">:</td><td>{{ $data['customer_tenant_relation'] ?? ($permit->tenant?->name ?: '—') }}</td></tr>
        <tr><td class="label">Keterangan Tagihan</td><td class="colon">:</td><td>{{ $data['customer_billing_description'] ?? '—' }}</td></tr>
        <tr><td class="label">Nominal (di luar PPN)</td><td class="colon">:</td><td class="amount">Rp {{ number_format((float) ($data['customer_amount'] ?? 0), 2, ',', '.') }}</td></tr>
    </table>

    <div class="section">ADMINISTRASI</div>
    <table class="fields">
        <tr><td class="label">Tanggal</td><td class="colon">:</td><td>{{ $requestDate }}</td></tr>
        <tr><td class="label">Catatan</td><td class="colon">:</td><td>{{ $data['customer_notes'] ?: '—' }}</td></tr>
    </table>

    <div class="approval">Formulir dan data customer ini akan digunakan untuk keperluan administrasi serta penagihan. Persetujuan General Manager (GM) mengikuti ketentuan Management Duta Mall.</div>

    <table class="signatures">
        <tr>
            <td>Diajukan oleh Customer<div class="space"></div><strong>{{ $data['customer_pic_name'] ?? '—' }}</strong><br>{{ $data['customer_pic_position'] ?? '' }}</td>
            <td>Diketahui oleh Tenancy<div class="space"></div><strong>{{ $tenancyApproval?->approvedBy?->name ?? ($tenancyApproval?->status === 'approved' ? 'Disetujui Tenancy' : '( Menunggu Persetujuan )') }}</strong><br>Duta Mall Banjarmasin</td>
        </tr>
    </table>
    <div class="foot">Dicetak {{ $printedAt }} • {{ $permit->branch?->name ?? 'Duta Mall' }} • {{ $permit->permit_number }}</div>
</body>
</html>
