import { useEffect, useRef, useState, useCallback } from 'react';

export function useAutoRefresh(enabled = true, interval = 30000) {
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const refreshCallbackRef = useRef(null);

    const setRefreshCallback = useCallback((callback) => {
        refreshCallbackRef.current = callback;
    }, []);

    const refresh = useCallback(async () => {
        if (isRefreshing || !refreshCallbackRef.current) return;
        setIsRefreshing(true);
        try {
            await refreshCallbackRef.current();
            setLastUpdated(new Date());
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

    useEffect(() => {
        if (!enabled) return;
        
        intervalRef.current = setInterval(() => {
            refresh();
        }, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, interval, refresh]);

    const formatRelativeTime = (date) => {
        if (!date) return 'Belum diperbarui';
        const diff = (Date.now() - date.getTime()) / 1000;
        if (diff < 60) return 'Baru saja';
        if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return {
        refresh,
        lastUpdated,
        isRefreshing,
        setRefreshCallback,
        formattedLastUpdated: formatRelativeTime(lastUpdated),
    };
}