"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Package, Tag, IndianRupee, Layers, ArrowLeft,
  ShoppingCart, Box, CheckCircle, AlertCircle
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

export default function ProductViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("No product ID provided");
      router.push("/loan/products");
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await axiosInstance.get(ProjectApiList.LOAN_READY_PRODUCT_CATALOG);
        if (res.data.success) {
          const found = (res.data.data.products || []).find(
            (p: any) => p.product_unique_id === id
          );
          if (found) {
            setProduct(found);
          } else {
            toast.error("Product not found");
          }
        }
      } catch {
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleStartLoan = () => {
    router.push(`/loan/caf/createCAF?product_id=${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Package className="w-16 h-16" />
        <p className="text-sm">Product not found.</p>
        <button onClick={() => router.push("/loan/products")} className="text-blue-600 text-sm hover:underline">
          Back to Products
        </button>
      </div>
    );
  }

  const hasStock = product.stock > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/loan/products")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        {hasStock ? (
          <button
            onClick={handleStartLoan}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> Start Loan
          </button>
        ) : (
          <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-5 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" /> Stock Not Available
          </span>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-56 h-48 md:h-auto bg-gray-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
            <Package className="w-20 h-20 text-gray-300" />
          </div>
          <div className="p-6 flex-1 space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 capitalize">{product.product_name}</h1>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> {product.product_unique_id} · SKU: {product.product_sku_code}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {product.category?.name && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Category</p>
                  <p className="text-sm text-gray-800 flex items-center gap-1 mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-gray-400" /> {product.category.name}
                  </p>
                </div>
              )}
              {product.brand?.name && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Brand</p>
                  <p className="text-sm text-gray-800 mt-0.5">{product.brand.name}</p>
                </div>
              )}
              {product.unit?.unit_name && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Unit</p>
                  <p className="text-sm text-gray-800 mt-0.5">{product.unit.unit_name} ({product.unit.short_name})</p>
                </div>
              )}
              {product.selling_price > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Selling Price</p>
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-0.5 mt-0.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {Number(product.selling_price).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              {product.gst_percent > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">GST</p>
                  <p className="text-sm text-gray-800 mt-0.5">{product.gst_percent}%</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Stock</p>
                <p className={`text-sm font-medium mt-0.5 flex items-center gap-1 ${hasStock ? "text-blue-700" : "text-red-500"}`}>
                  <Box className="w-3.5 h-3.5" /> {product.stock} {product.unit?.short_name}
                </p>
              </div>
            </div>

            {product.description && (
              <p className="text-sm text-gray-500 border-t border-gray-100 pt-3">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Variant Stock */}
      {product.stock_details?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Box className="w-4 h-4 text-gray-400" /> Stock by Variant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {product.stock_details.map((variant: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-600">{variant.attribute_summary}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  variant.quantity > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-500"
                }`}>
                  {variant.quantity} {product.unit?.short_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      {product.attribute_definitions?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" /> Product Attributes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {product.attribute_definitions.map((attr: any) => (
              <div key={attr.attribute_id}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">{attr.attribute_name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {attr.values.map((val: string) => (
                    <span key={val} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className={`border rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        hasStock ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
      }`}>
        <div className="flex items-center gap-3">
          {hasStock ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">
              {hasStock ? "Product is available for loan" : "This product is currently out of stock"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasStock
                ? "Click Start Loan to begin a CAF application for this product."
                : "Please check back later or choose a different product."}
            </p>
          </div>
        </div>
        {hasStock ? (
          <button
            onClick={handleStartLoan}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <ShoppingCart className="w-4 h-4" /> Start Loan
          </button>
        ) : (
          <span className="flex items-center gap-2 bg-red-100 border border-red-200 text-red-600 text-sm font-medium px-6 py-2.5 rounded-lg shrink-0">
            <AlertCircle className="w-4 h-4" /> Stock Not Available
          </span>
        )}
      </div>
    </div>
  );
}
