<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 18mm 16mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 11px; line-height: 1.6; margin: 0; }
        .kop { text-align: center; border-bottom: 3px double #0F1E36; padding-bottom: 10px; margin-bottom: 14px; }
        .kop .title { font-size: 17px; font-weight: bold; letter-spacing: 1px; }
        .kop .number { font-size: 12px; margin-top: 3px; }
        .kop .number strong { font-size: 13px; }
        .kop .status { font-size: 10px; color: #475569; margin-top: 3px; }
        .narr { text-align: justify; margin: 0 0 10px; }
        h3.sec { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #9ca3af; padding-bottom: 3px; margin: 14px 0 6px; }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.data td { padding: 3px 4px; vertical-align: top; }
        table.data td.k { width: 170px; color: #4b5563; }
        table.grid { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.grid th { background: #0F1E36; color: #fff; font-size: 10px; text-align: left; padding: 5px 6px; }
        table.grid td { border: 1px solid #d1d5db; padding: 4px 6px; vertical-align: top; font-size: 10.5px; }
        table.grid tr:nth-child(even) td { background: #f9fafb; }
        .thumb { width: 52px; height: 52px; object-fit: cover; border: 1px solid #d1d5db; }
        .note { font-size: 9.5px; color: #92400e; margin-top: 2px; }
        .sign { margin-top: 16px; }
        .sign table { width: 100%; border-collapse: collapse; }
        .sign td { vertical-align: top; padding: 3px 4px; font-size: 10.5px; }
        table.sig { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.sig td { width: 50%; text-align: center; vertical-align: top; padding: 6px 10px; }
        .sig .role { font-size: 11px; font-weight: bold; }
        .sig .verdict { font-size: 11px; font-weight: bold; margin-top: 4px; }
        .sig .space { height: 52px; }
        .sig .name { display: inline-block; border-bottom: 1px solid #111827; padding: 0 12px; font-weight: bold; }
        .sig .date { font-size: 9.5px; color: #4b5563; margin-top: 2px; }
        .sig .dots { color: #9ca3af; letter-spacing: 2px; }
        .secbox { width: 100%; border: 1px solid #9ca3af; border-radius: 4px; border-collapse: collapse; margin-bottom: 4px; }
        .secbox td { vertical-align: middle; padding: 6px 8px; }
        .secbox .st-ok { font-size: 12px; font-weight: bold; }
        .secbox .st-no { font-size: 12px; font-weight: bold; }
        .secbox .prog { font-size: 10px; color: #374151; margin-top: 2px; }
        .secbox .qr { text-align: center; width: 118px; }
        .secbox .qr img { width: 100px; height: 100px; border: 1px solid #d1d5db; }
        .secbox .qr .cap { font-size: 8.5px; color: #4b5563; margin-top: 2px; }
        .foot { margin-top: 14px; border-top: 1px solid #d1d5db; padding-top: 6px; font-size: 9px; color: #6b7280; text-align: right; }
    </style>
</head>
<body>
    <div class="kop">
        <div class="title">SURAT IZIN KEGIATAN</div>
        <div class="number">Nomor: <strong>{{ $permit->permit_number }}</strong></div>
        <div class="status">Status: {{ $statusLabel }} &nbsp;•&nbsp; Diajukan: {{ $requestDate }}</div>
    </div>

    <p class="narr">
        Yang bertanda tangan di bawah ini menerangkan bahwa kegiatan berikut telah diajukan
        oleh <strong>{{ $requestedByLabel }}</strong> dan tercatat dalam sistem perizinan
        dengan rincian sebagai berikut:
    </p>

    <h3 class="sec">I. Data Pemohon</h3>
    <table class="data">
        <tr><td class="k">Kategori</td><td>: {{ in_array('pameran', $permit->activity_types ?? []) ? 'Pameran / Open Counter' : ($permit->tenant_id ? ($permit->tenant->name ?? 'Tenant') : ($permit->contractor_company ? 'Vendor' : 'Area')) }}</td></tr>
        <tr><td class="k">Diajukan Oleh</td><td>: {{ $requestedByLabel }}</td></tr>
        <tr><td class="k">Tanggal Pengajuan</td><td>: {{ $requestDate }}</td></tr>
        <tr><td class="k">Penanggung Jawab</td><td>: {{ $permit->pic_name ?? '—' }} ({{ $permit->pic_phone ?? '—' }})</td></tr>
    </table>

    <h3 class="sec">II. Pelaksanaan Kegiatan</h3>
    <table class="data">
        <tr><td class="k">Lokasi</td><td>: {{ $permit->store_name_snapshot }} — {{ $location }}</td></tr>
        <tr><td class="k">Jenis Kegiatan</td><td>: {{ $activityLabels->join(', ') }}</td></tr>
        <tr><td class="k">Jenis Pekerjaan</td><td>: {{ $permit->job_type ?: '—' }}</td></tr>
        <tr><td class="k">Tanggal Pelaksanaan</td><td>: {{ $schedule }}</td></tr>
        <tr><td class="k">Jam Pelaksanaan</td><td>: {{ $time }}</td></tr>
        <tr><td class="k">Akses Masuk / Keluar</td><td>: {{ $permit->access_route ?: '—' }}</td></tr>
        @if ($permit->notes)
            <tr><td class="k">Keterangan</td><td>: {{ $permit->notes }}</td></tr>
        @endif
    </table>

    @if ($permit->is_external || $permit->contractor_company)
        <h3 class="sec">III. {{ $permit->contractor_company && ! $permit->is_external ? 'Kontraktor Eksternal' : 'Data Vendor' }}</h3>
        <table class="data">
            <tr><td class="k">Perusahaan</td><td>: {{ $permit->contractor_company ?: '—' }}</td></tr>
            <tr><td class="k">Penanggung Jawab</td><td>: {{ $permit->contractor_pic ?: '—' }}</td></tr>
            <tr><td class="k">Telp / HP / Fax</td><td>: {{ $permit->contractor_phone ?: '—' }}</td></tr>
            <tr><td class="k">Alamat</td><td>: {{ $permit->contractor_address ?: '—' }}</td></tr>
        </table>
    @endif

    @if ($permit->accompanyingDepartments->isNotEmpty())
        <h3 class="sec">{{ ($permit->is_external || $permit->contractor_company) ? 'IV' : 'III' }}. Departemen Pendampingan</h3>
        <table class="data">
            <tr><td class="k">Departemen</td><td>: {{ $permit->accompanyingDepartments->pluck('name')->join(', ') }}</td></tr>
        </table>
    @endif

    @if ($permit->workers->isNotEmpty())
        <h3 class="sec">Daftar Pekerja</h3>
        <table class="grid">
            <tr><th style="width:30px">No</th><th>Nama Pekerja</th><th style="width:110px">Status</th></tr>
            @foreach ($permit->workers as $i => $w)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $w->name }}</td>
                    <td>{{ $w->is_present ? 'Hadir' : 'Belum dicek' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    @if ($permit->goods->isNotEmpty())
        <h3 class="sec">Daftar Barang</h3>
        <table class="grid">
            <tr><th style="width:30px">No</th><th>Barang</th><th style="width:90px">Jumlah</th><th style="width:60px">Foto</th><th style="width:110px">Status</th></tr>
            @foreach ($permit->goods as $i => $g)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>
                        {{ $g->description }}
                        @if ($g->mismatch_note)
                            <div class="note">Catatan: {{ $g->mismatch_note }}</div>
                        @endif
                    </td>
                    <td>{{ $g->quantity_note }}</td>
                    <td>
                        @if (! empty($goodsPhotos[$g->id]))
                            <img class="thumb" src="{{ $goodsPhotos[$g->id] }}" alt="Foto {{ $g->description }}">
                        @else
                            —
                        @endif
                    </td>
                    <td>{{ $g->is_verified ? 'Terverifikasi' : 'Belum dicek' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <h3 class="sec">Pemeriksaan Security</h3>
    <table class="secbox">
        <tr>
            <td>
                @if (($securityStep->status ?? null) === 'approved')
                    <div class="st-ok">SUDAH DICEK FISIK</div>
                    <div class="prog">
                        Dicek oleh {{ $securityStep->approvedBy?->name ?? '—' }}, {{ $securityStep->approved_at?->locale('id')->translatedFormat('d F Y, H:i') }}<br>
                        Pekerja hadir {{ $workersPresent }}/{{ $workersTotal }} • Barang terverifikasi {{ $goodsVerified }}/{{ $goodsTotal }}
                    </div>
                @else
                    <div class="st-no">BELUM DICEK FISIK</div>
                    <div class="prog">
                        Pekerja hadir {{ $workersPresent }}/{{ $workersTotal }} • Barang terverifikasi {{ $goodsVerified }}/{{ $goodsTotal }}
                    </div>
                @endif
            </td>
            <td class="qr">
                @if ($scanUrl)
                    <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(180)->generate($scanUrl)) }}" alt="QR verifikasi">
                @endif
                <div class="cap">Pindai untuk verifikasi di pintu</div>
            </td>
        </tr>
    </table>

    <table class="sig">
        <tr>
            @foreach ([$leftSigner, $rightSigner] as $s)
                <td>
                    <div class="role">{{ $s['role'] }}</div>
                    @if (($s['approval']->status ?? null) === 'approved')
                        <div class="verdict">Disetujui,</div>
                        <div class="space">&nbsp;</div>
                        <div><span class="name">{{ $s['approval']->approvedBy?->name ?? '—' }}</span></div>
                        <div class="date">{{ $s['approval']->approved_at?->locale('id')->translatedFormat('d F Y, H:i') }}</div>
                    @elseif (($s['approval']->status ?? null) === 'rejected')
                        <div class="verdict">Ditolak,</div>
                        <div class="space">&nbsp;</div>
                        <div><span class="name">{{ $s['approval']->approvedBy?->name ?? '—' }}</span></div>
                        <div class="date">{{ $s['approval']->approved_at?->locale('id')->translatedFormat('d F Y, H:i') }}</div>
                        @if ($s['approval']->notes)
                            <div class="note">Alasan: {{ $s['approval']->notes }}</div>
                        @endif
                    @else
                        <div class="verdict">&nbsp;</div>
                        <div class="space dots">. . . . . . . . . .</div>
                        <div>( Menunggu )</div>
                    @endif
                </td>
            @endforeach
        </tr>
    </table>

    <div class="foot">Dicetak dari sistem pada {{ $printedAt }}</div>
</body>
</html>
