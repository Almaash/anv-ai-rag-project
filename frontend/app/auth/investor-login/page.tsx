"use client";

import React, { useState } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useForm, SubmitHandler } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

interface LoginForm {
  email: string;
  password: string;
}

export default function SignInPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<LoginForm> = async (data) => {
    setServerError("");

    try {
      const response = await axiosInstance.post(ProjectApiList.loan_investor_login, {
        email: data.email,
        password: data.password,
      });

      // console.log("Login Response:", response.data.data.user);

      const { token, user, permissions, user_type, redirect_to } =
        response.data.data;

      // Keep the same localStorage structure as loan login
      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60
        }; SameSite=Lax;`;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("permissions", JSON.stringify(permissions || []));
      localStorage.setItem("user_type", user_type || "staff");

      window.location.href = "/admin/avaranDemo";
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message || "Invalid email or password"
      );
    }
  };

  return (
    <>
      <Header />

      <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 py-10 bg-white">
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={400}
            height={400}
            className="object-contain"
            priority
          />
        </div>

        <div className="w-full lg:w-1/2 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border-4 border-white rounded-full shadow-md p-2">
              <Image
                src="/images/logo2.png"
                alt="Mini Logo"
                width={32}
                height={32}
              />
            </div>

            <h1 className="text-xl font-bold text-[#0232B5] text-center mt-6 mb-2">
              Welcome to Anavran <br /> Investor Login
            </h1>
            <p className="text-center text-gray-500 text-sm mb-8">
              Sign in to access your dashboard
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md py-2 px-3 text-center">
                  {serverError}
                </p>
              )}

              <div>
                <label className="text-sm font-semibold text-[#0232B5]">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email"
                  {...register("email", { required: "Email is required" })}
                  className="w-full mt-1 px-4 py-2.5 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30 focus:ring-2 focus:ring-[#0232B5] outline-none"
                />
                {errors.email && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-[#0232B5]">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    {...register("password", {
                      required: "Password is required",
                    })}
                    className="w-full px-4 py-2.5 pr-12 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30 focus:ring-2 focus:ring-[#0232B5] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0232B5] hover:text-[#011d66]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="text-right">
                {/* <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[#0232B5] hover:underline"
                >
                  Forgot Password?
                </Link> */}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-[#0232B5] text-white font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
