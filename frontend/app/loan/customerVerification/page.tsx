"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function CustomerVerificationPage() {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<"pending" | "verified">("pending");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({
    current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0,
  });

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

const fetchRecords = async () => {
  try {
    setLoading(true);

    const user = getLoggedInUser();
    if (!user) return;

    const isCmsAdmin =
      user.role === "CMS Admin" ||
      user.role === "cms_admin";

    const enrollmentsRes = await axiosInstance.get(
      statusTab === "pending"
        ? ProjectApiList.api_getPendingEnrollments
        : ProjectApiList.api_getVerifiedEnrollments,
      {
        params: {
          search,
          page,
          per_page: pagination.per_page,
          branch_id: user.branch,

          cms_admin_id: isCmsAdmin
            ? user.user_id
            : user.cms_admin,
        },
      }
    );

    const records = enrollmentsRes.data.success
      ? enrollmentsRes.data.data
      : [];

    setRecords(records);

    setPagination(
      enrollmentsRes.data.pagination || {
        current_page: 1,
        per_page: records.length,
        total: records.length,
        last_page: 1,
        from: records.length ? 1 : 0,
        to: records.length,
      }
    );
  } catch (err) {
    console.error("Fetch verification records failed", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchRecords(); }, [search, page, statusTab]);

  const headers = [
    "S.No", "Customer ID", "Enrollment No", "Full Name",
    "Contact", "Status", "Date", "Actions",
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Customer Verification</h1>
      </div>

      {/* Pending / Verified tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(["pending", "verified"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={`px-4 py-1 rounded-md text-sm font-medium ${statusTab === tab ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <div className="flex justify-between mb-4 items-center">
          <p className="text-sm text-gray-500 font-medium">{records.length} records found</p>
          <input
            type="text"
            placeholder="Search by name, customer ID or enrollment no..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="w-80 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-gray-50 text-gray-900 text-left border-b">
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-3 font-bold tracking-tight whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-16 text-center text-gray-400">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-2 align-middle" />
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-16 text-center text-gray-400">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  records.map((rec: any, idx: number) => {
                    const isEnrollment = true;
                    const cust = rec.customer ?? rec;
                    const fullName = [cust.first_name, cust.middle_name, cust.last_name]
                      .filter(Boolean).join(" ") || "—";
                    const enrollmentNo = isEnrollment ? rec.enrollment_number : rec.enrollment_number;
                    const customerId = isEnrollment ? rec.customer_unique_id : rec.customer_unique_id;
                    const contact = cust.contact_number_1 || rec.contact_number_1 || "—";
                    const status = isEnrollment ? rec.verification_status : rec.verification_status;
                    const date = isEnrollment
                      ? formatDate(rec.enrollment_date ?? rec.created_at)
                      : formatDate(rec.created_at);

                    const detailUrl =
                      `/loan/customerVerification/customerDetails?id=${customerId}&enrollment_number=${enrollmentNo}`;

                    return (
                      <tr
                        key={`${rec._type}-${rec.customer_unique_id}-${rec.enrollment_number}`} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-bold">{idx + 1}</td>



                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-bold border">
                            {customerId}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-100">
                            {enrollmentNo || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-800">{fullName}</td>

                        <td className="px-4 py-3 text-gray-600">{contact || "—"}</td>

                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${status === "verified" ? "text-green-600"
                            : status === "rejected" ? "text-red-600"
                              : "text-orange-500"
                            }`}>
                            {status || "pending"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{date}</td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(detailUrl)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700"
                          >
                            {statusTab === "pending" ? "Verify" : "View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.total > 0 && (
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
              <p className="text-sm text-gray-600">
                Showing <b>{pagination.from}</b> – <b>{pagination.to}</b> of <b>{pagination.total}</b>
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">
                  Page {pagination.current_page} of {pagination.last_page}
                </div>
                <button
                  disabled={page === pagination.last_page}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
