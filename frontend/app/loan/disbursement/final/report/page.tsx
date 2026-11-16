"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  FileText, 
  Search, 
  Calendar, 
  Filter, 
  RefreshCcw, 
  Download,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

interface FinalReportData {
  id: number;
  camId: string;
  loanId: string;
  disbursementId: string;
  customerName: string;
  loanAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  paymentMethod: string;
  status: string;
  bookingDate: string;
  disbursementDate: string;
  bankName: string;
  transactionId: string;
}

export default function FinalDisbursementReport() {
  const [data, setData] = useState<FinalReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [limit] = useState(10);

  const [draft, setDraft] = useState({
    search: "",
    from_date: "",
    to_date: "",
    status: ""
  });

  const [applied, setApplied] = useState(draft);

  const [stats, setStats] = useState({
    totalAmount: 0,
    successCount: 0,
    pendingCount: 0,
    totalCount: 0
  });

  const fetchData = useCallback(async (page = 1, filters = applied) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.api_getDisbursementReport, {
        params: {
          page,
          limit,
          search: filters.search,
          from_date: filters.from_date,
          to_date: filters.to_date,
          status: filters.status,
          is_final: true
        }
      });

      if (res.data.success) {
        const raw = res.data.data.data || res.data.data || [];
        const mapped: FinalReportData[] = raw.map((item: unknown) => {
          const i = item as Record<string, unknown>;
          const customer = i.customer as Record<string, unknown> | undefined;
          return {
            id: Number(i.id) || 0,
            camId: String(i.cam_unique_id || i.cam_id || "-"),
            loanId: String(i.loan_application_id || "-"),
            disbursementId: String(i.disbursement_id ?? `DSB-${i.id}`),
            customerName: String(i.customer_name || (customer?.first_name ? `${customer.first_name} ${customer.last_name || ""}` : "-")),
            loanAmount: Number(i.total_accumulated_income) || 0,
            approvedAmount: Number(i.net_surplus) || 0,
            disbursedAmount: Number(i.proposed_emi) || 0,
            paymentMethod: String(i.payment_mode ?? "NEFT"),
            status: String(i.disbursement_status || "pending").toLowerCase(),
            bookingDate: String(i.booking_date || "-"),
            disbursementDate: String(i.disbursement_date || i.created_at || "-"),
            bankName: String(i.bank_name || "-"),
            transactionId: String(i.transaction_id || "-")
          };
        });

        setData(mapped);
        setCurrentPage(res.data.data.current_page || 1);
        setLastPage(res.data.data.last_page || 1);
        setTotal(res.data.data.total || mapped.length);

        setStats({
          totalCount: res.data.data.total || mapped.length,
          totalAmount: mapped.reduce((acc: number, curr: FinalReportData) => acc + curr.disbursedAmount, 0),
          successCount: mapped.filter((r: FinalReportData) => r.status === 'success' || r.status === 'disbursed' || r.status === 'completed').length,
          pendingCount: mapped.filter((r: FinalReportData) => r.status === 'pending').length,
        });
      }
    } catch (error) {
      console.error("Report Error:", error);
      toast.error("Failed to load final disbursement report");
    } finally {
      setLoading(false);
    }
  }, [applied, limit]);

  useEffect(() => {
    fetchData(1, applied);
  }, [fetchData, applied]);

  const handleApply = () => {
    setApplied(draft);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const fresh = { search: "", from_date: "", to_date: "", status: "" };
    setDraft(fresh);
    setApplied(fresh);
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={28} />
            Final Disbursement Report
          </h1>
          <p className="text-[13px] font-medium text-gray-500 mt-1 uppercase tracking-wider">Verified Payment Legders & Reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
           >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Disbursed", val: formatCurrency(stats.totalAmount), icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Successful", val: stats.successCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "Pending Payouts", val: stats.pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          { label: "Total Records", val: stats.totalCount, icon: FileText, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
        ].map((s, idx) => (
          <div key={idx} className={`bg-white p-5 rounded-2xl border ${s.border} shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 right-0 p-4 transition-transform group-hover:scale-110 opacity-20 ${s.color}`}>
              <s.icon size={48} />
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color} tabular-nums`}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Record</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ID / Loan / Customer..."
                value={draft.search}
                onChange={(e) => setDraft({...draft, search: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-gray-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={draft.from_date}
                onChange={(e) => setDraft({...draft, from_date: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-gray-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={draft.to_date}
                onChange={(e) => setDraft({...draft, to_date: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-gray-700"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Filter size={16} /> Apply
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-12">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CAM & Loan ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sanction & Final</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Analyzing Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No data found in ledger</td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[12px] font-black text-gray-400 text-center">{(currentPage - 1) * limit + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                           <span className="text-[12px] font-black text-blue-600 uppercase tracking-tight">{row.camId}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.loanId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-black text-gray-800 uppercase tracking-tight truncate max-w-[180px]">{row.customerName}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSB: {row.disbursementId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-black text-gray-900 tabular-nums">{formatCurrency(row.disbursedAmount)}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Approved: {formatCurrency(row.approvedAmount)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{row.paymentMethod}</span>
                        <p className="text-[9px] font-medium text-gray-400 truncate max-w-[100px]">{row.bankName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase border-b-2 ${
                        row.status === 'success' || row.status === 'disbursed' || row.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : row.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-gray-700 uppercase tabular-nums">{row.disbursementDate}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Booking: {row.bookingDate}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                         <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-blue-600 transition-all shadow-sm">
                            <Eye size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Showing <span className="text-gray-900">{data.length}</span> of <span className="text-gray-900">{total}</span> Records
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-700 tabular-nums shadow-sm">
                 {currentPage} / {lastPage}
              </div>
              <button
                disabled={currentPage === lastPage || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
