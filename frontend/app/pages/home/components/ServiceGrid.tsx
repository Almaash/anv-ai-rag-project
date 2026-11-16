"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  CreditCard,
  Banknote,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    title: "Product Selling / Higher Purchase / Easy Finance",
    desc: "All type of electronic goods Home Appliances, Electronics goods, mechanical Equipments etc. Deliver to your doorstep. Experience the intensity of convenience.",
    icon: <ShoppingBag className="w-6 h-6" />,
    size: "md:col-span-2",
  },
  {
    title: "Easy Repaying",
    desc: "Buy now, pay later with flexible Repayment options in 0% intrest with a minimum down payments.",
    icon: <CreditCard className="w-6 h-6" />,
    size: "md:col-span-1",
  },
  {
    title: "credit facilitation",
    desc: "Empowering entrepreneurs with quick, hassle-free capital to ensure livelihood sustainability.",
    icon: <Banknote className="w-6 h-6" />,
    size: "md:col-span-1",
  },
  {
    title: "Anavaran Fund Management",
    desc: "Manages/raises funds from (HNI) high net worth individuals, promoters, and identified individuals (investors) under private contractual arrangements.The company acts as a facilitator/administrator/servicing entity.The company does not raise public deposits.",
    icon: <GraduationCap className="w-6 h-6" />,
    size: "md:col-span-2",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ServiceGrid() {
  return (
    <section className="py-20 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-[#199A95] font-semibold tracking-[0.18em] text-[11px] uppercase"
          >
            Our Ecosystem
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-bold text-slate-900 mt-4 leading-tight"
          >
            One Platform, <br />
            <span className="text-[#199A95] italic font-serif">
              Multiple Solutions.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 mt-4 max-w-xl mx-auto text-sm md:text-base"
          >
            We bridge the gap between an individual and his financial well-being through an integrated professional system.
          </motion.p>
        </div>

        {/* GRID */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {services.map((s, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className={cn(
                "relative group p-7 rounded-[2.5rem] border flex flex-col justify-between transition-all duration-500 overflow-hidden bg-[#199A95]/5 border-[#199A95]/10 shadow-sm hover:shadow-lg hover:shadow-[#199A95]/10",
                s.size
              )}
            >
              {/* Decorative Glow */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#199A95]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.08 }}
                  className="mb-8 inline-flex p-3 bg-white rounded-xl shadow-sm text-[#199A95]"
                >
                  {s.icon}
                </motion.div>

                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-2 tracking-tight text-[#199A95]">
                    {s.title}
                  </h3>

                  <p className="text-slate-600 leading-relaxed text-sm md:text-base max-w-sm">
                    {s.desc}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 flex justify-end">
                <button className="p-2.5 rounded-full bg-white shadow-sm border border-[#199A95]/20 text-[#199A95] transition-all hover:bg-[#199A95] hover:text-white hover:scale-110">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}