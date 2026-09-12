export default function StepIndicator({ steps, currentStep }) {
    return (
        <div className="flex items-center mb-8">
            {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;

                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center shrink-0">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                                    isCompleted
                                        ? 'bg-[#1FA24C] text-white'
                                        : isActive
                                        ? 'bg-[#0F1E36] text-white ring-4 ring-[#0F1E36]/10'
                                        : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {isCompleted ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : stepNum}
                            </div>
                            <span className={`text-[11px] mt-1.5 font-medium hidden sm:block whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                {label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${isCompleted ? 'bg-[#1FA24C]' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
