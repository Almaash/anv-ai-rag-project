"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2, History, Loader2, Plus, Printer, Eye, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type PurchaseInvoiceItem = {
  product_name?: string;
  quantity?: number | string;
  rate?: number | string;
  selling_price?: number | string;
  amount?: number | string;
  product_master_id?: number;
  attribute_summary?: string;
  attachments?: string[];

  product_master?: {
    selling_price?: number | string;
    product_images?: string[];
    name?: string;
    brand?: { name?: string };
    category?: { name?: string };
    sku_code?: string;
    gst_percent?: number | string;
    unit?: { short_name?: string };
  };
};

type PurchaseInvoiceData = {
  id?: number;
  purchase_id?: number | string;
  purchase?: {
    id?: number;
    unique_id?: string;
    items?: Array<{
      product_master_id: number;
      attribute_summary?: string;
      selling_price?: number | string;
      attachments?: string[];
    }>;
  };
  invoice_no?: string;
  invoice_date?: string;
  vendor_name?: string;
  vendor_phone?: string;
  vendor_address?: string;
  payment_method?: string;
  payment_status?: string;
  upi_reference_no?: string;
  payment_screenshot?: string;
  subtotal?: number | string;
  discount_amount?: number | string;
  tax_amount?: number | string;
  grand_total?: number | string;
  paid_amount?: number | string;
  due_amount?: number | string;
  notes?: string;
  event_type?: string;
  event_no?: number;
  items?: PurchaseInvoiceItem[];
};

type PurchasePaymentRow = {
  date: string;
  method: string;
  reference: string;
  amount: number;
  screenshot?: string;
};

function formatAmount(value: unknown) {
  return Number(value || 0).toLocaleString("en-IN");
}

function getStatusClasses(status?: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "partial":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-red-50 text-red-700";
  }
}

function PurchaseInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<PurchaseInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PurchaseInvoiceData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const isUpi = paymentMethod === "UPI" || paymentMethod === "Online";
  const upiValid = !isUpi || (transactionId.trim().length > 0 && paymentScreenshot !== null);
  const canSubmit = !submitting && !!paymentAmount && Number(paymentAmount) > 0 && upiValid;
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const id = searchParams.get("id");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")
  const baseImageUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL

  const fetchInvoice = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const byInvoice = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE}/${id}`);
      if (byInvoice.data.success) {
        const invoiceData = byInvoice.data.data;

        // attach full purchase object (already exists in your API)
        invoiceData.purchase = invoiceData.purchase || {};

        // IMPORTANT: map vendor from purchase
        if (invoiceData.purchase?.vendor) {
          invoiceData.vendor_name = invoiceData.purchase.vendor.business_name;
          invoiceData.vendor_phone = invoiceData.purchase.vendor.phone;
          invoiceData.vendor_address = invoiceData.purchase.vendor.address;
        }

        // use screenshot URL directly
        invoiceData.payment_screenshot =
          invoiceData.payment_screenshot_url || invoiceData.payment_screenshot;

        setInvoice(invoiceData);

        // Fetch full purchase details to get product attachments
        const purchaseId = invoiceData.purchase?.unique_id || invoiceData.purchase_id || invoiceData.purchase?.id;
        if (purchaseId) {
          const purchaseRes = await axiosInstance.get(
            `${ProjectApiList.GET_PURCHASE_BY_ID}/${purchaseId}`
          );

          if (purchaseRes.data.success) {
            invoiceData.purchase = purchaseRes.data.data;

            invoiceData.items = invoiceData.items?.map((item: any) => {
              const purchaseItem = invoiceData.purchase?.items?.find(
                (p: any) =>
                  p.product_master_id === item.product_master_id &&
                  p.attribute_summary === item.attribute_summary
              );

              return {
                ...item,
                selling_price: purchaseItem?.selling_price,
              };
            });
          }
        }

        setInvoice(invoiceData);
        setPaymentMethod(invoiceData.payment_method || "Cash");
        if (purchaseId) {
          const historyRes = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE_HISTORY}/${purchaseId}/invoices`);
          setHistory(Array.isArray(historyRes.data?.data) ? historyRes.data.data : []);
        }
        return;
      }
    } catch {
      try {
        const byPurchase = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE_HISTORY}/${id}/invoices`);
        const latest = Array.isArray(byPurchase.data?.data) ? byPurchase.data.data[0] : null;
        if (latest?.id) {
          const latestInvoice = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE}/${latest.id}`);
          if (latestInvoice.data.success) {
            setInvoice(latestInvoice.data.data);
            setPaymentMethod(latestInvoice.data.data?.payment_method || "Cash");
            setHistory(Array.isArray(byPurchase.data?.data) ? byPurchase.data.data : []);
            return;
          }
        }

        const generated = await axiosInstance.post(`${ProjectApiList.GET_PURCHASE_INVOICE_HISTORY}/${id}/invoices/generate`);
        if (generated.data?.success && generated.data?.data?.id) {
          const generatedInvoice = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE}/${generated.data.data.id}`);
          if (generatedInvoice.data.success) {
            setInvoice(generatedInvoice.data.data);
            setPaymentMethod(generatedInvoice.data.data?.payment_method || "Cash");
            const historyRes = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE_HISTORY}/${id}/invoices`);
            setHistory(Array.isArray(historyRes.data?.data) ? historyRes.data.data : []);
          }
        }
      } catch (fallbackErr) {
        console.error("Fetch purchase invoice error", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    if (!invoice) return;
    setPaymentMethod(invoice.payment_method || "Cash");
    setPaymentAmount(Number(invoice.due_amount) > 0 ? String(Number(invoice.due_amount)) : "");
  }, [invoice]);

  const handleAddPayment = async () => {
    const paymentTargetId = invoice?.purchase?.unique_id || invoice?.purchase_id || invoice?.purchase?.id;

    if (!paymentTargetId) {
      toast.error("Purchase ID not found");
      return;
    }

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (isUpi) {
      if (!transactionId.trim()) {
        toast.error("Reference / Transaction ID is required for UPI/Online payment");
        return;
      }
      if (!paymentScreenshot) {
        toast.error("Payment screenshot is required for UPI/Online payment");
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("amount", paymentAmount);
      formData.append("payment_method", paymentMethod);
      formData.append("transaction_id", transactionId);
      formData.append("payment_date", paymentDate);
      if (paymentScreenshot) {
        formData.append("payment_screenshot", paymentScreenshot);
      }

      const res = await axiosInstance.post(`${ProjectApiList.GET_PURCHASES}/${paymentTargetId}/payments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Payment added");
      setIsDialogOpen(false);
      setTransactionId("");
      setPaymentScreenshot(null);
      const latestInvoiceId = res.data?.purchase_invoice_id;
      if (latestInvoiceId) {
        router.replace(`/inventory/purchase/invoice?id=${latestInvoiceId}`);
        return;
      }
      await fetchInvoice();
    } catch (error: unknown) {
      const message = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to add payment"
        : "Failed to add payment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const paymentHistoryFromNotes = useMemo(() => {
    if (!invoice?.notes) return [];

    // Parse: "Payment received on 2026-04-18: 1227.00 via Cash"
    const regex = /Payment received on ([^:]+):\s*([\d.]+)\s+via\s+([^\n\r(]+)/gi;
    const matches = [...invoice.notes.matchAll(regex)];

    return matches.map(match => ({
      date: match[1].trim(),
      amount: parseFloat(match[2]),
      method: match[3].trim()
    }));
  }, [invoice?.notes]);

  const totalPaymentsFromNotes = useMemo(() => {
    return paymentHistoryFromNotes.reduce((sum, p) => sum + p.amount, 0);
  }, [paymentHistoryFromNotes]);

  const paymentHistory = useMemo<PurchasePaymentRow[]>(() => {
    const sorted = [...history]
      .sort((a, b) => (Number(a.event_no) || 0) - (Number(b.event_no) || 0));

    const payments: PurchasePaymentRow[] = [];

    sorted.forEach((entry) => {
      // 1. Direct payment screenshot handling
      if (entry.event_type === "payment_update") {
        const index = sorted.findIndex((row) => row.event_no === entry.event_no && row.invoice_no === entry.invoice_no);
        const previous = index > 0 ? sorted[index - 1] : null;

        // Extract raw notes
        const notes = entry.notes || "";

        // Use regex to find ALL payment lines in the notes
        const paymentLines = notes.match(/Payment received on ([^:]+):\s*([\d.]+)\s+via\s+([^\(\n]+)(?:\s+\(Ref:\s*([^\)]+)\))?/gi);

        if (paymentLines) {
          paymentLines.forEach((line) => {
            const match = line.match(/Payment received on ([^:]+):\s*([\d.]+)\s+via\s+([^\(\n]+)(?:\s+\(Ref:\s*([^\)]+)\))?/i);
            if (match) {
              payments.push({
                date: match[1].trim(),
                amount: Number(match[2]),
                method: match[3].trim(),
                reference: match[4]?.trim() || "-",
                screenshot: entry.payment_screenshot || undefined,
              });
            }
          });
        } else {
          // Fallback if no lines matched but paid_amount increased
          const amount = Math.max(0, Number(entry.paid_amount || 0) - Number(previous?.paid_amount || 0));
          if (amount > 0) {
            payments.push({
              date: entry.invoice_date || "-",
              method: entry.payment_method || "Cash",
              reference: "-",
              amount: amount,
              screenshot: entry.payment_screenshot || undefined,
            });
          }
        }
      }
    });

    return payments;
  }, [history]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="mb-4 animate-spin" size={40} />
        <p className="text-sm text-slate-500">Loading purchase details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="mb-4 text-lg text-slate-500">Purchase invoice not found</p>
          <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
            <ArrowLeft size={16} className="mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }


  console.log("invoice----------->", invoice);
  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <p className="text-xs text-slate-500">Purchase invoice</p>
            <h1 className="text-lg font-semibold text-slate-900">#{invoice.invoice_no}</h1>
          </div>
        </div>
        <div className="text-sm text-slate-500">Date: {invoice.invoice_date}</div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            {/* <Button
              onClick={() => {
                if (Number(invoice.due_amount) <= 0) return;
                setIsDialogOpen(true);
              }}
              disabled={Number(invoice.due_amount) <= 0}
              className="h-10 gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600"
            >
              <Plus size={16} /> {Number(invoice.due_amount) > 0 ? "Add Payment" : "Paid"}
            </Button> */}
            <Button
              onClick={() => {
                const editTargetId = invoice.purchase?.unique_id || invoice.purchase_id || invoice.purchase?.id;
                if (!editTargetId) {
                  toast.error("Purchase ID not found");
                  return;
                }
                router.push(`/inventory/products/add?id=${editTargetId}`);
              }}
              className="h-10 gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Edit2 size={16} /> Edit
            </Button>
            <Button
              onClick={() => router.push(`/inventory/purchase/print?id=${id}`)}
              className="h-10 gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer size={16} /> Print
            </Button>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Invoice summary</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <SummaryItem label="Subtotal" value={invoice.subtotal} />
              <SummaryItem label="Discount" value={invoice.discount_amount} />
              <SummaryItem label="Tax" value={invoice.tax_amount} />
              <SummaryItem label="Grand Total" value={invoice.grand_total} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Vendor details</h2>
              <div className="space-y-4">

                <div>
                  <p className="text-xs text-slate-500">Business</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {invoice.purchase?.vendor?.business_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Contact Person</p>
                  <p className="text-sm text-slate-900">
                    {invoice.purchase?.vendor?.name}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Info label="Phone" value={invoice.purchase?.vendor?.phone} />
                  <Info label="Email" value={invoice.purchase?.vendor?.email} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="text-sm text-slate-700">
                    {invoice.purchase?.vendor?.address}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">GST</p>
                  <p className="text-sm text-slate-700">
                    {invoice.purchase?.vendor?.gst_number || "-"}
                  </p>
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">
                  Purchase Details
                </h2>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Info label="Purchase ID" value={invoice.purchase?.unique_id} />
                  <Info label="Purchase Date" value={invoice.purchase?.purchase_date} />

                  <Info
                    label="Discount"
                    value={`${invoice.purchase?.discount_value}%`}
                  />

                  <Info
                    label="Payment Status"
                    value={invoice.purchase?.payment_status}
                  />

                  <Info
                    label="Investor ID"
                    value={invoice.purchase?.investor_unique_id || "-"}
                  />

                  <Info
                    label="Payment Method"
                    value={invoice.purchase?.payment_method}
                  />
                </div>
              </section>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Payment summary</h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (Number(invoice.due_amount) <= 0) return;
                    setIsDialogOpen(true);
                  }}
                  disabled={Number(invoice.due_amount) <= 0}
                  className="h-9 gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600"
                >
                  <Plus size={12} /> {Number(invoice.due_amount) > 0 ? "Add Payment" : "Paid"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Rs. {formatAmount(invoice.grand_total)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Rs. {formatAmount(invoice.paid_amount)}</p>
                </div>
                <div className={`rounded-lg border p-4 ${Number(invoice.due_amount) > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs ${Number(invoice.due_amount) > 0 ? "text-red-600" : "text-slate-500"}`}>Due</p>
                  <p className={`mt-1 text-lg font-semibold ${Number(invoice.due_amount) > 0 ? "text-red-700" : "text-slate-900"}`}>
                    Rs. {formatAmount(invoice.due_amount)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Payment mode: <span className="font-medium text-slate-900">{invoice.payment_method || "Cash"}</span>
              </p>
              {invoice.upi_reference_no && (
                <p className="mt-1 text-sm text-slate-600">
                  UPI Ref: <span className="font-mono text-xs font-semibold text-slate-900">{invoice.upi_reference_no}</span>
                </p>
              )}
              {invoice.payment_screenshot && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-slate-500 uppercase font-bold tracking-wider">UPI Screenshot</p>
                  <div
                    className="relative group h-24 w-24 rounded-lg border border-blue-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-all shadow-sm"
                    onClick={() => {
                      setPreviewSrc(`${baseImageUrl}/${invoice.payment_screenshot}`);
                      setPreviewTitle("Payment Screenshot");
                    }}
                  >
                    <img
                      src={`${baseImageUrl}/${invoice.payment_screenshot}`}
                      alt="UPI Screenshot"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center transition-colors">
                      <Eye size={20} className="text-blue-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Payment History Card */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Payment Detail History</h3>
                  </div>
                  <div className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                    {paymentHistoryFromNotes.length} Entries
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {paymentHistoryFromNotes.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {paymentHistoryFromNotes.map((payment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-1 rounded-full",
                              payment.method.toLowerCase().includes('cash') ? "bg-emerald-500" : "bg-blue-500"
                            )} />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900">
                                {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className={cn(
                                "mt-0.5 text-[10px] font-bold uppercase tracking-wider",
                                payment.method.toLowerCase().includes('cash') ? "text-emerald-600" : "text-blue-600"
                              )}>
                                {payment.method}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-600 tabular-nums">
                              ₹{formatAmount(payment.amount)}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium italic">Confirmed</div>
                          </div>
                        </div>
                      ))}
                      <div className="bg-slate-50/80 px-4 py-3 flex justify-between items-center border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Paid Sum</span>
                        <span className="text-sm font-bold text-blue-700 tabular-nums">
                          ₹{formatAmount(totalPaymentsFromNotes)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50/30">
                      <div className="mx-auto h-10 w-10 text-slate-300 mb-2 flex items-center justify-center">
                        <History size={24} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">No payment history found in notes</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Purchase items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 text-left">Product</th>
                    {/* <th className="px-5 py-3 text-left">Attachments</th> */}
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Purchase Price</th>
                    <th className="px-5 py-3 text-right">Selling Price</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items?.map((item, idx) => {
                    // Try to find attachments from purchase items
                    const attachments = item.attachments || [];

                    // API response matches item.selling_price directly
                    // Use nullish coalescing so explicit zero values are preserved.
                    const sellingPrice = item.selling_price

                    return (
                      <tr key={idx}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">

                            {/* IMAGE */}
                            {item.product_master?.product_images?.[0] && (
                              <img
                                src={`${baseImageUrl}${item.product_master.product_images[0]}`}
                                className="h-11 w-11 rounded-md object-cover border"
                              />
                            )}

                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-slate-900">
                                {item.product_master?.name || item.product_name}
                              </p>

                              <p className="text-[11px] text-slate-500">
                                {item.product_master?.brand?.name} • {item.product_master?.category?.name}
                              </p>

                              <p className="text-[10px] text-slate-400">
                                SKU: {item.product_master?.sku_code}
                              </p>

                              {/* ADD THIS */}
                              {item.attribute_summary && (
                                <p className="text-[11px] text-purple-600 font-medium">
                                  {item.attribute_summary}
                                </p>
                              )}

                              <p className="text-[10px] text-blue-600">
                                GST: {item.product_master?.gst_percent}%
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* <td className="px-5 py-3">
                          {attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {attachments.map((file, fIdx) => {
                                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file);
                                return (
                                  <div
                                    key={fIdx}
                                    className="group relative h-10 w-10 border border-slate-200 rounded-md overflow-hidden bg-slate-50 cursor-pointer hover:border-blue-400 transition-colors"
                                    onClick={() => {
                                      setPreviewSrc(`${baseImageUrl?.replace(/\/$/, "")}/${file.replace(/^\//, "")}`);
                                      setPreviewTitle(`Attachment ${fIdx + 1}`);
                                    }}
                                  >
                                    {isImage ? (
                                      <img
                                        src={`${baseImageUrl?.replace(/\/$/, "")}/${file.replace(/^\//, "")}`}
                                        alt="attachment"
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                                        <FileText size={16} />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                      <Eye size={12} className="text-white drop-shadow-md" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No attachments</span>
                          )}
                        </td> */}
                        <td className="px-5 py-3 text-right text-slate-700">
                          {Number(item.quantity)} {item.product_master?.unit?.short_name}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">Rs. {formatAmount(item.rate)}</td>
                        <td className="px-5 py-3 text-right text-slate-700">Rs. {formatAmount(sellingPrice)}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-900">
                          Rs. {formatAmount(Number(item.amount) || Number(item.quantity) * Number(item.rate))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {paymentHistory.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <History size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Payment History</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Full transaction audit trail</p>
                  </div>
                </div>
                <div className="flex gap-4 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600">Total Paid: Rs. {formatAmount(invoice.paid_amount)}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/30 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-5 py-3 text-left tracking-wider">Payment Date</th>
                      <th className="px-5 py-3 text-left tracking-wider">Method</th>
                      <th className="px-5 py-3 text-left tracking-wider">Reference ID</th>
                      <th className="px-5 py-3 text-left tracking-wider">Proof</th>
                      <th className="px-5 py-3 text-right tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistory.map((payment, idx) => (
                      <tr key={`${payment.date}-${payment.amount}-${idx}`} className="group hover:bg-blue-50/30 transition-all duration-200">
                        <td className="px-5 py-4 text-slate-700 font-semibold tabular-nums">
                          {payment.date}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm",
                            payment.method === 'Cash'
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {payment.method}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                          {payment.reference || "-"}
                        </td>
                        <td className="px-5 py-4">
                          {payment.screenshot ? (
                            <div
                              className="h-10 w-10 rounded-lg border-2 border-slate-100 overflow-hidden cursor-pointer hover:border-blue-400 hover:scale-105 transition-all shadow-sm"
                              onClick={() => { setPreviewSrc(payment.screenshot!.startsWith('http') ? payment.screenshot! : `${baseImageUrl}/${payment.screenshot}`); setPreviewTitle("Payment Proof"); }}
                            >
                              <img
                                src={payment.screenshot.startsWith('http') ? payment.screenshot : `${baseImageUrl}/${payment.screenshot}`}
                                alt="proof"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 tabular-nums">
                            Rs. {formatAmount(payment.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/50 font-bold border-t">
                      <td colSpan={4} className="px-5 py-4 text-xs text-slate-600 text-right uppercase">Accumulated Total Paid</td>
                      <td className="px-5 py-4 text-right text-base text-blue-700 tabular-nums">Rs. {formatAmount(invoice.paid_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {Number(invoice.due_amount) > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2">
                <History size={16} className="text-red-600" />
                <h2 className="text-sm font-semibold text-red-700">Due pending</h2>
              </div>
              <p className="mt-2 text-sm text-red-700">
                Rs. {formatAmount(invoice.due_amount)} is still pending for this purchase invoice.
              </p>
            </section>
          )}

          {invoice.notes && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Notes</h2>
              <p className="text-sm text-slate-700 whitespace-pre-line">{invoice.notes}</p>
            </section>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Add payment for #{invoice.invoice_no}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Amount (Due: Rs. {formatAmount(invoice.due_amount)})
                  </Label>
                  <Input
                    type="number"
                    className="h-11 rounded-lg border-slate-300"
                    value={paymentAmount}
                    min={0.01}
                    max={Number(invoice.due_amount)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > Number(invoice.due_amount)) {
                        setPaymentAmount(String(Number(invoice.due_amount)));
                        return;
                      }
                      setPaymentAmount(e.target.value);
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium text-slate-600">Payment Date</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-lg border-slate-300"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
                  <select
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online / UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                {isUpi && (
                  <>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium text-slate-600">
                        Transaction ID / Reference <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter reference / transaction ID"
                        className="h-11 rounded-lg border-slate-300"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium text-slate-600">
                        Payment Screenshot <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                          className="h-11 rounded-lg border-blue-200 bg-blue-50/30 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                        {paymentScreenshot && (
                          <div className="h-11 w-11 rounded-lg border border-blue-300 overflow-hidden cursor-pointer shadow-md shrink-0">
                            <img
                              src={URL.createObjectURL(paymentScreenshot)}
                              alt="preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddPayment}
                  disabled={!canSubmit}
                  className="h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Processing..." : isUpi && !upiValid ? "Enter Ref & Screenshot" : "Confirm Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {previewSrc && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
                <button
                  onClick={() => setPreviewSrc("")}
                  className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-1 text-sm bg-white/10 rounded-lg"
                >
                  <X size={20} /> Close
                </button>
                <div className="bg-white border-b px-4 py-2 w-full rounded-t-xl flex justify-between items-center text-slate-700">
                  <span className="font-semibold text-sm">{previewTitle}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => window.open(previewSrc, '_blank')} className="h-8 gap-1.5 text-xs text-blue-600">
                      <Eye size={14} /> Open Original
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-100 p-2 w-full rounded-b-xl overflow-hidden flex items-center justify-center">
                  {/\.(pdf)$/i.test(previewSrc) ? (
                    <iframe src={previewSrc} className="w-full h-[70vh] rounded-lg border-0" />
                  ) : (
                    <img src={previewSrc} alt="Preview" className="max-h-[75vh] max-w-full object-contain shadow-2xl rounded-lg" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PurchaseInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-slate-500" />
        </div>
      }
    >
      <PurchaseInvoiceContent />
    </Suspense>
  );
}

function SummaryItem({ label, value }: any) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        Rs. {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
}
function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 font-medium">
        {value || "-"}
      </p>
    </div>
  );
}