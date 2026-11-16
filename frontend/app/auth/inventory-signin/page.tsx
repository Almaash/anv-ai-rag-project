"use client";

import React from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useForm, SubmitHandler } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface LoginForm {
  email: string;
  password: string;
}

export default function InventorySignInPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const [serverError, setServerError] = React.useState<string>("");

  const onSubmit: SubmitHandler<LoginForm> = async (data) => {
    setServerError("");

    try {
      const response = await axiosInstance.post(
        ProjectApiList.inventory_login, // ✅ make sure this exists
        {
          email: data.email,
          password: data.password,
        }
      );

      /*
        Expected Backend Response:

        {
          status: "success",
          data: {
            token: "...",
            user: { name, role },
            permissions: []
          }
        }
      */

      const { token, user, permissions } = response.data.data;

      // ✅ Save cookie (7 days)
      document.cookie = `token=${token}; path=/; max-age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax;`;

      // ✅ Save localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("permissions", JSON.stringify(permissions || []));

      // ✅ Redirect
      window.location.href = "/inventory/dashboard";
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message ||
          "Invalid Email or Password"
      );
    }
  };

  return (
    <>
      <Header />

      <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 py-6 sm:py-8 md:py-12 relative overflow-hidden bg-white">

        {/* Left Section */}
<div className="hidden lg:flex lg:w-1/2 flex-col items-center text-center mb-8 lg:mb-0 order-2 lg:order-1">          <Image
            src="/images/logo.png"
            alt="Logo"
            width={320}
            height={320}
            className="w-[220px] h-[220px] md:w-[320px] md:h-[320px] object-contain"
            priority
          />
          <h2 className="text-2xl md:text-3xl font-bold text-orange-800 mt-4">
            Inventory Panel
          </h2>
          <p className="text-orange-700 text-sm mt-1 tracking-wide">
            Inventory & Stock Management System 📦
          </p>
        </div>

        {/* Right Section */}
        <div className="w-full lg:w-1/2 flex justify-center order-1 lg:order-2">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">

            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center overflow-hidden">
              <Image
                src="/images/logo2.png"
                alt="Mini Logo"
                width={32}
                height={32}
              />
            </div>

            <h1 className="text-2xl font-bold text-orange-800 text-center mt-10 mb-2">
              Welcome to{" "}
              <span className="underline decoration-orange-600">
                Inventory
              </span>
            </h1>

            <p className="text-center text-orange-700 text-sm mb-8">
              Please sign in to continue.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md py-2 px-3 text-center">
                  {serverError}
                </p>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  placeholder="Enter your Email"
                  {...register("email", {
                    required: "Email is required",
                  })}
                  className="w-full px-4 py-2.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                {errors.email && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  className="w-full px-4 py-2.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-orange-600 text-white font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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