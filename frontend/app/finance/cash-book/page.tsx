"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Edit2, Loader2, BookOpen, Eye,
  TrendingUp, TrendingDown, Wallet, ArrowDownCircle, FileDown, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getCashBookEntries, getCashBookToday, deleteCashBookEntry } from "../api/financeApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const fmt = (n: any) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const fmtDate = (raw: string) => {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CashBookPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<any>(null);
  const [todayExists, setTodayExists] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [filters, setFilters] = useState({ from_date: "", to_date: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteCbId, setDeleteCbId] = useState<string>("");

  const fetchEntries = useCallback(async (page = 1, params = filters) => {
    try {
      setLoading(true);
      const res = await getCashBookEntries({ ...params, page, per_page: pagination.per_page });
      const payload = res.data.data;
      setEntries(payload.data ?? []);
      setPagination({
        current_page: payload.current_page,
        last_page: payload.last_page,
        total: payload.total,
        per_page: payload.per_page,
      });
    } catch {
      toast.error("Failed to load cash book entries");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.per_page]);

  useEffect(() => {
    fetchEntries();
    getCashBookToday()
      .then((res) => {
        setTodayData(res.data.data);
        setTodayExists(res.data.exists);
      })
      .catch(() => {});
  }, []);

  const handleFilter = () => fetchEntries(1, filters);
  const handleClearFilters = () => {
    const cleared = { from_date: "", to_date: "" };
    setFilters(cleared);
    fetchEntries(1, cleared);
  };

  const confirmDelete = (id: number, cbId: string) => { setDeleteId(id); setDeleteCbId(cbId); };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCashBookEntry(deleteId);
      toast.success("Entry deleted");
      fetchEntries(pagination.current_page);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null); setDeleteCbId("");
    }
  };

  const exportRows = entries.map((e) => ({
    "CB ID": e.cash_book_id,
    "Date": fmtDate(e.date),
    "Opening Balance": Number(e.opening_balance).toFixed(2),
    "Cash In": Number(e.cash_in).toFixed(2),
    "Cash Out": Number(e.cash_out).toFixed(2),
    "Closing Balance": Number(e.closing_balance).toFixed(2),
    "Note": e.note || "",
  }));

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Cash Book", 14, 15);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [Object.keys(exportRows[0] || {})],
      body: exportRows.map(Object.values),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105] },
    });
    doc.save(`cash_book_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash Book");
    XLSX.writeFile(wb, `cash_book_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-600" />
                Cash Book
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">{pagination.total} total entries</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={exportExcel}
                disabled={entries.length === 0}
                className="gap-1.5 text-sm h-9 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                variant="outline"
                onClick={exportPDF}
                disabled={entries.length === 0}
                className="gap-1.5 text-sm h-9 text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                onClick={() => router.push("/finance/cash-book/add")}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-sm h-9"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">From Date</label>
              <Input type="date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} className="h-10 text-sm w-40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">To Date</label>
              <Input type="date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} className="h-10 text-sm w-40" />
            </div>
            <Button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-700 h-10 text-sm">Apply</Button>
            <Button variant="outline" onClick={handleClearFilters} className="h-10 text-sm">Clear</Button>
          </div>
        </div>

        {/* Today's Banner */}
        {todayData && (
          <div className={`rounded-2xl border p-4 ${todayExists ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${todayExists ? "text-emerald-700" : "text-amber-700"}`}>
                  {todayExists ? "✅ Today's Entry Saved" : "⚠️ Today's Entry Not Yet Added"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fmtDate(todayData.date)} — Opening Balance: {fmt(todayData.opening_balance)}
                  {todayExists && ` · Closing: ${fmt(todayData.closing_balance)}`}
                </p>
              </div>
              {!todayExists && (
                <Button
                  onClick={() => router.push("/finance/cash-book/add")}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-sm h-9 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add Today's Entry
                </Button>
              )}
            </div>

            {/* Today's summary cards */}
            {todayExists && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { label: "Opening Balance", value: todayData.opening_balance, icon: ArrowDownCircle, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Cash In", value: todayData.cash_in, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Cash Out", value: todayData.cash_out, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
                  { label: "Closing Balance", value: todayData.closing_balance, icon: Wallet, color: "text-purple-600", bg: "bg-purple-50" },
                ].map((s) => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${s.bg} ${s.color} shrink-0`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 truncate">{s.label}</p>
                        <p className={`text-sm font-bold truncate ${s.color}`}>{fmt(s.value)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex h-48 items-center justify-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No cash book entries found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap">CB ID</TableHead>
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap text-right">Opening Balance</TableHead>
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap text-right">Cash In</TableHead>
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap text-right">Cash Out</TableHead>
                      <TableHead className="text-slate-600 text-xs whitespace-nowrap text-right">Closing Balance</TableHead>
                      <TableHead className="text-slate-600 text-xs">Note</TableHead>
                      <TableHead className="text-right text-slate-600 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => {
                      const isToday = e.date === new Date().toISOString().slice(0, 10);
                      return (
                        <TableRow key={e.id} className={`hover:bg-slate-50 ${isToday ? "bg-emerald-50/40" : ""}`}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">{e.cash_book_id}</TableCell>
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            {fmtDate(e.date)}
                            {isToday && <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200 text-xs" variant="outline">Today</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-right text-blue-700 font-medium">{fmt(e.opening_balance)}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-700 font-medium">{fmt(e.cash_in)}</TableCell>
                          <TableCell className="text-xs text-right text-red-600 font-medium">{fmt(e.cash_out)}</TableCell>
                          <TableCell className="text-xs text-right text-purple-700 font-bold">{fmt(e.closing_balance)}</TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[160px] truncate">{e.note || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-emerald-600" onClick={() => router.push(`/finance/cash-book/view?id=${e.cash_book_id}`)} title="View Details">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-600" onClick={() => router.push(`/finance/cash-book/add?id=${e.id}`)} title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => confirmDelete(e.id, e.cash_book_id)} title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {entries.map((e) => {
                const isToday = e.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={e.id} className={`bg-white rounded-2xl border p-4 space-y-3 ${isToday ? "border-emerald-300" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-700">{e.cash_book_id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtDate(e.date)}</p>
                      </div>
                      {isToday && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs shrink-0" variant="outline">Today</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-slate-400">Opening</p><p className="font-semibold text-blue-700">{fmt(e.opening_balance)}</p></div>
                      <div><p className="text-slate-400">Cash In</p><p className="font-semibold text-emerald-700">{fmt(e.cash_in)}</p></div>
                      <div><p className="text-slate-400">Cash Out</p><p className="font-semibold text-red-600">{fmt(e.cash_out)}</p></div>
                      <div><p className="text-slate-400">Closing</p><p className="font-bold text-purple-700">{fmt(e.closing_balance)}</p></div>
                      {e.note && <div className="col-span-2"><p className="text-slate-400">Note</p><p className="text-slate-700 truncate">{e.note}</p></div>}
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => router.push(`/finance/cash-book/view?id=${e.cash_book_id}`)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => router.push(`/finance/cash-book/add?id=${e.id}`)}>
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => confirmDelete(e.id, e.cash_book_id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Page {pagination.current_page} of {pagination.last_page} — {pagination.total} records
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={pagination.current_page === 1} onClick={() => fetchEntries(pagination.current_page - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={pagination.current_page === pagination.last_page} onClick={() => fetchEntries(pagination.current_page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Cash Book Entry?"
        message={`Are you sure you want to delete entry ${deleteCbId}? This cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteId(null); setDeleteCbId(""); }}
      />
    </div>
  );
}
