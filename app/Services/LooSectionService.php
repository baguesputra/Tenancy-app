<?php

namespace App\Services;

use App\Models\Loo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Field bertipe `file` disimpan sebagai string path, `file_multiple` sebagai array path.
 */
class LooSectionService
{
    public const FILE_FIELDS = ['file', 'file_multiple'];

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

        $footer = $input['footer'] ?? [];
        $out['footer'] = [
            'date' => $footer['date'] ?? null,
            'tenant_name' => $footer['tenant_name'] ?? null,
            'gm_name' => $footer['gm_name'] ?? null,
        ];

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
