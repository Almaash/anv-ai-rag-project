"use client";

import { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";

const FINANCE_PERMISSIONS = [
  "read_finance_dashboard",
  "read_finance_transactions",
  "create_finance_transaction",
  "edit_finance_transaction",
  "delete_finance_transaction",
  "read_finance_cash_book",
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem("user_type", "finance");
    localStorage.setItem("permissions", JSON.stringify(FINANCE_PERMISSIONS));
    // Dispatch storage event so sidebar picks up the change in the same tab
    window.dispatchEvent(new Event("storage"));
  }, []);

  return <AppLayout>{children}</AppLayout>;
}
