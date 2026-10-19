export const PERMIT_CATEGORY_META = {
    pameran: { label: 'Pameran / Open Counter', code: 'E&P', icon: 'storefront', tint: 'text-[#FF6B6B]' },
    kegiatan: { label: 'Kegiatan', code: null, icon: 'calendar', tint: 'text-indigo-500' },
    tenant: { label: 'Tenant', code: 'TC', icon: 'building', tint: 'text-sky-600' },
    vendor: { label: 'Vendor', code: 'TC', icon: 'wrench', tint: 'text-teal-600' },
};

export const PERMIT_SOURCE_META = {
    marketing: { label: 'Marketing' },
    staff: { label: 'Staff' },
};

export const PERMIT_STATUS_META = {
    pending: { label: 'Menunggu', color: 'yellow' },
    completed: { label: 'Selesai', color: 'green' },
    rejected: { label: 'Ditolak', color: 'red' },
    cancelled: { label: 'Dibatalkan', color: 'gray' },
};
