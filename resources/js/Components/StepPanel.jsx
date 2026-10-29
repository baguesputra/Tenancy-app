import { useEffect, useState } from 'react';

export default function StepPanel({ children, stepKey }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(false);
        const t = setTimeout(() => setShow(true), 20);
        return () => clearTimeout(t);
    }, [stepKey]);

    return (
        <div className={`transition-all duration-300 ease-out motion-reduce:transition-none ${show ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0 motion-reduce:translate-y-0'}`}>
            {children}
        </div>
    );
}