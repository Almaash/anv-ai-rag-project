<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\AuthContext;
use Illuminate\Validation\Rule;

class VendorController extends Controller
{
    private function saveProfilePhoto(UploadedFile $image): string
    {
        $destinationPath = public_path('inventory/vendors');
        File::ensureDirectoryExists($destinationPath);

        $filename = uniqid('vendor_', true) . '.' . strtolower($image->getClientOriginalExtension());
        $image->move($destinationPath, $filename);

        return '/inventory/vendors/' . $filename;
    }

    private function deleteProfilePhoto(?string $photoPath): void
    {
        if (!$photoPath) {
            return;
        }

        $absolutePath = public_path(ltrim($photoPath, '/'));
        if (file_exists($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    /**
     * Get All Vendors (only active)
     */
    public function index()
    {
        $branch  = AuthContext::branchId();
        $query   = Vendor::withoutGlobalScopes()->where('status', 'active');

        if ($branch) {
            $query->where(function($q) use ($branch) {
                $q->where('branch_id', $branch)
                  ->orWhere(function($q2) use ($branch) {
                      $q2->whereNull('branch_id')->where('branch', $branch);
                  });
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Vendors retrieved successfully',
            'data'    => $query->orderBy('created_at', 'desc')->get()
        ]);
    }

    /**
     * Create Vendor
     */
    public function store(Request $request)
    {
        try {
            $branch = AuthContext::branchId() ?? 'default';

            $validator = Validator::make($request->all(), [
                'name' => 'required|string',
                'business_name' => 'nullable|string',
                'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'email' => 'nullable|email',
                'phone' => [
                    'required',
                    'digits:10',
                    Rule::unique('inventory_vendors', 'phone')->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
                ],
                'address' => 'nullable|string',
                'gst_number' => 'nullable|string',
                'status' => 'nullable|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // --- Unique ID Generation logic (global across branches) ---
            $lastRecord = Vendor::withoutBranchScope()->orderBy('id', 'desc')->first();
            if (!$lastRecord) {
                $unique_id = 'INV-VEN-0001';
            } else {
                // Suppose last unique_id is INV-VEN-0005
                // Extract numeric part
                $numericPart = (int) str_replace('INV-VEN-', '', $lastRecord->unique_id);
                $newNumericPart = $numericPart + 1;
                // Pad with leading zeros (e.g., 6 => 0006)
                $unique_id = 'INV-VEN-' . str_pad($newNumericPart, 4, '0', STR_PAD_LEFT);
            }
            // ---------------------------------
            
            $vendorData = $request->only(['name', 'business_name', 'email', 'phone', 'address', 'gst_number', 'status']);
            $vendorData['unique_id']    = $unique_id;
            $vendorData['branch']       = $branch;
            $vendorData['branch_id']    = $branch;
            $vendorData['cms_admin_id'] = AuthContext::cmsAdminId();

            if ($request->hasFile('profile_photo')) {
                $vendorData['profile_photo'] = $this->saveProfilePhoto($request->file('profile_photo'));
            }

            $vendor = Vendor::create($vendorData);

            return response()->json([
                'success' => true,
                'message' => 'Vendor created successfully',
                'data' => $vendor
            ]);
    } catch (\Exception $e) {
            if (str_contains($e->getMessage(), '1062') || str_contains($e->getMessage(), 'Duplicate entry')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This phone number is already registered for a vendor in your branch.',
                    'errors' => ['phone' => ['This phone number already exists in your branch.']]
                ], 422);
            }
            return response()->json([
                'success' => false,
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Single Vendor
     */
    public function show($id)
    {
        $vendor = Vendor::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Vendor not found',
                'data' => null
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Vendor retrieved successfully',
            'data' => $vendor
        ]);
    }

    /**
     * Update Vendor
     */
    public function update(Request $request, $id)
    {
        $vendor = Vendor::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Vendor not found',
                'data' => null
            ], 404);
        }

        $branch = AuthContext::branchId() ?? $vendor->branch;

        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'business_name' => 'nullable|string',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'email' => 'nullable|email',
            'phone' => [
                'required',
                'digits:10',
                Rule::unique('inventory_vendors', 'phone')
                    ->ignore($vendor->id)
                    ->where(function ($query) use ($branch) {
                        return $query->where('branch', $branch)
                            ->where('status', 'active');
                    }),
            ],
            'address' => 'nullable|string',
            'gst_number' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $vendorData = $request->only(['name', 'business_name', 'email', 'phone', 'address', 'gst_number', 'status']);

        if ($request->hasFile('profile_photo')) {
            $this->deleteProfilePhoto($vendor->profile_photo);
            $vendorData['profile_photo'] = $this->saveProfilePhoto($request->file('profile_photo'));
        }

        $vendor->update($vendorData);

        return response()->json([
            'success' => true,
            'message' => 'Vendor updated successfully',
            'data' => $vendor
        ]);
    }

    /**
     * Permanent Delete Vendor
     */
    public function destroy($id)
    {
        $vendor = Vendor::where('id', $id)->orWhere('unique_id', $id)->first();

        if (!$vendor) {
            return response()->json(['success' => false, 'message' => 'Vendor not found'], 404);
        }

        // Soft delete — mark inactive, do NOT delete from DB
        $vendor->update(['status' => 'inactive']);

        return response()->json(['success' => true, 'message' => 'Vendor deleted successfully']);
    }
}
