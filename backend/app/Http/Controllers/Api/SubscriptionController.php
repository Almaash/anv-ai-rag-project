<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function get()
    {
        try {
            $subscription = Subscription::first();
            return response()->json([
                'status' => 'success',
                'message' => 'Subscription retrieved successfully',
                'data' => ['subscription' => $subscription]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function upsert(Request $request)
    {
        try {
            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date',
                'plan_name' => 'required|string',
                'price' => 'required|numeric',
                'remarks' => 'nullable|string'
            ]);

            $subscription = Subscription::first();
            
            if ($subscription) {
                $subscription->update($validated);
                $message = 'Subscription updated successfully';
            } else {
                $subscription = Subscription::create($validated);
                $message = 'Subscription created successfully';
            }

            return response()->json([
                'status' => 'success',
                'message' => $message,
                'data' => ['subscription' => $subscription]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}
