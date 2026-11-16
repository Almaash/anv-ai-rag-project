"use client";

import { useEffect, useState } from "react";
import { Search, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";

interface PIRow {
  id: number;
  disbId: string;
  loanId: string;
  customerName: string;
  paymentMethod: string;
  upiRef: string;
  disbStatus: string;
  paymentStatus: string;
  hasDfa: boolean;
  hasCfa: boolean;
  hasDpn: boolean;
  date: string;
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const BADGE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
  completed: "bg-green-50 text-green-700 border-green-100",
  neft_done: "bg-blue-50 text-blue-700 border-blue-100",
  disbursed: "bg-green-50 text-green-700 border-green-100",
  failed:    "bg-red-50 text-red-700 border-red-100",
};
const badge = (s: string) => BADGE[s?.toLowerCase().replace(/ /g, "_")] ?? "bg-gray-50 text-gray-600 border-gray-100";

const DocBadge = ({ has, label }: { has: boolean; label: string }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${has ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
    {label}
  </span>
);

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function PaymentInventoryReportPage() {
  const [data, setData]               = useState<PIRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [stats, setStats]             = useState({ total: 0, neft_done: 0, pending: 0, with_docs: 0 });

  const [applied, setApplied] = useState({ search: "", from_date: "", to_date: "", payment_status: "", disbursement_status: "" });
  const [draft, setDraft]     = useState({ search: "", from_date: "", to_date: "", payment_status: "", disbursement_status: "" });

  const fetchData = async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const user = getLoggedInUser();
      const branchId = user?.branch || user?.branch_id || undefined;

      const res = await axiosInstance.get("/report/loan/payment-inventory", {
        params: {
          page,
          limit:               10,
          search:              filters.search              || undefined,
          from_date:           filters.from_date           || undefined,
          to_date:             filters.to_date             || undefined,
          payment_status:      filters.payment_status      || undefined,
          disbursement_status: filters.disbursement_status || undefined,
          branch_id:           branchId,
        },
      });

      if (res.data.success) {
        const raw = res.data.data?.data || [];
        const mapped: PIRow[] = raw.map((item: any) => ({
          id:            item.id,
          disbId:        item.disbursement_id        ?? `DIS-${item.id}`,
          loanId:        item.loan_application_id    ?? "—",
          customerName:  `${item.customer?.first_name ?? ""} ${item.customer?.last_name ?? ""}`.trim() || item.customer_unique_id || "—",
          paymentMethod: item.payment_method         ?? "—",
          upiRef:        item.upi_reference_no       ?? item.transaction_reference ?? "—",
          disbStatus:    item.disbursement_status    ?? "pending",
          paymentStatus: item.payment_status         ?? "—",
          hasDfa:        !!item.dfa_document,
          hasCfa:        !!item.cfa_document,
          hasDpn:        !!item.dpn_document,
          date:          item.date_of_disbursement   ?? item.created_at,
        }));

        setData(mapped);
        const pg = res.data.data;
        setCurrentPage(pg?.current_page ?? 1);
        setLastPage(pg?.last_page       ?? 1);
        const t = pg?.total ?? mapped.length;
        setTotal(t);
        setStats({
          total:     t,
          neft_done: mapped.filter(r => r.paymentStatus?.toLowerCase() === "neft_done").length,
          pending:   mapped.filter(r => r.disbStatus?.toLowerCase() === "pending").length,
          with_docs: mapped.filter(r => r.hasDfa || r.hasCfa || r.hasDpn).length,
        });
      }
    } catch {
      toast.error("Failed to load payment inventory report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);

  const handleApply = () => { setApplied(draft); fetchData(1, draft); };
  const handleReset = () => {
    const empty = { search: "", from_date: "", to_date: "", payment_status: "", disbursement_status: "" };
    setDraft(empty); setApplied(empty); fetchData(1, empty);
  };

  return (
    <div className="box-border w-full max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 min-w-0">

      {/* HEADER */}
      <div className="flex justify-between items-center min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate" title="Payment Inventory Report">Payment Inventory Report</h1>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Records", value: stats.total,     icon: FileText,     bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100"   },
          { label: "NEFT Done",     value: stats.neft_done, icon: CheckCircle2, bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100"  },
          { label: "Pending",       value: stats.pending,   icon: Clock,        bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100"  },
          { label: "With Docs",     value: stats.with_docs, icon: AlertCircle,  bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
        ].map((card) => (
          <div key={card.label} className={`box-border bg-white rounded-xl border ${card.border} shadow-sm p-4 sm:p-5 flex items-center gap-4 min-w-0`}>
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
      <div className="box-border bg-white rounded-xl shadow-sm border p-3 sm:p-5 space-y-4 min-w-0 w-full max-w-full">

        {/* FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
          <div className="relative sm:col-span-2 xl:col-span-2 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search Disbursement ID / Loan ID / Customer..."
              value={draft.search}
              onChange={(e) => setDraft(p => ({ ...p, search: e.target.value }))}
              className="w-full min-w-0 pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
            <input type="date" value={draft.from_date}
              onChange={(e) => setDraft(p => ({ ...p, from_date: e.target.value }))}
              className="w-full min-w-0 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
            <input type="date" value={draft.to_date}
              onChange={(e) => setDraft(p => ({ ...p, to_date: e.target.value }))}
              className="w-full min-w-0 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Status</label>
            <select value={draft.payment_status}
              onChange={(e) => setDraft(p => ({ ...p, payment_status: e.target.value }))}
              className="w-full min-w-0 px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="NEFT_done">NEFT Done</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disb. Status</label>
            <select value={draft.disbursement_status}
              onChange={(e) => setDraft(p => ({ ...p, disbursement_status: e.target.value }))}
              className="w-full min-w-0 px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <button onClick={handleApply} disabled={loading}
              className="flex-1 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              Apply
            </button>
            <button onClick={handleReset} disabled={loading}
              className="flex-1 px-4 py-2 border text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
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
        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-gray-100">
          <table className="min-w-[1120px] w-full text-sm table-auto">
            <thead className="bg-gray-50/80">
              <tr>
                {["#", "Disbursement ID", "Loan ID", "Customer", "Payment Mode", "Reference", "Documents", "Disb. Status", "Payment Status", "Date"].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-bold text-gray-600 border-b whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm font-medium">Syncing with server...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400">No records found</td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-3 text-xs font-bold text-gray-400 whitespace-nowrap">{(currentPage - 1) * 10 + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="max-w-[190px] truncate font-semibold text-blue-600 font-mono text-xs whitespace-nowrap" title={row.disbId}>
                        {row.disbId}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[130px] truncate text-gray-700 font-mono text-xs whitespace-nowrap" title={row.loanId}>
                        {row.loanId}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[180px] truncate font-medium text-gray-800 whitespace-nowrap" title={row.customerName}>
                        {row.customerName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[130px] truncate text-gray-600 whitespace-nowrap" title={row.paymentMethod}>
                        {row.paymentMethod}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[150px] truncate text-gray-600 font-mono text-xs whitespace-nowrap" title={row.upiRef}>
                        {row.upiRef}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <DocBadge has={row.hasDfa} label="DFA" />
                        <DocBadge has={row.hasCfa} label="CFA" />
                        <DocBadge has={row.hasDpn} label="DPN" />
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase border ${badge(row.disbStatus)}`}>
                        {row.disbStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase border ${badge(row.paymentStatus)}`}>
                        {row.paymentStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-medium whitespace-nowrap">{formatDate(row.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-3">
          <button disabled={currentPage === 1 || loading}
            onClick={() => { setCurrentPage(p => p - 1); fetchData(currentPage - 1); }}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50 w-full sm:w-auto"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 text-center">Page {currentPage} of {lastPage}</span>
          <button disabled={currentPage === lastPage || loading}
            onClick={() => { setCurrentPage(p => p + 1); fetchData(currentPage + 1); }}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50 w-full sm:w-auto"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
}
