"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

interface MasterOption {
  id: number;
  name: string;
  rate?: number;
}

interface UnitInfo {
  id: number;
  unit_name: string;
  short_name: string;
}

interface Product {
  id: number;
  unique_id: string;
  name: string;
  sku_code: string;
  status: "active" | "inactive";
  category: MasterOption | null;
  brand: MasterOption | null;
  unit?: UnitInfo | null;
}

export default function ProductMasterPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEditId, setConfirmEditId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_PRODUCT_MASTERS);
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch products failed", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.delete(
        `${ProjectApiList.DELETE_PRODUCT_MASTER}/${selectedProduct.id}`
      );
      if (res.data.success) {
        toast.success("Product deleted successfully");
        setIsDeleteModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      console.error("Delete product failed", err);
      toast.error("Delete failed");
    } finally {
      setFormLoading(false);
    }
  };

  const { currentItems, totalPages } = useMemo(() => {
    const filtered = products.filter((p) => {
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku_code.toLowerCase().includes(term) ||
        (p.category?.name || "").toLowerCase().includes(term) ||
        (p.brand?.name || "").toLowerCase().includes(term) ||
        (p.unit?.unit_name || "").toLowerCase().includes(term) ||
        (p.unit?.short_name || "").toLowerCase().includes(term)
      );
    });
    const total = Math.ceil(filtered.length / itemsPerPage) || 1;
    const items = filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { currentItems: items, totalPages: total };
  }, [products, search, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-slate-50/40">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg sm:hidden">
              <Package size={18} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Product Master</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Inventory Master
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative w-full sm:w-[280px] md:w-[340px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <Input
                placeholder="Search by name, SKU, category or brand..."
                className="pl-10 h-10 sm:h-11 border-slate-200 focus-visible:ring-black rounded-lg text-sm bg-white shadow-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <Button
              type="button"
              onClick={() => router.push("/inventory/master/product/add")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              <Plus size={16} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Table */}
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="h-10 px-6 text-left w-16">#</th>
                <th className="h-10 px-6 text-left">Product Name</th>
                <th className="h-10 px-6 text-left">SKU</th>
                <th className="h-10 px-6 text-left">Category</th>
                <th className="h-10 px-6 text-left">Brand</th>
                <th className="h-10 px-6 text-left">Unit</th>
                <th className="h-10 px-6 text-center">Status</th>
                <th className="h-10 px-6 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest"
                  >
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    Loading products...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((product, index) => (
                  <tr
                    key={product.unique_id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-900 font-bold text-xs italic">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-slate-900">
                        <span className="font-bold">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {product.sku_code}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {product.category?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {product.brand?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {product.unit?.short_name || product.unit?.unit_name || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          product.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/inventory/master/product/add?id=${product.unique_id}`)}
                          className="h-8 w-8 text-slate-400 hover:text-black hover:bg-slate-100"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest"
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t bg-slate-50/30 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 w-8 p-0 rounded-md border-slate-200"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 w-8 p-0 rounded-md border-slate-200"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <SimpleConfirmDialog
        open={confirmEditId !== null}
        onOpenChange={(open) => !open && setConfirmEditId(null)}
        title="Edit Product?"
        message="Do you want to open the product edit page now?"
        confirmText="Yes, Continue"
        onConfirm={() => {
          router.push(`/inventory/master/product/add?id=${confirmEditId}`);
          setConfirmEditId(null);
        }}
      />

      <SimpleConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Product?"
        message="Are you sure you want to mark this product as inactive? You can change it later by editing the product."
        confirmText={formLoading ? "Deleting..." : "Confirm Delete"}
        onConfirm={handleDelete}
        loading={formLoading}
        destructive
      />
    </div>
  );
}

