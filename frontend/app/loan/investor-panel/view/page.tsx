"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import {
  ArrowLeft,
  Loader2,
  User,
  Hash,
} from "lucide-react";

/* ================= HELPERS ================= */

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value: number) =>
  `₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InfoItem = ({ label, value }: any) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">
      {value || "—"}
    </p>
  </div>
);

/* ================= MAIN CONTENT ================= */

function InvestmentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [imgPreview, setImgPreview] = useState(false);

  const fetchInvestment = async () => {
    if (!id) return;

    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.GET_INVESTOR_INVESTMENTS}/${id}`
      );

      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Fetch investment failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestment();
  }, [id]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
          Retrieving Investment...
        </p>
      </div>
    );

  if (!data)
    return (
      <div className="py-32 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <Hash size={32} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
            Investment Not Found
          </h3>
          <p className="text-xs font-medium text-gray-400 uppercase">
            The record might have been removed or ID is invalid
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );

  /* ✅ FIXED STRUCTURE */
  const inv = data.investment || {};
  const isSelfInvestor = inv.investor_type?.name?.toLowerCase() === "self";
  const weekly = data.weekly_portfolio || {};
  const investor = inv.investor || {};
  const rawHistory = Array.isArray(inv.payment_history) ? inv.payment_history : [];

  const allPaymentsAsc = [...rawHistory].sort(
    (a, b) => new Date(String(a?.date || "")).getTime() - new Date(String(b?.date || "")).getTime()
  );

  let runningBalance = Number(inv.amount || inv.total_amount || 0);
  const processedHistory = allPaymentsAsc
    .map((entry: any) => {
      const deducted = Number(entry?.amount || 0);
      const previous = runningBalance;
      const remaining = previous - deducted;
      runningBalance = remaining;
      return {
        payment_id: entry?.payment_id || "—",
        loan_id: entry?.loan_id || "—",
        date: entry?.date || "",
        type: entry?.type || "disbursement",
        previous,
        deducted,
        remaining,
      };
    })
    .sort((a, b) => new Date(String(b.date || "")).getTime() - new Date(String(a.date || "")).getTime());

    // console.log("Processed History:", `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${investor.profile_photo}`);
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-medium uppercase">
            Investment: {inv.unique_id}
          </h1>
          <p className="text-sm text-gray-500">Current Status: Active</p>
        </div>

        <div className="flex gap-2">
          {/* <button
            onClick={() => router.push(`/loan/investor-panel/add?edit=${id}`)}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Edit
          </button> */}
          <button
            onClick={() => {
              if (!isSelfInvestor) {
                router.push(`/loan/investor-panel/weekly-schedule/?id=${id}`);
              }
            }}
            disabled={isSelfInvestor}
            className={`px-3 py-1.5 text-xs rounded-md
    ${isSelfInvestor
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            Weekly Schedule
          </button>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-xs bg-white rounded-md hover:bg-gray-200 border"
          >
            Back
          </button>
        </div>
      </div>

      {/* BASIC INFO */}
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex-shrink-0 overflow-hidden border-2 border-blue-100 cursor-pointer" onClick={() => investor.profile_photo && setImgPreview(true)}>
            {investor.profile_photo ? (
              <img
                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${investor.profile_photo}`} alt={`${investor.first_name} ${investor.last_name}`}
                className="w-full h-full object-cover hover:opacity-80 transition"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={32} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-widest mb-1">
              Assigned Investor
            </p>
            <h2 className="text-xl font-medium text-gray-800 uppercase leading-none">
              {investor.first_name} {investor.last_name}
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {investor.unique_id}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-2">
          <InfoItem
            label="Principal Amount"
            value={`₹ ${Number(inv.amount).toLocaleString("en-IN")}`}
          />
          <InfoItem label="Pool Allocation" value={inv.pool?.name} />
          <InfoItem
            label="Investor Type"
            value={inv.investor_type?.name}
          />
          <InfoItem label="Target ROI" value={`${inv.rate}%`} />
          <InfoItem
            label="Yearly Return"
            value={`₹ ${Number(inv.yearly).toLocaleString("en-IN")}`}
          />
          <InfoItem label="Investment Date" value={formatDate(inv.date)} />
          <InfoItem
            label="Lock-in End Date"
            value={formatDate(inv.lockin)}
          />
          <InfoItem
            label="Maturity Value"
            value={`₹ ${Number(inv.maturity).toLocaleString("en-IN")}`}
          />
          {/* <InfoItem label="CMS Admin" value={inv.cms_admin_id} /> */}

          <div>
            <p className="text-xs text-gray-500">Capital Status</p>
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
              verified
            </span>
          </div>
        </div>
      </div>

      {/* ✅ WEEKLY PORTFOLIO SUMMARY */}
      {/* <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-sm font-semibold mb-4 uppercase text-gray-700">
          Portfolio Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InfoItem
            label="Total Earnings"
            value={`₹ ${Number(
              weekly.total_earnings || 0
            ).toLocaleString("en-IN")}`}
          />
          <InfoItem
            label="Maturity Amount"
            value={`₹ ${Number(
              weekly.maturity_amount || 0
            ).toLocaleString("en-IN")}`}
          />
          <InfoItem
            label="Allocation Charges"
            value={`₹ ${Number(
              weekly.allocation_charges_total || 0
            ).toLocaleString("en-IN")}`}
          />
        </div>
      </div> */}

      {/* SUMMARY NOTE */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <p className="text-sm font-semibold mb-2">Summary Note</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          This investment is registered under the{" "}
          {inv.pool?.name || "General Pool"}. The maturity value is
          estimated after considering the 3-year performance period
          and standard allocation charges. The lock-in period applies
          until {formatDate(inv.lockin)}.
        </p>
      </div>

      {/* Fund Usage / Disbursement History */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-700">Fund Usage History</h3>
          {/* <p className="text-xs text-gray-500 mt-1">
            Investor ka paisa kahan gaya, kis loan me gaya, aur har transaction ke baad remaining balance.
          </p> */}
        </div>

        {processedHistory.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-sm text-gray-500 text-center">
            No investor disbursement/payment history record found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Payment ID</th>
                  <th className="px-3 py-3 text-left font-semibold">Loan ID</th>
                  <th className="px-3 py-3 text-left font-semibold">Date</th>
                  <th className="px-3 py-3 text-left font-semibold">Type</th>
                  <th className="px-3 py-3 text-right font-semibold">Previous Balance</th>
                  <th className="px-3 py-3 text-right font-semibold">Deducted</th>
                  <th className="px-3 py-3 text-right font-semibold">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedHistory.map((row: any) => (
                  <tr key={`${row.payment_id}-${row.loan_id}-${row.date}`} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono text-blue-700">{row.payment_id}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{row.loan_id}</td>
                    <td className="px-3 py-3 text-gray-700">{formatDate(row.date)}</td>
                    <td className="px-3 py-3 capitalize text-gray-700">{row.type}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(row.previous)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-red-600">-{formatCurrency(row.deducted)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-green-700">{formatCurrency(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {imgPreview && investor.profile_photo && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setImgPreview(false)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImgPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 shadow-lg z-10 font-bold text-sm"
            >
              ✕
            </button>
            <img
              src={`http://localhost:8000/${investor.profile_photo}`}
              alt={`${investor.first_name} ${investor.last_name}`}
              className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvestmentDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Syncing with ledger...
          </p>
        </div>
      }
    >
      <InvestmentDetailsContent />
    </Suspense>
  );
}