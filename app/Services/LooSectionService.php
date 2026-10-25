<?php

namespace App\Services;

use App\Models\Loo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Field bertipe `file` disimpan sebagai string path, `file_multiple` sebagai array path.
 */
class LooSectionService
{
    public const FILE_FIELDS = ['file', 'file_multiple'];

    public const FITOUT_CHECKLIST_KEYS = ['fitout_checklist_pre', 'fitout_checklist_post'];

    /**
     * Departemen checklist toko → permission pengisi.
     * Kontraktor dikoordinasi tim tenant management.
     */
    public const FITOUT_DEPARTMENT_PERMISSIONS = [
        'legal' => 'loos.legal_edit',
        'finance' => 'loos.accounting_edit',
        'tenancy' => 'loos.tenant_mgmt_edit',
        'engineering' => 'loos.engineering_edit',
        'kontraktor' => 'loos.tenant_mgmt_edit',
    ];

    public function collect(array $input, array $config, Loo $loo, array $existing): array
    {
        $data = [];

        foreach ($config['fields'] as $field) {
            $name = $field['name'];
            $type = $field['type'];

            if ($type === 'file') {
                $data[$name] = $this->storeOne($input, $name, $loo, $existing[$name] ?? null);
            } elseif ($type === 'file_multiple') {
                $data[$name] = $this->storeMany($input, $name, $loo, $existing[$name] ?? []);
            } elseif ($type === 'group' || $type === 'repeater') {
                $raw = $this->decode($input[$name] ?? []);
                $data[$name] = $type === 'group'
                    ? $this->collect($raw, ['fields' => $field['fields']], $loo, $existing[$name] ?? [])
                    : $this->collectRepeater($raw, $field['fields'], $loo, $existing[$name] ?? []);
            } elseif ($type === 'checklist_table') {
                $data[$name] = $this->collectChecklist($this->decode($input[$name] ?? []), $field);
            } else {
                $data[$name] = $input[$name] ?? null;
            }
        }

        return $data;
    }

    /**
     * Validasi upload baru berdasarkan `accept` + `max_kb` di config.
     * Hanya field yang benar-benar mengirim file yang divalidasi, sehingga
     * path lama yang dikirim balik frontend tidak dianggap upload.
     */
    public function validateUploads(Request $request, array $config): void
    {
        $rules = [];

        foreach ($config['fields'] as $field) {
            if (! in_array($field['type'], self::FILE_FIELDS, true) || ! isset($field['max_kb'])) {
                continue;
            }

            if (! $request->hasFile($field['name'])) {
                continue;
            }

            $target = $field['type'] === 'file_multiple' ? $field['name'].'.*' : $field['name'];
            $rule = ['file', 'max:'.$field['max_kb']];

            $extensions = array_filter(array_map(
                fn ($ext) => ltrim(trim($ext), '.'),
                explode(',', $field['accept'] ?? '')
            ));

            if ($extensions !== []) {
                $rule[] = 'mimes:'.implode(',', $extensions);
            }

            $rules[$target] = $rule;
        }

        if ($rules !== []) {
            $request->validate($rules);
        }
    }

    /**
     * Daftar departemen checklist yang boleh diisi user.
     * Semua role bisa MELIHAT (route `loos.view`); mengisi dibatasi per dept.
     */
    public function editableFitoutDepartments(User $user): array
    {
        if ($user->can('loos.dashboard')) {
            return array_keys(self::FITOUT_DEPARTMENT_PERMISSIONS);
        }

        $editable = [];
        foreach (self::FITOUT_DEPARTMENT_PERMISSIONS as $dept => $permission) {
            if ($user->can($permission)) {
                $editable[] = $dept;
            }
        }

        return $editable;
    }

    /**
     * Guard dept-level: upload TTD departemen atau isi dept di luar wewenang
     * yang berbeda dari data tersimpan → 403. Post ulang tak berubah lolos
     * (frontend selalu kirim seluruh state).
     */
    public function assertFitoutDepartmentsAllowed(array $input, array $config, array $current, array $editable): void
    {
        $field = collect($config['fields'])->firstWhere('type', 'checklist_table');
        if (! $field) {
            return;
        }

        foreach ($field['departments'] as $dept) {
            $key = $dept['key'];

            if (in_array($key, $editable, true)) {
                continue;
            }

            if (($input["signature_{$key}"] ?? null) instanceof UploadedFile) {
                abort(403, 'Tidak berwenang mengisi bagian '.$dept['label'].'.');
            }
        }

        $posted = $this->decode($input['checklist'] ?? []);
        $stored = $current['checklist'] ?? [];

        foreach ($field['departments'] as $dept) {
            $key = $dept['key'];
            if (in_array($key, $editable, true)) {
                continue;
            }

            $postedDept = $this->sanitizeFitoutDept($posted[$key] ?? [], $dept);
            if ($this->fitoutDeptIsEmpty($postedDept)) {
                continue;
            }

            if ($postedDept != ($stored[$key] ?? null)) {
                abort(403, 'Tidak berwenang mengisi bagian '.$dept['label'].'.');
            }
        }
    }

