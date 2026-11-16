
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Eye, Trash, RotateCcw } from "lucide-react";
import DeleteCAFModal from "../caf/components/DeleteCAFModal";
import CancelDeletionRequestModal from "./components/CancelDeletionRequestModal";


type CAFListRow = {
    id: string;
    loan_application_id: string;
    applicantName: string;
    productName: string;
    frequency: string;
    credit_applied_for: string;
    status: string;
    createdAt: string;
};

type CustomerRow = {
    id: string;
    customer_id: string;
    fullName: string;
    contact: string;
    pincode: string;
    createdAt: string;
};

type Agent = {
    id: string;
    name: string;
    agent_unique_id?: string;
};

export default function DeletionRequestsPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<"caf" | "customer">("caf");
    const [rows, setRows] = useState<CAFListRow[]>([]);
    const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedCAF, setSelectedCAF] = useState<any>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const [openCancelModal, setOpenCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [customerToCancel, setCustomerToCancel] = useState<CustomerRow | null>(null);

    const [cafToCancel, setCafToCancel] = useState<CAFListRow | null>(null);

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const fetchAgents = async () => {
        try {
            const res = await axiosInstance.get(ProjectApiList.api_getAllAgents);
            if (res.data.success) {
                const agentList = Array.isArray(res.data.data) ? res.data.data : res.data.data?.data || [];
                setAgents(agentList);
            }
        } catch (error) {
            console.error("Fetch agents error:", error);
        }
    };

    const fetchCustomerDeletionRequests = async () => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) return;

            const params: any = {
                status: "branch_support_executive",
                search,
                page,
                per_page: 10,
                branch_id: user.branch,
                is_delete_requested: true,
            };

            if (user.role?.toLowerCase() === "field executive" && user.agent_unique_id) {
                params.agent_unique_id = user.agent_unique_id;
            } else if (selectedAgent) {
                params.agent_unique_id = selectedAgent;
            }

            const res = await axiosInstance.get(ProjectApiList.api_getAllLonaCustomers, {
                params,
            });

            if (res.data.success) {
                const responseData = res.data.data;
                const items = Array.isArray(responseData) ? responseData : responseData?.data || [];
                const pagination = res.data.pagination || responseData?.pagination;

                const formattedRows = items.map((item: any, index: number) => {
                    const fullName = `${item.first_name || ""} ${item.middle_name || ""} ${item.last_name || ""}`
                        .replace(/\s+/g, " ")
                        .trim();

                    return {
                        id: item.id?.toString() || "-",
                        customer_id: item.customer_unique_id || item.id || "-",
                        fullName: fullName || "-",
                        contact: item.contact_number_1 || item.phone || "-",
                        pincode: item.service_area_pin || "-",
                        createdAt: item.created_at || item.updated_at
                            ? new Date(item.created_at || item.updated_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })
                            : "-",
                    };
                });

                setCustomerRows(formattedRows);
                setLastPage(Number(pagination?.last_page || 1));
                setTotalRecords(Number(pagination?.total || formattedRows.length));
            }
        } catch (error) {
            console.error("Fetch customer deletion requests error:", error);
            toast.error("Failed to fetch customer deletion requests");
        } finally {
            setLoading(false);
        }
    };

    const fetchCAFRecords = async () => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) return;

            const params: any = {
                search,
                // status: "field_executive",
                page,
                per_page: 10,
                branch_id: user.branch,
                is_delete_requested: true,
            };

            if (user.role?.toLowerCase() === "field executive" && user.agent_unique_id) {
                params.agent_unique_id = user.agent_unique_id;
            }

            const res = await axiosInstance.get(ProjectApiList.api_getAllCAF, {
                params,
            });

            if (res.data.success) {
                const responseData = res.data.data;
                const items = Array.isArray(responseData) ? responseData : responseData?.data || [];
                const pagination = res.data.pagination || responseData?.pagination;

                const formattedRows = items.map((item: any) => {
                    const customer = item.customer;

                    const fullName = customer
                        ? `${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`
                            .replace(/\s+/g, " ")
                            .trim()
                        : "-";

                    return {
                        id: item.id?.toString() || "-",
                        loan_application_id: item.loan_application_id || "-",
                        applicantName: fullName || "-",
                        productName: item.product_name || item.credit_mode || "-",
                        frequency: item.frequency || "-",
                        credit_applied_for: item.credit_applied_for ? `Rs. ${item.credit_applied_for}` : "-",
                        status: item.status || "Pending Deletion",
                        createdAt: item.created_at
                            ? new Date(item.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })
                            : "-",
                    };
                });

                setRows(formattedRows);
                setLastPage(Number(pagination?.last_page || 1));
                setTotalRecords(Number(pagination?.total || formattedRows.length));
            }
        } catch (error) {
            console.error("Fetch CAF error:", error);
            toast.error("Failed to fetch deletion requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    useEffect(() => {
        if (activeTab === "caf") {
            fetchCAFRecords();
        } else {
            fetchCustomerDeletionRequests();
        }
    }, [search, page, activeTab, selectedAgent]);

    const handleDeleteClick = (caf: any) => {
        setSelectedCAF(caf);
        setOpenDeleteModal(true);
    };

    const handleDeleteCustomerClick = (customer: any) => {
        setSelectedCustomer(customer);
        setOpenDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (activeTab === "customer") {
            return confirmDeleteCustomer();
        }

        if (!selectedCAF) return;

        try {
            setDeleting(true);
            const res = await axiosInstance.post(
                `${ProjectApiList.api_deleteCAF}/${selectedCAF.loan_application_id}`
            );

            if (res.data.success) {
                toast.success(res.data.message || "CAF deleted successfully");
                setOpenDeleteModal(false);
                setSelectedCAF(null);
                fetchCAFRecords();
            } else {
                toast.error(res.data.message || "Failed to delete CAF");
            }
        } catch (error: any) {
            console.error("Delete CAF error:", error);
            toast.error(
                error.response?.data?.message || "An error occurred while deleting CAF"
            );
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteCustomer = async () => {
        if (!selectedCustomer) return;

        try {
            setDeleting(true);
            const res = await axiosInstance.post(
                `${ProjectApiList.api_deleteLoanCustomers}/${selectedCustomer.customer_id}`
            );

            if (res.data.success) {
                toast.success(res.data.message || "Customer deleted successfully");
                setOpenDeleteModal(false);
                setSelectedCustomer(null);
                fetchCustomerDeletionRequests();
            } else {
                toast.error(res.data.message || "Failed to delete customer");
            }
        } catch (error: any) {
            console.error("Delete customer error:", error);
            toast.error(
                error.response?.data?.message || "An error occurred while deleting customer"
            );
        } finally {
            setDeleting(false);
        }
    };


    const handleCancelDeletionRequest = async () => {
        if (!customerToCancel) return;

        try {
            setCancelLoading(true);

            const res = await axiosInstance.post(
                `${ProjectApiList.api_cancelCustomerDeletionRequest}/${customerToCancel.customer_id}`
            );

            if (res.data.success) {
                toast.success(
                    res.data.message || "Deletion request cancelled successfully."
                );

                setOpenCancelModal(false);
                setCustomerToCancel(null);

                fetchCustomerDeletionRequests();
            } else {
                toast.error(
                    res.data.message || "Failed to cancel deletion request."
                );
            }
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                "Something went wrong while cancelling the deletion request."
            );
        } finally {
            setCancelLoading(false);
        }
    };


    const handleCancelCAFDeletionRequest = async () => {
        if (!cafToCancel) return;

        try {
            setCancelLoading(true);

            const res = await axiosInstance.post(
                `${ProjectApiList.api_cancelCAFDeletionRequest}/${cafToCancel.loan_application_id}`
            );

            if (res.data.success) {
                toast.success(
                    res.data.message || "CAF deletion request cancelled successfully."
                );

                setOpenCancelModal(false);
                setCafToCancel(null);

                fetchCAFRecords();
            } else {
                toast.error(
                    res.data.message || "Failed to cancel CAF deletion request."
                );
            }
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                "Something went wrong while cancelling the CAF deletion request."
            );
        } finally {
            setCancelLoading(false);
        }
    };


    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Deletion Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and manage records flagged for deletion.</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => {
                        setActiveTab("caf");
                        setPage(1);
                    }}
                    className={`relative pr-5 py-2 text-sm font-medium transition-colors
          ${activeTab === "caf"
                            ? "text-red-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    CAF Deletion Request
                    {activeTab === "caf" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-red-600 rounded"></span>
                    )}
                </button>

                <button
                    onClick={() => {
                        setActiveTab("customer");
                        setPage(1);
                    }}
                    className={`relative px-5 py-2 text-sm font-medium transition-colors
          ${activeTab === "customer"
                            ? "text-red-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Customer Deletion Request
                    {activeTab === "customer" && (
                        <span className="absolute left-0 bottom-0 w-full h-[2px] bg-red-600 rounded"></span>
                    )}
                </button>
            </div>

            {/* TABLE CARD */}
            <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
                {/* SEARCH & FILTERS */}
                <div className="flex justify-between items-center gap-4">
                    <p className="text-sm text-gray-600 font-medium">
                        {loading ? "Loading records..." : `${activeTab === "caf" ? rows.length : customerRows.length} deletion requests found`}
                    </p>

                    <div className="flex gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'caf' ? 'CAF' : 'Customer'} by ID or Name...`}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-80 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pl-10"
                            />

                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAGINATION INFO */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        {totalRecords > 0
                            ? `Page ${page} of ${lastPage} · ${totalRecords} total records`
                            : "No pagination data available"}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={loading || page <= 1}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                            disabled={loading || page >= lastPage}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="min-w-full text-sm">
                        <thead className="bg-red-50/50">
                            <tr>
                                {activeTab === "caf" ? (
                                    <>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Application ID</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Applicant Name</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Scheme / Product</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Credit Applied For</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Current Status</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Date Applied</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">S.No</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Customer ID</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Full Name</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Contact</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Pincode</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Request Date</th>
                                        <th className="px-4 py-4 text-left font-bold text-gray-600 border-b">Actions</th>
                                    </>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-50">
                            {!loading && activeTab === "caf" &&
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-red-50/30 transition-colors group"
                                    >
                                        <td className="px-4 py-4 font-semibold text-red-600 font-mono">
                                            {row.loan_application_id}
                                        </td>

                                        <td className="px-4 py-4 font-medium text-gray-800">
                                            {row.applicantName}
                                        </td>

                                        <td className="px-4 py-4 text-gray-600">
                                            {row.productName}
                                        </td>

                                        <td className="px-4 py-4 font-semibold text-gray-700">
                                            {row.credit_applied_for}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700 border border-red-100">
                                                {row.status}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4 text-gray-500 text-xs">
                                            {row.createdAt}
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">

                                                <Link href={`/loan/caf/viewDetails?id=${row.loan_application_id}`}>
                                                    <button
                                                        className="flex h-10 min-w-[90px] items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </button>
                                                </Link>

                                                <button
                                                    onClick={() => {
                                                        setCafToCancel(row);
                                                        setOpenCancelModal(true);
                                                    }}
                                                    className="flex h-10 min-w-[120px] items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-600 shadow-sm transition-all hover:bg-amber-50 whitespace-nowrap"
                                                >
                                                    <RotateCcw size={14} />
                                                    Cancel Request
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteClick(row)}
                                                    className="flex h-10 min-w-[90px] items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50"
                                                >
                                                    <Trash size={14} />
                                                    Delete
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))}

                            {!loading && activeTab === "customer" &&
                                customerRows.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-red-50/30 transition-colors group"
                                    >
                                        <td className="px-4 py-4 font-semibold text-gray-600">
                                            {(page - 1) * 10 + index + 1}
                                        </td>

                                        <td className="px-4 py-4 font-semibold text-red-600 font-mono">
                                            {row.customer_id}
                                        </td>

                                        <td className="px-4 py-4 font-medium text-gray-800">
                                            {row.fullName}
                                        </td>

                                        <td className="px-4 py-4 text-gray-600">
                                            {row.contact}
                                        </td>

                                        <td className="px-4 py-4 text-gray-600">
                                            {row.pincode}
                                        </td>

                                        <td className="px-4 py-4 text-gray-500 text-xs">
                                            {row.createdAt}
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">

                                                <Link href={`/loan/customers/customerDetails?id=${row.customer_id}`}>
                                                    <button
                                                        className="flex h-10 min-w-[90px] items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </button>
                                                </Link>

                                                <button
                                                    onClick={() => {
                                                        setCustomerToCancel(row);
                                                        setOpenCancelModal(true);
                                                    }}
                                                    className="flex h-10 min-w-[120px] items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-600 shadow-sm transition-all hover:bg-amber-50 whitespace-nowrap"
                                                >
                                                    <RotateCcw size={14} />
                                                    Cancel Request
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteCustomerClick(row)}
                                                    className="flex h-10 min-w-[90px] items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50"
                                                >
                                                    <Trash size={14} />
                                                    Delete
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))}

                            {!loading && rows.length === 0 && activeTab === "caf" && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="text-sm font-medium">
                                                No CAF deletion requests found matching your criteria.
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && customerRows.length === 0 && activeTab === "customer" && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="text-sm font-medium">
                                                Customer deletion request listing is currently empty.
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-gray-500 text-sm font-medium">
                                                Syncing with server...
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {openDeleteModal && (
                <DeleteCAFModal
                    caf={activeTab === "customer" ? selectedCustomer : selectedCAF}
                    loading={deleting}
                    actionType="delete"
                    modalType={activeTab === "customer" ? "customer" : "caf"}
                    onClose={() => {
                        setOpenDeleteModal(false);
                        setSelectedCAF(null);
                        setSelectedCustomer(null);
                    }}
                    onConfirm={confirmDelete}
                />
            )}

            <CancelDeletionRequestModal
                open={openCancelModal}
                loading={cancelLoading}
                customerName={
                    activeTab === "caf"
                        ? cafToCancel?.applicantName
                        : customerToCancel?.fullName
                }
                onClose={() => {
                    setOpenCancelModal(false);
                    setCustomerToCancel(null);
                    setCafToCancel(null);
                }}
                onConfirm={
                    activeTab === "caf"
                        ? handleCancelCAFDeletionRequest
                        : handleCancelDeletionRequest
                }
            />
        </div>
    );
}
