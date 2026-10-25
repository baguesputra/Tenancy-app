<?php

namespace App\Services;

use App\Models\Loo;
use App\Models\LooSection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Sumber kebenaran tunggal untuk progres LOO: status diturunkan dari
 * kelengkapan section tiap fase (lihat `config/loo.php` → `pipeline`),
 * bukan diubah manual.
 */
class LooProgressService
{
    public const TERMINAL = ['completed', 'cancelled'];

    /** Fase pipeline dalam urutan gating. */
    public function pipeline(): array
    {
        return config('loo.pipeline');
    }

    public function phaseKeys(): array
    {
        return array_keys($this->pipeline());
    }

    /** Section LOO di-key by `section_key`. */
    public function sections(Loo $loo): Collection
    {
        if ($loo->relationLoaded('sections')) {
            return $loo->sections->keyBy('section_key');
        }

        return $loo->sections()->get()->keyBy('section_key');
    }

    /**
     * Fase sudah selesai = semua section-nya disubmit (dan bila fase butuh
     * approval, Deputy GM sudah approve).
     */
    public function phaseDone(Loo $loo, string $phase): bool
    {
        $config = config("loo.pipeline.{$phase}");

        if (! $config) {
            return true;
        }

        $sections = $this->sections($loo);

        foreach ($config['sections'] as $key) {
            if (! ($sections->get($key)?->is_submitted ?? false)) {
                return false;
            }
        }

        if ($config['requires_approval'] ?? false) {
            return $this->isApproved($loo);
        }

        return true;
    }

    /** Fase aktif = fase pertama yang belum selesai; null bila semua selesai. */
    public function activePhase(Loo $loo): ?string
    {
        foreach ($this->phaseKeys() as $phase) {
            if (! $this->phaseDone($loo, $phase)) {
                return $phase;
            }
        }

        return null;
    }

    public function isApproved(Loo $loo): bool
    {
        $post = $this->sections($loo)->get('fitout_checklist_post');

        return ! empty($post?->data['checklist']['footer']['gm_approved']);
    }

    /** Status LOO yang seharusnya, diturunkan dari progres pengisian. */
    public function derivedStatus(Loo $loo): string
    {
        if ($loo->status === 'cancelled') {
            return 'cancelled';
        }

        $active = $this->activePhase($loo);

        if ($active === null) {
            return 'completed';
        }

        if ($active === 'pengisian_divisi' && ! $this->divisionTouched($loo)) {
            return 'draft';
        }

        return $active;
    }

    /** Ada minimal satu section divisi yang sudah tersimpan (draft/disubmit). */
    public function divisionTouched(Loo $loo): bool
    {
        $sections = $this->sections($loo);

        foreach ($this->pipeline()['pengisian_divisi']['sections'] as $key) {
            if ($sections->has($key)) {
                return true;
            }
        }

        return false;
    }

    /** Section yang belum terkunci (fase aktif + semua fase sebelumnya). */
    public function unlockedSectionKeys(Loo $loo): array
    {
        if (in_array($loo->status, self::TERMINAL, true)) {
            return [];
        }

        $keys = $this->phaseKeys();
        $active = $this->activePhase($loo);
        $activeIndex = $active === null ? count($keys) : array_search($active, $keys, true);

        $unlocked = [];
        foreach ($keys as $i => $phase) {
            if ($i > $activeIndex) {
                break;
            }
            $unlocked = array_merge($unlocked, $this->pipeline()[$phase]['sections']);
        }

        return array_values(array_unique($unlocked));
    }

    public function isSectionUnlocked(Loo $loo, string $key): bool
    {
        return in_array($key, $this->unlockedSectionKeys($loo), true);
    }

