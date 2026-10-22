<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\FloorPlan;
use App\Models\Loo;
use App\Models\PermitRequest;
use App\Models\Unit;
use App\Services\BranchScopeService;
use enshrined\svgSanitize\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class FloorPlanController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $canPickBranch = $user ? $user->canViewAllBranches() : false;
        $branches = Branch::where('is_active', true)->select('id', 'name', 'code')->get();

        $branchId = (int) ($request->branch_id ?? ($user?->branch_id ?: ($branches->first()?->id ?? 1)));
        if (! $canPickBranch && $user?->branch_id) {
            $branchId = (int) $user->branch_id;
        }

        $floorPlans = FloorPlan::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('floor_order')
            ->get();

        $activeFloor = $request->floor ?? ($floorPlans->first()?->floor ?? 'GF');

        // Unit ID dengan LOO berjalan
        $looUnitIds = Loo::where('branch_id', $branchId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('unit_id')
            ->pluck('unit_id')
            ->flip()
            ->toArray();

        // Unit ID dengan Fitout berjalan (via PermitRequest yang diajukan/disetujui untuk tenant terkait)
        $fitoutUnitIds = PermitRequest::join('tenancies', function ($join) {
                $join->on('tenancies.tenant_id', '=', 'permit_requests.tenant_id')
                    ->where('tenancies.status', '=', 'active');
            })
            ->where('permit_requests.branch_id', $branchId)
            ->whereIn('permit_requests.status', ['approved', 'pending'])
            ->whereNotNull('tenancies.unit_id')
            ->pluck('tenancies.unit_id')
            ->flip()
            ->toArray();

        // Load units for all 5 floors (needed for 3D multi-floor building view & 2D quick switch)
        $allUnits = Unit::where('branch_id', $branchId)
            ->where('is_active', true)
            ->with(['activeTenancy.tenant.tenantCategory', 'activeTenancy.tenant.productCategory'])
            ->get()
            ->map(function ($u) use ($looUnitIds, $fitoutUnitIds) {
                $status = 'Kosong';
                if ($u->activeTenancy && $u->activeTenancy->status === 'active') {
                    $status = 'Aktif';
                } elseif (isset($looUnitIds[$u->id])) {
                    $status = 'LOO';
                } elseif (isset($fitoutUnitIds[$u->id])) {
                    $status = 'Fitout';
                }

                $tenant = $u->activeTenancy?->tenant;

                return [
                    'id' => $u->id,
                    'unit_code' => $u->unit_code,
                    'floor' => $u->floor,
                    'block' => $u->block,
                    'unit_number' => $u->unit_number,
                    'size' => $u->size ? (float) $u->size : null,
                    'polygon_points' => $u->polygon_points,
                    'custom_color' => $u->custom_color,
                    'status' => $status,
                    'tenant' => $tenant ? [
                        'id' => $tenant->id,
                        'name' => $tenant->name,
                        'trade_name' => $tenant->trade_name,
                        'logo_url' => $tenant->logo_url,
                        'category' => $tenant->tenantCategory?->name ?? $tenant->productCategory?->name ?? 'Retail',
                        'pic_name' => $tenant->pic_name,
                        'pic_phone' => $tenant->pic_phone,
                        'company_email' => $tenant->company_email,
                        'contract_number' => $u->activeTenancy?->contract_number,
                    ] : null,
                ];
            });

        // Summary stats
        $totalUnits = $allUnits->count();
        $occupiedUnits = $allUnits->where('status', 'Aktif')->count();
        $looUnits = $allUnits->where('status', 'LOO')->count();
        $fitoutUnits = $allUnits->where('status', 'Fitout')->count();
        $vacantUnits = $allUnits->where('status', 'Kosong')->count();

        return Inertia::render('FloorPlan/Index', [
            'branches' => $branches,
            'activeBranchId' => $branchId,
            'canPickBranch' => $canPickBranch,
            'floorPlans' => $floorPlans,
            'activeFloor' => $activeFloor,
            'units' => $allUnits,
            'summary' => [
                'total' => $totalUnits,
                'occupied' => $occupiedUnits,
                'loo' => $looUnits,
                'fitout' => $fitoutUnits,
                'vacant' => $vacantUnits,
            ],
        ]);
    }

    public function editor(Request $request, $floor = null)
    {
        $user = $request->user();
        $canPickBranch = $user ? $user->canViewAllBranches() : false;
        $branches = Branch::where('is_active', true)->select('id', 'name', 'code')->get();

        $branchId = (int) ($request->branch_id ?? ($user?->branch_id ?: ($branches->first()?->id ?? 1)));
        if (! $canPickBranch && $user?->branch_id) {
            $branchId = (int) $user->branch_id;
        }

        $floorPlans = FloorPlan::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('floor_order')
            ->get();

        $activeFloor = $floor ?? ($request->floor ?? ($floorPlans->first()?->floor ?? 'GF'));
        $currentPlan = $floorPlans->firstWhere('floor', $activeFloor);

        $units = Unit::where('branch_id', $branchId)
            ->where('floor', $activeFloor)
            ->where('is_active', true)
            ->with(['activeTenancy.tenant'])
            ->orderBy('unit_code')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'unit_code' => $u->unit_code,
                    'floor' => $u->floor,
                    'size' => $u->size,
                    'polygon_points' => $u->polygon_points,
                    'custom_color' => $u->custom_color,
                    'has_polygon' => ! empty($u->polygon_points),
                    'tenant_name' => $u->activeTenancy?->tenant?->name,
                ];
            });

        return Inertia::render('FloorPlan/Editor', [
            'branches' => $branches,
            'activeBranchId' => $branchId,
            'canPickBranch' => $canPickBranch,
            'floorPlans' => $floorPlans,
            'activeFloor' => $activeFloor,
            'currentPlan' => $currentPlan,
            'units' => $units,
        ]);
    }

    public function savePolygons(Request $request)
    {
        $validated = $request->validate([
            'units' => 'required|array',
            'units.*.id' => 'required|exists:units,id',
            'units.*.polygon_points' => 'nullable|array',
            'units.*.custom_color' => 'nullable|string|max:7',
        ]);

        foreach ($validated['units'] as $item) {
            Unit::where('id', $item['id'])->update([
                'polygon_points' => $item['polygon_points'] ?? null,
                'custom_color' => $item['custom_color'] ?? null,
            ]);
        }

        return back()->with('success', 'Koordinat poligon unit berhasil disimpan.');
    }

    public function uploadPlan(Request $request)
    {
        $request->validate([
            'floor_plan_id' => 'required|exists:floor_plans,id',
            'image' => 'required|file|max:30720',
        ]);

        $file = $request->file('image');
        $ext = strtolower($file->getClientOriginalExtension());

        if (! in_array($ext, ['svg', 'png', 'jpg', 'jpeg', 'webp'])) {
            return back()->withErrors(['image' => 'Format file harus berupa SVG, PNG, JPG, JPEG, atau WebP.']);
        }

        $plan = FloorPlan::findOrFail($request->floor_plan_id);

        $width = 1000;
        $height = 600;
        $viewBox = '0 0 1000 600';

        if ($ext === 'svg') {
            $svgContent = file_get_contents($file->getRealPath());

            // Sanitasi SVG dengan svg-sanitize
            $sanitizer = new Sanitizer();
            $cleanSvg = $sanitizer->sanitize($svgContent);

            // Ekstrak viewBox / width / height jika ada
            if (preg_match('/viewBox=[\'"]([^\'"]+)[\'"]/i', $cleanSvg, $m)) {
                $viewBox = trim($m[1]);
                $parts = preg_split('/[\s,]+/', $viewBox);
                if (count($parts) === 4) {
                    $width = (int) $parts[2];
                    $height = (int) $parts[3];
                }
            } elseif (preg_match('/width=[\'"]([0-9.]+)[\'"]/i', $cleanSvg, $mw) && preg_match('/height=[\'"]([0-9.]+)[\'"]/i', $cleanSvg, $mh)) {
                $width = (int) round((float) $mw[1]);
                $height = (int) round((float) $mh[1]);
                $viewBox = "0 0 {$width} {$height}";
            }

            $fileName = "floor_{$plan->branch_id}_{$plan->floor}_" . time() . '.svg';
            $path = "floorplans/{$fileName}";
            Storage::disk('public')->put($path, $cleanSvg);
        } else {
            $info = getimagesize($file->getRealPath());
            if ($info) {
                $width = $info[0];
                $height = $info[1];
                $viewBox = "0 0 {$width} {$height}";
            }
            $fileName = "floor_{$plan->branch_id}_{$plan->floor}_" . time() . ".{$ext}";
            $path = $file->storeAs('floorplans', $fileName, 'public');
        }

        // Hapus file lama jika ada
        if ($plan->image_path && Storage::disk('public')->exists($plan->image_path)) {
            Storage::disk('public')->delete($plan->image_path);
        }

        $plan->update([
            'image_path' => $path,
            'image_width' => $width,
            'image_height' => $height,
            'viewbox' => $viewBox,
        ]);

        return back()->with('success', 'Denah lantai berhasil diunggah.');
    }

    /**
     * Auto-Detect poligon dan label dari file SVG / DXF CAD
     */
    public function parseCad(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:30720',
            'branch_id' => 'required|exists:branches,id',
            'floor' => 'required|string',
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $content = file_get_contents($file->getRealPath());

        $existingUnits = Unit::where('branch_id', $request->branch_id)
            ->where('floor', $request->floor)
            ->select('id', 'unit_code')
            ->get()
            ->keyBy(fn ($u) => strtoupper(trim($u->unit_code)));

        $detectedMatches = [];

        if ($ext === 'svg') {
            $detectedMatches = $this->parseSvgPolygonsAndLabels($content, $existingUnits);
        } elseif ($ext === 'dxf') {
            $detectedMatches = $this->parseDxfPolygonsAndLabels($content, $existingUnits);
        }

        return response()->json([
            'success' => true,
            'total_detected' => count($detectedMatches),
            'matched_count' => collect($detectedMatches)->where('matched', true)->count(),
            'matches' => $detectedMatches,
        ]);
    }

    /**
     * Ekstraksi poligon & teks dari file SVG via DOM & Point-In-Polygon
     */
    private function parseSvgPolygonsAndLabels(string $svgContent, $existingUnits): array
    {
        $polygons = [];
        $labels = [];

        // 1. Ekstrak poligon SVG <polygon points="..." />
        if (preg_match_all('/<polygon\b[^>]*points=[\'"]([^\'"]+)[\'"][^>]*>/i', $svgContent, $matches)) {
            foreach ($matches[1] as $ptsStr) {
                $rawPairs = preg_split('/[\s,]+/', trim($ptsStr));
                $pts = [];
                for ($i = 0; $i < count($rawPairs) - 1; $i += 2) {
                    $pts[] = [(float) $rawPairs[$i], (float) $rawPairs[$i + 1]];
                }
                if (count($pts) >= 3) {
                    $polygons[] = $pts;
                }
            }
        }

        // 2. Ekstrak teks SVG <text x="..." y="...">Label</text>
        if (preg_match_all('/<text\b[^>]*x=[\'"]([0-9.]+)[\'"][^>]*y=[\'"]([0-9.]+)[\'"][^>]*>(.*?)<\/text>/is', $svgContent, $tMatches, PREG_SET_ORDER)) {
            foreach ($tMatches as $tm) {
                $x = (float) $tm[1];
                $y = (float) $tm[2];
                $label = trim(strip_tags($tm[3]));
                if (! empty($label)) {
                    $labels[] = ['text' => $label, 'x' => $x, 'y' => $y];
                }
            }
        }

        // 3. Algoritma Point-In-Polygon (Ray Casting)
        $results = [];
        foreach ($polygons as $poly) {
            $matchedLabel = null;
            foreach ($labels as $lbl) {
                if ($this->pointInPolygon($lbl['x'], $lbl['y'], $poly)) {
                    $matchedLabel = $lbl['text'];
                    break;
                }
            }

            $cleanCode = $matchedLabel ? strtoupper(trim($matchedLabel)) : null;
            $dbUnit = $cleanCode && isset($existingUnits[$cleanCode]) ? $existingUnits[$cleanCode] : null;

            $results[] = [
                'detected_label' => $matchedLabel,
                'unit_id' => $dbUnit?->id,
                'unit_code' => $dbUnit?->unit_code ?? $matchedLabel,
                'polygon_points' => $poly,
                'matched' => (bool) $dbUnit,
            ];
        }

        return $results;
    }

    /**
     * Parsing DXF teks & poligon sederhana
     */
    private function parseDxfPolygonsAndLabels(string $dxfContent, $existingUnits): array
    {
        // Simple DXF entity parser
        $lines = explode("\n", str_replace("\r", "", $dxfContent));
        $polygons = [];
        $labels = [];

        $count = count($lines);
        for ($i = 0; $i < $count - 1; $i++) {
            $code = trim($lines[$i]);
            $val = trim($lines[$i + 1]);

            // Deteksi teks
            if ($code === '0' && ($val === 'TEXT' || $val === 'MTEXT')) {
                $tx = 0;
                $ty = 0;
                $textVal = '';
                for ($j = $i + 2; $j < min($i + 40, $count - 1); $j += 2) {
                    $c = trim($lines[$j]);
                    $v = trim($lines[$j + 1]);
                    if ($c === '10') $tx = (float) $v;
                    if ($c === '20') $ty = (float) $v;
                    if ($c === '1') $textVal = $v;
                    if ($c === '0') break;
                }
                if (! empty($textVal)) {
                    $labels[] = ['text' => $textVal, 'x' => $tx, 'y' => $ty];
                }
            }
        }

        $results = [];
        foreach ($labels as $lbl) {
            $cleanCode = strtoupper(trim($lbl['text']));
            $dbUnit = isset($existingUnits[$cleanCode]) ? $existingUnits[$cleanCode] : null;
            if ($dbUnit) {
                // Default box jika poligon belum terurai dari DXF
                $x = $lbl['x'];
                $y = $lbl['y'];
                $box = [
                    [$x - 40, $y - 30],
                    [$x + 40, $y - 30],
                    [$x + 40, $y + 30],
                    [$x - 40, $y + 30],
                ];
                $results[] = [
                    'detected_label' => $lbl['text'],
                    'unit_id' => $dbUnit->id,
                    'unit_code' => $dbUnit->unit_code,
                    'polygon_points' => $box,
                    'matched' => true,
                ];
            }
        }

        return $results;
    }

    /**
     * Ray-Casting algorithm: Uji apakah titik (px, py) ada di dalam polygon
     */
    private function pointInPolygon(float $px, float $py, array $polygon): bool
    {
        $inside = false;
        $numPoints = count($polygon);
        $j = $numPoints - 1;

        for ($i = 0; $i < $numPoints; $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $py) !== ($yj > $py))
                && ($px < ($xj - $xi) * ($py - $yi) / (($yj - $yi) ?: 0.000000001) + $xi);

            if ($intersect) {
                $inside = ! $inside;
            }
            $j = $i;
        }

        return $inside;
    }
}

