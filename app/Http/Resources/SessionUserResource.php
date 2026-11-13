<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi user login untuk aplikasi mobile Tenancy Sidak.
 */
class SessionUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->loadMissing(['branch:id,name', 'department:id,name']);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_number' => $this->employee_number,
            'photo_url' => $this->photo_url,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'department' => $this->department?->name,
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }
}
