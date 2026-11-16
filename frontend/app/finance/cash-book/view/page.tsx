"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getCashBookEntryById } from "../../api/financeApi";

const formatDate = (raw: string) => {
  if (!raw) return "—";
  try {
    const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return raw;
  }
};

const formatDateTime = (raw: string) => {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
};

function ViewCashBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchEntry = async () => {
      try {
        const res = await getCashBookEntryById(id);
        if (res.data.success) {
          setEntry(res.data.data);
        } else {
          toast.error("Entry not found");
          router.push("/finance/cash-book");
        }
      } catch (err) {
        toast.error("Failed to load cash book entry");
        router.push("/finance/cash-book");
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-400 text-sm">
        Entry not found.
      </div>
    );
  }

  const rows = [
    { label: "Cash Book ID", value: entry.cash_book_id },
    { label: "Date", value: formatDate(entry.date) },
    { label: "Branch", value: entry.branch?.name || entry.branch || "—" },
    {
      label: "Opening Balance",
      value: `₹${Number(entry.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
    {
      label: "Cash In",
      value: `₹${Number(entry.cash_in || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      className: "text-emerald-600",
    },
    {
      label: "Cash Out",
      value: `₹${Number(entry.cash_out || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      className: "text-rose-600",
    },
    {
      label: "Closing Balance",
      value: `₹${Number(entry.closing_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      className: "font-bold text-slate-900",
    },
    {
      label: "Payment Mode",
      value: entry.payment_mode
        ? entry.payment_mode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "—",
    },
    { label: "Comments", value: entry.comments || entry.description || "—" },
    {
      label: "Created By",
      value: entry.creator
        ? `${entry.creator.name}${entry.creator.user_id ? ` (${entry.creator.user_id})` : ""}`
        : entry.created_by || "—",
    },
    { label: "Created At", value: formatDateTime(entry.created_at) },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Cash Book Entry</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-mono">{entry.cash_book_id}</p>
            </div>
          </div>
          <div className="flex gap-2 pl-12 sm:pl-0">
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm flex-1 sm:flex-none"
              onClick={() => router.push(`/finance/cash-book/add?id=${entry.id}`)}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-emerald-700 text-base sm:text-lg">Entry Details</CardTitle>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
              >
                {entry.payment_mode || "Cash"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <dl className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between py-3 text-sm gap-4">
                  <dt className="text-slate-500 font-medium shrink-0 text-xs sm:text-sm">{row.label}</dt>
                  <dd className={`text-right break-words text-xs sm:text-sm font-semibold ${row.className || "text-slate-800"}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ViewCashBookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ViewCashBookContent />
    </Suspense>
  );
}
