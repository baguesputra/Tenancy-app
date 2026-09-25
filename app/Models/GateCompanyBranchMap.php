<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GateCompanyBranchMap extends Model
{
    protected $table = 'gate_company_branch_map';

    protected $fillable = ['gate_company_id', 'branch_id'];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
