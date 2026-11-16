<?php

namespace App\Exports;

use App\Exports\Sheets\InspectionComplianceSheet;
use App\Exports\Sheets\InspectionFindingsSheet;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class InspectionSessionsExport implements Export, WithMultipleSheets
{
    public function __construct(
        private Builder $inspectionsQuery,
        private Builder $findingsQuery,
    ) {}

    public function sheets(): array
    {
        return [
            new InspectionComplianceSheet($this->inspectionsQuery),
            new InspectionFindingsSheet($this->findingsQuery),
        ];
    }
}
