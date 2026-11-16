"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Search, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface PDRow {
  id: number;
  pdId: string;
  loanId: string;
  customerName: string;
  status: string;
  verificationStatus: string;
  date: string;
}

const BADGE: Record<string, string> = {
  approved:  "bg-blue-50 text-blue-700 border-blue-100",
  verified:  "bg-green-50 text-green-700 border-green-100",
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
  rejected:  "bg-red-50 text-red-700 border-red-100",
};
const badge = (s: string) => BADGE[s?.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-100";

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function PDReportPage() {
  const [data, setData]               = useState<PDRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [stats, setStats]             = useState({ total: 0, approved: 0, verified: 0, pending: 0 });

  const [applied, setApplied] = useState({ search: "", from_date: "", to_date: "", status: "" });
  const [draft, setDraft]     = useState({ search: "", from_date: "", to_date: "", status: "" });

  const fetchData = async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const user = getLoggedInUser();
      const branchId = user?.branch || user?.branch_id || undefined;

      const res = await axiosInstance.get(ProjectApiList.api_getPDReport, {
        params: {
          page,
          limit:     10,
          search:    filters.search    || undefined,
          from_date: filters.from_date || undefined,
          to_date:   filters.to_date   || undefined,
          status:    filters.status    || undefined,
          branch_id: branchId,
        },
      });

      if (res.data.success) {
        const raw = res.data.data?.data || [];
        const mapped: PDRow[] = raw.map((item: any) => ({
          id:                 item.id,
          pdId:               item.pd_application_id  ?? `PD-${item.id}`,
          loanId:             item.loan_application_id ?? "—",
          customerName:       `${item.customer?.first_name ?? ""} ${item.customer?.last_name ?? ""}`.trim() || item.customer_unique_id || "—",
          status:             item.status             ?? "pending",
          verificationStatus: item.verification_status ?? "pending",
          date:               item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
        }));

        setData(mapped);
        setCurrentPage(res.data.data?.current_page ?? 1);
        setLastPage(res.data.data?.last_page       ?? 1);
        const t = res.data.data?.total ?? mapped.length;
        setTotal(t);
        setStats({
          total:    t,
          approved: mapped.filter(r => r.status?.toLowerCase() === "approved").length,
          verified: mapped.filter(r => r.verificationStatus?.toLowerCase() === "verified").length,
          pending:  mapped.filter(r => r.status?.toLowerCase() === "pending" || r.verificationStatus?.toLowerCase() === "pending").length,
        });
      }
    } catch {
      toast.error("Failed to load PD report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);

  const handleApply = () => { setApplied(draft); fetchData(1, draft); };

  const handleReset = () => {
    const empty = { search: "", from_date: "", to_date: "", status: "" };
    setDraft(empty); setApplied(empty); fetchData(1, empty);
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">PD Report</h1>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total PDs", value: stats.total,    icon: FileText,     bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100"   },
          { label: "Approved",  value: stats.approved, icon: AlertCircle,  bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
          { label: "Verified",  value: stats.verified, icon: CheckCircle2, bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100"  },
          { label: "Pending",   value: stats.pending,  icon: Clock,        bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100"  },
        ].map((card) => (
          <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-sm p-5 flex items-center gap-4`}>
            <div className={`${card.bg} ${card.text} p-3 rounded-xl`}>
              <card.icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search PD ID / Loan ID / Customer..."
              value={draft.search}
              onChange={(e) => setDraft(p => ({ ...p, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
            <input type="date" value={draft.from_date}
              onChange={(e) => setDraft(p => ({ ...p, from_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
            <input type="date" value={draft.to_date}
              onChange={(e) => setDraft(p => ({ ...p, to_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select value={draft.status}
              onChange={(e) => setDraft(p => ({ ...p, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handleApply} disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              Apply
            </button>
            <button onClick={handleReset} disabled={loading}
              className="px-4 py-2 border text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* COUNT */}
        <p className="text-sm text-gray-600">
          {loading ? "Loading records..." : `${total} records found`}
        </p>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                {["PD ID", "Loan ID", "Customer", "Status", "Verification", "Date", "Action"].map(h => (
                  <th key={h} className="px-4 py-4 text-left font-bold text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm font-medium">Syncing with server...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">No records found</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-4 font-semibold text-blue-600 font-mono">{row.pdId}</td>
                    <td className="px-4 py-4 text-gray-700">{row.loanId}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">{row.customerName}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase border ${badge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase border ${badge(row.verificationStatus)}`}>
                        {row.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs font-medium">{row.date}</td>
                    <td className="px-4 py-4">
                      <Link href={`/loan/pd/viewPD?id=${row.pdId}`}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all">
                          <Eye size={14} /> View
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
        <div className="flex justify-between items-center pt-3">
          <button disabled={currentPage === 1 || loading}
            onClick={() => { setCurrentPage(p => p - 1); fetchData(currentPage - 1); }}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {currentPage} of {lastPage}</span>
          <button disabled={currentPage === lastPage || loading}
            onClick={() => { setCurrentPage(p => p + 1); fetchData(currentPage + 1); }}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
}
