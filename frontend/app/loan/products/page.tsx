"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Tag, IndianRupee, Layers, Eye, ShoppingCart } from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

type LoanReadyProduct = {
  product_id?: string;
  product_unique_id: string;
  product_name: string;
  product_sku_code?: string;
  selling_price?: number;
  gst_percent?: number;
  stock?: number;
  description?: string;
  category?: { name?: string };
  brand?: { name?: string };
  unit?: { short_name?: string };
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<LoanReadyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const branchId = user?.branch_id || user?.branch || undefined;
        const cmsAdminId = user?.cms_admin_id || user?.cms_admin || undefined;

        const params: Record<string, string> = {};
        if (branchId) params.branch_id = String(branchId);
        if (cmsAdminId) params.cms_admin_id = String(cmsAdminId);

        const res = await axiosInstance.get(ProjectApiList.LOAN_READY_PRODUCT_CATALOG, { params });
        if (res.data.success) {
          setProducts(res.data.data.products || []);
        } else {
          toast.error("Failed to load products");
        }
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDetails = (product: LoanReadyProduct) => {
    router.push(`/loan/products/view?id=${product.product_unique_id}&pid=${product.product_id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" /> Loan Ready Products
        </h1>
        <p className="text-sm text-gray-500 mt-1">Select a product to start a loan application.</p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-gray-400 gap-3">
          <Package className="w-16 h-16" />
          <p className="text-sm">No products available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => (
            <div
              key={product.product_id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="h-44 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                <Package className="w-16 h-16 text-gray-300" />
              </div>

              <div className="p-4 flex flex-col flex-1 gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {product.product_name}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {product.product_sku_code}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  {product.category?.name && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{product.category.name}</span>
                    </div>
                  )}
                  {product.brand?.name && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>{product.brand.name}</span>
                    </div>
                  )}
                  {(product.selling_price ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {Number(product.selling_price).toLocaleString("en-IN")}
                      </span>
                      {(product.gst_percent ?? 0) > 0 && (
                        <span className="text-gray-400">+ {product.gst_percent}% GST</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-gray-400" />
                    <span>Stock: {product.stock} {product.unit?.short_name}</span>
                  </div>
                </div>

                {product.description && (
                  <p className="text-gray-400 line-clamp-2 text-[11px]">{product.description}</p>
                )}

                <div className="mt-auto pt-2">
                  <button
                    onClick={() => handleDetails(product)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}