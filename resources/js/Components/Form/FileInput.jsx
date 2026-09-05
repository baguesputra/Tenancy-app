export default function FileInput({ error, className = '', ...props }) {
    return (
        <input
            type="file"
            className={`w-full text-sm text-gray-600
                file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700
                hover:file:bg-gray-200 file:cursor-pointer cursor-pointer
                ${className}`}
            {...props}
        />
    );
}