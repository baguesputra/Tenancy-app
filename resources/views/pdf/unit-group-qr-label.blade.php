<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; margin: 0; padding: 0; color: #0F1E36; background: #ffffff; }
        .page { border: 1px solid #E2E5EA; border-radius: 16px; overflow: hidden; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .header { background: #0F1E36; color: #ffffff; text-align: center; padding: 18px 16px 16px; }
        .brand { font-size: 17px; font-weight: bold; letter-spacing: 3px; }
        .sub { font-size: 9px; color: #B9C2D0; letter-spacing: 2px; margin-top: 2px; }
        .tag { display: inline-block; font-size: 9px; font-weight: bold; letter-spacing: 1.5px; color: #ffffff; background: #0EA5A4; border-radius: 12px; padding: 5px 14px; margin-top: 10px; }
        .hero { background: #F7F8FA; border-bottom: 1px solid #E2E5EA; padding: 14px 16px 12px; text-align: center; }
        .code { font-size: 30px; font-weight: bold; font-family: monospace; letter-spacing: 2px; }
        .tenant { font-size: 12px; color: #475569; margin-top: 3px; }
        .content { padding: 16px 20px 14px; }
        .qr-wrap { text-align: center; }
        .qr-box { display: inline-block; border: 2px solid #0F1E36; border-radius: 12px; padding: 8px; }
        .qr-box img { width: 168px; height: 168px; }
        .info { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 14px; }
        .info td { width: 33.33%; padding: 0 4px; vertical-align: top; }
        .info td.first { padding-left: 0; }
        .info td.last { padding-right: 0; }
        .ibox { background: #F7F8FA; border: 1px solid #E2E5EA; border-radius: 10px; padding: 8px 6px; text-align: center; }
        .ilabel { font-size: 8px; color: #94a3b8; letter-spacing: 1.5px; }
        .ivalue { font-size: 11px; font-weight: bold; color: #0F1E36; margin-top: 3px; }
        .members { margin-top: 12px; border: 1px solid #E2E5EA; border-radius: 10px; padding: 9px 12px; font-size: 10px; color: #475569; }
        .members b { color: #0F1E36; }
        .instruction { margin-top: 14px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; border-radius: 10px; font-size: 10px; font-weight: bold; letter-spacing: 1px; text-align: center; padding: 9px 10px; }
        .footer { margin-top: 12px; border-top: 1px solid #E2E5EA; padding-top: 7px; font-size: 8.5px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    @foreach ($groups as $group)
        @php
            $unitCodes = $group->units->pluck('unit_code')->implode(', ');
            $totalSize = $group->size ?? $group->units->sum('size');
            $tenantName = $group->activeTenancy?->tenant?->name ?? 'Area Kosong';
        @endphp
        <div class="page">
            <div class="header">
                <div class="brand">DUTA MALL</div>
                <div class="sub">MANAJEMEN TENANT</div>
                <div><span class="tag">QR AREA GABUNGAN</span></div>
            </div>

            <div class="hero">
                <div class="code">{{ strtoupper($group->code ?: $group->name) }}</div>
                <div class="tenant">{{ $group->name }} · {{ $tenantName }}</div>
            </div>

            <div class="content">
                <div class="qr-wrap">
                    <div class="qr-box">
                        @if ($group->scanUrl)
                            <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(220)->generate($group->scanUrl)) }}" alt="QR {{ $group->name }}">
                        @endif
                    </div>
                </div>

                <table class="info">
                    <tr>
                        <td class="first">
                            <div class="ibox">
                                <div class="ilabel">UNIT ANGGOTA</div>
                                <div class="ivalue">{{ $group->units->count() }} unit</div>
                            </div>
                        </td>
                        <td>
                            <div class="ibox">
                                <div class="ilabel">LUAS / CABANG</div>
                                <div class="ivalue">{{ $totalSize ? $totalSize.' m²' : '—' }} · {{ $group->branch?->name ?? '—' }}</div>
                            </div>
                        </td>
                        <td class="last">
                            <div class="ibox">
                                <div class="ilabel">STATUS</div>
                                <div class="ivalue">{{ $group->is_active ? 'Aktif' : 'Nonaktif' }}</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <div class="members"><b>Unit:</b> {{ $unitCodes ?: '—' }}</div>

                <div class="instruction">SCAN UNTUK SIDAK &amp; SURAT IZIN AREA</div>

                <div class="footer">{{ $group->branch?->name ?? '' }} — Dicetak {{ now()->format('d M Y') }}</div>
            </div>
        </div>
    @endforeach
</body>
</html>
