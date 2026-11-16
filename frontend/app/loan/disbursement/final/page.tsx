"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Eye, Plus, Search, Loader2, FileText } from "lucide-react";

export default function FinalDisbursementListingPage() {
  const [tab, setTab] = useState<"PendingDisbursed" | "finalDisbursed">("PendingDisbursed");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

      const params = {
        search,
        branch_id: user?.branch,
        cms_admin_id: cmsAdminId,
      };

      const res = await axiosInstance.get(
        tab === "PendingDisbursed"
          ? ProjectApiList.GET_ALL_DISBURSEMENTS_WITH_DATES
          : ProjectApiList.GET_FINAL_DISBURSEMENTS,
        { params }
      );

      if (res.data.success) {
        const resultData = res.data.data.data || res.data.data;
        setData(Array.isArray(resultData) ? resultData : []);
      }
    } catch (error) {
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDocUrl = (path: string) =>
    path ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}` : null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Final Disbursement</h1>
          <p className="text-sm text-gray-500">View and manage final disbursement records</p>
        </div>
        <Link
          href="/loan/disbursement/final/create"
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Final Disbursement
        </Link>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => { setTab("PendingDisbursed"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "PendingDisbursed" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Pending Disbursed
          {tab === "PendingDisbursed" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => { setTab("finalDisbursed"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "finalDisbursed" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Final Disbursements
          {tab === "finalDisbursed" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
          )}
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 shadow-sm border-x border-b border-gray-100 rounded-b-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={tab === "PendingDisbursed" ? "Search disbursements..." : "Search final records..."}
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
                {tab === "PendingDisbursed" ? (
                  <>
                    <th className="px-6 py-4 font-semibold text-gray-700">Disbursement ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Loan App ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Booking Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-semibold text-gray-700">Disbursement ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Loan App ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Documents</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-gray-500 font-medium">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-gray-500 font-medium">No records found</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    {tab === "PendingDisbursed" ? (
                      <>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.disbursement_id}</td>
                        <td className="px-6 py-4 text-gray-600">{item.loan_application_id}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.booking_date ? new Date(item.booking_date).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.disbursement_status === "Disbursed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                            }`}>
                            {item.disbursement_status || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/loan/disbursement/final/create?id=${item.disbursement_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Create Final
                          </Link>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.disbursement_id}</td>
                        <td className="px-6 py-4 text-gray-600">{item.loan_application_id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {["dfa_document", "cfa_document", "dpn_document"].map((docKey) =>
                              item[docKey] ? (
                                <a
                                  key={docKey}
                                  href={getDocUrl(item[docKey])!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                  title={docKey.replace("_document", "").toUpperCase()}
                                >
                                  <FileText className="h-4 w-4" />
                                  {docKey.replace("_document", "").toUpperCase()}
                                </a>
                              ) : null
                            )}
                            {!item.dfa_document && !item.cfa_document && !item.dpn_document && (
                              <span className="text-gray-400 text-xs">No docs</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.disbursement_status === "Disbursed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                            }`}>
                            {item.disbursement_status || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/loan/disbursement/panel/view?id=${item.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
