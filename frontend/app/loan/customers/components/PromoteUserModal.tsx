"use client";

import React from "react";

interface PromoteModalProps {
  user: any;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PromoteUserModal({
  user,
  loading,
  onClose,
  onConfirm,
}: PromoteModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-all p-4">
      <div className="bg-white rounded-2xl p-0 w-full max-w-[400px] shadow-2xl overflow-hidden border-none transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        <div className="bg-blue-50 border-b border-blue-100 p-8 text-center">
          <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-blue-900">Promote Employee</h3>
          <p className="text-sm text-blue-700/80 mt-2 italic px-2">
            Promoting <strong>{user.first_name} {user.last_name || ""}</strong> to{" "}
            <span className="font-bold underline">Branch Manager</span>.
          </p>
        </div>

        <div className="p-6 bg-white">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            This action will upgrade their system access and responsibilities.
            Are you sure you want to proceed?
          </p>
        </div>

        <div className="flex items-center gap-3 p-6 bg-gray-50 border-t">
          <button
            className="flex-1 px-4 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-[2] px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 text-sm uppercase tracking-wide"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Promoting..." : "CONFIRM PROMOTION"}
          </button>
        </div>
      </div>
    </div>
  );
}
