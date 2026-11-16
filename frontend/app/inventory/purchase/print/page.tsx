"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type PurchaseInvoiceItem = {
  product_name?: string;
  quantity?: number | string;
  rate?: number | string;
  amount?: number | string;
};

type PurchaseInvoiceData = {
  invoice_no?: string;
  invoice_date?: string;
  vendor_name?: string;
  vendor_phone?: string;
  vendor_address?: string;
  payment_method?: string;
  payment_status?: string;
  subtotal?: number | string;
  discount_amount?: number | string;
  tax_amount?: number | string;
  grand_total?: number | string;
  paid_amount?: number | string;
  due_amount?: number | string;
  notes?: string;
  items?: PurchaseInvoiceItem[];
};

function formatAmount(value: unknown): string {
  return (Number(value) || 0).toLocaleString("en-IN");
}

function PurchaseInvoicePrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<PurchaseInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const id = searchParams.get("id");


  const branchAddress = JSON.parse(localStorage.getItem("user") || "{}")?.branch_details?.address;

  const fetchInvoice = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const byInvoice = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE}/${id}`);
      if (byInvoice.data.success) {
        setInvoice(byInvoice.data.data);
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
            return;
          }
        }

        const generated = await axiosInstance.post(`${ProjectApiList.GET_PURCHASE_INVOICE_HISTORY}/${id}/invoices/generate`);
        if (generated.data?.success && generated.data?.data?.id) {
          const generatedInvoice = await axiosInstance.get(`${ProjectApiList.GET_PURCHASE_INVOICE}/${generated.data.data.id}`);
          if (generatedInvoice.data.success) {
            setInvoice(generatedInvoice.data.data);
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

  const computedSubtotal = useMemo(() => {
    return invoice?.items?.reduce((sum, item) => {
      return sum + (Number(item.amount) || Number(item.quantity) * Number(item.rate) || 0);
    }, 0) || 0;
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="mb-4 animate-spin" size={40} />
        <p className="text-sm text-slate-500">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="mb-4 text-lg text-slate-500">Purchase invoice not found</p>
          <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft size={16} className="mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body * { visibility: hidden !important; }
          #a4-purchase-invoice, #a4-purchase-invoice * { visibility: visible !important; }
          #a4-purchase-invoice {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/purchase/invoice?id=${id}`)}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <p className="text-xs text-slate-500">Purchase print preview</p>
              <h1 className="text-lg font-semibold text-slate-900">#{invoice.invoice_no}</h1>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer size={16} className="mr-2" /> Print
          </Button>
        </div>

        <div id="a4-purchase-invoice" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Vendor Details</h3>
              <div>
                <p className="text-base font-black text-slate-900">{invoice.vendor_name || "-"}</p>
                <p className="text-sm font-bold text-slate-700">{invoice.vendor_phone || "-"}</p>
                <p className="w-64 text-xs font-bold text-slate-500">{invoice.vendor_address || "-"}</p>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Purchase Invoice</h2>
              <p className="text-[11px] font-bold uppercase text-slate-500">ID: #{invoice.invoice_no}</p>
              <p className="text-[11px] font-bold uppercase text-slate-500">Date: {invoice.invoice_date}</p>
              <div className="pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-900">Anavaran Livelihood Services</h4>
                <p className="text-[9px] font-bold capitalize tracking-tight text-slate-400">{branchAddress || "no branch address"}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4 text-left w-12">#</th>
                  <th className="px-6 py-4 text-left">Product</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Rate</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="font-bold">
                    <td className="px-6 py-4 text-xs italic text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-[11px] uppercase text-slate-900">{item.product_name || "-"}</td>
                    <td className="px-6 py-4 text-center text-slate-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-900">Rs. {formatAmount(item.rate)}</td>
                    <td className="px-6 py-4 text-right text-slate-900">
                      Rs. {formatAmount(Number(item.amount) || Number(item.quantity) * Number(item.rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-6">
            <div className="w-[300px] space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                <span>Subtotal</span>
                <span>Rs. {formatAmount(computedSubtotal || invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                <span>Tax</span>
                <span>Rs. {formatAmount(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                <span>Discount</span>
                <span className="text-red-500">Rs. {formatAmount(invoice.discount_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-[12px] font-black uppercase text-slate-900">Grand Total</span>
                <span className="text-base font-black text-blue-600">Rs. {formatAmount(invoice.grand_total)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                <span>Paid</span>
                <span>Rs. {formatAmount(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase text-red-600">
                <span>Due</span>
                <span>Rs. {formatAmount(invoice.due_amount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 flex items-end justify-between border-t border-slate-100 pt-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
              <p className="text-[11px] font-bold italic leading-relaxed text-slate-600">
                {invoice.notes || "Computer generated invoice."}
              </p>
            </div>
            <div className="w-56 border-t-2 border-slate-900 pt-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Authorized Receiver</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseInvoicePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-slate-500" />
        </div>
      }
    >
      <PurchaseInvoicePrintContent />
    </Suspense>
  );
}
