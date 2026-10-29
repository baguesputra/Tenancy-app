export default function StepIndicator({ steps, currentStep, onSelect = null }) {
    return (
        <div className="mb-6">
            <p className="sr-only" aria-live="polite">
                Langkah {currentStep} dari {steps.length}: {steps[currentStep - 1]}
            </p>

            <ol aria-label="Langkah pengisian" className="flex items-center">
                {steps.map((label, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = stepNum < currentStep;
                    const isActive = stepNum === currentStep;
                    const clickable = !!onSelect && stepNum !== currentStep;

                    const badge = (
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none ${
                                isActive
                                    ? 'bg-[#0F1E36] text-white ring-4 ring-[#0F1E36]/10'
                                    : isCompleted
                                    ? 'bg-white text-[#0F1E36] ring-1 ring-inset ring-[#0F1E36]/40'
                                    : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            {isCompleted ? (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                stepNum
                            )}
                        </span>
                    );

                    const caption = (
                        <span className={`mt-1.5 hidden whitespace-nowrap text-[11px] sm:block ${isActive ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                            {label}
                        </span>
                    );

                    return (
                        <li key={label} className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
                            {clickable ? (
                                <button
                                    type="button"
                                    onClick={() => onSelect(stepNum)}
                                    aria-label={`Ke langkah ${stepNum}: ${label}`}
                                    className="flex shrink-0 flex-col items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    {badge}
                                    {caption}
                                </button>
                            ) : (
                                <div className="flex shrink-0 flex-col items-center" aria-current={isActive ? 'step' : undefined}>
                                    {badge}
                                    {caption}
                                </div>
                            )}
                            {idx < steps.length - 1 && (
                                <div
                                    aria-hidden="true"
                                    className={`mx-2 h-0.5 flex-1 transition-colors duration-300 motion-reduce:transition-none ${
                                        isCompleted ? 'bg-[#0F1E36]/40' : 'bg-gray-200'
                                    }`}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}