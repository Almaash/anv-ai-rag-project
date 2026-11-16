"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type BookingItem = {
  product_name?: string;
  quantity?: number | string;
  price?: number | string;
  discount_type?: "percentage" | "fixed" | string;
  discount_value?: number | string;
  discount_amount?: number | string;
  tax_type?: "percentage" | "fixed" | string;
  tax_value?: number | string;
  tax_amount?: number | string;
  total?: number | string;
};

type AdvanceBookingData = {
  booking_no?: string;
  booking_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  payment_method?: string;
  payment_status?: string;
  subtotal?: number | string;
  discount_amount?: number | string;
  tax_amount?: number | string;
  grand_total?: number | string;
  paid_amount?: number | string;
  balance_amount?: number | string;
  notes?: string;
  items?: BookingItem[];
};

function formatAmount(value: unknown): string {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-IN");
}

function PrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [booking, setInvoice] = useState<AdvanceBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const id = searchParams.get("id");



  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const branchAddress = user?.branch_details?.address || "-";

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`${ProjectApiList.GET_ADVANCE_BOOKINGS}/${id}`);
        if (res.data.status === "success") {
          setInvoice(res.data.data);
        }
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const computedBookingSubtotal = useMemo(() => {
    if (!booking?.items) return 0;
    return booking.items.reduce((sum: number, item: BookingItem) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return sum + qty * price;
    }, 0);
  }, [booking]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!booking) {
    return <div className="p-10 text-center">Advance booking not found.</div>;
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:py-0">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #a4-booking, #a4-booking * { visibility: visible !important; }
          #a4-booking {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 190mm !important;
            min-height: auto !important;
            height: auto !important;
            box-sizing: border-box !important;
            padding: 8mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print max-w-[900px] mx-auto mb-4 flex items-center justify-between px-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Printer size={16} className="mr-2" /> Print
        </Button>
      </div>

      <div
        id="a4-booking"
        className="mx-auto w-[210mm] min-h-[297mm] bg-white border border-slate-200 shadow-sm rounded-sm p-8 text-slate-900"
      >
        <header className="border-b border-slate-300 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">ADVANCE BOOKING</h1>
              <p className="text-sm text-slate-600 mt-1">Booking No: {booking.booking_no}</p>
              <p className="text-sm text-slate-600">Date: {booking.booking_date}</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-semibold">
                Anavaran Livelihood Services
              </h2>
              <p className="text-xs text-slate-600">{branchAddress}</p>
              <p className="text-xs text-slate-600">
                GSTIN: 20ABFCA0195B1ZF
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Customer Details</p>
            <p className="font-medium mt-1">{booking.customer_name || "Cash Customer"}</p>
            <p className="text-sm text-slate-600">{booking.customer_phone || "-"}</p>
            <p className="text-sm text-slate-600">{booking.customer_address || "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Payment Details</p>
            <p className="text-sm mt-1">
              Method: <span className="font-medium">{booking.payment_method || "-"}</span>
            </p>
            {/* <p className="text-sm">
              Status: <span className="font-medium">{booking.payment_status || "-"}</span>
            </p> */}
          </div>
        </section>

        <section className="pt-4">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-slate-200 w-10">#</th>
                <th className="px-3 py-2 border-b border-slate-200">Booking Item</th>
                <th className="px-3 py-2 border-b border-slate-200 text-center w-16">Qty</th>
                <th className="px-3 py-2 border-b border-slate-200 text-right w-28">Discount</th>
                <th className="px-3 py-2 border-b border-slate-200 text-right w-28">GST</th>
                <th className="px-3 py-2 border-b border-slate-200 text-right w-28">Rate</th>
                <th className="px-3 py-2 border-b border-slate-200 text-right w-28">Booking Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.items?.map((item: BookingItem, idx: number) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.price) || 0;
                const gross = qty * rate;
                const discountAmountFromType = (() => {
                  const discountType = String(item.discount_type || "percentage").toLowerCase();
                  const discountValue = Number(item.discount_value) || 0;
                  if (discountType === "fixed") return discountValue;
                  return (gross * discountValue) / 100;
                })();
                const discountAmount = Number(item.discount_amount);
                const itemDiscount = Number.isFinite(discountAmount) ? discountAmount : discountAmountFromType;

                const taxAmountFromType = (() => {
                  const taxType = String(item.tax_type || "percentage").toLowerCase();
                  const taxValue = Number(item.tax_value) || 0;
                  const taxable = Math.max(gross - itemDiscount, 0);
                  if (taxType === "fixed") return taxValue;
                  return (taxable * taxValue) / 100;
                })();
                const taxAmount = Number(item.tax_amount);
                const itemTax = Number.isFinite(taxAmount) ? taxAmount : taxAmountFromType;

                const amount = Number(item.total) || Math.max(gross - itemDiscount + itemTax, 0);
                return (
                  <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{item.product_name || "-"}</td>
                    <td className="px-3 py-2 text-center">{qty}</td>
                    <td className="px-3 py-2 text-right">Rs. {formatAmount(itemDiscount)}</td>
                    <td className="px-3 py-2 text-right">Rs. {formatAmount(itemTax)}</td>
                    <td className="px-3 py-2 text-right">Rs. {formatAmount(rate)}</td>
                    <td className="px-3 py-2 text-right">Rs. {formatAmount(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="pt-5 flex justify-end">
          <div className="w-[320px] space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Booking Subtotal</span>
              <span>Rs. {formatAmount(computedBookingSubtotal || booking.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Discount</span>
              <span>Rs. {formatAmount(booking.discount_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tax</span>
              <span>Rs. {formatAmount(booking.tax_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 font-semibold">
              <span>Total Booking Amount</span>
              <span>Rs. {formatAmount(booking.grand_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Advance Paid</span>
              <span>Rs. {formatAmount(booking.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Remaining Balance</span>
              <span>Rs. {formatAmount(booking.balance_amount)}</span>
            </div>
          </div>
        </section>

        <footer className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <p>Notes: {booking.notes || "Thank you for your business."}</p>
          <div className="mt-5 flex justify-end">
            <div className="text-center w-48">
              <div className="border-t border-slate-600 pt-2">Authorized Signatory</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function InvoicePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-500" />
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}