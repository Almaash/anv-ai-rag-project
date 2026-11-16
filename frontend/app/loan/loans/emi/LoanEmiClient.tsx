"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
export default function LoanEmiPage() {
  const params = useSearchParams();
  const router = useRouter();
  const loanId = params.get("id");

  const [emiList, setEmiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= AUTH ================= */

  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setAuthUser(JSON.parse(storedUser));
  }, []);

  const role = authUser?.role;
  const isBranchManager = role === "Branch Manager";
  const isCustomer = role === "Field Executive" || role === "customer";

  /* ================= PAY MODAL ================= */

  const [openPayModal, setOpenPayModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  const [paymentImage, setPaymentImage] = useState<File | null>(null);

  const [paymentData, setPaymentData] = useState({
    payment_amount: "",
    payment_method: "online",
    transaction_id: "",
  });

  /* ================= VIEW MODAL ================= */

  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewPayments, setViewPayments] = useState<any[]>([]);
  const [loadingView, setLoadingView] = useState(false);

  /* ================= PRE-CLOSE ================= */
  const [openPreCloseModal, setOpenPreCloseModal] = useState(false);
  const [preClosing, setPreClosing] = useState(false);
  const [preCloseData, setPreCloseData] = useState({
    payment_method: "cash",
    transaction_id: "",
  });
  const [preCloseImage, setPreCloseImage] = useState<File | null>(null);

  // Top pending EMI = first EMI that is not paid/pending_at_admin/closed
  const topPendingEmi = emiList.find(
    (e) => !["paid", "pending_at_admin", "closed", "pre_closed"].includes(e.status)
  );

  const preCloseBase = topPendingEmi
    ? Number(topPendingEmi.emi_amount) + Number(topPendingEmi.outstanding_balance)
    : 0;
  const preClosePenalty = Math.round(preCloseBase * 0.02 * 100) / 100;
  const preCloseTotal = Math.round((preCloseBase + preClosePenalty) * 100) / 100;

  const handlePreClose = async () => {
    const toastId = toast.loading("Submitting pre-close request...");
    try {
      setPreClosing(true);

      if (preCloseImage && preCloseImage.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB", { id: toastId });
        return;
      }

      const formData = new FormData();
      formData.append("loan_id", loanId || "");
      formData.append("payment_method", preCloseData.payment_method);
      if (preCloseData.transaction_id)
        formData.append("transaction_id", preCloseData.transaction_id);
      if (preCloseImage)
        formData.append("payment_image", preCloseImage);

      const res = await axiosInstance.post(
        ProjectApiList.api_loanPreClose,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res?.data?.success) {
        toast.success("Pre-close request submitted", { id: toastId });
        setOpenPreCloseModal(false);
        setPreCloseImage(null);
        setPreCloseData({ payment_method: "cash", transaction_id: "" });
        fetchEmiList();
      } else {
        toast.error(res?.data?.message || "Pre-close failed", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Pre-close failed", { id: toastId });
    } finally {
      setPreClosing(false);
    }
  };

  /* ================= REVERT ================= */
  const [openRevertModal, setOpenRevertModal] = useState(false);
  const [revertTarget, setRevertTarget] = useState<any>(null);
  const [reverting, setReverting] = useState(false);

  /* ================= FETCH EMI ================= */

  const fetchEmiList = async () => {
    if (!loanId) return;

    try {
      setLoading(true);

      const res = await axiosInstance.get(`${ProjectApiList.api_getEMIShedules}/${loanId}`);
      // console.log("EMI Schedule API response:", res?.data?.data);
      const data = res?.data?.data?.emi_schedule || [];

      const formatted = data
        .sort((a: any, b: any) => Number(a.installment_no) - Number(b.installment_no))
        .map((emi: any) => ({
          id: emi.id,
          emi_id: emi.emi_id,
          due_date: emi.installment_date,
          emi_amount: Number(emi.installment_amount),
          paid_amount: 0, // until payment API added
          status: emi.status,
          principal_due: Number(emi.principal_due),
          interest_due: Number(emi.interest_due),
          outstanding_balance: Number(emi.outstanding_balance),
        }));

      setEmiList(formatted);

    } catch (error) {
      console.error("Failed to fetch EMI schedule", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId) {
      fetchEmiList();
    }
  }, [loanId]);

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  /* ================= PAY EMI ================= */

  const handleMakePayment = async () => {
    if (!selectedEmi) return;

    // 🔴 Require payment proof
    if (!paymentImage) {
      toast.error("Payment proof is required");
      return;
    }

    const toastId = toast.loading("Processing payment...");

    try {
      setPaying(true);

      const formData = new FormData();

      formData.append("loan_id", loanId || "");
      formData.append("emi_schedule_id", selectedEmi.emi_id);
      formData.append("payment_amount", paymentData.payment_amount);
      formData.append("payment_method", paymentData.payment_method);

      if (paymentData.transaction_id) {
        formData.append("transaction_id", paymentData.transaction_id);
      }

      if (paymentImage) {
        formData.append("payment_image", paymentImage);
      }

      const res = await axiosInstance.post(
        ProjectApiList.api_makeEmiPayment,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res?.data?.success) {

        setEmiList((prev) =>
          prev.map((emi) =>
            emi.emi_id === selectedEmi.emi_id
              ? { ...emi, status: "pending_at_admin" }
              : emi
          )
        );

        setOpenPayModal(false);
        setSelectedEmi(null);
        setPaymentImage(null);

        toast.success("Payment submitted successfully", { id: toastId });
      }

    } catch (error: any) {
      console.error("Payment failed", error);

      toast.error(
        error?.response?.data?.message || "Payment failed",
        { id: toastId }
      );

    } finally {
      setPaying(false);
    }
  };

  /* ================= VIEW PAYMENTS ================= */
  const openViewPayments = async (emiId: string) => {
    try {
      setOpenViewModal(true);
      setLoadingView(true);

      const res = await axiosInstance.get(
        `${ProjectApiList.api_getEmiPaymentById}/${emiId}`
      );

      const data = res?.data?.data;

      // handle both object and array responses
      if (Array.isArray(data)) {
        setViewPayments(data);
      } else if (data) {
        setViewPayments([data]);
      } else {
        setViewPayments([]);
      }

    } catch (error) {
      console.error("Failed to fetch payment details", error);
      toast.error("Failed to load payment details");
    } finally {
      setLoadingView(false);
    }
  };

  /* ================= OPEN PAY MODAL ================= */

  const openPayModalForEmi = (emi: any) => {
    const remaining =
      Number(emi.emi_amount) - Number(emi.paid_amount || 0);

    setSelectedEmi(emi);

    setPaymentData({
      payment_amount: String(remaining),
      payment_method: "online",
      transaction_id: "",
    });

    setPaymentImage(null);
    setOpenPayModal(true);
  };

  /* ================= STATUS BADGE ================= */

  const statusBadge = (status: string) => {
    const map: any = {
      paid: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      overdue: "bg-red-100 text-red-700",
      partial: "bg-orange-100 text-orange-700",
      pending_at_admin: "bg-blue-100 text-blue-700",
      closed: "bg-gray-100 text-gray-500",
      pre_closed: "bg-purple-100 text-purple-700",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"
          }`}
      >
        {status === "pending_at_admin"
          ? "Under Verification"
          : status === "pre_closed"
          ? "Pre Closed"
          : status.replaceAll("_", " ")}
      </span>
    );
  };


  const isPreCloseFormValid =
    preCloseData.payment_method === "cash"
      ? true
      : preCloseData.transaction_id.trim() !== "" && preCloseImage !== null;

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* HEADER */}

        <div className="flex justify-between items-start">
          <div>

            <h1 className="text-2xl font-bold text-gray-900">
              EMI Schedule
            </h1>
            <p className="text-sm text-gray-500">
              Loan ID: {loanId}
            </p>
          </div>

          <div className="flex gap-3 items-start">
            {isCustomer && topPendingEmi && (
              <button
                onClick={() => setOpenPreCloseModal(true)}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Pre-Close Loan
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-100"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* TABLE */}

        <div className="bg-white rounded-xl shadow-sm">

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Loading EMI schedule…
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-[13px]">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">EMI ID</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-left">Principal</th>
                    <th className="px-4 py-3 text-left">Interest</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Balance</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>

                <tbody>

                  {emiList.map((emi, i) => {

                    const showPayButton =
                      isCustomer &&
                      ["pending", "overdue", "partial"].includes(emi.status);

                    const showViewButton = emi.status === "paid" || emi.status === "pre_closed";
                    const showRevertButton =
                      emi.status === "paid" && isBranchManager;

                    return (
                      <tr
                        key={emi.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >

                        <td className="px-4 py-3">{i + 1}</td>

                        <td className="px-4 py-3 font-medium">
                          {emi.emi_id}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(emi.due_date)}
                        </td>

                        <td className="px-4 py-3">
                          ₹{emi.principal_due}
                        </td>

                        <td className="px-4 py-3">
                          ₹{emi.interest_due}
                        </td>

                        <td className="px-4 py-3">
                          ₹{emi.emi_amount}
                        </td>

                        <td className="px-4 py-3">
                          ₹{emi.outstanding_balance}
                        </td>

                        <td className="px-4 py-3">
                          {statusBadge(emi.status)}
                        </td>

                        <td className="px-4 py-3">

                          {showViewButton && (
                            <button
                              onClick={() => openViewPayments(emi.emi_id)}
                              className="text-blue-600 hover:underline mr-3"
                            >
                              View
                            </button>
                          )}

                          {showRevertButton && (
                            <button
                              onClick={() => {
                                setRevertTarget(emi);
                                setOpenRevertModal(true);
                              }}
                              className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                              Revert
                            </button>
                          )}

                          {showPayButton && (
                            <button
                              onClick={() => openPayModalForEmi(emi)}
                              className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Pay EMI
                            </button>
                          )}

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {openPayModal && selectedEmi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

            <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 space-y-4">

              <h2 className="text-lg font-semibold">
                Pay EMI
              </h2>

              <div className="text-sm text-gray-500">
                EMI ID: <span className="font-medium text-gray-800">{selectedEmi.emi_id}</span>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={paymentData.payment_amount}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      payment_amount: e.target.value,
                    })
                  }
                  disabled
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      payment_method: e.target.value,
                    })
                  }
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                >
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Transaction ID */}
              {paymentData.payment_method !== "cash" && (
                <div>
                  <label className="text-sm font-medium">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentData.transaction_id}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        transaction_id: e.target.value,
                      })
                    }
                    className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                    placeholder="Enter transaction id"
                  />
                </div>
              )}

              {/* Upload Proof */}
              <div>
                <label className="text-sm font-medium">
                  Upload Payment Proof <span className="text-red-500">*</span>
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={(e) => setPaymentImage(e.target.files?.[0] || null)}
                  className="mt-1 text-sm"
                />
                {paymentImage && (
                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={URL.createObjectURL(paymentImage)}
                      className="w-24 h-20 object-cover rounded-md"
                    />
                    <button
                      onClick={() => setPaymentImage(null)}
                      className="text-xs text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                )}

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">

                <button
                  onClick={() => {
                    setOpenPayModal(false);
                    setSelectedEmi(null);
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handleMakePayment}
                  disabled={paying || !paymentImage}
                  className={`px-4 py-2 text-sm rounded-md text-white
  ${paying || !paymentImage
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {paying ? "Processing..." : "Pay EMI"}
                </button>

              </div>

            </div>
          </div>
        )}

        {openViewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

            <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Payment Details</h2>

                <button
                  onClick={() => setOpenViewModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loadingView ? (
                <div className="text-sm text-gray-500">Loading payment details...</div>
              ) : viewPayments.length === 0 ? (
                <div className="text-sm text-gray-500">No payment found</div>
              ) : (
                <div className="space-y-4">

                  {viewPayments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="border rounded-md p-4 text-sm space-y-2"
                    >

                      <p>
                        <span className="font-medium">Receipt:</span>{" "}
                        {payment.receipt_number}
                      </p>

                      <p>
                        <span className="font-medium">Amount:</span> ₹
                        {payment.payment_amount}
                      </p>

                      <p>
                        <span className="font-medium">Method:</span>{" "}
                        {payment.payment_method}
                      </p>

                      <p>
                        <span className="font-medium">Transaction ID:</span>{" "}
                        {payment.transaction_id || "—"}
                      </p>

                      <p>
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(payment.payment_date).toLocaleDateString("en-GB")}
                      </p>

                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                          {payment.payment_status}
                        </span>
                      </p>

                      {payment.payment_image && (
                        <>
                          {/* {console.log("Payment image URL:", `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${payment.payment_image}`)} */}
                          <img
                            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${payment.payment_image}`}
                            alt="payment proof"
                            className="w-28 h-20 object-cover rounded-md mt-2 border"
                          />
                        </>
                      )}

                    </div>
                  ))}

                </div>
              )}
            </div>
          </div>
        )}

        {openRevertModal && revertTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-red-600">Revert Payment</h2>
              <p className="text-sm text-gray-700">
                Are you sure you want to revert payment for EMI {revertTarget.emi_id}?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setOpenRevertModal(false);
                    setRevertTarget(null);
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!revertTarget) return;
                    setReverting(true);
                    const toastId = toast.loading("Reverting payment...");
                    try {
                      const res = await axiosInstance.post(`${ProjectApiList.api_revertEmiPayment}/${revertTarget.emi_id}`);
                      if (res?.data?.success) {
                        setEmiList((prev) =>
                          prev.map((emi) =>
                            emi.emi_id === revertTarget.emi_id
                              ? { ...emi, status: "pending" }
                              : emi
                          )
                        );
                        toast.success("Payment reverted", { id: toastId });
                      } else {
                        toast.error(res?.data?.message || "Failed to revert", { id: toastId });
                      }
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || "Failed to revert", { id: toastId });
                    } finally {
                      setReverting(false);
                      setOpenRevertModal(false);
                      setRevertTarget(null);
                    }
                  }}
                  disabled={reverting}
                  className={`px-4 py-2 text-sm rounded-md text-white ${reverting ? "bg-red-300" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {reverting ? "Reverting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
        {openPreCloseModal && topPendingEmi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Pre-Close Loan</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pre-closing based on EMI{" "}
                  <span className="font-semibold text-gray-800">
                    {topPendingEmi.emi_id}
                  </span>{" "}
                  (Installment #{topPendingEmi.id})
                </p>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-gray-50 rounded-md p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">EMI Amount</span>
                  <span>₹{Number(topPendingEmi.emi_amount).toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Balance</span>
                  <span>₹{Number(topPendingEmi.outstanding_balance).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-orange-600">
                  <span>Pre-close Penalty (2%)</span>
                  <span>₹{preClosePenalty.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Payable</span>
                  <span>₹{preCloseTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium">
                  Payment Method
                </label>

                <select
                  value={preCloseData.payment_method}
                  onChange={(e) => {
                    setPreCloseData({
                      payment_method: e.target.value,
                      transaction_id: "",
                    });

                    setPreCloseImage(null);
                  }}
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="text-sm font-medium">
                  Transaction ID{" "}
                  {preCloseData.payment_method !== "cash" ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  )}
                </label>

                <input
                  type="text"
                  value={preCloseData.transaction_id}
                  onChange={(e) =>
                    setPreCloseData({
                      ...preCloseData,
                      transaction_id: e.target.value,
                    })
                  }
                  placeholder="Enter Transaction ID"
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* Payment Proof */}
              <div>
                <label className="text-sm font-medium">
                  Payment Image{" "}
                  {preCloseData.payment_method !== "cash" ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-gray-400 font-normal">
                      (Optional, Max 2MB)
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  className="w-full mt-1 text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("Image size must be less than 2MB");
                      e.target.value = "";
                      setPreCloseImage(null);
                      return;
                    }

                    setPreCloseImage(file);
                  }}
                />

                {preCloseImage && (
                  <div className="flex items-center gap-2 mt-3">
                    <img
                      src={URL.createObjectURL(preCloseImage)}
                      className="w-20 h-16 rounded-md border object-cover"
                    />

                    <button
                      onClick={() => setPreCloseImage(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setOpenPreCloseModal(false)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handlePreClose}
                  disabled={preClosing || !isPreCloseFormValid}
                  className={`px-4 py-2 text-sm rounded-md text-white ${preClosing || !isPreCloseFormValid
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  {preClosing ? "Processing..." : "Confirm Pre-Close"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div></>
  );
}