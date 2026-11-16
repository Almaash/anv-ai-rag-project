"use client";

import { useState } from "react";

export default function DeleteCAFModal({
  caf,
  loading,
  actionType = "delete",
  modalType = "caf", // "caf" or "customer"
  onClose,
  onConfirm,
}: any) {
  const [confirmText, setConfirmText] = useState("");

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  const handleDelete = () => {
    if (confirmText !== "DELETE") return;

    onConfirm();
  };

  const isCustomerModal = modalType === "customer";
  const identifier = isCustomerModal ? caf?.customer_id || caf?.id : caf?.loan_application_id;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[500px] rounded-xl shadow-lg p-6">

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-800">
          {actionType === "deletion_request"
            ? isCustomerModal ? "Submit Customer Deletion Request" : "Submit Deletion Request"
            : isCustomerModal ? "Delete Customer" : "Delete CAF"}
        </h2>

        {/* Confirmation */}
        <p className="mt-3 text-sm text-gray-600">
          {actionType === "deletion_request"
            ? isCustomerModal 
              ? "Are you sure you want to submit a deletion request for customer "
              : "Are you sure you want to submit a deletion request for CAF "
            : isCustomerModal
              ? "Are you sure you want to delete customer "
              : "Are you sure you want to delete CAF "}
          <span className="font-semibold text-red-600">
            {identifier}
          </span>
          ?
        </p>

        {/* Warning */}
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">
            ⚠️ Warning: This action cannot be undone.
          </p>

          <p className="mt-2 text-xs text-red-600 leading-5">
            {isCustomerModal
              ? "Deleting this customer will permanently remove all customer data, including all enrollments, loan applications, documents, disbursement records, loan records, EMI schedules, and all other data associated with this customer."
              : "Deleting this CAF will permanently remove all CAF Details, Personal Details, CAM, Disbursement, Loan, EMI schedules, and all other records associated with this CAF."}
          </p>

          <p className="mt-3 text-xs text-red-600 leading-5">
            {isCustomerModal
              ? "Please verify the customer details carefully before proceeding, as this action is irreversible."
              : "Please verify the CAF details carefully before proceeding, as this action is irreversible."}
          </p>
        </div>

        {/* Type DELETE Confirmation */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm{" "}
            {actionType === "deletion_request"
              ? "the deletion request"
              : "the deletion"}
          </label>

          <input
            type="text"
            value={confirmText}
            onChange={(e) =>
              setConfirmText(
                e.target.value.toUpperCase()
              )
            }
            placeholder="Type DELETE"
            autoComplete="off"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          {confirmText &&
            confirmText !== "DELETE" && (
              <p className="mt-2 text-xs text-red-500">
                Please type <strong>DELETE</strong> exactly to
                enable deletion.
              </p>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            disabled={loading}
            onClick={handleClose}
            className="px-4 py-2 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            disabled={loading || confirmText !== "DELETE"}
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? actionType === "deletion_request"
                ? "Submitting..."
                : "Deleting..."
              : actionType === "deletion_request"
                ? "Submit Deletion Request"
                : "Delete CAF"}
          </button>

        </div>
      </div>
    </div>
  );
}