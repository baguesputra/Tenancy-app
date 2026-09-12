import { useEffect, useState } from 'react';

export default function StepPanel({ children, stepKey }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(false);
        const t = setTimeout(() => setShow(true), 20);
        return () => clearTimeout(t);
    }, [stepKey]);

    return (
        <div className={`transition-all duration-300 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            {children}
        </div>
    );
}