    /**
     * Struktur progres lengkap untuk UI: per fase beserta tiap section,
     * jumlah field terisi, dan daftar field yang masih kosong.
     */
    public function progress(Loo $loo): array
    {
        $sections = $this->sections($loo);
        $keys = $this->phaseKeys();
        $active = $this->activePhase($loo);
        $activeIndex = $active === null ? count($keys) : array_search($active, $keys, true);
        $status = $this->derivedStatus($loo);

        $phases = [];
        foreach ($keys as $i => $phase) {
            $config = $this->pipeline()[$phase];

            $phaseSections = [];
            foreach ($config['sections'] as $key) {
                $phaseSections[] = $this->sectionProgress($key, $sections->get($key));
            }

            $phases[] = [
                'key' => $phase,
                'label' => $config['label'],
                'state' => $i < $activeIndex ? 'done' : ($i === $activeIndex ? 'active' : 'locked'),
                'sections' => $phaseSections,
            ];
        }

        return [
            'status' => $status,
            'phase' => $active,
            'days_since_upload' => $this->daysSinceUpload($loo),
            'summary' => $this->summaryLine($loo, $phases, $status),
            'phases' => $phases,
        ];
    }

    /** Baris ringkas untuk kolom status di daftar LOO. */
    public function summaryLine(Loo $loo, ?array $phases = null, ?string $status = null): string
    {
        $status ??= $this->derivedStatus($loo);

        if ($status === 'cancelled') {
            return 'LOO dibatalkan.';
        }

        if ($status === 'completed') {
            return 'Selesai & tersinkron ke master Tenant.';
        }

        $phases ??= $this->progress($loo)['phases'];
        $active = collect($phases)->firstWhere('state', 'active');

        if (! $active) {
            return 'Menunggu proses.';
        }

        $pending = collect($active['sections'])
            ->filter(fn ($s) => $s['state'] !== 'submitted')
            ->map(fn ($s) => $s['state'] === 'draft' ? "{$s['label']} (draft {$s['remaining']} field)" : $s['label'])
            ->all();

        if ($pending === []) {
            $pending = ['Menunggu konfirmasi Deputy GM'];
        }

        return 'Menunggu: '.implode(', ', $pending);
    }

    private function sectionProgress(string $key, ?LooSection $section): array
    {
        $config = config("loo_sections.{$key}") ?? ['label' => $key, 'fields' => []];
        $data = $section?->data ?? [];
        $stats = $this->fieldStats($config, $data);

        return [
            'key' => $key,
            'label' => $config['label'],
            'state' => $section === null ? 'none' : ($section->is_submitted ? 'submitted' : 'draft'),
            'filled' => $stats['filled'],
            'total' => $stats['total'],
            'remaining' => $stats['total'] - $stats['filled'],
            'missing' => $stats['missing'],
            'updated_days_ago' => $this->daysAgo($section?->filled_at),
            'submitted_days_ago' => $this->daysAgo($section?->submitted_at),
        ];
    }

    /**
     * Hitung field terisi/kosong dari config section. Field `checklist_table`
     * dihitung per item (status Ok/Tidak), field lain satu field.
     */
    private function fieldStats(array $config, array $data): array
    {
        $items = [];

        foreach ($config['fields'] ?? [] as $field) {
            $name = $field['name'];

            if (($field['type'] ?? null) === 'checklist_table') {
                foreach ($field['departments'] ?? [] as $dept) {
                    foreach ($dept['items'] ?? [] as $itemKey => $itemLabel) {
                        $status = $data[$name][$dept['key']]['items'][$itemKey]['status'] ?? null;
                        $items[] = [
                            'label' => $dept['label'].': '.$itemLabel,
                            'filled' => in_array($status, ['Ok', 'Tidak'], true),
                        ];
                    }
                }

                continue;
            }

            $items[] = [
                'label' => $field['label'] ?? $name,
                'filled' => $this->isFilled($field['type'] ?? 'text', $data[$name] ?? null),
            ];
        }

        $filled = count(array_filter($items, fn ($i) => $i['filled']));
        $missing = array_values(array_map(
            fn ($i) => $i['label'],
            array_filter($items, fn ($i) => ! $i['filled'])
        ));

        return ['filled' => $filled, 'total' => count($items), 'missing' => $missing];
    }

    private function isFilled(string $type, mixed $value): bool
    {
        return match ($type) {
            'file' => is_string($value) && $value !== '',
            'file_multiple', 'multiselect' => is_array($value) && $value !== [],
            'checkbox' => ! empty($value),
            default => ! ($value === null || $value === '' || $value === []),
        };
    }

    private function daysSinceUpload(Loo $loo): int
    {
        return $this->daysAgo($loo->created_at) ?? 0;
    }

    private function daysAgo(?Carbon $date): ?int
    {
        return $date?->diffInDays(now());
    }
}