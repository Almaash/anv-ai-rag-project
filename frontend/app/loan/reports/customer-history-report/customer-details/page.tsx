"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  FileImage,
  FileSearch,
  FileText,
  HandCoins,
  Download,
  Landmark,
  Layers3,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";

function CollapsibleSection({ title, subtitle, badge, defaultOpen = false, children }: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{title}</p>
            {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
}

type TabKey = "overview" | "enrollments" | "cafs" | "disbursements";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "enrollments", label: "Enrollments" },
  { key: "cafs", label: "CAF / PD / CAM" },
  { key: "disbursements", label: "Disbursement / Loans" },
];

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status?: string | null) => {
  const statusLower = status?.toLowerCase() || "";
  if (statusLower.includes("verified") || statusLower.includes("approved") || statusLower.includes("disbursed")) {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (statusLower.includes("pending") || statusLower.includes("created")) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
  if (statusLower.includes("rejected") || statusLower.includes("reverted")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
};

const resolveDocumentUrl = (path?: string | null) => {
  if (!path) return null;
  const normalized = path.replace(/^\/+/, "");
  return `${ProjectApiList.api_imageBaseUrl}/${normalized}`;
};

const isImagePath = (path?: string | null) => {
  if (!path) return false;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
};

const parseAssets = (assetsString?: string | null) => {
  if (!assetsString) return "-";
  try {
    const parsed = JSON.parse(assetsString);
    const availableAssets = Object.entries(parsed)
      .filter(([_, isAvailable]) => isAvailable)
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()));
    return availableAssets.length > 0 ? availableAssets.join(", ") : "None";
  } catch (error) {
    return "-";
  }
};

