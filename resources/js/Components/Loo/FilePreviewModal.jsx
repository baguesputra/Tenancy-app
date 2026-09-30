import Modal from '@/Components/Modal';

export default function FilePreviewModal({ open, onClose, label = '', url = '' }) {
    const isPdf = url.toLowerCase().endsWith('.pdf');

    return (
        <Modal open={open} onClose={onClose} title={label} maxWidth="max-w-3xl">
            <div className="bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                {isPdf ? (
                    <iframe src={url} title={label} className="w-full h-[65vh] border-0 bg-white" />
                ) : (
                    <img src={url} alt={label} className="max-w-full max-h-[65vh] mx-auto" />
                )}
            </div>
        </Modal>
    );
}
