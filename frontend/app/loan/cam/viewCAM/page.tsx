"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Banknote,
  Briefcase,
  History,
  TrendingDown,
  TrendingUp,
  FileText,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  ClipboardCheck,
  Info,
  Edit,
  ArrowLeft
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusMeta: any = {
  created: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Clock, label: "Created" },
  credit_manager: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: ShieldCheck, label: "Credit Manager" },
  branch_manager: { color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Building2, label: "Branch Manager" },
  approved: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Rejected" },
  default: { color: "text-gray-600 bg-gray-50 border-gray-200", icon: AlertCircle, label: "Unknown" },
};

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
    : "—";

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="space-y-1">
    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">
      {value !== undefined && value !== null && value !== "" ? value : "—"}
    </p>
  </div>
);

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <Card className="shadow-none border-gray-200 overflow-hidden">
    <CardHeader className="bg-gray-50/80 py-3 px-4 border-b">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-5">{children}</CardContent>
  </Card>
);

export default function ViewCAMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const camId = searchParams.get("id");

  const [camData, setCamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getRole = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user)?.role : null;
  };
  const isCustomer = getRole() === "customer";
  // const [verifying, setVerifying] = useState(false);
  // const [showConfirm, setShowConfirm] = useState(false);
  // const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (camId) fetchCAMDetails();
  }, [camId]);

  const fetchCAMDetails = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `${ProjectApiList.api_getCAMById}/${camId}`
      );

      if (res.data.success) {
        setCamData(res.data.data);
        // setIsVerified(Boolean(res.data.data.is_verified));
      }
    } catch {
      toast.error("Failed to load CAM details");
    } finally {
      setLoading(false);
    }
  };

  // const handleVerify = async () => {
  //   try {
  //     setVerifying(true);
  //     const res = await axiosInstance.post(
  //       `${ProjectApiList.api_verifyCAM}/${camId}`
  //     );
  //     if (res.data.success) {
  //       toast.success("CAM verified successfully");
  //       setIsVerified(true);
  //       setShowConfirm(false);
  //     }
  //   } catch {
  //     toast.error("Error verifying CAM");
  //   } finally {
  //     setVerifying(false);
  //   }
  // };

  if (loading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500 italic">Loading CAM details...</p>
      </div>
    );

  if (!camData)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-red-500">CAM record not found</p>
      </div>
    );

  const income = camData.income_details;
  const expenditure = camData.expenditure_details;
  const net = camData.net_surplus;

  const baseURL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "";

  const camDocument =
    camData?.verification_documents?.cam_document;


  return (
    <div className="p-6 bg-gray-50/30 min-h-screen space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Credit Appraisal Memorandum
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Memorandum ID</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md border border-blue-100">
              {camData.cam_unique_id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">

          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Verification
          </span>

          {camData.is_verified ? (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[11px] font-semibold rounded-md border border-green-200">
              Verified
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-semibold rounded-md border border-red-200">
              Not Verified
            </span>
          )}

        </div>

        {/* Verification buttons commented out */}
        <div className="flex items-center gap-3">
          {!isCustomer && !camData?.is_verified && (
            <button
              onClick={() => router.push(`/loan/cam/edit?id=${camId}`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Edit className="w-4 h-4" />
              Edit CAM
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* 
          {!isVerified ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <ShieldCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
              Verify & Approve
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-5 py-2 text-emerald-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Verified & Approved</span>
            </div>
          )}
          */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN - MAIN DETAILS */}
        <div className="lg:col-span-2 space-y-8">

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="bg-white border-l-4 border-l-blue-500 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Monthly Income</p>
              <p className="text-lg font-bold text-gray-900">₹{income.totalAccumulatedIncomeMonthly}</p>
            </div>
            <div className="bg-white border-l-4 border-l-purple-500 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Monthly Sale</p>
              <p className="text-lg font-bold text-gray-900">₹{income.totalMonthlySale}</p>
            </div>
            <div className="bg-white border-l-4 border-l-orange-400 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Monthly Exp.</p>
              <p className="text-lg font-bold text-gray-900">₹{expenditure.totalMonthlyExpenditure}</p>
            </div>
            <div className="bg-white border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Net Surplus</p>
              <p className="text-lg font-bold text-gray-900">₹{net.netSurplus}</p>
            </div>
            <div className="bg-white border-l-4 border-l-indigo-500 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Prop. EMI</p>
              <p className="text-lg font-bold text-gray-900">₹{net.proposedEmi}</p>
            </div>
          </div>

          {/* CUSTOMER PROFILE */}
          <Section title="Customer Information" icon={User}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              <InfoItem label="First Name" value={camData.customer?.first_name} />
              <InfoItem label="Middle Name" value={camData.customer?.middle_name} />
              <InfoItem label="Last Name" value={camData.customer?.last_name} />
              <InfoItem label="Email" value={camData.customer?.email} />
              <InfoItem label="Contact 1" value={camData.customer?.contact_number_1} />
              <InfoItem label="Contact 2" value={camData.customer?.contact_number_2} />
              <InfoItem label="DOB" value={camData.customer?.date_of_birth} />
              <InfoItem label="Aadhaar" value={camData.customer?.adhaar_number} />
              <InfoItem label="Occupation" value={camData.customer?.occupation} />
              <InfoItem label="Religion" value={camData.customer?.religion} />
              <InfoItem label="Caste" value={camData.customer?.caste} />
              <InfoItem label="Residence" value={camData.customer?.residence_type} />
            </div>
            <div className="mt-8 pt-6 border-t border-dashed grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Permanent Address</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">{camData.customer?.permanent_address || "N/A"}</p>
              </div>
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Correspondence Address</span>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">{camData.customer?.correspondence_address || "N/A"}</p>
              </div>
            </div>
          </Section>

          {/* LOAN CAF INFO */}
          <Section title="Loan Application (CAF)" icon={Banknote}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              <InfoItem label="CAF ID" value={camData.loan_application_id} />
              <InfoItem label="Customer ID" value={camData.customer_unique_id} />
              <InfoItem label="Credit Mode" value={camData.loan_application?.credit_mode} />
              <InfoItem label="Applied Amt" value={`₹${camData.loan_application?.credit_applied_for}`} />
              <InfoItem label="Frequency" value={camData.loan_application?.frequency} />
              <InfoItem label="Tenure" value={camData.loan_application?.tenure_option} />
              <InfoItem label="Business Type" value={camData.loan_application?.business_type} />
              <InfoItem label="Business Nature" value={camData.loan_application?.business_nature} />
            </div>
          </Section>

          {/* OBLIGATION DETAILS TABLE */}
          {((camData.pd_information?.obligation_details && camData.pd_information.obligation_details.length > 0) ||
            (camData.loan_application?.obligation_rows && camData.loan_application.obligation_rows.length > 0)) && (
              <Section title="Obligation Details" icon={CreditCard}>
                <div className="space-y-6">
                  {/* PD OBLIGATIONS */}
                  {camData.pd_information?.obligation_details && camData.pd_information.obligation_details.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        Obligations from PD
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs">
                          <thead className="bg-blue-50/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-blue-700 border-b border-blue-100">Company</th>
                              <th className="px-4 py-3 text-left font-semibold text-blue-700 border-b border-blue-100">Type</th>
                              <th className="px-4 py-3 text-right font-semibold text-blue-700 border-b border-blue-100">Amount</th>
                              <th className="px-4 py-3 text-left font-semibold text-blue-700 border-b border-blue-100">Mode</th>
                              <th className="px-4 py-3 text-right font-semibold text-blue-700 border-b border-blue-100">EMI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {camData.pd_information.obligation_details.map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-700">{row.companyName || "-"}</td>
                                <td className="px-4 py-3 text-gray-600 uppercase text-[10px]">{row.creditType || "-"}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">₹{row.creditAmount || "0"}</td>
                                <td className="px-4 py-3 text-gray-600 uppercase text-[10px]">{row.repaymentMode || "-"}</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">₹{row.installmentAmount || "0"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CAF OBLIGATIONS (If different or for comparison) */}
                  {camData.loan_application?.obligation_rows && camData.loan_application.obligation_rows.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-gray-400 border-t border-gray-50 pt-4 uppercase tracking-widest flex items-center gap-2">
                        Initial Obligations (CAF)
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-50 opacity-70">
                        <table className="w-full text-[10px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-500">Company</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-500">Amount</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-500">EMI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {camData.loan_application.obligation_rows.map((row: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-gray-600">{row.companyName || "-"}</td>
                                <td className="px-4 py-2 text-right text-gray-800">₹{row.creditAmount || "0"}</td>
                                <td className="px-4 py-2 text-right text-gray-800">₹{row.installmentAmount || "0"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

          {/* INCOME DETAILS */}
          <Section title="Consolidated Income" icon={TrendingUp}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase mb-2">Primary Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {income.primarySources?.length > 0 ? (
                      income.primarySources.map((s: string) => (
                        <span key={s} className="px-2 py-1 bg-white border border-blue-200 text-blue-800 text-[10px] font-semibold rounded uppercase">
                          {s}
                        </span>
                      ))
                    ) : "-"}
                  </div>
                </div>
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <p className="text-[10px] font-semibold text-purple-600 uppercase mb-2">Secondary Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {income.secondarySources?.length > 0 ? (
                      income.secondarySources.map((s: string) => (
                        <span key={s} className="px-2 py-1 bg-white border border-purple-200 text-purple-800 text-[10px] font-semibold rounded uppercase">
                          {s}
                        </span>
                      ))
                    ) : "-"}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <InfoItem label="Profit Margin" value={`${income.profitMargin}%`} />
                <InfoItem label="Accumulated Profit" value={`₹${income.totalAccumulatedProfit}`} />
                <InfoItem label="Secondary Income" value={`₹${income.secondaryIncomeAmount}`} />
                <InfoItem label="Wages / Salary" value={`₹${income.wagesSalary}`} />
                <InfoItem label="Yearly Sale" value={`₹${income.totalYearlySale}`} />
                <InfoItem label="Staff Count" value={income.numberOfStaff} />
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={12} /> Weekly Sales Analysis
              </h3>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/80">
                    <tr>
                      {Object.keys(income.dailySales).map((day) => (
                        <th key={day} className="px-4 py-3 text-left font-semibold text-gray-500 border-b border-gray-100 uppercase tracking-tight">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-x divide-gray-100">
                    <tr>
                      {Object.values(income.dailySales).map((val: any, i) => (
                        <td key={i} className="px-4 py-4 font-bold text-gray-800 bg-white">
                          ₹{val}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* EXPENDITURE */}
          <Section title="Consolidated Expenditure" icon={TrendingDown}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(expenditure.monthlyRows).map(([key, val]: any) => {
                // Skip if value is an object (prevents "Objects are not valid as React child" error)
                if (typeof val === 'object' && val !== null) return null;

                return (
                  <div key={key} className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 transition-colors hover:bg-gray-50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight mb-1">
                      {key.replace(/([A-Z])/g, " $1")}
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      ₹{val || "0"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-5 bg-gray-900 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-white shadow-xl">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Total Monthly Expenditure</p>
                <p className="text-2xl font-bold text-white">₹{expenditure.totalMonthlyExpenditure}</p>
              </div>
              <div className="hidden md:block w-px h-10 bg-gray-700/50" />
              <div className="text-center md:text-right">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Total Yearly Expenditure</p>
                <p className="text-2xl font-bold text-blue-400">₹{expenditure.totalYearlyExpenditure}</p>
              </div>
            </div>
          </Section>

        </div>

        {/* RIGHT COLUMN - SUMMARY & HISTORY */}
        <div className="space-y-8">

          {/* CREDIT DECISION */}
          <Section title="Credit Decision" icon={ClipboardCheck}>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest",
                  camData.credit_decision === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {camData.credit_decision}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">FOIR</span>
                  <span className="text-lg font-bold text-gray-900">{net.foir}%</span>
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border flex flex-col gap-2",
                net.eligibilityStatus === "Eligible" ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
              )}>
                <div className="flex items-center gap-2">
                  {net.eligibilityStatus === "Eligible" ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-rose-600" />}
                  <span className={cn("text-xs font-semibold uppercase tracking-widest", net.eligibilityStatus === "Eligible" ? "text-emerald-700" : "text-rose-700")}>
                    {net.eligibilityStatus}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium italic">"{camData.remarks || "No remarks provided"}"</p>
              </div>
            </div>
          </Section>

          {camDocument && (
            <Section title="Verification Document" icon={FileText}>
              <div className="space-y-4">

                {/* FILE PREVIEW */}
                <div className="border rounded-xl p-3 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        CAM Document
                      </p>
                      <p className="text-xs text-gray-400">
                        Uploaded Document
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* VIEW */}
                    <a
                      href={`${baseURL}/${camDocument}`}
                      target="_blank"
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      View
                    </a>

                    {/* DOWNLOAD */}
                    {/* <a
                      href={`${baseURL}/${camDocument}`}
                      download
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Download
                    </a> */}
                  </div>
                </div>

                {/* IMAGE PREVIEW (if image) */}
                {camDocument.match(/\.(jpg|jpeg|png)$/i) && (
                  <img
                    src={`${baseURL}/${camDocument}`}
                    alt="CAM Document"
                    className="w-full max-h-[300px] object-contain rounded-lg border"
                  />
                )}
              </div>
            </Section>
          )}

          {/* STATUS HISTORY / TIMELINE */}
          <Card className="shadow-none border-gray-200">
            <CardHeader className="bg-gray-50/80 py-3 px-4 border-b flex flex-row items-center gap-2">
              <History className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm font-semibold text-gray-700">CAM Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:bg-gray-100">

                {(!camData.status_history || camData.status_history.length === 0) && (
                  <div className="relative flex items-start">
                    <div className="absolute left-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 z-10">
                      <Clock size={12} />
                    </div>
                    <div className="ml-8">
                      <h4 className="text-[11px] font-semibold text-gray-900 uppercase tracking-tight">Memorandum Created</h4>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(camData.created_at)}</p>
                    </div>
                  </div>
                )}

                {camData.status_history?.map((history: any, index: number) => {
                  const hMeta = statusMeta[history.status?.toLowerCase()] || statusMeta.default;
                  const HIcon = hMeta.icon;

                  return (
                    <div key={index} className="relative flex items-start">
                      <div className={cn(
                        "absolute left-0 flex h-5 w-5 items-center justify-center rounded-full z-10",
                        hMeta.color.split(" ")[1],
                        hMeta.color.split(" ")[0]
                      )}>
                        <HIcon size={12} />
                      </div>
                      <div className="ml-8">
                        <h4 className="text-[11px] font-semibold text-gray-900 uppercase tracking-tight capitalize">
                          {history.status.replace(/_/g, " ")}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDate(history.timestamp || history.created_at)}
                        </p>
                        {history.reason && (
                          <p className="text-[11px] text-gray-500 mt-2 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed font-medium">
                            "{history.reason}"
                          </p>
                        )}
                        {history.performed_by && (
                          <p className="text-[9px] text-gray-400 mt-1.5 font-semibold uppercase tracking-widest flex items-center gap-1">
                            <User size={10} /> By: {history.performed_by}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* PD INFORMATION PREVIEW */}
          {camData.pd_information && (
            <Section title="PD Verification" icon={ShieldCheck}>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Verification Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full uppercase">
                    {camData.pd_information.verification_status}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Notes</p>
                  <p className="text-xs text-gray-700 font-medium">{camData.pd_information.verification_notes}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {Object.entries(camData.pd_information.pd_information || {}).map(([key, val]: any) => {
                    // Skip if value is an object (prevents "Objects are not valid as React child" error)
                    if (typeof val === 'object' && val !== null) return null;

                    return (
                      <div key={key} className="flex justify-between items-center p-2 border-b border-gray-50">
                        <span className="text-[10px] text-gray-500 capitalize">{key.replace(/_/g, " ")}</span>
                        <span className={cn("text-[10px] font-semibold uppercase", val === "yes" ? "text-emerald-600" : "text-gray-400")}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

        </div>
      </div>

      {/* VERIFY CONFIRM MODAL - commented out
      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Verification"
        message="Are you sure you want to verify and approve this CAM? This will advance the application status."
        confirmText={verifying ? "Processing..." : "Verify & Approve"}
        onConfirm={handleVerify}
        onCancel={() => setShowConfirm(false)}
      />
      */}

    </div>
  );
}