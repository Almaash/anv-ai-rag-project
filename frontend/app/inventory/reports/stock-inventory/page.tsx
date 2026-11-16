"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Search, AlertTriangle, BarChart3,
  RefreshCw, Box, TrendingDown, LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockItem {
  id: number;
  name: string;
  sku_code: string;
  category: string;
  brand: string;
  purchased_qty: number;
  sold_qty: number;
  current_stock: number;
  min_stock_level: number;
  is_low_stock: boolean;
  unit: string;
  variant_stock?: Array<{
    attribute_summary: string;
    available_stock: number;
  }>;
  deleted_at?: string | null;
  is_deleted?: boolean;
}

interface StockSummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
}

const StatCard = ({
  title, value, icon: Icon, colorClass, status,
}: {
  title: string; value: string | number; icon: LucideIcon; colorClass: string; status?: string;
}) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-gray-500">{title}</p>
      <div className={cn("rounded-md p-2", colorClass)}>
        <Icon size={16} />
      </div>
    </div>
    <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    {status && <p className="mt-0.5 text-[11px] text-gray-500">{status}</p>}
  </div>
);

// ── default export wraps in Suspense so Next.js doesn't crash on other devices ──
export default function StockInventoryReportPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <StockInventoryReport />
    </Suspense>
  );
}

function StockInventoryReport() {
  const [loading, setLoading]   = useState(true);
  const [allData, setAllData]   = useState<StockItem[]>([]);
  const [summary, setSummary]   = useState<StockSummary>({
    total_products: 0, low_stock_count: 0, out_of_stock_count: 0, total_stock_value: 0,
  });

  // Tabs: "running" (active) vs "removed" (deleted/disabled)
  const [activeTab, setActiveTab] = useState<"running" | "removed">("running");

  // client-side filters — no extra API calls
  const [search, setSearch]         = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(ProjectApiList.GET_STOCK_REPORT);
      if (res.data.success) {
        setAllData(Array.isArray(res.data.stock_data) ? res.data.stock_data : []);
        setSummary(res.data.summary || {
          total_products: 0, low_stock_count: 0, out_of_stock_count: 0, total_stock_value: 0,
        });
      }
    } catch {
      toast.error("Failed to load stock inventory report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // client-side filter — instant, no API call
  const filteredData = useMemo(() => {
    let data = allData;

    // First filter by tab status (active vs deleted)
    if (activeTab === "running") {
      data = data.filter(item => !item.is_deleted);
    } else {
      data = data.filter(item => item.is_deleted);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.sku_code || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q)
      );
    }
    if (showLowOnly && activeTab === "running") {
      data = data.filter((item) => item.is_low_stock);
    }
    return data;
  }, [allData, search, showLowOnly, activeTab]);

  const totalPages   = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const showingFrom = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo   = filteredData.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, filteredData.length);

  // reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, showLowOnly, itemsPerPage, activeTab]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock & Inventory Report</h1>
          <p className="text-sm text-gray-500">Live stock levels with low-stock alerts.</p>
        </div>
        <Button onClick={fetchReport} disabled={loading} variant="outline" className="h-10 px-4 text-sm">
          {loading
            ? <Loader2 className="animate-spin mr-2" size={15} />
            : <RefreshCw className="mr-2" size={15} />}
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Total Running"  
          value={allData.filter(i => !i.is_deleted).length} 
          icon={Box} 
          colorClass="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Low Stock"       
          value={allData.filter(i => !i.is_deleted && i.is_low_stock && i.current_stock > 0).length}   
          icon={TrendingDown}  
          colorClass="bg-red-50 text-red-600"   
          status="Active Running only" 
        />
        <StatCard 
          title="Out of Stock"    
          value={allData.filter(i => !i.is_deleted && i.current_stock <= 0).length} 
          icon={AlertTriangle} 
          colorClass="bg-gray-100 text-gray-700" 
          status="Active Running only" 
        />
        <StatCard 
          title="Removed Stock"    
          value={allData.filter(i => i.is_deleted).length} 
          icon={TrendingDown} 
          colorClass="bg-orange-50 text-orange-600" 
          status="Total removed"
        />
      </div>

      {/* Tabs moved below cards */}
      <div className="flex border-b border-gray-200">
        <button
          className={cn(
            "px-6 py-2.5 text-sm font-medium transition-colors border-b-2",
            activeTab === "running"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
          onClick={() => { setActiveTab("running"); setShowLowOnly(false); }}
        >
          Running Stock
        </button>
        <button
          className={cn(
            "px-6 py-2.5 text-sm font-medium transition-colors border-b-2",
            activeTab === "removed"
              ? "border-red-600 text-red-600 bg-red-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
          onClick={() => { setActiveTab("removed"); setShowLowOnly(false); }}
        >
          Removed Stock
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder={`Search ${activeTab === "running" ? "running" : "removed"} stock...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "running" && (
              <>
                <Button variant={showLowOnly ? "default" : "outline"} onClick={() => setShowLowOnly(true)}  className="h-10 px-4 text-sm">Low stock only</Button>
                <Button variant={!showLowOnly ? "default" : "outline"} onClick={() => setShowLowOnly(false)} className="h-10 px-4 text-sm">Show all</Button>
              </>
            )}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-10 rounded-md border border-gray-200 px-3 text-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>Show: {size}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {["Product", "Brand / Category", "Purchased", "Sold", "Current Stock", "Status"].map((head) => (
                  <th key={head} className="px-4 py-3 border-b text-gray-600 font-medium">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                    <p className="text-sm">Loading inventory...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    {search || showLowOnly ? "No products matched your filters" : `No ${activeTab} stock data available`}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-gray-50 border-b last:border-0",
                      item.is_deleted && "bg-gray-50 opacity-80"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={cn("font-medium", item.is_deleted ? "text-gray-500 line-through" : "text-gray-900")}>
                          {item.name}
                        </span>
                        {item.is_deleted ? (
                          <span className="text-[10px] text-red-500 font-semibold mt-0.5 uppercase">
                            Removed Stock
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">{item.sku_code || "—"}</span>
                        )}
                       {!item.is_deleted &&
  Array.isArray(item.variant_stock) &&
  item.variant_stock.length > 0 && (
    <div className="mt-2 space-y-1">
      {item.variant_stock.map((variant, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1 text-xs"
        >
          <span className="text-gray-700">
            {variant.attribute_summary}
          </span>

          <span className="font-semibold text-green-600">
            {variant.available_stock} {item.unit}
          </span>
        </div>
      ))}
    </div>
)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{item.brand || "—"}</div>
                      <div className="text-xs text-gray-500">{item.category || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(item.purchased_qty || 0).toLocaleString()} <span className="text-xs text-gray-400">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(item.sold_qty || 0).toLocaleString()} <span className="text-xs text-gray-400">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-semibold text-base", item.is_deleted ? "text-gray-400" : item.current_stock <= 0 ? "text-gray-500" : item.is_low_stock ? "text-red-600" : "text-emerald-700")}>
                        {Number(item.current_stock || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_deleted ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-[10px] uppercase">Removed</Badge>
                      ) : item.current_stock <= 0 ? (
                        <Badge className="bg-gray-900 text-white border-none text-[10px]">Out of stock</Badge>
                      ) : item.is_low_stock ? (
                        <Badge className="bg-red-50 text-red-700 border border-red-100 text-[10px]">Re-order</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">In stock</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing <b>{showingFrom}</b>–<b>{showingTo}</b> of <b>{filteredData.length}</b> products
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Prev
            </Button>
            <div className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 font-medium">
              {currentPage} / {totalPages}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
