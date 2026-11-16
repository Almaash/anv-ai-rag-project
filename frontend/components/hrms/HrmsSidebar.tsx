"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown,
  LayoutDashboard,
  Users,
  Building2,
  Award,
  Calendar,
  ClockIcon,
  Banknote,
  FileText,
  CalendarDays,
  Settings,
  UserCheck,
  CreditCard,
  BarChart3,
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ReloadLink from "../ReloadLink";

export default function HrmsSidebar({ isOpen, setIsOpen }: any) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const type = localStorage.getItem("user_type");
    setUserType(type);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
    localStorage.clear();
    window.location.href = "/auth/signin";
  };

  const isEmployee = userType === "employee";

  const navLinks = React.useMemo(() => [
    { 
      name: "Dashboard", 
      href: "/hrms/dashboard", 
      icon: LayoutDashboard,
      category: "main" 
    },
    ...(isEmployee ? [
      {
        name: "My Profile",
        href: "/hrms/profile",
        icon: User,
        category: "main"
      },
      {
        name: "My Attendance",
        href: "/hrms/attendance",
        icon: UserCheck,
        category: "main"
      }
    ] : []),
    ...(!isEmployee ? [{
      name: "Master Setup",
      icon: Settings,
      category: "group",
      items: [
        { name: "Departments", href: "/hrms/departments", icon: Building2 },
        { name: "Designations", href: "/hrms/designations", icon: Award },
        { name: "Public Holidays", href: "/hrms/holidays", icon: CalendarDays },
        { name: "Leave Types", href: "/hrms/leaves/types", icon: FileText },
      ],
    }] : []),
    ...(!isEmployee ? [{
      name: "Staff Management",
      icon: Users,
      category: "group",
      items: [
        { name: "Employees List", href: "/hrms/employees", icon: Users },
        { name: "Add New Staff", href: "/hrms/employees/create", icon: UserCheck },
        { name: "Attendance Log", href: "/hrms/attendance", icon: ClockIcon },
        { name: "Attendance Report", href: "/hrms/attendance/report", icon: BarChart3 },
      ],
    }] : []),
    {
      name: "Leave Management",
      icon: Calendar,
      category: "group",
      items: [
        { name: "Leave Requests", href: "/hrms/leaves", icon: FileText },
        { name: "Apply Leave", href: "/hrms/leaves/request", icon: CalendarDays },
      ]
    },
    ...(!isEmployee ? [{
      name: "Payroll & Salary",
      icon: Banknote,
      category: "group",
      items: [
        { name: "Process Payouts", href: "/hrms/payroll", icon: CreditCard },
        { name: "Salary Structures", href: "/hrms/salaries/structures", icon: Banknote },
        { name: "Payroll Reports", href: "/hrms/payroll/reports", icon: BarChart3 },
      ],
    }] : [
      {
        name: "My Salary & Slips",
        icon: Banknote,
        category: "main",
        href: "/hrms/payroll",
      }
    ]),
  ], [isEmployee]);

  // Auto-open dropdown if child is active
  useEffect(() => {
    const activeGroup = navLinks.find(group => 
      group.category === "group" && 
      group.items?.some(item => (item as any).href === pathname)
    );
    if (activeGroup) {
      setOpenDropdown(activeGroup.name);
    }
  }, [pathname, navLinks]);

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-blue-800 text-zinc-100 flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-r border-zinc-800 select-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold tracking-wider text-sm">ANAVARAN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {navLinks.map((link: any) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            if (link.category === "main") {
              return (
                <ReloadLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                    isActive ? "bg-blue-600 text-zinc-200" : "hover:bg-blue-700 hover:text-zinc-50 "
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-blue-500" : "")} />
                  {link.name}
                </ReloadLink>
              );
            }

            const isGroupActive = link.items.some((i: any) => i.href === pathname);
            const isOpen = openDropdown === link.name;

            return (
              <div key={link.name} className="space-y-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown(link.name);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium group",
                    isGroupActive ? "bg-blue-700/50 text-zinc-100" : "hover:bg-blue-700 hover:text-zinc-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4", isGroupActive ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-200")} />
                    <span>{link.name}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>

                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
                )}>
                  <div className="ml-4 pl-3 border-l border-zinc-700 space-y-1">
                    {link.items.map((sub: any) => {
                      const SubIcon = sub.icon;
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setIsOpen(false);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors",
                            isSubActive ? "bg-blue-600/30 text-blue-400 font-semibold" : "text-zinc-400 hover:text-zinc-200 hover:bg-blue-700/30"
                          )}
                        >
                          <SubIcon className="w-3.5 h-3.5" />
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout Section */}
        {/* <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div> */}
      </aside>

      {/* <ConfirmDialog
        isOpen={showConfirm}
        title="Sign Out"
        message="Are you sure you want to end your session?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
      /> */}
    </>
  );
}
