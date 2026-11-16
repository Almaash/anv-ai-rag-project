<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\OtpVerification;
use App\Models\User;
use App\Models\Loan\LoanCustomer;
use App\Models\Loan\LoanAgent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ForgotPasswordController extends Controller
{
    /**
     * Step 1: Send OTP to email
     * POST /api/forgot-password
     */
    public function sendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $email = $request->email;
        $user  = $this->findUserByEmail($email);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No account found with this email.'], 404);
        }

        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        try {
            OtpVerification::where('email', $email)->delete();
            OtpVerification::create([
                'email'       => $email,
                'otp'         => $otp,
                'expires_at'  => Carbon::now()->addMinutes(10),
                'is_verified' => false,
            ]);

            Mail::to($email)->send(new OtpMail($otp, 'Reset Password OTP - Anavaran'));

            return response()->json([
                'success'    => true,
                'message'    => 'OTP sent to ' . $email . '. Valid for 10 minutes.',
                'user_type'  => $user['type'],
            ]);
        } catch (\Exception $e) {
            Log::error('Forgot password OTP error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to send OTP: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Step 2: Verify OTP
     * POST /api/verify-forgot-password-otp
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $record = OtpVerification::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        $record->update(['is_verified' => true]);

        return response()->json(['success' => true, 'message' => 'OTP verified. You can now reset your password.']);
    }

    /**
     * Step 3: Reset password
     * POST /api/reset-password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'otp'                   => 'required|string|size:6',
            'password'              => 'required|string|min:6|confirmed',
        ]);

        $record = OtpVerification::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('is_verified', true)
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'OTP not verified or expired. Please verify OTP first.'], 422);
        }

        $user = $this->findUserByEmail($request->email);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No account found with this email.'], 404);
        }

        $hashed  = Hash::make($request->password);
        $plain   = $request->password;

        match ($user['type']) {
            'user'     => User::where('email', $request->email)
                            ->update(['password' => $hashed, 'unhashed_password' => $plain]),
            'customer' => LoanCustomer::withoutGlobalScope('notDeleted')
                            ->where('email', $request->email)
                            ->update(['password' => $hashed, 'unhashed_password' => $plain]),
            'agent'    => LoanAgent::withoutGlobalScope('not_deleted')
                            ->where('email', $request->email)
                            ->update(['password' => $hashed, 'unhashed_password' => $plain]),
        };

        // Invalidate OTP
        $record->delete();

        return response()->json([
            'success'   => true,
            'message'   => 'Password reset successfully.',
            'user_type' => $user['type'],
        ]);
    }

    /**
     * Find user across users, loan_customers, loan_agents tables.
     */
    private function findUserByEmail(string $email): ?array
    {
        if (User::where('email', $email)->exists()) {
            return ['type' => 'user'];
        }

        if (LoanCustomer::where('email', $email)->exists()) {
            return ['type' => 'customer'];
        }

        if (LoanAgent::where('email', $email)->exists()) {
            return ['type' => 'agent'];
        }

        return null;
    }
}
