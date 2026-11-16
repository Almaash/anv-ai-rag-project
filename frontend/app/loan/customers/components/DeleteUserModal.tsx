"use client";

import { useState } from "react";

export default function DeleteUserModal({
  user,
  roleTab,
  actionType = "delete",
  loading,
  onClose,
  onConfirm,
}: any) {
  const [confirmationText, setConfirmationText] = useState("");

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.customer?.first_name
    ? `${user.customer.first_name} ${user.customer.last_name || ""}`.trim()
    : user?.name || "this customer";

  const warningMessage =
    roleTab === "customer_listing"
      ? "Deleting this customer will permanently remove all customer data, including all enrollments, loan applications, documents, disbursement records, loan records, EMI schedules, and all other data associated with this customer."
      : roleTab === "branch_support_executive"
      ? "Deleting this enrollment will permanently remove the enrollment and all associated CAF, Personal Details, CAM, Disbursement, Loan, EMI schedules, and related records with this enrollment."
      : "Deleting this customer will permanently remove all data associated with this customer.";

  const isConfirmed = confirmationText.trim().toUpperCase() === "DELETE";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[450px] rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800">
          {actionType === "deletion_request"
            ? "Submit Deletion Request"
            : roleTab === "branch_support_executive"
            ? "Delete Enrollment"
            : "Delete Customer"}
        </h2>

        <p className="mt-3 text-sm text-gray-600">
          Are you sure you want to {actionType === "deletion_request" ? "submit a deletion request for" : "delete"}{" "}
          <span className="font-semibold text-red-600">
            {displayName}
          </span>
          ?
        </p>

        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700">
            ⚠️ Warning: This action cannot be undone.
          </p>

          <p className="mt-2 text-xs text-red-600 leading-5">
            {actionType === "deletion_request"
              ? "Submitting a deletion request will mark this customer for deletion. The request will be processed by the system administrator."
              : warningMessage}
          </p>
        </div>

        {/* Double Verification */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To confirm this action, type{" "}
            <span className="font-bold text-red-600">DELETE</span> below:
          </label>

          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type DELETE"
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
          />

          {confirmationText.length > 0 && !isConfirmed && (
            <p className="mt-2 text-xs text-red-500">
              Please type <strong>DELETE</strong> exactly to enable the button.
            </p>
          )}

          {isConfirmed && (
            <p className="mt-2 text-xs text-green-600">
              ✓ Confirmation successful. You can now proceed.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            disabled={loading}
            onClick={() => {
              setConfirmationText("");
              onClose();
            }}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            disabled={loading || !isConfirmed}
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-md text-sm text-white transition
              ${
                loading || !isConfirmed
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
          >
            {loading
              ? actionType === "deletion_request"
                ? "Submitting..."
                : "Deleting..."
              : actionType === "deletion_request"
              ? "Submit Deletion Request"
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}