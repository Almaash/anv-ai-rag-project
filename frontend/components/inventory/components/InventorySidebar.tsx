"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown, 
  ChevronLeft,
  LayoutDashboard, 
  Wallet, 
  Bell, 
  BarChart3,
  Sun,
  Moon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReloadLink from "../../ReloadLink";
import Image from "next/image";

type InventorySidebarProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  sidebarWidth: number;
  onResizeStart: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

export default function InventorySidebar({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  isMobile,
  sidebarWidth,
  onResizeStart,
  theme,
  setTheme,
}: InventorySidebarProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const sidebarCollapsed = isMobile ? false : isCollapsed;

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const navLinks = [
    { name: "Home", href: "/inventory/dashboard", icon: LayoutDashboard },
    { 
      name: "Master Data", 
      href: "/inventory/master", 
      icon: Wallet,
      items: [
        { name: "Vendor Master", href: "/inventory/master/vendor" },
        { name: "Unit Master", href: "/inventory/master/unit" },
        { name: "Category Master", href: "/inventory/master/category" },
        { name: "Brand Master", href: "/inventory/master/brand" },
        { name: "Attribute Master", href: "/inventory/master/attribute" },
        { name: "Product Master", href: "/inventory/master/product" },
        // { name: "Loan Product API", href: "/inventory/master/loan-product-catalog" },
        // { name: "Loan Product Orders", href: "/inventory/master/loan-product-orders" },
        // { name: "Tax Master", href: "/inventory/master/tax" },
      ]
    },
    { 
      name: "Purchase Products", 
      href: "/inventory/products", 
      icon: Bell,
      items: [
        { name: "Add Product", href: "/inventory/products/add" },
        { name: "Product List", href: "/inventory/products/list" },
        { name: "Product Viewer", href: "/inventory/products" },
      ]
    },
     { 
      name: "Sell Products", 
      href: "/inventory/orders", 
      icon: Bell,
      items: [
        { name: "Sell Product ", href: "/inventory/orders/add" },
        { name: "Order List", href: "/inventory/orders/list" },
        { name: "Direct Sale / Issue", href: "/inventory/direct-sale" },
        { name: "Sales History", href: "/inventory/sales-list" },
      ]
    },
    {
      name: "Reports",
      href: "/inventory/reports",
      icon: BarChart3,
      items: [
        { name: "Vendor Purchases", href: "/inventory/reports/vendor-purchases" },
        { name: "Sales Analysis", href: "/inventory/reports/sales-analysis" },
        { name: "Stock Inventory", href: "/inventory/reports/stock-inventory" },
      ],
    },
   
    // { 
    //   name: "Settings", 
    //   href: "/inventory/settings", 
    //   icon: Settings,
    //   items: [
    //     { name: "Profile", href: "/inventory/settings/profile" },
    //     { name: "Security", href: "/inventory/settings/security" },
    //     { name: "Billing", href: "/inventory/settings/billing" },
    //     { name: "Preferences", href: "/inventory/settings/preferences" }
    //   ]
    // },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/30 z-[44] lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col z-[45] transition-all duration-300 ease-in-out h-screen border-r will-change-transform",
          theme === "dark" ? "bg-black border-slate-800" : "bg-white border-slate-100",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          sidebarCollapsed ? "px-2" : "px-4",
          "lg:translate-x-0 lg:fixed"
        )}
        style={{ width: `${sidebarCollapsed ? 80 : isMobile ? Math.min(sidebarWidth, 320) : sidebarWidth}px` }}
      >
        {/* Logo Section */}
        <div className={cn("py-6 flex items-center mb-2 overflow-hidden", sidebarCollapsed ? "justify-center" : "justify-between px-2")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 min-w-8 flex items-center justify-center">
              <Image
                src="/gallery/logo.png"
                alt="Anavaran Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <span className={cn("font-bold text-xl tracking-tight leading-none", theme === "dark" ? "text-white" : "text-slate-900")}>
                Anavran
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "hidden lg:flex p-1.5 rounded-lg transition-all active:scale-90",
                theme === "dark" ? "text-slate-500 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0)" }}
            >
              <ChevronLeft size={18} />
            </button>
            {!sidebarCollapsed && (
              <button onClick={() => setIsOpen(false)} className={cn("lg:hidden p-1 rounded-md transition-colors", theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                <X size={20} className={theme === "dark" ? "text-slate-400" : "text-slate-500"} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1 mt-2 mb-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isSubOpen = openDropdown === link.name;

            return (
              <div key={link.name} className="flex flex-col">
                <div
                  className={cn(
                    "flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 group font-medium cursor-pointer relative",
                    sidebarCollapsed ? "px-0 justify-center w-full" : "px-3",
                    theme === "dark" 
                      ? (isActive || isSubOpen ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")
                      : (isActive || isSubOpen ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
                  )}
                  onClick={() => link.items ? toggleDropdown(link.name) : setIsOpen(false)}
                >
                  {link.items ? (
                    <div className="flex items-center justify-between w-full">
                      <div className={cn("flex items-center gap-3", sidebarCollapsed ? "w-full justify-center" : "w-full")}>
                        <Icon size={20} className={cn("min-w-[20px] transition-colors", (isActive || isSubOpen) ? (theme === "dark" ? "text-white" : "text-slate-900") : "group-hover:text-current")} />
                        {!sidebarCollapsed && <span className="text-[15px] whitespace-nowrap">{link.name}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="transition-transform duration-200" style={{ transform: isSubOpen ? "rotate(180deg)" : "rotate(0)" }}>
                          <ChevronDown size={14} className={theme === "dark" ? "text-slate-600" : "text-slate-400"} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <ReloadLink
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn("flex items-center gap-3 w-full h-full", sidebarCollapsed ? "justify-center" : "px-0")}
                    >
                      <Icon size={20} className={cn("min-w-[20px] transition-colors", isActive ? (theme === "dark" ? "text-white" : "text-slate-900") : "group-hover:text-current")} />
                      {!sidebarCollapsed && <span className="text-[15px] whitespace-nowrap">{link.name}</span>}
                    </ReloadLink>
                  )}
                </div>

                {link.items && isSubOpen && !sidebarCollapsed && (
                  <div className={cn("mt-1 ml-4 border-l-2 space-y-1", theme === "dark" ? "border-slate-800" : "border-slate-100")}>
                    {link.items.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "block py-2 px-6 text-sm rounded-lg transition-colors",
                          theme === "dark"
                            ? (pathname === sub.href ? "text-white bg-white/10 font-medium" : "text-slate-500 hover:text-white hover:bg-white/5")
                            : (pathname === sub.href ? "text-slate-900 bg-slate-100 font-medium" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Theme Switcher & Footer */}
        <div className={cn("border-t space-y-2 mt-auto", sidebarCollapsed ? "p-2" : "p-4", theme === "dark" ? "border-slate-800" : "border-slate-100")}>
          <div className={cn("p-1 rounded-xl flex items-center shadow-inner", sidebarCollapsed ? "flex-col gap-1" : "justify-between", theme === "dark" ? "bg-white/5" : "bg-slate-50")}>
            <button 
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg text-[11px] font-bold transition-all py-1.5 duration-200",
                sidebarCollapsed ? "w-full h-8" : "flex-1",
                theme === "light" 
                  ? "bg-white shadow-sm text-slate-900" 
                  : cn(theme === "dark" ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
              )}
              title="Light Mode"
            >
              <Sun size={14} className={theme === "light" ? "text-slate-900" : "text-slate-400"} />
              {!sidebarCollapsed && "Light"}
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg text-[11px] font-bold transition-all py-1.5 duration-200",
                sidebarCollapsed ? "w-full h-8" : "flex-1",
                theme === "dark" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="Dark Mode"
            >
              <Moon size={14} className={theme === "dark" ? "text-white" : "text-slate-400"} />
              {!sidebarCollapsed && "Dark"}
            </button>
          </div>
        </div>
      </aside>

      {!sidebarCollapsed && !isMobile && (
        <button
          type="button"
          aria-label="Resize sidebar"
          onMouseDown={onResizeStart}
          className="hidden lg:block fixed top-0 bottom-0 z-[40] w-2 cursor-col-resize bg-transparent hover:bg-blue-100/40 transition-colors"
          style={{ left: `${sidebarWidth - 1}px` }}
        />
      )}
    </>
  );
}
