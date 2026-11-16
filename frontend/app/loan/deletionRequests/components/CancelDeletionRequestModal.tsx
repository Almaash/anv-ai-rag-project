"use client";

import { RotateCcw, X } from "lucide-react";

interface Props {
    open: boolean;
    loading?: boolean;
    customerName?: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function CancelDeletionRequestModal({
    open,
    loading,
    customerName,
    onClose,
    onConfirm,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">

                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Cancel Deletion Request
                    </h2>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-md p-1 hover:bg-gray-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-6">

                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <RotateCcw className="text-amber-600" size={28} />
                    </div>

                    <p className="text-center text-gray-700">
                        Are you sure you want to cancel the deletion request
                        {customerName && (
                            <>
                                {" "}for{" "}
                                <span className="font-semibold">
                                    {customerName}
                                </span>
                            </>
                        )}
                        ?
                    </p>

                    <p className="mt-2 text-center text-sm text-gray-500">
                        This customer will become active again and the deletion
                        request will be removed.
                    </p>
                </div>

                <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                        Close
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                        {loading ? "Cancelling..." : "Yes, Cancel Request"}
                    </button>
                </div>

            </div>
        </div>
    );
}