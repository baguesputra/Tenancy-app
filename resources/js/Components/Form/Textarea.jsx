import { useState, useEffect, useRef } from 'react';

export default function Textarea({ error, className = '', rows = 3, loading = false, maxLength = null, ...props }) {
    const [value, setValue] = useState(props.value || '');
    const textareaRef = useRef(null);

    // Handle value changes from props (controlled component)
    useEffect(() => {
        if (props.value !== undefined && props.value !== value) {
            setValue(props.value);
        }
    }, [props.value]);

    // Auto-adjust textarea height
    useEffect(() => {
        if (textareaRef.current && props.rows === undefined) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value, props.rows]);

    const handleChange = (e) => {
        let inputValue = e.target.value;
        
        // Apply maxLength if provided
        if (maxLength && inputValue.length > maxLength) {
            inputValue = inputValue.substring(0, maxLength);
        }
        
        setValue(inputValue);
        if (props.onChange) props.onChange(e);
    };

    // Use props.value if controlled, otherwise internal value
    const displayValue = props.value !== undefined ? props.value : value;

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                rows={rows}
                value={displayValue}
                onChange={handleChange}
                className={`w-full pl-3.5 pr-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                    bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 resize-none
                    transition-all duration-200 ease-out
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                    }
                    ${loading ? 'opacity-70' : ''}
                    ${className}`}
                {...props}
            />
            
            {/* Character counter */}
            {maxLength && (
                <div className="absolute right-3 bottom-2 text-xs text-gray-400">
                    `${value.length}/${maxLength}`
                </div>
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