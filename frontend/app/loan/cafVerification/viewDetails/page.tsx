"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList"; import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  User,
  Building2,
  Banknote,
  Briefcase,
  History,
  TrendingDown,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  CreditCard,
  Layers,
  Info,
  ShieldCheck,
  ClipboardCheck,
  Package,
  Boxes,
  Tag
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ================= HELPERS ================= */

const statusMeta: any = {
  applied: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Clock, label: "Applied" },
  field_executive: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: User, label: "Field Executive" },
  branch_manager: { color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Building2, label: "Branch Manager" },
  pending: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock, label: "Pending" },
  approved: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Rejected" },
  disbursed: { color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "Disbursed" },
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
    : "N/A";

const formatCurrency = (amount: any) => {
  const value = parseFloat(amount || "0");
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value);
};

const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "") || "http://localhost:8000";
  return `${baseUrl}/${path}`;
};

const parseProductAttributes = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
};

/* ================= UI COMPONENTS ================= */

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">
      {value !== undefined && value !== null && value !== "" ? value : "N/A"}
    </p>
  </div>
);

const Section = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="bg-gray-50 py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-sm font-bold text-gray-800">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
};

const DocumentLink = ({
  label,
  fileName,
}: {
  label: string;
  fileName?: string | null;
}) => {
  if (!fileName) return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
        <p className="text-sm text-gray-400 italic mt-1">Not uploaded</p>
      </div>
    </div>
  );

  const url = getImageUrl(fileName);

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between group">
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
        <p className="text-sm text-gray-700 mt-1 truncate" title={fileName}>{fileName.split('/').pop()}</p>
      </div>

      <a
        href={url!}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-600 hover:text-white transition-colors"
      >
        View File
      </a>
    </div>
  );
};

/* ================= PAGE CONTENT ================= */

function CAFDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [cafData, setCafData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchCAFDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      // API call to fetch CAF details by ID
      const res = await axiosInstance.get(`${ProjectApiList.api_getCAFById}/${id}`);

      if (res.data.success) {
        setCafData(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to fetch CAF details");
      }
    } catch (error) {
      console.error("Fetch CAF details failed", error);
      toast.error("An error occurred while fetching details");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setStatusUpdating(true);
      const res = await axiosInstance.post(`${ProjectApiList.api_updateCAFStatus}/${id}`, {
        status: newStatus,
        reason: `Status manually updated to ${newStatus.replace("_", " ")}`
      });

      if (res.data.success) {
        toast.success(`CAF status updated to ${newStatus}`);
        fetchCAFDetails(); // Refresh data
      } else {
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (error: any) {
      console.error("Update status failed", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setStatusUpdating(false);
    }
  };

  const verifyCAF = async (reason?: string) => {
    try {
      setStatusUpdating(true);
      const res = await axiosInstance.post(`${ProjectApiList.api_verifyCAF}/${cafData.id}`, {
        reason: reason || "CAF verified"
      });

      if (res.data.success) {
        toast.success("CAF verified successfully");
        router.push(`/loan/cafVerification/`); // Redirect to details page
        fetchCAFDetails(); // Refresh data
      } else {
        toast.error(res.data.message || "Failed to verify CAF");
      }
    } catch (error: any) {
      console.error("Verify CAF failed", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setStatusUpdating(false);
    }
  };

  const revertToFieldExecutive = async (reason: string) => {
    try {
      setStatusUpdating(true);
      const res = await axiosInstance.post(`${ProjectApiList.api_revertCAF}/${cafData.id}`, {
        reason: reason
      });

      if (res.data.success) {
        toast.success("CAF reverted to Field Executive");
        router.push(`/loan/cafVerification/`);
        fetchCAFDetails(); // Refresh data
      } else {
        toast.error(res.data.message || "Failed to revert CAF");
      }
    } catch (error: any) {
      console.error("Revert CAF failed", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setStatusUpdating(false);
    }
  };

  useEffect(() => {
    fetchCAFDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading CAF details...</p>
      </div>
    );
  }

  if (!cafData) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="text-gray-400 flex justify-center"><AlertCircle size={48} /></div>
        <p className="text-gray-500 font-semibold text-lg">CAF application not found</p>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const meta = statusMeta[cafData.status?.toLowerCase()] || statusMeta.default;
  const StatusIcon = meta.icon;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* HEADER ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft size={18} />
          <span className="font-bold text-sm">Back to Applications</span>
        </button>

        <div className="flex items-center gap-3">
          {cafData.is_verified && (
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-black uppercase flex items-center gap-1">
              <ShieldCheck size={10} /> Verified
            </span>
          )}
          <span className={cn(
            "px-3 py-1.5 rounded text-xs font-bold border flex items-center gap-2 uppercase tracking-wide",
            meta.color
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN - Summary & Basic Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* APPLICANT CARD */}
          <Card className="shadow-none border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 uppercase font-black text-xl">
                  {cafData.customer_name?.charAt(0) || cafData.customer?.first_name?.charAt(0) || <User size={32} />}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-xl font-bold text-gray-900">
                    {cafData.customer_name || `${cafData.customer?.first_name || ""} ${cafData.customer?.last_name || ""}` || "Unknown Applicant"}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-500 text-xs mt-1">
                    <span className="flex items-center gap-1"><Building2 size={14} /> {cafData.branch?.name || cafData.branch_id || "No Branch"}</span>
                    <span>ID: {cafData.loan_application_id}</span>
                    <span>Applied: {formatDate(cafData.created_at)}</span>
                  </div>
                  {cafData.credit_applied_for && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <Banknote size={14} className="text-blue-600" />
                      <span className="text-xs text-gray-500 font-medium">Applied Amount:</span>
                      <span className="text-sm font-black text-blue-700 font-mono">{formatCurrency(cafData.credit_applied_for)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LOAN INFO */}
          <Section title="Credit Application Info" icon={Banknote}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Credit Mode</p>
                <p className="text-sm font-bold text-gray-800 uppercase">{cafData.credit_mode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Applied Amount</p>
                <p className="text-2xl font-bold text-blue-600 font-mono">{formatCurrency(cafData.credit_applied_for)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Frequency</p>
                <p className="text-sm font-bold text-gray-800">{cafData.frequency}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Tenure</p>
                <p className="text-sm font-bold text-gray-800">{cafData.tenure_option}</p>
              </div>
              {cafData.repayment_day &&
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Repayment Day</p>
                  <p className="text-sm font-bold text-gray-800">{cafData.repayment_day || `n/a`}</p>
                </div>
              }
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6">
              <InfoItem label="Applicant Type" value={cafData.applicant_type} />
              <InfoItem label="Monthly Surplus" value={cafData.net_surplus ? formatCurrency(cafData.net_surplus) : null} />
              <InfoItem
                label="Down Payment"
                value={cafData.down_payment !== undefined && cafData.down_payment !== null ? formatCurrency(cafData.down_payment) : null}
              />
              <InfoItem
                label="Discount"
                value={cafData.discount !== undefined && cafData.discount !== null ? formatCurrency(cafData.discount) : null}
              />
            </div>
          </Section>

          {/* PRODUCTS */}
          {(cafData.products?.length > 0 || cafData.product_details) && (
            <Section title="Products" icon={Package}>
              <div className="space-y-4">
                {(cafData.products?.length > 0 ? cafData.products : [{
                  product_name: cafData.product_name,
                  product_code: cafData.product_code,
                  product_quantity: cafData.product_quantity,
                  credit_applied_for: cafData.credit_applied_for,
                  product_attributes: cafData.product_attributes,
                  product_details: cafData.product_details,
                }]).map((p: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase">Product #{idx + 1}</span>
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(p.credit_applied_for)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <InfoItem label="Product Name" value={p.product_name || p.product_details?.product_name} />
                      <InfoItem label="SKU / Code" value={p.product_code || p.product_details?.product_sku_code} />
                      <InfoItem label="Quantity" value={p.product_quantity ? `${p.product_quantity} ${p.product_details?.unit || ""}` : null} />
                      <InfoItem label="Unit Price" value={p.product_details?.selling_price ? formatCurrency(p.product_details.selling_price) : null} />
                      <InfoItem label="Category" value={p.product_details?.category?.name || p.product_details?.category} />
                      <InfoItem label="Brand" value={p.product_details?.brand?.name || p.product_details?.brand} />
                      <InfoItem label="GST" value={p.product_details?.gst_percent != null ? `${p.product_details.gst_percent}%` : null} />
                      <InfoItem label="Credit Amount" value={p.credit_applied_for ? formatCurrency(p.credit_applied_for) : null} />
                    </div>
                    {Object.keys(parseProductAttributes(p.product_attributes)).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                        {Object.entries(parseProductAttributes(p.product_attributes)).map(([key, val]: [string, any]) => (
                          <span key={key} className="px-2 py-1 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 font-medium">
                            {key}: {String(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-sm font-bold text-gray-700">Total Credit Applied</span>
                  <span className="text-base font-black text-blue-700">{formatCurrency(cafData.credit_applied_for)}</span>
                </div>
              </div>
            </Section>
          )}

          {/* CUSTOMER PROFILE */}
          <Section title="Customer Profile" icon={User} defaultOpen={false}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
              <InfoItem label="Unique ID" value={cafData.customer?.customer_unique_id} />
              <InfoItem
                label="Enrollment Number"
                value={cafData.enrollment_number}
              />
              <InfoItem label="First Name" value={cafData.customer?.first_name} />
              <InfoItem label="Middle Name" value={cafData.customer?.middle_name} />
              <InfoItem label="Last Name" value={cafData.customer?.last_name} />

              <InfoItem label="Gender" value={cafData.customer?.gender} />
              <InfoItem label="DOB" value={cafData.customer?.date_of_birth} />
              <InfoItem label="Aadhaar" value={cafData.customer?.adhaar_number} />
              <InfoItem label="PAN" value={cafData.customer?.pan_number} />

              <InfoItem label="Religion" value={cafData.customer?.religion} />
              <InfoItem label="Caste" value={cafData.customer?.caste} />
              <InfoItem label="Occupation" value={cafData.customer?.occupation} />
              <InfoItem label="Email" value={cafData.customer?.email} />
            </div>

            <div className="mt-8 pt-6 border-t border-dashed">
              <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-sm">
                <MapPin size={16} /> Address Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Permanent Address</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{cafData.customer?.permanent_address || "N/A"}</p>
                </div>
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 flex flex-col gap-1 shadow-sm">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Correspondence Address</span>
                  <p className="text-xs text-gray-700 leading-relaxed">{cafData.customer?.correspondence_address || "N/A"}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* BUSINESS DETAILS */}
          {(cafData.business_type || cafData.business_nature || cafData.business_ownership || cafData.business_vintage || cafData.business_address) && (
            <Section title="Business Details" icon={Briefcase}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <InfoItem label="Type" value={cafData.business_type} />
                <InfoItem label="Nature" value={cafData.business_nature} />
                <InfoItem label="Ownership" value={cafData.business_ownership} />
                <InfoItem label="Vintage" value={cafData.business_vintage ? `${cafData.business_vintage} years` : null} />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Business Address</p>
                <p className="text-sm text-gray-700 leading-relaxed">{cafData.business_address || "N/A"}</p>
              </div>
            </Section>
          )}

          {/* BANK ACCOUNT */}
          {(cafData.bank_name || cafData.account_number || cafData.ifsc_code || cafData.bank_first_name) && (
            <Section title="Bank Details" icon={Building2}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InfoItem label="A/C Holder" value={`${cafData.bank_first_name || ""} ${cafData.bank_middle_name || ""} ${cafData.bank_last_name || ""}`.trim() || null} />
                <InfoItem label="Institution" value={cafData.bank_name} />
                <InfoItem label="A/C Number" value={cafData.account_number} />
                <InfoItem label="IFSC Code" value={cafData.ifsc_code} />
              </div>
            </Section>
          )}

          {/* DOCUMENTS */}
          <Section title="Documents" icon={FileText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(cafData.income_proof_url || cafData.income_proof_name || cafData.income_proof) && (
                <DocumentLink label="Income Proof" fileName={cafData.income_proof_url || cafData.income_proof_name || cafData.income_proof} />
              )}
              {(cafData.business_photo_url || cafData.business_photo_name || cafData.business_photo) && (
                <DocumentLink label="Business Photo" fileName={cafData.business_photo_url || cafData.business_photo_name || cafData.business_photo} />
              )}
              {(cafData.business_proof_url || cafData.business_proof_name || cafData.business_proof) && (
                <DocumentLink label="Business Proof" fileName={cafData.business_proof_url || cafData.business_proof_name || cafData.business_proof} />
              )}
              {(cafData.passbook_image_url || cafData.passbook_image || cafData.cheque_photo) && (
                <DocumentLink label="Passbook/Cheque" fileName={cafData.passbook_image_url || cafData.passbook_image || cafData.cheque_photo} />
              )}
            </div>
            {!cafData.income_proof_url && !cafData.income_proof_name && !cafData.income_proof &&
              !cafData.business_photo_url && !cafData.business_photo_name &&
              !cafData.business_proof_url && !cafData.business_proof_name &&
              !cafData.passbook_image_url && !cafData.passbook_image && (
                <p className="text-sm text-gray-400 italic">No documents uploaded</p>
              )}
          </Section>

          {/* FINANCIAL ARRAYS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Income Sources" icon={TrendingUp}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(cafData.income_sources || {}).map(([key, value]) => (
                    value === true && (
                      <div key={key} className="p-2.5 bg-gray-50 rounded border border-gray-100 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <p className="text-xs font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      </div>
                    )
                  ))}
                </div>
                {cafData.other_sources_income && (
                  <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Other Income</p>
                    <span className="text-sm font-bold text-white font-mono">{formatCurrency(cafData.other_sources_income)}</span>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Expense Details" icon={TrendingDown}>
              <div className="space-y-2">
                {Object.entries(cafData.expense_details || {}).map(([key, details]: [string, any]) => (
                  (details.monthly > 0) && (
                    <div key={key} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <div>
                        <p className="text-xs font-bold text-gray-800 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-[10px] text-gray-400">Yearly: {formatCurrency(details.yearly)}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600 font-mono">{formatCurrency(details.monthly)}/mo</span>
                    </div>
                  )
                ))}
              </div>
            </Section>
            <Section title="Liabilities (Obligation Details)" icon={Banknote}>
              <div className="space-y-4">
                {cafData.obligation_rows?.length > 0 ? (
                  cafData.obligation_rows.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                    >
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Company Name
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                            {item.companyName || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Credit Type
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                            {item.creditType || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Credit Amount
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(item.creditAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            EMI Amount
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(item.installmentAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Mode Of Payment
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                            {item.repaymentMode || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            EMI / EWI / EFI
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(
                              item.emiAmount ||
                              item.ewiAmount ||
                              item.efiAmount ||
                              item.installmentAmount
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Banknote className="h-8 w-8 mb-2" />
                    <p className="text-sm font-semibold">No Liabilities Found</p>
                  </div>
                )}
              </div>
            </Section>

            {(cafData.reference1_name || cafData.reference1_contact || cafData.reference1_address ||
              cafData.reference2_name || cafData.reference2_contact || cafData.reference2_address) && (
                <Section title="References" icon={User}>
                  <div className="grid grid-cols-1 gap-4">
                    {(cafData.reference1_name || cafData.reference1_contact || cafData.reference1_address) && (
                      <div className="p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Reference 1</span>
                            <p className="text-sm font-bold text-gray-800">{cafData.reference1_name || "—"}</p>
                          </div>
                          <p className="text-xs font-bold text-blue-600">{cafData.reference1_contact || "—"}</p>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{cafData.reference1_address || "—"}</p>
                      </div>
                    )}
                    {(cafData.reference2_name || cafData.reference2_contact || cafData.reference2_address) && (
                      <div className="p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Reference 2</span>
                            <p className="text-sm font-bold text-gray-800">{cafData.reference2_name || "—"}</p>
                          </div>
                          <p className="text-xs font-bold text-blue-600">{cafData.reference2_contact || "—"}</p>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{cafData.reference2_address || "—"}</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}
          </div>
        </div>

        {/* RIGHT COLUMN - Stats & Timeline */}
        <div className="space-y-6">

          {/* QUICK FINANCIALS */}
          <Section title="Financial Summary" icon={TrendingUp}>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Gross Monthly</span>
                <span className="font-bold font-mono text-gray-800">{formatCurrency(cafData.applicant_income)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Gross Yearly</span>
                <span className="font-bold font-mono text-gray-800">{formatCurrency(cafData.total_income_yearly)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b pb-3 border-gray-100">
                <span className="text-gray-500">Monthly Expenses</span>
                <span className="font-bold text-red-600 font-mono">{formatCurrency(cafData.total_monthly_expenses)}</span>
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Net Monthly Surplus</p>
                <div className="text-sm font-black text-gray-900 font-mono tracking-tight">{formatCurrency(cafData.net_surplus)}</div>
              </div>
            </div>
          </Section>

          {/* STATUS HISTORY / TIMELINE */}
          <Card className="shadow-none border-gray-200">
            <CardHeader className="bg-gray-50 py-3 px-4 border-b flex flex-row items-center gap-2">
              <History className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-sm font-bold text-gray-800">Application Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:bg-gray-100">

                {(!cafData.status_history || cafData.status_history.length === 0) && (
                  <div className="relative flex items-start">
                    <div className="absolute left-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 z-10">
                      <Clock size={12} />
                    </div>
                    <div className="ml-8">
                      <h4 className="text-xs font-bold text-gray-900 border-b border-gray-50 w-fit pb-0.5">Application Submitted</h4>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(cafData.created_at)}</p>
                    </div>
                  </div>
                )}

                {cafData.status_history?.map((history: any, index: number) => {
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
                        <h4 className="text-xs font-bold text-gray-900 border-b border-gray-50 w-fit pb-0.5 capitalize">{history.status.replace(/_/g, " ")}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(history.timestamp || history.created_at)}</p>
                        {history.reason && (
                          <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 p-2 rounded border border-gray-100">"{history.reason}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {cafData.status === "branch_manager" && !cafData.is_verified && (
            <div className="flex flex-col gap-4">

              {/* REVERT ACTION */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={statusUpdating}
                    className="w-full px-6 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-lg flex items-center justify-center gap-3 border border-amber-200 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft size={18} />
                    Back to Field Executive
                  </button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Back to Field Executive?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Specify a reason why this application is being sent back for corrections.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="py-2">
                    <textarea
                      id="revertReason"
                      className="w-full p-3 border rounded-md text-sm min-h-[100px] focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="Enter reason for reverting..."
                    />
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>

                    <AlertDialogAction
                      onClick={() => {
                        const reason = (document.getElementById(
                          "revertReason"
                        ) as HTMLTextAreaElement).value;

                        if (!reason) {
                          toast.error("Please provide a reason");
                          return;
                        }

                        revertToFieldExecutive(reason);
                      }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Confirm Revert
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* VERIFY ACTION */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={statusUpdating}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-3 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {statusUpdating ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}

                    Verify Application
                  </button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verify Application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to mark this application (
                      {cafData.loan_application_id}) as verified? This action is permanent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>

                    <AlertDialogAction
                      onClick={() => verifyCAF()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirm Verification
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViewCAFDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Initializing...</p>
      </div>
    }>
      <CAFDetailsContent />
    </Suspense>
  );
}
