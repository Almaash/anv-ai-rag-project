"use client";

import React from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useForm, SubmitHandler } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Eye, EyeOff } from "lucide-react";

interface LoginForm {
  email: string;
  password: string;
}

export default function FinanceSignInPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const [serverError, setServerError] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmit: SubmitHandler<LoginForm> = async (data) => {
    setServerError("");
    try {
      const response = await axiosInstance.post(ProjectApiList.login, {
        email: data.email,
        password: data.password,
      });

      const { token, user, permissions } = response.data.data;

      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax;`;

      const finalPermissions = [
        "read_finance_dashboard",
        "read_finance_transactions",
        "create_finance_transaction",
        "edit_finance_transaction",
        "delete_finance_transaction",
        "read_finance_cash_book",
      ];

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("permissions", JSON.stringify(finalPermissions));
      localStorage.setItem("user_type", "finance");

      window.location.href = "/finance/dashboard";
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message || "Invalid Email or Password"
      );
    }
  };

  return (
    <>
      <Header />
      <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 py-6 sm:py-8 md:py-12 relative overflow-hidden bg-white">
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center text-center mb-8 lg:mb-0 order-2 lg:order-1">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={320}
            height={320}
            className="w-[220px] h-[220px] md:w-[320px] md:h-[320px] object-contain"
            priority
          />
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-800 mt-4">
            Finance & Accounts Panel
          </h2>
          <p className="text-emerald-700 text-sm mt-1 tracking-wide">
            Accountant & Finance Management System 💰
          </p>
        </div>

        <div className="w-full lg:w-1/2 flex justify-center order-1 lg:order-2">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center overflow-hidden">
              <Image src="/images/logo2.png" alt="Mini Logo" width={32} height={32} />
            </div>

            <div className="mt-10 mb-8 text-center">
              <h1 className="text-2xl font-bold text-emerald-800 mb-2">
                Welcome <span className="underline decoration-emerald-600">Finance Team</span>
              </h1>
              <p className="text-emerald-700 text-sm">
                Sign in to access the Finance & Accounts portal.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md py-2 px-3 text-center">
                  {serverError}
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  placeholder="Enter your email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                      message: "Please enter a valid email address",
                    },
                  })}
                  className="w-full px-4 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                {errors.email && (
                  <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" },
                    })}
                    className="w-full px-4 py-2.5 pr-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-900"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-emerald-600 text-white font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isSubmitting ? "Signing In..." : "Sign In to Finance"}
              </button>

              {/* <div className="text-center text-xs mt-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1 text-emerald-700">💰 Finance & Accounts Portal</p>
                  <p className="text-emerald-600">Manage transactions, credits, debits and financial reports</p>
                </div>
              </div> */}
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
