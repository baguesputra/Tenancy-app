export function IconPlus(props) {
    return (
        <svg className="w-4 h-4 text-[#0F1E36]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}

export function IconEdit(props) {
    return (
        <svg className="w-4 h-4 text-[#0F1E36]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" />
        </svg>
    );
}

export function IconTrash(props) {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}