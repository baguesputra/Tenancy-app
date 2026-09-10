export default function FileInput({ error, className = '', loading = false, accept, maxSize, ...props }) {
    return (
        <div className="relative">
            <label className={`block cursor-pointer ${className}`}>
                <input
                    type="file"
                    className="sr-only"
                    accept={accept}
                    {...props}
                />
                <div className={`flex flex-col items-center justify-center p-6 text-center
                              border-2 border-dashed rounded-lg
                              ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
                              hover:border-[#0F1E36] hover:bg-gray-100
                              transition-all duration-200
                              ${loading ? 'opacity-70' : ''}`}>
                    {!loading ? (
                        <>
                            <svg className="mb-4 h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16h4v2m0 0l-2-2m2 2l2-2m0 0l2-2m-2 2h-2m-2 4v-2m0 0l-2-2m2 2l2-2m0 0l2 2m-2 4h2a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2zm0 0l2-2m-2 2l-2-2" />
                            </svg>
                            <div className="mb-2 text-sm font-medium text-gray-600">
                                Click to upload or drag and drop
                            </div>
                            {accept && (
                                <p className="text-xs text-gray-500">
                                    Accepted formats: {accept.split(',').map(ext => ext.trim()).join(', ')}
                                </p>
                            )}
                            {maxSize && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Maximum file size: ${maxSize / (1024 * 1024)}MB
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="mb-2 flex h-4 w-4 items-center justify-center">
                                <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">Uploading...</p>
                        </>
                    )}
                    
                    {/* File info when selected */}
                    {!loading && props.value && props.value.length > 0 && (
                        <div className="mt-4 text-left w-full">
                            <p className="text-sm font-medium text-gray-700">
                                {props.value[0]?.name || 'File selected'}
                            </p>
                            {props.value[0]?.size && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Size: ${(props.value[0].size / 1024).toFixed(1)} ${props.value[0].size > 1024 * 1024 ? 'MB' : 'KB'}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => props.onChange && props.onChange({ target: { files: [] } })}
                                className="mt-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            </label>
            
            {error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span>⚠</span> {error}
                </p>
            )}
        </div>
    );
}