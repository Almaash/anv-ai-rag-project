"use client";

import React from "react";
import { motion } from "framer-motion";

interface ServiceItem {
  title: string;
}

const services: ServiceItem[] = [
  { title: "Ethical direct selling" },
  { title: "Customer centric approach" },
  { title: "Ethical Direct Selling" },
  { title: "Customer Support" },
  { title: "Product Sale & Finance" },
  { title: "Credit Facilitation" },
  { title: "Identification & onboarding of micro-entrepreneurs" },
];

const infiniteItems = [...services, ...services];

export default function ServicesSlider() {
  return (
    <section className="py-6 sm:py-10 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6 bg-white/50 backdrop-blur-xl rounded-3xl border border-slate-200/60 p-3 sm:p-4 overflow-hidden shadow-lg">
          
          {/* SIDEBAR */}
          <div className="flex-shrink-0 w-full lg:w-auto lg:pl-6 py-2 lg:py-0 border-b lg:border-b-0 lg:border-r border-slate-100 pr-0 lg:pr-6">
            <div className="flex flex-col">
              <span className="text-primary font-bold tracking-widest text-[9px] sm:text-[10px] uppercase mb-1">
                Ecosystem
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Our <span className="text-primary italic">Services</span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                Empowering India's Future
              </p>
            </div>
          </div>

          {/* SCROLLER */}
          <div className="relative w-full overflow-hidden h-16 sm:h-20 flex items-center">
            
            {/* GRADIENTS */}
            <div className="absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-white/80 to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-white/80 to-transparent z-10" />

            <motion.div
              className="flex gap-6 sm:gap-10 items-center"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                ease: "linear",
                duration: 20,
                repeat: Infinity,
              }}
            >
              {infiniteItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
                >
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 whitespace-nowrap">
                    {item.title}
                  </span>

                  {/* DOT */}
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-300 ml-2 sm:ml-3" />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}