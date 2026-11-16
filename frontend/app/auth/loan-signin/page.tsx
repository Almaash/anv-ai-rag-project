"use client";

import React, { useState } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useForm, SubmitHandler } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
// import { console } from "inspector";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoanSignInPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "customer">("admin");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginForm>();

  const [serverError, setServerError] = useState("");

  /* ================= ADMIN LOGIN ================= */

  const adminLogin: SubmitHandler<LoginForm> = async (data) => {
    setServerError("");

    try {
      const response = await axiosInstance.post(ProjectApiList.loan_login, {
        email: data.email,
        password: data.password,
      });

      const { token, user, permissions } = response.data.data;

      const { created_by, ...restUser } = user;

      const modifiedUser = {
        ...restUser,
        cms_admin: created_by,
      };

      document.cookie = `token=${token}; path=/; max-age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax;`;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(modifiedUser));
      localStorage.setItem("permissions", JSON.stringify(permissions || []));

      window.location.href = "/loan/dashboard";
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message || "Invalid email or password"
      );
    }
  };

  /* ================= CUSTOMER LOGIN ================= */

  const customerLogin: SubmitHandler<LoginForm> = async (data) => {
    setServerError("");

    try {
      const response = await axiosInstance.post(
        "loan-customer/login",
        data
      );

      // console.log("Customer Login Response:", response.data.data);
      const { token, user } = response.data.data;

      document.cookie = `token=${token}; path=/; max-age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax;`;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      window.location.href = "/loan/dashboard";
    } catch (error: any) {
      setServerError(
        error?.response?.data?.message || "Invalid login credentials"
      );
    }
  };

  const onSubmit = activeTab === "admin" ? adminLogin : customerLogin;

  return (
    <>
      <Header />

      <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 py-10 bg-white">

        {/* LEFT IMAGE */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={400}
            height={400}
            className="object-contain"
          />
        </div>

        {/* RIGHT LOGIN */}
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

            <h1 className="text-xl font-bold text-[#0232B5] text-center mt-6">
              Loan Management Login
            </h1>

            {/* ================= TABS ================= */}

            <div className="flex mt-6 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => {
                  setActiveTab("admin");
                  reset();
                }}
                className={`flex-1 py-2 rounded-full text-sm font-semibold ${
                  activeTab === "admin"
                    ? "bg-[#0232B5] text-white"
                    : "text-gray-600"
                }`}
              >
                Admin Login
              </button>

              {/* <button
                onClick={() => {
                  setActiveTab("customer");
                  reset();
                }}
                className={`flex-1 py-2 rounded-full text-sm font-semibold ${
                  activeTab === "customer"
                    ? "bg-[#0232B5] text-white"
                    : "text-gray-600"
                }`}
              >
                Customer Login
              </button> */}
            </div>

            {/* ================= FORM ================= */}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 mt-6"
            >
              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md py-2 px-3 text-center">
                  {serverError}
                </p>
              )}

              {/* EMAIL */}
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

              {/* PASSWORD */}
              <div>
                <label className="text-sm font-semibold text-[#0232B5]">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Enter password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  className="w-full mt-1 px-4 py-2.5 rounded-full bg-[#0232B5]/10 border border-[#0232B5]/30 focus:ring-2 focus:ring-[#0232B5] outline-none"
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
                className="w-full py-3 rounded-full bg-[#0232B5] text-white font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}

                {isSubmitting
                  ? "Signing In..."
                  : activeTab === "admin"
                  ? "Admin Sign In"
                  : "Customer Sign In"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}