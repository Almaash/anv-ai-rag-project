"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface BasicInfo {
  id: number;
  unique_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  mobile: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  pan_number: string;
  aadhaar_number?: string | null;
  current_address: string;
  permanent_address: string;
  profile_photo?: string | null;
  created_at?: string;
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

export default function InvestorBasicInfoListPage() {
  const router = useRouter();
  const [items, setItems] = useState<BasicInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isInvestor, setIsInvestor] = useState(false);

  const fetchData = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = stored ? JSON.parse(stored) : null;
      const investorRole = user?.role === "investor";
      setIsInvestor(investorRole);
      const branchId = user?.branch_id || user?.branch || undefined;
      const cmsAdminId = user?.cms_admin || user?.created_by || undefined;
      const isInvestor = user?.role === "investor";
      const isInvestorUser = user?.role === "investor";

      const res = await axiosInstance.get(
        ProjectApiList.GET_INVESTOR_BASIC_INFO,
        {
          params: {
            search: search || undefined,
            page: pageNumber,
            per_page: PER_PAGE,
            branch_id: branchId,

            // Staff/Admin filter
            ...(isInvestor
              ? {
                unique_id: user?.unique_id,
              }
              : {
                cms_admin_id: cmsAdminId,
              }),
          },
        }
      );

      if (res.data.success) {
        setItems(res.data.data || []);
        setPagination(res.data.pagination || null);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error("Failed to load investor basic info", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]); // Re-fetch on search change

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_INVESTOR_BASIC_INFO}/${deleteId}`);
      if (res.data.success) {
        toast.success("Record deleted");
        setDeleteId(null);
        fetchData(page);
      }
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const paginationInfo = pagination || {
    current_page: page,
    per_page: PER_PAGE,
    total: items.length,
    last_page: 1,
    from: items.length ? 1 : 0,
    to: items.length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-800">Investor Management</h1>
          <p className="text-sm text-gray-500">Manage investor KYC and basic information records.</p>
        </div>

        {!isInvestor && (

          <div className="flex items-center gap-3">
            <Link href="/loan/investor-basic-info/add">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                <Plus size={16} /> Add Investor
              </button>
            </Link>
          </div>
        )}


      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600 font-medium">
            {paginationInfo.total ?? 0} investor{(paginationInfo.total ?? 0) === 1 ? "" : "s"} found
          </div>

          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, mobile or PAN..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b font-medium text-left">S.No</th>
                  <th className="px-4 py-3 border-b font-medium text-left">Name</th>
                  <th className="px-4 py-3 border-b font-medium text-left">Mobile</th>
                  <th className="px-4 py-3 border-b font-medium text-left">PAN/Aadhar</th>
                  <th className="px-4 py-3 border-b font-medium text-left">Created</th>
                  <th className="px-4 py-3 border-b font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic-rows-removed">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                        <span className="text-xs font-semimedium">Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-xs font-semimedium uppercase">No records found</p>
                    </td>
                  </tr>
                ) : (
                  items.map((inv, index) => {
                    const serialNo = (paginationInfo.current_page - 1) * paginationInfo.per_page + index + 1;
                    return (
                      <tr key={inv.unique_id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-3 text-gray-500 font-medium">{serialNo}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 leading-tight">
                              {inv.first_name} {inv.middle_name ? `${inv.middle_name} ` : ""}{inv.last_name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-semimedium">{inv.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-semimedium">{inv.mobile}</td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-medium text-gray-700 tracking-tight">{inv.pan_number}</div>
                          <div className="text-[10px] text-gray-400 font-semimedium uppercase">{inv.aadhaar_number || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-[11px]">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/loan/investor-basic-info/view?id=${inv.unique_id}`)}
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-medium flex items-center gap-1 hover:bg-blue-100 transition-colors"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => router.push(`/loan/investor-basic-info/add?id=${inv.unique_id}`)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            {!isInvestor && (
                              <button
                                onClick={() => setDeleteId(inv.unique_id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {paginationInfo.total > 0 && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 bg-gray-50 border-t">
              <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                Showing <b>{paginationInfo.from ?? 0}</b> – <b>{paginationInfo.to ?? 0}</b> of <b>{paginationInfo.total ?? 0}</b>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchData(Math.max(1, page - 1))}
                  disabled={loading || page <= 1}
                  className="px-3 py-1 text-xs font-medium border border-gray-200 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
                >
                  Prev
                </button>
                <div className="px-3 py-1 text-[11px] font-black text-blue-600 bg-blue-50 rounded-md border border-blue-100">
                  {paginationInfo.current_page} / {paginationInfo.last_page}
                </div>
                <button
                  onClick={() => fetchData(Math.min(paginationInfo.last_page, page + 1))}
                  disabled={loading || page >= paginationInfo.last_page}
                  className="px-3 py-1 text-xs font-medium border border-gray-200 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 border border-red-50 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Confirm Removal</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed px-4">
                Are you sure you want to remove this investor? All associated data will be permanently purged.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full py-2.5 text-xs font-black text-white rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                {loading ? "Processing..." : "Purge Data"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="w-full py-2.5 text-xs font-black text-gray-400 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
