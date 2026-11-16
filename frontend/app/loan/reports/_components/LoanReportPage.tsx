"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { useReportFilterParams } from "./useReportFilterParams";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileBox,
  FileText,
  Search,
  Users,
  ClipboardCheck,
  BadgeCheck,
} from "lucide-react";

type ReportKind = "customer" | "caf" | "pd" | "cam" | "disbursement" | "loan";

type ReportSummary = Record<string, number | string | null | undefined>;

type ColumnDef = {
  label: string;
  align?: "left" | "center" | "right";
  render: (item: any) => React.ReactNode;
};

type ReportConfig = {
  title: string;
  description: string;
  endpoint: string;
  detailType: ReportKind;
  searchPlaceholder: string;
  statusLabel: string;
  statusOptions: Array<{ value: string; label: string }>;
  summaryOrder: string[];
  summaryLabels: Record<string, string>;
  columns: ColumnDef[];
  idForRow: (item: any) => string;
  customerName: (item: any) => string;
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

const formatMoney = (value: any) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "₹0";
  return `₹${numeric.toLocaleString("en-IN")}`;
};

const statusPillClass = (value?: string | null) => {
  const status = String(value || "").toLowerCase();
  if (["verified", "approved", "disbursed", "branch_manager"].includes(status)) {
    return "bg-green-100 text-green-700";
  }
  if (["rejected", "declined"].includes(status)) {
    return "bg-red-100 text-red-700";
  }
  if (["pending", "field_executive"].includes(status)) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-blue-100 text-blue-700";
};

