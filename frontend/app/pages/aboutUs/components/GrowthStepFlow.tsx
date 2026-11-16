"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Package,
  Wallet,
} from "lucide-react";

const steps = [
  {
    title: "Branch Locator",
    desc: "Find and connect with nearby branches easily.",
    icon: <MapPin size={20} />,
  },
  {
    title: "No of Customers",
    value: "50+",
    desc: "Growing customer base across regions.",
    icon: <Users size={20} />,
  },
  {
    title: "Product Scale",
    value: "₹2.5 L",
    desc: "Growth across financial years.",
    icon: <Package size={20} />,
  },
  {
    title: "Total Portfolio",
    value: "₹50K",
    desc: "Overall managed financial assets.",
    icon: <Wallet size={20} />,
  },
];

export default function GrowthStepFlow() {
  return (
    <section className="py-20 bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-6 text-center">

        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-14">
          Our Path to{" "}
          <span className="text-[#199A95] italic">
            Success.
          </span>
        </h2>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">

          <div className="hidden md:block absolute top-1/4 left-0 w-full h-0.5 bg-[#199A95]/20 -z-10" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="flex flex-col items-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-md text-[#199A95] flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-[#199A95] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#199A95]/20">
                {step.icon}
              </div>

              {/* VALUE (NEW) */}
              {step.value && (
                <p className="text-2xl font-bold text-[#199A95] mb-1">
                  {step.value}
                </p>
              )}

              <h4 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h4>

              <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}