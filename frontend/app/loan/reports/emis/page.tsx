"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileBox,
    Search,
} from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { X } from "lucide-react";
import { useReportFilterParams } from "../_components/useReportFilterParams";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "../_components/reportExport";

const pageMeta = {
    title: "EMI Report",
    description:
        "Track installment schedules, payment status and outstanding balances.",
    endpoint: ProjectApiList.GET_REPORT_EMI,
    detailType: "emi",
    searchPlaceholder:
        "Search by EMI ID, Loan App ID or Customer Name...",
    statusLabel: "EMI Status",
    statusOptions: [
        {
            value: "",
            label: "All Status",
        },
        {
            value: "paid",
            label: "Paid",
        },
        {
            value: "pending_at_admin",
            label: "Pending at Admin",
        },
        {
            value: "pending",
            label: "Pending",
        },
    ],
} as const;

const formatDate = (value?: string | null) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const pillClass = (value?: string | null) => {
    const status = String(value || "").toLowerCase();

    if (status === "paid") {
        return "bg-green-100 text-green-700";
    }

    if (status === "partial") {
        return "bg-blue-100 text-blue-700";
    }

    if (status === "overdue") {
        return "bg-red-100 text-red-700";
    }

    if (status === "pending") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-gray-100 text-gray-700";
};

