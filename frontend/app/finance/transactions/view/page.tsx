"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { deleteTransaction, getTransactionById } from "../../api/financeApi";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const formatDate = (raw: string) => {
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

const formatDateTime = (raw: string) => {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

const isImage = (url: string | null) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
};

export default function ViewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTransactionById(id)
      .then((res) => setTxn(res.data.data))
      .catch(() => toast.error("Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!txn?.id) return;
    setDeleting(true);
    try {
      await deleteTransaction(txn.id);
      toast.success("Transaction deleted successfully");
      router.push("/finance/transactions");
    } catch {
      toast.error("Delete failed");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-400 text-sm">
        Transaction not found.
      </div>
    );
  }

  const rows = [
    { label: "Transaction ID", value: txn.transaction_id },
    { label: "Payment / Receipt Ref ID", value: txn.payment_reference_id || "—" },
    {
      label: "Payment Mode",
      value: txn.payment_mode
        ? txn.payment_mode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "—",
    },
    { label: "Amount", value: `₹${Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
    { label: "Transaction Date", value: formatDate(txn.transaction_date) },
    { label: "Description", value: txn.description || "—" },
    {
      label: "Created By",
      value: txn.creator
        ? `${txn.creator.name}${txn.creator.user_id ? ` (${txn.creator.user_id})` : ""}`
        : "—",
    },
    { label: "Created At", value: formatDateTime(txn.created_at) },
    { label: "Last Updated", value: formatDateTime(txn.updated_at) },
  ];

  const attachmentUrl = getAttachmentUrl(txn.attachment_url || txn.attachment);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Transaction Details</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-mono">{txn.transaction_id}</p>
            </div>
          </div>
          <div className="flex gap-2 pl-12 sm:pl-0">
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm flex-1 sm:flex-none"
              onClick={() => router.push(`/finance/transactions/edit?id=${txn.id}`)}
            >
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm text-rose-600 border-rose-200 hover:bg-rose-50 flex-1 sm:flex-none"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-emerald-700 text-base sm:text-lg">Transaction Info</CardTitle>
              <Badge
                variant="outline"
                className={txn.transaction_type === "credit"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                  : "bg-red-50 text-red-700 border-red-200 capitalize"}
              >
                {txn.transaction_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <dl className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between py-3 text-sm gap-4">
                  <dt className="text-slate-500 font-medium shrink-0 text-xs sm:text-sm">{row.label}</dt>
                  <dd className="text-slate-800 font-semibold text-right break-words text-xs sm:text-sm">{row.value}</dd>
                </div>
              ))}

              {/* Attachment */}
              <div className="py-4 space-y-3">
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Attachment</p>
                {attachmentUrl ? (
                  <div className="space-y-3">
                    {isImage(attachmentUrl) ? (
                      <div className="relative group max-w-xs">
                        <img
                          src={attachmentUrl}
                          alt="Transaction Attachment"
                          className="w-full rounded-lg border border-slate-200 shadow-sm"
                        />
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white text-sm gap-2"
                        >
                          <ExternalLink className="h-4 w-4" /> Open Full
                        </a>
                      </div>
                    ) : (
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View / Download Document
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm">No attachment provided</span>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Transaction?"
        message={`Are you sure you want to delete ${txn.transaction_id}? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Yes, Delete"}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
