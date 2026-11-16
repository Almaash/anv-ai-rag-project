"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku_code?: string;
}

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  attribute_summary?: string;
  quantity: number;
  price: number;
  total: number;
  discount_type?: "percentage" | "fixed" | string;
  discount_value?: number;
  discount_amount?: number;
  tax_type?: "percentage" | "fixed" | string;
  tax_value?: number;
  tax_amount?: number;
}

interface Invoice {
  id: number;
  invoice_no: string;
  customer_name?: string;
  customer_phone?: string;
  invoice_date: string;
  grand_total: number;
  payment_method?: string;
  payment_status?: string;
  paid_amount?: number;
  balance_amount?: number;
  status?: string;
  is_cancelled?: boolean;
  cancelled_at?: string | null;
  cancelled_on?: string | null;
  items: InvoiceItem[];
}

interface ProductSummary {
  id: number;
  name: string;
  sku_code?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  deleted_on?: string | null;
  total_qty: number;
  total_revenue: number;
  avg_sale_price: number;
  invoice_count: number;
}

interface SalesReportData {
  summary: {
    total_sales_amount: number;
    total_invoices: number;
    total_items_sold: number;
  };
  product_wise_summary: ProductSummary[];
  detailed_sales: Invoice[];
}

type ReportTab = "sales" | "products";

const toNum = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const currency = (val: unknown): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNum(val));

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

type InvoiceBreakup = {
  qty: number;
  gross: number;
  discount: number;
  tax: number;
  final: number;
};

const getInvoiceBreakup = (sale: Invoice): InvoiceBreakup => {
  const qty = sale.items.reduce((sum, item) => sum + toNum(item.quantity), 0);

  const gross = sale.items.reduce((sum, item) => {
    const itemQty = toNum(item.quantity);
    const itemPrice = toNum(item.price);
    return sum + itemQty * itemPrice;
  }, 0);

  const discount = sale.items.reduce((sum, item) => {
    const explicit = toNum(item.discount_amount);
    if (explicit > 0) return sum + explicit;

    const itemQty = toNum(item.quantity);
    const itemPrice = toNum(item.price);
    const line = itemQty * itemPrice;
    const value = toNum(item.discount_value);
    const type = String(item.discount_type || "percentage").toLowerCase();
    const computed = type === "fixed" ? value : (line * value) / 100;
    return sum + computed;
  }, 0);

  const tax = sale.items.reduce((sum, item) => {
    const explicit = toNum(item.tax_amount);
    if (explicit > 0) return sum + explicit;

    const itemQty = toNum(item.quantity);
    const itemPrice = toNum(item.price);
    const line = itemQty * itemPrice;
    const lineDiscount = (() => {
      const value = toNum(item.discount_value);
      const type = String(item.discount_type || "percentage").toLowerCase();
      return type === "fixed" ? value : (line * value) / 100;
    })();
    const taxable = Math.max(line - lineDiscount, 0);
    const value = toNum(item.tax_value);
    const type = String(item.tax_type || "percentage").toLowerCase();
    const computed = type === "fixed" ? value : (taxable * value) / 100;
    return sum + computed;
  }, 0);

  return {
    qty,
    gross,
    discount,
    tax,
    final: toNum(sale.grand_total),
  };
};

