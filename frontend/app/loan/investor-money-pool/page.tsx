"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Badge } from "@/components/ui/badge";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

/* ================= TYPES ================= */

interface MoneyPool {
  id: number;
  unique_id: string;
  name: string;
  limit_from: string;
  limit_to: string;
  notes: string | null;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

const PER_PAGE = 10;

/* ================= COMPONENT ================= */

export default function MoneyPoolListPage() {
  const router = useRouter();

  const [items, setItems] = useState<MoneyPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ================= FETCH ================= */

  const fetchData = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
      const branchId = user?.branch || user?.branch_id || undefined;

      const res = await axiosInstance.get(ProjectApiList.GET_MONEY_POOLS, {
        params: {
          search:    search || undefined,
          page:      pageNumber,
          per_page:  PER_PAGE,
          branch_id: branchId,
        },
      });

      if (res.data.success) {
        setItems(res.data.data || []);
        setPagination(res.data.pagination || null);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error("Failed to load money pools", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      const res = await axiosInstance.delete(
        `${ProjectApiList.DELETE_MONEY_POOL}/${deleteId}`
      );

      if (res.data.success) {
        toast.success("Money pool deleted successfully");
        setDeleteId(null);
        fetchData(page);
      }
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete money pool");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= FALLBACK PAGINATION ================= */

  const paginationInfo = pagination || {
    current_page: page,
    per_page: PER_PAGE,
    total: items.length,
    last_page: 1,
    from: items.length ? 1 : 0,
    to: items.length,
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Investor Money Pool
          </h1>
          <p className="text-sm text-gray-500">
            Manage multi-investor money pools.
          </p>
        </div>

        <Link href="/loan/investor-money-pool/add">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
            <Plus size={16} /> Add Money Pool
          </button>
        </Link>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            {paginationInfo.total ?? 0} record
            {(paginationInfo.total ?? 0) === 1 ? "" : "s"} found
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={() => fetchData(1)}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">S.No</th>
                {/* <th className="px-4 py-3 font-semibold"># ID</th> */}
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Limit Range
                </th>
                <th className="px-4 py-3 font-semibold text-center">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y border-t">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                items.map((pool, index) => (
                  <tr
                    key={pool.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* ✅ S.No */}
                    <td className="px-4 py-3">
                      {(page - 1) * PER_PAGE + index + 1}
                    </td>

                    {/* ID */}
                    {/* <td className="px-4 py-3 font-medium text-blue-600">
                      <div>#{pool.id}</div>
                      <div className="text-[10px] text-gray-400 uppercase">
                        {pool.unique_id}
                      </div>
                    </td> */}

                    {/* NAME */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {pool.name}
                      </div>
                      {pool.notes && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {pool.notes}
                        </div>
                      )}
                    </td>

                    {/* LIMIT */}
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{Number(pool.limit_from).toLocaleString("en-IN")} - ₹
                      {Number(pool.limit_to).toLocaleString("en-IN")}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          pool.status
                            ? "bg-green-100 text-green-700 px-3 py-1"
                            : "bg-red-100 text-red-700 px-3 py-1"
                        }
                      >
                        {pool.status ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/loan/investor-money-pool/add?id=${pool.id}`
                            )
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          onClick={() => setDeleteId(pool.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* DELETE DIALOG */}
        <SimpleConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Money Pool"
          message="Are you sure you want to delete this money pool?"
          loading={loading}
          destructive
        />

        {/* PAGINATION */}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {pagination.from} to {pagination.to} of{" "}
              {pagination.total} entries
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={page === 1 || loading}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() => fetchData(page + 1)}
                disabled={page === pagination.last_page || loading}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}