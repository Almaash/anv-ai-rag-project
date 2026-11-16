"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import { Badge } from "@/components/ui/badge";

interface PurchaseItemRow {
  id: number;
  quantity: number | string;
  product_master?: {
    id: number;
    name: string;
    sku_code?: string;
  } | null;
}

interface PurchaseRow {
  id: number;
  unique_id: string;
  status?: string;
  purchase_date: string;
  total_amount: number | string;
  discount_type?: "percentage" | "fixed" | string;
  discount_value?: number | string;
  paid_amount?: number | string;
  due_amount?: number | string;
  payment_status?: "paid" | "partial" | "unpaid" | string;
  payment_method?: string | null;
  vendor?: {
    id: number;
    name: string;
    business_name?: string | null;
  } | null;
  latest_invoice?: {
    id: number;
    invoice_no?: string;
  } | null;
  items?: PurchaseItemRow[];
}

const asNumber = (value: number | string | null | undefined) => Number(value || 0);

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(asNumber(value));

export default function ProductListPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_PURCHASES);
      if (res.data.success) {
        setPurchases(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch {
      toast.error("Failed to load purchase records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchases;

    return purchases.filter((purchase) => {
      const vendorText = (purchase.vendor?.business_name || purchase.vendor?.name || "").toLowerCase();
      const productText = (purchase.items || [])
        .map((item) => item.product_master?.name || item.product_master?.sku_code || "")
        .join(" ")
        .toLowerCase();

      return (
        (purchase.unique_id || "").toLowerCase().includes(q) ||
        (purchase.purchase_date || "").toLowerCase().includes(q) ||
        (purchase.payment_method || "").toLowerCase().includes(q) ||
        vendorText.includes(q) ||
        productText.includes(q)
      );
    });
  }, [purchases, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const showingFrom = filteredPurchases.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = filteredPurchases.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, filteredPurchases.length);

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return <Badge className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Paid</Badge>;
    if (s === "partial") return <Badge className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Partial</Badge>;
    return <Badge className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">Unpaid</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Inventory</h1>
        <Button
          onClick={() => router.push("/inventory/products/add")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          + Add Purchase
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">{filteredPurchases.length} records found</p>
          <Input
            placeholder="Search by ID, vendor, or product"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-72 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["S.No", "Vendor", "Date", "Total", "Paid", "Due", "Status", "Actions"].map((head) => (
                    <th key={head} className="px-4 py-3 border-b">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10">
                      <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                      <p className="mt-2 text-xs text-gray-500">Loading purchases...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-500">No records found</td>
                  </tr>
                ) : (
                  currentItems.map((purchase, index) => {
                    const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                    const total = money(purchase.total_amount);
                    const paid = money(purchase.paid_amount);
                    const due = money(purchase.due_amount);
                    return (
                      <tr key={purchase.id} className="hover:bg-blue-50">
                        <td className="px-4 py-3">{serialNo}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{purchase.vendor?.business_name || purchase.vendor?.name || "Walk-in"}</td>
                        <td className="px-4 py-3 text-gray-700">{purchase.purchase_date}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{total}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">{paid}</td>
                        <td className="px-4 py-3 text-red-600">{due}</td>
                        <td className="px-4 py-3">{getStatusBadge(purchase.payment_status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                const viewId = purchase.unique_id || purchase.id;
                                if (!viewId) {
                                  toast.error("Purchase ID not found");
                                  return;
                                }
                                router.push(`/inventory/purchase/invoice?id=${viewId}`);
                              }}
                              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1"><Eye size={14} /> <span>View</span></div>
                            </button>
                            <button
                              onClick={() => router.push(`/inventory/products/add?id=${purchase.unique_id}`)}
                              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1"><Edit2 size={14} /> <span>Edit</span></div>
                            </button>
                            <button
                              onClick={() => setDeleteId(String(purchase.unique_id))}
                              className="px-3 py-1.5 rounded-md bg-white border border-red-200 text-xs text-red-600 shadow-sm hover:bg-red-50"
                            >
                              <div className="flex items-center gap-1"><Trash2 size={14} /> <span></span></div>
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

          {filteredPurchases.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-gray-50 text-sm">
              <p>Showing <b>{showingFrom}</b> – <b>{showingTo}</b> of <b>{filteredPurchases.length}</b> records</p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
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
        title="Delete Purchase?"
        message="Are you sure you want to delete this purchase record?"
        confirmText={deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={async () => {
          if (!deleteId) return;
          setDeleteLoading(true);
          try {
            const res = await axiosInstance.delete(`${ProjectApiList.DELETE_PURCHASE}/${deleteId}`);
            if (res.data?.success) {
              toast.success("Purchase archived successfully");
              setDeleteId(null);
              fetchPurchases();
            }
          } catch {
            toast.error("An error occurred during deletion");
          } finally {
            setDeleteLoading(false);
          }
        }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
}
