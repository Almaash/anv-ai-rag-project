"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
// import ProjectApi from "@/app/api/ProjectApis";
import Link from "next/link";
import ProjectApiList from "@/app/api/ProjectApiList";

/* ================= TYPES ================= */
type StatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "back_for_revision";

export default function MyLoanApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusType>("pending");

  // search
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


  // delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* ================= SEARCH DEBOUNCE ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);


  /* ================= FETCH DATA ================= */
  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchData = async () => {
    const user = getLoggedInUser();

    try {
      setLoading(true);

      const userData = localStorage.getItem("user");
      const parsedUser = userData ? JSON.parse(userData) : null;

      // console.log("Fetching loan applications with params:", parsedUser);

      if (!parsedUser) return;

      const { role, user_unique_id, customer_unique_id } = parsedUser;

      // console.log(role,"===============>")
      const params: any = {
        application_status: status,
        search: search || undefined,
        page,
        per_page: perPage,
        branch_id: user.branch,
        cms_admin_id: user.cms_admin,
      };

      // ✅ Add filter only for customer
      if (role === "customer") {
        params.customer_unique_id = customer_unique_id;
      }

      const res = await axiosInstance.get(
        ProjectApiList.api_getMyLoanApplication,
        { params }
      );

      setApplications(res.data.data || []);
      setStatusCounts(res.data.status_counts || {});

      const pg = res.data.pagination;
      setPage(pg.current_page);
      setPerPage(pg.per_page);
      setTotal(pg.total);
      setLastPage(pg.last_page);
      setFrom(pg.from);
      setTo(pg.to);

    } catch (err) {
      console.error("Error loading loan applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, page, search]);

  /* ================= DELETE ================= */
  const handleDelete = async (loanApplicationId: string) => {
    try {
      setDeletingId(loanApplicationId);
      await axiosInstance.post(
        `${ProjectApiList.api_deleteLoanApplication}/${loanApplicationId}`
      );
      fetchData();
    } catch {
      alert("Failed to delete loan application");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const statusMeta: Record<
    string,
    { label: string; color: string }
  > = {
    pending: {
      label: "under verification",
      color: "bg-yellow-100 text-yellow-700",
    },
    under_review: {
      label: "under review",
      color: "bg-blue-100 text-blue-700",
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
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Loan Applications
          </h1>
          <p className="text-sm text-gray-500">
            Track and manage your submitted loan applications
          </p>
        </div>

        <Link
          href="/loan/loanApplications/create"
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + Apply New Application
        </Link>
      </div>

      {/* ================= STATUS TABS ================= */}
      <div className="flex gap-3 flex-wrap">
        {[
          {
            label: "Pending",
            value: "pending",
            count: statusCounts.pending,
          },
          {
            label: "Approved",
            value: "approved",
            count: statusCounts.approved,
          },
          {
            label: "Revision",
            value: "back_for_revision",
            count: statusCounts.back_for_revision,
          },
          {
            label: "Rejected",
            value: "rejected",
            count: statusCounts.rejected,
          },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value as StatusType);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
                  flex items-center gap-2
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


      {/* ================= TABLE CARD ================= */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        {/* COUNT + SEARCH */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{total}</span>{" "}
            applications found
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search application no or purpose..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-72 px-3 py-2 text-sm rounded-lg border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
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
                        className="px-4 py-3 text-left font-semibold text-gray-700"
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
                        key={item?.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-3">{serialNo}</td>
                        <td className="px-4 py-3 font-medium">
                          {item?.loan_application_id}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item?.customer?.name}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{item?.loan_amount}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item?.loan_tenure_months} months
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item?.loan_purpose}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta[item.application_status]?.color ||
                              "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {statusMeta[item.application_status]?.label ||
                              item.application_status.replaceAll("_", " ")}
                          </span>

                        </td>

                        <td className="px-4 py-3 flex gap-4">
                          <Link
                            href={`/loan/loanApplications/view?id=${item.loan_application_id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </Link>

                          {status === "pending" && (
                            <button
                              disabled={
                                deletingId ===
                                item.loan_application_id
                              }
                              onClick={() =>
                                setConfirmDelete(
                                  item.loan_application_id
                                )
                              }
                              className={`font-medium
                                ${deletingId ===
                                  item.loan_application_id
                                  ? "text-red-400 cursor-not-allowed"
                                  : "text-red-600 hover:text-red-800"
                                }`}
                            >
                              {deletingId ===
                                item.loan_application_id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3">
              <p className="text-sm text-gray-600">
                Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b>
              </p>

              <div className="flex items-center gap-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200
                             disabled:opacity-50"
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
                             disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* EMPTY */}
        {!loading && applications.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            No {status.replaceAll("_", " ")} applications found
          </div>
        )}
      </div>

      {/* ================= DELETE MODAL ================= */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-1">
              Delete Loan Application
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
