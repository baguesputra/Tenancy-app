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
            padding-top: 50px;
        }
        .brand {
            font-size: 14px;
            color: #0F1E36;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 30px;
        }
        .unit-code {
            font-size: 48px;
            font-weight: bold;
            color: #0F1E36;
            margin-bottom: 8px;
        }
        .tenant-name {
            font-size: 20px;
            color: #475569;
            margin-bottom: 30px;
        }
        .qr-wrapper {
            margin-bottom: 25px;
        }
        .qr-wrapper img {
            width: 220px;
            height: 220px;
            border: 2px solid #E2E5EA;
        }
        .instruction {
            font-size: 14px;
            color: #475569;
            margin-bottom: 50px;
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
    @foreach ($units as $unit)
        <div class="page">
            <div class="brand">DUTA MALL</div>
            <div class="unit-code">{{ $unit->unit_code }}</div>
            <div class="tenant-name">{{ $unit->activeTenancy?->tenant?->name ?? 'Unit Kosong' }}</div>

            <div class="qr-wrapper">
                @if ($unit->scanUrl)
                    <img src="data:image/svg+xml;base64,{{ base64_encode((string) QrCode::size(220)->generate($unit->scanUrl)) }}" width="220" height="220" alt="QR {{ $unit->unit_code }}">
                @endif
            </div>

            <div class="instruction">Scan untuk Sidak &amp; Surat Izin</div>

            <div class="footer">
                {{ $unit->branch->name }} — Dicetak {{ now()->format('d M Y') }}
            </div>
        </div>
    @endforeach
</body>
</html>
