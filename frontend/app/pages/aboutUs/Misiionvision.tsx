"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaStar, FaChartLine, FaCheckCircle } from "react-icons/fa";

export default function MissionVision() {
  const missionPoints = [
    "Customer-centric financial solutions",
    "Transparent and ethical lending practices",
    "Strengthening livelihoods through responsible finance",
  ];

  const visionPoints = [
    "Building trust-driven financial ecosystems",
    "Empowering individuals and small businesses",
    "Sustainable and inclusive financial growth",
  ];

  return (
    <section className="py-16 bg-[#F7FAF9]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">

          {/* MISSION */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative p-7 md:p-8 rounded-[2rem] bg-[#199A95] text-white overflow-hidden shadow-xl shadow-[#199A95]/20"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />

            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-xl bg-white/15 backdrop-blur-md mb-5">
                <FaStar className="text-yellow-300 text-xl" />
              </div>

              <h3 className="text-2xl md:text-3xl font-serif font-bold mb-4">
                Our Mission
              </h3>

              <p className="text-white/90 text-sm md:text-base mb-6 leading-relaxed">
                At <span className="font-semibold">Anavran Livelihood Services Pvt Ltd</span>, 
                our mission is to deliver accessible, transparent, and 
                responsible financial solutions that empower individuals, 
                families, and businesses to achieve sustainable growth.
              </p>

              {/* CARE MODEL */}
              <div className="mb-6 p-4 bg-white/10 rounded-2xl">
                <p className="font-semibold mb-2">Core Value: “We CARE to Everyone”</p>
                <p className="text-sm">
                  <strong>C:</strong> Customer Centric Approach <br />
                  <strong>A:</strong> Aggregating People Values <br />
                  <strong>R:</strong> Reinforcement of Livelihood Initiative <br />
                  <strong>E:</strong> Empowering Financial Goals
                </p>
              </div>

              <ul className="space-y-3">
                {missionPoints.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-white/90"
                  >
                    <FaCheckCircle className="text-white text-sm shrink-0" />
                    <span className="text-sm md:text-base font-medium">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* VISION */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group relative p-7 md:p-8 rounded-[2rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/40 overflow-hidden"
          >
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#199A95]/5 rounded-full blur-3xl group-hover:bg-[#199A95]/10 transition-all duration-700" />

            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-xl bg-[#199A95]/10 mb-5">
                <FaChartLine className="text-[#199A95] text-xl" />
              </div>

              <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-4">
                Our Vision
              </h3>

              <p className="text-slate-600 text-sm md:text-base mb-6 leading-relaxed">
                To become a trusted and ethical financial partner recognized 
                for strengthening livelihoods through fund management, 
                business loans, consumer loans, and product finance — 
                driving inclusive and sustainable financial empowerment.
              </p>

              <ul className="space-y-3">
                {visionPoints.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-slate-700"
                  >
                    <FaCheckCircle className="text-[#199A95] text-sm shrink-0" />
                    <span className="text-sm md:text-base font-medium">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}