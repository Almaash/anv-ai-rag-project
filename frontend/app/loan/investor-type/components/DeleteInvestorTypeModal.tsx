"use client";

type Props = {
  item: any;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteInvestorTypeModal({ item, loading, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800">Delete Investor Type</h2>

        <p className="mt-3 text-sm text-gray-600">
          Are you sure you want to delete
          <span className="font-semibold text-red-600"> {item?.name} </span>
          ?
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            disabled={loading}
            onClick={onClose}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={onConfirm}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}