<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use ZipArchive;

class UnitXlsxImportSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'BJM')->firstOrFail();
        $path = base_path('docs/master/unit.xlsx');
        if (! is_file($path)) {
            $this->command->error("File tidak ditemukan: {$path}");

            return;
        }

        $rows = $this->readRows($path);
        $tenantMap = [];
        foreach (Tenant::all(['id', 'name']) as $t) {
            $tenantMap[$this->normName($t->name)] = $t;
        }

        $report = [];
        $stats = ['rows' => 0, 'units' => 0, 'tenancies' => 0, 'conflict' => 0, 'no_tenant' => 0, 'same' => 0];
        $today = now()->toDateString();

        // ponytail: XLSX tanpa tanggal/sewa → active + today, field uang null
        foreach ($rows as $row) {
            $stats['rows']++;
            $tenant = $tenantMap[$this->normName($row['tenant'])] ?? null;
            if (! $tenant) {
                $stats['no_tenant']++;
                $report[] = [$row['n'], $row['tenant'], 'NO_TENANT', '', '', '', '', 'skip: nama tidak cocok dengan DB (tanpa auto-create)'];

                continue;
            }

            $units = $this->expandRow($row['floor'], $row['block'], $row['unit']);
            if (! $units) {
                $report[] = [$row['n'], $row['tenant'], 'UNPARSEABLE', '', '', '', '', "skip: token unit tak terbaca: {$row['unit']}"];

                continue;
            }

            foreach ($units as $u) {
                $stats['units']++;
                $unit = Unit::firstOrCreate(
                    ['unit_code' => $u['code']],
                    [
                        'branch_id' => $branch->id,
                        'floor' => $u['floor'],
                        'block' => $u['block'],
                        'unit_number' => $u['number'],
                        'size' => null,
                        'is_active' => true,
                    ]
                );

                $active = Tenancy::where('unit_id', $unit->id)->where('status', 'active')->first();
                if ($active) {
                    if ((int) $active->tenant_id === (int) $tenant->id) {
                        $stats['same']++;
                        $report[] = [$row['n'], $row['tenant'], 'EXISTS', $unit->unit_code, $unit->floor, $unit->block, $unit->unit_number, 'skip: tenancy aktif sama sudah ada'];
                    } else {
                        $stats['conflict']++;
                        $report[] = [$row['n'], $row['tenant'], 'CONFLICT', $unit->unit_code, $unit->floor, $unit->block, $unit->unit_number, "skip first-wins: unit sudah aktif milik tenant_id {$active->tenant_id}"];
                    }

                    continue;
                }

                Tenancy::create([
                    'unit_id' => $unit->id,
                    'tenant_id' => $tenant->id,
                    'start_date' => $today,
                    'status' => 'active',
                    'notes' => trim("Import unit.xlsx R{$row['n']}: {$row['unit']} | Zona: {$row['block']}" . ($u['note'] ? " | {$u['note']}" : '')),
                ]);
                $stats['tenancies']++;
                $report[] = [$row['n'], $row['tenant'], 'CREATED', $unit->unit_code, $unit->floor, $unit->block, $unit->unit_number, $unit->wasRecentlyCreated ? 'unit baru + tenancy aktif' : 'unit reuse + tenancy aktif'];
            }
        }

        $logDir = storage_path('logs');
        if (! is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        $logPath = $logDir . '/unit-xlsx-import-' . date('Ymd-His') . '.csv';
        $fh = fopen($logPath, 'w');
        fputcsv($fh, ['row', 'tenant', 'result', 'unit_code', 'floor', 'block', 'number', 'detail']);
        foreach ($report as $r) {
            fputcsv($fh, $r);
        }
        fclose($fh);

        $this->command->info("XLSX rows={$stats['rows']} units_touched={$stats['units']} tenancies_created={$stats['tenancies']} conflict={$stats['conflict']} no_tenant={$stats['no_tenant']} same={$stats['same']}");
        $this->command->info("Report: {$logPath}");
    }

    private function normName(?string $s): string
    {
        $s = (string) $s;
        $s = str_replace(['’', '`', '´'], "'", $s);
        $s = str_replace("''", "'", $s);
        $s = preg_replace('/\s+/u', ' ', $s);
        $s = trim($s);

        return mb_strtolower($s);
    }

    private function normFloor(?string $s): string
    {
        $s = trim((string) $s);
        if (mb_strtolower($s) === 'dasar') {
            return 'GF';
        }

        return $s;
    }

    private function readRows(string $path): array
    {
        $zip = new ZipArchive;
        $zip->open($path);
        $ss = new \SimpleXMLElement($zip->getFromName('xl/sharedStrings.xml'));
        $ss->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $strs = [];
        foreach ($ss->si as $si) {
            $strs[] = (string) $si->t;
        }
        $sh = new \SimpleXMLElement($zip->getFromName('xl/worksheets/sheet1.xml'));
        $sh->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $rows = [];
        foreach ($sh->sheetData->row as $row) {
            $vals = [];
            foreach ($row->c as $c) {
                $v = (string) ($c->v ?? '');
                if ((string) ($c['t'] ?? '') === 's' && $v !== '') {
                    $v = $strs[(int) $v] ?? '';
                }
                $vals[] = trim($v);
            }
            $vals = array_pad($vals, 4, '');
            if ($vals[0] === '' && $vals[3] === '') {
                continue;
            }
            $rows[] = ['n' => (int) ($row['r'] ?? 0), 'tenant' => $vals[0], 'floor' => $vals[1], 'block' => $vals[2], 'unit' => $vals[3]];
        }
        $zip->close();

        return $rows;
    }

    private function expandRow(string $floorCol, string $blockCol, string $unitCell): array
    {
        $floorCol = $this->normFloor($floorCol);
        $note = '';
        if (preg_match_all('/\(([^)]+)\)/', $unitCell, $m)) {
            $note = implode('; ', array_map('trim', $m[1]));
        }
        $cell = trim((string) preg_replace('/\([^)]*\)/', ' ', $unitCell));
        if ($cell === '') {
            return [];
        }

        $colBlocks = array_values(array_filter(array_map('trim', preg_split('/\s*&\s*/', trim($blockCol)) ?? [])));
        $groups = array_values(array_filter(array_map('trim', preg_split('/\s*&\s*/', $cell) ?? [])));
        if (! $groups) {
            return [];
        }

        // ponytail: zip grup hanya saat blok ganda + nomor sederhana sejajar (A & C + 10 & 15)
        $zip = count($colBlocks) > 1 && count($groups) === count($colBlocks) && ! str_contains($cell, '/');
        $out = [];
        if ($zip) {
            foreach ($groups as $i => $g) {
                foreach ($this->expandGroup($g, $floorCol, $colBlocks[$i]) as $u) {
                    $u['note'] = $note;
                    $out[] = $u;
                }
            }

            return $out;
        }

        // ponytail: prefix blok tanpa nomor (1/A) diwariskan ke grup & berikutnya
        $carry = [];
        foreach ($groups as $g) {
            if (count($colBlocks) > 1 && ! str_contains($g, '/')) {
                foreach ($colBlocks as $b) {
                    foreach ($this->expandGroup($g, $floorCol, $b, $carry) as $u) {
                        $u['note'] = $note;
                        $out[] = $u;
                    }
                }
                continue;
            }
            $before = count($out);
            foreach ($this->expandGroup($g, $floorCol, $blockCol, $carry) as $u) {
                $u['note'] = $note;
                $out[] = $u;
            }
            if (count($out) === $before) {
                $b = $this->prefixBlock($g);
                if ($b) {
                    $carry[] = $b;
                }
            } else {
                $carry = [];
            }
        }

        return $out;
    }

    private function prefixBlock(string $group): ?string
    {
        $group = trim($group);
        if (preg_match('/^(\d+|GF)\s*\/\s*([A-Za-z0-9]+)$/', $group, $m)) {
            return $m[2];
        }

        return null;
    }

    private function expandGroup(string $group, string $floorCol, string $defaultBlock, array $carry = []): array
    {
        $out = [];
        $segments = array_map('trim', explode(',', $group));
        $curFloor = $floorCol;
        $curBlock = $this->simpleBlock($defaultBlock) ? trim($defaultBlock) : null;
        $seen = $curBlock ? [$curBlock] : [];
        $pending = $carry;

        $emit = function (array $blocks, string $floor, string $numExpr) use (&$out, $floorCol) {
            foreach ($blocks as $b) {
                foreach ($this->expandNumbers($numExpr) as $num) {
                    $out[] = $this->makeUnit($floor, $b, $num, null);
                }
            }
        };

        foreach ($segments as $seg) {
            if ($seg === '') {
                continue;
            }
            // ponytail: 1/T/021/020 → floor 1, blok T, nomor [021,020]
            if (preg_match('/^(\d+|GF|Dasar)\s*\/\s*(.+)$/i', $seg, $m) && str_contains($m[2], '/')) {
                [$block, $nums] = explode('/', $m[2], 2);
                $block = trim($block);
                $targets = array_values(array_unique(array_merge($pending, [$block])));
                $pending = [];
                $seen = array_values(array_unique(array_merge($seen, $targets)));
                $curFloor = $this->normFloor($m[1]);
                $curBlock = $block;
                foreach (preg_split('/\s*\/\s*/', $nums) as $part) {
                    $emit($targets, $curFloor, trim($part));
                }
                continue;
            }
            if (preg_match('/^(\d+|GF|Dasar)\s*\/\s*([A-Za-z0-9]+)\s*\/\s*(.+)$/i', $seg, $m)) {
                $targets = array_values(array_unique(array_merge($pending, [trim($m[2])])));
                $pending = [];
                $seen = array_values(array_unique(array_merge($seen, $targets)));
                $curFloor = $this->normFloor($m[1]);
                $curBlock = trim($m[2]);
                $emit($targets, $curFloor, trim($m[3]));
                continue;
            }
            if (preg_match('/^([A-Za-z0-9]+)\s*\/\s*(.+)$/', $seg, $m)) {
                $left = trim($m[1]);
                $right = trim($m[2]);
                // ponytail: 1/A tanpa nomor = setter prefix, bukan unit
                if (preg_match('/^(\d+|GF)$/i', $left) && preg_match('/^[A-Za-z][A-Za-z0-9]*$/', $right)) {
                    $curFloor = $this->normFloor($left);
                    $curBlock = $right;
                    $seen = array_values(array_unique(array_merge($seen, [$right])));
                    continue;
                }
                if ($this->looksNumber($right)) {
                    $targets = array_values(array_unique(array_merge($pending, [$left])));
                    $pending = [];
                    $seen = array_values(array_unique(array_merge($seen, $targets)));
                    $curBlock = $left;
                    $emit($targets, $curFloor, $right);
                    continue;
                }
                // ponytail: token tak dikenal → unit_code raw, floor/block best-effort
                $out[] = $this->makeUnit($curFloor, $left, $right, $seg);
                continue;
            }
            if ($this->looksNumber($seg)) {
                $targets = $seen ?: [$defaultBlock];
                $emit($targets, $curFloor, $seg);
                continue;
            }
            if (preg_match('/^[A-Za-z][A-Za-z0-9]*$/', $seg)) {
                $pending[] = $seg;
                $seen = array_values(array_unique(array_merge($seen, [$seg])));
                continue;
            }
            $out[] = $this->makeUnit($curFloor, $curBlock ?? $defaultBlock, $seg, $seg);
        }

        return $out;
    }

    private function simpleBlock(string $b): bool
    {
        return (bool) preg_match('/^[A-Za-z]$/', trim($b));
    }

    private function looksNumber(string $s): bool
    {
        return (bool) preg_match('/^[A-Za-z0-9]+(\s*-\s*[A-Za-z0-9]+)?$/', trim($s));
    }

    private function expandNumbers(string $expr): array
    {
        $expr = trim($expr);
        if (! str_contains($expr, '-')) {
            return [$expr];
        }
        [$l, $r] = array_map('trim', explode('-', $expr, 2));
        // ponytail: range hanya untuk numerik murni naik; "11A - 2" = dua token
        $ln = preg_match('/^(\d+)([A-Za-z]*)$/', $l, $lm) ? $lm : null;
        $rn = preg_match('/^(\d+)([A-Za-z]*)$/', $r, $rm) ? $rm : null;
        if (! $ln || ! $rn || $rn[2] !== '' || (int) $rn[1] < (int) $ln[1] || (int) $rn[1] - (int) $ln[1] > 60) {
            return [$l, $r];
        }
        $width = max(strlen($ln[1]), strlen($rn[1]));
        $res = [];
        for ($i = (int) $ln[1]; $i <= (int) $rn[1]; $i++) {
            $s = str_pad((string) $i, $width, '0', STR_PAD_LEFT);
            $res[] = $i === (int) $ln[1] ? $s . $ln[2] : $s;
        }

        return $res;
    }

    private function makeUnit(string $floor, ?string $block, string $number, ?string $rawToken): array
    {
        $floor = $this->normFloor($floor);
        $block = trim((string) $block);
        $number = trim($number);

        if ($rawToken !== null && str_contains($rawToken, '/')) {
            $token = preg_replace('/\s+/', '', $rawToken);
            // ponytail: token tanpa lantai (K3/1, TM/1) dikualifikasi lantai kolom agar unique
            if (! preg_match('/^(\d+|GF)\//i', $token)) {
                $token = "{$floor}/{$token}";
            }
            $parts = explode('/', $token);
            $floor = $this->normFloor($parts[0]);
            $block = $parts[1] ?? $block;
            $number = end($parts);

            return ['floor' => $floor, 'block' => $block, 'number' => $number, 'code' => $token];
        }

        if (preg_match('/^\d+$/', $number)) {
            $number = str_pad($number, 3, '0', STR_PAD_LEFT);
        }

        return ['floor' => $floor, 'block' => $block, 'number' => $number, 'code' => "{$floor}-{$block}-{$number}"];
    }
}
