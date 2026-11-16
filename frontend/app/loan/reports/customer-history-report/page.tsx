"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, DollarSign, Eye, FileBox, FileText, Search, TrendingUp, User } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "../_components/reportExport";

const pageMeta = {
  title: "Customer History Report",
  description: "Customer records and verification status.",
  endpoint: ProjectApiList.GET_REPORT_CUSTOMER,
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
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

export default function CustomerHistoryReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCustomerId = searchParams.get("id");

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
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

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
    if (selectedCustomerId) {
      const fetchDetail = async () => {
        try {
          setDetailLoading(true);
          setError(null);
          const response = await axiosInstance.get(`/get-customer-history/${selectedCustomerId}`);

          if (response.data.success) {
            setDetailData(response.data.data);
          } else {
            throw new Error(response.data.message || "Failed to fetch customer history");
          }
        } catch (err: any) {
          const message = err.response?.data?.message || err.message || "Failed to fetch customer history";
          setError(message);
          toast.error(message);
        } finally {
          setDetailLoading(false);
        }
      };

      fetchDetail();
      return;
    }

    fetchReport();
  }, [fetchReport, selectedCustomerId]);

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
    exportRowsToExcel(exportRows, `customer_history_report_${new Date().toISOString().slice(0, 10)}.xlsx`, "Customers");
  };

  const handleExportCSV = () => {
    if (!exportRows.length) return;
    exportRowsToCsv(exportRows, `customer_history_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAllData = async () => {
    if (!reportFilterParams) {
      toast.error("User session not available for export.");
      return;
    }

    try {
      setExportingAll(true);

      const response = await axiosInstance.get(ProjectApiList.EXPORT_ALL_CUSTOMER_HISTORY, {
      // const response = await axiosInstance.get("/export-caf-csv", {
        params: {
          ...reportFilterParams,
          search,
          verification_status: verificationStatus,
          from_date: fromDate,
          to_date: toDate,
        },
        responseType: "blob",
        headers: {
          Accept: "text/csv",
        },
      });

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customer_history_all_data_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("All customer history data exported successfully");
    } catch (error: any) {
      console.error("Export all data error:", error);

      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          toast.error(errorData?.message || "Failed to export all data");
        } catch {
          toast.error("Failed to export all data");
        }
      } else {
        toast.error(error.response?.data?.message || "Failed to export all data");
      }
    } finally {
      setExportingAll(false);
    }
  };

  const handleExportPDF = () => {
    if (!exportRows.length) return;
    exportRowsToPdf(exportRows, `customer_history_report_${new Date().toISOString().slice(0, 10)}.pdf`, pageMeta.title);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/loan/reports/customer-history-report/customer-details?id=${customerId}`);
  };

  if (selectedCustomerId) {
    if (detailLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-gray-600 mt-4">Loading customer history...</p>
          </div>
        </div>
      );
    }

    if (!detailData) {
      return (
        <div className="p-6">
          <button onClick={() => router.push("/loan/reports/customer-history-report")} className="flex items-center gap-2 mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="text-center py-12 text-gray-500">No customer data found</div>
        </div>
      );
    }

    const customer = detailData.customer || {};
    const enrollments = detailData.enrollments || [];
    const verificationHistory = detailData.verification_history || [];
    const cafs = detailData.cafs || [];
    const summary = detailData.summary || {};

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/loan/reports/customer-history-report")} className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customer History Report</h1>
              <p className="text-sm text-gray-500 mt-1">Customer ID: <span className="font-mono font-semibold">{selectedCustomerId}</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3"><FileText size={20} className="text-blue-600" /><div><p className="text-xs text-gray-500 uppercase">Enrollments</p><p className="text-2xl font-bold text-gray-800">{summary.total_enrollments || 0}</p></div></div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3"><FileText size={20} className="text-amber-600" /><div><p className="text-xs text-gray-500 uppercase">CAFs</p><p className="text-2xl font-bold text-gray-800">{summary.total_cafs || 0}</p></div></div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3"><DollarSign size={20} className="text-green-600" /><div><p className="text-xs text-gray-500 uppercase">Loans</p><p className="text-2xl font-bold text-gray-800">{summary.total_loans || 0}</p></div></div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3"><TrendingUp size={20} className="text-purple-600" /><div><p className="text-xs text-gray-500 uppercase">EMI Schedules</p><p className="text-2xl font-bold text-gray-800">{summary.total_emi_schedules || 0}</p></div></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={20} /> Customer Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div><p className="text-xs text-gray-500 uppercase mb-1">Customer ID</p><p className="font-mono font-semibold text-blue-600">{customer.customer_unique_id}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Full Name</p><p className="font-semibold text-gray-800">{`${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`.trim()}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Email</p><p className="text-gray-700">{customer.email || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Contact 1</p><p className="font-semibold text-gray-800">{customer.contact_number_1 || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Contact 2</p><p className="text-gray-700">{customer.contact_number_2 || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Date of Birth</p><p className="text-gray-700">{formatDate(customer.date_of_birth)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Gender</p><p className="text-gray-700 capitalize">{customer.gender || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Occupation</p><p className="text-gray-700">{customer.occupation || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Aadhaar</p><p className="font-mono text-gray-700">{customer.adhaar_number || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">PAN</p><p className="font-mono text-gray-700">{customer.pan_number || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Service Area Pin</p><p className="text-gray-700">{customer.service_area_pin || "-"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase mb-1">Status</p><span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${pillClass(customer.status)}`}>{customer.status}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Enrollments ({enrollments.length})</h2>
          <div className="space-y-4">
            {enrollments.map((enrollment: any) => (
              <div key={enrollment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{enrollment.enrollment_number}</p>
                    <p className="text-xs text-gray-500">Enrolled: {formatDate(enrollment.enrollment_date)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${pillClass(enrollment.status)}`}>{enrollment.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div><p className="text-xs text-gray-500">Verification Status</p><p className="font-semibold text-gray-700">{enrollment.verification_status}</p></div>
                  <div><p className="text-xs text-gray-500">Verified By</p><p className="font-semibold text-gray-700">{enrollment.verified_by || "-"}</p></div>
                  <div><p className="text-xs text-gray-500">Verified At</p><p className="font-semibold text-gray-700">{formatDate(enrollment.verified_at)}</p></div>
                </div>
                {enrollment.status_history && enrollment.status_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Status History:</p>
                    <div className="space-y-2">
                      {enrollment.status_history.map((history: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 flex gap-2">
                          <span className="font-semibold min-w-fit">{history.timestamp}:</span>
                          <span>{history.status} - {history.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Verification History ({verificationHistory.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Enrollment #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Verified By</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {verificationHistory.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{record.enrollment_number}</td>
                    <td className="px-4 py-3">{record.action}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${pillClass(record.status)}`}>{record.status}</span></td>
                    <td className="px-4 py-3 text-gray-600">{record.reason}</td>
                    <td className="px-4 py-3">{record.admin_name || record.admin_id || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(record.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Credit Applications ({cafs.length})</h2>
          <div className="space-y-6">
            {cafs.map((caf: any) => (
              <div key={caf.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-4 pb-4 border-b">
                  <div>
                    <p className="font-bold text-gray-800">{caf.loan_application_id}</p>
                    <p className="text-sm text-gray-600">Enrollment: {caf.enrollment_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${pillClass(caf.status)}`}>{caf.status}</span>
                    {caf.is_verified && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Verified</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Credit Applied</p><p className="font-semibold text-gray-800">Rs. {caf.credit_applied_for}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Frequency</p><p className="font-semibold text-gray-800 capitalize">{caf.frequency}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Tenure</p><p className="font-semibold text-gray-800">{caf.tenure_option}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Credit Mode</p><p className="font-semibold text-gray-800 capitalize">{caf.credit_mode}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Net Surplus</p><p className="font-semibold text-gray-800">Rs. {caf.net_surplus}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Total Income (Yearly)</p><p className="font-semibold text-gray-800">Rs. {caf.total_income_yearly}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Total Expenses (Yearly)</p><p className="font-semibold text-gray-800">Rs. {caf.total_yearly_expenses}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Created</p><p className="font-semibold text-gray-800">{formatDate(caf.created_at)}</p></div>
                </div>

                {caf.status_history && caf.status_history.length > 0 && (
                  <div className="mb-4 pb-4 border-t">
                    <p className="text-xs font-semibold text-gray-600 mb-2">CAF Status History:</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      {caf.status_history.map((history: any, idx: number) => (
                        <div key={idx}>{history.timestamp}: {history.status} - {history.reason}</div>
                      ))}
                    </div>
                  </div>
                )}

                {caf.loans && caf.loans.length > 0 && (
                  <div className="mb-4 pb-4 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Active Loans ({caf.loans.length})</p>
                    {caf.loans.map((loan: any) => (
                      <div key={loan.id} className="bg-white rounded p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-800">{loan.loan_number}</p>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">{loan.emi_schedules?.length || 0} EMIs</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-gray-500">Loan Amount</p><p className="font-semibold">Rs. {loan.loan_amount}</p></div>
                          <div><p className="text-gray-500">EMI Amount</p><p className="font-semibold">Rs. {loan.emi_amount}</p></div>
                          <div><p className="text-gray-500">Interest Rate</p><p className="font-semibold">{loan.interest_rate}%</p></div>
                          <div><p className="text-gray-500">Start Date</p><p className="font-semibold">{formatDate(loan.loan_start_date)}</p></div>
                          <div><p className="text-gray-500">Tenure</p><p className="font-semibold">{loan.tenure_months} Months</p></div>
                          <div><p className="text-gray-500">Disbursement</p><p className="font-semibold">Rs. {loan.disbursement_amount}</p></div>
                        </div>

                        {loan.emi_schedules && loan.emi_schedules.length > 0 && (
                          <details className="mt-3 border-t pt-3">
                            <summary className="text-xs font-semibold text-gray-700 cursor-pointer">View {loan.emi_schedules.length} EMI Schedules</summary>
                            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                              {loan.emi_schedules.map((emi: any) => (
                                <div key={emi.id} className="text-xs border-l-2 border-blue-200 pl-2 py-1">
                                  <div className="flex justify-between"><span className="font-semibold">EMI #{emi.installment_no}</span><span className={`px-2 py-0.5 rounded text-xs font-semibold ${emi.status === 'paid' ? 'bg-green-50 text-green-700' : emi.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'}`}>{emi.status}</span></div>
                                  <div className="flex justify-between mt-1"><span>{formatDate(emi.installment_date)}</span><span>Rs. {emi.installment_amount}</span></div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
            <h1 className="mt-1 text-lg font-bold text-gray-900">{pageMeta.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{pageMeta.description}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowExportConfirm(true)}
            disabled={exportingAll}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportingAll ? "Exporting..." : "Export All Data"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showExportConfirm}
        title="Export All Data"
        message="Export all matching customer history data to CSV?"
        confirmText="Export"
        cancelText="Cancel"
        onCancel={() => setShowExportConfirm(false)}
        onConfirm={async () => {
          setShowExportConfirm(false);
          await handleExportAllData();
        }}
      />

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder={pageMeta.searchPlaceholder} value={filterState.search} onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">{pageMeta.statusLabel}</label>
          <select value={filterState.verification_status} onChange={(e) => setFilterState((prev) => ({ ...prev, verification_status: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none">
            {pageMeta.statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">From Date</label>
          <input type="date" value={filterState.from_date} onChange={(e) => setFilterState((prev) => ({ ...prev, from_date: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none" />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">To Date</label>
          <input type="date" value={filterState.to_date} onChange={(e) => setFilterState((prev) => ({ ...prev, to_date: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none" />
        </div>

        <div className="flex flex-wrap items-end gap-2 md:col-span-4">
          <button onClick={() => { setPage(1); setSearch(filterState.search); setVerificationStatus(filterState.verification_status); setFromDate(filterState.from_date); setToDate(filterState.to_date); }} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700">Search</button>
          <button onClick={() => { setFilterState({ search: "", verification_status: "", from_date: "", to_date: "" }); setSearch(""); setVerificationStatus(""); setFromDate(""); setToDate(""); setPage(1); }} className="px-2 py-2 text-[11px] font-medium text-gray-500 hover:text-red-500">Clear</button>
          <button type="button" onClick={handleExportExcel} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Excel</button>
          <button type="button" onClick={handleExportCSV} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={handleExportPDF} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />PDF</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Generating your report...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center"><p className="inline-block rounded-lg bg-red-50 p-4 text-red-500">{error}</p></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 p-20 text-gray-400"><FileBox className="h-12 w-12" /><p>No records found for the selected filters.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">S.No</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Customer ID</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Customer Name</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Mobile</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Branch</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Verification</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((item, idx) => (
                  <tr key={item.customer_unique_id || item.id || idx} className="transition-colors hover:bg-blue-50/30">
                    <td className="px-6 py-3 text-[13px] text-gray-500">{(page - 1) * perPage + idx + 1}</td>
                    <td className="px-6 py-3 text-[13px]">{item.customer_unique_id || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]">{`${item.first_name || ""} ${item.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]">{item.contact_number_1 || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]">{item.branch_id || "N/A"}</td>
                    <td className="px-6 py-3 text-[13px]"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(item.verification_status)}`}>{item.verification_status || "N/A"}</span></td>
                    <td className="px-6 py-3 text-[13px]"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(item.status)}`}>{item.status || "N/A"}</span></td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleViewCustomer(item.customer_unique_id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50">
                        <Eye className="h-4 w-4" />View
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
            <span className="text-sm text-gray-500">Showing total <span className="font-bold text-gray-900">{total}</span> records</span>
            <div className="flex items-center gap-3">
              <div className="min-w-[150px]">
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Per Page</label>
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs">
                  {[5, 10, 15, 30, 50, 100].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 p-2 transition-colors hover:bg-white disabled:opacity-50" aria-label="Previous Page">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center rounded border border-gray-300 bg-white px-4 text-sm text-gray-700">Page {page} of {lastPage}</div>
              <button disabled={page === lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))} className="rounded border border-gray-300 p-2 transition-colors hover:bg-white disabled:opacity-50" aria-label="Next Page">
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