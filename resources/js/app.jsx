import './bootstrap';
import '../css/app.css';

import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
                    <p className="text-sm font-semibold text-gray-900">Terjadi kesalahan saat menampilkan halaman</p>
                    <p className="text-xs text-gray-500">Muat ulang halaman. Jika berulang, coba lagi beberapa saat lagi.</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-lg bg-[#0F1E36] px-4 py-2 text-xs font-medium text-white hover:bg-[#16294a]"
                    >
                        Muat Ulang
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

router.onError((error) => {
    if (error?.response?.status === 419) {
        window.location.reload();
    }
});

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
            <ErrorBoundary>
                <App {...props} />
            </ErrorBoundary>,
        );
    },
});