const configMap: Record<ReportKind, ReportConfig> = {
  customer: {
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
    summaryOrder: ["total", "verified", "pending", "rejected"],
    summaryLabels: {
      total: "Total",
      verified: "Verified",
      pending: "Pending",
      rejected: "Rejected",
    },
    idForRow: (item) => String(item.customer_unique_id || item.id || ""),
    customerName: (item) => {
      return `${item.first_name || ""} ${item.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "Customer ID",
        render: (item) => item.customer_unique_id || "N/A",
      },
      {
        label: "Enrollment No",
        render: (item) => item.enrollment_number || "N/A",
      },
      {
        label: "Customer Name",
        render: (item) => `${item.first_name || ""} ${item.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A",
      },
      {
        label: "Mobile",
        render: (item) => item.contact_number_1 || "N/A",
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Agent ID",
        render: (item) => item.agent_unique_id || "N/A",
      },
      {
        label: "Verification",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.verification_status)}`}>
            {item.verification_status || "N/A"}
          </span>
        ),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.status)}`}>
            {item.status || "N/A"}
          </span>
        ),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
    ],
  },
  caf: {
    title: "CAF Report",
    description: "CAF applications and processing status.",
    endpoint: ProjectApiList.GET_REPORT_CAF,
    detailType: "caf",
    searchPlaceholder: "Search by CAF ID, Customer ID or name...",
    statusLabel: "Status",
    statusOptions: [
      { value: "", label: "All Statuses" },
      { value: "field_executive", label: "Field Executive" },
      { value: "branch_manager", label: "Branch Manager" },
      { value: "pending", label: "Pending" },
      { value: "verified", label: "Verified" },
      { value: "rejected", label: "Rejected" },
    ],
    summaryOrder: ["total", "verified", "pdCreated", "camCreated", "disbCreated"],
    summaryLabels: {
      total: "Total",
      verified: "Verified",
      pdCreated: "PD Created",
      camCreated: "CAM Created",
      disbCreated: "Disbursed",
    },
    idForRow: (item) => String(item.loan_application_id || item.id || ""),
    customerName: (item) => {
      const customer = item.customer || {};
      return `${customer.first_name || ""} ${customer.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "Loan App ID",
        render: (item) => item.loan_application_id || "N/A",
      },
      {
        label: "Customer",
        render: (item) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{`${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</p>
            <p className="text-xs text-gray-500">{item.customer_unique_id || "N/A"}</p>
          </div>
        ),
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Credit Mode",
        render: (item) => item.credit_mode || "N/A",
      },
      {
        label: "Credit Amount",
        align: "right",
        render: (item) => formatMoney(item.credit_applied_for),
      },
      {
        label: "Progress",
        render: (item) => (
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {item.is_verified ? "Verified" : "Pending"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_pd_created ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              PD
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_cam_created ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              CAM
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_disbursement_created ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              Disbursed
            </span>
          </div>
        ),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.status)}`}>
            {item.status || "N/A"}
          </span>
        ),
      },
    ],
  },
  pd: {
    title: "PD Report",
    description: "Personal discussion verification records and their current progress.",
    endpoint: ProjectApiList.GET_REPORT_PD,
    detailType: "pd",
    searchPlaceholder: "Search by PD ID, Loan App ID or name...",
    statusLabel: "Verification Status",
    statusOptions: [
      { value: "", label: "All Statuses" },
      { value: "verified", label: "Verified" },
      { value: "approved", label: "Approved" },
      { value: "pending", label: "Pending" },
      { value: "rejected", label: "Rejected" },
    ],
    summaryOrder: ["total", "verified", "rejected", "pending"],
    summaryLabels: {
      total: "Total",
      verified: "Verified",
      rejected: "Rejected",
      pending: "Pending",
    },
    idForRow: (item) => String(item.pd_application_id || item.id || ""),
    customerName: (item) => {
      const customer = item.customer || {};
      return `${customer.first_name || ""} ${customer.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "PD App ID",
        render: (item) => item.pd_application_id || "N/A",
      },
      {
        label: "Loan App ID",
        render: (item) => item.loan_application_id || "N/A",
      },
      {
        label: "Customer",
        render: (item) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{`${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</p>
            <p className="text-xs text-gray-500">{item.customer_unique_id || "N/A"}</p>
          </div>
        ),
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Verification",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.verification_status)}`}>
            {item.verification_status || "N/A"}
          </span>
        ),
      },
      {
        label: "Progress",
        render: (item) => (
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_cam_created ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              CAM
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.is_disbursement_created ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              Disbursed
            </span>
          </div>
        ),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.status)}`}>
            {item.status || "N/A"}
          </span>
        ),
      },
    ],
  },
  cam: {
    title: "CAM Report",
    description: "Credit assessment and CAM approval records.",
    endpoint: ProjectApiList.GET_REPORT_CAM,
    detailType: "cam",
    searchPlaceholder: "Search by CAM ID, Loan App ID or name...",
    statusLabel: "Credit Decision",
    statusOptions: [
      { value: "", label: "All Decisions" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "pending", label: "Pending" },
    ],
    summaryOrder: ["total", "approved", "rejected", "pending", "disbCreated"],
    summaryLabels: {
      total: "Total",
      approved: "Approved",
      rejected: "Rejected",
      pending: "Pending",
      disbCreated: "Disbursed",
    },
    idForRow: (item) => String(item.cam_unique_id || item.id || ""),
    customerName: (item) => {
      const customer = item.customer || {};
      return `${customer.first_name || ""} ${customer.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "CAM ID",
        render: (item) => item.cam_unique_id || "N/A",
      },
      {
        label: "Loan App ID",
        render: (item) => item.loan_application_id || "N/A",
      },
      {
        label: "Customer",
        render: (item) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{`${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</p>
            <p className="text-xs text-gray-500">{item.customer_unique_id || "N/A"}</p>
          </div>
        ),
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Credit Decision",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.credit_decision)}`}>
            {item.credit_decision || "N/A"}
          </span>
        ),
      },
      {
        label: "Verified",
        render: (item) => (item.is_verified ? "Yes" : "No"),
      },
      {
        label: "Disbursed",
        render: (item) => (item.is_disbursement_created ? "Yes" : "No"),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.status)}`}>
            {item.status || "N/A"}
          </span>
        ),
      },
    ],
  },
  disbursement: {
    title: "Disbursement Report",
    description: "Disbursement processing status and payment progress.",
    endpoint: ProjectApiList.GET_REPORT_DISBURSEMENT,
    detailType: "disbursement",
    searchPlaceholder: "Search by Disbursement ID, Loan App ID or name...",
    statusLabel: "Payment Status",
    statusOptions: [
      { value: "", label: "All Statuses" },
      { value: "pending", label: "Pending" },
      { value: "on_process", label: "On Process" },
      { value: "NEFT_done", label: "NEFT Done" },
      { value: "disbursed", label: "Disbursed" },
    ],
    summaryOrder: ["total", "disbursed", "pending", "loanStarted"],
    summaryLabels: {
      total: "Total",
      disbursed: "Disbursed",
      pending: "Pending",
      loanStarted: "Loan Started",
    },
    idForRow: (item) => String(item.disbursement_id || item.id || ""),
    customerName: (item) => {
      const customer = item.customer || {};
      return `${customer.first_name || ""} ${customer.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "Disbursement ID",
        render: (item) => item.disbursement_id || "N/A",
      },
      {
        label: "Loan App ID",
        render: (item) => item.loan_application_id || "N/A",
      },
      {
        label: "Customer",
        render: (item) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{`${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</p>
            <p className="text-xs text-gray-500">{item.customer_unique_id || "N/A"}</p>
          </div>
        ),
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Booking Date",
        render: (item) => formatDate(item.booking_date),
      },
      {
        label: "Payment Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.payment_status)}`}>
            {item.payment_status || "N/A"}
          </span>
        ),
      },
      {
        label: "Loan Started",
        render: (item) => (item.is_loan_started ? "Yes" : "No"),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.disbursement_status)}`}>
            {item.disbursement_status || "N/A"}
          </span>
        ),
      },
    ],
  },
  loan: {
    title: "Loan Report",
    description: "Started loans, loan balances, and repayment progress.",
    endpoint: ProjectApiList.GET_REPORT_LOANS,
    detailType: "loan",
    searchPlaceholder: "Search by Loan Number, Loan App ID or name...",
    statusLabel: "Frequency",
    statusOptions: [
      { value: "", label: "All Frequencies" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "biweekly", label: "Biweekly" },
    ],
    summaryOrder: ["total", "total_loan_amount", "total_disbursed", "weekly", "monthly", "biweekly"],
    summaryLabels: {
      total: "Total",
      total_loan_amount: "Loan Amount",
      total_disbursed: "Disbursed",
      weekly: "Weekly",
      monthly: "Monthly",
      biweekly: "Biweekly",
    },
    idForRow: (item) => String(item.loan_number || item.loan_application_id || item.id || ""),
    customerName: (item) => {
      const customer = item.customer || {};
      return `${customer.first_name || ""} ${customer.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A";
    },
    columns: [
      {
        label: "Loan Number",
        render: (item) => item.loan_number || "N/A",
      },
      {
        label: "Loan App ID",
        render: (item) => item.loan_application_id || "N/A",
      },
      {
        label: "Customer",
        render: (item) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{`${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A"}</p>
            <p className="text-xs text-gray-500">{item.customer_unique_id || "N/A"}</p>
          </div>
        ),
      },
      {
        label: "Branch",
        render: (item) => item.branch_id || "N/A",
      },
      {
        label: "Loan Amount",
        align: "right",
        render: (item) => formatMoney(item.loan_amount),
      },
      {
        label: "Disbursed",
        align: "right",
        render: (item) => formatMoney(item.disbursement_amount),
      },
      {
        label: "EMI",
        align: "right",
        render: (item) => formatMoney(item.emi_amount),
      },
      {
        label: "Frequency",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.frequency)}`}>
            {item.frequency || "N/A"}
          </span>
        ),
      },
      {
        label: "Created",
        render: (item) => formatDate(item.created_at),
      },
      {
        label: "Status",
        render: (item) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusPillClass(item.frequency)}`}>
            {item.frequency || "N/A"}
          </span>
        ),
      },
    ],
  },
};

export function ReportPageShell({ kind, showHeader = true }: { kind: ReportKind; showHeader?: boolean }) {
  const router = useRouter();
  const config = configMap[kind];
  const { reportFilterParams, ready } = useReportFilterParams();

  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterState, setFilterState] = useState({
    search: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");

  const fetchReport = useCallback(async () => {
    if (!ready || !reportFilterParams) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(config.endpoint, {
        params: {
          ...reportFilterParams,
          start_date: startDate,
          end_date: endDate,
          status,
          search,
          page,
          per_page: 15,
        },
      });

      if (response.data.success) {
        setData(response.data.data.data || []);
        setSummary(response.data.summary || {});
        setLastPage(response.data.data.last_page || 1);
        setTotal(response.data.data.total || 0);
      } else {
        throw new Error(response.data.message || "Failed to fetch report");
      }
    } catch (err: any) {
      console.error("Report Fetch Error:", err);
      const message = err.response?.data?.message || err.message || "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, endDate, page, search, startDate, status]);
  }, [config.endpoint, endDate, page, ready, reportFilterParams, search, startDate, status]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (ready && !reportFilterParams) {
      setLoading(false);
      setError("User details not found in localStorage.");
      toast.error("User details not found in localStorage.");
    }
  }, [ready, reportFilterParams]);

  const handleSearch = () => {
    setPage(1);
    setSearch(filterState.search);
    setStartDate(filterState.startDate);
    setEndDate(filterState.endDate);
    setStatus(filterState.status);
  };

  const summaryCards = useMemo(() => {
    return config.summaryOrder
      .filter((key) => summary[key] !== undefined && summary[key] !== null)
      .map((key) => ({
        key,
        label: config.summaryLabels[key] || key,
        value: summary[key],
      }));
  }, [config.summaryLabels, config.summaryOrder, summary]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/loan/reports")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Reports Home
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{config.title}</h1>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{String(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative md:col-span-2">
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={config.searchPlaceholder}
              value={filterState.search}
              onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Start Date</label>
          <input
            type="date"
            value={filterState.startDate}
            onChange={(e) => setFilterState((prev) => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">End Date</label>
          <input
            type="date"
            value={filterState.endDate}
            onChange={(e) => setFilterState((prev) => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">{config.statusLabel}</label>
          <select
            value={filterState.status}
            onChange={(e) => setFilterState((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
          >
            {config.statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 md:col-span-4 lg:col-span-2">
          <button
            onClick={handleSearch}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button
            onClick={() => {
              setFilterState({ search: "", startDate: "", endDate: "", status: "" });
              setSearch("");
              setStartDate("");
              setEndDate("");
              setStatus("");
              setPage(1);
            }}
            className="text-gray-500 text-[11px] font-medium hover:text-red-500 px-2 py-2"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 animate-pulse text-sm">Generating your report...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 bg-red-50 p-4 rounded-lg inline-block">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 space-y-2">
            <FileBox className="w-12 h-12" />
            <p>No records found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {config.columns.map((column) => (
                    <th
                      key={column.label}
                      className={`px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider ${
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((item, idx) => {
                  const rowId = config.idForRow(item) || String(item.id || idx);

                  return (
                    <tr key={rowId} className="hover:bg-blue-50/30 transition-colors group">
                      {config.columns.map((column) => (
                        <td
                          key={column.label}
                          className={`px-6 py-3 align-top text-[13px] ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                              ? "text-center"
                              : "text-left"
                          }`}
                        >
                          {column.render(item)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right align-top">
                        <button
                          onClick={() => router.push(`/loan/reports/details?type=${config.detailType}&id=${rowId}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between font-medium">
            <span className="text-sm text-gray-500">
              Showing total <span className="text-gray-900 font-bold">{total}</span> records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center px-4 bg-white border border-gray-300 rounded text-sm text-gray-700">
                Page {page} of {lastPage}
              </div>
              <button
                disabled={page === lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoanReportPage({ kind }: { kind: ReportKind }) {
  return <ReportPageShell kind={kind} />;
}