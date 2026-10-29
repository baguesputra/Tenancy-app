import { IconUsers, IconKey, IconRefresh, IconQr, IconClipboard, IconDocument } from '@/Components/Icons';

const ICONS = {
    users: IconUsers,
    key: IconKey,
    refresh: IconRefresh,
    qr: IconQr,
    clipboard: IconClipboard,
    document: IconDocument,
};

export default function SettingsIcon({ name, className = 'h-4 w-4' }) {
    const Icon = ICONS[name];
    if (!Icon) return null;

    return <Icon className={className} aria-hidden="true" />;
}