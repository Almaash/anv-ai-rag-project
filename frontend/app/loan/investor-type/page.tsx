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

interface InvestorType {
  id: number;
  unique_id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
}

const PER_PAGE = 10;

/* ================= COMPONENT ================= */

export default function InvestorTypePage() {
  const router = useRouter();

  const [items, setItems] = useState<InvestorType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
      const branchId = user?.branch || user?.branch_id || undefined;
      const cmsAdminId = user?.cms_admin || user?.user_id || undefined;

      const res = await axiosInstance.get(ProjectApiList.GET_INVESTOR_TYPES, {
        params: { branch_id: branchId, cms_admin_id: cmsAdminId },
      });

      if (res.data.success) {
        setItems(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load investor types", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= FILTER ================= */

  const filtered = (items || []).filter((item) => {
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.unique_id.toLowerCase().includes(term)
    );
  });

  /* ================= PAGINATION ================= */

  const start = (page - 1) * PER_PAGE;
  const paginatedItems = filtered.slice(start, start + PER_PAGE);

  /* ================= DELETE ================= */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      const res = await axiosInstance.delete(
        `${ProjectApiList.DELETE_INVESTOR_TYPE}/${deleteId}`
      );

      if (res.data.success) {
        toast.success("Deleted successfully");
        setDeleteId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Investor Type
          </h1>
          <p className="text-sm text-gray-500">
            Manage investor types.
          </p>
        </div>

        <Link href="/loan/investor-type/add">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus size={16} /> Add Investor Type
          </button>
        </Link>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {filtered.length} record
            {filtered.length !== 1 && "s"} found
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">S.No</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Description</th>
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
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : (paginatedItems?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {/* S.NO */}
                    <td className="px-4 py-3">
                      {(page - 1) * PER_PAGE + index + 1}
                    </td>

                    {/* NAME */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.unique_id}
                      </div>
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-4 py-3 text-gray-500">
                      {item.description || "—"}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          item.status === "active"
                            ? "bg-green-100 text-green-700 px-3 py-1"
                            : "bg-red-100 text-red-700 px-3 py-1"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/loan/investor-type/add?id=${item.unique_id}`
                            )
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          onClick={() => setDeleteId(item.unique_id)}
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

        {/* DELETE MODAL */}
        <SimpleConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Investor Type"
          message="Are you sure you want to delete this investor type?"
          loading={loading}
          destructive
        />
      </div>
    </div>
  );
}