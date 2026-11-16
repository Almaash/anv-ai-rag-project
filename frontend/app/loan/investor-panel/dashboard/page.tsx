"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import AdminInvestorDashboardContent from "./admin/page";
import InvestorDashboardPage from "./investor/page";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isInvestor, setIsInvestor] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (stored) {
      const user = JSON.parse(stored);
      setIsInvestor(user?.role === "investor");
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      {isInvestor ? (
        <InvestorDashboardPage />
      ) : (
        <AdminInvestorDashboardContent />
      )}
    </Suspense>
  );
}