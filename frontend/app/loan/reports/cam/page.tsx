"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

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

import { useReportFilterParams } from "../_components/useReportFilterParams";

import {
    exportRowsToCsv,
    exportRowsToExcel,
    exportRowsToPdf,
} from "../_components/reportExport";


const pageMeta = {
    title: "CAM Report",

    description:
        "Credit assessment and CAM approval records.",

    endpoint: ProjectApiList.GET_REPORT_CAM,

    detailType: "cam",

    searchPlaceholder:
        "Search by CAM ID, Loan App ID or name...",

    statusLabel: "Credit Decision",

    statusOptions: [
        {
            value: "",
            label: "All Decisions",
        },
        {
            value: "approved",
            label: "Approved",
        },
        {
            value: "rejected",
            label: "Rejected",
        },
        {
            value: "pending",
            label: "Pending",
        },
    ],
} as const;


/* =========================================================
   DATE FORMATTER
========================================================= */

const formatDate = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

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


/* =========================================================
   STATUS PILL CLASS
========================================================= */

const pillClass = (value?: string | null) => {
    const status = String(value || "").toLowerCase();

    if (status === "approved") {
        return "bg-green-100 text-green-700";
    }

    if (status === "rejected") {
        return "bg-red-100 text-red-700";
    }

    if (status === "pending") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-blue-100 text-blue-700";
};


/* =========================================================
   CAM REPORT PAGE
========================================================= */

