<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <meta name="referrer" content="no-referrer">
    <link rel="icon" href="/favicon.ico">
    <link rel="icon" type="image/png" href="/images/ikon.png">
    <title>@yield('error_label', 'Error ' . $__env->yieldContent('code')) — {{ config('app.name', 'Tenant Management System') }}</title>
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
            overflow: hidden;
            background: #FFFFFF;
            color: #0F1E36;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: clamp(1.75rem, 5vh, 4rem) 1.5rem 1.5rem;
        }

        .error-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            text-align: center;
            width: 100%;
            max-width: 720px;
        }

        /* Brand Bar Header */
        .brand-bar {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: clamp(0.875rem, 2vh, 1.5rem);
            text-decoration: none;
            transition: opacity 0.15s ease;
        }

        .brand-bar:hover {
            opacity: 0.85;
        }

        .brand-logo {
            height: 2.25rem;
            width: auto;
            object-fit: contain;
        }

        .brand-divider {
            height: 1.25rem;
            width: 1px;
            background: #CBD5E1;
        }

        .brand-name {
            font-size: 0.875rem;
            font-weight: 800;
            color: #0F1E36;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        /* Illustration Hero Stage */
        .illustration-stage {
            position: relative;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            user-select: none;
            -webkit-user-drag: none;
            cursor: pointer;
            transition: transform 0.2s ease;
            background: transparent;
            border: none;
            outline: none;
        }

        .illustration-stage:hover {
            transform: scale(1.015);
        }

        .illustration-img {
            height: clamp(300px, 62vh, 580px);
            width: auto;
            max-width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: contain;
            display: block;
            pointer-events: none;
            mix-blend-mode: multiply;
            border: none;
            outline: none;
            box-shadow: none;
        }

        .error-svg {
            height: clamp(300px, 62vh, 580px);
            width: auto;
            max-width: 100%;
            aspect-ratio: 1 / 1;
            display: block;
            pointer-events: none;
            mix-blend-mode: multiply;
        }

        /* Overlaid Formal 3D Black Text */
        .code-overlay {
            position: absolute;
            bottom: clamp(0.75rem, 3.5%, 1.75rem);
            left: 50%;
            transform: translateX(-50%);
            font-size: clamp(2.5rem, 6vw, 4.25rem);
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.025em;
            color: #0F172A;
            text-align: center;
            white-space: nowrap;
            text-transform: uppercase;
            text-shadow: 
                0 1px 0 #CBD5E1,
                0 2px 0 #94A3B8,
                0 3px 0 #64748B,
                0 4px 6px rgba(15, 23, 42, 0.24),
                0 8px 16px rgba(15, 23, 42, 0.16);
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="error-wrapper">
        <!-- Header: Duta Mall Tenant Management System -->
        <a href="{{ auth()->check() ? route('dashboard') : url('/') }}" class="brand-bar" title="Kembali ke Dashboard">
            @php
                $logoPath = public_path('images/logo.png');
            @endphp
            @if(is_file($logoPath))
                <img src="/images/logo.png" alt="Duta Mall" class="brand-logo">
            @endif
            <span class="brand-name">Tenant Management System</span>
        </a>

        <!-- Hero Stage: Enlarged Illustration + Overlaid Formal 3D Code -->
        <a href="{{ auth()->check() ? route('dashboard') : url('/') }}" class="illustration-stage" title="Kembali ke Dashboard">
            @yield('illustration')
            <div class="code-overlay">@yield('error_label')</div>
        </a>
    </div>
</body>
</html>
