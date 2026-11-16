"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Eye } from "lucide-react";

type CAFListRow = {
  id: string;
  loan_application_id: string;
  applicantName: string;
  productName: string;
  frequency: string;
  credit_applied_for: string;
  netSurplus: string;
  status: string;
  createdAt: string;
};

export default function CAFListPage() {
  const [rows, setRows] = useState<CAFListRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [verifyTab, setVerifyTab] = useState<"pending" | "verified">("pending");

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchCAFRecords = async () => {
    try {
      setLoading(true);

      const user = getLoggedInUser();
      if (!user) return;

      const res = await axiosInstance.get(ProjectApiList.api_getAllCAF, {
        params: {
          search,
          status: "branch_manager",
          is_verified: verifyTab === "verified",
          page,
          per_page: 10,

          branch_id: user.branch,

          ...(user.role === "cms_admin"
            ? {
              // user_id: user.user_id,
              // user_id: "anv_7",
              cms_admin_id: user.user_id,
            }
            : {
              user_id: user.user_id,
              cms_admin_id: user.cms_admin,
            }),
        },
      });

      if (res.data.success) {
        const responseData = res.data.data;
        const items = Array.isArray(responseData) ? responseData : responseData?.data || [];
        const pagination = res.data.pagination || responseData?.pagination;

        const formattedRows = items.map((item: any) => {
          const customer = item.customer;

          const fullName = customer
            ? `${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""
              }`
              .replace(/\s+/g, " ")
              .trim()
            : "-";

          return {
            id: item.id?.toString() || "-",
            loan_application_id: item.loan_application_id || "-",
            applicantName: fullName || "-",
            productName: item.product_name || item.credit_mode || "-",
            frequency: item.frequency || "-",
            netSurplus: item.net_surplus ? `Rs. ${item.net_surplus}` : "-",
            credit_applied_for: item.credit_applied_for ? `Rs. ${item.credit_applied_for}` : "-",
            status: item.status || "Applied",
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
      toast.error("Failed to fetch CAF records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCAFRecords();
  }, [search, verifyTab, page]);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          CAF Verification
        </h1>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">

        <button
          onClick={() => {
            setVerifyTab("pending");
            setPage(1);
          }}
          className={`relative pr-5 py-2 text-sm font-medium transition-colors
          ${verifyTab === "pending"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Pending Verification

          {verifyTab === "pending" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

        <button
          onClick={() => {
            setVerifyTab("verified");
            setPage(1);
          }}
          className={`relative px-5 py-2 text-sm font-medium transition-colors
          ${verifyTab === "verified"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Verified

          {verifyTab === "verified" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* SEARCH */}
        <div className="flex justify-between items-center gap-4">

          <p className="text-sm text-gray-600">
            {loading
              ? "Loading records..."
              : `${rows.length} applications found`}
          </p>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID, Name or Status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-80 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all pl-10"
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

            <thead className="bg-gray-50/80">
              <tr>
                {[
                  "Application ID",
                  "Applicant Name",
                  "Scheme / Product",
                  "Credit Applied For",
                  "Current Status",
                  "Date Applied",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-4 text-left font-bold text-gray-600 border-b"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">

              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-4 py-4 font-semibold text-blue-600 font-mono">
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
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-100">
                        {row.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {row.createdAt}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/loan/cafVerification/viewDetails?id=${row.loan_application_id}`}
                      >
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                          <Eye size={14} /> View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <span className="text-sm font-medium">
                        No credit applications found matching your criteria.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}