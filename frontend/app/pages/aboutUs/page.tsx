"use client";

import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/layout/PageHeader";
import GrowthStepFlow from "./components/GrowthStepFlow";
import {
  ShieldCheck,
  Award,
  Zap,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import MissionVision from "./Misiionvision";
import BusinessHub from "./components/BusinessHub";

export default function AboutPage() {
  return (
    <>
      <Header />
      <PageHeader title="About Anavran" />

      {/* 1. Mission & Vision */}
      <MissionVision />

      {/* 2. Core Pillars */}
      <section className="py-16 bg-[#F7FAF9] px-6">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900">
              Our Core{" "}
              <span className="text-[#199A95] italic">
                Pillars.
              </span>
            </h2>

            <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm md:text-base">
              We operate at the intersection of digital india innovation and modern management systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Integrity"
              desc="Transparent systems for every transaction, from e-commerce to credit facilitation."
            />
            <ValueCard
              icon={<Award className="w-6 h-6" />}
              title="Excellence"
              desc="Monitored by experienced teams, delivering instant solutions for every compatible segment."
            />
            <ValueCard
              icon={<Zap className="w-6 h-6" />}
              title="Innovation"
              desc="Digital platform with easy onboarding and integrated systems to manage customers efficiently."
            />
            <ValueCard
              icon={<Heart className="w-6 h-6" />}
              title="Empathy"
              desc="Empowering livelihood sustainability through ethical financial opportunities and responsible mentorship."
            />
          </div>
        </div>
      </section>

      {/* 3. Growth Journey */}
      <GrowthStepFlow />

      {/* 4. Business Hub */}
      <BusinessHub />

      <Footer />
    </>
  );
}

/* ---------- Value Card ---------- */

function ValueCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="p-6 rounded-[2rem] bg-white border border-slate-100 transition-all text-center shadow-sm hover:shadow-lg hover:shadow-[#199A95]/10"
    >
      <div className="w-12 h-12 bg-[#199A95]/10 rounded-xl text-[#199A95] flex items-center justify-center mx-auto mb-4 transition-all group-hover:bg-[#199A95] group-hover:text-white">
        {icon}
      </div>

      <h4 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h4>

      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
        {desc}
      </p>
    </motion.div>
  );
}