"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit2, History, Loader2, Plus, Printer, X } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL

function formatAmount(value: unknown) {
  return Number(value || 0).toLocaleString("en-IN");
}

function getStatusClasses(status?: string) {
  switch (status?.toLowerCase()) {
    case "paid":    return "bg-emerald-50 text-emerald-700";
    case "partial": return "bg-orange-50 text-orange-700";
    default:        return "bg-red-50 text-red-700";
  }
}

type InvoiceItem = {
  product_name?: string;
  quantity?: number | string;
  price?: number | string;
  total?: number | string;
};

type InvoicePayment = {
  payment_date?: string;
  payment_method?: string;
  transaction_id?: string;
  amount?: number | string;
  payment_screenshot?: string;
};

type InvoiceData = {
  booking_no?: string;
  invoice_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  payment_status?: string;
  payment_method?: string;
  upi_reference_no?: string;
  payment_screenshot?: string;
  grand_total?: number | string;
  paid_amount?: number | string;
  balance_amount?: number | string;
  notes?: string;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
};

export default function ViewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [tid, setTid] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const isUpi = paymentMethod === "UPI" || paymentMethod === "Online";
  const upiValid = !isUpi || (tid.trim().length > 0 && paymentScreenshot !== null);
  const canSubmit = !submitting && !!paymentAmount && Number(paymentAmount) > 0 && upiValid;

  const id = searchParams.get("id");

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${ProjectApiList.GET_ADVANCE_BOOKINGS}/${id}`);
      if (res.data.status === "success" || res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchInvoice(); }, [fetchInvoice]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setPaymentAmount("");
      setTid("");
      setPaymentScreenshot(null);
      setPaymentMethod("Cash");
    }
  };

  const handleAddPayment = async () => {
    const balance = Number(invoice?.balance_amount || 0);
    const amount  = Number(paymentAmount);

    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > balance) { toast.error(`Amount cannot exceed balance (Rs. ${formatAmount(balance)})`); return; }
    if (isUpi) {
      if (!tid.trim()) { toast.error("Reference / Transaction ID is required for UPI/Online payment"); return; }
      if (!paymentScreenshot) { toast.error("Payment screenshot is required for UPI/Online payment"); return; }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("amount", paymentAmount);
      formData.append("payment_method", paymentMethod);
      formData.append("transaction_id", tid);
      formData.append("payment_date", paymentDate);
      if (paymentScreenshot) formData.append("payment_screenshot", paymentScreenshot);

      await axiosInstance.post(
        `${ProjectApiList.GET_ADVANCE_BOOKINGS}/${id}/payments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("Payment added successfully");
      handleDialogChange(false);
      fetchInvoice();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Logic to parse notes into history if invoice.payments is empty but notes exist
  const derivedPayments = useMemo(() => {
    if (invoice?.payments && invoice.payments.length > 0) return invoice.payments;
    if (!invoice?.notes) return [];

    // Parse: "Payment received on 2026-04-18: 1227.00 via Cash"
    const regex = /Payment received on ([^:]+):\s*([\d.]+)\s+via\s+([^\n\r(]+)/gi;
    const matches = [...invoice.notes.matchAll(regex)];

    return matches.map(match => ({
      payment_date: match[1].trim(),
      amount: parseFloat(match[2]),
      payment_method: match[3].trim(),
      transaction_id: "-",
      payment_screenshot: undefined
    }));
  }, [invoice?.payments, invoice?.notes]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="mb-4 animate-spin" size={40} />
        <p className="text-sm text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="mb-4 text-lg text-slate-500">Invoice not found</p>
          <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
            <ArrowLeft size={16} className="mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const balance = Number(invoice.balance_amount || 0);

  // console.log("ss----------->", `${baseUrl}/${invoice.payment_screenshot}`);

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <p className="text-xs text-slate-500">Order invoice</p>
            <h1 className="text-lg font-semibold text-slate-900">#{invoice.booking_no}</h1>
          </div>
        </div>
        <div className="text-sm text-slate-500">Date: {invoice.invoice_date}</div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">

          {/* Action buttons */}
          <div className="flex flex-wrap justify-end gap-2">
            {/* <Button
              onClick={() => balance > 0 ? setIsDialogOpen(true) : undefined}
              disabled={balance <= 0}
              className={`h-10 gap-2 rounded-lg px-4 text-sm font-medium text-white ${
                balance > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Plus size={16} /> {balance > 0 ? "Add Payment" : "Paid ✓"}
            </Button> */}
            <Button
              onClick={() => router.push(`/inventory/advance-booking/add?id=${id}`)}
              className="h-10 gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Edit2 size={16} /> Edit
            </Button>
            <Button
              onClick={() => router.push(`/inventory/advance-booking/print?id=${id}`)}
              className="h-10 gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer size={16} /> Print
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Customer details */}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Customer details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="text-base font-semibold text-slate-900">{invoice.customer_name || "Walk-in Customer"}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-base text-slate-900">{invoice.customer_phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className={`mt-1 inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${getStatusClasses(invoice.payment_status)}`}>
                      {invoice.payment_status || "PENDING"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Billing address</p>
                  <p className="text-sm text-slate-700">{invoice.customer_address || "N/A"}</p>
                </div>
              </div>
            </section>

            {/* Payment summary */}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Payment summary</h2>
                {/* <Button
                  size="sm"
                  onClick={() => balance > 0 ? setIsDialogOpen(true) : undefined}
                  disabled={balance <= 0}
                  className={`h-9 gap-1 rounded-lg px-3 text-xs font-medium text-white ${
                    balance > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Plus size={12} /> {balance > 0 ? "Add Payment" : "Paid ✓"}
                </Button> */}
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
                <div className={`rounded-lg border p-4 ${balance > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs ${balance > 0 ? "text-red-600" : "text-slate-500"}`}>Due</p>
                  <p className={`mt-1 text-lg font-semibold ${balance > 0 ? "text-red-700" : "text-slate-900"}`}>
                    Rs. {formatAmount(invoice.balance_amount)}
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
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Payment Screenshot</p>
                  <div
                    className="h-20 w-20 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { setPreviewSrc(`${baseUrl}/${invoice.payment_screenshot}`); setPreviewTitle("Payment Screenshot"); }}
                  >
                    <img src={`${baseUrl}/${invoice.payment_screenshot}`} alt="Payment Screenshot" className="h-full w-full object-cover" />
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
                    {derivedPayments.length} Entries
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {derivedPayments.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {derivedPayments.map((payment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-1 rounded-full",
                              payment.payment_method?.toLowerCase().includes('cash') ? "bg-emerald-500" : "bg-blue-500"
                            )} />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900">
                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                              </span>
                              <span className={cn(
                                "mt-0.5 text-[10px] font-bold uppercase tracking-wider",
                                payment.payment_method?.toLowerCase().includes('cash') ? "text-emerald-600" : "text-blue-600"
                              )}>
                                {payment.payment_method}
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
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Paid</span>
                        <span className="text-sm font-bold text-blue-700 tabular-nums">
                          ₹{formatAmount(invoice.paid_amount)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50/30">
                      <div className="mx-auto h-10 w-10 text-slate-300 mb-2 flex items-center justify-center">
                        <History size={24} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">No payment history found</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Order items */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Order items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-3 text-slate-900">{item.product_name || "Unknown Product"}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-slate-700">Rs. {formatAmount(item.price)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        Rs. {formatAmount(Number(item.total) || Number(item.quantity) * Number(item.price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payment history */}
          {invoice.payments && invoice.payments.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <History size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Method</th>
                      <th className="px-5 py-3 text-left">Reference</th>
                      <th className="px-5 py-3 text-left">Screenshot</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.payments.map((payment, idx) => (
                      <tr key={idx}>
                        <td className="px-5 py-3 text-slate-700">{payment.payment_date || "-"}</td>
                        <td className="px-5 py-3 text-slate-700">{payment.payment_method || "-"}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{payment.transaction_id || "-"}</td>
                        <td className="px-5 py-3">
                          {payment.payment_screenshot ? (
                            <div
                              className="h-10 w-10 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                              onClick={() => { setPreviewSrc(`${baseUrl}/${payment.payment_screenshot}`); setPreviewTitle("Payment Screenshot"); }}
                            >
                              <img src={`${baseUrl}/${payment.payment_screenshot}`} alt="proof" className="h-full w-full object-cover" />
                            </div>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-900">Rs. {formatAmount(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {invoice.notes && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Notes</h2>
              <p className="text-sm text-slate-700">{invoice.notes}</p>
            </section>
          )}
        </div>
      </main>

      {/* Add Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[440px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Add payment for #{invoice.booking_no}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-slate-600">
                Amount <span className="text-slate-400">(Balance: Rs. {formatAmount(balance)})</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                min={0.01}
                max={balance}
                className="h-11 rounded-lg border-slate-300"
                value={paymentAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPaymentAmount(val > balance ? String(balance) : e.target.value);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-slate-600">Payment Date</Label>
              <Input type="date" className="h-11 rounded-lg border-slate-300" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
              <select
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setTid(""); setPaymentScreenshot(null); }}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Online">Online</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            {isUpi && (
              <>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Reference / Transaction ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter reference no."
                    className="h-11 rounded-lg border-slate-300"
                    value={tid}
                    onChange={(e) => setTid(e.target.value)}
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
                      className="h-11 rounded-lg border-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                    />
                    {paymentScreenshot && (
                      <div
                        className="h-11 w-11 shrink-0 rounded-lg border border-blue-200 overflow-hidden cursor-pointer"
                        onClick={() => setPreviewSrc(URL.createObjectURL(paymentScreenshot))}
                      >
                        <img src={URL.createObjectURL(paymentScreenshot)} alt="preview" className="h-full w-full object-cover" />
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

      {/* Image preview overlay */}
      {previewSrc && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full">
            <button
              onClick={() => { setPreviewSrc(""); setPreviewTitle(""); }}
              className="absolute -top-10 right-0 flex items-center gap-1 text-white/80 hover:text-white text-sm bg-white/10 px-3 py-1.5 rounded-lg"
            >
              <X size={16} /> Close
            </button>
            {previewTitle && <p className="text-white text-xs font-semibold mb-2 text-center">{previewTitle}</p>}
            <img src={previewSrc} alt="Preview" className="max-h-[80vh] w-full object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