    /**
     * Gabungkan hasil collect: dept + TTD di luar wewenang dikembalikan ke
     * data tersimpan; field bersama (footer/notes) yang kosong ikut
     * dikembalikan agar partial-save satu dept tidak menghapus milik lain.
     * Flag approval GM hanya diubah via alur approve, tidak via save biasa.
     */
    public function mergeFitoutDepartments(array $data, array $current, array $editable, array $config): array
    {
        $field = collect($config['fields'])->firstWhere('type', 'checklist_table');
        $departments = $field['departments'] ?? [];

        foreach ($departments as $dept) {
            $key = $dept['key'];
            if (in_array($key, $editable, true)) {
                continue;
            }

            if (isset($current['checklist'][$key])) {
                $data['checklist'][$key] = $current['checklist'][$key];
            }

            if (isset($current["signature_{$key}"])) {
                $data["signature_{$key}"] = $current["signature_{$key}"];
            }
        }

        if (($field['show_footer'] ?? true) !== false) {
            foreach (['date', 'tenant_name', 'gm_name'] as $key) {
                if (empty($data['checklist']['footer'][$key]) && ! empty($current['checklist']['footer'][$key])) {
                    $data['checklist']['footer'][$key] = $current['checklist']['footer'][$key];
                }
            }

            foreach (['gm_approved', 'gm_approved_at', 'gm_approved_by'] as $key) {
                if (isset($current['checklist']['footer'][$key])) {
                    $data['checklist']['footer'][$key] = $current['checklist']['footer'][$key];
                }
            }
        }

        foreach (['notes', 'signature_tenant', 'signature_gm'] as $key) {
            if (empty($data[$key]) && ! empty($current[$key])) {
                $data[$key] = $current[$key];
            }
        }

        return $data;
    }

    private function sanitizeFitoutDept(array $raw, array $dept): array
    {
        $items = [];
        foreach (array_keys($dept['items']) as $itemKey) {
            $posted = $raw['items'][$itemKey] ?? [];
            $status = $posted['status'] ?? null;
            $items[$itemKey] = [
                'status' => in_array($status, ['Ok', 'Tidak'], true) ? $status : null,
                'keterangan' => isset($posted['keterangan']) ? (string) $posted['keterangan'] : null,
            ];
        }

        $signoff = $raw['signoff'] ?? [];

        return [
            'items' => $items,
            'signoff' => [
                'day' => $signoff['day'] ?? null,
                'date' => $signoff['date'] ?? null,
                'name' => $signoff['name'] ?? null,
            ],
        ];
    }

    private function fitoutDeptIsEmpty(array $dept): bool
    {
        foreach ($dept['items'] ?? [] as $item) {
            if (! empty($item['status']) || ! empty($item['keterangan'])) {
                return false;
            }
        }

        foreach ($dept['signoff'] ?? [] as $value) {
            if (! empty($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Objek/array dari frontend melewati FormData sebagai string JSON.
     */
    private function decode($raw): array
    {
        if (is_string($raw)) {
            $raw = json_decode($raw, true);
        }

        return is_array($raw) ? $raw : [];
    }

    /**
     * Item dikunci dari config; kunci tak dikenal dibuang, status hanya Ok/Tidak.
     */
    private function collectChecklist(array $input, array $field): array
    {
        $out = [];

        foreach ($field['departments'] as $dept) {
            $key = $dept['key'];
            $items = [];

            foreach (array_keys($dept['items']) as $itemKey) {
                $posted = $input[$key]['items'][$itemKey] ?? [];
                $status = $posted['status'] ?? null;
                $items[$itemKey] = [
                    'status' => in_array($status, ['Ok', 'Tidak'], true) ? $status : null,
                    'keterangan' => isset($posted['keterangan']) ? (string) $posted['keterangan'] : null,
                ];
            }

            $signoff = $input[$key]['signoff'] ?? [];
            $out[$key] = [
                'items' => $items,
                'signoff' => [
                    'day' => $signoff['day'] ?? null,
                    'date' => $signoff['date'] ?? null,
                    'name' => $signoff['name'] ?? null,
                ],
            ];
        }

        if (($field['show_footer'] ?? true) !== false) {
            $footer = $input['footer'] ?? [];
            $out['footer'] = [
                'date' => $footer['date'] ?? null,
                'tenant_name' => $footer['tenant_name'] ?? null,
                'gm_name' => $footer['gm_name'] ?? null,
            ];
        }

        return $out;
    }

    private function storeOne(array $input, string $name, Loo $loo, ?string $current): ?string
    {
        if ($this->hasUpload($input, $name)) {
            if ($current) {
                Storage::disk('public')->delete($current);
            }

            return $input[$name]->store("loos/{$loo->id}/sections", 'public');
        }

        return $current;
    }

    private function storeMany(array $input, string $name, Loo $loo, array $current): array
    {
        if ($this->hasUpload($input, $name)) {
            foreach ($current as $old) {
                Storage::disk('public')->delete($old);
            }

            return collect($input[$name])->map(fn (UploadedFile $f) => $f->store("loos/{$loo->id}/sections", 'public'))->all();
        }

        return $current;
    }

    private function collectRepeater(array $rows, array $fields, Loo $loo, array $existing): array
    {
        $out = [];

        foreach ($rows as $i => $row) {
            $prior = $existing[$i] ?? [];
            $item = [];
            foreach ($fields as $field) {
                $name = $field['name'];
                $item[$name] = $field['type'] === 'file'
                    ? $this->storeOne($row, $name, $loo, $prior[$name] ?? null)
                    : ($row[$name] ?? null);
            }
            $out[] = $item;
        }

        return $out;
    }

    private function hasUpload(array $input, string $name): bool
    {
        return isset($input[$name]) && $input[$name] instanceof UploadedFile && $input[$name]->isValid();
    }
}
