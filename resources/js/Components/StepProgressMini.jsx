export default function StepProgressMini({ steps }) {
    const colorMap = {
        approved: 'bg-[#1FA24C]',
        rejected: 'bg-red-500',
        pending: 'bg-gray-200',
    };

    return (
        <div className="flex items-center gap-1">
            {steps.map((step, idx) => (
                <div
                    key={idx}
                    title={step.label}
                    className={`h-1.5 rounded-full transition-all duration-300 ${colorMap[step.status]} ${
                        step.status === 'pending' && idx === steps.findIndex((s) => s.status === 'pending')
                            ? 'w-4 animate-pulse'
                            : 'w-2.5'
                    }`}
                />
            ))}
        </div>
    );
}