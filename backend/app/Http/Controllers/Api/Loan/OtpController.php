<?php

namespace App\Http\Controllers\Api\Loan;

use App\Http\Controllers\Controller;
use App\Models\OtpVerification;
use App\Mail\OtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\Loan\LoanCustomer;
use Carbon\Carbon;

class OtpController extends Controller
{
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $email = $request->email;

        $existingCustomer = LoanCustomer::where('email', $email)->first();
        if ($existingCustomer) {
            return response()->json([
                'success' => false,
                'errors'  => ['email' => ['This email is already registered as a customer.']],
                'message' => 'The email has already been taken.'
            ], 422);
        }

        $otp       = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = Carbon::now()->addMinutes(10);

        try {
            OtpVerification::where('email', $email)->delete();

            OtpVerification::create([
                'email'       => $email,
                'otp'         => $otp,
                'expires_at'  => $expiresAt,
                'is_verified' => false
            ]);

            Mail::to($email)->send(new OtpMail($otp));

            Log::info("OTP sent to {$email}");

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('OTP Send Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP email: ' . $e->getMessage()
            ], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6'
        ]);

        $otpRecord = OtpVerification::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP'
            ], 422);
        }

        $otpRecord->update(['is_verified' => true]);

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully'
        ]);
    }
}
