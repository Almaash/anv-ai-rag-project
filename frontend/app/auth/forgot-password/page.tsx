"use client";

import React, { useState } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

interface ForgotPasswordForm {
    email: string;
    otp: string;
    password: string;
    password_confirmation: string;
}

export default function ForgotPasswordPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordMismatch, setPasswordMismatch] = useState(false);


    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ForgotPasswordForm>();

    const email = watch("email");

    // STEP 1
    const sendOtp = async () => {
        try {
            setLoading(true);

            await axiosInstance.post(
                ProjectApiList.forgot_password,
                {
                    email,
                }
            );

            toast.success("OTP sent successfully");
            setStep(2);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Unable to send OTP"
            );
        } finally {
            setLoading(false);
        }
    };

    // STEP 2
    const verifyOtp = async () => {
        try {
            setLoading(true);

            const otp = watch("otp");

            await axiosInstance.post(
                ProjectApiList.verify_forgot_password_otp,
                {
                    email,
                    otp,
                }
            );

            toast.success("OTP verified");
            setStep(3);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Invalid OTP"
            );
        } finally {
            setLoading(false);
        }
    };

    // STEP 3
    const resetPassword = async (data: ForgotPasswordForm) => {
        try {
            setLoading(true);

            await axiosInstance.post(
                ProjectApiList.reset_password,
                {
                    email: data.email,
                    otp: data.otp,
                    password: data.password,
                    password_confirmation:
                        data.password_confirmation,
                }
            );

            toast.success(
                "Password changed successfully"
            );

            window.location.href = "/auth/customer-login/";
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Password reset failed"
            );
        } finally {
            setLoading(false);
        }
    };

    const password = watch("password");

    return (
        <>
            <Header />

            <section className="min-h-screen flex items-center justify-center px-6 py-10 bg-white">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                    <div className="flex justify-center mb-4">
                        <Image
                            src="/images/logo2.png"
                            alt="logo"
                            width={50}
                            height={50}
                        />
                    </div>

                    <h1 className="text-2xl font-bold text-center text-[#0232B5]">
                        Forgot Password
                    </h1>

                    <p className="text-center text-gray-500 mb-6">
                        Reset your account password
                    </p>

                    <form
                        onSubmit={handleSubmit(resetPassword)}
                        className="space-y-4"
                    >
                        {/* EMAIL */}
                        <div>
                            <label>Email</label>

                            <input
                                type="email"
                                placeholder="Enter Email"
                                {...register("email", {
                                    required: "Email is required",
                                })}
                                disabled={step > 1}
                                className="w-full mt-1 px-4 py-2.5 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30"
                            />

                            {errors.email && (
                                <p className="text-red-500 text-xs">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* SEND OTP */}
                        {step === 1 && (
                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={loading}
                                className="w-full py-3 rounded-full bg-[#0232B5] text-white"
                            >
                                {loading
                                    ? "Sending..."
                                    : "Send OTP"}
                            </button>
                        )}

                        {/* OTP */}
                        {step >= 2 && (
                            <>
                                <div>
                                    <label>OTP</label>

                                    <input
                                        type="text"
                                        placeholder="Enter OTP"
                                        {...register("otp", {
                                            required:
                                                step >= 2
                                                    ? "OTP is required"
                                                    : false,
                                        })}
                                        className="w-full mt-1 px-4 py-2.5 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30"
                                    />
                                </div>
                            </>
                        )}

                        {/* VERIFY OTP */}
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={verifyOtp}
                                disabled={loading}
                                className="w-full py-3 rounded-full bg-[#0232B5] text-white"
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify OTP"}
                            </button>
                        )}

                        {/* RESET PASSWORD */}
                        {step === 3 && (
                            <>
                                <div>
                                    <label>New Password</label>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="New Password"
                                            {...register("password", {
                                                required: "Password is required",
                                                minLength: {
                                                    value: 6,
                                                    message: "Minimum 6 characters",
                                                },
                                            })}
                                            className="w-full mt-1 px-4 py-2.5 pr-12 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}
                                        </button>
                                    </div>

                                    {errors.password && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label>Confirm Password</label>

                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm Password"
                                            {...register("password_confirmation", {
                                                required: "Confirm Password is required",
                                                validate: (value) =>
                                                    value === watch("password") ||
                                                    "Passwords do not match",
                                            })}
                                            className="w-full mt-1 px-4 py-2.5 pr-12 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(!showConfirmPassword)
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}
                                        </button>
                                    </div>

                                    {errors.password_confirmation && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.password_confirmation.message}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-full bg-[#0232B5] text-white"
                                >
                                    {loading
                                        ? "Updating..."
                                        : "Reset Password"}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </section>

            <Footer />
        </>
    );
}