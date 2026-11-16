"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from "lucide-react";


const images = [
  "/images/pp22.jpeg",
  "/images/pp11.jpeg",
  // "/images/pp3.jpeg",
  // "/images/pp4.jpeg",
  // "/images/pp5.jpeg",
];

// const images = [
//   "/slider/slider1.jpeg",
//   "/slider/slider2.jpeg",
//   "/slider/slider3.jpeg",
// ];

const pillars = [
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: "Credit access facilitation",
    desc: "End-to-end encrypted credit access workflows ensuring compliance, transparency, and complete customer satisfaction",
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: "Smart Automation",
    desc: "Automated approvals, EMI tracking, and real-time reporting to streamline financial operations",
  },
  {
    icon: <GraduationCap className="w-4 h-4" />,
    title: "Future Vision of the Company",
    desc: "The company aims to build a scalable livelihood financing ecosystem, enabling financial inclusion in rural and semi-urban India. It focuses on implementing technology-driven lending, tracking, and risk management systems.",
  },
];

const stats = [
  { val: "50+", lab: "Partners" },
  { val: "100+", lab: "Products" },
  { val: "24/7", lab: "Support" },
];

export default function BusinessOpportunity() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () =>
    setActiveIndex((prev) => (prev + 1) % images.length);

  const prevSlide = () =>
    setActiveIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );

  return (
    <section className="py-20 max-sm:py-10 bg-[#F7FAF9] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

          {/* LEFT: SLIDER */}
          <div className="relative w-full lg:w-1/2 aspect-[4/5] max-h-[620px] group">
            <div className="absolute -inset-4 bg-[#199A95]/5 rounded-[3rem] -rotate-2 group-hover:rotate-0 transition-all duration-700" />

            <div className="relative w-full h-full overflow-hidden rounded-[2.5rem] shadow-2xl border-[6px] border-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.7 }}
                  className="relative w-full h-full"
                >
                  <Image
                    src={images[activeIndex]}
                    alt="Business Empowerment Opportunity"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="absolute inset-x-4 bottom-6 flex justify-between items-center z-20">
                <div className="flex gap-2">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ${i === activeIndex
                        ? "w-6 bg-white"
                        : "w-2 bg-white/40"
                        }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={prevSlide}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-[#199A95] transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-[#199A95] transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl shadow-xl hidden xl:block border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#199A95]/10 p-2 rounded-xl">
                  <ShieldCheck className="text-[#199A95] w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Trust Factor
                  </p>
                  <p className="text-xs font-semibold text-slate-900 italic leading-tight">
                    "Health First. <br /> Growth Always."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="w-full lg:w-1/2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#199A95]/10 text-[#199A95] text-[10px] font-bold uppercase tracking-widest mb-4">
                <Zap size={12} /> The Opportunity
              </span>

              <h2 className="text-2xl md:text-4xl font-serif text-slate-900 leading-[1.2] mb-4">
                A Movement Built on <br />
                <span className="text-[#199A95] italic">
                  Empowerment.
                </span>
              </h2>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium">
                <span className="text-slate-900 font-semibold">
                  Anavaran
                </span>{" "}
simplifies modern lending by adopting the credit facilitation model, combining it with digital onboarding management and automated financial workflows, while ensuring full transparency of fund flow. With an ambition to empower livelihood sustainability services faster, smarter, and more securely.
                
              </p>
            </motion.div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pillars.map((p, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -4 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 ${i === 2
                    ? "md:col-span-2 bg-[#0B1E3D] text-white"
                    : "bg-white border-slate-100 shadow-sm hover:shadow-lg"
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${i === 2
                      ? "bg-[#199A95] text-white"
                      : "bg-[#199A95]/10 text-[#199A95]"
                      }`}
                  >
                    {p.icon}
                  </div>

                  <h4 className="font-semibold text-base mb-2">
                    {p.title}
                  </h4>

                  <p
                    className={`text-xs md:text-sm leading-relaxed ${i === 2
                      ? "text-slate-300"
                      : "text-slate-500"
                      }`}
                  >
                    {p.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-slate-100">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-lg font-bold text-[#199A95]">
                    {stat.val}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {stat.lab}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button className="group bg-[#199A95] text-white px-6 py-3 text-sm rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-[#147C78] transition-all shadow-lg shadow-[#199A95]/20">
                Join the Movement
                <ArrowUpRight className="group-hover:rotate-45 transition-transform" size={16} />
              </button>

              <button className="px-6 py-3 text-sm rounded-full font-semibold border border-slate-200 hover:bg-slate-50 transition-all">
                Download Brochure
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}