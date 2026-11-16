"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCcw, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import { toast } from "sonner";
import Link from "next/link";

interface CleanCAMData {
  id: number;
  camId: string;
  cafId: string;
  pdId: string;
  customerId: string;
  decision: string;
  verificationStatus: string;
  disbursementStatus: string;
  statusDisplay: string;
  date: string;
}

interface Summary {
  total_cams: number;
  verified_cams: number;
  disbursement_created_cams: number;
  disbursement_pending_cams: number;
}

export default function CAMDisbursementReport() {
  const [data, setData] = useState<CleanCAMData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [limit] = useState(10);

  const [summary, setSummary] = useState<Summary>({
    total_cams: 0,
    verified_cams: 0,
    disbursement_created_cams: 0,
    disbursement_pending_cams: 0
  });

  const [draft, setDraft] = useState({
    search: "",
    from_date: "",
    to_date: "",
    decision: "",
    verification_status: "",
    disbursement_status: ""
  });

  const [applied, setApplied] = useState(draft);

  const fetchData = useCallback(async (page = 1, filters = applied) => {
    try {
      setLoading(true);
      // Using the specified report endpoint
      const res = await axiosInstance.get("/report/cam-disbursement", {
        params: {
          page,
          limit,
          search: filters.search,
          from_date: filters.from_date,
          to_date: filters.to_date,
          credit_decision: filters.decision,
          verification_status: filters.verification_status,
          disbursement_status: filters.disbursement_status,
          // Mandatory filter as per instructions
          is_disbursement_created: true
        }
      });

      if (res.data.success) {
        const raw = res.data.data || [];
        
        // STRICT DATA MAPPING: Extracting only required fields
        const cleanData = raw.map((item: {
          id: number;
          cam_unique_id: string;
          loan_application_id: string;
          pd_id: string;
          customer_unique_id: string;
          credit_decision?: string;
          verification_status?: string;
          disbursement_status?: string;
          status_display: string;
          created_at: string;
        }) => ({
          id: item.id,
          camId: item.cam_unique_id,
          cafId: item.loan_application_id,
          pdId: item.pd_id,
          customerId: item.customer_unique_id,
          decision: item.credit_decision || "pending",
          verificationStatus: item.verification_status || "Pending",
          disbursementStatus: item.disbursement_status || "Pending",
          statusDisplay: item.status_display,
          date: item.created_at
        }));

        setData(cleanData);
        setSummary(res.data.summary || {
          total_cams: 0,
          verified_cams: 0,
          disbursement_created_cams: 0,
          disbursement_pending_cams: 0
        });
        
        // Handle pagination structure
        if (res.data.pagination) {
            setCurrentPage(res.data.pagination.current_page || 1);
            setTotal(res.data.pagination.total || 0);
            setLastPage(res.data.pagination.last_page || 1);
        }
      }
    } catch (error) {
      console.error("CAM Report Error:", error);
      toast.error("Failed to load disbursement report");
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
    const fresh = { 
        search: "", 
        from_date: "", 
        to_date: "", 
        decision: "", 
        verification_status: "", 
        disbursement_status: "" 
    };
    setDraft(fresh);
    setApplied(fresh);
    setCurrentPage(1);
  };

  const getDecisionBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'approved') return "bg-green-50 text-green-700 border-green-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  const getDisbursementBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'created') return "bg-blue-50 text-blue-700 border-blue-100 text-[10px]";
    return "bg-gray-50 text-gray-500 border-gray-100 text-[10px]";
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CAM Disbursement Report</h1>
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest mt-1">Disbursement Tracking & Ledger</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search CAM ID / CAF ID..."
            value={draft.search}
            onChange={(e) => setDraft({...draft, search: e.target.value})}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total CAMs", value: summary.total_cams, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Verified CAMs", value: summary.verified_cams, icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "Disb. Created", value: summary.disbursement_created_cams, icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Disb. Pending", value: summary.disbursement_pending_cams, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`${s.bg} ${s.color} p-3 rounded-lg`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-xl font-bold text-gray-900">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER SECTION */}
      <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">From Date</label>
            <input
              type="date"
              value={draft.from_date}
              onChange={(e) => setDraft({...draft, from_date: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">To Date</label>
            <input
              type="date"
              value={draft.to_date}
              onChange={(e) => setDraft({...draft, to_date: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Decision</label>
            <select
              value={draft.decision}
              onChange={(e) => setDraft({...draft, decision: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">All Decisions</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Verification</label>
            <select
              value={draft.verification_status}
              onChange={(e) => setDraft({...draft, verification_status: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">All Status</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Disbursement</label>
            <select
              value={draft.disbursement_status}
              onChange={(e) => setDraft({...draft, disbursement_status: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">All Status</option>
              <option value="Created">Created</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
          >
            RESET
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
          >
            <Filter size={14} /> APPLY
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12 text-center">#</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">CAM ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">CAF ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PD ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decision</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disbursement</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-6 py-5 cursor-wait">
                        <div className="h-2.5 bg-gray-100 rounded-full w-12 mx-auto"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <RefreshCcw className="text-gray-300" size={32} />
                        <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">No data found in ledger</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-400 text-center">{(currentPage - 1) * limit + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-blue-600 font-mono text-[13px]">{row.camId}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{row.cafId}</td>
                    <td className="px-6 py-4 text-gray-400 font-medium text-xs">{row.pdId}</td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">{row.customerId}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase border-b-2 shadow-sm ${getDecisionBadge(row.decision)}`}>
                        {row.decision}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase ${row.verificationStatus === 'Verified' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                        {row.verificationStatus === 'Verified' && <CheckCircle2 size={10} />}
                        {row.verificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex px-2.5 py-1 rounded-md font-black uppercase border-b-2 shadow-sm ${getDisbursementBadge(row.disbursementStatus)}`}>
                        {row.disbursementStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-[11px] font-bold tabular-nums">
                      {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric'}) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Link href={`/loan/cam/view/${row.camId}`}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase bg-white border border-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <Eye size={12} strokeWidth={3} /> View
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Showing <span className="text-gray-900">{data.length}</span> of <span className="text-gray-900">{total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-black text-gray-700 tabular-nums shadow-sm">
                 {currentPage} / {lastPage}
              </div>
              <button
                disabled={currentPage === lastPage || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
