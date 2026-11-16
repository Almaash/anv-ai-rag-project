"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Users, Wallet, ShieldCheck } from "lucide-react";

const modules = [
  {
    id: "origination",
    label: " Credit Facilitation",
    icon: <ShoppingBag size={18} />,
    title: "Hire Purchase / Sale in Installment",
    desc: "Streamline customer acquisition, onboarding, document verification, and approval workflows with automated processing.",
  },
  {
    id: "customer",
    label: "Customer Management",
    icon: <Users size={18} />,
    title: "Centralized Customer Records",
    desc: "Manage KYC, evaluate KYC details, credit history, repayment schedules, and customer communication from one dashboard.",
  },
  {
    id: "repayment",
    label: "Collection & Reports",
    icon: <Wallet size={18} />,
    title: "Smart Repayment Tracking",
    desc: "Track repayment schedules and history, overdue payments, penalties, and generate real-time financial reports securely.",
  },
];

export default function BusinessHub() {
  const [active, setActive] = useState(modules[0]);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            One Login{" "}
            <span className="text-[#199A95] italic">
 Be in full control.
            </span>
          </h2>
          <p className="text-slate-500 mt-4">
            <p className="text-slate-500 mt-4">
Manage identification and onboarding of micro-entrepreneurs, credit assessment, documentation, and monitoring of credit.
Facilitation and collection support through a technology-enabled mechanism.            </p>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT TABS */}
          <div className="lg:col-span-4 space-y-4">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => setActive(m)}
                className={`w-full flex items-center gap-4 p-6 rounded-[2rem] border transition-all duration-300 ${active.id === m.id
                  ? "bg-white border-[#199A95] shadow-lg shadow-[#199A95]/10"
                  : "bg-slate-50 border-slate-200 hover:border-[#199A95]/40 hover:bg-[#199A95]/5"
                  }`}
              >
                <div
                  className={`${active.id === m.id
                    ? "text-[#199A95]"
                    : "text-slate-400"
                    }`}
                >
                  {m.icon}
                </div>

                <span
                  className={`font-semibold ${active.id === m.id
                    ? "text-slate-900"
                    : "text-slate-500"
                    }`}
                >
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* RIGHT CONTENT */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-12 rounded-[3rem] h-full flex flex-col justify-center bg-[#F7FAF9] border border-slate-100"
              >
                <h3 className="text-3xl font-bold mb-4 text-[#199A95]">
                  {active.title}
                </h3>

                <p className="text-slate-600 text-lg mb-8 leading-relaxed max-w-md">
                  {active.desc}
                </p>

                <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="text-[#199A95]" size={18} />
                  Secure Management System
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}