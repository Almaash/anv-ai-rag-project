"use client";

import React, { useEffect, useState } from "react";
import { Database, Loader2, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { BASE_URL } from "@/app/api/BaseUrl";

type AttributeDefinition = {
  attribute_id: number;
  attribute_unique_id: string;
  attribute_name: string;
  category_id: number | null;
  category_scope: "global" | "category_specific";
  values: string[];
};

type LoanReadyProduct = {
  product_id: number;
  product_unique_id: string;
  product_name: string;
  product_sku_code: string;
  description: string | null;
  selling_price: number;
  gst_percent: number;
  stock: number;
  status: string;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
  unit: { id: number; unit_name: string; short_name: string } | null;
  product_images: string[];
  stock_details: { attribute_summary: string; quantity: number }[];
  variant_options?: {
    attribute_summary: string;
    available_stock: number;
    variant_price?: number;
    purchase_price?: number;
    gst_percent?: number;
  }[];
  attribute_definitions: AttributeDefinition[];
};

type LoanReadyCatalogResponse = {
  total_products: number;
  products: LoanReadyProduct[];
};

export default function LoanProductCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<LoanReadyCatalogResponse | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.LOAN_READY_PRODUCT_CATALOG);
      if (res.data.success) {
        setCatalog(res.data.data);
      } else {
        toast.error("Failed to load API preview");
      }
    } catch (error) {
      toast.error("Failed to load API preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/40">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Loan Product API Preview</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Inventory Master Setup
            </p>
          </div>

          <Button
            type="button"
            onClick={fetchCatalog}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-10 px-4 text-xs font-bold uppercase tracking-widest shadow-sm"
          >
            <RefreshCw size={14} className="mr-2" /> Refresh API
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Database size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">API Endpoint</p>
              <p className="text-xs text-slate-500 font-mono">GET /inventory/product-masters/loan-ready-catalog</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-white py-20 text-center text-slate-400 shadow-sm">
            <Loader2 className="mx-auto mb-3 animate-spin" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest">Loading API response...</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900">Response Summary</p>
              <p className="mt-2 text-sm text-slate-600">
                Total products: <span className="font-bold text-slate-900">{catalog?.total_products || 0}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(catalog?.products || []).map((product) => (
                <div key={product.product_id} className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-blue-600" />
                        <h2 className="text-base font-bold text-slate-900">{product.product_name}</h2>
                      </div>
                      <p className="text-xs font-mono text-slate-500">{product.product_sku_code}</p>
                      <p className="text-sm text-slate-600">{product.description || "No description"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[320px]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</p>
                        <p className="font-semibold text-slate-700">{product.category?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Brand</p>
                        <p className="font-semibold text-slate-700">{product.brand?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit</p>
                        <p className="font-semibold text-slate-700">{product.unit?.short_name || product.unit?.unit_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">GST</p>
                        <p className="font-semibold text-slate-700">{product.gst_percent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price</p>
                        <p className="font-semibold text-slate-700">Rs. {product.selling_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock</p>
                        <p className="font-semibold text-slate-700">{product.stock}</p>
                      </div>
                    </div>
                  </div>

                  {/* Product Images Section */}
                  {product.product_images && product.product_images.length > 0 && (
                    <div className="mt-5 border-t pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Product Images</p>
                      <div className="flex flex-wrap gap-4">
                        {product.product_images.map((img, idx) => (
                          <div key={idx} className="relative group overflow-hidden rounded-lg border bg-slate-50 w-24 h-24 sm:w-32 sm:h-32 shadow-sm transition-all hover:border-blue-300">
                            <img
                              src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "http://localhost:8000"}/${img}`}
                              alt={`Product ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <a
                              href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "http://localhost:8000"}/${img}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <span className="text-[10px] font-bold text-white bg-blue-600/80 px-2 py-1 rounded">View Full</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.stock_details.length > 0 && (
                    <div className="mt-5 border-t pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Stock Breakdown (by Attributes)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {product.stock_details.map((detail, idx) => (
                          <div key={idx} className="rounded-lg border bg-slate-50 p-2 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate" title={detail.attribute_summary || "Base"}>
                              {detail.attribute_summary || "Standard"}
                            </p>
                            <p className="text-sm font-bold text-blue-600">{detail.quantity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.variant_options && product.variant_options.length > 0 && (
                    <div className="mt-5 border-t pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Variant Prices (Attribute Wise)</p>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="text-left px-3 py-2">Attributes</th>
                              <th className="text-right px-3 py-2">Stock</th>
                              <th className="text-right px-3 py-2">Buying Price</th>
                              <th className="text-right px-3 py-2">Selling Price</th>
                              <th className="text-right px-3 py-2">GST</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.variant_options.map((variant, idx) => (
                              <tr key={`${product.product_id}-variant-${idx}`} className="border-t">
                                <td className="px-3 py-2 text-slate-700">{variant.attribute_summary || "Default"}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-700">{variant.available_stock}</td>
                                <td className="px-3 py-2 text-right text-slate-700">Rs. {Number(variant.purchase_price || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">Rs. {Number(variant.variant_price || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-slate-600">{Number(variant.gst_percent || 0).toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 border-t pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Applicable Attributes</p>
                    {product.attribute_definitions.length > 0 ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {product.attribute_definitions.map((attribute) => (
                          <div key={attribute.attribute_id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-slate-800">{attribute.attribute_name}</p>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 border">
                                {attribute.category_scope === "global" ? "Global" : "Category"}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {attribute.values.length > 0 ? (
                                attribute.values.map((value) => (
                                  <span
                                    key={`${attribute.attribute_id}-${value}`}
                                    className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100"
                                  >
                                    {value}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">No values configured</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">No attribute definitions linked to this product yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900 mb-3">Raw API Response</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(catalog, null, 2)}
              </pre>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
