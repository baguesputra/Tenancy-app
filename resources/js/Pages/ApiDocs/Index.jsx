import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ApiSidebar from '@/Components/ApiDocs/ApiSidebar';
import CodeBlock from '@/Components/ApiDocs/CodeBlock';
import CopyButton from '@/Components/ApiDocs/CopyButton';
import EndpointCard from '@/Components/ApiDocs/EndpointCard';
import {
    IconArrowRight,
    IconChevronLeft,
    IconClipboardCheck,
    IconLock,
    IconSearch,
    IconX,
} from '@/Components/Icons';
import {
    API_BASE_PATH,
    ENDPOINT_GROUPS,
    ERROR_CODES,
    INTEGRATION_FLOWS,
    SAMPLE_AUTH_ERROR,
    SAMPLE_VALIDATION_ERROR,
    resolveEndpointPath,
} from './apiSpec';

const METHODS = ['ALL', 'GET', 'POST', 'PATCH', 'DELETE'];

const CONVENTIONS = [
    {
        label: 'Autentikasi',
        value: 'Authorization: Bearer {token}',
        hint: 'Token Sanctum via login atau SSO PKCE; webhook HCIS memakai HMAC X-HCIS-Signature.',
    },
    {
        label: 'Header Wajib',
        value: 'Accept: application/json',
        hint: 'Gunakan application/json untuk JSON, atau multipart/form-data saat unggah foto.',
    },
    {
        label: 'Batas Unggahan',
        value: 'Maks 5 MB / berkas foto',
        hint: 'Format gambar valid (JPG/PNG); checklist sidak dibatasi maks 3 foto per item.',
    },
];

