"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Eye, Plus } from "lucide-react";

export default function PDListPage() {

  const [tab, setTab] = useState<"caf" | "pd">("caf");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  /* ================= FETCH CAF ================= */
  const fetchCAF = async (page = 1) => {
    try {
      setLoading(true);

      const user = getLoggedInUser();
      if (!user) return;

      const res = await axiosInstance.get(ProjectApiList.api_getAllCAF, {
        params: {
          page,
          search,
          status: "branch_manager",
          is_verified: true,
          is_pd_created: false,
          user_id: user.user_id,
          branch_id: user.branch,
          cms_admin_id: user.cms_admin,
        },
      });

      if (res.data.success) {
        const formatted = res.data.data.map((item: any) => {
          const customer = item.customer;

          return {
            id: item.id,
            loan_application_id: item.loan_application_id,
            applicantName: customer
              ? `${customer.first_name || ""} ${customer.last_name || ""}`
              : "-",
            mobile: customer?.contact_number_1 || "-",
            creditAmount: `₹${item.credit_applied_for}`,
            netSurplus: `₹${item.net_surplus}`,
            status: item.status,
          };
        });

        setRows(formatted);

        const pagination = res.data.pagination;
        setCurrentPage(pagination.current_page);
        setLastPage(pagination.last_page);
        setTotal(pagination.total);
      }
    } catch (error) {
      toast.error("Failed to fetch CAF records");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH PD ================= */
  const fetchPD = async (page = 1) => {
    try {
      setLoading(true);

      const user = getLoggedInUser();
      if (!user) return;

      const cmsAdminId =
        user.role === "cms_admin"
          ? user.user_id
          : user.cms_admin;

      const res = await axiosInstance.get(
        ProjectApiList.api_getAllPD,
        {
          params: {
            page,
            search,
            user_id: user.user_id,
            branch_id: user.branch,
            cms_admin_id: cmsAdminId,
          },
        }
      );
      if (res.data.success) {
        const formatted = res.data.data.map((item: any) => ({
          id: item.id,
          pdId: item.pd_application_id,
          loanId: item.loan_application_id,
          customerId: item.customer_unique_id,
          status: item.status,
        }));

        setRows(formatted);

        const pagination = res.data.pagination;
        setCurrentPage(pagination.current_page);
        setLastPage(pagination.last_page);
        setTotal(pagination.total);
      }
    } catch (error) {
      toast.error("Failed to fetch PD records");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SINGLE EFFECT (FIXED) ================= */
  useEffect(() => {
    const delay = setTimeout(() => {
      if (tab === "caf") fetchCAF(1);
      if (tab === "pd") fetchPD(1);
    }, 300);

    return () => clearTimeout(delay);
  }, [tab, search]);

  const handlePageChange = (page: number) => {
    if (tab === "caf") fetchCAF(page);
    if (tab === "pd") fetchPD(page);
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          PD Information
        </h1>

        <Link href="/loan/pd/createPD">
          <button
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Create PD
          </button>
        </Link>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("caf")}
          className={`relative pr-5 py-2 text-sm font-medium ${tab === "caf" ? "text-blue-600" : "text-gray-500"}`}
        >
          CAF Applications
        </button>

        <button
          onClick={() => setTab("pd")}
          className={`relative px-5 py-2 text-sm font-medium ${tab === "pd" ? "text-blue-600" : "text-gray-500"}`}
        >
          PD Records
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* SEARCH */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {loading ? "Loading records..." : `${total} records found`}
          </p>

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-gray-100">

          <table className="min-w-full text-sm">

            {/* HEADER */}
            <thead className="bg-gray-50/80">
              <tr>
                {(tab === "caf"
                  ? ["Application ID", "Applicant", "Mobile", "Credit", "Surplus", "Status", "Action"]
                  : ["PD ID", "Loan ID", "Customer", "Status", "Action"]
                ).map((heading) => (
                  <th key={heading} className="px-4 py-4 text-left font-bold text-gray-600 border-b">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-gray-50">

              {/* DATA */}
              {!loading && rows.length > 0 && rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">

                  {tab === "caf" && (
                    <>
                      <td className="px-4 py-4 font-semibold text-blue-600 font-mono">{row.loan_application_id}</td>
                      <td className="px-4 py-4 font-medium text-gray-800">{row.applicantName}</td>
                      <td className="px-4 py-4 text-gray-600">{row.mobile}</td>
                      <td className="px-4 py-4 font-semibold text-gray-700">{row.creditAmount}</td>
                      <td className="px-4 py-4 font-semibold text-gray-700">{row.netSurplus}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-700 border border-blue-100">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/loan/pd/createPD?id=${row.loan_application_id}`}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all">
                            <Plus size={14} /> Create
                          </button>
                        </Link>
                      </td>
                    </>
                  )}

                  {tab === "pd" && (
                    <>
                      <td className="px-4 py-4 font-semibold text-blue-600 font-mono">{row.pdId}</td>
                      <td className="px-4 py-4">{row.loanId}</td>
                      <td className="px-4 py-4">{row.customerId}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-700 border border-blue-100">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/loan/pd/viewPD?id=${row.pdId}`}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-all">
                            <Eye size={14} /> View
                          </button>
                        </Link>
                      </td>
                    </>
                  )}

                </tr>
              ))}

              {/* EMPTY */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              )}

              {/* LOADING */}
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

        {/* PAGINATION */}
        <div className="flex justify-between items-center pt-3">
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {lastPage}
          </span>

          <button
            disabled={currentPage === lastPage || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="border px-3 py-1 text-sm rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
}