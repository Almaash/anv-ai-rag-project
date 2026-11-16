"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, UserCircle2, LogOut, KeyRound } from "lucide-react";
import Link from "next/link";
import ConfirmDialog from "@/components/common/ConfirmDialog";

type Props = {
  toggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
  toggleSidebarCollapsed?: () => void;
};

export default function AppHeader({ toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed }: Props) {
  const [user, setUser] = useState<any>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) setUser(u);
      setIsEmployee(localStorage.getItem("user_type") === "employee");
    } catch {}
  }, []);

  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/auth/signin";
  };

  return (
    <>
      <header className="sticky top-0 left-0 z-40 bg-white border-b border-gray-200 shadow-sm w-full">
        <div className="flex min-h-[64px] justify-between items-center px-4 py-2">

          {/* Mobile hamburger */}
          <button onClick={toggleSidebar} className="md:hidden p-2 rounded hover:bg-gray-100">
            <Menu size={24} className="text-gray-700" />
          </button>

          {/* Desktop collapse toggle */}
          {toggleSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden md:inline-flex p-2 rounded hover:bg-gray-100"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={24} className="text-gray-700" />
            </button>
          )}

          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <Image src="/images/logo2.png" alt="Logo" width={36} height={36} style={{ width: 36, height: "auto" }} />
            <span className="text-base md:text-lg font-semibold text-gray-800 max-sm:hidden">
              Anavran CRM
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isEmployee && (
              <Link href="/hrms/change-password">
                <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 transition">
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>
              </Link>
            )}

            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm">
              <UserCircle2 size={20} />
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="font-medium text-xs">{user?.name || "User"}</span>
                <span className="text-[11px] text-gray-500">
                  {user?.role?.split("_").join(" ")}
                  {user?.branch_name ? ` | ${user.branch_name} | ${user.branch}` : ""}
                </span>
              </div>
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm flex items-center gap-1 transition"
            >
              <LogOut size={16} />
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
