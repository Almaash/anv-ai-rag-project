"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Eye, Loader2, Filter, ExternalLink, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { deleteTransaction, getTransactions } from "../api/financeApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatDate = (raw: string) => {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getAttachmentUrl = (attachment: string | null) => {
  if (!attachment) return null;
  if (attachment.startsWith("http")) {
    try {
      const parsed = new URL(attachment);
      const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "") || "";
      return `${imageBase}${parsed.pathname}`;
    } catch { return attachment; }
  }
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "") || "";
  return `${imageBase}/${attachment.replace(/^\//, "")}`;
};

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteTxnId, setDeleteTxnId] = useState<string>("");
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    from_date: searchParams.get("from_date") || "",
    to_date: searchParams.get("to_date") || "",
    transaction_type: searchParams.get("transaction_type") || "",
    payment_mode: searchParams.get("payment_mode") || "",
  });

  const fetchTransactions = useCallback(async (page = 1, params = filters) => {
    try {
      setLoading(true);
      const res = await getTransactions({ ...params, page, per_page: pagination.per_page });
      const payload = res.data.data;
      setTransactions(payload.data ?? []);
      setPagination({
        current_page: payload.current_page,
        last_page: payload.last_page,
        total: payload.total,
        per_page: payload.per_page,
      });
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.per_page]);

  useEffect(() => { fetchTransactions(); }, []);

  const handleFilter = () => fetchTransactions(1, filters);
  const handleClearFilters = () => {
    const cleared = { search: "", from_date: "", to_date: "", transaction_type: "", payment_mode: "" };
    setFilters(cleared);
    fetchTransactions(1, cleared);
  };

  const confirmDelete = (id: number, txnId: string) => { setDeleteId(id); setDeleteTxnId(txnId); };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      toast.success("Transaction deleted successfully");
      fetchTransactions(pagination.current_page);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null); setDeleteTxnId("");
    }
  };

  const exportRows = transactions.map((txn) => ({
    "TXN ID": txn.transaction_id,
    "Payment Ref": txn.payment_reference_id || "",
    "Mode": txn.payment_mode?.replace(/_/g, " ") || "",
    "Date": formatDate(txn.transaction_date),
    "Amount": Number(txn.amount).toFixed(2),
    "Type": txn.transaction_type,
    "Description": txn.description || "",
    "Created By": txn.creator?.name || "",
  }));

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Finance Transactions", 14, 15);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [Object.keys(exportRows[0] || {})],
      body: exportRows.map(Object.values),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105] },
    });
    doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Finance Transactions</h1>
              <p className="text-xs sm:text-sm text-slate-500">{pagination.total} total transactions</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportExcel}
                disabled={transactions.length === 0}
                className="gap-1.5 text-sm h-9 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                variant="outline"
                onClick={exportPDF}
                disabled={transactions.length === 0}
                className="gap-1.5 text-sm h-9 text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                onClick={() => router.push("/finance/transactions/add")}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-sm h-9"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Add Transaction</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              {/* First Row: Search */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search TXN ID..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                  className="pl-9 h-10 text-sm"
                />
              </div>

              {/* Second Row: Other filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">From Date</label>
                  <Input
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">To Date</label>
                  <Input
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Type</label>
                  <select
                    value={filters.transaction_type}
                    onChange={(e) => setFilters((p) => ({ ...p, transaction_type: e.target.value }))}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Payment Mode</label>
                  <select
                    value={filters.payment_mode}
                    onChange={(e) => setFilters((p) => ({ ...p, payment_mode: e.target.value }))}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="neft">NEFT</option>
                    <option value="rtgs">RTGS</option>
                    <option value="imps">IMPS</option>
                    <option value="cheque">Cheque</option>
                    <option value="demand_draft">Demand Draft</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                  <Button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-700 h-10 text-sm flex-1">
                    Apply
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters} className="h-10 text-sm flex-1">
                    Clear
                  </Button>
                </div>
              </div>
            </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex h-48 items-center justify-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">TXN ID</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Payment Ref</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Mode</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Date</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Amount</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Type</TableHead>
                      <TableHead className="text-slate-600 text-xs">Description</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">File</TableHead>
                      <TableHead className="text-slate-600 whitespace-nowrap text-xs">Created By</TableHead>
                      <TableHead className="text-right text-slate-600 whitespace-nowrap text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn) => (
                      <TableRow key={txn.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{txn.transaction_id}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {txn.payment_reference_id
                            ? <span className="font-mono text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">{txn.payment_reference_id}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {txn.payment_mode
                            ? <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 capitalize">{txn.payment_mode.replace(/_/g, " ")}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-600 whitespace-nowrap text-xs">{formatDate(txn.transaction_date)}</TableCell>
                        <TableCell className="font-semibold text-slate-800 whitespace-nowrap text-xs">
                          ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={txn.transaction_type === "credit" ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize text-xs" : "bg-red-50 text-red-700 border-red-200 capitalize text-xs"}>
                            {txn.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 max-w-[140px] truncate text-xs">{txn.description || "—"}</TableCell>
                        <TableCell>
                          {txn.attachment_url
                            ? <a href={getAttachmentUrl(txn.attachment_url) || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View</a>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs">
                            <p className="font-medium text-slate-700">{txn.creator?.name || "—"}</p>
                            {txn.creator?.user_id && <p className="text-slate-400">{txn.creator.user_id}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-emerald-600" onClick={() => router.push(`/finance/transactions/view?id=${txn.id}`)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-600" onClick={() => router.push(`/finance/transactions/edit?id=${txn.id}`)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => confirmDelete(txn.id, txn.transaction_id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-700">{txn.transaction_id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(txn.transaction_date)}</p>
                    </div>
                    <Badge variant="outline" className={txn.transaction_type === "credit" ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize text-xs shrink-0" : "bg-red-50 text-red-700 border-red-200 capitalize text-xs shrink-0"}>
                      {txn.transaction_type}
                    </Badge>
                  </div>

                  {/* Amount */}
                  <p className="text-xl font-bold text-slate-900">
                    ₹{Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {txn.payment_mode && (
                      <div>
                        <p className="text-slate-400">Mode</p>
                        <p className="font-medium text-slate-700 capitalize">{txn.payment_mode.replace(/_/g, " ")}</p>
                      </div>
                    )}
                    {txn.payment_reference_id && (
                      <div>
                        <p className="text-slate-400">Ref ID</p>
                        <p className="font-mono font-medium text-amber-700 truncate">{txn.payment_reference_id}</p>
                      </div>
                    )}
                    {txn.description && (
                      <div className="col-span-2">
                        <p className="text-slate-400">Description</p>
                        <p className="font-medium text-slate-700 truncate">{txn.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-400">Created By</p>
                      <p className="font-medium text-slate-700">{txn.creator?.name || "—"}</p>
                    </div>
                    {txn.attachment_url && (
                      <div>
                        <p className="text-slate-400">Attachment</p>
                        <a href={getAttachmentUrl(txn.attachment_url) || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => router.push(`/finance/transactions/view?id=${txn.id}`)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => router.push(`/finance/transactions/edit?id=${txn.id}`)}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => confirmDelete(txn.id, txn.transaction_id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
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
              <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={pagination.current_page === 1} onClick={() => fetchTransactions(pagination.current_page - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={pagination.current_page === pagination.last_page} onClick={() => fetchTransactions(pagination.current_page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Transaction?"
        message={`Are you sure you want to delete transaction ${deleteTxnId}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteId(null); setDeleteTxnId(""); }}
      />
    </div>
  );
}
