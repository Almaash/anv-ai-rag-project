"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

const formatDate = (date?: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function UsersTable({
  users = [],
  loading = false,
  page,
  perPage,
  lastPage,
  from,
  to,
  total,
  onPageChange,
}: any) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-700">
          <thead>
            <tr className="bg-gray-50 text-gray-900 text-left border-b border-gray-100">
              {[
                "S.No",
                "Enrollment #",
                "Full Name",
                "Contact",
                "Official Email",
                "Status",
                "Verification",
                "Actions",
              ].map((head) => (
                <th
                  key={head}
                  className="px-4 py-4 font-bold tracking-tight"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-20 text-center text-gray-400 font-medium">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-2 align-middle"></div>
                  Fetching manager records...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-20 text-center text-gray-400 font-medium">
                  No records match your search.
                </td>
              </tr>
            ) : (
              users.map((user: any, index: number) => {
                const serialNo = (page - 1) * perPage + index + 1;

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-4 font-bold text-gray-400">
                      {serialNo}
                    </td>

                    <td className="px-4 py-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-bold border whitespace-nowrap">
                        {user.enrollment_number || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900 whitespace-normal break-words">
                        {user.first_name} {user.last_name || ""}
                      </div>

                      <div className="text-[11px] text-gray-400 font-medium">
                        Promoted: {formatDate(user.updated_at)}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-700 whitespace-nowrap">{user.contact_number_1 || "—"}</div>
                      <div className="text-[11px] text-gray-400">{user.gender || "—"}</div>
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-600">
                      {user.email}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={` py-4 font-medium   ${user.status === "branch_manager"
                          ? "text-blue-600"
                          : "text-purple-600"
                          }`}
                      >
                        {user.status?.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${user.verification_status === "verified"
                          ? "text-green-600"
                          : "text-orange-500"
                          }`}
                      >
                        {user.verification_status === "verified" ? (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </>
                        ) : (user.verification_status || "Pending")}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() =>
                          router.push(
                            `/loan/customerVerification/customerDetails?id=${user.customer_unique_id}&enrollment_number=${user.enrollment_number}`
                          )
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center gap-1 font-bold text-xs"
                        title="View Details"
                      >
                        <Eye size={16} />
                        VIEW
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">
            Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b> records
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">
              Page {page} of {lastPage}
            </div>
            <button
              disabled={page === lastPage}
              onClick={() => onPageChange(page + 1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}