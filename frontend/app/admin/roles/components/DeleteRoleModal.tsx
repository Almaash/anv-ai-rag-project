"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";


export default function DeleteRoleModal({ role, onClose, onDeleted }: any) {
  const [loading, setLoading] = useState(false);

const handleDelete = async () => {
  setLoading(true);

  try {
    await axiosInstance.delete(`${ProjectApiList.DELETE_ROLE}/${role.role_id}`);

    toast.success("Role deleted successfully");
    onDeleted?.();
    onClose();
  } catch (error) {
    toast.error("Failed to delete role");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 border">
        <h2 className="text-xl font-semibold text-red-600">Delete Role</h2>
        <p className="text-gray-600 text-sm mt-2">
          Are you sure you want to delete <b>{role.name}</b>?
        </p>

        <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="bg-white border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 w-full md:w-auto"
          >
            Cancel
          </button>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 w-full md:w-auto"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
