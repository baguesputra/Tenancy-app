import { IconAlert, IconChevronDown, IconLock } from '@/Components/Icons';
import { resolveEndpointPath } from '@/Pages/ApiDocs/apiSpec';
import CodeBlock from './CodeBlock';
import CopyButton from './CopyButton';

export const METHOD_STYLES = {
    GET: 'bg-sky-50 text-sky-700 border-sky-200',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PATCH: 'bg-amber-50 text-amber-800 border-amber-200',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

const IN_LABELS = {
    path: 'path',
    query: 'query',
    body: 'json',
    form: 'multipart',
};

/**
 * Menyorot parameter path seperti {session} agar mudah dipindai.
 */
function HighlightedPath({ path }) {
    const segments = path.split(/(\{[^}]+\})/g);

    return (
        <code className="min-w-0 break-all font-mono text-[13px] font-semibold text-[#0F1E36]">
            {segments.map((segment, index) => (
                segment.startsWith('{') && segment.endsWith('}') ? (
                    <span
                        key={`${segment}-${index}`}
                        className="mx-0.5 rounded bg-sky-50 px-1 py-0.5 text-sky-800 ring-1 ring-inset ring-sky-200"
                    >
                        {segment}
                    </span>
                ) : (
                    <span key={`${segment}-${index}`}>{segment}</span>
                )
            ))}
        </code>
    );
}

/**
 * Menyusun contoh perintah cURL sesuai metode, header, auth, dan body endpoint.
 */
function buildCurlSnippet(endpoint, origin) {
    const path = resolveEndpointPath(endpoint);
    const url = `${origin || 'https://tenant.appdutamall.com'}${path}`;
    const lines = [`curl -X ${endpoint.method} "${url}"`];

    lines.push('  -H "Accept: application/json"');

    if (endpoint.auth === 'Bearer') {
        lines.push('  -H "Authorization: Bearer {token}"');
    } else if (endpoint.auth === 'HMAC') {
        lines.push('  -H "X-HCIS-Signature: {hmac_sha256_hex}"');
    }

    if (endpoint.contentType === 'multipart/form-data' && endpoint.body) {
        Object.entries(endpoint.body).forEach(([key, value]) => {
            if (String(value).startsWith('(file')) {
                lines.push(`  -F "${key}=@/path/to/photo.jpg"`);
            } else if (value !== null && value !== undefined) {
                lines.push(`  -F "${key}=${value}"`);
            }
        });
    } else if (endpoint.body) {
        lines.push('  -H "Content-Type: application/json"');
        lines.push(`  -d '${JSON.stringify(endpoint.body)}'`);
    }

    return lines.join(' \\\n');
}

const STATUS_LABELS = {
    200: '200 OK',
    201: '201 Created',
    302: '302 Found',
};

/**
 * Baris dan panel rincian satu endpoint API.
 */