export default function SalesAnalysisReport() {
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    product_id: "",
    payment_method: "",
    customer_name: "",
  });

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_PRODUCTS_LIST);
      if (res.data.success) {
        setAllProducts(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch {
      setAllProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.product_id) params.product_id = Number(filters.product_id);
      if (filters.payment_method) params.payment_method = filters.payment_method;
      if (filters.customer_name) params.customer_name = filters.customer_name;

      const res = await axiosInstance.get(ProjectApiList.GET_SALES_REPORT, { params });
      if (res.data.success) {
        setReport(res.data as SalesReportData);
      } else {
        setReport(null);
      }
    } catch {
      toast.error("Failed to load sales report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
    fetchReport();
  }, [fetchReport]);

  const handleReset = () => {
    setFilters({
      from_date: "",
      to_date: "",
      product_id: "",
      payment_method: "",
      customer_name: "",
    });
  };

  const totalSalesAmount = toNum(report?.summary.total_sales_amount);
  const totalInvoices = toNum(report?.summary.total_invoices);
  const totalItemsSold = toNum(report?.summary.total_items_sold);
  const avgInvoiceValue = totalInvoices > 0 ? totalSalesAmount / totalInvoices : 0;
  const totalProductRevenueBase = useMemo(
    () => (report?.product_wise_summary || []).reduce((sum, row) => sum + toNum(row.total_revenue), 0),
    [report]
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => String(v).trim() !== "").length;
  }, [filters]);

  const paymentMethodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    (report?.detailed_sales || []).forEach((sale) => {
      const key = (sale.payment_method || "Unknown").trim() || "Unknown";
      const prev = map.get(key) || { count: 0, amount: 0 };
      map.set(key, {
        count: prev.count + 1,
        amount: prev.amount + toNum(sale.grand_total),
      });
    });
    return Array.from(map.entries()).map(([method, val]) => ({
      method,
      count: val.count,
      amount: val.amount,
    }));
  }, [report]);

  const attributeWiseSummary = useMemo(() => {
    type Row = {
      key: string;
      product_name: string;
      attribute_summary: string;
      qty_sold: number;
      revenue: number;
      invoice_count: number;
      customer_count: number;
    };

    const map = new Map<
      string,
      {
        product_name: string;
        attribute_summary: string;
        qty_sold: number;
        revenue: number;
        invoice_ids: Set<number>;
        customers: Set<string>;
      }
    >();

    (report?.detailed_sales || []).forEach((sale) => {
      sale.items.forEach((item) => {
        const attr = (item.attribute_summary || "Standard").trim() || "Standard";
        const product = (item.product_name || "Unknown Product").trim() || "Unknown Product";
        const key = `${product}__${attr}`;
        const row = map.get(key) || {
          product_name: product,
          attribute_summary: attr,
          qty_sold: 0,
          revenue: 0,
          invoice_ids: new Set<number>(),
          customers: new Set<string>(),
        };

        row.qty_sold += toNum(item.quantity);
        row.revenue += toNum(item.total);
        row.invoice_ids.add(toNum(sale.id));
        row.customers.add((sale.customer_name || "Walk-in Customer").trim());
        map.set(key, row);
      });
    });

    return Array.from(map.entries())
      .map(([key, row]): Row => ({
        key,
        product_name: row.product_name,
        attribute_summary: row.attribute_summary,
        qty_sold: row.qty_sold,
        revenue: row.revenue,
        invoice_count: row.invoice_ids.size,
        customer_count: row.customers.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [report]);

  return (
    <div className="p-6 space-y-6">
      {loading ? (
        <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p className="text-sm">Loading sales analysis...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Sales Analysis</h1>
                <p className="text-sm text-gray-500">Invoice-wise and product-wise performance</p>
              </div>
              <p className="text-sm text-gray-600">Active filters: {activeFilterCount}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input type="date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} className="h-10" />
              <Input type="date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} className="h-10" />
              <select
                value={filters.product_id}
                onChange={(e) => setFilters((p) => ({ ...p, product_id: e.target.value }))}
                disabled={productsLoading}
                className="h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="">All Products</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={filters.payment_method}
                onChange={(e) => setFilters((p) => ({ ...p, payment_method: e.target.value }))}
                className="h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <Input
                placeholder="Customer / phone"
                value={filters.customer_name}
                onChange={(e) => setFilters((p) => ({ ...p, customer_name: e.target.value }))}
                className="h-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchReport} className="h-10 px-4 bg-blue-600 text-white text-sm">
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Apply"}
              </Button>
              <Button variant="outline" onClick={handleReset} className="h-10 px-4 text-sm">Reset</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[{ label: "Total Sales", value: currency(totalSalesAmount) }, { label: "Total Invoices", value: totalInvoices.toLocaleString() }, { label: "Items Sold", value: totalItemsSold.toLocaleString() }, { label: "Avg Invoice Value", value: currency(avgInvoiceValue) }].map((card) => (
              <div key={card.label} className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="flex gap-2 p-4">
              {[{ id: "sales", label: "Invoice Sales" }, { id: "products", label: "Product Performance" }, { id: "attributes", label: "Attribute Wise" }].map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={activeTab === tab.id ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setActiveTab(tab.id as ReportTab)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {activeTab === "sales" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Invoice", "Date", "Customer", "Items", "Qty", "Gross", "Discount", "Tax", "Net", "Payment"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.detailed_sales || []).length === 0 ? (
                      <tr><td colSpan={10} className="py-10 text-center text-gray-500">No invoice data found</td></tr>
                    ) : (
                      (report?.detailed_sales || []).map((sale) => {
                        const breakdown = getInvoiceBreakup(sale);
                        const isCancelled = !!sale.is_cancelled;
                        return (
                          <tr key={sale.id} className={cn("border-b last:border-0", isCancelled ? "bg-gray-100 opacity-70" : "hover:bg-gray-50")}>
                            <td className="px-4 py-3">
                              <div className={cn("font-medium", isCancelled ? "text-gray-400 line-through" : "text-gray-900")}>{sale.invoice_no}</div>
                              {isCancelled && <div className="text-[10px] text-red-400 font-semibold mt-0.5">🗑 Cancelled on {sale.cancelled_on}</div>}
                            </td>
                            <td className={cn("px-4 py-3", isCancelled ? "text-gray-400" : "text-gray-700")}>{formatDate(sale.invoice_date)}</td>
                            <td className="px-4 py-3">
                              <div className={cn("font-medium", isCancelled ? "text-gray-400" : "text-gray-900")}>{sale.customer_name || "Walk-in Customer"}</div>
                              <div className="text-xs text-gray-500">{sale.customer_phone || "-"}</div>
                            </td>
                            <td className={cn("px-4 py-3 text-right", isCancelled && "text-gray-400")}>{sale.items.length}</td>
                            <td className={cn("px-4 py-3 text-right", isCancelled && "text-gray-400")}>{breakdown.qty}</td>
                            <td className={cn("px-4 py-3 text-right", isCancelled && "text-gray-400")}>{currency(breakdown.gross)}</td>
                            <td className={cn("px-4 py-3 text-right", isCancelled ? "text-gray-400" : "text-red-600")}>{currency(breakdown.discount)}</td>
                            <td className={cn("px-4 py-3 text-right", isCancelled ? "text-gray-400" : "text-amber-600")}>{currency(breakdown.tax)}</td>
                            <td className={cn("px-4 py-3 text-right font-semibold", isCancelled ? "text-gray-400 line-through" : "text-gray-900")}>{currency(breakdown.final)}</td>
                            <td className="px-4 py-3 text-center">
                              {isCancelled
                                ? <span className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded">Cancelled</span>
                                : sale.payment_method || "N/A"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "products" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Product", "SKU", "Qty Sold", "Bills", "Revenue", "Avg Price", "Contribution"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.product_wise_summary || []).length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-gray-500">No product summary data found</td></tr>
                    ) : (
                      (report?.product_wise_summary || []).map((item: any) => {
                        const rawContribution = totalProductRevenueBase > 0 ? (toNum(item.total_revenue) / totalProductRevenueBase) * 100 : 0;
                        const contribution = Math.min(Math.max(rawContribution, 0), 100);
                        const isDeleted = !!item.deleted_at;
                        return (
                          <tr key={item.id} className={cn("hover:bg-gray-50", isDeleted && "bg-gray-100")}>
                            <td className="px-4 py-3">
                              <div className={cn("font-medium", isDeleted ? "text-gray-400 line-through" : "text-gray-900")}>
                                {item.name}
                              </div>
                              {isDeleted && (
                                <div className="text-[10px] text-red-400 font-semibold mt-0.5">🗑 Deleted on {item.deleted_on || item.deleted_at}</div>
                              )}
                            </td>
                            <td className={cn("px-4 py-3", isDeleted ? "text-gray-400" : "text-gray-700")}>{item.sku_code || "-"}</td>
                            <td className="px-4 py-3 text-right">{toNum(item.total_qty).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{toNum(item.invoice_count)}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{currency(item.total_revenue)}</td>
                            <td className="px-4 py-3 text-right">{currency(item.avg_sale_price)}</td>
                            <td className="px-4 py-3 text-right">{contribution.toFixed(1)}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "attributes" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Product", "Attribute", "Qty Sold", "Revenue", "Bills", "Customers"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attributeWiseSummary.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-500">No attribute-wise data found</td></tr>
                    ) : (
                      attributeWiseSummary.map((row) => (
                        <tr key={row.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.product_name}</td>
                          <td className="px-4 py-3 text-gray-700">{row.attribute_summary}</td>
                          <td className="px-4 py-3 text-right">{row.qty_sold.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-700">{currency(row.revenue)}</td>
                          <td className="px-4 py-3 text-right">{row.invoice_count}</td>
                          <td className="px-4 py-3 text-right">{row.customer_count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
