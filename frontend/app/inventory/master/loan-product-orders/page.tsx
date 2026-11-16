"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type CatalogAttribute = {
  attribute_id: number;
  attribute_name: string;
  values: string[];
};

type CatalogProduct = {
  product_unique_id: string;
  product_name: string;
  product_sku_code: string;
  stock: number;
  selling_price: number;
  unit_name?: string | null;
  unit_short_name?: string | null;
  category_name?: string | null;
  brand_name?: string | null;
  attributes: CatalogAttribute[];
  variant_options: {
    attribute_summary: string;
    available_stock: number;
  }[];
};

type LoanProductOrder = {
  id: number;
  order_code: string;
  product_unique_id: string;
  product_name: string;
  product_sku_code: string;
  attribute_summary: string | null;
  quantity: number;
  unit_price: number;
  total_cost: number;
  stock_before_order: number;
  stock_after_order: number;
  loan_detail: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

const formatLoanDetailValue = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text !== "" ? text : "-";
};

export default function LoanProductOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [orders, setOrders] = useState<LoanProductOrder[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loanDetailForm, setLoanDetailForm] = useState({
    loan_number: "",
    customer_name: "",
    mobile_number: "",
    remarks: "",
  });
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string>>({});
  const [selectedVariantSummary, setSelectedVariantSummary] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogRes, ordersRes] = await Promise.all([
        axiosInstance.get(ProjectApiList.LOAN_PRODUCT_ORDER_CATALOG),
        axiosInstance.get(ProjectApiList.LOAN_PRODUCT_ORDERS),
      ]);

      if (catalogRes.data.success) {
        setProducts(catalogRes.data.data?.products || []);
      }

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load loan product order data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_unique_id) === selectedProductId) || null,
    [products, selectedProductId]
  );

  useEffect(() => {
    setAttributeSelections({});
    setSelectedVariantSummary("");
    setQuantity("1");
  }, [selectedProductId]);

  const attributeSummary = useMemo(() => {
    if (!selectedProduct) return "";

    if (selectedProduct.variant_options?.length > 0) {
      return selectedVariantSummary;
    }

    return selectedProduct.attributes
      .map((attribute) => {
        const selectedValue = attributeSelections[String(attribute.attribute_id)];
        return selectedValue ? `${attribute.attribute_name}: ${selectedValue}` : null;
      })
      .filter(Boolean)
      .join(" | ");
  }, [selectedProduct, attributeSelections, selectedVariantSummary]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !selectedVariantSummary) return null;
    return (
      selectedProduct.variant_options?.find(
        (variant) => variant.attribute_summary === selectedVariantSummary
      ) || null
    );
  }, [selectedProduct, selectedVariantSummary]);

  useEffect(() => {
    if (!selectedVariant) return;
    const qty = Number(quantity || 0);
    if (qty > selectedVariant.available_stock) {
      setQuantity(String(selectedVariant.available_stock));
    }
  }, [selectedVariant, quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (selectedProduct.variant_options?.length > 0 && !selectedVariantSummary) {
      toast.error("Please select an attribute variant");
      return;
    }

    if (selectedVariant && qty > selectedVariant.available_stock) {
      toast.error(`Selected variant has only ${selectedVariant.available_stock} quantity available`);
      return;
    }

    try {
      setSubmitting(true);
      const parsedLoanDetail = Object.fromEntries(
        Object.entries(loanDetailForm).filter(([, value]) => String(value).trim() !== "")
      );

      const res = await axiosInstance.post(ProjectApiList.LOAN_PRODUCT_ORDERS, {
        product_unique_id: selectedProduct.product_unique_id,
        quantity: qty,
        attribute_summary: attributeSummary,
        loan_detail: Object.keys(parsedLoanDetail).length > 0 ? parsedLoanDetail : null,
      });

      if (res.data.success) {
        toast.success("Loan product buy entry created successfully");
        setSelectedProductId("");
        setQuantity("1");
        setLoanDetailForm({
          loan_number: "",
          customer_name: "",
          mobile_number: "",
          remarks: "",
        });
        setAttributeSelections({});
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to create entry");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Loan Product Orders</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Public loan-buy API with stock reduction
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <section className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Buy Product Through Loan</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Product</Label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.product_unique_id} value={product.product_unique_id}>
                      {product.product_name} ({product.product_sku_code}) - Stock {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Loan Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={loanDetailForm.loan_number}
                    onChange={(e) =>
                      setLoanDetailForm((prev) => ({ ...prev, loan_number: e.target.value }))
                    }
                    placeholder="Loan Number"
                    className="h-11 rounded-lg border-slate-200"
                  />
                  <Input
                    value={loanDetailForm.customer_name}
                    onChange={(e) =>
                      setLoanDetailForm((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                    placeholder="Customer Name"
                    className="h-11 rounded-lg border-slate-200"
                  />
                  <Input
                    value={loanDetailForm.mobile_number}
                    onChange={(e) =>
                      setLoanDetailForm((prev) => ({ ...prev, mobile_number: e.target.value }))
                    }
                    placeholder="Mobile Number"
                    className="h-11 rounded-lg border-slate-200"
                  />
                  <Input
                    value={loanDetailForm.remarks}
                    onChange={(e) =>
                      setLoanDetailForm((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder="Remarks"
                    className="h-11 rounded-lg border-slate-200"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Ye fields backend me automatically JSON format me save hongi.
                </p>
              </div>
            </div>

            {selectedProduct && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product UID</p>
                    <p className="font-semibold text-slate-700">{selectedProduct.product_unique_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SKU</p>
                    <p className="font-semibold text-slate-700">{selectedProduct.product_sku_code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price</p>
                    <p className="font-semibold text-slate-700">Rs. {selectedProduct.selling_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock</p>
                    <p className="font-semibold text-slate-700">
                      {selectedVariant ? selectedVariant.available_stock : selectedProduct.stock}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit</p>
                    <p className="font-semibold text-slate-700">{selectedProduct.unit_short_name || selectedProduct.unit_name || "-"}</p>
                  </div>
                </div>

                {selectedProduct.variant_options?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Variant Stock</Label>
                    <select
                      value={selectedVariantSummary}
                      onChange={(e) => setSelectedVariantSummary(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none bg-white"
                    >
                      <option value="">Select variant / attribute</option>
                      {selectedProduct.variant_options.map((variant) => (
                        <option key={variant.attribute_summary} value={variant.attribute_summary}>
                          {variant.attribute_summary} - Stock {variant.available_stock}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Example: agar `Red` ka stock 5 hai to loan buy me max 5 hi allow hoga.
                    </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">Loan Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedVariant?.available_stock || undefined}
                        value={quantity}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          if (rawValue === "") {
                            setQuantity("");
                            return;
                          }

                          const nextQty = Math.max(1, Number(rawValue));
                          const maxAllowed = selectedVariant?.available_stock ?? nextQty;
                          setQuantity(String(Math.min(nextQty, maxAllowed)));
                        }}
                        className="h-11 rounded-lg border-slate-200"
                      />
                      <p className="text-[11px] text-slate-500">
                        Selected variant available stock: {selectedVariant?.available_stock ?? 0}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loan Quantity</p>
                    <p className="font-semibold text-slate-800">{Number(quantity || 0) || 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loan Spend</p>
                    <p className="font-semibold text-slate-800">
                      Rs. {(selectedProduct.selling_price * (Number(quantity || 0) || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock After Buy</p>
                    <p className="font-semibold text-slate-800">
                      {Math.max(
                        0,
                        (selectedVariant ? selectedVariant.available_stock : selectedProduct.stock) -
                          (Number(quantity || 0) || 0)
                      )}
                    </p>
                  </div>
                </div>

                {selectedProduct.variant_options?.length === 0 && selectedProduct.attributes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProduct.attributes.map((attribute) => (
                      <div key={attribute.attribute_id} className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">
                          {attribute.attribute_name}
                        </Label>
                        <select
                          value={attributeSelections[String(attribute.attribute_id)] || ""}
                          onChange={(e) =>
                            setAttributeSelections((prev) => ({
                              ...prev,
                              [String(attribute.attribute_id)]: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none bg-white"
                        >
                          <option value="">Select {attribute.attribute_name}</option>
                          {attribute.values.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 text-xs font-bold uppercase tracking-widest"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Buy Through Loan"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Loan Buy Listing</h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="mx-auto mb-3 animate-spin" size={26} />
              <p className="text-xs font-bold uppercase tracking-widest">Loading listing...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-3 text-left">Product</th>
                    <th className="px-6 py-3 text-left">Product Code</th>
                    <th className="px-6 py-3 text-left">Attribute</th>
                    <th className="px-6 py-3 text-right">Quantity</th>
                    <th className="px-6 py-3 text-left">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{order.product_name}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Order {order.order_code}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-slate-700">{order.product_sku_code}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            UID: {order.product_unique_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-700">{order.attribute_summary || "-"}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Cost: Rs. {Number(order.total_cost || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-slate-900">{order.quantity}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Stock {order.stock_before_order} to {order.stock_after_order}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div>
                              <span className="font-semibold text-slate-800">Loan No:</span>{" "}
                              {formatLoanDetailValue(order.loan_detail?.loan_number)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800">Customer:</span>{" "}
                              {formatLoanDetailValue(order.loan_detail?.customer_name)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800">Mobile:</span>{" "}
                              {formatLoanDetailValue(order.loan_detail?.mobile_number)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800">Remarks:</span>{" "}
                              {formatLoanDetailValue(order.loan_detail?.remarks)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">
                        No loan product orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
