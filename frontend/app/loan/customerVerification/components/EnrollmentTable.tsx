"use client";

import { useRouter } from "next/navigation";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

type Props = {
  enrollments: any[];
  loading: boolean;
  tab: "pending" | "verified";
  pagination: any;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
};

export default function EnrollmentTable({ enrollments, loading, tab, pagination, onPageChange }: Props) {
  const router = useRouter();

  const { current_page: page, last_page: lastPage, total, from, to, per_page: perPage } = pagination ?? {};

  const headers = [
    "S.No", "Customer ID", "Enrollment No", "Customer Name",
    "Mobile", "Address", "Date", "Status",
    ...(tab === "pending" ? ["Actions"] : ["Verified By", "Verified At"]),
  ];

  return (
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
            ) : enrollments.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-16 text-center text-gray-400">No enrollments found.</td>
              </tr>
            ) : (
              enrollments.map((e: any, idx: number) => {
                const serialNo = ((page - 1) * (perPage || 10)) + idx + 1;
                const cust = e.customer ?? {};
                const name = [cust.first_name, cust.middle_name, cust.last_name].filter(Boolean).join(" ") || "—";

                return (
                  <tr key={e.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-bold">{serialNo}</td>

                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-bold border">
                        {e.customer_unique_id}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-100">
                        {e.enrollment_number}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{cust.contact_number_1 ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{cust.permanent_address ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(e.enrollment_date ?? e.created_at)}</td>

                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-black uppercase tracking-wider ${
                        e.verification_status === "verified" ? "text-green-600"
                        : e.verification_status === "rejected" ? "text-red-600"
                        : "text-orange-500"
                      }`}>
                        {e.verification_status ?? "pending"}
                      </span>
                    </td>

                    {tab === "pending" ? (
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            router.push(
                              `/loan/customerVerification/customerDetails?id=${e.customer_unique_id}&enrollment_number=${e.enrollment_number}`
                            )
                          }
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 font-semibold"
                        >
                          Verify
                        </button>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-500">{e.verified_by ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(e.verified_at)}</td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex justify-between items-center gap-3 px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b></p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => onPageChange(page - 1)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <div className="px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">Page {page} of {lastPage}</div>
            <button disabled={page === lastPage} onClick={() => onPageChange(page + 1)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
