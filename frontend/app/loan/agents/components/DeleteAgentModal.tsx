export default function DeleteAgentModal({
  agent,
  loading,
  onClose,
  onConfirm,
}: any) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-999">

      <div className="bg-white rounded-lg p-6 w-96 space-y-4">
        <h3 className="text-lg font-semibold">
          Delete Agent
        </h3>

        <p className="text-sm text-gray-600">
          Are you sure you want to delete <b>{agent?.name}</b>?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 rounded-md text-sm"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 bg-red-600 text-white rounded-md text-sm"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}