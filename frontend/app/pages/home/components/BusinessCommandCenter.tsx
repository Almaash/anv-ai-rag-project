"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Users,
  Wallet,
  ChevronRight,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  {
    id: "ecommerce",
    label: "E-Commerce",
    icon: <ShoppingBag size={18} />,
    title: "Manage Your Sales",
    desc: "E-Commerce (Hire Purchase) Select Product, add Information to Cart by adding infomation and enjoy the hassle-free process.",
    features: ["Inventory Tracking", "Order Management", "Sales Analytics"],
  },
  {
    id: "hrms",
    label: "HRMS & Team",
    icon: <Users size={18} />,
    title: "Empower Your Team",
    desc: "Monitor team performance, handle recruitment, and manage payroll through our integrated HRMS.",
    features: ["Attendance System", "Performance Tracking", "Payout Management"],
  },
  {
    id: "finance",
    label: "Financial Tools",
    icon: <Wallet size={18} />,
    title: "Financial Control",
    desc: "Manage Repayment schedules, Product disbursements, customer onboarding user dashboard and fund flow management.",
    features: ["Instant EMI Setup", "Credit Facilitation", "Earnings Dashboard"],
  },
];

export default function BusinessCommandCenter() {
  const [activeTab, setActiveTab] = useState(modules[0]);

  return (
    <section className="py-20 bg-[#F7FAF9] overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="max-w-xl">
            <span className="text-[#199A95] font-semibold tracking-[0.18em] text-[11px] uppercase">
              Management Suite
            </span>

            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mt-3 tracking-tight">
              One Login.{" "}
              <span className="text-[#199A95] italic font-serif">
                Infinite Control.
              </span>
            </h2>
          </div>

          <p className="text-slate-500 text-sm md:text-base max-w-sm mb-1">
            Seamlessly manage every aspect of your business—from products to payroll.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT TABS */}
          <div className="lg:col-span-4 space-y-3">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 text-left group",
                  activeTab.id === mod.id
                    ? "bg-white border-[#199A95] shadow-md shadow-[#199A95]/10 scale-[1.01]"
                    : "bg-white border-slate-200 text-slate-500 hover:border-[#199A95]/40 hover:bg-[#199A95]/5"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    activeTab.id === mod.id
                      ? "bg-[#199A95] text-white"
                      : "bg-[#199A95]/10 text-[#199A95]"
                  )}
                >
                  {mod.icon}
                </div>

                <div className="flex-1">
                  <p
                    className={cn(
                      "font-semibold text-sm transition-colors",
                      activeTab.id === mod.id
                        ? "text-slate-900"
                        : "text-slate-600"
                    )}
                  >
                    {mod.label}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-transform text-[#199A95]",
                    activeTab.id === mod.id
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-2 opacity-0"
                  )}
                />
              </button>
            ))}
          </div>

          {/* RIGHT CONTENT */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
                className="p-6 md:p-8 rounded-[2rem] border shadow-sm relative overflow-hidden border-slate-100 bg-white"
              >
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#199A95]/5 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="text-[#199A95]" size={24} />
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                      {activeTab.title}
                    </h3>
                  </div>

                  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                    {activeTab.desc}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {activeTab.features.map((feat, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-[#199A95]/5 p-3 rounded-xl border border-[#199A95]/10"
                      >
                        <ShieldCheck className="text-[#199A95]" size={14} />
                        <span className="font-medium text-slate-700 text-xs md:text-sm">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button className="flex items-center gap-2 font-semibold text-sm text-[#199A95] group hover:text-[#147C78] transition-colors">
                    Enter Portal
                    <ChevronRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}