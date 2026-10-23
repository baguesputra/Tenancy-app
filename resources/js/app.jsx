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
                <div className="h-screen w-screen overflow-hidden bg-white flex flex-col items-center justify-start pt-12 sm:pt-20 p-6 text-center select-none">
                    <div className="flex flex-col items-center justify-start text-center max-w-2xl">
                        <a href="/" className="inline-flex items-center gap-3 mb-4 hover:opacity-85 transition-opacity">
                            <img src="/images/logo.png" alt="Duta Mall" className="h-9 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                            <div className="h-5 w-px bg-slate-300" />
                            <span className="text-sm font-extrabold text-[#0F1E36] uppercase tracking-wider">Tenant Management System</span>
                        </a>

                        <div
                            onClick={() => window.location.reload()}
                            className="relative inline-flex flex-col items-center justify-center cursor-pointer hover:scale-[1.015] transition-transform select-none"
                            title="Klik untuk memuat ulang"
                        >
                            <img src="/images/errors/500.png" alt="500" className="h-[62vh] max-h-[580px] w-auto aspect-square object-contain pointer-events-none mix-blend-multiply" />
                            <div
                                className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-4xl sm:text-5xl md:text-6xl font-black text-[#0F172A] uppercase tracking-tight leading-none pointer-events-none whitespace-nowrap"
                                style={{
                                    textShadow: '0 1px 0 #CBD5E1, 0 2px 0 #94A3B8, 0 3px 0 #64748B, 0 4px 6px rgba(15, 23, 42, 0.24), 0 8px 16px rgba(15, 23, 42, 0.16)'
                                }}
                            >
                                Error 500
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

router.on('httpException', (event) => {
    if (event.detail.response.status === 419) {
        window.location.reload();
        return false;
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
