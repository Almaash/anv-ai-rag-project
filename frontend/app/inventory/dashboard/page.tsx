"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Box,
  IndianRupee,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis } from "recharts";

type ProductLite = {
  id: number;
  name: string;
  sku_code: string;
  selling_price: number;
  current_stock: number;
};

type InvoiceLite = {
  id: number;
  invoice_no: string;
  customer_name: string;
  invoice_date: string;
  grand_total: number;
  payment_status: string;
};

type PurchaseLite = {
  id: number;
  unique_id: string;
  purchase_date: string;
  total_amount: number;
  vendor?: { name?: string };
};

type ReportSummary = {
  total_purchase_amount: number;
  total_purchase_orders: number;
  total_supplied_quantity: number;
  active_vendors_count: number;
};

type LowStockAlert = {
  id: number;
  name: string;
  sku_code: string;
  stock?: number;
  current_stock?: number;
};

type DashboardData = {
  products: ProductLite[];
  invoices: InvoiceLite[];
  purchases: PurchaseLite[];
  reportSummary: ReportSummary | null;
  lowStockAlerts: LowStockAlert[];
};

const monthlyChartConfig = {
  sales: { label: "Sales", color: "#1d4ed8" },
  purchases: { label: "Purchases", color: "#60a5fa" },
} satisfies ChartConfig;

const paymentChartConfig = {
  paid: { label: "Paid", color: "#16a34a" },
  partial: { label: "Partial", color: "#eab308" },
  pending: { label: "Pending", color: "#ef4444" },
} satisfies ChartConfig;

const LOW_STOCK_THRESHOLD = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-IN", { month: "short" });
}

function getAlertStock(alert: LowStockAlert) {
  return Number(alert.stock ?? alert.current_stock ?? 0);
}

