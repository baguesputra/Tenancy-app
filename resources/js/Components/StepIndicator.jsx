export default function StepIndicator({ steps, currentStep, onSelect = null }) {
    const pct = steps.length > 1 ? Math.round(((currentStep - 1) / (steps.length - 1)) * 100) : 100;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 tabular-nums" aria-live="polite">
                    Langkah {currentStep} dari {steps.length}
                </p>
                <p className="text-xs font-medium text-[#0F1E36] truncate">{steps[currentStep - 1]}</p>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres pengisian">
                <div className="h-full bg-[#0F1E36] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center">
            {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                const clickable = !!onSelect && stepNum !== currentStep;

                const badge = (
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
                );
                const caption = (
                    <span className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-400'} ${isActive ? '' : 'hidden sm:block'}`}>
                        {label}
                    </span>
                );

                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        {clickable ? (
                            <button
                                type="button"
                                onClick={() => onSelect(stepNum)}
                                aria-label={`Ke langkah ${stepNum}: ${label}`}
                                className="flex flex-col items-center shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F1E36] hover:opacity-80 transition-opacity"
                            >
                                {badge}
                                {caption}
                            </button>
                        ) : (
                            <div className="flex flex-col items-center shrink-0">
                                {badge}
                                {caption}
                            </div>
                        )}
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${isCompleted ? 'bg-[#1FA24C]' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
            </div>
        </div>
    );
}
