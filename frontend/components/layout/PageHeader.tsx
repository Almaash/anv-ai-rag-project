"use client";

import React from "react";
import { FaLeaf } from "react-icons/fa";

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="relative w-full h-28 sm:h-32 md:h-40 lg:h-44 overflow-hidden">

      {/* Teal Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e6f5f4] via-[#d4efed] to-[#c1e7e5]" />

      {/* Soft Organic Glow */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-10 left-0 w-1/3 h-1/3 bg-[#199A95]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#199A95]/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-4 text-center">
        <h1
          className="
            text-2xl
            sm:text-3xl
            md:text-4xl
            lg:text-4xl
            font-semibold
            text-gray-700
            tracking-wide
            drop-shadow-sm
            flex items-center gap-2
          "
        >
          <FaLeaf className="text-black hidden sm:block text-md sm:text-base" />
          {title}
          <FaLeaf className="text-black hidden sm:block rotate-180 text-md sm:text-base" />
        </h1>
      </div>
    </header>
  );
}