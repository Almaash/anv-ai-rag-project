"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  ChevronDown,
  Shield,
  Package,
  Users,
  HandCoins,
  Calculator,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/pages/aboutUs/" },
  { name: "Gallery", href: "/pages/gallery/" },
  { name: "Products", href: "/pages/products/" },
  { name: "Contact Us", href: "/pages/contactUs/" },
  { name: "Our Teams", href: "/pages/OurTeams/" },
];

const authLinks = [
  { name: "Admin Portal", href: "/auth/signin", icon: <Shield className="w-4 h-4" /> },
  { name: "Customer Login", href: "/auth/customer-login", icon: <Package className="w-4 h-4" /> },
  { name: "Employee Login", href: "/auth/hrms-signin", icon: <Users className="w-4 h-4" /> },
  { name: "Finance Login", href: "/auth/finance-signin", icon: <Calculator className="w-4 h-4" /> },
  { name: "Investor Login", href: "/auth/investor-login", icon: <HandCoins className="w-4 h-4" /> },
  { name: "AI Chat", href: "/pages/AIChat/", icon: <HandCoins className="w-4 h-4" /> },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Prevent background scroll when mobile menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/images/logo2.png"
            alt="Anavran Logo"
            width={42}
            height={42}
            className="object-contain sm:w-[50px] sm:h-[50px]"
          />
          <span className="text-sm sm:text-lg font-semibold text-slate-900 whitespace-nowrap">
            Anavran Livelihood
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-6 ml-auto">

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-[#199A95] text-white"
                        : "text-slate-700 hover:bg-[#199A95]/10 hover:text-[#199A95]"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* DESKTOP DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setAccountOpen(!accountOpen)}
              className="flex items-center gap-2 px-5 py-2 rounded-md border border-[#199A95] text-[#199A95] text-sm font-medium hover:bg-[#199A95] hover:text-white transition"
            >
              <User className="w-4 h-4" />
              Sign In
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-14 w-60 bg-white border border-slate-200 rounded-lg shadow-lg p-2"
                >
                  <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Portals
                  </p>

                  {authLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition"
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden text-slate-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* MOBILE SLIDE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white z-40 md:hidden border-t border-slate-200 overflow-y-auto"
          >
            <div className="flex flex-col p-6 gap-4">

              {/* NAV ITEMS */}
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`px-4 py-3 rounded-md text-base font-medium
                      ${
                        isActive
                          ? "bg-[#199A95] text-white"
                          : "text-slate-800 hover:bg-[#199A95]/10 hover:text-[#199A95]"
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {/* PORTALS SECTION */}
              <div className="pt-6 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                  Portals
                </p>

                {authLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}