const ERROR_TONE = {
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function matchesEndpoint(group, endpoint, search, methodFilter) {
    if (methodFilter !== 'ALL' && endpoint.method !== methodFilter) {
        return false;
    }
    if (!search) {
        return true;
    }

    const haystack = [
        group.title,
        endpoint.method,
        resolveEndpointPath(endpoint),
        endpoint.summary,
        endpoint.permission,
        endpoint.auth,
        endpoint.note,
        endpoint.warning,
        ...(endpoint.params || []).flatMap((p) => [p.name, p.desc]),
        endpoint.body ? JSON.stringify(endpoint.body) : '',
        endpoint.returns ? JSON.stringify(endpoint.returns) : '',
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return haystack.includes(search);
}

export default function Index() {
    const [origin, setOrigin] = useState('');
    const [activeSection, setActiveSection] = useState('mulai');
    const [query, setQuery] = useState('');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [openIds, setOpenIds] = useState(() => new Set(['auth-login']));
    const searchInputRef = useRef(null);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const search = query.trim().toLowerCase();
    const totalCount = useMemo(
        () => ENDPOINT_GROUPS.reduce((sum, group) => sum + group.endpoints.length, 0),
        [],
    );

    const visibleGroups = useMemo(
        () =>
            ENDPOINT_GROUPS.map((group) => ({
                ...group,
                endpoints: group.endpoints.filter((ep) => matchesEndpoint(group, ep, search, methodFilter)),
            })).filter((group) => group.endpoints.length > 0),
        [search, methodFilter],
    );

    const visibleEndpointIds = useMemo(
        () => visibleGroups.flatMap((group) => group.endpoints.map((ep) => ep.id)),
        [visibleGroups],
    );

    const visibleCount = visibleEndpointIds.length;
    const allVisibleOpen = visibleCount > 0 && visibleEndpointIds.every((id) => openIds.has(id));
    const hasActiveFilter = Boolean(search) || methodFilter !== 'ALL';
    const fullBaseUrl = origin ? `${origin}${API_BASE_PATH}` : API_BASE_PATH;

    useEffect(() => {
        const sectionIds = ['mulai', 'alur', ...visibleGroups.map((g) => g.id), 'kesalahan'];
        const updateActive = () => {
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48) {
                setActiveSection('kesalahan');
                return;
            }
            const current = sectionIds
                .map((id) => document.getElementById(id))
                .filter(Boolean)
                .filter((el) => el.getBoundingClientRect().top <= 140)
                .pop();
            setActiveSection(current?.id ?? 'mulai');
        };

        updateActive();
        window.addEventListener('scroll', updateActive, { passive: true });
        return () => window.removeEventListener('scroll', updateActive);
    }, [visibleGroups]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    function toggleEndpoint(id) {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function toggleAllVisible() {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (allVisibleOpen) {
                visibleEndpointIds.forEach((id) => next.delete(id));
            } else {
                visibleEndpointIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }

    function resetFilters() {
        setQuery('');
        setMethodFilter('ALL');
    }

    function scrollAfterRender(elementId) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    function jumpToEndpoint(endpointId) {
        if (!visibleEndpointIds.includes(endpointId)) {
            resetFilters();
        }
        setOpenIds((prev) => new Set(prev).add(endpointId));
        scrollAfterRender(`ep-${endpointId}`);
    }

    function jumpToGroup(groupId) {
        if (!visibleGroups.some((group) => group.id === groupId)) {
            resetFilters();
        }
        scrollAfterRender(groupId);
    }

    function focusSearchInput() {
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInputRef.current?.focus({ preventScroll: true });
    }

    const mobileSections = [
        { id: 'mulai', label: 'Mulai' },
        { id: 'alur', label: 'Alur' },
        ...visibleGroups.map((g) => ({ id: g.id, label: g.title })),
        { id: 'kesalahan', label: 'Kesalahan' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-[#182334]">
            <Head title="Dokumentasi API" />

            {/* Sticky Top Bar */}
            <header className="sticky top-0 z-30 border-b border-[#E2E5EA] bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E5EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                        >
                            <IconChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Dashboard</span>
                        </Link>

                        <span className="hidden h-4 w-px bg-[#E2E5EA] sm:block" aria-hidden="true" />

                        <div className="flex min-w-0 items-center gap-2">
                            <img
                                src="/images/logo.png"
                                alt="Logo"
                                className="hidden h-5 w-auto object-contain sm:block"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />
                            <span className="truncate text-sm font-semibold tracking-tight text-[#0F1E36]">
                                Dokumentasi API
                            </span>
                            <span className="rounded-md bg-[#0F1E36]/8 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#0F1E36]">
                                v1
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="hidden items-center gap-1.5 rounded-lg border border-[#E2E5EA] bg-slate-50 px-2.5 py-1 sm:flex">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Base</span>
                            <code className="font-mono text-xs font-medium text-[#0F1E36]">{API_BASE_PATH}</code>
                            <CopyButton
                                text={fullBaseUrl}
                                label="Salin"
                                ariaLabel={`Salin Base URL ${fullBaseUrl}`}
                                surface="subtle"
                                className="ml-1 !px-1.5 !py-0.5 text-[11px]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={focusSearchInput}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E5EA] bg-white px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] md:hidden"
                        >
                            <IconSearch className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cari</span>
                        </button>
                    </div>
                </div>

                {/* Mobile horizontal jump bar */}
                <div className="border-t border-slate-100 bg-white lg:hidden">
                    <nav aria-label="Navigasi bagian" className="no-scrollbar mx-auto flex max-w-[1400px] gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
                        {mobileSections.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    aria-current={isActive ? 'location' : undefined}
                                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#0F1E36] text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#0F1E36]'
                                    }`}
                                >
                                    {section.label}
                                </a>
                            );
                        })}
                    </nav>
                </div>
            </header>

            <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-10">
                <ApiSidebar
                    groups={ENDPOINT_GROUPS}
                    activeSection={activeSection}
                    onSelectGroup={jumpToGroup}
                    onSelectEndpoint={jumpToEndpoint}
                />

                <main className="min-w-0 space-y-12 pb-16">
                    {/* Hero & Conventions */}
                    <section id="mulai" className="scroll-mt-24 space-y-4">
                        <div className="relative overflow-hidden rounded-xl bg-[#0F1E36] px-6 py-7 text-white sm:px-8 sm:py-9">
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 opacity-[0.1]"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                                    backgroundSize: '32px 32px',
                                    maskImage: 'radial-gradient(ellipse 80% 80% at 85% 20%, black 20%, transparent 75%)',
                                    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 85% 20%, black 20%, transparent 75%)',
                                }}
                            />
                            <div className="relative max-w-2xl">
                                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B6B]" aria-hidden="true" />
                                    Referensi Pengembang · API v1
                                </p>
                                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                                    Integrasi Operasional Tenant, Sidak &amp; Security
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    Panduan kontrak endpoint REST untuk aplikasi mobile sidak lapangan, pemeriksaan fisik surat izin oleh Security, SSO PKCE, dan sinkronisasi karyawan HCIS.
                                </p>

                                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                                    <div className="inline-flex max-w-full items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                                            Base URL
                                        </span>
                                        <code className="truncate font-mono text-xs font-medium text-sky-200">
                                            {fullBaseUrl}
                                        </code>
                                        <CopyButton
                                            text={fullBaseUrl}
                                            label="Salin"
                                            surface="dark"
                                            className="!py-0.5 !px-2 text-[11px]"
                                        />
                                    </div>
                                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-300">
                                        {totalCount} endpoint terdokumentasi
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Hairline Ledger Conventions Strip */}
                        <dl className="grid gap-px overflow-hidden rounded-xl border border-[#E2E5EA] bg-[#E2E5EA] shadow-2xs sm:grid-cols-3">
                            {CONVENTIONS.map((item) => (
                                <div key={item.label} className="bg-white p-4 sm:p-5">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        {item.label}
                                    </dt>
                                    <dd className="mt-1.5 break-words font-mono text-xs font-semibold text-[#0F1E36]">
                                        {item.value}
                                    </dd>
                                    <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.hint}</p>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {/* Integration Workflows */}
                    <section id="alur" className="scroll-mt-24 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-[#0F1E36]">
                                Alur Integrasi Utama
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Klik salah satu langkah di bawah untuk langsung membuka referensi endpoint terkait.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {INTEGRATION_FLOWS.map((flow) => {
                                const Icon = flow.id === 'sidak' ? IconClipboardCheck : IconLock;
                                const accentClass =
                                    flow.accent === 'sky'
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                return (
                                    <div
                                        key={flow.id}
                                        className="rounded-xl border border-[#E2E5EA] bg-white p-5 shadow-2xs"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accentClass}`}>
                                                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-semibold text-[#0F1E36]">{flow.title}</h3>
                                                <p className="mt-0.5 text-xs text-slate-500">{flow.subtitle}</p>
                                            </div>
                                        </div>

                                        <ol className="mt-4 space-y-1.5">
                                            {flow.steps.map((step, index) => (
                                                <li key={step.endpointId}>
                                                    <button
                                                        type="button"
                                                        onClick={() => jumpToEndpoint(step.endpointId)}
                                                        className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-[#E2E5EA] hover:bg-slate-50 hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                                    >
                                                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold text-slate-600 group-hover:bg-[#0F1E36] group-hover:text-white">
                                                            {index + 1}
                                                        </span>
                                                        <span className="flex-1">{step.label}</span>
                                                        <IconArrowRight
                                                            className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F1E36]"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Search & Filter Toolbar */}
                    <section aria-label="Pencarian dan filter endpoint" className="space-y-4">
                        <div className="rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-2xs space-y-3.5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <IconSearch
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                        aria-hidden="true"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        id="endpoint-search"
                                        type="text"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                if (query) {
                                                    setQuery('');
                                                } else {
                                                    event.currentTarget.blur();
                                                }
                                            }
                                        }}
                                        placeholder="Cari path, deskripsi, izin (mis. sidak.manage), atau nama field..."
                                        aria-label="Cari endpoint"
                                        className="w-full rounded-lg border border-[#E2E5EA] bg-slate-50/70 py-2 pl-9 pr-16 text-sm text-[#0F1E36] placeholder:text-slate-400 focus:border-[#0F1E36] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/10"
                                    />
                                    {query ? (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            aria-label="Hapus pencarian"
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                                        >
                                            <IconX className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    ) : (
                                        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[#E2E5EA] bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 sm:inline-block">
                                            /
                                        </kbd>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter metode HTTP">
                                    {METHODS.map((method) => {
                                        const isActive = methodFilter === method;
                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                aria-pressed={isActive}
                                                onClick={() => setMethodFilter(method)}
                                                className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    isActive
                                                        ? 'bg-[#0F1E36] text-white'
                                                        : 'border border-[#E2E5EA] bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0F1E36]'
                                                }`}
                                            >
                                                {method === 'ALL' ? 'Semua' : method}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                                <p role="status" className="text-slate-500">
                                    {hasActiveFilter ? (
                                        <>
                                            Menampilkan <span className="font-semibold text-[#0F1E36]">{visibleCount}</span> dari {totalCount} endpoint
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold text-[#0F1E36]">{totalCount}</span> endpoint tersedia · klik baris untuk membuka skema &amp; contoh
                                        </>
                                    )}
                                </p>

                                <div className="flex items-center gap-2">
                                    {hasActiveFilter && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-[#0F1E36]"
                                        >
                                            Reset filter
                                        </button>
                                    )}
                                    {visibleCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={toggleAllVisible}
                                            className="rounded-md border border-[#E2E5EA] bg-slate-50 px-2.5 py-1 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-[#0F1E36]"
                                        >
                                            {allVisibleOpen ? 'Tutup semua' : 'Buka semua'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {visibleGroups.length === 0 && (
                            <div className="rounded-xl border border-[#E2E5EA] bg-white px-6 py-10 text-center">
                                <IconSearch className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                                <p className="mt-3 text-sm font-semibold text-[#0F1E36]">
                                    Tidak ada endpoint yang cocok
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Coba kata kunci lain atau ubah filter metode HTTP.
                                </p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="mt-4 rounded-lg bg-[#0F1E36] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1a2f52]"
                                >
                                    Reset pencarian &amp; filter
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Endpoint Groups */}
                    {visibleGroups.map((group) => (
                        <section id={group.id} key={group.id} className="scroll-mt-24 space-y-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-lg font-semibold tracking-tight text-[#0F1E36]">
                                        {group.title}
                                    </h2>
                                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-700">
                                        {group.endpoints.length}
                                    </span>
                                </div>
                                {group.permissionSummary && (
                                    <span className="font-mono text-[11px] text-slate-500">
                                        {group.permissionSummary}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{group.note}</p>

                            <div className="divide-y divide-[#E2E5EA] overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-2xs">
                                {group.endpoints.map((ep) => (
                                    <EndpointCard
                                        key={ep.id}
                                        endpoint={ep}
                                        isOpen={openIds.has(ep.id)}
                                        onToggle={toggleEndpoint}
                                        origin={origin}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    {/* Error Reference */}
                    <section id="kesalahan" className="scroll-mt-24 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-[#0F1E36]">
                                Kode Status &amp; Penanganan Kesalahan
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Seluruh respons kesalahan mengembalikan JSON dengan properti <code className="font-mono text-xs font-semibold text-[#0F1E36]">message</code>; kesalahan validasi turut menyertakan objek <code className="font-mono text-xs font-semibold text-[#0F1E36]">errors</code>.
                            </p>
                        </div>

                        <dl className="divide-y divide-[#E2E5EA] overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-2xs">
                            {ERROR_CODES.map((err) => (
                                <div key={err.code} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
                                    <dt className="flex shrink-0 items-center gap-2 sm:w-48">
                                        <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${ERROR_TONE[err.tone]}`}>
                                            {err.code}
                                        </span>
                                        <span className="text-xs font-semibold text-[#0F1E36]">{err.label}</span>
                                    </dt>
                                    <dd className="text-sm leading-6 text-slate-600">{err.desc}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <CodeBlock
                                title="Contoh Error Validasi"
                                badge="422 Unprocessable"
                                badgeTone="warning"
                                content={SAMPLE_VALIDATION_ERROR}
                            />
                            <CodeBlock
                                title="Contoh Error Otorisasi"
                                badge="403 Forbidden"
                                badgeTone="neutral"
                                content={SAMPLE_AUTH_ERROR}
                            />
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
