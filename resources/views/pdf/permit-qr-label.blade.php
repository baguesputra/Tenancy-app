<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        body {
            font-family: sans-serif;
            margin: 0;
            padding: 0;
        }
        .page {
            width: 100%;
            text-align: center;
            page-break-after: always;
            padding-top: 40px;
        }
        .brand {
            font-size: 14px;
            color: #0F1E36;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 20px;
        }
        .permit-number {
            font-size: 28px;
            font-weight: bold;
            color: #0F1E36;
            margin-bottom: 6px;
        }
        .store-name {
            font-size: 16px;
            color: #475569;
            margin-bottom: 6px;
        }
        .schedule {
            font-size: 12px;
            color: #475569;
            margin-bottom: 20px;
        }
        .qr-wrapper {
            margin-bottom: 20px;
        }
        .qr-wrapper img {
            width: 220px;
            height: 220px;
            border: 2px solid #E2E5EA;
        }
        .instruction {
            font-size: 14px;
            color: #475569;
            margin-bottom: 40px;
        }
        .footer {
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #E2E5EA;
            padding-top: 12px;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="brand">DUTA MALL</div>
        <div class="permit-number">{{ $permit->permit_number }}</div>
        <div class="store-name">{{ $permit->store_name_snapshot }}</div>
        <div class="schedule">{{ $permit->job_type ?? 'Kegiatan' }} — {{ $permit->work_start_date?->format('d M Y') ?? '—' }}</div>

        <div class="qr-wrapper">
            @if ($permit->scanUrl)
                <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(220)->generate($permit->scanUrl)) }}" width="220" height="220" alt="QR {{ $permit->permit_number }}">
            @endif
        </div>

        <div class="instruction">Tunjukkan ke Security untuk scan saat cek fisik</div>

        <div class="footer">
            Dicetak {{ now()->format('d M Y') }}
        </div>
    </div>
</body>
</html>
