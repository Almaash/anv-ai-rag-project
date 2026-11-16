"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileBox, Search, Download } from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useReportFilterParams } from "../_components/useReportFilterParams";

const pageMeta = {
    title: "EMI Collection Report",
    description: "Installment-wise collection schedule with agent and customer details.",
    endpoint: ProjectApiList.GET_REPORT_EMI_COLLECTION,
    searchPlaceholder: "Search by EMI ID, Loan ID or Customer Name...",
    statusLabel: "EMI Status",
    statusOptions: [
        { value: "", label: "All Status" },
        { value: "paid", label: "Paid" },
        { value: "pending_at_admin", label: "Pending at Admin" },
        { value: "pending", label: "Pending" },
    ],
} as const;

const formatDate = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const pillClass = (value?: string | null) => {
    const status = String(value || "").toLowerCase();
    if (status === "paid") return "bg-green-100 text-green-700";
    if (status === "partial") return "bg-blue-100 text-blue-700";
    if (status === "overdue") return "bg-red-100 text-red-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    if (status === "pending_at_admin") return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
};

const clampPerPage = (value: number) => {
    if (!Number.isFinite(value)) return 10;

    const allowed = [5, 10, 30, 50, 100];

    return allowed.includes(value) ? value : 10;
};

const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export default function EMICollectionReportPage() {
    const searchParams = useSearchParams();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [range, setRange] = useState({ from: 0, to: 0 });
    const initialPerPage = useMemo(() => {
        const perPageFromQuery = Number(searchParams.get("per_page") || 30);
        return clampPerPage(perPageFromQuery);
    }, [searchParams]);
    const [perPage, setPerPage] = useState(initialPerPage);

    const [summary, setSummary] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        partial: 0,
        total_amount: 0,
    });

    const [filterState, setFilterState] = useState({
        search: "",
        status: "",
        frequency: "",
        installment_no: "",
        customer_unique_id: "",
        agent_unique_id: "",
        from_date: "",
        to_date: "",
        due_start_date: "",
        due_end_date: "",
    });
    const [agents, setAgents] = useState<any[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"excel" | "csv" | "pdf" | null>(null);
    const [confirmMessage, setConfirmMessage] = useState("");
    const { reportFilterParams, ready } = useReportFilterParams();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [frequency, setFrequency] = useState("");
    const [installmentNo, setInstallmentNo] = useState("");
    const [customerUniqueId, setCustomerUniqueId] = useState("");
    const [agentUniqueId, setAgentUniqueId] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [dueStartDate, setDueStartDate] = useState("");
    const [dueEndDate, setDueEndDate] = useState("");

    useEffect(() => {
        setPerPage(initialPerPage);
        setPage(1);
    }, [initialPerPage]);

    const fetchReport = useCallback(async () => {
        if (!ready || !reportFilterParams) return;

        try {
            setLoading(true);
            setError(null);

            const response = await axiosInstance.get(pageMeta.endpoint, {
                params: {
                    ...reportFilterParams,
                    search,
                    status,
                    frequency,
                    installment_no: installmentNo,
                    customer_unique_id: customerUniqueId,
                    agent_unique_id: agentUniqueId,
                    from_date: fromDate,
                    to_date: toDate,
                    due_start_date: dueStartDate,
                    due_end_date: dueEndDate,
                    page,
                    per_page: perPage,
                },
            });

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to fetch EMI collection report");
            }

            const resData = response.data.data;
            const pagination = response.data.pagination;

            // handle both paginated { data, last_page, total } and flat array
            if (Array.isArray(resData)) {
                setData(resData);
                setLastPage(1);
                setTotal(resData.length);
                setRange({
                    from: resData.length > 0 ? (page - 1) * perPage + 1 : 0,
                    to: (page - 1) * perPage + resData.length,
                });
            } else if (pagination) {
                setData(resData?.data || []);
                setLastPage(pagination.last_page || 1);
                setTotal(pagination.total || 0);
                setRange({ from: pagination.from || 0, to: pagination.to || 0 });
            } else {
                setData(resData.data || []);
                setLastPage(resData.last_page || 1);
                setTotal(resData.total || 0);
                const count = Array.isArray(resData.data) ? resData.data.length : 0;
                setRange({
                    from: count > 0 ? (page - 1) * perPage + 1 : 0,
                    to: (page - 1) * perPage + count,
                });
            }

            setSummary(
                response.data.summary || {
                    total: 0,
                    paid: 0,
                    pending: 0,
                    overdue: 0,
                    partial: 0,
                    total_amount: 0,
                }
            );
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || "An unexpected error occurred";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, search, status, frequency, installmentNo, customerUniqueId, agentUniqueId, fromDate, toDate, dueStartDate, dueEndDate, ready, reportFilterParams]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // fetch agents for filter dropdown (same params pattern as /loan/agents page)
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoadingAgents(true);

                const user = getLoggedInUser();
                if (!user) {
                    setAgents([]);
                    return;
                }

                const res = await axiosInstance.get(ProjectApiList.api_getAllAgents, {
                    params: {
                        search: "",
                        status: "",
                        user_id: user.user_id,
                        branch_id: user.branch,
                        cms_admin_id: user.cms_admin,
                        per_page: 1000,
                        page: 1,
                    },
                });

                if (res.data?.success) {
                    const apiData = res.data.data;
                    if (Array.isArray(apiData)) {
                        setAgents(apiData);
                    } else {
                        setAgents(apiData.data || []);
                    }
                } else {
                    setAgents([]);
                }
            } catch (err) {
                console.error("Failed to fetch agents", err);
                setAgents([]);
            } finally {
                setLoadingAgents(false);
            }
        };

        if (!ready) return;
        fetchAgents();
    }, [ready]);

    const getVisibleRowsForExport = () => {
        if (!data.length) {
            throw new Error("No records available to export.");
        }
        return data;
    };

    const makeExportRows = (rows: any[]) =>
        rows.map((item: any, idx: number) => ({
            "S.No": idx + 1,
            "EMI ID": item.emi_id || "",
            "Loan ID": item.loan_id || "",
            "Inst#": item.installment_no ?? "",
            Customer: `${item.loan?.customer?.first_name || ""} ${item.loan?.customer?.last_name || ""}`.trim(),
            Contact: item.loan?.customer?.contact_number_1 || "",
            Agent: item.loan?.agent?.name || "",
            "Due Date": formatDate(item.installment_date),
            Frequency: item.frequency || "",
            "EMI Amt": item.installment_amount ?? "",
            Principal: item.principal_due ?? "",
            Interest: item.interest_due ?? "",
            Outstanding: item.outstanding_balance ?? "",
            "Loan Start": formatDate(item.loan?.loan_start_date),
            Status: item.status || "",
        }));

    const exportExcel = async () => {
        try {
            setExporting(true);
            const rows = getVisibleRowsForExport();
            const exportRows = makeExportRows(rows);

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "EMIs");
            const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

            const blob = new Blob([wbout], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `emi_collection_${new Date().toISOString().slice(0,10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toast.error(err.message || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    const exportCSV = async () => {
        try {
            setExporting(true);
            const rows = getVisibleRowsForExport();
            const exportRows = makeExportRows(rows);

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `emi_collection_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toast.error(err.message || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    const exportPDF = async () => {
        try {
            setExporting(true);
            const rows = getVisibleRowsForExport();
            const exportRows = makeExportRows(rows);

            const doc = new jsPDF({ orientation: "landscape" });
            doc.setFontSize(14);
            doc.text("EMI Collection Report", 14, 15);
            doc.setFontSize(9);
            doc.text(`Exported: ${new Date().toLocaleString("en-IN")}`, 14, 22);

            const head = [Object.keys(exportRows[0] || {})];
            const body = exportRows.map((r) => Object.values(r));

            autoTable(doc, {
                startY: 27,
                head,
                body,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [59, 130, 246] },
            });

            doc.save(`emi_collection_${new Date().toISOString().slice(0,10)}.pdf`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "PDF export failed");
        } finally {
            setExporting(false);
        }
    };

    const rows = useMemo(() => data, [data]);

    return (
        <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
                <h1 className="mt-1 text-lg font-bold text-gray-900">{pageMeta.title}</h1>
                <p className="mt-1 text-sm text-gray-500">{pageMeta.description}</p>
            </div>

            {/* Summary Cards */}
            {/* <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                <SummaryCard title="Total EMI" value={summary.total} />
                <SummaryCard title="Paid" value={summary.paid} />
                <SummaryCard title="Pending" value={summary.pending} />
                <SummaryCard title="Overdue" value={summary.overdue} />
                <SummaryCard title="Partial" value={summary.partial} />
                <SummaryCard title="Total Amount" value={`₹${Number(summary.total_amount).toLocaleString("en-IN")}`} />
            </div> */}

            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
                {/* Search */}
                <div className="md:col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={filterState.search}
                            onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
                            placeholder={pageMeta.searchPlaceholder}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs"
                        />
                    </div>
                </div>

                {/* EMI Status */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">EMI Status</label>
                    <select
                        value={filterState.status}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    >
                        {pageMeta.statusOptions.map((option) => (
                            <option key={option.value || "all"} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                {/* Frequency */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Frequency</label>
                    <select
                        value={filterState.frequency}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, frequency: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    >
                        <option value="">All Frequencies</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                {/* Customer Unique ID */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Customer ID</label>
                    <input
                        value={filterState.customer_unique_id}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, customer_unique_id: e.target.value }))}
                        placeholder="e.g. CUS-001"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    />
                </div>

                {/* Agent Unique ID */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Agent ID</label>
                    <select
                        value={filterState.agent_unique_id}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, agent_unique_id: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    >
                        <option value="">All Agents</option>
                        {loadingAgents ? (
                            <option>Loading agents...</option>
                        ) : (
                            agents.map((a) => (
                                <option key={a.agent_unique_id || a.id} value={a.agent_unique_id || a.agent_unique_id}>
                                    {`${a.name || a.agent_name || "Unnamed"} (${a.agent_unique_id || a.agent_unique_id || a.id})`}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                {/* From Date (created_at) */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">From Date</label>
                    <input
                        type="date"
                        value={filterState.from_date}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, from_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    />
                </div>

                {/* To Date (created_at) */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">To Date</label>
                    <input
                        type="date"
                        value={filterState.to_date}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, to_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    />
                </div>

                {/* Due Start Date */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Due From</label>
                    <input
                        type="date"
                        value={filterState.due_start_date}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, due_start_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    />
                </div>

                {/* Due End Date */}
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">Due To</label>
                    <input
                        type="date"
                        value={filterState.due_end_date}
                        onChange={(e) => setFilterState((prev) => ({ ...prev, due_end_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                    />
                </div>

                {/* Buttons */}
                <div className="flex items-end gap-2 md:col-span-4">
                    <button
                        onClick={() => {
                            setPage(1);
                            setSearch(filterState.search);
                            setStatus(filterState.status);
                            setFrequency(filterState.frequency);
                            setInstallmentNo(filterState.installment_no);
                            setCustomerUniqueId(filterState.customer_unique_id);
                            setAgentUniqueId(filterState.agent_unique_id);
                            setFromDate(filterState.from_date);
                            setToDate(filterState.to_date);
                            setDueStartDate(filterState.due_start_date);
                            setDueEndDate(filterState.due_end_date);
                        }}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        Search
                    </button>
                    <button
                        onClick={() => {
                            const empty = { search: "", status: "", frequency: "", installment_no: "", customer_unique_id: "", agent_unique_id: "", from_date: "", to_date: "", due_start_date: "", due_end_date: "" };
                            setFilterState(empty);
                            setSearch(""); setStatus(""); setFrequency(""); setInstallmentNo("");
                            setCustomerUniqueId(""); setAgentUniqueId("");
                            setFromDate(""); setToDate(""); setDueStartDate(""); setDueEndDate("");
                            setPage(1);
                        }}
                        className="px-2 py-2 text-[11px] font-medium text-gray-500 hover:text-red-500"
                    >
                        Clear
                    </button>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => {
                                setConfirmAction("excel");
                                setConfirmMessage("Export all filtered records to Excel?");
                                setConfirmOpen(true);
                            }}
                            disabled={exporting}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                        >
                            <Download className="h-4 w-4" /> Excel
                        </button>

                        <button
                            onClick={() => {
                                setConfirmAction("csv");
                                setConfirmMessage("Export all filtered records to CSV?");
                                setConfirmOpen(true);
                            }}
                            disabled={exporting}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
                        >
                            <Download className="h-4 w-4" /> CSV
                        </button>

                        <button
                            onClick={() => {
                                setConfirmAction("pdf");
                                setConfirmMessage("Export all filtered records to PDF?");
                                setConfirmOpen(true);
                            }}
                            disabled={exporting}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                        >
                            <Download className="h-4 w-4" /> PDF
                        </button>
                    </div>
                </div>

                {/** Confirm dialog for exports */}
                <ConfirmDialog
                    isOpen={confirmOpen}
                    title={confirmAction === "pdf" ? "Export PDF" : confirmAction === "csv" ? "Export CSV" : "Export Excel"}
                    message={confirmMessage}
                    confirmText="Proceed"
                    cancelText="Cancel"
                    onCancel={() => {
                        setConfirmOpen(false);
                        setConfirmAction(null);
                    }}
                    onConfirm={async () => {
                        setConfirmOpen(false);
                        const action = confirmAction;
                        setConfirmAction(null);
                        try {
                            if (action === "excel") await exportExcel();
                            else if (action === "csv") await exportCSV();
                            else if (action === "pdf") await exportPDF();
                        } catch (err) {
                            // errors handled in export functions
                        }
                    }}
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 p-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
                        <p className="text-sm text-gray-500">Generating EMI collection report...</p>
                    </div>
                ) : error ? (
                    <div className="p-20 text-center">
                        <p className="inline-block rounded-lg bg-red-50 p-4 text-red-500">{error}</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-2 p-20 text-gray-400">
                        <FileBox className="h-12 w-12" />
                        <p>No EMI collection records found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-[2000px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        {[
                                            "S.No",
                                            "EMI ID",
                                            "Loan ID",
                                            "Inst#",
                                            "Customer",
                                            "Contact",
                                            "Agent",
                                            "Due Date",
                                            "Frequency",
                                            "EMI Amt",
                                            "Principal",
                                            "Interest",
                                            "Outstanding",
                                            "Loan Start",
                                            "Status",
                                        ].map((col) => (
                                            <th key={col} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map((item, idx) => (
                                        <tr key={item.emi_id || idx} className="hover:bg-blue-50/30">
                                            <td className="px-4 py-3 text-xs text-gray-500">{(page - 1) * perPage + idx + 1}</td>
                                            <td className="px-4 py-3 text-xs font-medium">{item.emi_id || "N/A"}</td>
                                            <td className="px-4 py-3 text-xs">{item.loan_id || "N/A"}</td>
                                            <td className="px-4 py-3 text-xs">{item.installment_no ?? "N/A"}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {`${item.loan?.customer?.first_name || ""} ${item.loan?.customer?.last_name || ""}`.trim() || "N/A"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">{item.loan?.customer?.customer_unique_id || "N/A"}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{item.loan?.customer?.contact_number_1 || "N/A"}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.loan?.agent?.name || "N/A"}</p>
                                                    <p className="text-[10px] text-gray-500">{item.loan?.agent?.phone_no || ""}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{formatDate(item.installment_date)}</td>
                                            <td className="px-4 py-3 text-xs capitalize">{item.frequency || "N/A"}</td>
                                            <td className="px-4 py-3 text-xs">₹{item.installment_amount}</td>
                                            <td className="px-4 py-3 text-xs">₹{item.principal_due}</td>
                                            <td className="px-4 py-3 text-xs">₹{item.interest_due}</td>
                                            <td className="px-4 py-3 text-xs">₹{item.outstanding_balance}</td>
                                            <td className="px-4 py-3 text-xs">{formatDate(item.loan?.loan_start_date)}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(item.status)}`}>
                                                    {item.status || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-sm text-gray-500">
                                    Showing <span className="font-bold text-gray-900">{range.from}</span> to <span className="font-bold text-gray-900">{range.to}</span> of <span className="font-bold text-gray-900">{total}</span>
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Rows per page</span>
                                    <select
                                        value={perPage}
                                        onChange={(e) => {
                                            setPerPage(clampPerPage(Number(e.target.value)));
                                            setPage(1);
                                        }}
                                        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={30}>30</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            {/* <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((c) => Math.max(1, c - 1))}
                                    className="rounded border border-gray-300 p-2 hover:bg-white disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="flex items-center rounded border border-gray-300 bg-white px-4 text-sm">
                                    Page {page} of {lastPage}
                                </div>
                                <button
                                    disabled={page === lastPage}
                                    onClick={() => setPage((c) => Math.min(lastPage, c + 1))}
                                    className="rounded border border-gray-300 p-2 hover:bg-white disabled:opacity-50"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div> */}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">{title}</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{value}</h3>
        </div>
    );
}
