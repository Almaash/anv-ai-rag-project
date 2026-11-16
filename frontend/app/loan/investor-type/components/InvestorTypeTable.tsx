"use client";

import { useRouter } from "next/navigation";
import { Edit, Trash2, RefreshCw } from "lucide-react";

type InvestorType = {
  id: number;
  unique_id: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
  created_at?: string | null;
};

type Props = {
  items: InvestorType[];
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  from: number;
  to: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  onDelete: (item: InvestorType) => void;
  onToggle: (item: InvestorType) => void;
  onRefresh: () => void;
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function InvestorTypeTable({
  items,
  loading,
  page,
  perPage,
  total,
  from,
  to,
  lastPage,
  onPageChange,
  onDelete,
  onToggle,
  onRefresh,
}: Props) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-700 min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 text-gray-900 text-left border-b border-gray-100">
              {["S.No", "Name", "Code", "Status", "Created", "Actions"].map((head) => (
                <th key={head} className="px-4 py-4 font-medium tracking-tight">
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-gray-400 font-medium">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-2 align-middle"></div>
                  Fetching investor types...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-gray-400 font-medium">
                  No investor types match your search.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const serialNo = (page - 1) * perPage + index + 1;
                return (
                  <tr key={item.unique_id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-400">{serialNo}</td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-gray-400 font-medium">{item.description}</div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-medium border">
                        {item.unique_id}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => onToggle(item)}
                        className={`text-sm font-semibold ${item.status === "active" ? "text-green-600" : "text-red-600"}`}
                      >
                        {item.status}
                      </button>
                    </td>

                    <td className="px-4 py-4 text-[13px] text-gray-500">{formatDate(item.created_at)}</td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/loan/investor-type/add?id=${item.unique_id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>

                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>

                        <button
                          onClick={onRefresh}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 py-3 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b> investor types
          </p>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Page <b>{page}</b> of <b>{lastPage}</b>
            </span>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                disabled={page === lastPage}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}