export default function EndpointCard({ endpoint, isOpen, onToggle, origin }) {
    const fullPath = resolveEndpointPath(endpoint);
    const fullUrl = `${origin || ''}${fullPath}`;
    const panelId = `panel-${endpoint.id}`;
    const methodTone = METHOD_STYLES[endpoint.method] || 'bg-slate-100 text-slate-700 border-slate-200';
    const curlSnippet = buildCurlSnippet(endpoint, origin);

    const requestTabs = endpoint.body
        ? [
            {
                label: endpoint.contentType === 'multipart/form-data' ? 'Form Fields' : 'JSON Body',
                content: endpoint.body,
            },
            { label: 'cURL', content: curlSnippet },
        ]
        : null;

    const hasBothCodeBlocks = Boolean(endpoint.returns);

    return (
        <article id={`ep-${endpoint.id}`} className="scroll-mt-24 transition-colors">
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5 ${isOpen ? 'bg-slate-50/80' : 'hover:bg-slate-50/70'}`}>
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => onToggle(endpoint.id)}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                >
                    <span className={`inline-flex w-[66px] shrink-0 items-center justify-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide ${methodTone}`}>
                        {endpoint.method}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                        <HighlightedPath path={fullPath} />
                        <span className="truncate text-xs text-slate-500 sm:text-[13px]">
                            {endpoint.summary}
                        </span>
                    </div>
                </button>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {endpoint.permission ? (
                        <span className="hidden rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 md:inline-flex">
                            {endpoint.permission}
                        </span>
                    ) : (
                        <span className="hidden rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 md:inline-flex">
                            {endpoint.auth}
                        </span>
                    )}

                    <CopyButton
                        text={fullPath}
                        label="Path"
                        ariaLabel={`Salin path ${endpoint.method} ${fullPath}`}
                        surface="subtle"
                        onClick={(event) => event.stopPropagation()}
                    />

                    <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={isOpen ? `Tutup detail ${endpoint.path}` : `Buka detail ${endpoint.path}`}
                        onClick={() => onToggle(endpoint.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                    >
                        <IconChevronDown
                            className={`h-4 w-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#0F1E36]' : ''}`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div id={panelId} className="space-y-5 border-t border-[#E2E5EA] bg-slate-50/60 px-4 py-5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E2E5EA] bg-white px-3.5 py-2.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {endpoint.auth !== 'Publik' && <IconLock className="h-3 w-3 text-slate-500" aria-hidden="true" />}
                                {endpoint.auth}
                            </span>
                            {endpoint.permission && (
                                <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-medium text-sky-800">
                                    Izin: {endpoint.permission}
                                </span>
                            )}
                            {endpoint.contentType && (
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                    {endpoint.contentType}
                                </span>
                            )}
                            {endpoint.statusCode && (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
                                    HTTP {endpoint.statusCode}
                                </span>
                            )}
                        </div>
                        <CopyButton
                            text={fullUrl}
                            label="Salin URL lengkap"
                            surface="light"
                        />
                    </div>

                    {endpoint.note && (
                        <p className="text-sm leading-6 text-slate-600">{endpoint.note}</p>
                    )}

                    {endpoint.warning && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-xs leading-5 text-amber-950">
                            <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                            <span>{endpoint.warning}</span>
                        </div>
                    )}

                    {endpoint.params?.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Parameter &amp; Field Masukan
                            </h4>
                            <div className="overflow-x-auto rounded-lg border border-[#E2E5EA] bg-white">
                                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-[#E2E5EA] bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="px-3.5 py-2">Field</th>
                                            <th className="px-3.5 py-2">Lokasi / Tipe</th>
                                            <th className="px-3.5 py-2">Status</th>
                                            <th className="px-3.5 py-2">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {endpoint.params.map((param) => (
                                            <tr key={param.name} className="align-top">
                                                <td className="px-3.5 py-2.5 font-mono font-semibold text-[#0F1E36]">
                                                    {param.name}
                                                </td>
                                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                                                        {IN_LABELS[param.in] || param.in}
                                                    </span>
                                                    <span className="ml-1.5 font-mono text-[11px] text-slate-500">
                                                        {param.type}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                    {param.required ? (
                                                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                                                            Wajib
                                                        </span>
                                                    ) : (
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                                            Opsional
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3.5 py-2.5 leading-5 text-slate-600">
                                                    {param.desc}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className={`grid gap-4 ${hasBothCodeBlocks ? 'xl:grid-cols-2' : ''}`}>
                        {requestTabs ? (
                            <CodeBlock title="Permintaan" tabs={requestTabs} />
                        ) : (
                            <CodeBlock title="Contoh cURL" content={curlSnippet} />
                        )}

                        {endpoint.returns && (
                            <CodeBlock
                                title="Contoh Respons"
                                badge={STATUS_LABELS[endpoint.statusCode] || `${endpoint.statusCode || 200}`}
                                badgeTone="success"
                                content={endpoint.returns}
                            />
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}