export default function CustomerHistoryReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    const fetchCustomerHistory = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`${ProjectApiList.GET_REPORT_HISTORY_CUSTOMER}/${customerId}`);
        if (res.data.success) {
          setData(res.data.data);
        } else {
          toast.error(res.data.message || "Failed to fetch customer history");
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to fetch customer history");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerHistory();
    }
  }, [customerId]);


  const handleExportCustomerHistory = async () => {
    if (!customerId) {
      toast.error("Customer ID not found");
      return;
    }

    try {
      setExportLoading(true);

      const response = await axiosInstance.get(
        `${ProjectApiList.EXPORT_REPORT_HISTORY_CUSTOMER}/${customerId}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `customer-history-${customerId}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Customer history exported successfully");
    } catch (error: any) {
      console.error("Export customer history error:", error);

      // Blob responses need to be converted back to JSON
      // when the backend returns an error.
      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);

          toast.error(
            errorData?.message || "Failed to export customer history"
          );
        } catch {
          toast.error("Failed to export customer history");
        }
      } else {
        toast.error(
          error.response?.data?.message ||
          "Failed to export customer history"
        );
      }
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading customer history...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-blue-600 transition hover:bg-blue-50">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="py-12 text-center text-gray-500">No customer data found</div>
      </div>
    );
  }

  const customer = data.customer || {};
  const enrollments = data.enrollments || [];
  const verificationHistory = data.verification_history || [];
  const cafs = data.cafs || [];
  const summary = data.summary || {};

  const renderDocumentBlock = (title: string, documents: Array<{ label: string; path?: string | null; description?: string }>) => {
    const hasDocs = documents.some((item) => item.path);

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileImage size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {!hasDocs ? (
          <p className="text-sm text-gray-500">No documents available.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map((item, index) => {
              if (!item.path) return null;
              const url = resolveDocumentUrl(item.path);
              return (
                <div key={`${title}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                  </div>
                  {isImagePath(item.path) ? (
                    <a href={url!} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                      <img src={url!} alt={item.label} className="h-32 w-full rounded object-cover" />
                    </a>
                  ) : (
                    <a href={url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                      <FileSearch size={14} /> Open document
                    </a>
                  )}
                  {item.description ? <p className="mt-2 text-xs text-gray-500">{item.description}</p> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Customer History Report
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Customer ID:{" "}
              <span className="font-mono font-semibold text-slate-700">
                {customerId}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCustomerHistory}
          disabled={exportLoading || !customerId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={18} />
              Export CSV
            </>
          )}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Enrollments</p>
              <p className="text-xl font-semibold text-slate-900">{summary.total_enrollments || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <BadgeCheck size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">CAFs</p>
              <p className="text-xl font-semibold text-slate-900">{summary.total_cafs || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
              <CircleDollarSign size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Loans</p>
              <p className="text-xl font-semibold text-slate-900">{summary.total_loans || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">EMI Schedules</p>
              <p className="text-xl font-semibold text-slate-900">{summary.total_emi_schedules || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeTab === tab.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <User size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Customer Profile</h2>
            </div>

            {/* Basic Information */}
            <h3 className="mb-3 mt-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Basic Information</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Customer ID</p>
                <p className="font-mono font-semibold text-blue-600">{customer.customer_unique_id || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Full Name</p>
                <p className="font-semibold text-gray-800">
                  {`${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`.trim() || "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Status</p>
                <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(customer.status)}`}>
                  {customer.status ? customer.status.replace(/_/g, " ") : "-"}
                </span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Gender</p>
                <p className="font-semibold capitalize text-gray-800">{customer.gender || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">DOB</p>
                <p className="font-semibold text-gray-800">{formatDate(customer.date_of_birth)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Father's Name</p>
                <p className="font-semibold text-gray-800">{customer.father_name || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Religion / Caste</p>
                <p className="font-semibold text-gray-800">
                  {customer.religion || "-"} {customer.caste ? `/ ${customer.caste}` : ""}
                </p>
              </div>
            </div>

            {/* Contact & Address */}
            <h3 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Contact & Address</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Primary Contact</p>
                <p className="font-semibold text-gray-800">{customer.contact_number_1 || customer.phone_no || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Secondary Contact</p>
                <p className="font-semibold text-gray-800">{customer.contact_number_2 || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Email</p>
                <p className="font-semibold text-gray-800">{customer.email || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Service Area Pin</p>
                <p className="font-semibold text-gray-800">{customer.service_area_pin || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Permanent Address</p>
                <p className="font-semibold text-gray-800">{customer.permanent_address || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Correspondence Address</p>
                <p className="font-semibold text-gray-800">{customer.correspondence_address || "-"}</p>
              </div>
            </div>

            {/* Occupation & Housing */}
            <h3 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Occupation, Housing & Assets</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Occupation</p>
                <p className="font-semibold text-gray-800">{customer.occupation || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Spouse Occupation</p>
                <p className="font-semibold text-gray-800">{customer.spouse_occupation || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Residence Type</p>
                <p className="font-semibold text-gray-800">{customer.residence_type || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">House Type / Rooms</p>
                <p className="font-semibold text-gray-800">
                  {customer.house_type || "-"} {customer.number_of_rooms ? `(${customer.number_of_rooms} rooms)` : ""}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Years Staying</p>
                <p className="font-semibold text-gray-800">{customer.years_of_staying || "-"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Declared Assets</p>
                <p className="font-semibold text-gray-800">{parseAssets(customer.assets)}</p>
              </div>
            </div>

            {/* Nominee Details */}
            <h3 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Nominee Details</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Nominee Name</p>
                <p className="font-semibold text-gray-800">{customer.nominee_name || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Relationship</p>
                <p className="font-semibold text-gray-800">
                  {customer.nominee_relationship === "Other" && customer.nominee_relationship_other
                    ? customer.nominee_relationship_other
                    : customer.nominee_relationship || "-"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Nominee Address</p>
                <p className="font-semibold text-gray-800">{customer.nominee_address || "-"}</p>
              </div>
            </div>

            {/* Identifications & System Info */}
            <h3 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Identifications & System Info</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Aadhaar</p>
                <p className="font-semibold text-gray-800">{customer.adhaar_number || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">PAN</p>
                <p className="font-semibold text-gray-800">{customer.pan_number || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Voter ID</p>
                <p className="font-semibold text-gray-800">{customer.voter_id_number || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Role</p>
                <p className="font-semibold capitalize text-gray-800">{customer.role || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Agent ID</p>
                <p className="font-mono font-semibold text-gray-800">{customer.agent_unique_id || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Branch ID</p>
                <p className="font-mono font-semibold text-gray-800">{customer.branch_id || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Sourcing / Referral</p>
                <p className="font-semibold text-gray-800">
                  {customer.sourcing_type ? customer.sourcing_type : "-"}
                  {customer.referral_id ? ` (${customer.referral_id})` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <FileImage size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Customer Documents</h2>
            </div>
            {renderDocumentBlock("Customer Documents", [
              { label: "Customer Photo", path: customer.customer_photo },
              { label: "Aadhaar Front", path: customer.aadhaar_image },
              { label: "Aadhaar Back", path: customer.aadhaar_image_back },
              { label: "PAN Card", path: customer.pan_image },
              { label: "Voter ID Front", path: customer.voter_id_image },
              { label: "Voter ID Back", path: customer.voter_id_image_back },
              { label: "Passbook", path: customer.passbook_image },
            ])}
          </div>
        </div>
      )}

      {activeTab === "enrollments" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <BookOpen size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Enrollments ({enrollments.length})</h2>
            </div>
            <div className="space-y-3">
              {enrollments.map((enrollment: any, idx: number) => (
                <CollapsibleSection
                  key={enrollment.id}
                  title={enrollment.enrollment_number || "-"}
                  subtitle={`Created: ${formatDate(enrollment.created_at)}`}
                  badge={<span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(enrollment.status)}`}>{enrollment.status || "-"}</span>}
                  defaultOpen={idx === 0}
                >
                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Verification Status</p>
                      <p className="font-semibold text-gray-800">{enrollment.verification_status || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Verified By</p>
                      <p className="font-semibold text-gray-800">{enrollment.verified_by || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Verified At</p>
                      <p className="font-semibold text-gray-800">{formatDate(enrollment.verified_at)}</p>
                    </div>
                  </div>
                  {enrollment.status_history?.length ? (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-gray-700">Status History</p>
                      <div className="space-y-2">
                        {enrollment.status_history.map((item: any, index: number) => (
                          <div key={`${item.status}-${index}`} className="text-sm text-gray-600">
                            <span className="font-semibold">{item.timestamp}</span> - {item.status} {item.reason ? `: ${item.reason}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CollapsibleSection>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <ReceiptText size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Verification History ({verificationHistory.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Enrollment</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Verified By</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {verificationHistory.map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-600">{record.enrollment_number || "-"}</td>
                      <td className="px-4 py-3">{record.action || "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(record.status)}`}>{record.status || "-"}</span></td>
                      <td className="px-4 py-3 text-gray-600">{record.reason || "-"}</td>
                      <td className="px-4 py-3">{record.admin_name || record.admin_id || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(record.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cafs" && (
        <div className="space-y-6">
          {cafs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No CAF records found for this customer.</div>
          ) : (
            cafs.map((caf: any, idx: number) => {
              const pd = caf.pd?.[0] || null;
              const cam = caf.cam?.[0] || null;
              return (
                <CollapsibleSection
                  key={caf.id}
                  title={caf.loan_application_id || "-"}
                  subtitle={`Enrollment: ${caf.enrollment_number || "-"}`}
                  badge={
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(caf.status)}`}>{caf.status || "-"}</span>
                      {caf.is_verified ? <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Verified</span> : null}
                    </div>
                  }
                  defaultOpen={idx === 0}
                >
                  <div className="mt-3 grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Credit Applied</p>
                      <p className="font-semibold text-gray-800">Rs. {caf.credit_applied_for || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Frequency</p>
                      <p className="font-semibold text-gray-800">{caf.frequency || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Tenure</p>
                      <p className="font-semibold text-gray-800">{caf.tenure_option || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Credit Mode</p>
                      <p className="font-semibold text-gray-800">{caf.credit_mode || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Net Surplus</p>
                      <p className="font-semibold text-gray-800">Rs. {caf.net_surplus || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Income</p>
                      <p className="font-semibold text-gray-800">Rs. {caf.total_income_yearly || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Expenses</p>
                      <p className="font-semibold text-gray-800">Rs. {caf.total_yearly_expenses || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Created</p>
                      <p className="font-semibold text-gray-800">{formatDate(caf.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Layers3 size={16} className="text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">CAF Verification Details</h3>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Applicant Type:</span> {caf.applicant_type || "-"}</p>
                        <p><span className="font-semibold">Applicant Income:</span> Rs. {caf.applicant_income || "-"}</p>
                        <p><span className="font-semibold">Business Type:</span> {caf.business_type || "-"}</p>
                        <p><span className="font-semibold">Business Nature:</span> {caf.business_nature || "-"}</p>
                        <p><span className="font-semibold">Reference 1:</span> {caf.reference1_name || "-"} / {caf.reference1_contact || "-"}</p>
                        <p><span className="font-semibold">Reference 2:</span> {caf.reference2_name || "-"} / {caf.reference2_contact || "-"}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Landmark size={16} className="text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-800">CAF Status History</h3>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        {caf.status_history?.length ? caf.status_history.map((item: any, index: number) => (
                          <div key={`${item.status}-${index}`}>
                            <span className="font-semibold">{item.timestamp}</span> - {item.status}{item.reason ? `: ${item.reason}` : ""}
                          </div>
                        )) : <p>No status history found</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">PD Details</h3>
                      </div>
                      {pd ? (
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-semibold">PD ID:</span> {pd.pd_application_id || "-"}</p>
                          <p><span className="font-semibold">Status:</span> {pd.status || "-"}</p>
                          <p><span className="font-semibold">Verification Status:</span> {pd.verification_status || "-"}</p>
                          <p><span className="font-semibold">Verification Notes:</span> {pd.verification_notes || "-"}</p>
                          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">PD Information</p>
                            {pd.pd_information ? Object.entries(pd.pd_information).filter(([key]) => key !== "obligation_rows").map(([key, value]) => (
                              <p key={key} className="text-sm text-gray-700"><span className="font-semibold capitalize">{key.replace(/_/g, " ")}:</span> {String(value)}</p>
                            )) : <p>-</p>}
                          </div>
                        </div>
                      ) : <p className="text-sm text-gray-500">No PD record available.</p>}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Banknote size={16} className="text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-800">CAM Details</h3>
                      </div>
                      {cam ? (
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-semibold">CAM ID:</span> {cam.cam_unique_id || "-"}</p>
                          <p><span className="font-semibold">Status:</span> {cam.status || "-"}</p>
                          <p><span className="font-semibold">Credit Decision:</span> {cam.credit_decision || "-"}</p>
                          <p><span className="font-semibold">Credit Sanction Status:</span> {cam.credit_sanction_status || "-"}</p>
                          <p><span className="font-semibold">Net Surplus:</span> Rs. {cam.net_surplus?.netSurplus || "-"}</p>
                          <p><span className="font-semibold">Proposed EMI:</span> Rs. {cam.net_surplus?.proposedEmi || "-"}</p>
                          <p><span className="font-semibold">Remarks:</span> {cam.remarks || "-"}</p>
                        </div>
                      ) : <p className="text-sm text-gray-500">No CAM record available.</p>}
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {renderDocumentBlock(`${caf.loan_application_id || "CAF"} Documents`, [
                      { label: "Income Proof", path: caf.income_proof_name },
                      { label: "Business Photo", path: caf.business_photo_name },
                      { label: "Business Proof", path: caf.business_proof_name },
                      { label: "Passbook", path: caf.passbook_image },
                    ])}
                    {renderDocumentBlock(`${caf.loan_application_id || "CAF"} PD Documents`, [
                      { label: "House Verification Photo", path: pd?.house_verification_photo },
                      { label: "Business Verification Photo", path: pd?.business_verification_photo },
                    ])}
                    {renderDocumentBlock(`${caf.loan_application_id || "CAF"} CAM Documents`, [
                      { label: "CAM Verification Document", path: cam?.verification_documents?.cam_document },
                    ])}
                  </div>
                </CollapsibleSection>
              );
            })
          )}
        </div>
      )}

      {activeTab === "disbursements" && (
        <div className="space-y-6">
          {cafs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No disbursement or loan records found.</div>
          ) : (
            cafs.map((caf: any, idx: number) => (
              <CollapsibleSection
                key={caf.id}
                title={caf.loan_application_id || "-"}
                subtitle={`Enrollment: ${caf.enrollment_number || "-"}`}
                badge={
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(caf.status)}`}>{caf.status || "-"}</span>
                }
                defaultOpen={idx === 0}
              >
                <div className="mt-3 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                        <Landmark size={15} />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">Disbursement Details</h3>
                    </div>
                    {caf.disbursements?.length ? caf.disbursements.map((disbursement: any) => (
                      <div key={disbursement.id} className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Disbursement ID:</span> {disbursement.disbursement_id || "-"}</p>
                        <p><span className="font-semibold">Status:</span> {disbursement.disbursement_status || "-"}</p>
                        <p><span className="font-semibold">Payment Status:</span> {disbursement.payment_status || "-"}</p>
                        <p><span className="font-semibold">Payment Method:</span> {disbursement.payment_method || "-"}</p>
                        <p><span className="font-semibold">Date:</span> {formatDate(disbursement.date_of_disbursement)}</p>
                        <p><span className="font-semibold">Booking Date:</span> {formatDate(disbursement.booking_date)}</p>
                      </div>
                    )) : <p className="text-sm text-gray-500">No disbursement record available.</p>}
                    {renderDocumentBlock("Disbursement Documents", [
                      { label: "DFA Document", path: caf.disbursements?.[0]?.dfa_document },
                      { label: "CFA Document", path: caf.disbursements?.[0]?.cfa_document },
                      { label: "DPN Document", path: caf.disbursements?.[0]?.dpn_document },
                      { label: "Vernacular Document", path: caf.disbursements?.[0]?.vernacular_document },
                      { label: "Disbursement Video", path: caf.disbursements?.[0]?.disbursement_video },
                      { label: "Payment Screenshot", path: caf.disbursements?.[0]?.payment_screenshot },
                    ])}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600">
                        <CircleDollarSign size={15} />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">Loan & EMI Summary</h3>
                    </div>
                    {caf.loans?.length ? caf.loans.map((loan: any) => (
                      <div key={loan.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{loan.loan_number || "-"}</p>
                            <p className="text-sm text-gray-500">Loan amount: Rs. {loan.loan_amount || "-"}</p>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{loan.emi_schedules?.length || 0} EMI schedules</span>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">EMI Amount</p>
                            <p className="font-semibold text-gray-800">Rs. {loan.emi_amount || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Interest Rate</p>
                            <p className="font-semibold text-gray-800">{loan.interest_rate || "-"}%</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Start Date</p>
                            <p className="font-semibold text-gray-800">{formatDate(loan.loan_start_date)}</p>
                          </div>
                        </div>
                        {loan.emi_schedules?.length ? (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">EMI</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Amount</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {loan.emi_schedules.map((emi: any) => (
                                  <tr key={emi.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">{emi.installment_no}</td>
                                    <td className="px-3 py-2">{formatDate(emi.installment_date)}</td>
                                    <td className="px-3 py-2">Rs. {emi.installment_amount || "-"}</td>
                                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(emi.status)}`}>{emi.status || "-"}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    )) : <p className="text-sm text-gray-500">No loan record available.</p>}
                    {renderDocumentBlock("EMI Payment Documents", [
                      ...(caf.loans?.[0]?.emi_payments || []).map((payment: any) => ({
                        label: `EMI Payment ${payment.id}`,
                        path: payment.payment_image,
                        description: `${payment.payment_method || "-"} • ${payment.payment_status || "-"}`,
                      })),
                    ])}
                  </div>
                </div>
              </CollapsibleSection>
            ))
          )}
        </div>
      )}

    </div>
  );
}
