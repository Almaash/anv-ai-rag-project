"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  IndianRupee, 
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

// --- Types ---
interface FinalDisbursementData {
  camId: string;
  loanApplicationId: string;
  disbursementId: string;
  customerName: string;
  loanAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  bookingDate: string;
  disbursementDate: string;
  status: string;
  paymentMode: string;
  transactionId: string;
  bankName: string;
}

// --- Reusable Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === "success" || s === "disbursed") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none">
        Success
      </Badge>
    );
  }
  if (s === "pending") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none">
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none">
      {status || "Failed"}
    </Badge>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: LucideIcon; color: string; bg: string }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
    <div className={`p-2 rounded-lg w-fit mb-2 ${bg}`}>
      <Icon size={16} className={color} strokeWidth={2.5} />
    </div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="mt-1 text-xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
  </div>
);

const currency = (val: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatDate = (date: string) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// --- Main Page Component ---

export default function FinalDisbursementReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinalDisbursementData[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    from_date: "",
    to_date: "",
    status: "all"
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Using the same endpoint as CAM Disbursement Report but for final
      const res = await axiosInstance.get(ProjectApiList.api_getDisbursementReport, {
        params: {
          search: filters.search,
          from_date: filters.from_date,
          to_date: filters.to_date,
          status: filters.status !== "all" ? filters.status : undefined,
          is_final: true // Filter for final disbursements if supported
        }
      });
      
      if (res.data?.success) {
        const raw = res.data.data?.data || res.data.data || [];
        const mapped: FinalDisbursementData[] = raw.map((item: unknown) => {
          const i = item as Record<string, unknown>;
          const customer = i.customer as Record<string, unknown> | undefined;
          return {
            camId: String(i.cam_unique_id || i.cam_id || "-"),
            loanApplicationId: String(i.loan_application_id || "-"),
            disbursementId: String(i.disbursement_id || "-"),
            customerName: String(i.customer_name || (customer?.first_name ? `${customer.first_name} ${customer.last_name || ""}` : "-")),
            loanAmount: Number(i.total_accumulated_income) || 0,
            approvedAmount: Number(i.net_surplus) || 0,
            disbursedAmount: Number(i.proposed_emi) || 0,
            bookingDate: String(i.booking_date || "-"),
            disbursementDate: String(i.disbursement_date || i.created_at || "-"),
            status: String(i.disbursement_status || "Pending"),
            paymentMode: String(i.payment_mode || "NEFT"),
            transactionId: String(i.transaction_id || "-"),
            bankName: String(i.bank_name || "-"),
          };
        });
        setData(mapped);
      }
    } catch (error) {
      console.error("Final Disbursement Report Error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalCount = data.length;
    const totalVal = data.reduce((sum, i) => sum + Number(i.disbursedAmount || 0), 0);
    const success = data.filter(i => i.status?.toLowerCase() === "success").length;
    const pending = data.filter(i => i.status?.toLowerCase() === "pending").length;
    const failed = data.filter(i => i.status?.toLowerCase() === "failed").length;

    return { totalCount, totalVal, success, pending, failed };
  }, [data]);

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
      {/* Header & Filters */}
      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg shadow-blue-100 shadow-lg">
                <CheckCircle2 className="text-white" size={18} />
             </div>
             <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Final Disbursement Report</h1>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">Post-verification fund release ledger</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 text-xs flex items-center gap-2 border-gray-200 shadow-none hover:bg-gray-50">
              <Download size={14} className="text-gray-500" /> Export XLS
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold" size={14} strokeWidth={3} />
            <Input 
              placeholder="Search Loan ID / Customer / Txn..." 
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className="pl-9 h-10 text-sm border-gray-200 bg-gray-50/20 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
          </div>
          <Input 
            type="date" 
            value={filters.from_date}
            onChange={(e) => setFilters(p => ({...p, from_date: e.target.value}))}
            className="h-10 text-sm border-gray-200 font-medium cursor-pointer" 
          />
          <Input 
            type="date" 
            value={filters.to_date}
            onChange={(e) => setFilters(p => ({...p, to_date: e.target.value}))}
            className="h-10 text-sm border-gray-200 font-medium cursor-pointer" 
          />
           <select 
            value={filters.status}
            onChange={(e) => setFilters(p => ({...p, status: e.target.value}))}
            className="h-10 text-sm border-gray-200 rounded-md border bg-transparent px-3 py-1 font-medium focus:ring-blue-100 transition-all outline-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard label="Units Released" value={stats.totalCount} icon={FileText} color="text-blue-600" bg="bg-blue-50/50" />
        <SummaryCard label="Released Value" value={currency(stats.totalVal)} icon={IndianRupee} color="text-emerald-600" bg="bg-emerald-50/50" />
        <SummaryCard label="Success" value={stats.success} icon={CheckCircle2} color="text-green-600" bg="bg-green-50/50" />
        <SummaryCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" bg="bg-amber-50/50" />
        <SummaryCard label="Failed" value={stats.failed} icon={XCircle} color="text-rose-600" bg="bg-rose-50/50" />
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-sm">
        {loading ? (
          <div className="py-24 flex flex-col items-center">
            <div className="relative">
              <Loader2 className="animate-spin text-blue-600" size={42} strokeWidth={1.5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Processing Final Ledger Data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-24 flex flex-col items-center">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <AlertCircle className="text-gray-300" size={48} strokeWidth={1.5} />
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No synchronized records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-5 py-4">CAM / Loan ID</th>
                  <th className="px-5 py-4">Disb. ID</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4 text-right">Amounts (App/Disb)</th>
                  <th className="px-5 py-4 text-center">Dates (Booking/Disb)</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Payment Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((row) => (
                  <tr key={row.disbursementId} className="hover:bg-blue-50/5 transition-colors group cursor-default">
                    <td className="px-5 py-5">
                      <div className="font-bold text-blue-600 text-[12px] font-mono tracking-tighter">
                        CAM: {row.camId}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">App: {row.loanApplicationId}</div>
                    </td>
                    <td className="px-5 py-5 font-bold text-gray-700 text-[11px]">
                      {row.disbursementId}
                    </td>
                    <td className="px-5 py-5">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{row.customerName}</div>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="font-bold text-gray-900 tracking-tighter text-[13px]">{currency(row.disbursedAmount)}</div>
                      <div className="text-[9px] text-blue-500/80 font-bold tracking-tighter uppercase mt-1">App: {currency(row.approvedAmount)}</div>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <div className="text-[11px] font-bold text-gray-700 tabular-nums">
                        B: {formatDate(row.bookingDate)}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-bold tabular-nums mt-0.5">
                        D: {formatDate(row.disbursementDate)}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="text-[10px] font-bold text-gray-700 bg-gray-100/50 px-2 py-0.5 rounded border border-gray-200 mb-1">{row.paymentMode}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter font-mono bg-blue-50/30 px-1 border border-blue-100/50 rounded">{row.transactionId}</div>
                        <div className="text-[8px] text-gray-400 font-semibold mt-1 uppercase italic">{row.bankName}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Real-time disbursement sync active
          </div>
          <div>Authorized Ledger • Anavran CRM v2.1</div>
      </div>
    </div>
  );
}
