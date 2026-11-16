"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ShoppingCart, User, Loader2, Search, CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface Product {
  id: number;
  unique_id: string;
  name: string;
  sku_code: string;
  selling_price: number;
  current_stock: number;
  variant_batches: {
    purchase_item_id: number;
    attribute_summary: string;
    available_stock: number;
  }[];
}

export default function DirectSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    product_id: "",
    purchase_item_id: "",
    quantity: 1,
    selling_price: 0,
    sale_source: "inventory",
    customer_reference: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_AVAILABLE_PRODUCTS);
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load products", err);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      setSelectedProduct(product);
      setSelectedVariantId("");
      setFormData({
        ...formData,
        product_id: product.id.toString(),
        purchase_item_id: "",
        selling_price: product.selling_price || 0,
        quantity: 1
      });
    }
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setFormData({
      ...formData,
      purchase_item_id: variantId
    });
  };

  const getSelectedVariant = () => {
    if (!selectedProduct || !selectedVariantId) return null;
    return selectedProduct.variant_batches.find(v => v.purchase_item_id.toString() === selectedVariantId);
  };

  const validate = () => {
    if (!formData.product_id) return "Please select a product";
    if (!formData.purchase_item_id) return "Please select a variant/batch";
    if (formData.quantity <= 0) return "Quantity must be greater than 0";
    
    const variant = getSelectedVariant();
    if (variant && formData.quantity > variant.available_stock) {
      return `Insufficient stock! Only ${variant.available_stock} available.`;
    }
    
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post(ProjectApiList.DIRECT_SALE, formData);
      if (res.data.success) {
        toast.success("Sale recorded successfully!");
        router.push("/inventory/sales-list");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm border border-slate-100">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Direct Issue / Sale</h1>
              <p className="text-sm text-slate-500 font-medium">Sell or issue products directly from inventory</p>
            </div>
          </div>
          <Button onClick={() => router.push("/inventory/sales-list")} variant="outline" className="rounded-xl border-blue-100 text-blue-600 font-bold hover:bg-blue-50">
            <History size={16} className="mr-2" /> View Sales History
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 text-left">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <ShoppingCart size={14} /> Product Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Pick Product</Label>
                  <Select onValueChange={handleProductSelect} value={formData.product_id}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-blue-500/10 bg-white">
                      <SelectValue placeholder={productsLoading ? "Loading products..." : "Select a product"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-white border border-slate-200 shadow-xl z-50">
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-bold">{p.name}</span>
                            <span className="text-[10px] text-slate-400">SKU: {p.sku_code || 'N/A'} | Price: ₹{p.selling_price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">Select Variant / Batch</Label>
                      <Select onValueChange={handleVariantSelect} value={formData.purchase_item_id}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm">
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white border border-slate-200 shadow-xl z-50">
                          {selectedProduct.variant_batches.map(v => (
                            <SelectItem key={v.purchase_item_id} value={v.purchase_item_id.toString()}>
                              <div className="flex justify-between items-center w-full min-w-[200px]">
                                <span className="font-medium">{v.attribute_summary || 'Default'}</span>
                                <span className={`ml-4 text-[10px] font-bold px-2 py-0.5 rounded ${v.available_stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                  Stock: {v.available_stock}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Quantity to Issue</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          value={formData.quantity} 
                          onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                          className="h-12 rounded-xl border-slate-200 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Unit Price (₹)</Label>
                        <Input 
                          type="number" 
                          value={formData.selling_price} 
                          onChange={e => setFormData({...formData, selling_price: Number(e.target.value)})}
                          className="h-12 rounded-xl border-slate-200 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
               <CardHeader className="bg-white border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <User size={14} /> Customer & Source
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Sale Source</Label>
                    <Select onValueChange={v => setFormData({...formData, sale_source: v})} value={formData.sale_source}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white border border-slate-200 shadow-xl z-50">
                        <SelectItem value="inventory">Inventory Direct</SelectItem>
                        <SelectItem value="loan">Loan Issue</SelectItem>
                        <SelectItem value="internal">Internal Use</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Customer Ref (Optional)</Label>
                    <Input 
                      placeholder="e.g. Loan #123 or Name" 
                      value={formData.customer_reference}
                      onChange={e => setFormData({...formData, customer_reference: e.target.value})}
                      className="h-12 rounded-xl border-slate-200"
                    />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 text-left">
            <Card className="rounded-2xl border-slate-200 shadow-sm bg-blue-600 text-white overflow-hidden border-none text-center p-8">
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Total Amount</p>
                  <h2 className="text-4xl font-black">₹ {(formData.quantity * formData.selling_price).toLocaleString()}</h2>
                  <div className="pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={loading || !selectedProduct} 
                      className="w-full h-14 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={20} />}
                      Confirm Sale
                    </Button>
                  </div>
               </div>
            </Card>

            {selectedProduct && selectedVariantId && (
              <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden p-6 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Variant Meta Data</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                    <span className="text-slate-400">Available Stock</span>
                    <span className="text-blue-600">{getSelectedVariant()?.available_stock || 0} units</span>
                  </div>
                   <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                    <span className="text-slate-400">New Stock Level</span>
                    <span className="text-slate-900">{(getSelectedVariant()?.available_stock || 0) - (formData.quantity || 0)} units</span>
                  </div>
                   <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                    <span className="text-slate-400">Batch Ref</span>
                    <span className="text-slate-900">#{selectedVariantId}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
