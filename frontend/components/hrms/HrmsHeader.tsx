"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, UserCircle2, LogOut, KeyRound } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function HrmsHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [userName, setUserName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.name) setUserName(user.name);
      
      const type = localStorage.getItem("user_type");
      setIsEmployee(type === "employee");
    } catch {}
  }, []);

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
      <header className="sticky top-0 left-0 z-40 bg-white border-b border-blue-100 shadow-sm w-full max-w-full overflow-x-hidden">
        <div className="flex justify-between items-center px-4 py-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded hover:bg-blue-100"
          >
            <Menu size={26} className="text-blue-800" />
          </button>

          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <h1 className="text-lg md:text-xl font-semibold text-blue-800 max-sm:hidden">
              HRMS Panel
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isEmployee && (
              <Link href="/hrms/profile">
                <button
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <UserCircle2 size={20} />
                  <span className="text-sm">My Profile</span>
                </button>
              </Link>
            )}

            <Link href="/hrms/change-password">
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <KeyRound size={20} />
                <span className="hidden sm:block text-sm">Change Password</span>
              </button>
            </Link>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm flex items-center gap-1 cursor-pointer transition-colors"
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
