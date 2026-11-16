"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VendorOption {
  id: number;
  name: string;
  business_name?: string;
}

interface Summary {
  total_purchase_amount: number;
  total_purchase_orders: number;
  total_supplied_quantity: number;
  active_vendors_count: number;
}

interface VendorWiseRow {
  id: number;
  name: string;
  business_name?: string;
  phone?: string;
  purchase_count: number | string;
  total_quantity_supplied: number | string;
  total_purchase_amount: number | string;
  avg_purchase_price: number | string;
  last_purchase_date?: string | null;
}

interface ProductSupplyRow {
  vendor_id: number;
  vendor_name: string;
  vendor_business_name?: string | null;
  product_id: number;
  product_name: string;
  sku_code: string;
  attribute_summary?: string;
  supplied_quantity: number | string;
  supplied_value: number | string;
  avg_purchase_price: number | string;
  last_purchase_date?: string | null;
}

interface LowStockRow {
  id: number;
  name: string;
  sku_code: string;
  stock: number;
  selling_price: number | string;
  status: "active" | "inactive";
}

interface PurchaseItemDetail {
  id: number;
  quantity: number | string;
  purchase_price: number | string;
  line_total: number | string;
  attribute_summary?: string;
  product_master?: {
    id: number;
    name: string;
    sku_code: string;
  };
}

interface VendorPurchaseDetail {
  id: number;
  unique_id: string;
  purchase_date: string;
  total_amount: number | string;
  items: PurchaseItemDetail[];
}

interface ReportResponse {
  summary: Summary;
  vendor_wise_summary: VendorWiseRow[];
  product_supply_by_vendor: ProductSupplyRow[];
  low_stock_alerts: LowStockRow[];
  detailed_vendor_purchases: VendorPurchaseDetail[];
}

const currency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

export default function VendorPurchaseReportPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <VendorPurchaseReportContent />
    </Suspense>
  );
}

