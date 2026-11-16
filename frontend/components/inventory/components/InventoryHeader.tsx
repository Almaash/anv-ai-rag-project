"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Bell, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/common/ConfirmDialog";

type ProductSearchItem = {
  id: number;
  name: string;
  sku_code?: string;
  current_stock?: number;
};

type LocalUser = {
  name?: string;
  email?: string;
  role?: string;
  profile_photo?: string;
};

export default function InventoryHeader({
  toggleSidebar,
  theme,
}: {
  toggleSidebar: () => void;
  theme: "light" | "dark";
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user] = useState<LocalUser>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}") || {};
    } catch {
      return {};
    }
  });
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axiosInstance.get(ProjectApiList.GET_AVAILABLE_PRODUCTS);
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setProducts(list);
      } catch (error) {
        console.error("Header product load failed", error);
        setProducts([]);
      }
    };
    loadProducts();
  }, []);

  // Get display title from pathname
  const getPageTitle = () => {
    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1];
    if (!lastPart || lastPart === "inventory") return "Dashboard";
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  };

  const lowStockProducts = useMemo(
    () => products.filter((p) => Number(p.current_stock || 0) <= 10),
    [products]
  );

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku_code || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, searchText]);

  const goTo = (path: string) => {
    setQuickMenuOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    router.push(path);
  };

  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
    localStorage.clear();
    window.location.href = "/auth/inventory-signin";
  };

  return (
    <>
      <header
        className={cn(
          "relative backdrop-blur-md border-b w-full transition-colors duration-300 overflow-visible z-30",
          theme === "dark" ? "bg-black/90 border-slate-800" : "bg-white/80 border-slate-100"
        )}
      >
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={toggleSidebar}
              className={cn(
                "lg:hidden p-2 rounded-xl transition-colors shrink-0",
                theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"
              )}
            >
              <Menu size={20} className={theme === "dark" ? "text-slate-400" : "text-slate-600"} />
            </button>

            <h1 className={cn("text-lg sm:text-xl font-bold tracking-tight truncate", theme === "dark" ? "text-white" : "text-slate-900")}>
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => {
                  setQuickMenuOpen((v) => !v);
                  setSearchOpen(false);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-[10px] sm:text-sm transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
              >
                <span>Buy & Sell</span>
              </button>
              {quickMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-[150]">
                  <button onClick={() => goTo("/inventory/orders/add")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">New Sale Invoice</button>
                  <button onClick={() => goTo("/inventory/products/add")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">New Purchase Entry</button>
                  <button onClick={() => goTo("/inventory/orders/list")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">Order List</button>
                  <button onClick={() => goTo("/inventory/products/list")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">Product List</button>
                </div>
              )}
            </div>

            {/* Search + Notification */}
            <div
              className={cn(
                "flex items-center gap-2 border-r pr-4",
                theme === "dark" ? "border-slate-800" : "border-slate-100"
              )}
            >
              <div className="relative">
                <button
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    setNotificationsOpen(false);
                    setQuickMenuOpen(false);
                    setProfileMenuOpen(false);
                  }}
                  className={cn("p-2.5 transition-all rounded-full", theme === "dark" ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50")}
                >
                  <Search size={20} />
                </button>
                {searchOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[calc(100vw-1rem)] max-w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-[150]">
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search product name / SKU..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="mt-2 max-h-64 overflow-y-auto">
                      {searchText.trim() === "" ? (
                        <p className="px-2 py-2 text-xs text-slate-500">Type to search products</p>
                      ) : searchResults.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-slate-500">No matching product found</p>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => goTo("/inventory/products/list")}
                            className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <p className="text-sm font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              {p.sku_code || "N/A"} | Stock: {p.current_stock ?? 0}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen((v) => !v);
                    setSearchOpen(false);
                    setQuickMenuOpen(false);
                    setProfileMenuOpen(false);
                  }}
                  className={cn("p-2.5 transition-all rounded-full", theme === "dark" ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50")}
                >
                  <Bell size={20} />
                </button>
                {lowStockProducts.length > 0 && (
                  <div className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                    {lowStockProducts.length}
                  </div>
                )}

                {notificationsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[calc(100vw-1rem)] max-w-96 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-[150]">
                    <div className="px-2 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">Low Stock Alerts</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {lowStockProducts.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-slate-500">No low stock alerts</p>
                      ) : (
                        lowStockProducts.slice(0, 10).map((p) => (
                          <div key={p.id} className="px-2 py-2 border-b border-slate-50 last:border-0">
                            <p className="text-sm font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-red-600">
                              Low stock alert: only {p.current_stock ?? 0} units left.
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile */}
            <div className="relative pl-1">
              <button
                type="button"
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setSearchOpen(false);
                  setNotificationsOpen(false);
                  setQuickMenuOpen(false);
                }}
                title="Open profile menu"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm transition-transform group-hover:scale-105",
                    theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white"
                  )}
                >
                  <Image
                    src={user?.profile_photo || "/images/logo.png"}
                    alt="Avatar"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden lg:block text-left">
                  <p className={cn("text-sm font-bold leading-none mb-0.5", theme === "dark" ? "text-white" : "text-slate-900")}>
                    {user?.name || user?.email || "User"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {user?.email || "Inventory Manager"}
                  </p>
                </div>
              </button>
              {profileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-[150]">
                  <button onClick={() => goTo("/inventory/settings/profile")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">Profile</button>
                  {/* <button onClick={() => goTo("/inventory/settings/preferences")} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50">Settings</button> */}
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowConfirm(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
