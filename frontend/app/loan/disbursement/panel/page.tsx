"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Eye, Plus, Search, Loader2 } from "lucide-react";

export default function DisbursementPanelPage() {
  const [tab, setTab] = useState<"cam" | "pd" | "disbursement">("cam");
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
      if (!user) return;

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      let res;

      if (tab === "cam") {
        res = await axiosInstance.get(
          ProjectApiList.api_getVerifiedCams,
          {
            params: {
              search,
              branch_id: user?.branch,
              cms_admin_id: cmsAdminId,
            },
          }
        );
      } else if (tab === "pd") {
        res = await axiosInstance.get(
          ProjectApiList.api_getVProductPd,
          {
            params: {
              page: 1,
              user_id: user?.user_id,
              branch_id: user?.branch,
              cms_admin_id: cmsAdminId,
              is_cam_created: false,
              is_disbursement_created: false,
              search,
            },
          }
        );
      } else {
        res = await axiosInstance.get(
          ProjectApiList.GET_ALL_DISBURSEMENTS_WITH_DATES,
          {
            params: {
              search,
              branch_id: user?.branch,
              cms_admin_id: cmsAdminId,
            },
          }
        );
      }

      if (res.data.success) {
        const resultData = res.data.data?.data || res.data.data;

        setData(Array.isArray(resultData) ? resultData : []);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error(`Error fetching ${tab} records:`, error);
      toast.error(`Failed to fetch ${tab} records`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disbursement Panel</h1>
          <p className="text-sm text-gray-500">View and manage loan disbursement records</p>
        </div>
      </div>



      {/* TABS */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => { setTab("pd"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "pd"
            ? "text-blue-600"
            : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Product PD
          {tab === "pd" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => { setTab("cam"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "cam" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Verified CAMs
          {tab === "cam" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => { setTab("disbursement"); setSearch(""); }}
          className={`relative px-6 py-4 text-sm font-semibold transition-all ${tab === "disbursement" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Disbursement List
          {tab === "disbursement" && (
            <span className="absolute left-0 bottom-0 w-full h-[3px] bg-blue-600 rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* FILTERS/SEARCH */}
      <div className="bg-white p-4 shadow-sm border-x border-b border-gray-100 rounded-b-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={tab === "cam" ? "Search CAM Records..." : "Search Disbursements..."}
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
                {tab === "cam" ? (
                  <>
                    <th className="px-6 py-4 font-semibold text-gray-700">CAM ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Loan App ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Decision</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Created At</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                  </>
                ) : tab === "pd" ? (
                  <>
                    <th className="px-6 py-4">PD ID</th>
                    <th className="px-6 py-4">Loan App ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-semibold text-gray-700">Disbursement ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Loan App ID</th>
                    {/* <th className="px-6 py-4 font-semibold text-gray-700">Disbursement Date</th> */}
                    <th className="px-6 py-4 font-semibold text-gray-700">Booking Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-gray-500 font-medium">Loading {tab} data...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500 font-medium">No {tab} records found</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    {tab === "cam" ? (
                      <>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.cam_unique_id}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.loan_application_id}
                        </td>
                        <td className="px-6 py-4 text-gray-600 capitalize">
                          {item.credit_decision}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {item.is_verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(item.created_at).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/loan/disbursement/panel/create?id=${item.loan_application_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            Create
                          </Link>
                        </td>
                      </>
                    ) : tab === "pd" ? (
                      <>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.pd_application_id}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {item.loan_application_id}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {item.customer?.first_name} {item.customer?.last_name}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {new Date(item.created_at).toLocaleDateString("en-GB")}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/loan/disbursement/panel/create?id=${item.loan_application_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            Create
                          </Link>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.disbursement_id}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.loan_application_id}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.booking_date
                            ? new Date(item.booking_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.disbursement_status === "Disbursed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
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
