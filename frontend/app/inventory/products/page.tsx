"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Info, 
  Tag, 
  Layers, 
  Activity, 
  DollarSign, 
  Box, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

interface Product {
  id: number;
  variant_key: string;
  product_id: string; // unique_id
  product_name: string;
  product_code: string;
  category: string;
  brand: string;
  price: number;
  stock_quantity: number;
  total_purchased: number;
  total_sold: number;
  description: string;
  attribute_summary: string;
  attributes: Record<string, string>;
}

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(ProjectApiList.GET_INVENTORY_PRODUCTS);
      const resData = res.data;
      const data = resData.success && Array.isArray(resData.data) ? resData.data : [];
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Failed to fetch products", err);
      toast.error("Failed to load product list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(query) ||
        p.product_code.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        (p.attribute_summary && p.attribute_summary.toLowerCase().includes(query))
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("product-details")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product List & Viewer</h1>
          <p className="text-slate-500 text-sm mt-1">Browse inventory products and view detailed specifications.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, code, category..."
            className="pl-10 bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-12 xl:col-span-7 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base font-semibold">Inventory Products</CardTitle>
            </div>
            <CardDescription>Click on a row to view full details below.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">Product Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Specification</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-center">In Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-4 text-slate-900"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4 text-slate-900"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4 text-slate-900"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4 text-slate-900 text-right"><div className="h-4 w-12 bg-slate-100 rounded ml-auto" /></td>
                        <td className="px-4 py-4 text-slate-900 text-center"><div className="h-4 w-8 bg-slate-100 rounded mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic">
                        No products found matches your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr 
                        key={product.variant_key}
                        onClick={() => handleProductSelect(product)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                          selectedProduct?.variant_key === product.variant_key ? "bg-blue-50/80 ring-1 ring-blue-100 ring-inset" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                           <div className="font-medium text-slate-900">{product.product_name}</div>
                           <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{product.category}</div>
                        </td>
                        <td className="px-4 py-4">
                           <span className="text-slate-600 font-medium">{product.attribute_summary || "Standard"}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 font-mono text-xs">{product.product_code}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                            product.stock_quantity <= 0 
                              ? "bg-red-50 text-red-700" 
                              : product.stock_quantity <= 5
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {product.stock_quantity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div id="product-details" className="lg:col-span-12 xl:col-span-5 space-y-6">
          {!selectedProduct ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-8 text-center animate-pulse">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Info className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600">No Product Selected</h3>
              <p className="text-slate-400 text-sm max-w-[250px] mt-2">
                Please select a product from the list to view its complete details and specifications.
              </p>
            </div>
          ) : (
            <>
              <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 shadow-md animate-in slide-in-from-right-4 duration-300">
                <CardHeader className="border-b border-blue-100 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="mb-2 bg-blue-600 hover:bg-blue-700">{selectedProduct.category}</Badge>
                      <CardTitle className="text-2xl font-bold text-slate-900 leading-tight">
                        {selectedProduct.product_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 font-mono mt-1">ID: {selectedProduct.product_id} | SKU: {selectedProduct.product_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(selectedProduct.price)}</p>
                      <p className="text-xs text-slate-500 font-medium">Selling Price</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Tag className="h-3 w-3" />
                        Brand
                      </div>
                      <p className="text-sm font-bold text-slate-800">{selectedProduct.brand}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Layers className="h-3 w-3" />
                        Category
                      </div>
                      <p className="text-sm font-bold text-slate-800">{selectedProduct.category}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Activity className="h-3 w-3" />
                        Total Purchased
                      </div>
                      <p className="text-sm font-bold text-blue-600">{selectedProduct.total_purchased} Units</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Box className="h-3 w-3" />
                        Total Sold
                      </div>
                      <p className="text-sm font-bold text-amber-600">{selectedProduct.total_sold} Units</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Activity className="h-3 w-3" />
                        Current Stock
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${selectedProduct.stock_quantity <= 0 ? "text-red-700" : "text-emerald-700"}`}>
                           {selectedProduct.stock_quantity} Units
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
                        <Box className="h-3 w-3" />
                        Stock Status
                      </div>
                      <p className={`text-sm font-bold ${selectedProduct.stock_quantity <= 5 ? "text-red-600" : "text-emerald-600"}`}>
                        {selectedProduct.stock_quantity <= 0 ? "Out of Stock" : selectedProduct.stock_quantity <= 5 ? "Low Stock" : "In Stock"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Description
                    </h4>
                    <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                      {selectedProduct.description || "No description available for this product."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-md">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-6">
                  {Object.keys(selectedProduct.attributes).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      {Object.entries(selectedProduct.attributes).map(([key, value]) => (
                        <div key={key} className="flex flex-col border-b border-slate-50 pb-2 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-medium text-slate-900 mt-0.5">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 italic text-sm">
                      No additional technical attributes found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

