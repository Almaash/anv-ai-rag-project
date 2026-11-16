"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Menu, UserCircle2, LogOut } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface UserData {
  id: number;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch_name: string;
  department: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

export default function LoanHeader({
  toggleSidebar,
  isSidebarCollapsed,
  toggleSidebarCollapsed,
}: {
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}) {
  const [user] = useState<UserData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });

    localStorage.clear();
    window.location.href = "/auth/signin";
  };

  return (
    <>
      <header className="sticky top-0 left-0 z-40 bg-white border-b border-purple-100 shadow-sm w-full">
        <div className="flex min-h-[80px] justify-between items-center px-4 py-3">
          
          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded hover:bg-purple-100"
          >
            <Menu size={26} className="text-purple-800" />
          </button>

          <button
            onClick={toggleSidebarCollapsed}
            className="hidden md:inline-flex p-2 rounded hover:bg-purple-100"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={26} className="text-purple-800" />
          </button>

          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className=""
            />
            <h1 className="text-lg md:text-xl font-semibold max-sm:hidden">
              Loan Management Panel
            </h1>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-3">
            
            <Link href="#">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-200 bg-purple-50 text-purple-800 cursor-pointer">
                <UserCircle2 size={22} />
                <div className="hidden sm:flex flex-col text-left text-xs">
                  <span className="font-semibold">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[11px] text-gray-600">
                    role :- {user?.role?.split("_").join(" ")} | {user?.branch_name}
                  </span>
                </div>
              </button>
            </Link>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm flex items-center gap-1 cursor-pointer"
            >
              <LogOut size={18} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
