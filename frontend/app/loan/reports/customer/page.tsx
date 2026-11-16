"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Eye, FileBox, Search } from "lucide-react";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "../_components/reportExport";

const reportFilterParams = {
  user_id: "anv_7",
  branch_id: "HZB-4401",
  cms_admin_id: "anv_2",
};

const pageMeta = {
  title: "Customer Report",
  description: "Customer records and verification status.",
  endpoint: ProjectApiList.GET_REPORT_CUSTOMER,
  detailType: "customer",
  searchPlaceholder: "Search by Customer ID, Enrollment No or name...",
  statusLabel: "Verification Status",
  statusOptions: [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
  ],
} as const;

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const pillClass = (value?: string | null) => {
  const status = String(value || "").toLowerCase();
  if (status === "verified") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

export default function CustomerReportPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(5);

  const [filterState, setFilterState] = useState({ search: "", verification_status: "", from_date: "", to_date: "" });
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportFilterParams, setReportFilterParams] = useState<{ user_id: string; branch_id: string; cms_admin_id: string } | null>(null);

  useEffect(() => {
    const user = getLoggedInUser();

    setReportFilterParams(
      user
        ? {
            user_id: user.user_id || "",
            branch_id: user.branch || user.branch_id || "",
            cms_admin_id: user.cms_admin || user.cms_admin_id || user.admin_user_id || "",
          }
        : null
    );
  }, []);

  const fetchReport = useCallback(async () => {
    if (!reportFilterParams) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(pageMeta.endpoint, {
        params: {
          ...reportFilterParams,
          search,
          verification_status: verificationStatus,
          from_date: fromDate,
          to_date: toDate,
          page,
          per_page: perPage,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch report");
      }

      setData(response.data.data.data || []);
      setLastPage(response.data.data.last_page || 1);
      setTotal(response.data.data.total || 0);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, verificationStatus, fromDate, toDate, reportFilterParams]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!reportFilterParams) {
      setLoading(false);
      // setError("User details not found in localStorage.");
      // toast.error("User details not found in localStorage.");
    }
  }, [reportFilterParams]);

  const rows = useMemo(() => data, [data]);
  const exportRows = useMemo(
    () =>
      rows.map((item, idx) => ({
        "S.No": (page - 1) * perPage + idx + 1,
        "Customer ID": item.customer_unique_id || "N/A",
        "Customer Name": `${item.first_name || ""} ${item.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A",
        Mobile: item.contact_number_1 || "N/A",
        Branch: item.branch_id || "N/A",
        Verification: item.verification_status || "N/A",
        Status: item.status || "N/A",
      })),
    [page, perPage, rows]
  );

  const handleExportExcel = () => {
    if (!exportRows.length) return;
    exportRowsToExcel(exportRows, `customer_report_${new Date().toISOString().slice(0, 10)}.xlsx`, "Customers");
  };

  const handleExportCSV = () => {
    if (!exportRows.length) return;
    exportRowsToCsv(exportRows, `customer_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPDF = () => {
    if (!exportRows.length) return;
    exportRowsToPdf(exportRows, `customer_report_${new Date().toISOString().slice(0, 10)}.pdf`, pageMeta.title);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
        <h1 className="mt-1 text-lg font-bold text-gray-900">{pageMeta.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{pageMeta.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={pageMeta.searchPlaceholder}
              value={filterState.search}
              onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">{pageMeta.statusLabel}</label>
          <select
            value={filterState.verification_status}
            onChange={(e) => setFilterState((prev) => ({ ...prev, verification_status: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none"
          >
            {pageMeta.statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">From Date</label>
          <input
            type="date"
            value={filterState.from_date}
            onChange={(e) => setFilterState((prev) => ({ ...prev, from_date: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">To Date</label>
          <input
            type="date"
            value={filterState.to_date}
            onChange={(e) => setFilterState((prev) => ({ ...prev, to_date: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-end gap-2 md:col-span-4">
          <button
            onClick={() => {
              setPage(1);
              setSearch(filterState.search);
              setVerificationStatus(filterState.verification_status);
              setFromDate(filterState.from_date);
              setToDate(filterState.to_date);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
          <button
            onClick={() => {
              setFilterState({ search: "", verification_status: "", from_date: "", to_date: "" });
              setSearch("");
              setVerificationStatus("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="px-2 py-2 text-[11px] font-medium text-gray-500 hover:text-red-500"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!exportRows.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!exportRows.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!exportRows.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Generating your report...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="inline-block rounded-lg bg-red-50 p-4 text-red-500">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 p-20 text-gray-400">
            <FileBox className="h-12 w-12" />
            <p>No records found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">S.No</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Customer ID</th>
                  {/* <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Enrollment No</th> */}
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Customer Name</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Mobile</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Branch</th>
                  {/* <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Agent ID</th> */}
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Verification</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Status</th>
                  {/* <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Created</th> */}
                  <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((item, idx) => (
                  <tr key={item.customer_unique_id || item.id || idx} className="transition-colors hover:bg-blue-50/30">
                    <td className="px-6 py-3 text-[13px] text-gray-500">{(page - 1) * perPage + idx + 1}</td>
                    <td className="px-6 py-3 text-[13px]">{item.customer_unique_id || "N/A"}</td>
                    {/* <td className="px-6 py-3 text-[13px]">{item.enrollment_number || "N/A"}</td> */}
                    <td className="px-6 py-3 text-[13px]">{`${item.first_name || ""} ${item.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]">{item.contact_number_1 || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]">{item.branch_id || "N/A"}</td>
                    {/* <td className="px-6 py-3 text-[13px]">{item.agent_unique_id || "N/A"}</td> */}
                    <td className="px-6 py-3 text-[13px]"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(item.verification_status)}`}>{item.verification_status || "N/A"}</span></td>
                    <td className="px-6 py-3 text-[13px]"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(item.status)}`}>{item.status || "N/A"}</span></td>
                    {/* <td className="px-6 py-3 text-[13px]">{formatDate(item.created_at)}</td> */}
                    <td className="px-6 py-3 text-right">
                      <button
                        // onClick={() => router.push(`/loan/reports/details?type=${pageMeta.detailType}&id=${item.customer_unique_id || item.id || idx}`)}
                        onClick={() =>
                            router.push(
                              `/loan/customers/customerDetails?id=${item.customer_unique_id}`
                            )
                          }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4 font-medium">
            <span className="text-sm text-gray-500">
              Showing total <span className="font-bold text-gray-900">{total}</span> records
            </span>
            <div className="flex items-center gap-3">
              <div className="min-w-[150px]">
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Per Page</label>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs"
                >
                  {[5, 10, 15, 30, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border border-gray-300 p-2 transition-colors hover:bg-white disabled:opacity-50"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center rounded border border-gray-300 bg-white px-4 text-sm text-gray-700">
                Page {page} of {lastPage}
              </div>
              <button
                disabled={page === lastPage}
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                className="rounded border border-gray-300 p-2 transition-colors hover:bg-white disabled:opacity-50"
                aria-label="Next Page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}