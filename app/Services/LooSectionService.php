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
            } elseif ($type === 'group') {
                $data[$name] = $this->collect($input[$name] ?? [], ['fields' => $field['fields']], $loo, $existing[$name] ?? []);
            } elseif ($type === 'repeater') {
                $data[$name] = $this->collectRepeater($input[$name] ?? [], $field['fields'], $loo, $existing[$name] ?? []);
            } else {
                $data[$name] = $input[$name] ?? null;
            }
        }

        return $data;
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
