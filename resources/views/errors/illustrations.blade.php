{{-- resources/views/errors/illustrations.blade.php --}}
@php
    $type = $name ?? '404';
@endphp

@if ($type === '403')
{{-- 403: Akses Ditolak (Security / Locked Unit Door & Keycard) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <defs>
        <linearGradient id="wallGrad403" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F8FAFC" />
            <stop offset="100%" stop-color="#EDF2F7" />
        </linearGradient>
        <linearGradient id="doorGrad403" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1E293B" />
            <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
        <linearGradient id="shieldGrad403" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#D97706" />
        </linearGradient>
        <filter id="shadow403" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.12" />
        </filter>
    </defs>

    <!-- Perspective Floor & Wall Lines -->
    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
    <path d="M120 420 L80 470" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round" />
    <path d="M300 420 L270 470" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round" />
    <path d="M480 420 L490 470" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round" />

    <!-- Architectural Background Wall Details -->
    <rect x="70" y="80" width="110" height="180" rx="4" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="2" />
    <line x1="70" y1="140" x2="180" y2="140" stroke="#E2E8F0" stroke-width="2" />
    <line x1="125" y1="80" x2="125" y2="260" stroke="#E2E8F0" stroke-width="2" />

    <!-- Mall Security Camera Mounted on Top Left -->
    <rect x="130" y="45" width="30" height="8" rx="2" fill="#64748B" />
    <path d="M145 53 L145 65" stroke="#64748B" stroke-width="4" stroke-linecap="round" />
    <path d="M130 65 L175 75 L165 95 L120 85 Z" fill="#334155" />
    <circle cx="168" cy="85" r="5" fill="#EF4444" />

    <!-- Unit Door Frame & Door -->
    <rect x="230" y="90" width="160" height="330" rx="4" fill="#334155" filter="url(#shadow403)" />
    <rect x="240" y="100" width="140" height="320" rx="2" fill="url(#doorGrad403)" />
    <line x1="240" y1="100" x2="240" y2="420" stroke="#475569" stroke-width="3" />

    <!-- Room Plaque "403" -->
    <rect x="180" y="150" width="44" height="34" rx="4" fill="#1E293B" stroke="#475569" stroke-width="2" />
    <text x="202" y="172" fill="#F8FAFC" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">403</text>

    <!-- Keycard Scanner Box with Red LED -->
    <rect x="365" y="240" width="22" height="38" rx="4" fill="#0F172A" stroke="#475569" stroke-width="2" />
    <circle cx="376" cy="248" r="3" fill="#EF4444" />
    <rect x="371" y="258" width="10" height="12" rx="1" fill="#334155" />

    <!-- Door Handle -->
    <rect x="250" y="245" width="24" height="8" rx="2" fill="#94A3B8" />
    <rect x="248" y="240" width="6" height="18" rx="1" fill="#CBD5E1" />

    <!-- Yellow Traffic Safety Cone -->
    <polygon points="175,420 195,420 188,375 182,375" fill="#F59E0B" />
    <polygon points="181,385 189,385 187,375 183,375" fill="#FFFFFF" />
    <polygon points="178,405 192,405 190,395 180,395" fill="#FFFFFF" />
    <rect x="170" y="418" width="30" height="4" rx="1" fill="#D97706" />

    <!-- Big Center Floating Security Shield (Forbidden Emblem) -->
    <g transform="translate(390, 140)" filter="url(#shadow403)">
        <circle cx="50" cy="50" r="54" fill="#FEF3C7" opacity="0.6" />
        <path d="M50 15 L85 28 C85 65 70 95 50 105 C30 95 15 65 15 28 Z" fill="url(#shieldGrad403)" stroke="#FFFFFF" stroke-width="3" />
        <!-- Lock icon inside shield -->
        <rect x="37" y="52" width="26" height="22" rx="4" fill="#FFFFFF" />
        <path d="M42 52 V44 C42 39.5 45.5 36 50 36 C54.5 36 58 39.5 58 44 V52" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <circle cx="50" cy="62" r="2.5" fill="#D97706" />
        <line x1="50" y1="64.5" x2="50" y2="69" stroke="#D97706" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Restricted Access Ribbon / Tag -->
    <rect x="365" y="280" width="130" height="28" rx="6" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5" filter="url(#shadow403)" />
    <text x="430" y="298" fill="#DC2626" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">AKSES TERBATAS</text>

    <!-- Subtle Potted Plant in Corner -->
    <path d="M480 380 Q485 320 520 300 Q515 340 490 380 Z" fill="#64748B" opacity="0.4" />
    <path d="M485 380 Q495 330 470 290 Q475 340 482 380 Z" fill="#94A3B8" opacity="0.5" />
    <polygon points="468,380 498,380 493,420 473,420" fill="#CBD5E1" />
</svg>

@elseif ($type === '500')
{{-- 500: Server Error / Gangguan Sistem (Server Rack & Technical Engineering) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <defs>
        <linearGradient id="serverGrad500" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1E293B" />
            <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
        <linearGradient id="warningGrad500" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#EF4444" />
            <stop offset="100%" stop-color="#B91C1C" />
        </linearGradient>
        <filter id="shadow500" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.12" />
        </filter>
    </defs>

    <!-- Floor Perspective Line -->
    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
    <path d="M120 420 L80 470" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round" />
    <path d="M480 420 L490 470" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round" />

    <!-- Big Server Rack Tower in Mall Data/Control Room -->
    <rect x="180" y="80" width="220" height="340" rx="8" fill="url(#serverGrad500)" stroke="#334155" stroke-width="3" filter="url(#shadow500)" />
    
    <!-- Server Unit Trays -->
    @for ($i = 0; $i < 5; $i++)
        @php $y = 110 + ($i * 55); @endphp
        <rect x="200" y="{{ $y }}" width="180" height="42" rx="4" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
        <circle cx="215" cy="{{ $y + 21 }}" r="4" fill="{{ $i === 2 ? '#EF4444' : ($i === 3 ? '#F59E0B' : '#10B981') }}" />
        <circle cx="230" cy="{{ $y + 21 }}" r="4" fill="#64748B" />
        <rect x="250" y="{{ $y + 17 }}" width="70" height="8" rx="2" fill="#334155" />
        <!-- Ventilation Grille -->
        <line x1="335" y1="{{ $y + 14 }}" x2="335" y2="{{ $y + 28 }}" stroke="#475569" stroke-width="2" />
        <line x1="343" y1="{{ $y + 14 }}" x2="343" y2="{{ $y + 28 }}" stroke="#475569" stroke-width="2" />
        <line x1="351" y1="{{ $y + 14 }}" x2="351" y2="{{ $y + 28 }}" stroke="#475569" stroke-width="2" />
        <line x1="359" y1="{{ $y + 14 }}" x2="359" y2="{{ $y + 28 }}" stroke="#475569" stroke-width="2" />
    @endfor

    <!-- Wires / Cables Running Down -->
    <path d="M220 375 Q210 420 160 420" stroke="#3B82F6" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M230 375 Q235 425 280 420" stroke="#F59E0B" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M360 375 Q380 420 440 420" stroke="#EF4444" stroke-width="4" fill="none" stroke-linecap="round" />

    <!-- Engineering Toolbox on Floor -->
    <rect x="100" y="375" width="55" height="45" rx="4" fill="#DC2626" stroke="#991B1B" stroke-width="2" />
    <rect x="115" y="367" width="25" height="8" rx="2" fill="#475569" />
    <rect x="98" y="390" width="59" height="6" fill="#B91C1C" />

    <!-- Floating Large Warning / Error Triangle Badge -->
    <g transform="translate(370, 110)" filter="url(#shadow500)">
        <polygon points="50,15 95,95 5,95" fill="url(#warningGrad500)" stroke="#FFFFFF" stroke-width="3" />
        <circle cx="50" cy="55" r="42" fill="#FEE2E2" opacity="0.3" />
        <!-- Exclamation mark inside triangle -->
        <rect x="47" y="42" width="6" height="26" rx="3" fill="#FFFFFF" />
        <circle cx="50" cy="78" r="4" fill="#FFFFFF" />
    </g>

    <!-- Cloud Diagnostic Wave on Left -->
    <g transform="translate(60, 160)" opacity="0.85">
        <rect x="0" y="0" width="100" height="60" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
        <circle cx="20" cy="20" r="6" fill="#F59E0B" />
        <line x1="35" y1="20" x2="80" y2="20" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round" />
        <line x1="15" y1="38" x2="65" y2="38" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round" />
    </g>
</svg>

@elseif ($type === '419')
{{-- 419: Sesi Kedaluwarsa (Time Out / Clock & Expired Token) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <defs>
        <linearGradient id="clockGrad419" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F8FAFC" />
            <stop offset="100%" stop-color="#E2E8F0" />
        </linearGradient>
        <filter id="shadow419" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.12" />
        </filter>
    </defs>

    <!-- Perspective Floor Line -->
    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />

    <!-- Office Desk Silhouette -->
    <rect x="100" y="360" width="380" height="15" rx="3" fill="#334155" />
    <rect x="140" y="375" width="16" height="45" fill="#475569" />
    <rect x="424" y="375" width="16" height="45" fill="#475569" />

    <!-- Coffee Mug on Desk -->
    <rect x="150" y="325" width="26" height="35" rx="3" fill="#0284C7" />
    <path d="M176 333 C184 333 184 347 176 347" stroke="#0284C7" stroke-width="3" fill="none" />
    <!-- Steam -->
    <path d="M158 318 Q162 310 158 305" stroke="#94A3B8" stroke-width="1.5" fill="none" stroke-linecap="round" />
    <path d="M166 318 Q170 310 166 305" stroke="#94A3B8" stroke-width="1.5" fill="none" stroke-linecap="round" />

    <!-- Big Center Clock Indicating Timeout -->
    <g transform="translate(290, 200)" filter="url(#shadow419)">
        <circle cx="0" cy="0" r="110" fill="url(#clockGrad419)" stroke="#0F1E36" stroke-width="8" />
        <circle cx="0" cy="0" r="95" fill="#FFFFFF" />
        
        <!-- Hour Markers -->
        <circle cx="0" cy="-80" r="3" fill="#0F1E36" />
        <circle cx="80" cy="0" r="3" fill="#0F1E36" />
        <circle cx="0" cy="80" r="3" fill="#0F1E36" />
        <circle cx="-80" cy="0" r="3" fill="#0F1E36" />

        <!-- Clock Hands pointing to expired time -->
        <line x1="0" y1="0" x2="0" y2="-55" stroke="#0F1E36" stroke-width="6" stroke-linecap="round" />
        <line x1="0" y1="0" x2="45" y2="25" stroke="#EF4444" stroke-width="4" stroke-linecap="round" />
        <circle cx="0" cy="0" r="7" fill="#0F1E36" />
    </g>

    <!-- Floating Circular Refresh Arrows badge -->
    <g transform="translate(400, 110)" filter="url(#shadow419)">
        <circle cx="35" cy="35" r="36" fill="#F59E0B" />
        <path d="M35 18 C45 18 52 25 52 35 C52 40 50 44 46 47" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <polygon points="50,14 55,24 43,21" fill="#FFFFFF" />
        <path d="M35 52 C25 52 18 45 18 35 C18 30 20 26 24 23" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <polygon points="20,56 15,46 27,49" fill="#FFFFFF" />
    </g>
</svg>

@elseif ($type === '429')
{{-- 429: Batas Permintaan Terlampaui (Rate Limit / Speedometer) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <defs>
        <filter id="shadow429" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.12" />
        </filter>
    </defs>

    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />

    <!-- Big Center Speedometer Gauge -->
    <g transform="translate(300, 260)" filter="url(#shadow429)">
        <!-- Outer Gauge Arc -->
        <path d="M-120 40 A 130 130 0 1 1 120 40" stroke="#E2E8F0" stroke-width="24" stroke-linecap="round" fill="none" />
        <!-- Normal Zone Green Arc -->
        <path d="M-120 40 A 130 130 0 0 1 -40 -124" stroke="#10B981" stroke-width="24" stroke-linecap="round" fill="none" />
        <!-- Warning Zone Amber Arc -->
        <path d="M-40 -124 A 130 130 0 0 1 40 -124" stroke="#F59E0B" stroke-width="24" fill="none" />
        <!-- Danger / Limit Zone Red Arc -->
        <path d="M40 -124 A 130 130 0 0 1 120 40" stroke="#EF4444" stroke-width="24" stroke-linecap="round" fill="none" />

        <!-- Gauge Needle in Red Zone -->
        <line x1="0" y1="0" x2="85" y2="-45" stroke="#0F1E36" stroke-width="7" stroke-linecap="round" />
        <circle cx="0" cy="0" r="18" fill="#0F1E36" />
        <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
    </g>

    <!-- Stop / Wait Hand Icon Badge -->
    <g transform="translate(380, 110)" filter="url(#shadow429)">
        <circle cx="35" cy="35" r="35" fill="#EF4444" />
        <path d="M26 23 V36 M32 20 V36 M38 22 V36 M44 26 V36" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
        <path d="M23 29 C23 45 47 48 47 36" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" />
    </g>
</svg>

@elseif ($type === '503')
{{-- 503: Pemeliharaan Sistem (Fitout / Under Maintenance Barricade) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <defs>
        <pattern id="hazardStripe" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="14" height="28" fill="#F59E0B" />
            <rect x="14" width="14" height="28" fill="#1E293B" />
        </pattern>
        <filter id="shadow503" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.12" />
        </filter>
    </defs>

    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />

    <!-- Unit Glass Front / Renovation Glass -->
    <rect x="100" y="80" width="400" height="340" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
    <!-- Diagonal Tape Across Glass -->
    <line x1="100" y1="80" x2="500" y2="420" stroke="#E2E8F0" stroke-width="3" stroke-dasharray="8 8" />
    <line x1="500" y1="80" x2="100" y2="420" stroke="#E2E8F0" stroke-width="3" stroke-dasharray="8 8" />

    <!-- Construction Safety Cone Left -->
    <polygon points="125,420 165,420 152,330 138,330" fill="#F59E0B" />
    <polygon points="135,360 155,360 152,340 138,340" fill="#FFFFFF" />
    <polygon points="130,395 160,395 157,375 133,375" fill="#FFFFFF" />
    <rect x="120" y="416" width="50" height="6" rx="2" fill="#D97706" />

    <!-- Construction Safety Cone Right -->
    <polygon points="435,420 475,420 462,330 448,330" fill="#F59E0B" />
    <polygon points="445,360 465,360 462,340 448,340" fill="#FFFFFF" />
    <polygon points="440,395 470,395 467,375 443,375" fill="#FFFFFF" />
    <rect x="430" y="416" width="50" height="6" rx="2" fill="#D97706" />

    <!-- Heavy Duty Mall Barrier Bar Across Unit -->
    <g filter="url(#shadow503)">
        <!-- Left Leg -->
        <rect x="180" y="270" width="16" height="150" fill="#475569" />
        <polygon points="160,420 216,420 196,400 180,400" fill="#334155" />
        <!-- Right Leg -->
        <rect x="404" y="270" width="16" height="150" fill="#475569" />
        <polygon points="384,420 440,420 420,400 404,400" fill="#334155" />

        <!-- Hazard Striped Top Board -->
        <rect x="150" y="270" width="300" height="42" rx="4" fill="url(#hazardStripe)" stroke="#0F172A" stroke-width="2" />
        <!-- Hazard Striped Bottom Board -->
        <rect x="150" y="335" width="300" height="32" rx="4" fill="url(#hazardStripe)" stroke="#0F172A" stroke-width="2" />
    </g>

    <!-- Signboard "DALAM PEMELIHARAAN" Hanging from Barrier -->
    <g transform="translate(230, 160)" filter="url(#shadow503)">
        <rect x="0" y="0" width="140" height="85" rx="6" fill="#FFFFFF" stroke="#0F1E36" stroke-width="3" />
        <circle cx="70" cy="30" r="16" fill="#EFF6FF" />
        <path d="M63 35 L77 25 M65 25 L75 35" stroke="#2563EB" stroke-width="3" stroke-linecap="round" />
        <text x="70" y="62" fill="#0F1E36" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle">PEMELIHARAAN</text>
        <text x="70" y="74" fill="#64748B" font-size="8" font-weight="600" font-family="sans-serif" text-anchor="middle">SISTEM MALL</text>
    </g>
</svg>

@else
{{-- 404 (Vector Fallback if Image not used or previewed) --}}
<svg viewBox="0 0 600 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
    <path d="M40 420 L560 420" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
    <rect x="230" y="90" width="160" height="330" rx="4" fill="#1E293B" />
    <rect x="180" y="150" width="44" height="34" rx="4" fill="#0F172A" stroke="#475569" stroke-width="2" />
    <text x="202" y="172" fill="#F8FAFC" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">404</text>
    <circle cx="440" cy="200" r="45" fill="#EFF6FF" stroke="#2563EB" stroke-width="3" />
    <text x="440" y="215" fill="#2563EB" font-size="42" font-weight="bold" font-family="sans-serif" text-anchor="middle">?</text>
</svg>
@endif