export default function CAMReportPage() {
    const router = useRouter();

    const {
        reportFilterParams,
        ready,
    } = useReportFilterParams();


    /* =====================================================
       STATES
    ===================================================== */

    const [data, setData] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [page, setPage] = useState(1);

    const [lastPage, setLastPage] = useState(1);

    const [total, setTotal] = useState(0);

    const [perPage, setPerPage] = useState(5);


    const [filterState, setFilterState] = useState({
        search: "",
        status: "",
    });


    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("");


    /* =====================================================
       FETCH REPORT
    ===================================================== */

    const fetchReport = useCallback(async () => {
        if (!ready || !reportFilterParams) {
            return;
        }

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

                        page,

                        per_page: perPage,
                    },
                }
            );


            if (!response.data.success) {
                throw new Error(
                    response.data.message ||
                        "Failed to fetch report"
                );
            }


            setData(
                response.data.data.data || []
            );


            setLastPage(
                response.data.data.last_page || 1
            );


            setTotal(
                response.data.data.total || 0
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
        ready,
        reportFilterParams,
    ]);


    /* =====================================================
       FETCH EFFECT
    ===================================================== */

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);


    /* =====================================================
       ROW DATA
    ===================================================== */

    const rows = useMemo(() => {
        return data;
    }, [data]);


    /* =====================================================
       EXPORT ROWS
    ===================================================== */

    const exportRows = useMemo(
        () =>
            rows.map((item, idx) => ({
                "S.No":
                    (page - 1) * perPage +
                    idx +
                    1,

                "CAM ID":
                    item.cam_unique_id || "N/A",

                "Loan App ID":
                    item.loan_application_id ||
                    "N/A",

                Customer:
                    `${item.customer?.first_name || ""} ${
                        item.customer?.last_name || ""
                    }`
                        .replace(/\s+/g, " ")
                        .trim() || "N/A",

                Branch:
                    item.branch_id || "N/A",

                "Credit Decision":
                    item.credit_decision || "N/A",

                Verified:
                    item.is_verified
                        ? "Yes"
                        : "No",

                Disbursed:
                    item.is_disbursement_created
                        ? "Yes"
                        : "No",

                Created:
                    formatDate(item.created_at),

                Status:
                    item.status || "N/A",
            })),

        [rows, page, perPage]
    );


    /* =====================================================
       EXPORT HANDLERS
    ===================================================== */

    const handleExportExcel = () => {
        if (!exportRows.length) {
            return;
        }

        exportRowsToExcel(
            exportRows,
            `cam_report_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`,
            pageMeta.title
        );
    };


    const handleExportCSV = () => {
        if (!exportRows.length) {
            return;
        }

        exportRowsToCsv(
            exportRows,
            `cam_report_${new Date()
                .toISOString()
                .slice(0, 10)}.csv`
        );
    };


    const handleExportPDF = () => {
        if (!exportRows.length) {
            return;
        }

        exportRowsToPdf(
            exportRows,
            `cam_report_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`,
            pageMeta.title
        );
    };


    /* =====================================================
       SEARCH HANDLER
    ===================================================== */

    const handleSearch = () => {
        setPage(1);

        setSearch(filterState.search);

        setStatus(filterState.status);
    };


    /* =====================================================
       CLEAR HANDLER
    ===================================================== */

    const handleClear = () => {
        setFilterState({
            search: "",
            status: "",
        });

        setSearch("");

        setStatus("");

        setPage(1);
    };


    /* =====================================================
       UI
    ===================================================== */

    return (
        <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">

            {/* ================= HEADER ================= */}

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


            {/* ================= FILTERS ================= */}

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">

                {/* SEARCH */}

                <div className="md:col-span-2">

                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                        Search
                    </label>


                    <div className="relative">

                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />


                        <input
                            value={filterState.search}

                            onChange={(e) =>
                                setFilterState(
                                    (prev) => ({
                                        ...prev,

                                        search:
                                            e.target.value,
                                    })
                                )
                            }

                            placeholder={
                                pageMeta.searchPlaceholder
                            }

                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />

                    </div>

                </div>


                {/* STATUS FILTER */}

                <div>

                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                        {pageMeta.statusLabel}
                    </label>


                    <select
                        value={filterState.status}

                        onChange={(e) =>
                            setFilterState(
                                (prev) => ({
                                    ...prev,

                                    status:
                                        e.target.value,
                                })
                            )
                        }

                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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


                {/* BUTTONS */}

                <div className="flex flex-wrap items-end gap-2 md:col-span-3">

                    <button
                        type="button"

                        onClick={handleSearch}

                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                        Search
                    </button>


                    <button
                        type="button"

                        onClick={handleClear}

                        className="px-2 py-2 text-[11px] font-medium text-gray-500 transition hover:text-red-500"
                    >
                        Clear
                    </button>


                    <button
                        type="button"

                        onClick={
                            handleExportExcel
                        }

                        disabled={
                            !exportRows.length
                        }

                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />

                        Excel
                    </button>


                    <button
                        type="button"

                        onClick={
                            handleExportCSV
                        }

                        disabled={
                            !exportRows.length
                        }

                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />

                        CSV
                    </button>


                    <button
                        type="button"

                        onClick={
                            handleExportPDF
                        }

                        disabled={
                            !exportRows.length
                        }

                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />

                        PDF
                    </button>

                </div>

            </div>


            {/* ================= TABLE CONTAINER ================= */}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                {loading ? (

                    /* LOADING */

                    <div className="flex flex-col items-center justify-center space-y-4 p-20">

                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />


                        <p className="text-sm text-gray-500">
                            Generating your report...
                        </p>

                    </div>

                ) : error ? (

                    /* ERROR */

                    <div className="p-20 text-center">

                        <p className="inline-block rounded-lg bg-red-50 p-4 text-red-500">
                            {error}
                        </p>

                    </div>

                ) : rows.length === 0 ? (

                    /* EMPTY STATE */

                    <div className="flex flex-col items-center justify-center space-y-2 p-20 text-gray-400">

                        <FileBox className="h-12 w-12" />


                        <p>
                            No records found for the selected filters.
                        </p>

                    </div>

                ) : (

                    <>

                        {/* ================= TABLE ================= */}

                        <div className="overflow-x-auto">

                            <table className="w-full border-collapse text-left">

                                <thead>

                                    <tr className="border-b border-gray-100 bg-gray-50">

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            S.No
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            CAM ID
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Loan App ID
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Customer
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Branch
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Credit Decision
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Verified
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Disbursed
                                        </th>


                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Status
                                        </th>


                                        <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>


                                <tbody className="divide-y divide-gray-50">

                                    {rows.map(
                                        (item, idx) => (

                                            <tr
                                                key={
                                                    item.cam_unique_id ||
                                                    item.id ||
                                                    idx
                                                }

                                                className="transition-colors hover:bg-blue-50/30"
                                            >

                                                {/* SERIAL NUMBER */}

                                                <td className="px-6 py-3 text-[13px] text-gray-500">
                                                    {(page - 1) *
                                                        perPage +
                                                        idx +
                                                        1}
                                                </td>


                                                {/* CAM ID */}

                                                <td className="px-6 py-3 text-[13px]">
                                                    {item.cam_unique_id ||
                                                        "N/A"}
                                                </td>


                                                {/* LOAN APPLICATION ID */}

                                                <td className="px-6 py-3 text-[13px]">
                                                    {item.loan_application_id ||
                                                        "N/A"}
                                                </td>


                                                {/* CUSTOMER */}

                                                <td className="px-6 py-3 text-[13px]">

                                                    <div className="space-y-0.5">

                                                        <p className="font-medium text-gray-900">

                                                            {`${item.customer?.first_name || ""} ${
                                                                item.customer?.last_name || ""
                                                            }`
                                                                .replace(
                                                                    /\s+/g,
                                                                    " "
                                                                )
                                                                .trim() ||
                                                                "N/A"}

                                                        </p>


                                                        <p className="text-xs text-gray-500">
                                                            {item.customer_unique_id ||
                                                                "N/A"}
                                                        </p>

                                                    </div>

                                                </td>


                                                {/* BRANCH */}

                                                <td className="px-6 py-3 text-[13px]">
                                                    {item.branch_id ||
                                                        "N/A"}
                                                </td>


                                                {/* CREDIT DECISION */}

                                                <td className="px-6 py-3 text-[13px]">

                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(
                                                            item.credit_decision
                                                        )}`}
                                                    >
                                                        {item.credit_decision ||
                                                            "N/A"}
                                                    </span>

                                                </td>


                                                {/* VERIFIED */}

                                                <td className="px-6 py-3 text-[13px]">

                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                                            item.is_verified
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}
                                                    >
                                                        {item.is_verified
                                                            ? "Yes"
                                                            : "No"}
                                                    </span>

                                                </td>


                                                {/* DISBURSED */}

                                                <td className="px-6 py-3 text-[13px]">

                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                                            item.is_disbursement_created
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}
                                                    >
                                                        {item.is_disbursement_created
                                                            ? "Yes"
                                                            : "No"}
                                                    </span>

                                                </td>


                                                {/* STATUS */}

                                                <td className="px-6 py-3 text-[13px]">

                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${pillClass(
                                                            item.status
                                                        )}`}
                                                    >
                                                        {item.status ||
                                                            "N/A"}
                                                    </span>

                                                </td>


                                                {/* ACTION */}

                                                <td className="px-6 py-3 text-right">

                                                    <button
                                                        type="button"

                                                        onClick={() =>
                                                            router.push(
                                                                `/loan/cam/viewCAM?type=${pageMeta.detailType}&id=${
                                                                    item.cam_unique_id ||
                                                                    item.id ||
                                                                    idx
                                                                }`
                                                            )
                                                        }

                                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50"
                                                    >
                                                        <Eye className="h-4 w-4" />

                                                        View
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>


                        {/* ================= PAGINATION ================= */}

                        <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50 px-6 py-4 md:flex-row md:items-end md:justify-between">

                            {/* TOTAL RECORDS */}

                            <span className="text-sm text-gray-500">

                                Showing total{" "}

                                <span className="font-bold text-gray-900">
                                    {total}
                                </span>{" "}

                                records

                            </span>


                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">

                                {/* PER PAGE */}

                                <div className="min-w-[150px]">

                                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                                        Per Page
                                    </label>


                                    <select
                                        value={perPage}

                                        onChange={(e) => {
                                            setPerPage(
                                                Number(
                                                    e.target.value
                                                )
                                            );

                                            setPage(1);
                                        }}

                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    >

                                        {[
                                            5,
                                            10,
                                            15,
                                            30,
                                            50,
                                            100,
                                        ].map(
                                            (option) => (

                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* PAGE CONTROLS */}

                                <div className="flex gap-2">

                                    <button
                                        type="button"

                                        disabled={
                                            page === 1
                                        }

                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.max(
                                                        1,
                                                        current - 1
                                                    )
                                            )
                                        }

                                        className="rounded-lg border border-gray-300 bg-white p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>


                                    <div className="flex min-w-[110px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700">
                                        Page {page} of {lastPage}
                                    </div>


                                    <button
                                        type="button"

                                        disabled={
                                            page === lastPage
                                        }

                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.min(
                                                        lastPage,
                                                        current + 1
                                                    )
                                            )
                                        }

                                        className="rounded-lg border border-gray-300 bg-white p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
    );
}