export default function InventoryDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    products: [],
    invoices: [],
    purchases: [],
    reportSummary: null,
    lowStockAlerts: [],
  });

  const loadDashboard = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [productsRes, invoicesRes, purchasesRes, reportRes] = await Promise.allSettled([
        axiosInstance.get(ProjectApiList.GET_AVAILABLE_PRODUCTS),
        axiosInstance.get(ProjectApiList.GET_INVOICES, { params: { per_page: 200 } }),
        axiosInstance.get(ProjectApiList.GET_PURCHASES),
        axiosInstance.get(ProjectApiList.GET_VENDOR_PURCHASE_REPORT),
      ]);

      const products: ProductLite[] = productsRes.status === 'fulfilled' && Array.isArray(productsRes.value?.data?.data)
        ? productsRes.value.data.data
        : [];
      const invoices: InvoiceLite[] = invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value?.data?.data?.data)
        ? invoicesRes.value.data.data.data
        : [];
      const purchases: PurchaseLite[] = purchasesRes.status === 'fulfilled' && Array.isArray(purchasesRes.value?.data?.data)
        ? purchasesRes.value.data.data
        : [];

      const reportData = reportRes.status === 'fulfilled' ? (reportRes.value?.data?.data ?? {}) : {};
      const reportLowStockAlerts: LowStockAlert[] = Array.isArray(reportData.low_stock_alerts)
        ? reportData.low_stock_alerts
        : [];
      const derivedLowStockAlerts: LowStockAlert[] = products
        .filter((product) => Number(product.current_stock) <= LOW_STOCK_THRESHOLD)
        .map((product) => ({
          id: product.id,
          name: product.name,
          sku_code: product.sku_code,
          stock: Number(product.current_stock) || 0,
        }))
        .sort((a, b) => getAlertStock(a) - getAlertStock(b));

      setData({
        products,
        invoices,
        purchases,
        reportSummary: reportData.summary ?? null,
        lowStockAlerts: reportLowStockAlerts.length
          ? reportLowStockAlerts
          : derivedLowStockAlerts,
      });

      if (isManualRefresh) {
        toast.success("Dashboard refreshed successfully");
      }
    } catch (error) {
      console.error("Failed to load inventory dashboard", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totalProducts = data.products.length;
    const totalStockUnits = data.products.reduce(
      (sum, p) => sum + (Number(p.current_stock) || 0),
      0
    );
    const inventoryValue = data.products.reduce(
      (sum, p) => sum + (Number(p.current_stock) || 0) * (Number(p.selling_price) || 0),
      0
    );
    const outOfStock = data.products.filter((p) => Number(p.current_stock) <= 0).length;
    const lowStock = data.lowStockAlerts.length;
    const invoiceCount = data.invoices.length;
    const purchaseCount = data.reportSummary?.total_purchase_orders ?? data.purchases.length;

    return {
      totalProducts,
      totalStockUnits,
      inventoryValue,
      outOfStock,
      lowStock,
      invoiceCount,
      purchaseCount,
    };
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; sales: number; purchases: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: monthLabel(d), sales: 0, purchases: 0 });
    }

    const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));

    data.invoices.forEach((inv) => {
      const idx = monthIndex.get(monthKey(inv.invoice_date));
      if (idx !== undefined) {
        months[idx].sales += Number(inv.grand_total) || 0;
      }
    });

    data.purchases.forEach((pur) => {
      const idx = monthIndex.get(monthKey(pur.purchase_date));
      if (idx !== undefined) {
        months[idx].purchases += Number(pur.total_amount) || 0;
      }
    });

    return months;
  }, [data.invoices, data.purchases]);

  const paymentSplit = useMemo(() => {
    const counts = { paid: 0, partial: 0, pending: 0 };
    data.invoices.forEach((inv) => {
      const status = (inv.payment_status || "").toLowerCase();
      if (status === "paid") counts.paid += 1;
      else if (status === "partial") counts.partial += 1;
      else counts.pending += 1;
    });

    return [
      { key: "paid", value: counts.paid, fill: "var(--color-paid)" },
      { key: "partial", value: counts.partial, fill: "var(--color-partial)" },
      { key: "pending", value: counts.pending, fill: "var(--color-pending)" },
    ];
  }, [data.invoices]);

  const recentActivity = useMemo(() => {
    const salesRows = data.invoices.map((inv) => ({
      id: `INV-${inv.id}`,
      type: "Sale",
      party: inv.customer_name || "Walk-in Customer",
      date: inv.invoice_date,
      amount: Number(inv.grand_total) || 0,
    }));

    const purchaseRows = data.purchases.map((pur) => ({
      id: pur.unique_id || `PUR-${pur.id}`,
      type: "Purchase",
      party: pur.vendor?.name || "Vendor",
      date: pur.purchase_date,
      amount: Number(pur.total_amount) || 0,
    }));

    return [...salesRows, ...purchaseRows]
      .filter((x) => x.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [data.invoices, data.purchases]);

  const stockHealth = useMemo(() => {
    const total = data.products.length || 1;
    const out = data.products.filter((p) => Number(p.current_stock) <= 0).length;
    const low = data.products.filter(
      (p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= LOW_STOCK_THRESHOLD
    ).length;
    const healthy = Math.max(total - low - out, 0);

    return {
      total,
      healthy,
      low,
      out,
      healthyPct: Math.round((healthy / total) * 100),
      lowPct: Math.round((low / total) * 100),
      outPct: Math.round((out / total) * 100),
    };
  }, [data.products]);

  const topInventoryValueProducts = useMemo(() => {
    return [...data.products]
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku_code: p.sku_code,
        stock: Number(p.current_stock) || 0,
        value: (Number(p.current_stock) || 0) * (Number(p.selling_price) || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data.products]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={30} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-5 shadow-lg shadow-blue-200/50 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Inventory Dashboard
              </h1>
              <p className="text-sm text-blue-100">
                Live stock, sales, and purchase overview
              </p>
            </div>
            <Button
              variant="outline"
              className="w-fit border-blue-200 bg-white/95 text-blue-700 hover:bg-white"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Operations Snapshot
            </h2>
            <p className="text-sm text-slate-600">
              Current stock position and health indicators
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Products</span>
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-semibold text-slate-900">{metrics.totalProducts}</p>
            </CardContent>
          </Card>

          <Card className="border-cyan-200/70 bg-gradient-to-br from-cyan-50 via-sky-50 to-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Stock Units</span>
                <Box className="h-4 w-4 text-cyan-600" />
              </div>
              <p className="text-2xl font-semibold text-slate-900">
                {metrics.totalStockUnits.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50 to-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Inventory Value</span>
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(metrics.inventoryValue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Low / Out Of Stock</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-semibold text-slate-900">
                {metrics.lowStock} / {metrics.outOfStock}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Sales vs Purchases (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ChartContainer config={monthlyChartConfig} className="h-[300px] w-full">
                <BarChart data={monthlyTrend} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={6} />
                  <Bar dataKey="purchases" fill="var(--color-purchases)" radius={6} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Payment Status Split
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ChartContainer config={paymentChartConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                  <Pie
                    data={paymentSplit}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-slate-900 text-3xl font-bold"
                              >
                                {metrics.invoiceCount.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-slate-500 text-xs font-medium"
                              >
                                Total Invoices
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-blue-50/60 text-left text-xs text-blue-800">
                      <th className="py-3 font-medium">Ref ID</th>
                      <th className="py-3 font-medium">Type</th>
                      <th className="py-3 font-medium">Party</th>
                      <th className="py-3 font-medium">Date</th>
                      <th className="py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                          No recent records found
                        </td>
                      </tr>
                    ) : (
                      recentActivity.map((row) => (
                        <tr key={`${row.type}-${row.id}`} className="border-b last:border-0">
                          <td className="py-3 font-medium text-slate-800">{row.id}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                row.type === "Sale"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-teal-50 text-teal-700"
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700">{row.party}</td>
                          <td className="py-3 text-slate-600">{row.date}</td>
                          <td className="py-3 text-right font-medium text-slate-900">
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ReceiptText className="h-4 w-4" />
                  Recent Invoices
                </div>
                <span className="font-semibold text-slate-900">{metrics.invoiceCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Orders
                </div>
                <span className="font-semibold text-slate-900">{metrics.purchaseCount}</span>
              </div>
              <div className="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-3 shadow-sm">
                <p className="text-xs font-medium text-red-800">Low stock alerts</p>
                <p className="mt-1 text-sm font-semibold text-red-900">
                  {metrics.lowStock} products are at or below threshold
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-white/90 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Low Stock Product List
                </p>
                {data.lowStockAlerts.length === 0 ? (
                  <p className="text-sm text-slate-500">No low stock products.</p>
                ) : (
                  <div className="space-y-2">
                    {data.lowStockAlerts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.name}</p>
                          <p className="text-[11px] text-slate-500">SKU: {p.sku_code || "N/A"}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            getAlertStock(p) <= 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          Stock: {getAlertStock(p)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1 border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Stock Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-700">Healthy</span>
                  <span className="font-semibold text-emerald-800">{stockHealth.healthy} ({stockHealth.healthyPct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-emerald-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${stockHealth.healthyPct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-amber-700">Low Stock</span>
                  <span className="font-semibold text-amber-800">{stockHealth.low} ({stockHealth.lowPct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-amber-100">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${stockHealth.lowPct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-red-700">Out Of Stock</span>
                  <span className="font-semibold text-red-800">{stockHealth.out} ({stockHealth.outPct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-red-100">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${stockHealth.outPct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2 border-blue-200/70 bg-gradient-to-br from-white via-blue-50/70 to-blue-100/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Top Inventory Value Products
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {topInventoryValueProducts.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">No product data available.</p>
              ) : (
                <div className="space-y-2">
                  {topInventoryValueProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white/90 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-500">SKU: {p.sku_code || "N/A"} | Stock: {p.stock}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(p.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
