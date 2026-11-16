"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, Loader2, Plus, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { getFinanceDashboard } from "../api/financeApi";
import { toast } from "sonner";
import Link from "next/link";

const formatDate = (raw: string) => {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function FinanceDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFinanceDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const stats = data?.stats ?? {
    total_credit: 0, total_debit: 0, net_balance: 0, total_transactions: 0,
  };

  const statCards = [
    {
      title: "Total Credit",
      value: stats.total_credit,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      prefix: "₹",
    },
    {
      title: "Total Debit",
      value: stats.total_debit,
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      prefix: "₹",
    },
    {
      title: "Net Balance",
      value: stats.net_balance,
      icon: Wallet,
      color: stats.net_balance >= 0 ? "text-blue-600" : "text-orange-600",
      bg: stats.net_balance >= 0 ? "bg-blue-50" : "bg-orange-50",
      border: stats.net_balance >= 0 ? "border-blue-200" : "border-orange-200",
      prefix: "₹",
    },
    {
      title: "Total Transactions",
      value: stats.total_transactions,
      icon: ArrowUpRight,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      prefix: "",
    },
  ];

  const chartData = (data?.monthly_summary ?? []).map((m: any) => ({
    month: m.month,
    Credit: parseFloat(m.credit),
    Debit: parseFloat(m.debit),
  }));

  const recent: any[] = data?.recent_transactions ?? [];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
            Finance Dashboard
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Overview of your financial transactions.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/finance/transactions/add">
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Add Transaction</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </Link>
          <Link href="/finance/transactions">
            <Button variant="outline" className="gap-2 text-sm h-9">
              <List className="h-4 w-4" />
              <span className="hidden xs:inline">All Transactions</span>
              <span className="xs:hidden">All</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <Card key={i} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${s.bg} ${s.color} shrink-0`}>
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 truncate">{s.title}</p>
                  <h3 className={`text-sm sm:text-base md:text-lg font-bold truncate ${s.color}`}>
                    {s.prefix}{Number(s.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
            Monthly Credit vs Debit
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Last 6 months financial flow</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={(value: number) =>
                    `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Credit" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Debit" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0" />
              Recent Transactions
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Last 10 transactions</CardDescription>
          </div>
          <Link href="/finance/transactions">
            <Button variant="outline" size="sm" className="text-xs h-8">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {recent.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No transactions yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">TXN ID</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Date</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Amount</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Type</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((txn: any) => (
                      <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-xs text-slate-700">{txn.transaction_id}</td>
                        <td className="py-2 px-3 text-slate-600 text-xs whitespace-nowrap">{formatDate(txn.transaction_date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 text-xs whitespace-nowrap">
                          ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            className={txn.transaction_type === "credit"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                              : "bg-red-100 text-red-700 border-red-200 text-xs"}
                            variant="outline"
                          >
                            {txn.transaction_type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-xs max-w-[150px] truncate">
                          {txn.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {recent.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-slate-700">{txn.transaction_id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(txn.transaction_date)}</p>
                      {txn.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{txn.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-bold text-sm text-slate-800">
                        ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <Badge
                        className={txn.transaction_type === "credit"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs mt-1"
                          : "bg-red-100 text-red-700 border-red-200 text-xs mt-1"}
                        variant="outline"
                      >
                        {txn.transaction_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
