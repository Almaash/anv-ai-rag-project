"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

export default function MyLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"loans" | "raw_disbursements">("loans");
  const [rawDisbursements, setRawDisbursements] = useState<any[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [role, setRole] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 10;

  const getUser = () => {
    if (typeof window === "undefined") return null;
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  };

  /* ROLE CHECK */
  useEffect(() => {
    const user = getUser();
    if (user) setRole(user.role?.toLowerCase() ?? null);
  }, []);

  /* FETCH LOANS */
  const fetchLoans = async () => {
    try {
      setLoading(true);
      const user = getUser();
      const userRole = user?.role?.toLowerCase();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const params: any = {
        branch_id: user?.branch,
        cms_admin_id: cmsAdminId,
      };

      if (userRole === "field executive" && user?.agent_unique_id) {
        params.agent_unique_id = user.agent_unique_id;
      }

      if (userRole === "customer" && user?.customer_unique_id) {
        params.customer_unique_id = user.customer_unique_id;
      }

      const res = await axiosInstance.get(ProjectApiList.api_getAllLOANS, { params });
      const loanData = res?.data?.data || [];
      setLoans(loanData);
      setFilteredLoans(loanData);
    } catch (error) {
      console.error("Failed to fetch loans:", error);
    } finally {
      setLoading(false);
    }
  };

  /* FETCH RAW DISBURSEMENTS */
  const fetchRawDisbursements = async () => {
    try {
      setLoading(true);
      const user = getUser();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : (user?.cms_admin_id || user?.cms_admin || "");

      const res = await axiosInstance.get(ProjectApiList.GET_ALL_RAW_DISBURSEMENTS, {
        params: {
          search: "",
          is_loan_started: false,
          branch_id: user?.branch_id || user?.branch || "",
          cms_admin_id: cmsAdminId,
        },
      });

      setRawDisbursements(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* FETCH ON TAB CHANGE */
  useEffect(() => {
    if (tab === "loans") {
      fetchLoans();
    } else {
      fetchRawDisbursements();
    }
  }, [tab]);

  /* SEARCH DEBOUNCE */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* FILTER SEARCH */
  useEffect(() => {
    if (!search) {
      setFilteredLoans(loans);
      return;
    }
    setFilteredLoans(
      loans.filter((loan) =>
        loan.loan_number?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, loans]);

  /* PAGINATION */
  const total = tab === "loans" ? filteredLoans.length : rawDisbursements.length;
  const lastPage = Math.ceil(total / perPage) || 1;
  const paginatedLoans =
    tab === "loans"
      ? filteredLoans.slice((page - 1) * perPage, page * perPage)
      : rawDisbursements.slice((page - 1) * perPage, page * perPage);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const isCustomerOrFE = ["field executive", "customer"].includes(role ?? "");

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isCustomerOrFE ? "All Loans" : "Start Loans"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isCustomerOrFE
              ? "View and track your active and completed loans"
              : "Create and manage customer loan records"}
          </p>
        </div>

        {!isCustomerOrFE && (
          <Link
            href="/loan/loans/create"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
          >
            Apply for a Loan
          </Link>
        )}
      </div>

      {/* TABS */}
      <div className="flex border-b mb-4">

        {!isCustomerOrFE && (
          <button
            onClick={() => { setTab("raw_disbursements"); setPage(1); }}
            className={`px-4 py-2 text-sm ${tab === "raw_disbursements" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
          >
            Raw Disbursements
          </button>
        )}
        <button
          onClick={() => { setTab("loans"); setPage(1); }}
          className={`px-4 py-2 text-sm ${tab === "loans" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
        >
          Loans
        </button>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">

        {/* COUNT + SEARCH */}
        <div className="flex justify-between items-center pb-3 mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{total}</span> loans found
          </p>
          <input
            type="text"
            placeholder="Search by loan number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-80 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* TABLE */}
        {!loading && paginatedLoans.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50">
                  <tr>
                    {(tab === "loans"
                      ? ["S.No",
                        "Loan Number",
                        "Loan Application ID",
                        "Customer",
                        "Loan Amount",
                        "EMI Amount",
                        "Tenure",
                        "Action",]
                      : ["S.No", "Disbursement ID", "Customer Name", "Customer ID", "CAF ID", "Booking Date", "Payment Status", "Disbursement Status", "Loan Started"]
                    ).map((head) => (
                      <th key={head} className="px-4 py-2.5 text-left font-semibold text-gray-700">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLoans.map((loan, index) => {
                    const serialNo = (page - 1) * perPage + index + 1;
                    if (tab === "raw_disbursements") {
                      return (
                        <tr key={loan.id ?? index} className="hover:bg-gray-50 border-t border-gray-50">
                          <td className="px-4 py-2.5">{serialNo}</td>
                          <td className="px-4 py-2.5 font-medium">{loan.disbursement_id}</td>
                          <td className="px-4 py-2.5">{loan.customer_name}</td>
                          <td className="px-4 py-2.5">{loan.customer_unique_id}</td>
                          <td className="px-4 py-2.5">{loan.loan_application_id}</td>
                          <td className="px-4 py-2.5">{loan.booking_date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${loan.payment_status === "NEFT_done" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                              }`}>{loan.payment_status ?? "-"}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${loan.disbursement_status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                              }`}>{loan.disbursement_status}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${loan.loan_started_status === "Yes" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>{loan.loan_started_status}</span>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={loan.loan_id ?? index} className="hover:bg-gray-50 border-t border-gray-50">
                        <td className="px-4 py-2.5">{serialNo}</td>
                        <td className="px-4 py-2.5 font-medium">{loan.loan_number}</td>
                        <td className="px-4 py-2.5 font-medium">{loan.loan_application_id}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {loan.customer?.customer_name ||
                                loan.customer?.name ||
                                loan.customer?.full_name ||
                                "-"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {loan.customer?.customer_unique_id}
                            </span>
                          </div>
                        </td>                        <td className="px-4 py-2.5">₹{loan.loan_details?.loan_amount}</td>
                        <td className="px-4 py-2.5">₹{loan.loan_details?.emi_amount}</td>
                        <td className="px-4 py-2.5">{loan.loan_details?.tenure} {loan.loan_details?.frequency}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/loan/loans/viewLoans?id=${loan.loan_number}`} className="text-blue-600 hover:text-blue-800 font-medium">
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
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b>
              </p>
              <div className="flex gap-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">Page <b>{page}</b> of <b>{lastPage}</b></span>
                <button
                  disabled={page === lastPage}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* EMPTY */}
        {!loading && paginatedLoans.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No loans found</div>
        )}

      </div>
    </div>
  );
}
