export const tenancyStatus = {
    color: { draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red' },
    label: { draft: 'Draft', active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri' },
};

export const inspectionStatus = {
    color: { draft: 'gray', completed: 'green' },
    label: { draft: 'Draft', completed: 'Selesai' },
};

export const sessionStatus = {
    color: { in_progress: 'yellow', completed: 'green' },
    label: { in_progress: 'Penyidakan', completed: 'Selesai' },
};

export const permitStatus = {
    color: { pending: 'yellow', completed: 'green', rejected: 'red' },
    label: { pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak' },
};
