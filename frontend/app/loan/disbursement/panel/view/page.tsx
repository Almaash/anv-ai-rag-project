"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  User,
  FileText,
} from "lucide-react";

function DisbursementViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [disbursement, setDisbursement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<any>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [formData, setFormData] = useState({
    booking_date: "",
    date_of_disbursement: "",
  });
  const [updating, setUpdating] = useState(false);


  const getRole = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user)?.role : null;
  };

  const isCustomer = getRole() === "customer";

  const handleOpenEdit = () => {
    setFormData({
      booking_date: disbursement.booking_date || "",
      date_of_disbursement: disbursement.date_of_disbursement || "",
    });
    setOpenEditModal(true);
  };

  const handleUpdateDates = async () => {
    try {
      setUpdating(true);

      const res = await axiosInstance.post(
        `${ProjectApiList.UPDATE_DISBURSEMENTS_ID}/${id}`,
        formData
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setDisbursement(res.data.data);
        setOpenEditModal(false);
      }
    } catch (err) {
      toast.error("Failed to update dates");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchDisbursement = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          `${ProjectApiList.GET_ALL_DISBURSEMENTS_ID}/${id}`
        );
        if (res.data.success) {
          const disb = res.data.data;
          setDisbursement(disb);

          // If investor linked, fetch their investment details
          if (disb?.investor_unique_id) {
            try {
              const invRes = await axiosInstance.post(
                ProjectApiList.GET_INVESTOR_INVESTMENT_BY_ID,
                { id: disb.investor_unique_id }
              );
              if (invRes.data.success) {
                // Backend returns { success: true, data: { investment: ... } }
                setInvestor(invRes.data.data?.investment || invRes.data.data);
              }
            } catch (error: unknown) {
              const backendMessage =
                typeof error === "object" &&
                  error !== null &&
                  "response" in error &&
                  typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
                  ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to load investor details";
              toast.error(backendMessage);
            }
          }
        }
      } catch (error) {
        toast.error("Failed to load disbursement details");
      } finally {
        setLoading(false);
      }
    };

    fetchDisbursement();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (!disbursement) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Disbursement record not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const getDocUrl = (path: string) => `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}`;

  const hasDocuments =
    disbursement?.dfa_document ||
    disbursement?.cfa_document ||
    disbursement?.dpn_document ||
    disbursement?.vernacular_document;

  const isBookingDatePassed = (() => {
    if (!disbursement?.booking_date) return false;

    const booking = new Date(disbursement.booking_date);
    const today = new Date();

    booking.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return booking < today;
  })();

  const showPaymentDetails =
    disbursement?.payment_date &&
    disbursement?.payment_status === "NEFT_done";


  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Disbursement Details
          </h1>
          <p className="text-sm text-gray-500">
            ID: {disbursement.disbursement_id}
          </p>
        </div>

        <div className="ml-auto">
          <span
            className={`px-4 py-1 rounded-full text-sm font-semibold border ${disbursement.is_disbursed === 1
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
          >
            {disbursement.is_disbursed === 1 ? "Disbursed" : "Pending"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <User className="h-5 w-5 text-blue-500" />
            General Information
          </h3>

          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <span className="text-gray-500">Loan App ID</span>
            <span className="font-medium">
              {disbursement.loan_application_id}
            </span>

            <span className="text-gray-500">Customer ID</span>
            <span className="font-medium">
              {disbursement.customer_unique_id}
            </span>

            <span className="text-gray-500">Branch</span>
            <span className="font-medium">
              {disbursement.branch_id || "-"}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Timeline
            </h3>

            {!hasDocuments && !isCustomer && (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <span className="text-gray-500">Booking Date</span>
            <div className="flex flex-col">
              <span className="font-medium">
                {disbursement.booking_date || "-"}
              </span>

              {isBookingDatePassed && !hasDocuments && (
                <span className="text-xs text-red-600 font-semibold">
                  ⚠ Booking date has passed
                </span>
              )}
            </div>

            {/* <span className="text-gray-500">Disbursement Date</span>
            <span className="font-medium">
              {disbursement.date_of_disbursement || "-"}
            </span> */}

            {showPaymentDetails && (
              <>
                <span className="text-gray-500">Payment Date</span>
                <span className="font-medium text-green-700">
                  {disbursement.payment_date}
                </span>

                <span className="text-gray-500">Payment Status</span>
                <span className="font-medium text-green-600 uppercase">
                  {disbursement.payment_status}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Documents */}
        {(disbursement.dfa_document ||
          disbursement.cfa_document ||
          disbursement.dpn_document ||
          disbursement.vernacular_document) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
                <FileText className="h-5 w-5 text-purple-500" />
                Uploaded Documents
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Disbursement Image", key: "disbursement_video" },
                  { label: "DFA", key: "dfa_document" },
                  { label: "CFA", key: "cfa_document" },
                  { label: "DPN", key: "dpn_document" },
                  { label: "Vernacular", key: "vernacular_document" },
                ].map((doc) => {
                  const fileUrl = disbursement[doc.key]
                    ? getDocUrl(disbursement[doc.key])
                    : null;

                  return (
                    <div
                      key={doc.key}
                      className="group p-4 border rounded-2xl flex flex-col items-center gap-3 bg-white shadow-sm hover:shadow-md transition"
                    >
                      <span className="text-xs text-gray-500 font-medium">
                        {doc.label}
                      </span>

                      {fileUrl ? (
                        <>
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                            <div className="w-full h-28 border rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer">
                              {/\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl) ? (
                                <img
                                  src={fileUrl}
                                  className="object-contain h-full w-full group-hover:scale-105 transition"
                                />
                              ) : /\.pdf$/i.test(fileUrl) ? (
                                <div className="flex flex-col items-center text-red-500">
                                  <FileText className="h-10 w-10" />
                                  <span className="text-xs mt-1">PDF</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Unsupported</span>
                              )}
                            </div>
                          </a>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          Not Uploaded
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Investor Details */}
        {disbursement.investor_unique_id && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
              <User className="h-5 w-5 text-blue-500" />
              Investor Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 text-sm">

              <div>
                <p className="text-gray-500 text-xs mb-1">Investor Name</p>
                <p className="font-medium">
                  {investor?.investor
                    ? `${investor.investor.first_name} ${investor.investor.last_name}`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Investor ID</p>
                <p className="font-medium">{disbursement.investor_unique_id}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Mobile</p>
                <p className="font-medium">{investor?.investor?.mobile || investor?.investor?.contact_number || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Pool</p>
                <p className="font-medium">{investor?.pool?.name || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Investor Type</p>
                <p className="font-medium">{investor?.investor_type?.name || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Investment Amount</p>
                <p className="font-medium">
                  {investor?.amount
                    ? `₹${Number(investor.amount).toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Investment Date</p>
                <p className="font-medium">
                  {investor?.date
                    ? new Date(investor.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Disbursement ID</p>
                <p className="font-medium font-mono text-blue-700 text-xs">{disbursement.disbursement_id}</p>
              </div>

            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Close View
          </button>
        </div>
      </div>

      {/* MODAL */}
      {openEditModal && (
        <div className="fixed inset-0 z-50 flex items-center  justify-center bg-black/40">

          <div className="w-full max-w-lg bg-white shadow-xl border rounded-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-2xl">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Disbursement Dates
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update booking date
                </p>
              </div>

              <button
                onClick={() => setOpenEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">

              {/* Booking Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Booking Date
                </label>

                <input
                  type="date"
                  value={formData.booking_date}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (!value) return;

                    const selectedDate = new Date(value);
                    const day = selectedDate.getDay();

                    // ❌ Block Sunday
                    if (day === 0) {
                      toast.error("Sundays are not allowed. Please select another date.");
                      return;
                    }

                    // ✅ Allow valid date
                    setFormData({
                      booking_date: value,
                      date_of_disbursement: value,
                    });
                  }}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>



            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">

              <button
                onClick={() => setOpenEditModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateDates}
                disabled={updating}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DisbursementViewPage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <DisbursementViewContent />
    </Suspense>
  );
}