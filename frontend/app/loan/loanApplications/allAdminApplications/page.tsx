"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
// import ProjectApi from "@/app/api/ProjectApis";
import Link from "next/link";
import ProjectApiList from "@/app/api/ProjectApiList";

type StatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "back_for_revision";

export default function MyLoanApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // status tab
  const [status, setStatus] = useState<StatusType>("pending");

  // 🔍 search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{
    pending?: number;
    approved?: number;
    rejected?: number;
    back_for_revision?: number;
  }>({});


  /* ============================
     DEBOUNCE SEARCH
  ============================ */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ============================
     LOAD APPLICATIONS
  ============================ */

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchData = async () => {
    const user = getLoggedInUser();
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        ProjectApiList.api_getMyLoanApplication,
        {
          params: {
            application_status: status,
            search: search || undefined,
            page,
            per_page: perPage,
            // user_id: user.user_id,
            branch_id: user.branch,
            cms_admin_id: user.cms_admin,
          },
        }
      );

      setApplications(res.data.data || []);
      setStatusCounts(res.data.status_counts || {});

      const pg = res.data.pagination;
      setTotal(pg.total);
      setPage(pg.current_page);
      setPerPage(pg.per_page);
      setLastPage(pg.last_page);
      setFrom(pg.from);
      setTo(pg.to);
    } catch (error) {
      console.error("Error loading loan applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, page, search]);


  const statusMeta: Record<string, { label: string; color: string }> = {
    pending: {
      label: "under verification",
      color: "bg-yellow-100 text-yellow-700",
    },
    back_for_revision: {
      label: "back for revision",
      color: "bg-orange-100 text-orange-700",
    },
    approved: {
      label: "approved",
      color: "bg-green-100 text-green-700",
    },
    rejected: {
      label: "rejected",
      color: "bg-red-100 text-red-700",
    },
  };


  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Admin Loan Applications
        </h1>
        <p className="text-gray-500 text-sm">
          Track and manage your loan applications
        </p>
      </div>

      {/* STATUS TABS */}
      {/* STATUS TABS */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Pending", value: "pending", count: statusCounts.pending },
          { label: "Approved", value: "approved", count: statusCounts.approved },
          { label: "Rejected", value: "rejected", count: statusCounts.rejected },
          {
            label: "Revision",
            value: "back_for_revision",
            count: statusCounts.back_for_revision,
          },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setPage(1);
              setStatus(tab.value as StatusType);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2
        ${status === tab.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-200"
              }`}
          >
            <span>{tab.label}</span>

            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold
          ${status === tab.value
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-700"
                }`}
            >
              {tab.count ?? 0}
            </span>
          </button>
        ))}
      </div>


      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        {/* COUNT + SEARCH */}
        <div className="flex justify-between items-center  border-gray-100 pb-3 mb-4">
          {/* COUNT */}
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{total}</span>{" "}
            applications found
          </p>

          {/* SEARCH */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by application no or purpose..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-80 px-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )} */}
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* TABLE */}
        {!loading && applications.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "S.No",
                      "Application No",
                      "Applicant Name",
                      "Loan Amount",
                      "Tenure",
                      "Purpose",
                      "Status",
                      "Action",
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-2.5 text-left font-semibold text-gray-700"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {applications.map((item, index) => {
                    const serialNo =
                      (page - 1) * perPage + index + 1;

                    return (
                      <tr
                        key={item.id}
                        className=" last:-0 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {serialNo}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {item.loan_application_id}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {item?.customer?.name}
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          ₹{item.loan_amount}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {item.loan_tenure_months} months
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {item.loan_purpose}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta[item.application_status]?.color ||
                              "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {statusMeta[item.application_status]?.label ||
                              item.application_status.replaceAll("_", " ")}
                          </span>

                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/loan/loanApplications/viewAdmin?id=${item.loan_application_id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4 pt-3">
              <p className="text-sm text-gray-600">
                Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b> applications
              </p>

              <div className="flex items-center gap-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-600">
                  Page <b>{page}</b> of <b>{lastPage}</b>
                </span>

                <button
                  disabled={page === lastPage}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!loading && applications.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No {statusMeta[status]?.label || status} loan applications found

          </div>
        )}
      </div>
    </div>
  );
}