function VendorPurchaseReportContent() {
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    vendor_id: "",
    payment_method: "",
  });

  const [report, setReport] = useState<ReportResponse>({
    summary: {
      total_purchase_amount: 0,
      total_purchase_orders: 0,
      total_supplied_quantity: 0,
      active_vendors_count: 0,
    },
    vendor_wise_summary: [],
    product_supply_by_vendor: [],
    low_stock_alerts: [],
    detailed_vendor_purchases: [],
  });
  const [activeTab, setActiveTab] = useState<"product_supply" | "vendor_summary">("product_supply");

  const selectedVendorName = useMemo(() => {
    const selected = vendors.find((v) => String(v.id) === filters.vendor_id);
    return selected?.business_name || selected?.name || "";
  }, [filters.vendor_id, vendors]);

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_VENDORS);
      if (res.data.success) {
        setVendors(res.data.data || []);
      }
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setVendorsLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.vendor_id && filters.vendor_id !== "") {
        params.vendor_id = filters.vendor_id;
      }
      if (filters.payment_method) params.payment_method = filters.payment_method;

      const res = await axiosInstance.get(ProjectApiList.GET_VENDOR_PURCHASE_REPORT, { params });
      if (res.data.success) {
        const d = res.data.data;
        setReport({
          summary: d.summary || { total_purchase_amount: 0, total_purchase_orders: 0, total_supplied_quantity: 0, active_vendors_count: 0 },
          vendor_wise_summary: Array.isArray(d.vendor_wise_summary) ? d.vendor_wise_summary : [],
          product_supply_by_vendor: Array.isArray(d.product_supply_by_vendor) ? d.product_supply_by_vendor : [],
          low_stock_alerts: Array.isArray(d.low_stock_alerts) ? d.low_stock_alerts : [],
          detailed_vendor_purchases: Array.isArray(d.detailed_vendor_purchases) ? d.detailed_vendor_purchases : [],
        });
      }
    } catch {
      toast.error("Failed to load vendor analytics report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      {loading ? (
        <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p className="text-sm">Loading vendor purchases...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Vendor Purchase Analytics</h1>
                <p className="text-sm text-gray-500">Vendor supply trends and purchase history.</p>
              </div>
              <Button onClick={fetchReport} disabled={loading} variant="outline" className="h-10 px-4 text-sm">
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input type="date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} className="h-10" />
              <Input type="date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} className="h-10" />
              <select
                value={filters.vendor_id}
                onChange={(e) => setFilters((p) => ({ ...p, vendor_id: e.target.value }))}
                disabled={vendorsLoading}
                className="h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name || vendor.name}
                  </option>
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
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={fetchReport} disabled={loading} className="h-10 px-4 text-sm bg-blue-600 text-white">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Apply"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4 text-sm"
                  onClick={() => {
                    setFilters({ from_date: "", to_date: "", vendor_id: "", payment_method: "" });
                    setTimeout(fetchReport, 0);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[{
              label: "Total Purchase Value",
              value: currency(report.summary.total_purchase_amount),
            }, {
              label: "Purchase Orders",
              value: report.summary.total_purchase_orders,
            }, {
              label: "Qty Supplied",
              value: Number(report.summary.total_supplied_quantity || 0).toLocaleString(),
            }, {
              label: "Active Vendors",
              value: report.summary.active_vendors_count,
            }].map((card) => (
              <div key={card.label} className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">{card.label}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            {/* <div className="flex gap-2 p-4">
              {[{ id: "product_supply", label: "Product Supply History" }, { id: "vendor_summary", label: "Vendor Purchase Summary" }].map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={activeTab === tab.id ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  {tab.label}
                </Button>
              ))}
            </div> */}

            {activeTab === "product_supply" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Vendor", "Product", "Supplied Qty", "Investment", "Avg Price", "Last Purchase"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b text-gray-600">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.product_supply_by_vendor.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-500">No product supply records</td></tr>
                    ) : (
                      report.product_supply_by_vendor.map((row: any, idx: number) => {
                        const isVendorDeleted = !!row.vendor_deleted_at;
                        const isProductDeleted = !!row.product_deleted_at;
                        return (
                          <tr key={`${row.vendor_id}-${row.product_id}-${idx}`} className={cn("hover:bg-gray-50", (isVendorDeleted || isProductDeleted) && "opacity-75 bg-gray-50")}>
                            <td className="px-4 py-3">
                              <div className={cn("font-medium", isVendorDeleted ? "text-gray-500 line-through" : "text-gray-900")}>
                                {row.vendor_business_name || row.vendor_name}
                              </div>
                              {isVendorDeleted && <div className="text-[10px] text-red-500 italic">Deleted</div>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div
                                  className={cn(
                                    "font-medium",
                                    isProductDeleted
                                      ? "text-gray-500 line-through"
                                      : "text-gray-900"
                                  )}
                                >
                                  {row.product_name}
                                </div>

                                <div className="text-xs text-gray-500">
                                  {isProductDeleted
                                    ? `Deleted on ${row.product_deleted_at}`
                                    : row.sku_code}
                                </div>

                                {row.attribute_summary && (
                                  <div className="inline-flex flex-wrap gap-1 pt-1">
                                    {row.attribute_summary.split("|").map((attr: string, i: number) => (
                                      <span
                                        key={i}
                                        className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700"
                                      >
                                        {attr.trim()}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{Number(row.supplied_quantity || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{currency(row.supplied_value)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{currency(row.avg_purchase_price)}</td>
                            <td className="px-4 py-3 text-right text-xs text-gray-500">{row.last_purchase_date || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "vendor_summary" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Vendor", "Orders", "Qty", "Value", "Avg Price"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b text-gray-600">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.vendor_wise_summary.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-500">No vendor data</td></tr>
                    ) : (
                      report.vendor_wise_summary.map((row: any) => {
                        const isDeleted = !!row.deleted_at;
                        return (
                          <tr key={row.id} className={cn("hover:bg-gray-50", isDeleted && "opacity-75 bg-gray-50")}>
                            <td className="px-4 py-3">
                              <div className={cn("font-medium", isDeleted ? "text-gray-500 line-through" : "text-gray-900")}>
                                {row.business_name || row.name}
                              </div>
                              <div className="text-xs text-gray-500">{isDeleted ? `Deleted on ${row.deleted_at}` : (row.phone || "-")}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{Number(row.purchase_count || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{Number(row.total_quantity_supplied || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{currency(row.total_purchase_amount)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{currency(row.avg_purchase_price)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {filters.vendor_id && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold text-gray-900">Detailed Purchase Report: {selectedVendorName || "Selected Vendor"}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Purchase ID", "Date", "Products", "Total Qty", "Bill Amount"].map((head) => (
                        <th key={head} className="px-4 py-3 border-b text-gray-600">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.detailed_vendor_purchases.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-500">No detailed purchases for selected vendor</td></tr>
                    ) : (
                      report.detailed_vendor_purchases.map((purchase) => {
                        const totalQty = purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                        const productText = purchase.items
                          .map((item) => {
                            const productName = item.product_master?.name || "Product";

                            return item.attribute_summary
                              ? `${productName} (${item.attribute_summary})`
                              : productName;
                          })
                          .join(", ");

                        return (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{purchase.unique_id}</td>
                            <td className="px-4 py-3 text-gray-700">{purchase.purchase_date || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                {purchase.items.map((item, idx) => (
                                  <div key={idx} className="rounded-lg border border-gray-100 p-2 bg-gray-50">
                                    <p className="font-medium text-gray-900">
                                      {item.product_master?.name}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      SKU: {item.product_master?.sku_code}
                                    </p>

                                    {item.attribute_summary && (
                                      <p className="text-xs font-medium text-purple-600 mt-1">
                                        {item.attribute_summary}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{totalQty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{currency(purchase.total_amount)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
