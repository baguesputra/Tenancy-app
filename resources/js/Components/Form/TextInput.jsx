import { useState, useEffect } from 'react';
import useDebounce from '@/hooks/useDebounce';

export default function TextInput({ error, className = '', loading = false, clearable = false, inputMask = null, debounceMs = 300, type = 'text', ...props }) {
    const [value, setValue] = useState(props.value || '');
    const debouncedValue = useDebounce(value, debounceMs);
    const [showClear, setShowClear] = useState(false);

    // Handle value changes from props (controlled component)
    useEffect(() => {
        if (props.value !== undefined && props.value !== value) {
            setValue(props.value);
        }
    }, [props.value]);

    // Handle input masking
    const handleChange = (e) => {
        let inputValue = e.target.value;
        
        // Apply input mask if provided
        if (inputMask) {
            // Remove non-digits
            let cleaned = inputValue.replace(/\D/g, '');
            
            // Apply mask based on pattern
            if (inputMask === 'phone') {
                // Format as (XXX) XXX-XXXX
                if (cleaned.length > 0) cleaned = `(${cleaned.slice(0, 3)}`;
                if (cleaned.length > 4) cleaned = `${cleaned.slice(0, 5)} ${cleaned.slice(3, 6)}`;
                if (cleaned.length > 8) cleaned = `${cleaned.slice(0, 9)}-${cleaned.slice(9, 13)}`;
                inputValue = cleaned;
            } else if (inputMask === 'currency') {
                // Format as Rp XXX.XXX.XXX
                if (cleaned.length > 0) {
                    const num = parseInt(cleaned);
                    if (!isNaN(num)) {
                        inputValue = `Rp ${num.toLocaleString('id-ID')}`;
                    }
                }
            }
        }
        
        setValue(inputValue);
        if (props.onChange) props.onChange(e);
    };

    // Handle clear button
    const handleClear = () => {
        setValue('');
        if (props.onChange) props.onChange({ target: { value: '' } });
    };

    // Use props.value if controlled, otherwise internal value
    const displayValue = props.value !== undefined ? props.value : value;

    return (
        <div className="relative">
            <input
                type={type}
                value={displayValue}
                onChange={handleChange}
                className={`w-full pl-3.5 pr-${clearable ? '10' : '3.5'} py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                    bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0
                    transition-all duration-200 ease-out
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                    }
                    ${loading ? 'opacity-70' : ''}
                    ${className}`}
                {...props}
            />
            
            {/* Clear button */}
            {clearable && value && !loading && (
                <button
                    type="button"
                    onClick={handleClear}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 
                             p-1 rounded-full hover:bg-gray-200 
                             text-gray-400 hover:text-gray-600 transition-colors`}
                    aria-label="Clear field"
                >
                    <span className="text-xs">×</span>
                </button>
            )}
            
            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center">
                    <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
}