"use client";

import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import ProjectApiList from "@/app/api/ProjectApiList";

type ApprovalStatus = "pending" | "approved" | "rejected";

type LoggedInUser = {
    branch?: string | number;
    cms_admin?: string | number;
};

type PaymentRecord = {
    id?: number | string;
    loan_id?: string | number;
    emi_schedule_id?: string | number;
    receipt_number?: string;
    payment_amount?: number | string;
    payment_date?: string;
    payment_method?: string;
    payment_status?: string;
    approval_status?: string;
    transaction_id?: string;
    payment_image?: string;
    is_pre_close?: number | boolean;
    user_id?: string | number;
    loan?: {
        customer?: {
            first_name?: string;
            middle_name?: string;
            last_name?: string;
            customer_unique_id?: string;
            email?: string;
        };
    };
};

const formatDate = (date?: string) =>
    date
        ? new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "—";

const renderPaymentDetails = (payment: PaymentRecord) => (
    <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="EMI ID" value={payment.emi_schedule_id ?? "—"} />
            <Info label="Loan ID" value={payment.loan_id ?? "—"} />
            <Info label="Customer ID" value={payment.loan?.customer?.customer_unique_id || "—"} />
            <Info
                label="Customer Name"
                value={
                    [
                        payment.loan?.customer?.first_name,
                        payment.loan?.customer?.middle_name,
                        payment.loan?.customer?.last_name,
                    ]
                        .filter(Boolean)
                        .join(" ") || "—"
                }
            />
            <Info label="Customer Email" value={payment.loan?.customer?.email || "—"} />
            <Info label="User ID" value={payment.user_id ?? "—"} />
            <Info
                label="Amount Paid"
                value={`₹${Number(payment.payment_amount ?? 0).toLocaleString("en-IN")}`}
                strong
            />
            <Info label="Payment Method" value={payment.payment_method || "—"} />
            <Info label="Transaction ID" value={payment.transaction_id || "—"} />
            <Info label="Payment Date" value={formatDate(payment.payment_date)} />
        </div>

        {payment.payment_image && (
            <div>
                <p className="text-xs text-gray-500 mb-2">Payment Proof</p>
                <img
                    alt="Payment proof"
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${payment.payment_image}`}
                    onClick={() =>
                        window.open(
                            `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${payment.payment_image}`,
                            "_blank"
                        )
                    }
                    className="w-full max-h-64 object-contain rounded-lg bg-gray-50 cursor-pointer"
                />
            </div>
        )}
    </div>
);

const Info = ({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string | number;
    strong?: boolean;
}) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`mt-1 ${strong ? "font-semibold" : ""}`}>{value}</p>
    </div>
);

export default function EmiPaymentsPage() {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);

    const [globalCounts, setGlobalCounts] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
    });

    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [preClosePayment, setPreClosePayment] = useState<PaymentRecord | null>(null);
    const [preCloseLoading, setPreCloseLoading] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1);
            setSearch(searchInput);
        }, 500);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const getLoggedInUser = useCallback((): LoggedInUser | null => {
        if (typeof window === "undefined") return null;
        const rawUser = localStorage.getItem("user");
        if (!rawUser) return null;

        try {
            return JSON.parse(rawUser) as LoggedInUser;
        } catch {
            return null;
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        const user = getLoggedInUser();

        if (!user) {
            setLoading(false);
            toast.error("Please sign in again");
            return;
        }

        try {
            setLoading(true);

            const res = await axiosInstance.get(ProjectApiList.api_getAllEmiPayment, {
                params: {
                    approval_status: approvalStatus,
                    search: search || undefined,
                    page,
                    per_page: perPage,
                    branch_id: user.branch,
                    cms_admin_id: user.cms_admin,
                },
            });

            const pg = res.data.data;
            const statusData = res.data.status_counts;

            setPayments(pg.data || []);
            setGlobalCounts({
                pending: statusData.approval_status?.pending || 0,
                approved: statusData.approval_status?.approved || 0,
                rejected: statusData.approval_status?.rejected || 0,
            });
            setTotal(pg.total);
            setPage(pg.current_page);
            setPerPage(pg.per_page);
            setLastPage(pg.last_page);
            setFrom(pg.from);
            setTo(pg.to);
        } catch {
            toast.error("Failed to load EMI payments");
        } finally {
            setLoading(false);
        }
    }, [approvalStatus, getLoggedInUser, page, perPage, search]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const paymentStatusBadge = (status?: string) => {
        switch (status) {
            case "success":
                return "bg-green-100 text-green-700";
            case "pending":
                return "bg-yellow-100 text-yellow-700";
            case "failed":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const statusTabs = [
        { label: "Pending", value: "pending", count: globalCounts.pending },
        { label: "Approved", value: "approved", count: globalCounts.approved },
        { label: "Rejected", value: "rejected", count: globalCounts.rejected },
    ];

    const preClosePayments = approvalStatus === "pending" ? payments.filter((p) => p.is_pre_close === 1) : [];
    const preCloseLoanIds = Array.from(new Set(preClosePayments.map((p) => p.loan_id).filter((id): id is string | number => Boolean(id))));

    const handleApprovePreClose = async () => {
        if (preClosePayment?.loan_id === undefined || preClosePayment?.loan_id === null) return;

        const toastId = toast.loading("Approving pre-close...");
        try {
            setPreCloseLoading(true);
            const res = await axiosInstance.post(`${ProjectApiList.api_approvePreClose}/${preClosePayment.loan_id}`);

            if (res.data.success) {
                toast.success("Pre-close approved successfully", { id: toastId });
                setPreClosePayment(null);
                fetchPayments();
            } else {
                toast.error(res.data.message || "Failed to approve", { id: toastId });
            }
        } catch (err: unknown) {
            const message =
                err &&
                typeof err === "object" &&
                "response" in err &&
                err.response &&
                typeof err.response === "object" &&
                "data" in err.response &&
                err.response.data &&
                typeof err.response.data === "object" &&
                "message" in err.response.data
                    ? String(err.response.data.message)
                    : "Failed to approve pre-close";

            toast.error(message, { id: toastId });
        } finally {
            setPreCloseLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedPayment) return;

        try {
            setActionLoading(true);
            await axiosInstance.post(`${ProjectApiList.api_approveEmiPayment}/${selectedPayment.id}`);
            toast.success("EMI approved successfully");
            setSelectedPayment(null);
            fetchPayments();
        } catch {
            toast.error("Failed to approve EMI");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPayment) return;

        try {
            setActionLoading(true);
            await axiosInstance.post(`${ProjectApiList.api_rejectEmiPayment}/${selectedPayment.id}`);
            toast.success("EMI rejected");
            setSelectedPayment(null);
            fetchPayments();
        } catch {
            toast.error("Failed to reject EMI");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">EMI Payments</h1>
                <p className="text-sm text-gray-500">Review and approve EMI payment transactions</p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {statusTabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            setPage(1);
                            setApprovalStatus(tab.value as ApprovalStatus);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                            approvalStatus === tab.value
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${approvalStatus === tab.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{total}</span> payments found
                    </p>

                    <div className="flex items-center gap-2">
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search EMI / Loan / Txn ID..."
                            className="w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {approvalStatus === "pending" && preCloseLoanIds.length > 0 && (
                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                        <p className="text-sm font-semibold text-orange-700">Pre-Close Approvals Pending</p>
                        <div className="flex flex-wrap gap-2">
                            {preCloseLoanIds.map((loanId) => (
                                <button
                                    key={String(loanId)}
                                    onClick={() => {
                                        const payment = payments.find((item) => item.loan_id === loanId && item.is_pre_close === 1);
                                        setPreClosePayment(payment || null);
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-600 text-white hover:bg-orange-700"
                                >
                                    Approve Pre-Close: {loanId}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-10">
                        <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!loading && payments.length > 0 && (
                    <>
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            "S.No",
                                            "EMI ID",
                                            "Loan ID",
                                            "Customer",
                                            "Amount",
                                            "Payment Date",
                                            "Method",
                                            "Payment Status",
                                            "Approval",
                                            "Action",
                                        ].map((head) => (
                                            <th key={head} className="px-4 py-3 text-left font-semibold text-gray-700">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {payments.map((p, index) => {
                                        const serialNo = (page - 1) * perPage + index + 1;

                                        return (
                                            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                <td className="px-4 py-3">{serialNo}</td>
                                                <td className="px-4 py-3 font-medium">{p.emi_schedule_id}</td>
                                                <td className="px-4 py-3 font-medium">{p.loan_id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">
                                                            {[
                                                                p.loan?.customer?.first_name,
                                                                p.loan?.customer?.middle_name,
                                                                p.loan?.customer?.last_name,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" ") || "—"}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {p.loan?.customer?.customer_unique_id || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">₹{Number(p.payment_amount ?? 0).toLocaleString("en-IN")}</td>
                                                <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                                                <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatusBadge(p.payment_status)}`}>
                                                        {p.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.approval_status === "approved" ? "bg-green-100 text-green-700" : p.approval_status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                        {p.approval_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setSelectedPayment(p)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                                                            View
                                                        </button>
                                                        {approvalStatus === "pending" && preCloseLoanIds.includes(p.loan_id as string | number) && (
                                                            <button onClick={() => setPreClosePayment(p)} className="whitespace-nowrap px-2 py-1 text-xs font-semibold rounded bg-orange-100 text-orange-700 hover:bg-orange-200">
                                                                Approve Pre-Close
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3">
                            <p className="text-sm text-gray-600">
                                Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b>
                            </p>

                            <div className="flex items-center gap-3">
                                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page <b>{page}</b> of <b>{lastPage}</b>
                                </span>
                                <button disabled={page === lastPage} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {!loading && payments.length === 0 && (
                    <div className="py-14 text-center text-sm text-gray-500">No {approvalStatus} EMI payments found</div>
                )}
            </div>

            {selectedPayment && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 flex justify-between items-start border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold">EMI Payment Details</h3>
                                <p className="text-xs text-gray-500">Receipt: {selectedPayment.receipt_number}</p>
                            </div>
                            <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-700 text-xl">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {renderPaymentDetails(selectedPayment)}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setSelectedPayment(null)} className="px-4 py-2 text-sm rounded-md bg-white hover:bg-gray-100">
                                Close
                            </button>

                            {selectedPayment.approval_status === "pending" && (
                                <>
                                    <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60">
                                        Reject
                                    </button>
                                    <button onClick={handleApprove} disabled={actionLoading} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60">
                                        Approve
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {preClosePayment && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 flex justify-between items-start border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold">Pre-Close EMI Details</h3>
                                <p className="text-xs text-gray-500">Loan: {preClosePayment.loan_id} • Receipt: {preClosePayment.receipt_number}</p>
                            </div>
                            <button onClick={() => setPreClosePayment(null)} className="text-gray-400 hover:text-gray-700 text-xl">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {renderPaymentDetails(preClosePayment)}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setPreClosePayment(null)} className="px-4 py-2 text-sm rounded-md bg-white hover:bg-gray-100">
                                Close
                            </button>
                            <button onClick={handleApprovePreClose} disabled={preCloseLoading} className={`px-4 py-2 text-sm rounded-md text-white ${preCloseLoading ? "bg-orange-300 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"}`}>
                                {preCloseLoading ? "Approving..." : "Approve Pre-Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
