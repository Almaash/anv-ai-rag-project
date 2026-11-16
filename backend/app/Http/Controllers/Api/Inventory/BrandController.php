<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Brand;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\AuthContext;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    private function saveLogo(UploadedFile $image): string
    {
        $destinationPath = public_path('inventory/brands');
        File::ensureDirectoryExists($destinationPath);

        $filename = uniqid('brand_', true) . '.' . strtolower($image->getClientOriginalExtension());
        $image->move($destinationPath, $filename);

        return '/inventory/brands/' . $filename;
    }

    private function deleteLogo(?string $logoPath): void
    {
        if (!$logoPath) {
            return;
        }

        $absolutePath = public_path(ltrim($logoPath, '/'));
        if (file_exists($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    public function index()
    {
        $brands = Brand::withoutGlobalScopes()
            ->where('status', 'active')
            ->when(AuthContext::branchId(), fn($q, $b) => $q->where('branch', $b))
            ->latest()
            ->get();
        return response()->json(['success' => true, 'data' => $brands]);
    }

    public function store(Request $request)
    {
        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                Rule::unique('inventory_brands', 'name')->where(fn($q) => $q->where('branch', $branch)->where('status', 'active')),
            ],
            'description' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        // Generate custom ID: INV-BRND-0001 (global across branches)
        $lastBrand = Brand::withoutBranchScope()->orderBy('id', 'desc')->first();
        $nextIdNum = 1;
        if ($lastBrand && preg_match('/INV-BRND-(\d+)/', $lastBrand->unique_id, $matches)) {
            $nextIdNum = (int)$matches[1] + 1;
        }
        $unique_id = 'INV-BRND-' . str_pad($nextIdNum, 4, '0', STR_PAD_LEFT);

        $brandData = [
            'unique_id'    => $unique_id,
            'name'         => $request->name,
            'description'  => $request->description,
            'status'       => $request->status,
            'branch'       => $branch,
            'branch_id'    => $branch,
            'cms_admin_id' => $cmsAdmin,
        ];

        if ($request->hasFile('logo')) {
            $brandData['logo'] = $this->saveLogo($request->file('logo'));
        }

        $brand = Brand::create($brandData);

        return response()->json(['success' => true, 'message' => 'Brand added successfully', 'data' => $brand]);
    }

    public function show($id)
    {
        $brand = Brand::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$brand) return response()->json(['success' => false, 'message' => 'Brand not found'], 404);
        return response()->json(['success' => true, 'data' => $brand]);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$brand) return response()->json(['success' => false, 'message' => 'Brand not found'], 404);

        $branch   = AuthContext::branchId();
        $cmsAdmin = AuthContext::cmsAdminId();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                Rule::unique('inventory_brands', 'name')
                    ->ignore($brand->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'description' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $brandData = $request->only(['name', 'description', 'status']);

        if ($request->hasFile('logo')) {
            $this->deleteLogo($brand->logo);
            $brandData['logo'] = $this->saveLogo($request->file('logo'));
        }

        $brand->update($brandData);

        return response()->json(['success' => true, 'message' => 'Brand updated successfully', 'data' => $brand]);
    }

    public function destroy($id)
    {
        $brand = Brand::where('id', $id)->orWhere('unique_id', $id)->first();
        if (!$brand) return response()->json(['success' => false, 'message' => 'Brand not found'], 404);

        $brand->status = 'inactive';
        $brand->save();
        return response()->json(['success' => true, 'message' => 'Brand deleted successfully']);
    }
}
