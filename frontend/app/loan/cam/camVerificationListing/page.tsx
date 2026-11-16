"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, CheckCircle, Clock, Search, Filter } from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

export default function CAMVerificationListingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<"pending" | "verified">("pending");

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchCAMs = async (page = 1) => {
    try {
      setLoading(true);
      const user = getLoggedInUser();

      // Target parameters exactly as expected by the new API signature
      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const params: any = {
        page,
        branch_id: user?.branch,
        cms_admin_id: cmsAdminId,
        user_id: user?.user_id,
        sort_by: "created_at",
        sort_order: "desc",
        status: activeTab === "pending" ? "credit_manager" : "branch_manager",
        is_verified: activeTab === "verified" ? true : null,
      };

      const apiUrl = ProjectApiList.api_getAllCAM;

      // console.log(`Fetching ${activeTab} from ${apiUrl} with params:`, params);
      const res = await axiosInstance.get(apiUrl, { params });
      // console.log(`API Response for ${activeTab}:`, res.data);

      if (res.data.success) {
        // Updated data mapping based on the provided JSON structure
        const data = Array.isArray(res.data.data) ? res.data.data : [];
        const pagination = res.data.pagination;

        setRows(data);
        setCurrentPage(pagination?.current_page || 1);
        setLastPage(pagination?.last_page || 1);
        setTotal(pagination?.total || data.length);
      } else {
        setRows([]);
        setTotal(0);
        toast.error(res.data.message || "No records found");
      }
    } catch (error: any) {
      console.error("Error fetching CAMs:", error);
      setRows([]);
      setTotal(0);
      toast.error(error.response?.data?.message || "Failed to load CAM records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCAMs(1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, activeTab]);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between border-l-4 border-l-emerald-500">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CAM Verification Listing</h1>
          <p className="mt-1 text-sm text-gray-500">Review and verify Credit Appraisal Memorandums for sanctioning.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-100">
            Total Records: {total}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex items-center gap-2 p-1 bg-white border border-gray-200 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => { setActiveTab("pending"); setSearch(""); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider h-full flex items-center gap-2 ${activeTab === "pending"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Verifications
        </button>
        <button
          onClick={() => { setActiveTab("verified"); setSearch(""); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider h-full flex items-center gap-2 ${activeTab === "verified"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Verified CAMs
        </button>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Loan ID or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <button
            onClick={() => fetchCAMs(1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <Filter className="h-4 w-4" /> Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4">CAM ID</th>
                <th className="px-6 py-4">Loan ID</th>
                <th className="px-6 py-4">Customer ID</th>
                <th className="px-6 py-4">Surplus/EMI</th>
                <th className="px-6 py-4">Decision</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-10 w-10 text-gray-200" />
                      <p className="text-gray-400 font-medium">No pending CAM records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (Array.isArray(rows) ? rows : []).map((row, index) => (
                <tr key={row.id} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-xs">{(currentPage - 1) * 10 + index + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-emerald-700 text-xs">{row.cam_unique_id}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700 text-xs">
                    {row.loan_application_id}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 text-xs">{row.customer_unique_id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-700 text-xs">₹{row.net_surplus?.netSurplus || row.net_surplus?.net_surplus || "0"}</span>
                      <span className="text-[10px] text-gray-400">EMI: ₹{row.net_surplus?.proposedEmi || row.net_surplus?.proposed_emi || "0"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${row.credit_decision === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : row.credit_decision === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                      {row.credit_decision || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${row.is_verified
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                      }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${row.is_verified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                      {row.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {activeTab !== "verified" ? (
                        <button
                          onClick={() => router.push(`/loan/camVerification?id=${row.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2 text-[10px] font-bold text-emerald-700"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Verify
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-green-600">
                          ✔ Completed
                        </span>
                      )}
                      <button
                        onClick={() => router.push(`/loan/cam/viewCAM?id=${row.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2 text-[10px] font-bold text-blue-700 shadow-sm hover:border-blue-500 hover:bg-blue-50 transition-all uppercase tracking-wider"
                      >
                        <Eye className="w-3 h-3 text-blue-600" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-center gap-2">
            {Array.from({ length: lastPage }).map((_, i) => (
              <button
                key={i}
                disabled={currentPage === i + 1}
                onClick={() => fetchCAMs(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
