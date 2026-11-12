export const PERMIT_CATEGORY_META = {
    pameran: { label: 'Pameran / Open Counter', code: 'E&P', icon: 'storefront', tint: 'text-[#FF6B6B]', color: 'coral' },
    kegiatan: { label: 'Kegiatan', code: null, icon: 'calendar', tint: 'text-indigo-500', color: 'indigo' },
    tenant: { label: 'Tenant', code: 'TC', icon: 'building', tint: 'text-sky-600', color: 'blue' },
    vendor: { label: 'Vendor', code: 'TC', icon: 'wrench', tint: 'text-teal-600', color: 'cyan' },
    parkir: { label: 'Parkir', code: 'PRK', icon: 'car', tint: 'text-orange-500', color: 'amber' },
    customer: { label: 'Customer Isi Form', code: 'CST', icon: 'building', tint: 'text-violet-600', color: 'violet' },
};

export const PERMIT_SOURCE_META = {
    marketing: { label: 'Marketing' },
    staff: { label: 'Staff' },
};

export const PERMIT_STATUS_META = {
    pending: { label: 'Menunggu', color: 'yellow' },
    completed: { label: 'Selesai', color: 'green' },
    rejected: { label: 'Ditolak', color: 'red' },
    cancelled: { label: 'Dibatalkan', color: 'red' },
};
