<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackfillTenantLogos extends Command
{
    protected $signature = 'tenants:backfill-logos
        {--dry-run : Tampilkan kecocokan tanpa menyalin file / mengubah DB}
        {--archive : Arsipkan folder sumber setelah backfill (tanpa ini file sumber dibiarkan)}
        {--source=public/images/tenant : Folder sumber file logo}
        {--archive-dir=storage/app/private/tenant-logos-archive : Folder arsip sumber setelah backfill}';

    protected $description = 'Cocokkan file logo di folder sumber ke tenant berdasar nama, salin ke storage tenant-logos';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $source = base_path($this->option('source'));

        $bySlug = [];
        foreach (File::files($source) as $file) {
            $ext = strtolower($file->getExtension());
            if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp'], true)) continue;
            $base = pathinfo($file->getFilename(), PATHINFO_FILENAME);
            if (str_ends_with($base, '-400x284')) continue;
            $slug = $this->slug($base);
            $bySlug[$slug][] = $file->getPathname();
        }

        $matched = 0;
        $skippedDuplicateName = [];
        $noFile = [];
        $ambiguous = [];

        Tenant::orderBy('id')->chunkById(200, function ($tenants) use (
            $bySlug, $dryRun, &$matched, &$skippedDuplicateName, &$noFile, &$ambiguous
        ) {
            foreach ($tenants as $tenant) {
                $slug = $this->slug($tenant->name);
                $candidates = $bySlug[$slug] ?? [];

                if ($tenant->logo_path) {
                    continue;
                }

                if (count($candidates) === 0) {
                    $noFile[] = "#{$tenant->id} {$tenant->name}";

                    continue;
                }

                if (count($candidates) > 1) {
                    $ambiguous[] = "#{$tenant->id} {$tenant->name} => " . implode(', ', array_map('basename', $candidates));

                    continue;
                }

                if (Tenant::where('name', $tenant->name)->count() > 1) {
                    $skippedDuplicateName[] = "#{$tenant->id} {$tenant->name}";

                    continue;
                }

                $src = $candidates[0];
                $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION));
                $dest = "tenant-logos/{$tenant->id}-" . Str::slug($tenant->name) . ".{$ext}";

                if (! $dryRun) {
                    Storage::disk('public')->put($dest, File::get($src));
                    $tenant->update(['logo_path' => $dest]);
                }

                $matched++;
            }
        });

        $orphans = [];
        $slugs = Tenant::pluck('name')->map(fn ($n) => $this->slug($n))->flip()->toArray();
        foreach ($bySlug as $slug => $paths) {
            if (! isset($slugs[$slug])) {
                foreach ($paths as $p) $orphans[] = basename($p);
            }
        }

        $this->info(($dryRun ? '[DRY-RUN] ' : '') . "Cocok: {$matched}");
        $this->table(
            ['Kategori', 'Jumlah'],
            [
                ['Tenant tanpa file', count($noFile)],
                ['Nama duplikat (dilewati)', count($skippedDuplicateName)],
                ['File ambigu (>1 kandidat)', count($ambiguous)],
                ['File tanpa tenant', count($orphans)],
            ]
        );

        foreach (['Tenant tanpa file' => $noFile, 'Nama duplikat' => $skippedDuplicateName, 'Ambigu' => $ambiguous, 'File tanpa tenant' => $orphans] as $label => $rows) {
            if (! $rows) continue;
            $this->line("--- {$label} (" . count($rows) . ') ---');
            foreach (array_slice($rows, 0, 80) as $r) $this->line("  {$r}");
            if (count($rows) > 80) $this->line('  ... +' . (count($rows) - 80) . ' lainnya');
        }

        if ($dryRun) {
            $this->comment('Dry-run: tidak ada file disalin / DB diubah. Jalankan tanpa --dry-run untuk eksekusi.');
        } elseif ($this->option('archive')) {
            return $this->archiveSource();
        }

        return self::SUCCESS;
    }

    private function archiveSource(): int
    {
        $source = base_path($this->option('source'));
        $archive = base_path($this->option('archive-dir'));

        if (! is_dir($source)) {
            $this->error("Folder sumber tidak ada: {$source}");

            return self::FAILURE;
        }

        File::ensureDirectoryExists($archive);
        $moved = 0;

        foreach (File::files($source) as $file) {
            File::move($file->getPathname(), $archive . '/' . $file->getFilename());
            $moved++;
        }

        $this->info("Arsip selesai. {$moved} file dipindah ke {$archive}.");

        return self::SUCCESS;
    }

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/\([^)]*\)/u', ' ', $value);
        $value = str_replace(['&'], ' ', $value);
        $value = str_replace(["'", "'", '`'], '', $value);
        $value = preg_replace('/[^a-z0-9]+/u', '-', $value);

        return trim($value ?? '', '-');
    }
}
