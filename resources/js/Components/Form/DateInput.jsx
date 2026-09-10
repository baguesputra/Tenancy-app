import { useState } from 'react';
import TextInput from './TextInput';

export default function DateInput({ error, className = '', loading = false, minDate, maxDate, ...props }) {
    const [value, setValue] = useState(props.value || '');

    // Handle value changes from props
    if (props.value !== undefined && props.value !== value) {
        setValue(props.value);
    }

    const handleChange = (e) => {
        setValue(e.target.value);
        if (props.onChange) props.onChange(e);
    };

    return (
        <div className="relative">
            <TextInput
                type="date"
                value={value}
                onChange={handleChange}
                error={error}
                className={className}
                loading={loading}
                min={minDate}
                max={maxDate}
                {...props}
            />
            
            {/* Calendar icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center pointer-events-none">
                <svg className="h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v3m8 4v-3M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </svg>
            </div>
            
            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center pointer-events-none">
                    <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
}