import { useState } from 'react';
import TextInput from './TextInput';

export default function NumberInput({ error, className = '', loading = false, min, max, step = 1, prefix = '', suffix = '', ...props }) {
    const [value, setValue] = useState(props.value || '');

    // Handle value changes from props
    if (props.value !== undefined && props.value !== value) {
        setValue(props.value);
    }

    const handleChange = (e) => {
        let inputValue = e.target.value;
        
        // Remove non-numeric characters except decimal point and minus
        inputValue = inputValue.replace(/[^0-9.-]/g, '');
        
        // Handle multiple decimal points
        const parts = inputValue.split('.');
        if (parts.length > 2) {
            inputValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Handle multiple minus signs
        if (inputValue.split('-').length > 2) {
            inputValue = '-' + inputValue.split('-').slice(1).join('');
        }
        
        // Apply min/max constraints
        if (min !== undefined && parseFloat(inputValue) < min) {
            inputValue = min.toString();
        }
        if (max !== undefined && parseFloat(inputValue) > max) {
            inputValue = max.toString();
        }
        
        setValue(inputValue);
        if (props.onChange) props.onChange(e);
    };

    return (
        <div className="relative">
            <div className="flex items-center">
                {prefix && (
                    <span className="mr-2 text-gray-500">{prefix}</span>
                )}
                <TextInput
                    type="text"
                    value={value}
                    onChange={handleChange}
                    error={error}
                    className={className}
                    loading={loading}
                    inputMask={step % 1 === 0 ? 'number' : 'decimal'}
                    {...props}
                />
                {suffix && (
                    <span className="ml-2 text-gray-500">{suffix}</span>
                )}
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