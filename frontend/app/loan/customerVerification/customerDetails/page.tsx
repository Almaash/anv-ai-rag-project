"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
/* ---------- Shared Components ---------- */

const statusMeta: any = {
  verified: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, label: "Verified" },
  pending: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock, label: "Pending" },
  rejected: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Rejected" },
  field_executive: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: MapPin, label: "Field Executive" },
  branch_support_executive: {
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    icon: UserCheck,
    label: "Branch Support Executive",
  },
  branch_manager: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: UserCheck, label: "Branch Manager" },
  reverted: { color: "text-orange-600 bg-orange-50 border-orange-200", icon: TrendingDown, label: "Reverted" },
  default: { color: "text-gray-600 bg-gray-50 border-gray-200", icon: AlertCircle, label: "Unknown" },
};

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const getImageUrl = (path?: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}` : null;

const formatCustomerName = (customer: {
  name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}) => {
  if (customer.name) return customer.name;

  return [customer.first_name, customer.middle_name, customer.last_name]
    .filter(Boolean)
    .join(" ");
};

const InfoItem = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">{value || "—"}</p>
  </div>
);

const Section = ({ title, children, className }: any) => (
  <div className={cn("bg-white border rounded-xl shadow-sm", className)}>
    <div className="border-b px-6 py-4 font-semibold text-gray-800">{title}</div>
    <div className="p-6">{children}</div>
  </div>
);

const Field = ({ label, value }: any) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
  </div>
);

const DocumentImage = ({ label, image }: { label: string; image?: string | null }) => {
  const url = getImageUrl(image);
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <p className="text-xs text-gray-500">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="h-36 w-full object-cover rounded-md hover:opacity-90 transition cursor-pointer" />
        </a>
      ) : (
        <div className="h-36 flex items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">No image</div>
      )}
    </div>
  );
};

/* ---------- Page ---------- */

function VerificationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const enrollmentNumber = params.get("enrollment_number"); // present = enrollment flow

  const isEnrollmentFlow = !!enrollmentNumber;
  //fetching current login user roles and permissions from local storage
  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const isBSE =
    currentUser?.role?.toLowerCase() === "branch support executive";

  const isFE =
    currentUser?.role?.toLowerCase() === "field executive";
  const [customer, setCustomer] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const [checks, setChecks] = useState({
    occupation_applicant: false,
    occupation_nominee: false,
    house_details: false,
    assets_details: false,
  });

  const toggleCheck = (key: string) =>
    setChecks((prev: any) => ({ ...prev, [key]: !prev[key] }));

  const allVerified = Object.values(checks).every(Boolean);

  const progress = (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100;

  // Fetch customer data — pass enrollment_number to scope verification_history to this cycle
  useEffect(() => {
    if (!id) return;

    const params: any = {};

    if (enrollmentNumber) {
      params.enrollment_number = enrollmentNumber;
    }

    axiosInstance
      .get(
        `${ProjectApiList.api_getLonaCustomerById}/${id}`,
        { params }
      )
      .then((res) => {
        if (res.data.success) {
          setCustomer(res.data.data);

          // enrollment comes from same response
          setEnrollment(res.data.data.enrollment || null);
        }
      })
      .catch(console.error);
  }, [id, enrollmentNumber]);

  // Fetch enrollment record when in enrollment flow (to get enrollment's own verification_status)
  // useEffect(() => {
  //   if (!isEnrollmentFlow || !id) return;
  //   axiosInstance
  //     .get(`${ProjectApiList.api_createEnrollment}/${id}`)
  //     .then((res) => {
  //       if (res.data.success) {
  //         const match = (res.data.data as any[]).find(
  //           (e) => e.enrollment_number === enrollmentNumber
  //         );
  //         if (match) setEnrollment(match);
  //       }
  //     })
  //     .catch(console.error);
  // }, [isEnrollmentFlow, id, enrollmentNumber]);

  // The status to show in the header badge:
  // enrollment flow → enrollment.verification_status
  // customer flow   → customer.verification_status
  const displayStatus = isEnrollmentFlow
    ? (enrollment?.verification_status ?? "pending")
    : customer?.verification_status;

  // Whether the action bar should be shown (not yet verified/rejected)
  const canAct = isEnrollmentFlow
    ? displayStatus === "pending"
    : displayStatus !== "verified";

  /* ── Verify ── */
  const handleFinalVerify = async () => {
    try {
      setActionLoading(true);
      if (isEnrollmentFlow) {
        await axiosInstance.post(
          `${ProjectApiList.api_verifyEnrollment}/${enrollmentNumber}`,
          {
            verification_status: "verified",
            verification_notes: "All checks passed",
            occupation_details_applicant: checks.occupation_applicant,
            occupation_details_nominee: checks.occupation_nominee,
            house_details: checks.house_details,
            assets_details: checks.assets_details,
          }
        );
      } else {
        await axiosInstance.post(`${ProjectApiList.api_verifyCustomer}/${id}`, {
          verification_status: "verified",
          verification_notes: "All checks passed",
          occupation_details_applicant: checks.occupation_applicant,
          occupation_details_nominee: checks.occupation_nominee,
          house_details: checks.house_details,
          assets_details: checks.assets_details,
        });
      }
      toast.success("Customer verified successfully");
      router.back();
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.message ||
        "Verification failed"
      );
    } finally {
      setActionLoading(false);
      setIsVerifyOpen(false);
    }
  };

  /* ── Reject / Back to Executive ── */
  const handleReject = async () => {
    if (!reason.trim()) return;
    try {
      setActionLoading(true);
      if (isEnrollmentFlow) {
        await axiosInstance.post(
          `${ProjectApiList.api_verifyEnrollment}/${enrollmentNumber}`,
          {
            verification_status: "reverted",
            verification_notes: reason,
            occupation_details_applicant: checks.occupation_applicant,
            occupation_details_nominee: checks.occupation_nominee,
            house_details: checks.house_details,
            assets_details: checks.assets_details,
          }
        );
      } else {
        await axiosInstance.post(
          `${ProjectApiList.api_revertLoanCustomer}/${id}`,
          {
            enrollment_number: enrollmentNumber,
            reason,
            occupation_details_applicant: checks.occupation_applicant,
            occupation_details_nominee: checks.occupation_nominee,
            house_details: checks.house_details,
            assets_details: checks.assets_details,
          }
        );
      }
      toast.success("Returned to Field Executive");
      router.back();
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.message ||
        "Action failed"
      );
    } finally {
      setActionLoading(false);
      setIsRejectOpen(false);
    }
  };
  //Handle resubmission of enrollment after being reverted by BSE
  const handleResubmitEnrollment = async () => {
    try {

      setActionLoading(true);

      await axiosInstance.post(
        `${ProjectApiList.api_resubmitEnrollment}/${enrollmentNumber}`
      );
      toast.success("Enrollment sent to BSE successfully");
      router.back();

    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.message ||
        "Resubmit failed"
      );
    } finally {
      setActionLoading(false);
    }
  };
  if (!customer) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin border-2 border-gray-400 border-t-transparent rounded-full w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-sm">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 bg-white p-8 rounded-xl shadow-sm border">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="h-48 w-48 md:h-56 md:w-56 rounded-2xl overflow-hidden border-4 border-blue-100 shadow-md bg-gray-50 flex-shrink-0">
            {customer.customer_photo ? (
              <img src={getImageUrl(customer.customer_photo)!} alt="Customer Photo" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                <svg className="h-24 w-24 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] font-bold opacity-60">No Profile Photo</span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center h-full pt-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {formatCustomerName(customer)}
            </h1>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <p className="text-lg font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                ID: {customer.customer_unique_id}
              </p>

            </div>




            <div className="mt-3 flex justify-center md:justify-start">
              <span
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm",
                  displayStatus === "verified"
                    ? "bg-green-500 text-white"
                    : displayStatus === "rejected"
                      ? "bg-red-500 text-white"
                      : displayStatus === "reverted"
                        ? "bg-orange-500 text-white"
                        : "bg-yellow-500 text-white"
                )}
              >
                {displayStatus || "Pending"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        >
          Back
        </button>
      </div>
      {/* REVERTED FLOW BANNER */}
      {isEnrollmentFlow &&
        enrollment?.verification_status === "reverted" &&
        enrollment?.verification_notes && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="font-bold text-orange-700">
              Returned By Branch Support Executive
            </h3>

            <p className="mt-2 text-sm text-orange-800">
              {enrollment.verification_notes}
            </p>
          </div>
        )}
      {/* SECTIONS — identical for both flows */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="Registration Details">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem
                  label="Enrollment Date"
                  value={
                    isEnrollmentFlow
                      ? enrollment?.enrollment_date
                      : customer.enrollment_date
                  }
                />
                <InfoItem
                  label="Enrollment Number"
                  value={
                    isEnrollmentFlow
                      ? enrollment?.enrollment_number
                      : customer.enrollment_number
                  }
                />
                <InfoItem label="Gender" value={customer.gender} />
                <InfoItem label="Date of Birth" value={customer.date_of_birth} />
                <InfoItem label="Created On" value={formatDate(customer.created_at)} />
              </div>
            </Section>

            <Section title="Contact Information">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem label="Email" value={customer.email} />
                <InfoItem label="Primary Contact" value={customer.contact_number_1} />
                <InfoItem label="Secondary Contact" value={customer.contact_number_2} />
                <InfoItem label="User ID" value={customer.user_id} />
                <InfoItem label="Branch ID" value={customer.branch_id} />
              </div>
            </Section>

            <Section title="Socio-Economic">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem label="Father's Name" value={customer.father_name} />
                <InfoItem label="Religion" value={customer.religion} />
                <InfoItem label="Caste" value={customer.caste} />
                <InfoItem label="Occupation" value={`${customer.occupation} (${customer.salaried_type || "N/A"})`} />
                {customer.business_nature == "" ? (
                  <InfoItem label="Business Nature" value="N/A" />
                ) : (<InfoItem label="Business Nature" value={customer.business_nature} />)}
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Permanent Address">
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-200 pl-4 py-2 bg-blue-50/30 rounded-r">
                {customer.permanent_address || "No permanent address provided"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Service Area PIN" value={customer.service_area_pin} />
                <Field label="Branch" value={customer.branch_id} />
              </div>
            </Section>
            <Section title="Communication Address">
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-emerald-200 pl-4 py-2 bg-emerald-50/30 rounded-r">
                {customer.correspondence_address || "No communication address provided"}
              </p>
            </Section>
          </div>
        </div>

        {/* TIMELINE SIDEBAR */}
        <div className="lg:col-span-1">
          <Card className="h-full border-none shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative space-y-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
                {customer.status_history && Array.isArray(customer.status_history) && customer.status_history.length > 0 ? (
                  customer.status_history.slice().reverse().map((history: any, idx: number) => {
                    const meta = statusMeta[history.status] || statusMeta.default;
                    const Icon = meta.icon;
                    return (
                      <div key={idx} className="relative pl-8 group">
                        <div className={cn("absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center z-10 shadow-sm", meta.color.split(" ")[2])}>
                          <Icon className={cn("h-3.5 w-3.5", meta.color.split(" ")[0])} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", meta.color)}>
                              {history.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">
                              {new Date(history.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          {history.reason && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md border border-dashed mt-1 italic">
                              "{history.reason}"
                            </p>
                          )}
                          {history.enrollment_number && (
                            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                              Enroll: {history.enrollment_number}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(history.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No history available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Permanent Address">
          <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-200 pl-4 py-2 bg-blue-50/30 rounded-r">
            {customer.permanent_address || "No permanent address provided"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Service Area PIN" value={customer.service_area_pin} />
            <Field label="Branch" value={customer.branch_id} />
          </div>
        </Section>
        <Section title="Correspondence Address">
          <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-orange-200 pl-4 py-2 bg-orange-50/30 rounded-r">
            {customer.correspondence_address || "No correspondence address provided"}
          </p>
          <div className="mt-4">
            <Field label="Years of Staying" value={customer.years_of_staying} />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Nominee & Spouse Details">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 pb-2 border-b">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Nominee Information</p>
            </div>
            <Field label="Nominee Name" value={customer.nominee_name} />
            <Field label="Relationship" value={customer.nominee_relationship} />
            <div className="col-span-2">
              <Field label="Nominee Address" value={customer.nominee_address} />
            </div>
            <div className="col-span-2 mt-4 pb-2 border-b">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Spouse Information</p>
            </div>
            <Field label="Spouse Occupation" value={customer.spouse_occupation} />
            <Field label="Spouse Employment" value={customer.spouse_salaried_type} />
            <div className="col-span-2">
              <Field label="Spouse Business Nature" value={customer.spouse_business_nature} />
            </div>
          </div>
        </Section>

        <Section title="Residence & Assets">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Residence Type" value={customer.residence_type} />
            <Field label="House Type" value={customer.house_type} />
            <Field label="No. of Rooms" value={customer.number_of_rooms} />
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-2">Household Assets</p>
              <div className="flex flex-wrap gap-2">
                {customer.assets && JSON.parse(customer.assets) ? (
                  Object.entries(JSON.parse(customer.assets)).map(([key, val]) =>
                    val && (
                      <span key={key} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-medium border capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    )
                  )
                ) : "—"}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Verification Audit Log */}
      {customer.verification_history &&
        Array.isArray(customer.verification_history) &&
        customer.verification_history.length > 0 && (
          <Section title="Verification Audit Log">
            <div className="space-y-6">
              {customer.verification_history.map((item: any, index: number) => (
                <div key={item.id || index} className="border-b last:border-b-0 pb-6 last:pb-0">
                  {/* Header section */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-gray-50/50 p-3 rounded-lg">
                    {/* Left side: Action & Date */}
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className="text-xs font-bold uppercase text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                          {item.action?.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Right side: Metadata cards */}
                    <div className="flex flex-wrap items-center gap-6">
                      <InfoItem
                        label="Verified By"
                        value={customer.verified_by || "—"}
                      />

                      <InfoItem
                        label="Verified At"
                        value={formatDate(customer.verified_at) || "—"}
                      />
                    </div>
                  </div>

                  {/* Audit log comments */}
                  {item.reason && (
                    <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded-md border mb-4">
                      {item.reason}
                    </p>
                  )}

                  {/* Status breakdown grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    {[
                      ["Applicant Occupation", item.occupation_details_applicant],
                      ["Nominee Occupation", item.occupation_details_nominee],
                      ["House Details", item.house_details],
                      ["Assets Details", item.assets_details],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2 shadow-sm">
                        <span className="text-gray-600 font-medium">{label}</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${val ? "text-green-600" : "text-gray-400"}`}>
                          <CheckCircle2 className="h-4 w-4" />
                          {val ? "Complete" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

      {/* KYC Documents */}
      <Section title="KYC & Identity Documents">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-4">
            <Field label="Customer Live Photo" value={formatCustomerName(customer)} />
            <DocumentImage label="Customer Photo" image={customer.customer_photo} />
          </div>
          <div className="space-y-4">
            <Field label="Aadhaar Number" value={customer.adhaar_number} />
            <DocumentImage label="Aadhaar Front" image={customer.adhaar_image} />
          </div>
          <div className="space-y-4">
            <Field label="Aadhaar Back" value="Back Side" />
            <DocumentImage label="Aadhaar Back" image={customer.adhaar_image_back} />
          </div>
          <div className="space-y-4">
            <Field label="PAN Number" value={customer.pan_number} />
            <DocumentImage label="PAN Card" image={customer.pan_image} />
          </div>
          <div className="space-y-4">
            <Field label="Driving License Number" value={customer.driving_license_number} />
            <DocumentImage label="Driving License" image={customer.driving_license_image} />
          </div>
          <div className="space-y-4">
            <Field label="Voter ID Number" value={customer.voter_id_number} />
            <DocumentImage label="Voter ID Front" image={customer.voter_id_image} />
          </div>
          <div className="space-y-4">
            <Field label="Voter ID Back" value="Back Side" />
            <DocumentImage label="Voter ID Back" image={customer.voter_id_image_back} />
          </div>
          <div className="space-y-4">
            <Field label="Ration Card Number" value={customer.ration_card_number} />
            <DocumentImage label="Ration Card" image={customer.ration_card_image} />
          </div>
          <div className="space-y-4">
            <Field label="Other Document" value={customer.other_name} />
            <DocumentImage label="Other Document" image={customer.other_document} />
          </div>
        </div>
      </Section>

      {/* VERIFICATION CHECKLIST — shown for both new customer and re-enrollment flows */}
      {isFE &&
        isEnrollmentFlow &&
        enrollment?.verification_status === "reverted" && (
          <div className="sticky bottom-0 bg-white border rounded-xl shadow-sm p-4 flex justify-end gap-3 z-10">

            <Button
              onClick={handleResubmitEnrollment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Send To BSE Again
            </Button>

          </div>
        )}
      {/* {isBSE && canAct && ( */}
      {canAct && (
        <Section title="Verification Checklist">
          <div className="space-y-4">
            <div className="w-full bg-gray-200 h-2 rounded">
              <div className="bg-green-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500">{Math.round(progress)}% verification completed</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["occupation_applicant", "Occupation Details: Applicant"],
                ["occupation_nominee", "Occupation Details: Nominee"],
                ["house_details", "House Details"],
                ["assets_details", "Assets Details"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 bg-gray-50 border rounded-lg p-3 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={(checks as any)[key]}
                    onChange={() => toggleCheck(key)}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ACTION BAR */}
      {/* {isBSE && canAct && ( */}
      { canAct && (
        <div className="sticky bottom-0 bg-white border rounded-xl shadow-sm p-4 flex justify-end gap-3 z-10">

          {/* Reject / Back to Executive button */}
          <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 h-10 px-6 font-bold">
                {"Back to Field Executive"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-orange-50 border-b border-orange-100 flex flex-col justify-center items-center p-6">
                <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-bold text-orange-900">
                  {isEnrollmentFlow ? "Reject Enrollment" : "Return to Executive"}
                </DialogTitle>
                <p className="text-sm text-orange-700/80 mt-1">Please provide a reason.</p>
              </div>
              <div className="p-6 space-y-4">
                <Textarea
                  placeholder="Enter reason here..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px] bg-gray-50 resize-none"
                />
              </div>
              <div className="flex items-center gap-3 p-6 bg-gray-50 border-t">
                <Button variant="ghost" className="flex-1" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!reason.trim() || actionLoading}
                  className="flex-1 font-bold bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading ? "Sending..." : "Confirm"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Verify button */}
          <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!allVerified}
                className={cn(
                  "h-10 px-6 font-bold text-white shadow-md",
                  allVerified ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                )}
              >
                {isEnrollmentFlow ? "Verify Enrollment" : "Final Verify Customer"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-green-50 border-b border-green-100 p-8 text-center">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-bold text-green-900">Approve Verification</DialogTitle>
                <p className="text-sm text-green-700/80 mt-2">
                  {isEnrollmentFlow
                    ? `This will verify enrollment ${enrollmentNumber} and make it available for CAF creation.`
                    : "This will mark the customer as verified and move them to the next stage."}
                </p>
              </div>
              <div className="flex items-center gap-3 p-6 bg-gray-50">
                <Button variant="ghost" className="flex-1" onClick={() => setIsVerifyOpen(false)}>Cancel</Button>
                <Button
                  className="flex-[2] bg-green-600 hover:bg-green-700 h-11 text-white shadow-lg shadow-green-200"
                  onClick={handleFinalVerify}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Verifying..." : "YES, VERIFY NOW"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
