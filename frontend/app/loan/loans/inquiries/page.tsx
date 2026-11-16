"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Inquiry = {
  id: number;
  inquiry_id: string;
  product_id: string;
  product_name: string;
  price: number;
  selling_price?: number;
  buying_price?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  branch_id?: string;
  selected_variant?: string;
  attributes?: Record<string, string>;
  created_at?: string;
};

function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ProductInquiryPage() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "verified">("pending");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let isMounted = true;

    const fetchInquiries = async () => {
      try {
        setLoading(true);
        const user = getUser();

        const res = await axiosInstance.get(ProjectApiList.GET_PRODUCT_INQUIRIES, {
          params: {
            branch_id: user?.branch || user?.branch_id || undefined,
            verified_by_fe: activeTab === "verified" ? 1 : 0,
            search: debouncedSearch || undefined,
          },
        });

        if (!isMounted) return;

        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(list);
      } catch {
        if (!isMounted) return;
        setRows([]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchInquiries();

    return () => {
      isMounted = false;
    };
  }, [activeTab, debouncedSearch]);

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Product Inquiries</h1>
        {/* <p className="text-slate-600 mt-1 text-sm">Branch-wise inquiry records.</p> */}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] text-slate-500">Total Inquiries</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{summary.total}</p>
          </div> */}
          {/* <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] text-slate-500">Unique Products</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{summary.uniqueProducts}</p>
          </div> */}
          {/* <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] text-slate-500">Total Price</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">Rs. {summary.totalAmount.toLocaleString()}</p>
          </div> */}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeTab === "pending"
                ? "bg-blue-600 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeTab === "verified"
                ? "bg-blue-600 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Verified
          </button>
        </div>

        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={`Search ${activeTab} inquiries...`}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/40"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="h-7 w-7 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No {activeTab} inquiry data found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Inquiry ID</p>
                  <p className="text-sm font-semibold text-slate-800">{item.inquiry_id || "-"}</p>
                </div>
                <span className="inline-flex rounded-full bg-slate-100 text-slate-700 text-xs px-2.5 py-1 font-medium">
                  {item.branch_id || "No Branch"}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[13px] text-slate-500">Product</p>
                <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{item.product_name || "Unknown Product"}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.product_id || "-"}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Price</p>
                  <p className="font-semibold text-slate-800">Rs. {Number(item.price || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[13px]">
                <p className="text-slate-700"><span className="text-slate-500">Customer:</span> {item.customer_name || "-"}</p>
                <p className="text-slate-700"><span className="text-slate-500">Phone:</span> {item.customer_phone || "-"}</p>
                <p className="text-slate-500 text-xs">Created: {formatDateTime(item.created_at)}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/loan/loans/inquiries/view?id=${encodeURIComponent(item.inquiry_id || String(item.id))}`}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