export default function EMIReportPage() {
    const router = useRouter();
    const { reportFilterParams, ready } = useReportFilterParams();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(5);

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
        due_start_date: "",
        due_end_date: "",
    });

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [frequency, setFrequency] = useState("");
    const [dueStartDate, setDueStartDate] = useState("");
    const [dueEndDate, setDueEndDate] = useState("");

    const [openViewModal, setOpenViewModal] = useState(false);
    const [viewPayments, setViewPayments] = useState<any[]>([]);
    const [loadingView, setLoadingView] = useState(false);

    const openViewPayments = async (emiId: string) => {
        try {
            setOpenViewModal(true);
            setLoadingView(true);
            const res = await axiosInstance.get(`${ProjectApiList.api_getEmiPaymentById}/${emiId}`);
            const data = res?.data?.data;
            if (Array.isArray(data)) {
                setViewPayments(data);
            } else if (data) {
                setViewPayments([data]);
            } else {
                setViewPayments([]);
            }
        } catch (error) {
            toast.error("Failed to load payment details");
        } finally {
            setLoadingView(false);
        }
    };

    const fetchReport = useCallback(async () => {
        if (!ready || !reportFilterParams) return;

        try {
            setLoading(true);
            setError(null);

            const response = await axiosInstance.get(
                pageMeta.endpoint,
                {
                    params: {
                        ...reportFilterParams,
                        search,
                        status,
                        frequency,
                        due_start_date: dueStartDate,
                        due_end_date: dueEndDate,
                        page,
                        per_page: perPage,
                    },
                }
            );

            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                    "Failed to fetch EMI report"
                );
            }

            setData(response.data.data.data || []);

            setLastPage(
                response.data.data.last_page || 1
            );

            setTotal(
                response.data.data.total || 0
            );

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
            const message =
                err.response?.data?.message ||
                err.message ||
                "An unexpected error occurred";

            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [
        page,
        perPage,
        search,
        status,
        frequency,
        dueStartDate,
        dueEndDate,
        ready,
        reportFilterParams,
    ]);


    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const rows = useMemo(() => data, [data]);
    const exportRows = useMemo(
        () =>
            rows.map((item, idx) => ({
                "S.No": (page - 1) * perPage + idx + 1,
                "EMI ID": item.emi_id || "N/A",
                "Loan App ID": item.loan?.loan_application_id || "N/A",
                Customer: `${item.loan?.customer?.first_name || ""} ${item.loan?.customer?.last_name || ""}`.replace(/\s+/g, " ").trim() || "N/A",
                "Due Date": formatDate(item.installment_date),
                Frequency: item.frequency || "N/A",
                "EMI Amt": item.installment_amount || "N/A",
                Principal: item.principal_due || "N/A",
                Interest: item.interest_due || "N/A",
                Outstanding: item.outstanding_balance || "N/A",
                Status: item.status || "N/A",
            })),
        [page, perPage, rows]
    );

    const handleExportExcel = () => {
        if (!exportRows.length) return;
        exportRowsToExcel(exportRows, `emi_report_${new Date().toISOString().slice(0, 10)}.xlsx`, "EMIs");
    };

    const handleExportCSV = () => {
        if (!exportRows.length) return;
        exportRowsToCsv(exportRows, `emi_report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleExportPDF = () => {
        if (!exportRows.length) return;
        exportRowsToPdf(exportRows, `emi_report_${new Date().toISOString().slice(0, 10)}.pdf`, pageMeta.title);
    };

    return (
        <>
            <div className="mx-auto max-w-[1600px] overflow-x-hidden space-y-4 p-4 md:p-6">

                {/* Header */}
                <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Report Section
                    </p>

                    <h1 className="mt-1 text-lg font-bold text-gray-900">
                        {pageMeta.title}
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        {pageMeta.description}
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                    <SummaryCard
                        title="Total EMI"
                        value={summary.total}
                    />

                    <SummaryCard
                        title="Paid"
                        value={summary.paid}
                    />

                    <SummaryCard
                        title="Pending"
                        value={summary.pending}
                    />

                    <SummaryCard
                        title="Overdue"
                        value={summary.overdue}
                    />

                    <SummaryCard
                        title="Partial"
                        value={summary.partial}
                    />

                    <SummaryCard
                        title="Total Amount"
                        value={`₹${summary.total_amount}`}
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-6">

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                            Search
                        </label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                            <input
                                value={filterState.search}
                                onChange={(e) =>
                                    setFilterState((prev) => ({
                                        ...prev,
                                        search: e.target.value,
                                    }))
                                }
                                placeholder={pageMeta.searchPlaceholder}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                            Frequency
                        </label>

                        <select
                            value={filterState.frequency}
                            onChange={(e) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    frequency: e.target.value,
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                        >
                            <option value="">All Frequency</option>
                            {/* <option value="daily">Daily</option> */}
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>


                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                            Due From
                        </label>

                        <input
                            type="date"
                            value={filterState.due_start_date}
                            onChange={(e) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    due_start_date: e.target.value,
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                            Due To
                        </label>

                        <input
                            type="date"
                            value={filterState.due_end_date}
                            onChange={(e) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    due_end_date: e.target.value,
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                            {pageMeta.statusLabel}
                        </label>

                        <select
                            value={filterState.status}
                            onChange={(e) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                        >
                            {pageMeta.statusOptions.map(
                                (option) => (
                                    <option
                                        key={
                                            option.value ||
                                            "all"
                                        }
                                        value={
                                            option.value
                                        }
                                    >
                                        {option.label}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-end gap-2 md:col-span-6">
                        <button
                            onClick={() => {
                                setPage(1);
                                setSearch(filterState.search);
                                setStatus(filterState.status);
                                setFrequency(filterState.frequency);
                                setDueStartDate(filterState.due_start_date);
                                setDueEndDate(filterState.due_end_date);
                            }}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                        >
                            Search
                        </button>

                        <button
                            onClick={() => {
                                setFilterState({
                                    search: "",
                                    status: "",
                                    frequency: "",
                                    due_start_date: "",
                                    due_end_date: "",
                                });

                                setSearch("");
                                setStatus("");
                                setFrequency("");
                                setDueStartDate("");
                                setDueEndDate("");
                                setPage(1);
                            }}
                            className="px-2 py-2 text-[11px] font-medium text-gray-500 hover:text-red-500"
                        >
                            Clear
                        </button>
                        <button type="button" onClick={handleExportExcel} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Excel</button>
                        <button type="button" onClick={handleExportCSV} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />CSV</button>
                        <button type="button" onClick={handleExportPDF} disabled={!exportRows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />PDF</button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                    {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4 p-20">
                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
                            <p className="text-sm text-gray-500">
                                Generating EMI report...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-20 text-center">
                            <p className="inline-block rounded-lg bg-red-50 p-4 text-red-500">
                                {error}
                            </p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2 p-20 text-gray-400">
                            <FileBox className="h-12 w-12" />
                            <p>
                                No EMI records found.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                S.No
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                EMI ID
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Loan App ID
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Customer
                                            </th>

                                            {/* <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                            Inst#
                                        </th> */}

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Due Date
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Frequency
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                EMI Amt
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Principal
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Interest
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Outstanding
                                            </th>

                                            <th className="px-4 py-3 text-[11px] font-bold uppercase">
                                                Status
                                            </th>

                                            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-50">
                                        {rows.map(
                                            (
                                                item,
                                                idx
                                            ) => (
                                                <tr
                                                    key={
                                                        item.emi_id ||
                                                        idx
                                                    }
                                                    className="hover:bg-blue-50/30"
                                                >
                                                    <td className="px-4 py-3 text-xs text-gray-500">{(page - 1) * perPage + idx + 1}</td>

                                                    <td className="px-4 py-3 text-xs">
                                                        {
                                                            item.emi_id
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        {
                                                            item
                                                                .loan
                                                                ?.loan_application_id
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        <div>
                                                            <p className="font-medium">
                                                                {`${item.loan?.customer?.first_name || ""
                                                                    } ${item.loan?.customer?.last_name || ""
                                                                    }`}
                                                            </p>

                                                            <p className="text-[10px] text-gray-500">
                                                                {
                                                                    item
                                                                        .loan
                                                                        ?.customer
                                                                        ?.customer_unique_id
                                                                }
                                                            </p>
                                                        </div>
                                                    </td>

                                                    {/* <td className="px-4 py-3 text-xs">
                                                    {
                                                        item.installment_no
                                                    }
                                                </td> */}

                                                    <td className="px-4 py-3 text-xs">
                                                        {formatDate(
                                                            item.installment_date
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-xs capitalize">
                                                        {
                                                            item.frequency
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        ₹
                                                        {
                                                            item.installment_amount
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        ₹
                                                        {
                                                            item.principal_due
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        ₹
                                                        {
                                                            item.interest_due
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        ₹
                                                        {
                                                            item.outstanding_balance
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(
                                                                item.status
                                                            )}`}
                                                        >
                                                            {
                                                                item.status
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        {item.status === "paid" && (
                                                            <button
                                                                onClick={() => openViewPayments(item.emi_id)}
                                                                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                                <span className="text-sm text-gray-500">
                                    Showing total{" "}
                                    <span className="font-bold text-gray-900">
                                        {total}
                                    </span>{" "}
                                    records
                                </span>

                                <div className="flex items-center gap-3">
                                    <div className="min-w-[150px]">
                                        <label className="mb-1 block text-[11px] font-semibold text-gray-500">Per Page</label>
                                        <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs">
                                            {[5, 10, 15, 30, 50, 100].map((option) => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                        disabled={
                                            page === 1
                                        }
                                        onClick={() =>
                                            setPage(
                                                (
                                                    current
                                                ) =>
                                                    Math.max(
                                                        1,
                                                        current -
                                                        1
                                                    )
                                            )
                                        }
                                        className="rounded border border-gray-300 p-2 hover:bg-white disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>

                                    <div className="flex items-center rounded border border-gray-300 bg-white px-4 text-sm">
                                        Page {page} of{" "}
                                        {lastPage}
                                    </div>

                                    <button
                                        disabled={
                                            page ===
                                            lastPage
                                        }
                                        onClick={() =>
                                            setPage(
                                                (
                                                    current
                                                ) =>
                                                    Math.min(
                                                        lastPage,
                                                        current +
                                                        1
                                                    )
                                            )
                                        }
                                        className="rounded border border-gray-300 p-2 hover:bg-white disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* View Payment Modal */}
            {openViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Payment Details</h2>
                            <button
                                onClick={() => { setOpenViewModal(false); setViewPayments([]); }}
                                className="text-gray-400 hover:text-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {loadingView ? (
                            <p className="text-sm text-gray-500">Loading payment details...</p>
                        ) : viewPayments.length === 0 ? (
                            <p className="text-sm text-gray-500">No payment found.</p>
                        ) : (
                            <div className="space-y-4">
                                {viewPayments.map((payment: any) => (
                                    <div key={payment.id} className="border rounded-md p-4 text-sm space-y-2">
                                        <p><span className="font-medium">Receipt:</span> {payment.receipt_number}</p>
                                        <p><span className="font-medium">Amount:</span> ₹{payment.payment_amount}</p>
                                        <p><span className="font-medium">Method:</span> {payment.payment_method}</p>
                                        <p><span className="font-medium">Transaction ID:</span> {payment.transaction_id || "—"}</p>
                                        <p><span className="font-medium">Date:</span> {new Date(payment.payment_date).toLocaleDateString("en-GB")}</p>
                                        <p>
                                            <span className="font-medium">Status:</span>{" "}
                                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                                                {payment.payment_status}
                                            </span>
                                        </p>
                                        {payment.payment_image && (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${payment.payment_image}`}
                                                alt="payment proof"
                                                className="w-28 h-20 object-cover rounded-md mt-2 border"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                                    </div>
                                </div>
            )}
        </>
    );
}

function SummaryCard({
    title,
    value,
}: {
    title: string;
    value: string | number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">
                {title}
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
                {value}
            </h3>
        </div>
    );
}