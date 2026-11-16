"use client";

import { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import { Loader2, FileText, Plus, Search, Eye } from "lucide-react";
import Link from "next/link";

export default function PaymentInventoryListingPage() {
  const [tab, setTab] = useState<"PendingInventory" | "FinalInventory">("PendingInventory");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDisbursementId, setPendingDisbursementId] = useState<string>("");
  const imageBaseUrl = ProjectApiList.api_imageBaseUrl;

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchData = useCallback(async () => {
  try {
    setLoading(true);

    const user = getLoggedInUser();

    const cmsAdminId =
      user?.role?.toLowerCase() === "cms_admin"
        ? user?.user_id
        : user?.cms_admin;

    const commonParams = {
      search,
      branch_id: user?.branch,
      cms_admin_id: cmsAdminId,
    };

    let res;

    if (tab === "PendingInventory") {
      res = await axiosInstance.get(
        ProjectApiList.GET_FINAL_DISBURSEMENTS,
        {
          params: commonParams,
        }
      );
    } else {
      res = await axiosInstance.get(
        ProjectApiList.GET_ALL_RAW_DISBURSEMENTS,
        {
          params: commonParams,
        }
      );
    }

    if (res.data.success) {
      const resultData = res.data.data.data || res.data.data;
      setData(Array.isArray(resultData) ? resultData : []);
    }
  } catch (error) {
    console.error(`Error fetching ${tab} records:`, error);
    toast.error(`Failed to fetch ${tab} records`);
  } finally {
    setLoading(false);
  }
}, [tab, search]);

  const handleBackToFinalDisbursement = async (disbursementId: string) => {
    if (!disbursementId) return;

    try {
      setClearingId(disbursementId);

      const res = await axiosInstance.post(
        `${ProjectApiList.api_clearDisbursementDocuments}/${disbursementId}`
      );

      if (res.data?.success || res.data?.status) {
        toast.success("Disbursement documents cleared successfully");
        fetchData();
      } else {
        toast.error(res.data?.message || "Failed to clear disbursement documents");
      }
    } catch (error) {
      console.error("Error clearing disbursement documents:", error);
      toast.error("Failed to clear disbursement documents");
    } finally {
      setClearingId(null);
    }
  };

  const openDocument = async (documentPath: string) => {
    if (!documentPath) return;

    try {
      const res = await axiosInstance.get(`${imageBaseUrl}/${documentPath}`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");

      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  };

  const openBackToFinalConfirm = (disbursementId: string) => {
    if (!disbursementId) return;
    setPendingDisbursementId(disbursementId);
    setConfirmOpen(true);
  };

  const confirmBackToFinal = async () => {
    const disbursementId = pendingDisbursementId;
    setConfirmOpen(false);
    setPendingDisbursementId("");

    if (!disbursementId) return;

    await handleBackToFinalDisbursement(disbursementId);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Inventory Management</h1>
          <p className="text-sm text-gray-500">Manage NEFT/RTGS and delivery status for disbursements</p>
        </div>
        <Link
          href="/loan/disbursement/payment-inventory/create"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Payment Inventory
        </Link>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => { setTab("PendingInventory"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "PendingInventory" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Final Disbursements
          {tab === "PendingInventory" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => { setTab("FinalInventory"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "FinalInventory" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Raw Disbursements
          {tab === "FinalInventory" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 shadow-sm border-x border-b border-gray-100 rounded-b-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={tab === "PendingInventory" ? "Search Final Disbursements..." : "Search Raw Disbursements..."}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-gray-700">Disbursement ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Loan App ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Customer Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center uppercase tracking-wider">DFA</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center uppercase tracking-wider">CFA</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center uppercase tracking-wider">DPN</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-gray-500 font-medium">Loading {tab} data...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <p className="text-gray-500 font-medium">No {tab} records found</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 border-none">{item.disbursement_id}</td>
                    <td className="px-6 py-4 text-gray-600 border-none">{item.loan_application_id}</td>
                    <td className="px-6 py-4 text-gray-600 border-none">
                      {item.customer ? `${item.customer.first_name || ""} ${item.customer.last_name || ""}`.trim() || item.member_name : item.member_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center border-none">
                      {item.dfa_document ? (
                        <button
                          type="button"
                          onClick={() => openDocument(item.dfa_document)}
                          className="inline-flex items-center"
                          aria-label="Open DFA document"
                        >
                          <FileText className="h-4 w-4 text-blue-600 inline cursor-pointer hover:text-blue-800" />
                        </button>
                      ) : (
                        <FileText className="h-4 w-4 text-gray-300 inline cursor-not-allowed" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center border-none">
                      {item.cfa_document ? (
                        <button
                          type="button"
                          onClick={() => openDocument(item.cfa_document)}
                          className="inline-flex items-center"
                          aria-label="Open CFA document"
                        >
                          <FileText className="h-4 w-4 text-blue-600 inline cursor-pointer hover:text-blue-800" />
                        </button>
                      ) : (
                        <FileText className="h-4 w-4 text-gray-300 inline cursor-not-allowed" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center border-none">
                      {item.dpn_document ? (
                        <button
                          type="button"
                          onClick={() => openDocument(item.dpn_document)}
                          className="inline-flex items-center"
                          aria-label="Open DPN document"
                        >
                          <FileText className="h-4 w-4 text-blue-600 inline cursor-pointer hover:text-blue-800" />
                        </button>
                      ) : (
                        <FileText className="h-4 w-4 text-gray-300 inline cursor-not-allowed" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center border-none">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${item.is_disbursed === 1 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {item.is_disbursed === 1 ? "Disbursed" : (item.disbursement_status || "pending")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right border-none">
                      <div className="flex items-center justify-end gap-3">
                        {tab === "PendingInventory" && (
                          <button
                            type="button"
                            onClick={() => openBackToFinalConfirm(String(item.disbursement_id || ""))}
                            disabled={clearingId === String(item.disbursement_id || "")}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {clearingId === String(item.disbursement_id || "") ? "Clearing..." : "Back to Final Disbursement"}
                          </button>
                        )}
                        {tab === "PendingInventory" && (
                          <Link
                            href={`/loan/disbursement/payment-inventory/create/?id=${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-xs font-semibold"
                          >
                            <Plus className="h-3 w-3" /> Create Payment
                          </Link>
                        )}
                        <Link
                          href={`/loan/disbursement/panel/view/?id=${item.id}`}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirm Action"
        message="Are you sure you want send this record back to Final Disbursement?"
        confirmText="Yes, Continue"
        cancelText="Cancel"
        onConfirm={confirmBackToFinal}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDisbursementId("");
        }}
      />
    </div>
  );
}
