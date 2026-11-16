"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, User, Phone, Mail, MapPin, Building, CreditCard, Home,
  Calendar, FileText, Download, ArrowLeft, Shield, Heart, Globe, Fingerprint,
  Hash, BookOpen, AlertCircle, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import AttendanceCalendar from "./AttendanceCalendar";

export default function ViewEmployeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);

  useEffect(() => {
    if (!id) {
      toast.error("No employee ID provided");
      router.push("/hrms/employees");
      return;
    }
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_EMPLOYEE}/${id}`);
      if (res.data.status === "success") {
        setEmployee(res.data.data);
        setProfilePhotoError(false);

        // Check if the user is an employee viewing their own profile
        const userType = localStorage.getItem("userType");
        const empIdStr = localStorage.getItem("employeeId");
        if (userType === "employee" && empIdStr === String(id)) {
          setIsSelfProfile(true);
        }
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
        <p className="text-slate-500 animate-pulse">Loading employee profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-slate-300" />
        <p className="text-slate-500 text-lg">Employee not found</p>
        <Button variant="outline" onClick={() => router.push("/hrms/employees")}>
          <ArrowLeft size={16} className="mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const personal = employee.personal_detail || {};
  const bank = Array.isArray(employee.bank_details)
    ? employee.bank_details[0] || {}
    : employee.bank_details || {};
  const addresses = employee.addresses || [];
  const documents = employee.documents || [];
  const presentAddr = addresses.find((a: any) => a.type === 'current') || {};
  const permanentAddr = addresses.find((a: any) => a.type === 'permanent') || {};

  const leaveRows = [
    { label: "Sick Leave (Days)", value: employee.sick_leave_days, showFor: () => Number(employee.sick_leave_days) > 0 },
    { label: "Casual Leave (Days)", value: employee.casual_leave_days, showFor: () => Number(employee.casual_leave_days) > 0 },
    {
      label: "Maternity Leave (Days)",
      value: employee.maternity_leave_days,
      showFor: () => Number(employee.maternity_leave_days) > 0 && String(employee.gender || "").toLowerCase() === "female",
    },
  ].filter((row) => row.showFor());

  const hasValue = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };

  const InfoRow = ({ icon: Icon, label, value, className: cls }: { icon: any, label: string, value: string | undefined | null, className?: string }) => (
    <div className={cn("flex items-start gap-3 py-3", cls)}>
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value || "-"}</p>
      </div>
    </div>
  );

  const OptionalInfoRow = ({ icon, label, value, className }: { icon: any, label: string, value: string | undefined | null, className?: string }) => {
    if (!hasValue(value)) return null;
    return <InfoRow icon={icon} label={label} value={value} className={className} />;
  };

  const SectionCard = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center">
          <Icon size={16} className="text-slate-600" />
        </div>
        <h3 className="text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const docTypeLabels: Record<string, string> = {
    profile_photo: "Profile Photo",
    aadhaar_card: "Aadhaar Card",
    pan_card: "PAN Card",
    education: "Education Certificates",
    experience: "Experience Letter",
    other: "Other Documents",
  };

  const getFileExtension = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext || '';
  };

  const isImage = (path: string) => {
    const ext = getFileExtension(path);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const imgBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  const profileDocumentPath = documents.find((doc: any) => doc.document_type === "profile_photo")?.file_path;
  const profilePhotoPath = employee.profile_photo || profileDocumentPath;
  const profilePhotoUrl = profilePhotoPath ? `${imgBaseUrl}/${profilePhotoPath}` : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-5">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation */}
        <div className="mb-5 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push(isSelfProfile ? "/hrms/dashboard" : "/hrms/employees")} className="rounded-lg">
            <ArrowLeft size={16} className="mr-2" /> Back to {isSelfProfile ? "Dashboard" : "Employees"}
          </Button>
          {!isSelfProfile && (
            <Button onClick={() => router.push(`/hrms/employees/edit?id=${id}`)} className="rounded-lg">
              Edit Profile
            </Button>
          )}
        </div>

        {/* Hero Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
          {/* Profile Content */}
          <div className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-xl bg-slate-100 p-1 border border-slate-200">
                <div className="w-full h-full rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center text-white text-2xl relative">
                  {profilePhotoUrl && !profilePhotoError ? (
                    <img
                      src={profilePhotoUrl}
                      alt={`${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Employee"}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        setProfilePhotoError(true);
                      }}
                    />
                  ) : null}
                  <span className={profilePhotoUrl && !profilePhotoError ? "hidden" : ""}>
                    {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                  </span>
                </div>
              </div>

              {/* Name & Quick Info */}
              <div className="flex-1 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="text-2xl text-slate-900">
                    {employee.first_name} {personal.middle_name ? personal.middle_name + ' ' : ''}{employee.last_name}
                  </h1>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs w-fit",
                    employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  )}>
                    {employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1)}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{employee.designation?.name || "No Designation"}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Hash size={14} /> {employee.employee_id}</span>
                  <span className="flex items-center gap-1.5"><Building size={14} /> {employee.department?.name || "-"}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {employee.branch?.name || "-"}</span>
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> Joined {employee.joining_date || "-"}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                { label: "Employment", value: employee.employment_type || "-", color: "bg-slate-100 text-slate-700" },
                { label: "Gender", value: employee.gender?.charAt(0).toUpperCase() + employee.gender?.slice(1) || "-", color: "bg-slate-100 text-slate-700" },
                { label: "Blood Group", value: employee.blood_group || personal.blood_group || "-", color: "bg-slate-100 text-slate-700" },
                { label: "Marital Status", value: (employee.marital_status || personal.martial_status)?.charAt(0).toUpperCase() + (employee.marital_status || personal.martial_status || "").slice(1) || "-", color: "bg-slate-100 text-slate-700" },
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-lg px-3 py-2.5", stat.color)}>
                  <p className="text-[11px] text-slate-500">{stat.label}</p>
                  <p className="text-sm text-slate-800 mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Contact Info */}
          <SectionCard title="Contact Information" icon={Phone}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Mail} label="Email" value={employee.email || employee.user?.email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone || employee.user?.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={employee.dob || employee.date_of_birth} />
              <InfoRow icon={Globe} label="Nationality" value={personal.nationality} />
            </div>
          </SectionCard>

          {/* Personal Details */}
          <SectionCard title="Personal Details" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <OptionalInfoRow icon={User} label="Father's Name" value={personal.father_name} />
              <OptionalInfoRow icon={User} label="Mother's Name" value={personal.mother_name} />
              <OptionalInfoRow icon={Heart} label="Spouse Name" value={personal.spouse_name} />
              <OptionalInfoRow icon={Calendar} label="Marriage Date" value={personal.marriage_date} />
              <OptionalInfoRow icon={BookOpen} label="Religion" value={personal.religion} />
              <OptionalInfoRow icon={BookOpen} label="Caste" value={personal.caste} />
              <OptionalInfoRow icon={Fingerprint} label="Identification Mark" value={personal.identification_mark} />
              <OptionalInfoRow
                icon={Shield}
                label="Physically Challenged"
                value={
                  hasValue(personal.physically_challenged)
                    ? personal.physically_challenged === "yes"
                      ? "Yes"
                      : "No"
                    : null
                }
              />
            </div>
          </SectionCard>

          {/* Present Address */}
          <SectionCard title="Present Address" icon={Home}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Home} label="Address" value={presentAddr.address_line_1} />
              <InfoRow icon={MapPin} label="Landmark" value={presentAddr.address_line_2} />
              <InfoRow icon={Building} label="City" value={presentAddr.city} />
              <InfoRow icon={MapPin} label="State" value={presentAddr.state} />
              <InfoRow icon={Globe} label="Country" value={presentAddr.country} />
              <InfoRow icon={Hash} label="Pincode" value={presentAddr.pincode} />
            </div>
          </SectionCard>

          {/* Permanent Address */}
          <SectionCard title="Permanent Address" icon={Home}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Home} label="Address" value={permanentAddr.address_line_1} />
              <InfoRow icon={MapPin} label="Landmark" value={permanentAddr.address_line_2} />
              <InfoRow icon={Building} label="City" value={permanentAddr.city} />
              <InfoRow icon={MapPin} label="State" value={permanentAddr.state} />
              <InfoRow icon={Globe} label="Country" value={permanentAddr.country} />
              <InfoRow icon={Hash} label="Pincode" value={permanentAddr.pincode} />
            </div>
          </SectionCard>

          {/* Bank & ID */}
          <SectionCard title="Identification" icon={Fingerprint}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={CreditCard} label="PAN Number" value={personal.pan_number || employee.pan_number} />
              <InfoRow icon={Fingerprint} label="Aadhaar Number" value={personal.aadhaar_number || employee.aadhar_number} />
              <InfoRow icon={Globe} label="Passport Number" value={personal.passport_number} />
            </div>
          </SectionCard>

          <SectionCard title="Bank Details" icon={CreditCard}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Building} label="Bank Name" value={bank.bank_name || employee.bank_name} />
              <InfoRow icon={User} label="Account Holder" value={bank.account_holder_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim()} />
              <InfoRow icon={Hash} label="Account Number" value={bank.account_number || employee.account_number} />
              <InfoRow icon={Hash} label="IFSC Code" value={bank.ifsc_code || employee.ifsc_code} />
              <OptionalInfoRow icon={MapPin} label="Branch" value={bank.branch_name} />
              <OptionalInfoRow icon={Hash} label="PF Number" value={bank.pf_number} />
              <OptionalInfoRow icon={Hash} label="ESI Number" value={bank.esi_number} />
            </div>
          </SectionCard>

          {leaveRows.length > 0 && (
            <SectionCard title="Leave Details" icon={Calendar}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {leaveRows.map((row) => (
                  <InfoRow
                    key={row.label}
                    icon={Calendar}
                    label={row.label}
                    value={row.value?.toString()}
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Documents Section - Full Width */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center">
                <FileText size={16} className="text-slate-600" />
              </div>
              <h3 className="text-slate-800">Documents</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {documents.length} files
            </span>
          </div>
          <div className="p-5">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 ">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: any, idx: number) => {
                  const filePath = doc.file_path || '';
                  const fullUrl = `${imgBaseUrl}/${filePath}`;
                  const docLabel = docTypeLabels[doc.document_type] || doc.document_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Document';
                  const ext = getFileExtension(filePath);
                  const imageFile = isImage(filePath);

                  return (
                    <div
                      key={doc.id || idx}
                      className="group border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors"
                    >
                      {/* Preview Area */}
                      <div className="h-36 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                        {imageFile ? (
                          <img
                            src={fullUrl}
                            alt={docLabel}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={cn(
                          "flex flex-col items-center gap-2",
                          imageFile && "hidden"
                        )}>
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm uppercase",
                            ext === 'pdf' ? 'bg-red-500' :
                            ext === 'doc' || ext === 'docx' ? 'bg-blue-500' :
                            'bg-slate-400'
                          )}>
                            {ext || '?'}
                          </div>
                        </div>
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <a
                            href={fullUrl}
                            download
                            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </div>

                      {/* Doc Info */}
                      <div className="p-4">
                        <p className="text-sm text-slate-800">{docLabel}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-slate-500 uppercase font-mono">.{ext}</span>
                          {doc.uploaded_at && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        {(personal.emergency_contact_name || personal.emergency_contact_phone) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
            <h3 className="text-slate-800 flex items-center gap-2 mb-3">
              <AlertCircle size={18} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Name</p>
                <p className="text-slate-800">{personal.emergency_contact_name || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Phone</p>
                <p className="text-slate-800">{personal.emergency_contact_phone || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Relation</p>
                <p className="text-slate-800">{personal.emergency_contact_relation || "-"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Calendar */}
        {employee.id && (
          <div className="w-full mb-8">
            <AttendanceCalendar
              employeeId={employee.id}
              joiningDate={employee.joining_date || employee.date_of_joining}
            />
          </div>
        )}
      </div>
    </div>
  );
}


