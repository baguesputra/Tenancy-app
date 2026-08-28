import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Show({ inspection, checklistSnapshot }) {
    const [snapshot, setSnapshot] = useState(checklistSnapshot);
    const [savingItemId, setSavingItemId] = useState(null);
    const isLocked = inspection.session_status !== 'in_progress';

    const updateLocalAnswer = (sectionIdx, itemIdx, patch) => {
        setSnapshot((prev) => {
            const next = structuredClone(prev);
            next.sections[sectionIdx].items[itemIdx].answer = {
                ...next.sections[sectionIdx].items[itemIdx].answer,
                ...patch,
            };
            return next;
        });
    };

    const saveAnswer = (sectionIdx, itemIdx, item, { value, note, photo }) => {
        setSavingItemId(item.id);

        const formData = new FormData();
        formData.append('checklist_item_id', item.id);
        if (value !== undefined) formData.append('value', value);
        if (note !== undefined) formData.append('note', note);
        if (photo) formData.append('photo', photo);

        router.post(`/inspections/${inspection.id}/answers`, formData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const savedAnswer = page.props.flash?.answer;
                if (savedAnswer && savedAnswer.checklist_item_id === item.id) {
                    updateLocalAnswer(sectionIdx, itemIdx, savedAnswer);
                }
                setSavingItemId(null);
            },
            onError: () => setSavingItemId(null),
        });
    };

    const handleChoice = (sectionIdx, itemIdx, item, choice) => {
        updateLocalAnswer(sectionIdx, itemIdx, { value: choice });
        saveAnswer(sectionIdx, itemIdx, item, { value: choice });
    };

    const handlePhotoUpload = (sectionIdx, itemIdx, item, file) => {
        saveAnswer(sectionIdx, itemIdx, item, { photo: file });
    };

    const handleNoteBlur = (sectionIdx, itemIdx, item, note) => {
        saveAnswer(sectionIdx, itemIdx, item, { note });
    };

    const completeInspection = () => {
        if (confirm('Selesaikan checklist untuk tenant ini?')) {
            router.post(`/inspections/${inspection.id}/complete`);
        }
    };

    const needsPhotoButMissing = (item) => {
        return (
            item.type === 'binary_choice' &&
            item.photo_required_on_negative &&
            item.answer?.value === item.option_negative &&
            (!item.answer?.photos || item.answer.photos.length === 0)
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto pb-24">
                <h1 className="text-2xl font-bold text-gray-800">{inspection.tenant.name}</h1>
                <p className="text-sm text-gray-500 mb-6">
                    {inspection.tenant.business_type} — {snapshot.template_name}
                </p>

                {isLocked && (
                    <div className="bg-gray-200 text-gray-700 text-sm p-3 rounded mb-4">
                        Sesi ini sudah selesai, checklist tidak bisa diubah lagi.
                    </div>
                )}

                {snapshot.sections.map((section, sectionIdx) => (
                    <div key={section.id} className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <h2 className="font-semibold text-gray-700 mb-3">{section.name}</h2>

                        <div className="space-y-4">
                            {section.items.map((item, itemIdx) => (
                                <div key={item.id} className="border-b pb-3 last:border-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            {item.label}
                                        </span>
                                        {savingItemId === item.id && (
                                            <span className="text-xs text-gray-400">Menyimpan...</span>
                                        )}
                                    </div>

                                    {item.type === 'binary_choice' ? (
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                disabled={isLocked}
                                                onClick={() => handleChoice(sectionIdx, itemIdx, item, item.option_positive)}
                                                className={`flex-1 py-2 rounded text-sm font-medium ${
                                                    item.answer?.value === item.option_positive
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {item.option_positive}
                                            </button>
                                            <button
                                                disabled={isLocked}
                                                onClick={() => handleChoice(sectionIdx, itemIdx, item, item.option_negative)}
                                                className={`flex-1 py-2 rounded text-sm font-medium ${
                                                    item.answer?.value === item.option_negative
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {item.option_negative}
                                            </button>
                                        </div>
                                    ) : (
                                        <textarea
                                            disabled={isLocked}
                                            defaultValue={item.answer?.value ?? ''}
                                            onBlur={(e) =>
                                                saveAnswer(sectionIdx, itemIdx, item, { value: e.target.value })
                                            }
                                            className="w-full border rounded px-3 py-2 text-sm mb-2"
                                            placeholder="Catatan bebas..."
                                            rows={2}
                                        />
                                    )}

                                    {needsPhotoButMissing(item) && (
                                        <p className="text-xs text-red-600 mb-2">
                                            ⚠️ Foto wajib dilampirkan untuk jawaban ini
                                        </p>
                                    )}

                                    {item.type === 'binary_choice' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                disabled={isLocked}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) =>
                                                    e.target.files[0] &&
                                                    handlePhotoUpload(sectionIdx, itemIdx, item, e.target.files[0])
                                                }
                                                className="text-xs"
                                            />
                                        </div>
                                    )}

                                    {item.answer?.photos?.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {item.answer.photos.map((photo) => (
                                                <img
                                                    key={photo.id}
                                                    src={photo.url}
                                                    className="w-16 h-16 object-cover rounded border"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <textarea
                                        disabled={isLocked}
                                        defaultValue={item.answer?.note ?? ''}
                                        onBlur={(e) =>
                                            handleNoteBlur(sectionIdx, itemIdx, item, e.target.value)
                                        }
                                        className="w-full border rounded px-3 py-1 text-xs mt-2 text-gray-500"
                                        placeholder="Keterangan tambahan (opsional)..."
                                        rows={1}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {!isLocked && (
                    <button
                        onClick={completeInspection}
                        className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto bg-blue-600 text-white rounded py-3 font-medium shadow-lg"
                    >
                        Selesai — Simpan Checklist Ini
                    </button>
                )}
            </div>
        </div>
    );
}