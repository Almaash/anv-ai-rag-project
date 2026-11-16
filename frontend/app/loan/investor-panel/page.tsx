"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Search, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

interface Investment {
  id: number;
  unique_id: string;
  cms_admin_id?: string;
  investor?: {
    first_name: string;
    last_name: string;
    mobile: string;
  };
  amount: string | number;
  date: string;
  rate: string | number;
  yearly: string | number;
  maturity: string | number;
  lockin: string;
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function InvestorPanelPage() {
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);


  const fetchInvestments = async () => {
    setLoading(true);

    try {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem("user")
          : null;

      const user = stored ? JSON.parse(stored) : null;
      const investorRole = user?.role === "investor";
      setIsInvestor(investorRole);
      const branchId = user?.branch_id || user?.branch || undefined;
      const cmsAdminId = user?.cms_admin || user?.created_by || undefined;
      const isInvestor = user?.role === "investor";

      const res = await axiosInstance.get(
        ProjectApiList.GET_INVESTOR_INVESTMENTS,
        {
          params: {
            branch_id: branchId,

            ...(isInvestor
              ? {
                investor_unique_id: user?.unique_id,
              }
              : {
                cms_admin_id: cmsAdminId,
              }),
          },
        }
      );

      setInvestments(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load investments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const filteredInvestments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investments;

    return investments.filter((inv) => {
      const name = `${inv.investor?.first_name || ""} ${inv.investor?.last_name || ""}`.toLowerCase();
      const mobile = (inv.investor?.mobile || "").toLowerCase();
      const amount = String(inv.amount).toLowerCase();
      const date = (inv.date || "").toLowerCase();

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        amount.includes(q) ||
        date.includes(q)
      );
    });
  }, [investments, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInvestments.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvestments.slice(start, start + itemsPerPage);
  }, [filteredInvestments, currentPage, itemsPerPage]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);

    try {
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_INVESTOR_INVESTMENT}/${deleteId}`);
      toast.success("Investment deleted successfully");
      setDeleteId(null);
      fetchInvestments();
    } catch (error) {
      toast.error("Failed to delete investment");
    } finally {
      setDeleteLoading(false);
    }
  };

  const showingFrom = filteredInvestments.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = filteredInvestments.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, filteredInvestments.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Investment Panel</h1>

        {!isInvestor && (

          <Button
            onClick={() => router.push("/loan/investor-panel/add")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            <Plus size={18} className="mr-1" /> Add Investment
          </Button>
        )}

      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">{filteredInvestments.length} records found</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search by name, mobile, or amount"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-72 pl-10 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["S.No", "Investor Name", "Amount", "Date", "Target %", "Yearly", "Maturity", "Actions"].map((head) => (
                    <th key={head} className="px-4 py-3 border-b text-gray-600 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 uppercase text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10">
                      <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                      <p className="mt-2 text-xs text-gray-500">Loading investments...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-500">No records found</td>
                  </tr>
                ) : (
                  currentItems.map((inv, index) => {
                    const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={inv.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500">{serialNo}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{inv.investor?.first_name} {inv.investor?.last_name}</div>
                          <div className="text-[11px] text-gray-400 lowercase">{inv.investor?.mobile}</div>
                        </td>
                        {/* <td className="px-4 py-3 text-gray-600 font-medium">{inv.cms_admin_id || "-"}</td> */}
                        <td className="px-4 py-3 font-semibold text-gray-900">{money(inv.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(inv.date).toLocaleDateString("en-GB")}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold">
                            {inv.rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-medium">{money(inv.yearly)}</td>
                        <td className="px-4 py-3 text-gray-600 font-medium">{money(inv.maturity)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/loan/investor-panel/view?id=${inv.unique_id}`)}
                              className="px-3 py-1.5 rounded-md bg-white border border-blue-100 text-xs text-blue-600 shadow-sm hover:bg-blue-50"
                            >
                              <div className="flex items-center gap-1.5 font-normal"><Eye size={14} /> <span>View</span></div>
                            </button>
                            {/* <button
                              onClick={() => router.push(`/loan/investor-panel/edit?id=${inv.unique_id}`)}
                              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1.5 font-normal"><Edit2 size={14} /> <span>Edit</span></div>
                            </button> */}

                            {!isInvestor && (
                              <button
                                onClick={() => setDeleteId(inv.unique_id as any)}
                                className="px-3 py-1.5 rounded-md bg-white border border-red-100 text-xs text-red-500 shadow-sm hover:bg-red-50"
                              >
                                <div className="flex items-center gap-1.5 font-normal"><Trash2 size={14} /> <span>Delete</span></div>
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

          {filteredInvestments.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-gray-50 text-[13px] border-t">
              <p className="text-gray-500">Showing <b>{showingFrom}</b> – <b>{showingTo}</b> of <b>{filteredInvestments.length}</b> records</p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-1.5 bg-white border text-gray-600 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-1.5 bg-white border text-gray-600 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SimpleConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this investor investment? This action cannot be undone."
        confirmText={deleteLoading ? "Processing..." : "Delete Investment"}
        onConfirm={handleDelete}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
}


