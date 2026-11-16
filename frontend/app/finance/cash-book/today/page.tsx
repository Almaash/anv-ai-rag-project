"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, BookOpen, Wallet, 
  ArrowDownCircle, ArrowUpCircle, CheckCircle, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getCashBookToday } from "../../api/financeApi";

const fmt = (n: any) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const fmtDate = (raw: string) => {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CashBookTodayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<any>(null);
  const [todayExists, setTodayExists] = useState(false);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        setLoading(true);
        const res = await getCashBookToday();
        setTodayData(res.data.data);
        setTodayExists(res.data.exists);
      } catch (err) {
        toast.error("Failed to load today's summary");
      } finally {
        setLoading(false);
      }
    };
    fetchToday();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            Today's Cash Book Summary
          </h1>
          <p className="text-gray-500">Overview for {fmtDate(todayData?.date || new Date().toISOString())}</p>
        </div>
        <div className="ml-auto">
          {todayExists ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
              <CheckCircle size={14} className="mr-1" /> Entry Created
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">
              <AlertCircle size={14} className="mr-1" /> Not Started
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balances Card */}
        <Card className="border-blue-100 ">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="text-blue-600" />
              Closing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-blue-100/50">
              <span className="text-gray-600">Opening Balance</span>
              <span className="font-semibold text-gray-900">{fmt(todayData?.opening_balance)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100/50">
              <span className="text-gray-600">Total Cash In</span>
              <span className="font-semibold text-green-600">+{fmt(todayData?.cash_in)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100/50">
              <span className="text-gray-600">Total Cash Out</span>
              <span className="font-semibold text-red-600">-{fmt(todayData?.cash_out)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-gray-900">Closing Balance</span>
              <span className="text-2xl font-bold text-blue-700">{fmt(todayData?.closing_balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Info Card */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start gap-2 h-12" 
              onClick={() => router.push(todayExists ? `/finance/cash-book/add?id=${todayData?.id}` : "/finance/cash-book/add")}
            >
              {todayExists ? "Update Summary" : "Create Today's Summary"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-12"
              onClick={() => router.push("/finance/cash-book")}
            >
              View Full History
            </Button>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-wider mb-2">Note</p>
              <p className="text-sm text-gray-700 italic">
                {todayData?.note || "No notes provided for today's summary yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Wallet className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Opening</p>
            <p className="text-lg font-bold text-gray-900">{fmt(todayData?.opening_balance)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <ArrowDownCircle className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Cash In</p>
            <p className="text-lg font-bold text-green-600">{fmt(todayData?.cash_in)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <ArrowUpCircle className="text-red-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Cash Out</p>
            <p className="text-lg font-bold text-red-600">{fmt(todayData?.cash_out)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}