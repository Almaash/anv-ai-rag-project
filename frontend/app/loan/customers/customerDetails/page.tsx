"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import BASE_URL from "@/app/api/ProjectApiList";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  TrendingDown,
  UserCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/* ================= HELPERS ================= */

const statusMeta: any = {
  verified: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, label: "Verified" },
  pending: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock, label: "Pending Verification" },
  rejected: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Rejected" },
  field_executive: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: MapPin, label: "Field Executive" },
  branch_manager: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: UserCheck, label: "Branch Manager" },
  reverted: { color: "text-orange-600 bg-orange-50 border-orange-200", icon: TrendingDown, label: "Reverted to Executive" },
  default: { color: "text-gray-600 bg-gray-50 border-gray-200", icon: AlertCircle, label: "Unknown" },
};

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "—";

const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}`;
};

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

/* ================= UI ================= */

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">
      {value || "—"}
    </p>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    {children}
  </div>
);

const DocumentImage = ({
  label,
  image,
}: {
  label: string;
  image?: string | null;
}) => {
  const url = getImageUrl(image);

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <p className="text-xs text-gray-500">{label}</p>

      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={label}
            className="h-36 w-full object-cover rounded-md hover:opacity-90 transition cursor-pointer"
          />
        </a>
      ) : (
        <div className="h-36 flex items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
          No image
        </div>
      )}
    </div>
  );
};

/* ================= PAGE ================= */

export default function CustomerDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const enrollmentNumber = searchParams.get("enrollment_number");

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null);

  /* ================= FETCH ================= */

  const fetchCustomer = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `${ProjectApiList.api_getLonaCustomerById}/${id}`,
        {
          params: {
            enrollment_number: enrollmentNumber,
          },
        }
      );

      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (error) {
      console.error("Fetch customer failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    try {
      setPromoting(true);
      const res = await axiosInstance.post(
        `${ProjectApiList.api_promoteLoanCustomer}/${id}`
      );

      if (res.data.success) {
        toast.success("Promoted to Branch Manager successfully");
        setShowPromoteModal(false);
        router.back();
        fetchCustomer(); // Refresh details
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Promotion failed");
    } finally {
      setPromoting(false);
    }
  };

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setLoggedInRole(user.role?.toLowerCase() || "");
    } catch {
      setLoggedInRole("");
    }
  }, []);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-20 text-center text-gray-500">
        Customer not found
      </div>
    );
  }

  const fullName = formatCustomerName(customer);

  const assets = customer.assets ? JSON.parse(customer.assets) : {};

  // console.log(getImageUrl(customer.customer_photo), "---------------------->")

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 bg-white p-8 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="h-48 w-48 md:h-56 md:w-56 rounded-2xl overflow-hidden border-4 border-blue-100 shadow-md bg-gray-50 flex-shrink-0">
            {customer.customer_photo ? (
              <img
                src={getImageUrl(customer.customer_photo)!}
                alt="Customer Photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-gray-300 bg-gray-50 uppercase tracking-tighter">
                <svg className="h-24 w-24 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] font-bold opacity-60">No Profile Photo</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center h-full pt-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {fullName}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
              <p className="text-lg font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                ID: {customer.customer_unique_id}
              </p>
              <p className="text-lg text-gray-600 bg-gray-50 px-3 py-1 rounded-md border">
                Enroll: {customer.enrollment?.enrollment_number}
              </p>
            </div>
            <div className="mt-4 flex justify-center md:justify-start">
              <span className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm",
                customer.enrollment?.status === "active" ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}>
                {customer.enrollment?.status || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* OLD: Edit button was only shown for field_executive status.
          Removed after disbursement, blocking mobile number corrections for BSE failures.
          {customer.status === "field_executive" && (
            <button
              onClick={() => router.push(`/loan/customers/editCustomer?id=${id}`)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 border-2 border-blue-700 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Customer
            </button>
          )} */}

          {/* NEW: Edit button is shown for field_executive, branch_support_executive, and branch_manager.
          This allows mobile number correction after final disbursement if BSE verification fails. */}
          {loggedInRole !== null &&
            ["field_executive", "branch_support_executive", "branch_manager"]
              .includes(customer.enrollment?.status) &&
            !(customer.enrollment?.status === "branch_support_executive" && loggedInRole === "field executive") && (
              <button
                onClick={() => router.push(`/loan/customers/editCustomer?id=${id}`)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 border-2 border-blue-700 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
              >
                Edit Customer
              </button>
            )}
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            Back
          </button>

          {/* Promote button remains restricted to field_executive only — no change needed here */}
          {customer?.enrollment?.status === "field_executive" && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 border-2 border-green-700 rounded-xl hover:bg-green-700 transition-all shadow-sm"
            >
              Promote to Branch Support Executive
            </button>
          )}
        </div>
      </div>

      {/* Promotion Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-all p-4">
          <div className="bg-white rounded-2xl p-0 w-full max-w-[400px] shadow-2xl overflow-hidden border-none transform transition-all scale-100">
            <div className="bg-blue-50 border-b border-blue-100 p-8 text-center">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900">Promote Employee</h3>
              <p className="text-sm text-blue-700/80 mt-2 italic px-2">
                Promoting <strong>{customer.first_name} {customer.last_name}</strong> to <br /> <span className="font-bold underline">Branch Support Executive</span>.
              </p>
            </div>

            <div className="p-6 bg-white">
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                This action will upgrade their system access and responsibilities. Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex items-center gap-3 p-6 bg-gray-50 border-t">
              <button
                className="flex-1 px-4 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
                onClick={() => setShowPromoteModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-[2] px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 text-sm uppercase tracking-wide"
                disabled={promoting}
                onClick={handlePromote}
              >
                {promoting ? "Promoting..." : "CONFIRM PROMOTION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BASIC + ENROLLMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="Registration Details">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem
                  label="Enrollment Date"
                  value={
                    customer.enrollment?.enrollment_date
                      ? `${new Date(customer.enrollment?.enrollment_date).toLocaleDateString("en-GB")} ${new Date(customer.enrollment?.enrollment_date).toLocaleTimeString("en-GB")}`
                      : "—"
                  }
                />                <InfoItem label="Enrollment Number" value={customer.enrollment?.enrollment_number} />
                <InfoItem label="Gender" value={customer.gender} />
                <InfoItem label="Date of Birth" value={customer.date_of_birth} />
                <InfoItem label="Created On" value={formatDate(customer.created_at)} />
                <InfoItem
                  label="Verification Status"
                  value={customer.enrollment?.verification_status}
                />
                <InfoItem
                  label="Verification Notes"
                  value={customer.enrollment?.verification_notes}
                />
              </div>
            </Section>

            <Section title="Contact Information">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem label="Email" value={customer.email} />
                <InfoItem label="Primary Contact" value={customer.contact_number_1} />
                <InfoItem label="Secondary Contact" value={customer.contact_number_2} />
                {/* <InfoItem label="User ID" value={customer.user_id} /> */}
                {/* <InfoItem label="CMS Admin ID" value={customer.cms_admin_id} /> */}
              </div>
            </Section>

            <Section title="Socio-Economic">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem label="Father's Name" value={customer.father_name} />
                <InfoItem label="Religion" value={customer.religion} />
                <InfoItem label="Caste" value={customer.caste} />
                <div className="border-t pt-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Occupation</p>
                  <InfoItem label="Customer" value={`${customer.occupation} (${customer.salaried_type || "N/A"})`} />
                  <InfoItem label="Business Nature" value={customer.business_nature} />
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Spouse / Nominee</p>
                  <InfoItem label="Occupation" value={`${customer.spouse_occupation} (${customer.spouse_salaried_type || "N/A"})`} />
                  <InfoItem label="Business Nature" value={customer.spouse_business_nature} />
                </div>
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Permanent Address">
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-200 pl-4 py-2 bg-blue-50/30 rounded-r">
                {customer.permanent_address || "No permanent address provided"}
              </p>
              <div className="mt-4">
                <InfoItem label="Service Area PIN" value={customer.service_area_pin} />
              </div>
            </Section>
            <Section title="Correspondence Address">
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-emerald-200 pl-4 py-2 bg-emerald-50/30 rounded-r">
                {customer.correspondence_address || "No correspondence address provided"}
              </p>
            </Section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Person Disability">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem
                  label="Is Disabled"
                  value={
                    customer.is_disabled === true
                      ? "Yes"
                      : customer.is_disabled === false
                        ? "No"
                        : "—"
                  }
                />
                <InfoItem
                  label="Disability Type"
                  value={customer.is_disabled ? customer.disability_type : "—"}
                />
              </div>
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
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />

                {customer.enrollment?.status_history && Array.isArray(customer.enrollment?.status_history) && customer.enrollment?.status_history.length > 0 ? (
                  customer.enrollment?.status_history.slice().reverse().map((history: any, idx: number) => {
                    const meta = statusMeta[history.status] || statusMeta.default;
                    const Icon = meta.icon;

                    return (
                      <div key={idx} className="relative pl-8 group">
                        {/* Dot */}
                        <div className={cn(
                          "absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm",
                          meta.color.split(' ')[2] // border color
                        )}>
                          <Icon className={cn("h-3.5 w-3.5", meta.color.split(' ')[0])} />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              meta.color
                            )}>
                              {history.status.replace(/_/g, ' ')}
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

                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      <Section title="Verification History">
        <div className="space-y-3">
          {customer.verification_history?.map((item: any) => (
            <div
              key={item.id}
              className="border rounded-lg p-3"
            >
              <p><strong>Status:</strong> {item.status}</p>
              <p><strong>Reason:</strong> {item.reason}</p>
              <p><strong>Admin:</strong> {item.admin_name}</p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Section>
      {/* ADDRESSES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Permanent Address">
          <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-200 pl-4 py-2 bg-blue-50/30 rounded-r">
            {customer.permanent_address || "No permanent address provided"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <InfoItem label="Service Area PIN" value={customer.service_area_pin} />
            <InfoItem label="Branch ID" value={customer.branch_id} />
          </div>
        </Section>

        <Section title="Correspondence Address">
          <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-orange-200 pl-4 py-2 bg-orange-50/30 rounded-r">
            {customer.correspondence_address || "No correspondence address provided"}
          </p>
        </Section>
      </div>

      {/* NOMINEE + HOUSE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Nominee Details">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Nominee Name" value={customer.nominee_name} />

            <InfoItem
              label="Relationship"
              value={customer.nominee_relationship}
            />

            {customer.nominee_relationship_other && (
              <InfoItem
                label="Other Relationship"
                value={customer.nominee_relationship_other}
              />
            )}

            <div className="col-span-2">
              <InfoItem
                label="Nominee Address"
                value={customer.nominee_address}
              />
            </div>
          </div>
        </Section>

        <Section title="Residence & Assets">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Residence Type" value={customer.residence_type} />
            <InfoItem label="House Type" value={customer.house_type} />
            <InfoItem label="No. of Rooms" value={customer.number_of_rooms} />
            <InfoItem label="Years of Staying" value={customer.years_of_staying} />
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-2">Household Assets</p>
              <div className="flex flex-wrap gap-2">
                {customer.assets && JSON.parse(customer.assets) ? (
                  Object.entries(JSON.parse(customer.assets)).map(([key, val]) => val && (
                    <span key={key} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-medium border capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  ))
                ) : "—"}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* DOCUMENTS */}
      <Section title="KYC & Identity Documents">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {customer.adhaar_image && (
            <div className="space-y-4">
              <InfoItem label="Aadhaar Number" value={customer.adhaar_number} />
              <DocumentImage label="Aadhaar Front" image={customer.adhaar_image} />
              {customer.adhaar_image_back && (
                <DocumentImage label="Aadhaar Back" image={customer.adhaar_image_back} />
              )}
            </div>
          )}
          {customer.pan_image && (
            <div className="space-y-4">
              <InfoItem label="PAN Number" value={customer.pan_number} />
              <DocumentImage label="PAN Card" image={customer.pan_image} />
            </div>
          )}
          {customer.driving_license_image && (
            <div className="space-y-4">
              <InfoItem label="License Number" value={customer.driving_license_number} />
              <DocumentImage label="Driving License" image={customer.driving_license_image} />
            </div>
          )}
          {customer.voter_id_image && (
            <div className="space-y-4">
              <InfoItem label="Voter ID" value={customer.voter_id_number} />
              <DocumentImage label="Voter ID Front" image={customer.voter_id_image} />
              {customer.voter_id_image_back && (
                <DocumentImage label="Voter ID Back" image={customer.voter_id_image_back} />
              )}
            </div>
          )}
          {customer.ration_card_image && (
            <div className="space-y-4">
              <InfoItem label="Ration Card Number" value={customer.ration_card_number} />
              <DocumentImage label="Ration Card" image={customer.ration_card_image} />
            </div>
          )}
          {customer.other_document && (
            <div className="space-y-4">
              <InfoItem label="Other Document" value={customer.other_name || "Document"} />
              <DocumentImage label={customer.other_name || "Other Document"} image={customer.other_document} />
            </div>
          )}
        </div>
      </Section>

      {/* BANK INFO */}
      {(customer.bank_name || customer.bank_account_number || customer.ifsc_code || customer.passbook_image) && (
        <Section title="Bank Account Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {customer.bank_name && <InfoItem label="Bank Name" value={customer.bank_name} />}
            {customer.bank_account_number && <InfoItem label="Account Number" value={customer.bank_account_number} />}
            {customer.ifsc_code && <InfoItem label="IFSC Code" value={customer.ifsc_code} />}
            {customer.passbook_image && (
              <div className="col-span-1 md:col-span-3">
                <DocumentImage label="Passbook Image" image={customer.passbook_image} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* AGENT */}
      {/* <Section title="Assigned Agent">
        {customer.agent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="sm:col-span-2 lg:col-span-1 flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                {customer.agent.photo ? (
                  <img 
                    src={getImageUrl(customer.agent.photo)!} 
                    alt="Agent" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-xl uppercase">
                    {customer.agent.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{customer.agent.name}</p>
                <p className="text-xs text-blue-600 font-medium">{customer.agent.agent_unique_id}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    customer.agent.status === "active" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {customer.agent.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
              <InfoItem label="Phone" value={customer.agent.phone_no} />
              <InfoItem label="Email" value={customer.agent.email} />
              <InfoItem label="Location" value={customer.agent.location} />
              <InfoItem label="Gender" value={customer.agent.gender} />
              <div className="sm:col-span-2">
                <InfoItem label="Address" value={customer.agent.address} />
              </div>
            </div>

            <div className="col-span-full border-t pt-4 mt-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Agent Identity Documents</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <DocumentImage label="Aadhaar" image={customer.agent.adhaar_image} />
                <DocumentImage label="PAN" image={customer.agent.pan_image} />
                <DocumentImage label="Voter ID" image={customer.agent.voter_id_image} />
                <DocumentImage label="DL" image={customer.agent.driving_license_image} />
                <DocumentImage label="Passbook" image={customer.agent.passbook_image} />
                <DocumentImage label="Police Verification" image={customer.agent.police_verification_image} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
            No Agent Assigned
          </div>
        )}
      </Section> */}

      {/* DOCUMENTS */}
      {/* <Section title="Uploaded Documents">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DocumentImage label="Aadhaar Card" image={customer.adhaar_image} />
          <DocumentImage label="PAN Card" image={customer.pan_image} />
          <DocumentImage
            label="Driving License"
            image={customer.driving_license_image}
          />
          <DocumentImage label="Voter ID" image={customer.voter_id_image} />
          <DocumentImage
            label="Ration Card"
            image={customer.ration_card_image}
          />
          <DocumentImage
            label="Bank Passbook"
            image={customer.passbook_image}
          />
        </div>
      </Section> */}
    </div>
  );
}
