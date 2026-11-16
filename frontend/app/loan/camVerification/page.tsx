"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Banknote,
  ShieldCheck,
  ClipboardCheck,
  Phone,
  RotateCcw,
  Save,
  Check,
  Eye,
  FileText,
  History,
  TrendingDown,
  TrendingUp,
  Calendar,
  Info
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const statusMeta: any = {
  created: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Clock },
  credit_manager: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: ShieldCheck },
  branch_manager: { color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Building2 },
  approved: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
  rejected: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
  default: { color: "text-gray-600 bg-gray-50 border-gray-200", icon: AlertCircle },
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

const Section = ({
  title,
  icon: Icon,
  children,
  className = ""
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn("shadow-sm border-gray-100 rounded-xl overflow-hidden bg-white", className)}>
    <CardHeader className="py-3 px-5 border-b border-gray-50 flex flex-row items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <CardTitle className="text-[13px] font-medium text-gray-600 capitalize tracking-tight">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-5">{children}</CardContent>
  </Card>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 flex flex-col items-start w-full">
    <label className="text-[12px] font-medium text-gray-500 capitalize pl-0.5">
      {label}
    </label>
    {children}
  </div>
);

const ViewField = ({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium text-gray-400 capitalize">{label}</span>
    <span className={cn("text-[14px] font-medium", highlight ? "text-indigo-600 font-semibold" : "text-gray-700")}>{value || "—"}</span>
  </div>
);

export default function CAMVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const camId = searchParams.get("id");

  const [camData, setCamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>({
    title: "",
    message: "",
    onConfirm: () => { },
  });

  const [form, setForm] = useState({
    pd_checked: false,
    cam_checked: false,
    tvr_observation: "",
    deviation_if_any: "",
    deviation_type: "",
    deviation_approved_by: "",
    deviation_status: "pending",
    reason_for_rejected: "",
    credit_sanction_status: "pending", // ✅ updated name
    remarks: "",
    reason: ""
  });

  const [document, setDocument] = useState<File | null>(null);

  useEffect(() => {
    if (camId) fetchCAMDetails();
  }, [camId]);

  const fetchCAMDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${ProjectApiList.api_getCAMById}/${camId}`);
      if (res.data.success) {
        setCamData(res.data.data);
        setForm(prev => ({
          ...prev,
          remarks: res.data.data.remarks || "",
          credit_sanction: res.data.data.credit_decision || "pending"
        }));
      }
    } catch {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setConfirmConfig({
      title: "Save Progress?",
      message: "Do you want to save current entries as a draft?",
      onConfirm: () => {
        toast.info("Draft saved successfully");
        setShowConfirm(false);
      },
    });
    setShowConfirm(true);
  };

  const validateBeforeSubmit = () => {
    if (!form.pd_checked) {
      return "Please verify PD details.";
    }

    if (!form.cam_checked) {
      return "Please verify CAM details.";
    }

    if (!form.tvr_observation.trim()) {
      return "Please enter TVR observation.";
    }

    if (!form.credit_sanction_status || form.credit_sanction_status === "pending") {
      return "Please select sanction decision.";
    }

    if (form.credit_sanction_status === "rejected" && !form.reason_for_rejected.trim()) {
      return "Please enter reason for rejection.";
    }

    if (!form.remarks.trim()) {
      return "Please enter manager remarks.";
    }

    if (!form.deviation_approved_by.trim()) {
      return "Please enter approving authority name.";
    }

    // ✅ FILE VALIDATION START

    if (form.credit_sanction_status === "approved") {
      if (!document) {
        return "Please upload document for approved case.";
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(document.type)) {
        return "Only PDF, JPG, PNG files are allowed.";
      }

      const maxSize = 2 * 1024 * 1024; // 2MB

      if (document.size > maxSize) {
        return "File size must be less than or equal to 2 MB.";
      }
    }

    return "";
  };

  const handleSubmit = async () => {
    const error = validateBeforeSubmit();

    if (error) {
      toast.error(error);
      return;
    }

    setConfirmConfig({
      title: "Confirm Sanction?",
      message: `Finalizing with ${form.credit_sanction_status.toUpperCase()}`,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          setShowConfirm(false);

          const data = new FormData();

          // ✅ TEXT FIELDS
          data.append("pd_checked", String(form.pd_checked));
          data.append("cam_checked", String(form.cam_checked));
          data.append("tvr_observation", form.tvr_observation);
          data.append("deviation_if_any", form.deviation_if_any);
          data.append("deviation_type", form.deviation_type);
          data.append("deviation_approved_by", form.deviation_approved_by);
          data.append("deviation_status", form.deviation_status);
          data.append("reason_for_rejected", form.reason_for_rejected);
          data.append("credit_sanction_status", form.credit_sanction_status);
          data.append("remarks", form.remarks);
          data.append("reason", form.reason);

          data.append("is_verified", "true");

          // ✅ SINGLE FILE
          if (document) {
            data.append("cam_document", document);
          }
          const res = await axiosInstance.post(
            `${ProjectApiList.api_verifyCAM}/${camId}`,
            data,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (res.data.success) {
            toast.success("Verification completed");
            router.push("/loan/cam/camVerificationListing");
          }
        } catch (error: any) {
          // ✅ HANDLE VALIDATION ERRORS (IMPORTANT)
          const apiError = error.response?.data;

          if (apiError?.errors) {
            Object.values(apiError.errors).forEach((arr: any) => {
              arr.forEach((msg: string) => toast.error(msg));
            });
          } else {
            toast.error(apiError?.message || "Submission failed");
          }
        } finally {
          setSubmitting(false);
        }
      },
    });

    setShowConfirm(true);
  };

  const handleRevertToPD = async () => {
    setConfirmConfig({
      title: "Revert to Field?",
      message: "Send this case back to PD stage (Still Verified) for clarifications?",
      onConfirm: async () => {
        try {
          setSubmitting(true);
          setShowConfirm(false);
          const res = await axiosInstance.post(`${ProjectApiList.api_revertCAMToPD}/${camId}`, {
            reason: form.remarks || "Reverted by Credit Manager"
          });
          if (res.data.success) {
            toast.success("Case reverted to PD");
            router.push("/loan/cam/camVerificationListing");
          }
        } catch (error: any) {
          toast.error("Error reverting case");
        } finally {
          setSubmitting(false);
        }
      },
    });
    setShowConfirm(true);
  };

  const handleRevertToUnverifiedPD = async () => {
    setConfirmConfig({
      title: "Revert to Unverified PD?",
      message: "Send this case back to PD stage and mark PD as UNVERIFIED. Proceed?",
      onConfirm: async () => {
        try {
          setSubmitting(true);
          setShowConfirm(false);
          const res = await axiosInstance.post(`${ProjectApiList.api_revertCAMToUnverifiedPD}/${camId}`, {
            reason: form.remarks || "Reverted to Unverified PD by Credit Manager"
          });
          if (res.data.success) {
            toast.success("Case reverted and PD verification reset");
            router.push("/loan/cam/camVerificationListing");
          }
        } catch (error: any) {
          toast.error("Error resetting PD verification");
        } finally {
          setSubmitting(false);
        }
      },
    });
    setShowConfirm(true);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-400 font-medium text-sm capitalize tracking-tight">Loading appraisal interface...</div>;
  if (!camData) return <div className="p-20 text-center text-red-500 font-medium text-sm capitalize tracking-tight">Record not found</div>;

  return (
    <div className="p-6 bg-[#fcfcfd] min-h-screen space-y-6 max-w-7xl mx-auto">

      {/* CLEAN HEADER BAR */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-30 transition-all border-t-2 border-t-indigo-500">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 tracking-tight leading-none capitalize">Credit Sanction Verification</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-gray-400 font-medium capitalize">Application ID: {camData.cam_unique_id}</span>
              <div className="w-1 h-1 bg-gray-200 rounded-full" />
              <span className="text-[11px] text-amber-600 font-medium capitalize">Credit Manager Review</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-500 hover:bg-gray-50 flex items-center gap-2 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Back
          </button>
          {/* <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 rounded-lg text-[12px] font-medium text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 capitalize"
            >
                <Check className="w-4 h-4" /> Final Submission
            </button> */}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Section title="Member Information" icon={User} className="border-t-2 border-t-blue-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[11px] font-medium text-gray-400 capitalize">Member Name</span>
                <p className="text-[14px] font-semibold text-gray-700">{camData.customer?.first_name} {camData.customer?.last_name}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 capitalize">Entry Date</span>
                <p className="text-[14px] font-semibold text-gray-700">{formatDate(camData.created_at)}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 capitalize">PD Date</span>
                <p className="text-[14px] font-semibold text-gray-700">{camData.pd_information?.pd_date ? new Date(camData.pd_information.pd_date).toLocaleDateString() : "Pending"}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 capitalize">Credit amount</span>
                <p className="text-[14px] font-bold text-indigo-600">₹{camData.loan_application?.credit_applied_for}</p>
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
              {/* PD SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="pd_checked"
                      checked={form.pd_checked}
                      onChange={(e) => {
                        setForm({ ...form, pd_checked: e.target.checked });
                        if (e.target.checked) toast.success("PD marked as checked");
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="pd_checked" className="text-[14px] font-semibold text-gray-800 cursor-pointer select-none">
                      PD Information details
                    </label>
                  </div>
                  <button
                    onClick={handleSaveDraft}
                    className="text-[12px] font-medium text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-tight">PD Date</span>
                    <p className="text-[13px] font-medium text-gray-700">{camData.pd_information?.pd_date ? new Date(camData.pd_information.pd_date).toLocaleDateString() : "Pending"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-tight">Executive Name</span>
                    <p className="text-[13px] font-medium text-gray-700">{camData.pd_information?.executive_name || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-tight">PD Remarks</span>
                    <p className="text-[13px] font-normal text-gray-600 line-clamp-2">{camData.pd_information?.pd_remarks || "No remarks available."}</p>
                  </div>
                </div>
              </div>

              {/* CAM SECTION */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="cam_checked"
                      checked={form.cam_checked}
                      onChange={(e) => {
                        setForm({ ...form, cam_checked: e.target.checked });
                        if (e.target.checked) toast.success("CAM marked as checked");
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="cam_checked" className="text-[14px] font-semibold text-gray-800 cursor-pointer select-none">
                      CAM Details
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleRevertToPD}
                      className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-all border border-rose-100"
                    >
                      Revert
                    </button>
                    <button
                      onClick={handleSaveDraft}
                      className="text-[12px] font-medium text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-50">
                  <div>
                    <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-tight">Appraisal Amount</span>
                    <p className="text-[14px] font-bold text-indigo-600">₹{camData.loan_application?.credit_applied_for}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-tight">Score</span>
                    <p className="text-[14px] font-bold text-gray-800">{camData.credit_score || "750"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-tight">Status</span>
                    <p className="text-[13px] font-medium text-gray-600 capitalize">{camData.status || "In Review"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Section title="Telephonic Verification (TVR)" icon={Phone}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-[13px] font-medium text-gray-600">{camData.customer?.contact_number_1}</span>
                    <a
                      href={`tel:${camData.customer?.contact_number_1}`}
                      className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1 hover:underline"
                    >
                      <Phone size={12} /> Call Member
                    </a>
                  </div>
                  <FormField label="Verification Observation">
                    <textarea
                      value={form.tvr_observation}
                      onChange={(e) => setForm({ ...form, tvr_observation: e.target.value })}
                      placeholder="Enter call notes..."
                      className="w-full min-h-[80px] border border-gray-200 rounded-lg p-3 text-[13px] font-normal focus:border-indigo-400 outline-none transition-all"
                    />
                  </FormField>
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DECISION PANEL */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <Section title="Sanction Decision" icon={CheckCircle2} className="h-full border-t-4 border-t-indigo-500 bg-white">
            <div className="space-y-6">
              <FormField label="Actionable status">
                <div className="flex gap-3 w-full">
                  {["approved", "rejected"].map(status => (
                    <label key={status} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all cursor-pointer text-[12px] font-medium capitalize",
                      form.credit_sanction_status === status
                        ? (status === 'approved' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-rose-50 border-rose-500 text-rose-700')
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                    )}>
                      <input type="radio" value={status} checked={form.credit_sanction_status === status} onChange={(e) => setForm({ ...form, credit_sanction_status: e.target.value })} className="hidden" />
                      {status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {status}
                    </label>
                  ))}
                </div>
              </FormField>

              {form.credit_sanction_status === 'rejected' && (
                <FormField label="Reason for rejection">
                  <textarea
                    value={form.reason_for_rejected}
                    onChange={(e) => setForm({ ...form, reason_for_rejected: e.target.value })}
                    className="w-full bg-white border border-rose-200 rounded-lg p-3 text-[13px] text-gray-700 h-24 outline-none focus:border-rose-500"
                    placeholder="..."
                  />
                </FormField>
              )}

              <FormField label="Manager Final Remarks">
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg p-3 text-[13px] text-gray-700 h-32 focus:border-indigo-400 outline-none transition-all"
                  placeholder="Add your final appraisal summary..."
                />
              </FormField>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <FormField label="Approving Authority">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium outline-none focus:border-indigo-500 transition-all font-mono"
                    value={form.deviation_approved_by}
                    onChange={(e) => setForm({ ...form, deviation_approved_by: e.target.value })}
                  />
                </FormField>

                <FormField label="Deviation Type">
                  <input
                    type="text"
                    placeholder="Enter deviation type"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium outline-none focus:border-indigo-500 transition-all font-mono"
                    value={form.deviation_type}
                    onChange={(e) => setForm({ ...form, deviation_type: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Upload Document">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (!file) {
                      setDocument(null);
                      return;
                    }

                    const maxSize = 2 * 1024 * 1024;

                    if (file.size > maxSize) {
                      toast.error(
                        "File size must be less than or equal to 2 MB."
                      );

                      e.target.value = "";
                      setDocument(null);

                      return;
                    }

                    setDocument(file);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
                />
              </FormField>

              {/* <FormField label="Upload Verification Document">
                <input
                  type="file"
                  onChange={(e) =>
                    setFiles({ ...files, verification_document: e.target.files?.[0] || null })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Upload Additional Document">
                <input
                  type="file"
                  onChange={(e) =>
                    setFiles({ ...files, additional_document: e.target.files?.[0] || null })
                  }
                  className="input"
                />
              </FormField> */}
            </div>
          </Section>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap justify-between items-center shadow-sm">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[12px] font-medium text-gray-400 capitalize">Secure Review Protocol Active</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* <button onClick={handleSaveDraft} className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-600 transition-all capitalize">
            Save Progress
          </button> */}
          {/* <button onClick={() => setShowPreview(true)} className="px-5 py-2.5 bg-white border border-amber-200 text-amber-600 rounded-lg text-[12px] font-medium hover:bg-amber-50 transition-all flex items-center gap-2 capitalize">
            <Eye size={16} /> Preview Data
          </button> */}
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg text-[12px] font-medium hover:bg-indigo-700 transition-all shadow-md capitalize"
          >
            Confirm Sanction
          </button>
        </div>
      </div>

      {/* CLEAN PREVIEW DIALOG */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl bg-white p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start border-b border-gray-50 pb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight capitalize">Submission Review</h2>
                <p className="text-[12px] text-gray-400 mt-1 font-medium capitalize">Please verify the details below before finalization</p>
              </div>
              <div className={cn("px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider", form.credit_sanction_status === 'approved' ? "bg-emerald-100 text-emerald-700" : (form.credit_sanction_status === 'rejected' ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"))}>
                Decision: {form.credit_sanction_status || "None"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[11px] font-medium text-gray-400 capitalize">Member Name</span>
                <p className="text-[14px] font-semibold text-gray-700">{camData.customer?.first_name} {camData.customer?.last_name}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-1">
                <span className="text-[11px] font-medium text-indigo-400 capitalize">sanctioned amount</span>
                <p className="text-lg font-bold text-indigo-600">₹{camData.loan_application?.credit_applied_for}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[12px] font-medium text-gray-600 capitalize">PD Verification</span>
                  {form.pd_checked ? <CheckCircle2 className="text-emerald-500" size={16} /> : <Clock className="text-gray-300" size={16} />}
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[12px] font-medium text-gray-600 capitalize">CAM Verification</span>
                  {form.cam_checked ? <CheckCircle2 className="text-emerald-500" size={16} /> : <Clock className="text-gray-300" size={16} />}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 min-h-[80px]">
                <span className="text-[11px] font-medium text-gray-400 capitalize">Manager Remarks</span>
                <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
                  {form.remarks || "No additional appraisal remarks recorded."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[12px] font-medium hover:bg-gray-50 transition-all capitalize"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const error = validateBeforeSubmit();

                  if (error) {
                    toast.error(error);
                    return;
                  }

                  setShowPreview(false);
                  handleSubmit();
                }}
                className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-medium hover:bg-indigo-700 transition-all shadow-md capitalize"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={showConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setShowConfirm(false)}
        confirmText={submitting ? "Processing..." : "Confirm"}
      />

    </div>
  );
}
