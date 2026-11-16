"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Tab = "pd" | "cam" | "verified_cam";

interface PDRow {
  id: number;
  pdId: string;
  loanId: string;
  customerId: string;
  status: string;
}

interface CAMRow {
  id: number;
  camId: string;
  loanId: string;
  decision: string;
  isVerified: boolean;
  status: string;
}

const DECISION_BADGE: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

const getDecisionClass = (d: string) =>
  DECISION_BADGE[d?.toLowerCase()] ?? "bg-gray-100 text-gray-600";

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function CAMPage() {
  const [tab, setTab] = useState<Tab>("pd");

  // PD tab state
  const [pdRows, setPdRows] = useState<PDRow[]>([]);
  const [pdTotal, setPdTotal] = useState(0);
  const [pdPage, setPdPage] = useState(1);
  const [pdLastPage, setPdLastPage] = useState(1);

  // CAM tab state
  const [camRows, setCamRows] = useState<CAMRow[]>([]);
  const [camTotal, setCamTotal] = useState(0);
  const [camPage, setCamPage] = useState(1);
  const [camLastPage, setCamLastPage] = useState(1);

  const [loading, setLoading] = useState(false);

  // Draft filters (inputs)
  const [draft, setDraft] = useState({ search: "", from_date: "", to_date: "", status: "", decision: "" });
  // Applied filters (sent to API)
  const [applied, setApplied] = useState({ search: "", from_date: "", to_date: "", status: "", decision: "" });

  /* ─── FETCH PD ─── */
  const fetchPD = async (page = 1, filters = applied) => {
    setLoading(true);

    try {
      const user = getLoggedInUser();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const res = await axiosInstance.get(
        ProjectApiList.api_getAllCashPD,
        {
          params: {
            page,
            search: filters.search || undefined,
            user_id: user?.user_id,
            branch_id: user?.branch,
            cms_admin_id: cmsAdminId,
            is_cam_created: false,
          },
        }
      );

      if (res.data.success) {
        setPdRows(
          res.data.data.map((item: any) => ({
            id: item.id,
            pdId: item.pd_application_id ?? `PD-${item.id}`,
            loanId: item.loan_application_id ?? "-",
            customerId: item.customer_unique_id ?? "-",
            status: item.status ?? "pending",
          }))
        );

        const p = res.data.pagination;

        setPdTotal(p?.total ?? res.data.data.length);
        setPdPage(p?.current_page ?? 1);
        setPdLastPage(p?.last_page ?? 1);
      }
    } catch {
      toast.error("Failed to fetch PD records");
    } finally {
      setLoading(false);
    }
  };

  /* ─── FETCH CAM (pending) ─── */
  const fetchCAM = async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const user = getLoggedInUser();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const res = await axiosInstance.get(ProjectApiList.api_getAllCAM, {
        params: {
          page,
          per_page: 10,
          search: filters.search || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
          credit_decision: filters.decision || undefined,
          user_id: user?.user_id,
          branch_id: user?.branch,
          cms_admin_id: cmsAdminId,
          status: "credit_manager",
        },
      });
      if (res.data.success) {
        setCamRows(mapCAM(res.data.data));
        const p = res.data.pagination;
        setCamTotal(p?.total ?? res.data.data.length);
        setCamPage(p?.current_page ?? 1);
        setCamLastPage(p?.last_page ?? 1);
      }
    } catch { toast.error("Failed to fetch CAM records"); }
    finally { setLoading(false); }
  };

  /* ─── FETCH VERIFIED CAM ─── */
  const fetchVerifiedCAM = async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const user = getLoggedInUser();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const res = await axiosInstance.get(ProjectApiList.api_getAllCAM, {
        params: {
          page,
          per_page: 10,
          search: filters.search || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
          credit_decision: filters.decision || undefined,
          user_id: user?.user_id,
          branch_id: user?.branch,
          cms_admin_id: cmsAdminId,
          status: "verified",
          is_verified: true,
        },
      });
      if (res.data.success) {
        setCamRows(mapCAM(res.data.data));
        const p = res.data.pagination;
        setCamTotal(p?.total ?? res.data.data.length);
        setCamPage(p?.current_page ?? 1);
        setCamLastPage(p?.last_page ?? 1);
      }
    } catch { toast.error("Failed to fetch Verified CAM"); }
    finally { setLoading(false); }
  };

  const mapCAM = (data: any[]): CAMRow[] =>
    data.map((item: any) => ({
      id: item.id,
      camId: item.cam_unique_id ?? `CAM-${item.id}`,
      loanId: item.loan_application_id ?? "-",
      decision: item.credit_decision ?? "pending",
      isVerified: Boolean(item.is_verified),
      status: item.status ?? "pending",
    }));

  /* ─── INITIAL LOAD ─── */
  useEffect(() => {
    if (tab === "pd") fetchPD(1);
    if (tab === "cam") fetchCAM(1);
    if (tab === "verified_cam") fetchVerifiedCAM(1);
  }, [tab]);

  /* ─── APPLY FILTERS ─── */
  const handleApply = () => {
    setApplied(draft);
    if (tab === "pd") fetchPD(1, draft);
    if (tab === "cam") fetchCAM(1, draft);
    if (tab === "verified_cam") fetchVerifiedCAM(1, draft);
  };

  const handleReset = () => {
    const empty = { search: "", from_date: "", to_date: "", status: "", decision: "" };
    setDraft(empty);
    setApplied(empty);
    if (tab === "pd") fetchPD(1, empty);
    if (tab === "cam") fetchCAM(1, empty);
    if (tab === "verified_cam") fetchVerifiedCAM(1, empty);
  };

  /* ─── PAGINATION ─── */
  const handlePageChange = (page: number) => {
    if (tab === "pd") fetchPD(page);
    if (tab === "cam") fetchCAM(page);
    if (tab === "verified_cam") fetchVerifiedCAM(page);
  };

  const currentTotal = tab === "pd" ? pdTotal : camTotal;
  const currentPage = tab === "pd" ? pdPage : camPage;
  const currentLastPage = tab === "pd" ? pdLastPage : camLastPage;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Credit Appraisal Memorandum (CAM)</h1>
          <p className="text-sm text-gray-500">Manage and view all credit appraisal records</p>
        </div>
        <Link href="/loan/cam/createCAM"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 transition-colors font-bold"
        >
          + Create New CAM
        </Link>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">
        {([
          { key: "pd", label: "PD Records" },
          { key: "cam", label: "CAM Records" },
          { key: "verified_cam", label: "Verified CAM" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-5 py-2 text-sm font-medium transition-colors ${tab === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {label}
            {tab === key && <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded" />}
          </button>
        ))}
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 items-end flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={tab === "pd" ? "Search PD ID / Loan ID..." : "Search CAM ID / Loan ID..."}
              value={draft.search}
              onChange={(e) => setDraft(p => ({ ...p, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
            <input type="date" value={draft.from_date}
              onChange={(e) => setDraft(p => ({ ...p, from_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
            <input type="date" value={draft.to_date}
              onChange={(e) => setDraft(p => ({ ...p, to_date: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Decision (CAM tabs only) */}
          {tab !== "pd" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Decision</label>
              <select value={draft.decision}
                onChange={(e) => setDraft(p => ({ ...p, decision: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}

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
          {loading ? "Loading..." : `${currentTotal} records found`}
        </p>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3 border-b w-[60px]">#</th>
                {tab === "pd" ? (
                  <>
                    <th className="px-4 py-3 border-b">PD ID</th>
                    <th className="px-4 py-3 border-b">CAF ID</th>
                    <th className="px-4 py-3 border-b">Customer</th>
                    <th className="px-4 py-3 border-b">Status</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 border-b">CAM ID</th>
                    <th className="px-4 py-3 border-b">CAF ID</th>
                    <th className="px-4 py-3 border-b">Decision</th>
                    <th className="px-4 py-3 border-b">Status</th>
                  </>
                )}
                <th className="px-4 py-3 border-b text-center w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">

              {/* LOADING */}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm font-medium">Syncing with server...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading && tab === "pd" && pdRows.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">No records found</td></tr>
              )}
              {!loading && tab !== "pd" && camRows.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">No records found</td></tr>
              )}

              {/* PD ROWS */}
              {!loading && tab === "pd" && pdRows.map((row, i) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{(pdPage - 1) * 10 + i + 1}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{row.pdId}</td>
                  <td className="px-4 py-3 text-gray-700">{row.loanId}</td>
                  <td className="px-4 py-3 text-gray-700">{row.customerId}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-bold uppercase">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/loan/cam/createCAM?id=${row.loanId}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all mx-auto">
                        <Plus size={14} /> Create
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}

              {/* CAM ROWS */}
              {!loading && tab !== "pd" && camRows.map((row, i) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{(camPage - 1) * 10 + i + 1}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{row.camId}</td>
                  <td className="px-4 py-3 text-gray-700">{row.loanId}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${getDecisionClass(row.decision)}`}>
                      {row.decision || "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${row.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                      {row.isVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/loan/cam/viewCAM?id=${row.id}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all mx-auto">
                        <Eye size={14} /> View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center pt-3">
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {currentPage} of {currentLastPage}</span>
          <button
            disabled={currentPage === currentLastPage || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
}
