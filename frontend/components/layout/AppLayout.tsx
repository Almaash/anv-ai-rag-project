"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import SubscriptionModal from "@/components/common/SubscriptionModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <ProtectedRoute>
      <SubscriptionModal />
      <div className="flex h-screen bg-gray-100 text-foreground w-full overflow-hidden">
        <AppSidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isCollapsed}
        />
        <div
          className={cn(
            "flex-1 flex flex-col ml-0 w-full transition-[margin] duration-300",
            isCollapsed ? "md:ml-20" : "md:ml-64"
          )}
        >
          <AppHeader
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarCollapsed={isCollapsed}
            toggleSidebarCollapsed={toggleCollapsed}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
