"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { ArrowLeft, Loader2, User, Phone, Mail, MapPin, Calendar, CreditCard, Hash, FileText, TrendingUp, Users, History, Wallet } from "lucide-react";

/* ================= HELPERS ================= */

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num || 0);
};

const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  return `${baseUrl}/${path}`;
};

const InfoItem = ({ label, value, className = "" }: any) => (
  <div className={className}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800 break-all leading-tight">
      {value || "—"}
    </p>
  </div>
);

const calculateAge = (dob?: string) => {
  if (!dob) return "—";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} Years` : "—";
};

const DocumentImage = ({ label, image }: any) => {
  const url = getImageUrl(image);

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <p className="text-xs text-gray-500">{label}</p>

      {url ? (
        <a href={url} target="_blank">
          <img
            src={url}
            alt={label}
            className="h-36 w-full object-cover rounded-md hover:opacity-90 cursor-pointer"
          />
        </a>
      ) : (
        <div className="h-36 flex items-center justify-center bg-gray-100 text-xs text-gray-400 rounded-md">
          No Image
        </div>
      )}
    </div>
  );
};

/* ================= MAIN CONTENT ================= */

function InvestorDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unique_id = searchParams.get("id");

  const [investor, setInvestor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvestor = async () => {
    if (!unique_id) return;

    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.GET_SINGLE_INVESTOR_BASIC_INFO}/${unique_id}`
      );

      if (res.data.success) {
        setInvestor(res.data.data);
      }
    } catch (err) {
      console.error("Fetch investor failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestor();
  }, [unique_id]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving Profile...</p>
      </div>
    );

  if (!investor)
    return (
      <div className="py-32 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <Hash size={32} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Investor Not Found</h3>
          <p className="text-xs font-bold text-gray-400 uppercase">The record might have been removed or ID is invalid</p>
        </div>
        <button onClick={() => router.back()} className="px-6 py-2 bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors">
          Go Back
        </button>
      </div>
    );

  const profileUrl = getImageUrl(investor.profile_photo);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">
            {investor.first_name} {investor.middle_name ? `${investor.middle_name} ` : ""}{investor.last_name}
          </h1>
          <p className="text-sm text-gray-500">
            {investor.unique_id}
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-xs bg-white rounded-md hover:bg-gray-200 border"
        >
          Back
        </button>
      </div>

      {/* PHOTO + BASIC INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: PHOTO & REFERRAL */}
        <div className="space-y-6">
          {/* PHOTO */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
            <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Investor Photo</p>
              <User size={14} className="text-gray-400" />
            </div>
            <div className="p-4">
              {investor.profile_photo ? (
                <img
                  src={getImageUrl(investor.profile_photo) || ""}
                  className="w-full h-64 object-cover rounded-lg border shadow-inner"
                />
              ) : (
                <div className="h-64 bg-gray-50 flex flex-col items-center justify-center text-gray-300 rounded-lg border-2 border-dashed">
                  <User size={48} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase mt-2">No Photo Uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* REFERRAL INFO */}
          <div className="bg-blue-600 rounded-xl shadow-md p-5 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Hash size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-4">Referral Details</p>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-60">Type</p>
                  <p className="text-lg font-black tracking-tight">{investor.referral_type || "Self"}</p>
                </div>
                {investor.referral_type === "Referral" && investor.referral_details && (
                  <div className="space-y-3">

                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Referral ID</p>
                      <p className="text-lg font-black tracking-tight">
                        {investor.referral_details.unique_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Name</p>
                      <p className="text-sm font-semibold">
                        {investor.referral_details.full_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Mobile</p>
                      <p className="text-sm font-semibold">
                        {investor.referral_details.mobile}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Email</p>
                      <p className="text-sm font-semibold break-all">
                        {investor.referral_details.email}
                      </p>
                    </div>

                    {/* <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Total Bonus</p>
                      <p className="text-sm font-bold text-yellow-300">
                        ₹ {investor.referral_details.total_referral_bonus}
                      </p>
                    </div> */}

                  </div>
                )}
                {/* <div>
                  <p className="text-[10px] font-bold uppercase opacity-60">Enrollment Date</p>
                  <p className="text-lg font-black tracking-tight">{formatDate(investor.enrollment_date)}</p>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Personal & Contact Details</p>
              <FileText size={14} className="text-gray-400" />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <InfoItem label="First Name" value={investor.first_name} />
                <InfoItem label="Last Name" value={investor.last_name} />
                <InfoItem label="Gender" value={investor.gender} className="capitalize" />

                <InfoItem label="Email Address" value={investor.email} />
                <InfoItem label="Mobile Number" value={investor.mobile} />
                <InfoItem label="Emergency Contact" value={investor.emergency_contact} />

                <InfoItem label="Date of Birth" value={formatDate(investor.date_of_birth)} />
                <InfoItem label="Current Age" value={calculateAge(investor.date_of_birth)} />
                <InfoItem label="PAN Number" value={investor.pan_number} className="uppercase" />

                <InfoItem label="Aadhaar Number" value={investor.aadhaar_number} />
                <InfoItem label="Joined System" value={formatDate(investor.created_at)} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Account Status</p>
                  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-green-500 text-white shadow-sm inline-block">
                    {investor.status || 'Active'}
                  </span>
                </div>

                <InfoItem label="Current Address" value={investor.current_address} className="col-span-full md:col-span-2" />
                <InfoItem label="Permanent Address" value={investor.permanent_address} className="col-span-full md:col-span-2" />
              </div>
            </div>
          </div>

          {/* NOMINEES */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Nominee Information</p>
              <User size={14} className="text-gray-400" />
            </div>
            <div className="p-6">
              {investor.nominee_details ? (
                (() => {
                  try {
                    const nominees = typeof investor.nominee_details === 'string'
                      ? JSON.parse(investor.nominee_details)
                      : investor.nominee_details;

                    if (Array.isArray(nominees) && nominees.length > 0) {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {nominees.map((n: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-4 border relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 opacity-5">
                                <span className="text-4xl font-black">{i + 1}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <InfoItem label="Name" value={n.name} />
                                <InfoItem label="Relation" value={n.relation} />
                                <InfoItem label="Contact" value={n.contact} />
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Share %</p>
                                  <p className="text-sm font-black text-blue-600">{n.share}%</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <p className="text-xs text-gray-400 italic">No nominees specified</p>;
                  } catch (e) {
                    return <p className="text-xs text-red-400">Error parsing nominee data</p>;
                  }
                })()
              ) : (
                <p className="text-xs text-gray-400 italic">No nominees listed</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTS */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-sm font-semibold mb-4">Uploaded Documents</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DocumentImage label="PAN Card" image={investor.pan_card_doc} />
          <DocumentImage label="Aadhaar Card" image={investor.aadhaar_card_doc} />
          <DocumentImage label="Bank Passbook" image={investor.passbook_doc} />
          <DocumentImage label="Voter ID" image={investor.voter_id_doc} />
        </div>
      </div>

      {/* REFERRAL STATISTICS & SUMMARIES */}
      {investor.referral_bonus_summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Earned</p>
              <TrendingUp className="text-green-500" size={16} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-800">{formatCurrency(investor.referral_bonus_summary.total_earned)}</p>
              <p className="text-xs text-gray-500 mt-1">From {investor.referral_bonus_summary.total_transactions} referrals</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Bonus</p>
              <Wallet className="text-blue-500" size={16} />
            </div>
            <div>
              <p className="text-xl font-black text-blue-600">{formatCurrency(investor.referral_bonus_summary.current_available)}</p>
              <p className="text-xs text-gray-500 mt-1">Ready to use</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Used</p>
              <History className="text-orange-500" size={16} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-800">{formatCurrency(investor.referral_bonus_summary.total_used)}</p>
              <p className="text-xs text-gray-500 mt-1">In {investor.referral_bonus_summary.total_investments_with_bonus} investments</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Referrals</p>
              <Users className="text-indigo-500" size={16} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-800">{investor.total_referrals}</p>
              <p className="text-xs text-gray-500 mt-1">Investors referred</p>
            </div>
          </div>
        </div>
      )}



      {/* REFERRAL DETAILS TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* REFERRED INVESTORS */}
        {investor.referred_investors?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Referred Investors</p>
              <Users size={14} className="text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Investor</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Enrolled</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">First Inv.</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {investor.referred_investors?.length > 0 ? (
                    investor.referred_investors.map((ref: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-bold text-gray-800 leading-none">{ref.name}</p>
                            <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">{ref.unique_id}</p>
                          </div>
                        </td>
                        <td className="p-4 text-[11px] font-medium text-gray-500">{formatDate(ref.enrollment_date)}</td>
                        <td className="p-4 text-right">
                          <div>
                            <p className="text-[11px] font-bold text-gray-700">{formatCurrency(ref.first_investment?.amount)}</p>
                            <p className="text-[10px] text-gray-400">{formatDate(ref.first_investment?.date)}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-black text-green-600">+{formatCurrency(ref.first_investment?.bonus_earned_from_this)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-gray-400 italic">No investors referred yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BONUS USAGE HISTORY */}
        {investor.referral_bonus_usage_history?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Referral Bonus Usage</p>
              <History size={14} className="text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Investment ID</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Usage Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Bonus Used</th>
                    <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Total Inv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {investor.referral_bonus_usage_history?.length > 0 ? (
                    investor.referral_bonus_usage_history.map((usage: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-bold text-gray-700">{usage.investment_id}</td>
                        <td className="p-4 text-[11px] font-medium text-gray-500">{formatDate(usage.investment_date)}</td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-black text-orange-600">-{formatCurrency(usage.referral_amount_used)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-gray-800">{formatCurrency(usage.total_investment_amount)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-gray-400 italic">No bonus usage recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* EARNINGS HISTORY */}
      {investor.referral_earnings_history?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Bonus Earnings History</p>
            <TrendingUp size={14} className="text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b">
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Transaction ID</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Referee / Source</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Date & Time</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Investment</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Earned</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {investor.referral_earnings_history?.length > 0 ? (
                  investor.referral_earnings_history.map((trx: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-[11px] font-mono font-bold text-gray-600 uppercase">{trx.transaction_id}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-800 leading-none">{trx.referee_name}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">{trx.referee_unique_id}</p>
                      </td>
                      <td className="p-4 text-[11px] font-medium text-gray-500 whitespace-nowrap">{formatDateTime(trx.date)}</td>
                      <td className="p-4 text-right">
                        <p className="text-[11px] font-bold text-gray-700">{formatCurrency(trx.investment_amount)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{trx.investment_unique_id}</p>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-black text-green-600">+{formatCurrency(trx.referral_amount_earned)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-green-100 text-green-600 border border-green-200">
                          {trx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-gray-400 italic">No earnings history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVESTMENTS */}
      {investor.investments?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-tight text-gray-600">Investments</p>
            <TrendingUp size={14} className="text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b">
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Investment ID</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Date</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Amount</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Rate</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400">Lock-in</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-center">Week</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">This Week Earning</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-right">Closing Balance</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-gray-400 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {investor.investments.map((inv: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-[11px] font-mono font-bold text-gray-700">{inv.investment_unique_id}</td>
                    <td className="p-4 text-[11px] text-gray-500">{formatDate(inv.investment_date)}</td>
                    <td className="p-4 text-right text-sm font-black text-gray-800">{formatCurrency(inv.amount)}</td>
                    <td className="p-4 text-right text-[11px] font-bold text-blue-600">{inv.rate}%</td>
                    <td className="p-4 text-[11px] text-gray-500">{formatDate(inv.lockin)}</td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-black text-gray-700">{inv.current_week}<span className="text-[10px] font-medium text-gray-400">/{inv.total_weeks}</span></span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-green-600">+{formatCurrency(inv.current_week_data?.total_earning)}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(inv.current_week_data?.date)}</p>
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-gray-800">{formatCurrency(inv.current_week_data?.closing_balance)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${inv.current_week_data?.redemption_status === 'not_redeemed'
                        ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                        : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                        {inv.current_week_data?.redemption_status?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}

export default function InvestorDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Waking Up Session...</p>
      </div>
    }>
      <InvestorDetailsContent />
    </Suspense>
  );
}