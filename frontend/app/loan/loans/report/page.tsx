"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Download, Search, FileText, CheckCircle2, Clock, 
  ShieldCheck, Loader2, AlertCircle, TrendingUp, 
  Users, Landmark, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { format } from "date-fns";

interface LoanData {
  id: number;
  loan_number: string;
  customer_name: string;
  phone_no: string;
  amount: number;
  tenure: number;
  roi: number;
  status: string;
  created_at: string;
  disbursement_date: string;
  next_emi_date: string;
}

const currency = (val: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  try { return format(new Date(dateStr), "dd MMM yyyy"); } 
  catch { return "N/A"; }
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStyles = () => {
    const s = status?.toLowerCase();
    if (s === "active" || s === "running") return "bg-green-50 text-green-700 border-green-100";
    if (s === "closed" || s === "completed") return "bg-blue-50 text-blue-700 border-blue-100";
    if (s === "overdue" || s === "default") return "bg-red-50 text-red-700 border-red-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStyles()}`}>
      {status || "PENDING"}
    </span>
  );
};

export default function LoanMasterReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LoanData[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    from_date: "",
    to_date: "",
  });

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      // Switched to Consolidated Master Report API
      const res = await axiosInstance.get("/report/loan/master", {
        params: {
          search: filters.search,
          status: filters.status,
          from_date: filters.from_date,
          to_date: filters.to_date,
        }
      });
      
      const resData = res?.data?.data?.data || res?.data?.data || [];
      
      const mappedData = resData.map((item: any) => ({
          id: item.id,
          loan_number: item.loan_number || `LC-00${item.id}`,
          customer_name: `${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.trim() || item.customer_unique_id,
          phone_no: item.customer?.contact_number_1 || "N/A",
          amount: Number(item.loan_amount || 0),
          tenure: item.tenure_months || "N/A",
          roi: item.interest_rate || 0,
          status: item.status || "Active",
          created_at: item.created_at,
          disbursement_date: item.loan_start_date || item.created_at,
          next_emi_date: item.installment_start_date,
        }));

      setData(mappedData);
    } catch (error) {
      console.error("Failed to fetch loans:", error);
      toast.error("Failed to load loan portfolio");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter(i => i.status?.toLowerCase() === "active" || i.status?.toLowerCase() === "running").length;
    const closed = data.filter(i => i.status?.toLowerCase() === "closed").length;
    const portfolioValue = data.reduce((sum, i) => sum + i.amount, 0);

    return { total, active, closed, portfolioValue };
  }, [data]);

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
      {/* Header Section */}
      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <Landmark className="text-white" size={18} />
             </div>
             <div>
                <h1 className="text-lg font-bold text-gray-900">Master Loan Portfolio Report</h1>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">Verified asset book and disbursement tracking</p>
             </div>
          </div>
          <Button variant="outline" className="h-9 text-xs flex items-center gap-2 border-gray-200 shadow-none">
            <Download size={14} /> Export XLS
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold" size={14} strokeWidth={3} />
            <Input 
              placeholder="Search Loan No / Customer..." 
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className="pl-9 h-10 text-sm border-gray-200 bg-gray-50/20 focus:bg-white focus:ring-blue-100 transition-all font-medium"
            />
          </div>
          <Input 
            type="date" 
            value={filters.from_date}
            onChange={(e) => setFilters(p => ({...p, from_date: e.target.value}))}
            className="h-10 text-sm border-gray-200 font-medium" 
          />
          <Input 
            type="date" 
            value={filters.to_date}
            onChange={(e) => setFilters(p => ({...p, to_date: e.target.value}))}
            className="h-10 text-sm border-gray-200 font-medium" 
          />
          <select 
            value={filters.status}
            onChange={(e) => setFilters(p => ({...p, status: e.target.value}))}
            className="h-10 text-sm border border-gray-200 rounded-md bg-white px-3 outline-none focus:ring-2 focus:ring-blue-100 font-medium"
          >
            <option value="">All Loan Statuses</option>
            <option value="active">Active/Running</option>
            <option value="closed">Closed/Settled</option>
            <option value="overdue">Overdue/NPA</option>
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Asset Book", value: currency(stats.portfolioValue), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50/50" },
          { label: "Pipeline Value", value: currency(stats.portfolioValue), icon: AlertCircle, color: "text-indigo-600", bg: "bg-indigo-50/50" },
          { label: "Active Accounts", value: stats.active, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50/50" },
          { label: "Verified Data", value: stats.total, icon: FileText, color: "text-amber-600", bg: "bg-amber-50/50" },
          { label: "Closed/NPA", value: stats.closed, icon: ShieldCheck, color: "text-red-600", bg: "bg-red-50/50" },
        ].map((card) => (
          <div key={card.label} className="bg-white border-l-4 border-l-blue-600/10 border border-gray-100 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className={`p-2 rounded-lg w-fit mb-2 ${card.bg}`}>
                <card.icon size={16} className={card.color} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
            <p className="mt-1 text-xl font-black text-gray-900 leading-none tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Portfolio Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2 className="animate-spin mb-3 text-blue-600" size={40} />
            <p className="text-gray-500 font-medium">Fetching Authorized Portfolio Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b">
                  <th className="px-5 py-3.5">Loan Number</th>
                  <th className="px-5 py-3.5">Customer / Unique ID</th>
                  <th className="px-5 py-3.5 text-right">Sanctioned Amt</th>
                  <th className="px-5 py-3.5 text-center">ROI / Tenure</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Key Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No valid portfolio records identified in the central ledger</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/10 transition-colors group cursor-default">
                      <td className="px-5 py-4">
                        <div className="font-bold text-blue-600 text-[12.5px] font-mono tracking-tighter">{row.loan_number}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Authorized Asset</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{row.customer_name}</div>
                        <div className="text-[10px] text-gray-500 font-semibold tracking-wide tabular-nums">{row.phone_no}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-800 tabular-nums tracking-tight">
                        {currency(row.amount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="text-[12px] font-bold text-gray-700">{row.roi > 0 ? `${row.roi}% p.a` : "0% p.a"}</div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{row.tenure} Months</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[11px] font-bold text-gray-700 tabular-nums leading-tight">Next: {formatDate(row.next_emi_date)}</div>
                        <div className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter">EMI Scheduled</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-center text-[11px] text-gray-400 font-bold uppercase tracking-widest">
          Verified financial report • Generated on {format(new Date(), "dd MMM yyyy HH:mm")}
      </div>
    </div>
  );
}