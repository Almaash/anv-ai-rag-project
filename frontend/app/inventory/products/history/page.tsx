"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Filter,
  Calendar,
  TrendingUp,
  DollarSign,
  Download,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface ProductSummary {
  id: number;
  name: string;
  sku_code: string;
  selling_price: number;
  stock: number;
}

interface PurchaseHistoryRow {
  id: number;
  purchase_id?: number;
  purchase_unique_id?: string;
  purchase_date?: string;
  vendor_id?: number;
  vendor_name?: string;
  quantity: number;
  purchase_price: number;
  line_total?: number;
  attachments?: string[];
}

interface VendorSummaryRow {
  vendor_id: number;
  vendor_name?: string;
  vendor_business_name?: string;
  vendor_phone?: string;
  purchase_entries: number;
  total_quantity: number;
  total_amount: number;
  last_purchase_date?: string;
}

interface PurchaseInvoiceHistoryRow {
  purchase_invoice_id?: number;
  purchase_id?: number;
  invoice_no?: string;
  invoice_date?: string;
  event_no?: number;
  event_type?: string;
  vendor_name?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

interface SalesHistoryRow {
  invoice_id?: number;
  invoice_no?: string;
  invoice_date?: string;
  customer_name?: string;
  customer_phone?: string;
  quantity?: number;
  price?: number;
  total?: number;
  payment_status?: string;
}

interface ProductHistoryPayload {
  purchase_history?: PurchaseHistoryRow[];
  vendor_summary?: VendorSummaryRow[];
  purchase_invoice_history?: PurchaseInvoiceHistoryRow[];
  sales_history?: SalesHistoryRow[];
  overview?: {
    total_purchase_entries?: number;
    total_invoice_snapshots?: number;
    unique_vendors?: number;
    unique_customers?: number;
    total_purchased_qty?: number;
    total_purchase_spend?: number;
    total_sold_qty?: number;
    total_sales_amount?: number;
  };
}

export default function ProductHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");

  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [history, setHistory] = useState<PurchaseHistoryRow[]>([]);
  const [vendorSummary, setVendorSummary] = useState<VendorSummaryRow[]>([]);
  const [purchaseInvoiceHistory, setPurchaseInvoiceHistory] = useState<PurchaseInvoiceHistoryRow[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryRow[]>([]);
  const [overview, setOverview] = useState<ProductHistoryPayload["overview"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!productId) {
      toast.error("Product ID missing!");
      router.back();
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, histRes] = await Promise.all([
          axiosInstance.get(`${ProjectApiList.GET_SINGLE_PRODUCT_MASTER}/${productId}`),
          axiosInstance.get(`${ProjectApiList.GET_PRODUCT_PURCHASE_HISTORY}/${productId}/purchase-history`),
        ]);

        if (prodRes.data?.success) {
          setProduct(prodRes.data.data);
        }

        if (histRes.data?.success) {
          const payload: ProductHistoryPayload = histRes.data.data || {};
          setHistory(payload.purchase_history || []);
          setVendorSummary(payload.vendor_summary || []);
          setPurchaseInvoiceHistory(payload.purchase_invoice_history || []);
          setSalesHistory(payload.sales_history || []);
          setOverview(payload.overview || null);
        }
      } catch (err) {
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, router]);

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      if (!dateRange.start && !dateRange.end) return true;
      const rowDate = row.purchase_date || "";
      if (dateRange.start && rowDate < dateRange.start) return false;
      if (dateRange.end && rowDate > dateRange.end) return false;
      return true;
    });
  }, [history, dateRange]);

  const totalQty = filteredHistory.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const totalSpend = filteredHistory.reduce(
    (sum, row) => sum + (Number(row.line_total) || (Number(row.quantity) || 0) * (Number(row.purchase_price) || 0)),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-[72px] z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Product Insights</h1>
              <p className="text-xs text-slate-500">{product?.name || "Loading..."}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download size={16} className="mr-2" /> Export
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-400" size={40} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Current Stock" value={product?.stock || 0} icon={<Package className="text-blue-500" />} />
              <StatCard title="Total Purchased" value={overview?.total_purchased_qty ?? totalQty} icon={<TrendingUp className="text-emerald-500" />} />
              <StatCard title="Investment" value={`Rs ${Number(overview?.total_purchase_spend ?? totalSpend).toLocaleString()}`} icon={<DollarSign className="text-indigo-500" />} />
              <StatCard title="Avg Price" value={`Rs ${(totalSpend / (totalQty || 1)).toFixed(2)}`} icon={<Calendar className="text-amber-500" />} />
              <StatCard title="Unique Vendors" value={overview?.unique_vendors || vendorSummary.length || 0} icon={<Package className="text-cyan-500" />} />
              <StatCard title="Invoice Events" value={overview?.total_invoice_snapshots || purchaseInvoiceHistory.length || 0} icon={<Calendar className="text-violet-500" />} />
              <StatCard title="Sold Qty" value={overview?.total_sold_qty || 0} icon={<TrendingUp className="text-rose-500" />} />
              <StatCard title="Unique Buyers" value={overview?.unique_customers || 0} icon={<DollarSign className="text-emerald-500" />} />
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <Filter size={16} /> Filter:
              </div>
              <Input type="date" className="w-40" onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
              <span className="text-slate-400">to</span>
              <Input type="date" className="w-40" onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
                Purchase Entries (This Product)
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Purchase ID</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{row.purchase_unique_id || "-"}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{row.vendor_name || "-"}</td>
                        <td className="px-6 py-4 text-slate-500">{row.purchase_date || "-"}</td>
                        <td className="px-6 py-4 text-right font-bold">{row.quantity || 0}</td>
                        <td className="px-6 py-4 text-right">Rs {Number(row.purchase_price || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-semibold">
                          Rs {Number(row.line_total || (Number(row.quantity) || 0) * (Number(row.purchase_price) || 0)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.attachments?.length ? (
                            <div className="inline-flex items-center justify-center gap-1 text-blue-600 font-bold">
                              <Paperclip size={14} /> {row.attachments.length}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
                  Vendor Summary
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Vendor</th>
                      <th className="px-6 py-4 text-right">Entries</th>
                      <th className="px-6 py-4 text-right">Qty</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vendorSummary.length > 0 ? (
                      vendorSummary.map((row) => (
                        <tr key={row.vendor_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{row.vendor_business_name || row.vendor_name || "-"}</div>
                            <div className="text-[11px] text-slate-500">{row.vendor_phone || "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold">{row.purchase_entries || 0}</td>
                          <td className="px-6 py-4 text-right font-bold">{row.total_quantity || 0}</td>
                          <td className="px-6 py-4 text-right font-semibold">Rs {Number(row.total_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No vendor summary.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
                  Purchase Invoice Events
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Invoice</th>
                      <th className="px-6 py-4">Event</th>
                      <th className="px-6 py-4 text-right">Qty</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseInvoiceHistory.length > 0 ? (
                      purchaseInvoiceHistory.map((row, idx) => (
                        <tr key={`${row.purchase_invoice_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{row.invoice_no || "-"}</div>
                            <div className="text-[11px] text-slate-500">{row.invoice_date || "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-semibold">
                            {row.event_type || "-"} #{row.event_no || "-"}
                          </td>
                          <td className="px-6 py-4 text-right font-bold">{row.quantity || 0}</td>
                          <td className="px-6 py-4 text-right font-semibold">Rs {Number(row.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No invoice events.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
                Sales History (Who Bought This Product)
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salesHistory.length > 0 ? (
                    salesHistory.map((row, idx) => (
                      <tr key={`${row.invoice_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{row.customer_name || "-"}</div>
                          <div className="text-[11px] text-slate-500">{row.customer_phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{row.invoice_no || "-"}</div>
                          <div className="text-[11px] text-slate-500">{row.invoice_date || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold">{row.quantity || 0}</td>
                        <td className="px-6 py-4 text-right font-semibold">Rs {Number(row.total || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center uppercase text-[11px] font-bold">{row.payment_status || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No sales records for this product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-[10px] uppercase text-slate-400 font-bold">{title}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

