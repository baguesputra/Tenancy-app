<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role;

class MasterScope extends Model
{
    protected $fillable = [
        'role_id',
        'tenant_category_id',
        'mode',
        'can_view',
        'view_own_only',
        'can_create',
        'can_edit',
        'edit_own_only',
    ];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'view_own_only' => 'boolean',
            'can_create' => 'boolean',
            'can_edit' => 'boolean',
            'edit_own_only' => 'boolean',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function tenantCategory()
    {
        return $this->belongsTo(TenantCategory::class);
    }
}
