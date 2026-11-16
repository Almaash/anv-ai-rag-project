"use client";

import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TeamGrid from "./components/TeamGrid";

export default function OurTeamPage() {
  return (
    <>
      <Header />

      {/* ===== Corporate Hero Section ===== */}
      {/* ===== Compact Leadership Hero ===== */}
      <section className="bg-[#F8FAFC] py-14 px-6 md:px-12 lg:px-24 border-b border-slate-200">
        <div className="max-w-5xl mx-auto text-center">

          <p className="text-[11px] tracking-[0.25em] uppercase text-[#199A95] font-semibold mb-4">
            Anavran Livelihood Services Pvt Ltd
          </p>

          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 leading-snug mb-5">
            Leadership Built on{" "}
            <span className="text-[#199A95]">
              Trust & Financial Discipline
            </span>
          </h1>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
            Our leadership team brings financial expertise, operational integrity,
            and a commitment to responsible lending — strengthening livelihoods
            through transparent and structured financial solutions.
          </p>

        </div>
      </section>

      <TeamGrid />

      {/* ===== Company Commitment Section ===== */}
      <section className="bg-white py-12 px-6 md:px-12 lg:px-24 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Anavaran Livelihood Services Pvt. Ltd. is committed to delivering
            transparent, responsible, and inclusive financial solutions including
            fund management, credit facilitation, consumer products, and product finance.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}