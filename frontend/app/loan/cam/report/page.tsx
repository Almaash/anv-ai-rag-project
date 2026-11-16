"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Eye, Search, FileText, CheckCircle2, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface CAMRow {
  id: number;
  camId: string;
  loanId: string;
  customerName: string;
  decision: string;
  isVerified: boolean;
  date: string;
  income: string | number;
  expenditure: string | number;
  surplus: string | number;
  emi: string | number;
  remarks: string;
  raw_status?: string;
}

const STATUS_BADGE: Record<string, string> = {
  approved:        "bg-green-100 text-green-800 border-green-200",
  pending:         "bg-amber-100 text-amber-800 border-amber-200",
  rejected:        "bg-red-100 text-red-800 border-red-200",
  verified:        "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const getBadgeClass = (status: string) =>
  STATUS_BADGE[status?.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-100";

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function CAMReportPage() {
  const [data, setData]               = useState<CAMRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [stats, setStats]             = useState({ total: 0, approved: 0, verified: 0, pending: 0 });

  const [applied, setApplied] = useState({ search: "", from_date: "", to_date: "", status: "" });
  const [draft, setDraft]     = useState({ search: "", from_date: "", to_date: "", status: "" });

  const fetchData = useCallback(async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const user = getLoggedInUser();
      const branchId = user?.branch || user?.branch_id || undefined;

      const res = await axiosInstance.get(ProjectApiList.api_getCAMReport, {
        params: {
          page,
          limit:      10,
          search:     filters.search    || undefined,
          from_date:  filters.from_date || undefined,
          to_date:    filters.to_date   || undefined,
          status:     filters.status    || undefined,
          branch_id:  branchId,
        },
      });

      if (res.data.success) {
        const raw = res.data.data?.data || res.data.data || [];
        const mapped: CAMRow[] = raw.map((item: any) => {
          let decisionLabel = item.decision ?? "pending";
          // If the decision from API is indeed pending but was showing as approved, 
          // ensure we use the actual value. Or if it's based on some other field:
          if (String(item.cam_unique_id).includes("1003")) {
             // For debugging we can force it, but better to check why it maps to Approved.
             // If item.decision is null/undefined it defaults to "pending".
          }

          return {
            id:           item.id,
            camId:        item.cam_unique_id,
            loanId:       item.loan_id          ?? "-",
            customerName: item.customer_name    ?? "-",
            decision:     decisionLabel,
            isVerified:   Boolean(item.is_verified),
            raw_status:   item.raw_status,
            income:       item.total_accumulated_income ?? 0,
            expenditure:  item.total_monthly_expenditure ?? 0,
            surplus:      item.net_surplus ?? 0,
            emi:          item.proposed_emi ?? 0,
            remarks:      item.remarks ?? "-",
            date:         item.date
              ? new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "-",
          };
        });

        setData(mapped);
        setCurrentPage(res.data.data?.current_page ?? 1);
        setLastPage(res.data.data?.last_page       ?? 1);
        const t = res.data.data?.total ?? 0;
        setTotal(t);

        setStats({
          total:    t,
          approved: mapped.filter(r => r.decision?.toLowerCase() === "approved").length,
          verified: mapped.filter(r => r.isVerified).length,
          pending:  mapped.filter(r => r.decision?.toLowerCase() === "pending").length,
        });
      }
    } catch {
      toast.error("Failed to load CAM report");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    fetchData(1, applied);
  }, [fetchData, applied]);

  const handleApply = () => {
    setApplied(draft);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page, applied);
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">CAM Detailed Report</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Comprehensive Credit Appraisal Monitoring</p>
        </div>
        <button 
          onClick={() => toast.success("Exporting report...")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
        >
          <Download size={16} strokeWidth={2.5} /> Export Excel
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total CAMs", value: stats.total,    icon: FileText,     bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100"   },
          { label: "Dec. Approved", value: stats.approved, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
          { label: "Verified Stat.", value: stats.verified, icon: CheckCircle2, bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100"  },
          { label: "Dec. Pending",  value: stats.pending,  icon: Clock,        bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100"  },
        ].map((card) => (
          <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-sm p-5 flex items-center gap-4`}>
            <div className={`${card.bg} ${card.text} p-3 rounded-xl`}>
              <card.icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search CAM / Loan / Customer..."
              value={draft.search}
              onChange={(e) => setDraft(p => ({ ...p, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-500 tracking-wider">
            FROM DATE
            <input
              type="date"
              value={draft.from_date}
              onChange={(e) => setDraft(p => ({ ...p, from_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-500 tracking-wider">
            TO DATE
            <input
              type="date"
              value={draft.to_date}
              onChange={(e) => setDraft(p => ({ ...p, to_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-500 tracking-wider">
            DECISION
            <select
              value={draft.status}
              onChange={(e) => setDraft(p => ({ ...p, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            className="md:col-span-2 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-100"
          >
            Apply
          </button>
        </div>

        {/* COUNT */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {loading ? "Refreshing..." : `${total} Synchronization Records Found`}
        </p>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm max-w-full">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-[#fcfcfd]">
              <tr>
                {["CAM ID", "Loan ID", "Customer", "Income", "Expense", "Surplus", "EMI", "Decision", "Status", "Date", "Action"].map((h) => (
                  <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Loading Ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                    No matching records found
                  </td>
                </tr>
              ) : (
                data.map((row: CAMRow) => (
                  <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-4 py-4 font-bold text-blue-600 font-mono text-[12px] tracking-tighter whitespace-nowrap">{row.camId}</td>
                    <td className="px-4 py-4 text-gray-500 font-medium text-[12px] whitespace-nowrap">{row.loanId}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors text-[13px] leading-tight truncate max-w-[150px]" title={row.customerName}>
                        {row.customerName}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-bold text-[12px] whitespace-nowrap">₹{Number(row.income).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-red-600 font-bold text-[12px] whitespace-nowrap">₹{Number(row.expenditure).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-emerald-600 font-bold text-[12px] whitespace-nowrap">₹{Number(row.surplus).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-blue-600 font-bold text-[12px] whitespace-nowrap">₹{Number(row.emi).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${getBadgeClass(row.decision)} shadow-sm whitespace-nowrap`}>
                        {row.decision}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                       <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${row.isVerified ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 shadow-none'} whitespace-nowrap `}>
                        {row.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-[10px] font-bold tabular-nums whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4">
                      <Link href={`/loan/cam/viewCAM?id=${row.camId}`}>
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[9px] font-black uppercase bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <Eye size={10} strokeWidth={3} /> View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center pt-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all font-black"
          >
            Prev
          </button>
          <span className="tabular-nums font-black text-gray-700">
            Page {currentPage} of {lastPage}
          </span>
          <button
            disabled={currentPage === lastPage || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all font-black"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
