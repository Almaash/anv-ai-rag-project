"use client";

import axiosInstance from "@/app/api/axiosInstance";
// import ProjectApiList from "@/app/api/ProjectApiLists";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProjectApiList from "@/app/api/ProjectApiList";

/* ============================
   DATE FORMATTER
============================ */
const formatDate = (date?: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LoanApplicationDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const [openModal, setOpenModal] = useState(false);
  const [status, setStatus] = useState("pending");
  const [reason, setReason] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  /* ============================
     LOAD USER
  ============================ */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUserData(JSON.parse(stored));
    } catch { }
  }, []);

  /* ============================
     LOAD APPLICATION
  ============================ */
  useEffect(() => {
    if (!id) return;

    axiosInstance
      .get(`${ProjectApiList.api_getLoanApplicationById}/${id}`)
      .then((res) => {
        setApplication(res.data.data);
        setStatus(res.data.data.application_status || "pending");
      });
  }, [id]);

  if (!application) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-transparent rounded-full mx-auto mb-3" />
        Loading application details...
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    under_review: "bg-blue-100 text-blue-700",
    back_for_revision: "bg-orange-100 text-orange-700",
  };

  const statusMeta: Record<string, { label: string; color: string }> = {
    pending: {
      label: "Under Verification",
      color: "bg-yellow-100 text-yellow-700",
    },
    under_review: {
      label: "Under Review",
      color: "bg-blue-100 text-blue-700",
    },
    back_for_revision: {
      label: "Returned for Modification",
      color: "bg-orange-100 text-orange-700",
    },
    approved: {
      label: "Approved – Ready for Loan Processing",
      color: "bg-green-100 text-green-700",
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-100 text-red-700",
    },
  };


  const canEdit =
    // (userData?.role === "loan_admin" || userData?.role === "user") &&
    ["pending", "back_for_revision"].includes(application.application_status);

  /* ============================
     UPDATE STATUS
  ============================ */
  const updateStatus = async () => {
    if (status === "rejected" && !reason.trim())
      return toast.error("Rejection reason is required");

    if (status === "back_for_revision" && !revisionReason.trim())
      return toast.error("Revision reason is required");

    try {
      setLoading(true);

      const payload: any = { status };
      if (status === "rejected") payload.rejection_reason = reason;
      if (status === "back_for_revision")
        payload.revision_reason = revisionReason;

      await axiosInstance.post(
        `${ProjectApiList.api_updatedLoanApplicationStatusById}/${id}`,
        payload
      );

      toast.success("Status updated");

      setApplication({
        ...application,
        application_status: status,
        rejection_reason: status === "rejected" ? reason : null,
        revision_reason:
          status === "back_for_revision" ? revisionReason : null,
      });

      setOpenModal(false);
      setReason("");
      setRevisionReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const sendToAdmin = async () => {
    try {
      setLoading(true);
      await axiosInstance.post(
        `${ProjectApiList.api_updatedLoanApplicationStatusById}/${id}`,
        { status: "pending" }
      );

      toast.success("Application sent to admin");
      router.push("/loan/loanApplications");

      setApplication({
        ...application,
        application_status: "pending",
        revision_reason: null,
      });
    } catch {
      toast.error("Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10 min-h-screen ">
      {/* HEADER */}
      <div className="flex justify-between items-start bg-white rounded-2xl shadow-sm px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Loan Application – {application.loan_application_id}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review submitted loan application
          </p>
        </div>

        <div className="flex gap-3">
          {/* {canEdit && (
            <button
              onClick={() =>
                router.push(
                  `/loan/loanApplications/edit?id=${application.loan_application_id}`
                )
              }
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
            >
              ✏️ Edit
            </button>
          )} */}

          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs cursor-pointer"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">
          {/* APPLICATION INFO */}
          <Card title="Application Information">
            <StatusBadge
              status={application.application_status}
              colors={statusColors}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-5">
              <Info label="Loan Amount" value={`₹${application.loan_amount}`} />
              <Info
                label="Interest Rate"
                value={`${application.interest_rate}%`}
              />
              <Info
                label="Tenure"
                value={`${application.loan_tenure_months} months`}
              />
              <Info
                label="Monthly Income"
                value={`₹${application.monthly_income}`}
              />
              <Info
                label="Employment Type"
                value={application.employment_type}
              />
              <Info label="Company" value={application.company_name} />
              <Info
                label="Work Experience"
                value={`${application.work_experience_years} years`}
              />
              <Info label="Purpose" value={application.loan_purpose} />
              <Info
                label="Existing Loans"
                value={application.existing_loans}
              />
              <Info
                label="Collateral"
                value={application.collateral_details}
              />
            </div>
          </Card>

          {/* APPLICANT */}
          <Card title="Applicant Details">
            <div className="grid grid-cols-2 gap-5">
              <Info label="Name" value={application.customer?.name} />
              <Info label="Email" value={application.customer?.email} />
              <Info label="Phone" value={application.customer?.phone_no} />
              <Info label="Customer ID" value={application.customer?.customer_unique_id} />
            </div>
          </Card>

          {/* DOCUMENTS */}
          <Card title="Uploaded Documents">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                "salary_slip_document",
                "bank_statement_document",
                "identity_proof_document",
                "address_proof_document",
                "other_document_1",
                "other_document_2",
              ].map((field) => {
                const filePath = application[field];
                if (!filePath) return null;

                const fileUrl = `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${filePath}`;
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(filePath);

                return (
                  <div
                    key={field}
                    className="bg-gray-100 rounded-xl p-4 text-center"
                  >
                    <p className="text-xs font-medium mb-2 capitalize">
                      {field.replaceAll("_", " ")}
                    </p>

                    {isImage ? (
                      <img
                        src={fileUrl}
                        onClick={() => window.open(fileUrl)}
                        className="h-24 w-24 mx-auto object-cover rounded-lg cursor-pointer"
                      />
                    ) : (
                      <button
                        onClick={() => window.open(fileUrl)}
                        className="text-blue-600 text-sm"
                      >
                        View PDF
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT – TIMELINE */}
        <div>
          <Card title="Application Timeline">
            <Info
              label="Applied On"
              value={formatDate(application.created_at)}
            />

            {application.status_history?.length > 0 && (
              <div className="relative mt-6 space-y-6 border-l border-gray-200 pl-6">
                {application.status_history.map((item: any, idx: number) => {
                  const meta = statusMeta[item.status];

                  return (
                    <div key={idx} className="relative">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 border-white shadow
              ${meta.color.replace("text-", "bg-")}`}
                      />

                      {/* Card */}
                      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${meta.color}`}
                          >
                            {meta.label}
                          </span>

                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString("en-GB")}
                        </span>

                        {/* Reason */}
                        {item.reason && (
                          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-xs text-gray-500 font-medium">
                              Admin Note
                            </p>
                            <p className="text-sm text-gray-700">
                              {item.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </Card>

          <div className="flex justify-end gap-3 mt-5">
            {/* {
              application.application_status === "back_for_revision" && (
                <button
                  onClick={() => setShowSendConfirm(true)}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl w-[99%] cursor-pointer "
                >
                  Send to Admin
                </button>
              )} */}

            {
              !["approved", "rejected"].includes(application.application_status) && (
                <button
                  onClick={() => setOpenModal(true)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-[99%] cursor-pointer"
                >
                  Update Status
                </button>
              )}


          </div>
        </div>

      </div>

      {/* ACTIONS */}


      {/* MODALS – UNCHANGED */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-999">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900">
              Update Application Status
            </h3>

            {/* STATUS SELECT */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="back_for_revision">Back for Revision</option>
            </select>

            {/* REJECTION REASON */}
            {status === "rejected" && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter rejection reason"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[90px]"
              />
            )}

            {/* REVISION REASON */}
            {status === "back_for_revision" && (
              <textarea
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Enter revision reason"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[90px]"
              />
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={updateStatus}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-999">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Send Application to Admin?
            </h3>

            <p className="text-sm text-gray-600">
              This will submit your revised application for admin review.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  sendToAdmin();
                  setShowSendConfirm(false);
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ============================
   REUSABLE COMPONENTS
============================ */

function Card({
  title,
  children,
  sticky,
}: {
  title: string;
  children: any;
  sticky?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-6 ${sticky ? "sticky top-6" : ""
        }`}
    >
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="h-px bg-gray-100 my-4" />
      {children}
    </div>
  );
}

function StatusBadge({ status, colors }: any) {
  return (
    <span
      className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function Info({ label, value, danger }: any) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className={`text-xs ${danger ? "text-red-500" : "text-gray-500"}`}>
        {label}
      </p>
      <p
        className={`text-sm font-semibold ${danger ? "text-red-600" : "text-gray-900"
          }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
