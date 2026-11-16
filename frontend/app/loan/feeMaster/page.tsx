"use client";

import { useEffect, useState } from "react";
import { Edit, Trash } from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

/* ============================
   TYPES
============================ */
type FeeMaster = {
  id: number;
  processing_fee: number;
  gst_percentage: number;
  user_id: string;
  branch_id: string;
  cms_admin_id: string;
  created_at: string;
  updated_at: string;
};

export default function FeeMasterPage() {
  const [fee, setFee] = useState<FeeMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [processingFee, setProcessingFee] = useState<number | "">("");
  const [gstPercentage, setGstPercentage] = useState<number | "">("");

  const [openDelete, setOpenDelete] = useState(false);

  /* ============================
     GET LOGGED USER
  ============================ */
  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  /* ============================
     GET FEE MASTER
  ============================ */
  const fetchFee = async () => {
    try {
      setLoading(true);

      const user = getLoggedInUser();
      if (!user) return;

      const res = await axiosInstance.get(ProjectApiList.api_getFeeMaster, {
        params: {
          user_id: user.user_id,
          branch_id: user.branch,
          cms_admin_id: user.cms_admin,
        },
      });

      if (res.data.success) {
        const feeData = res.data.data?.[0] || null;
        setFee(feeData);

        if (feeData) {
          setProcessingFee(feeData.processing_fee);
          setGstPercentage(feeData.gst_percentage);
        } else {
          setProcessingFee("");
          setGstPercentage("");
        }
      }
    } catch (err) {
      console.error("Fetch fee failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFee();
  }, []);

  /* ============================
     CREATE / UPDATE
  ============================ */
  const handleSave = async () => {
    try {
      const user = getLoggedInUser();
      if (!user) return;

      const payload = {
        processing_fee: Number(processingFee),
        gst_percentage: Number(gstPercentage),
        user_id: user.user_id,
        branch_id: user.branch,
        cms_admin_id: user.cms_admin,
      };

      let res;

      if (fee) {
        // UPDATE
        res = await axiosInstance.post(
          `${ProjectApiList.api_updateFeeMaster}/${fee.id}`,
          payload
        );
      } else {
        // CREATE
        res = await axiosInstance.post(
          ProjectApiList.api_createFeeMaster,
          payload
        );
      }

      if (res.data.success) {
        await fetchFee();
        setOpenEdit(false);
      }
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  /* ============================
     DELETE
  ============================ */
 const handleDelete = async () => {
  if (!fee) return;

  try {
    const res = await axiosInstance.post(
      `${ProjectApiList.api_deteteFeeMaster}/${fee.id}`
    );

    if (res.data.success) {
      // ✅ Clear data
      setFee(null);
      setProcessingFee("");
      setGstPercentage("");

      // ✅ Close confirmation modal AFTER success
      setOpenDelete(false);
    }
  } catch (err) {
    console.error("Delete failed", err);
  }
};

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Fee Master
          </h1>
          <p className="text-gray-500">
            Manage processing fee and GST configuration
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenEdit(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <Edit size={14} className="inline mr-1" />
            {fee ? "Edit Fee Settings" : "Create Fee Settings"}
          </button>

          {fee && (
            <button
              onClick={() => setOpenDelete(true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              <Trash size={14} className="inline mr-1" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-xl">
        {loading ? (
          <div className="text-center py-6 text-gray-500">
            Loading...
          </div>
        ) : !fee ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No fee configuration found.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Processing Fee
              </span>
              <span className="font-semibold text-gray-900">
                ₹{fee.processing_fee}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">
                GST Percentage
              </span>
              <span className="font-semibold text-gray-900">
                {fee.gst_percentage}%
              </span>
            </div>

            {/* <div className="flex justify-between">
              <span className="text-gray-600">
                Last Updated
              </span>
              <span className="font-semibold text-gray-900">
                {formatDate(fee.updated_at)}
              </span>
            </div> */}
          </div>
        )}
      </div>

      {/* MODAL */}
      {openEdit && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white w-[420px] rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {fee ? "Update Fee Settings" : "Create Fee Settings"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm">
                  Processing Fee (₹)
                </label>
                <input
                  type="number"
                  value={processingFee}
                  onChange={(e) =>
                    setProcessingFee(Number(e.target.value))
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-sm">
                  GST Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gstPercentage}
                  onChange={(e) =>
                    setGstPercentage(Number(e.target.value))
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpenEdit(false)}
                className="px-3 py-1.5 text-sm border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {openDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white w-[400px] rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete Fee Settings
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete this fee configuration?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpenDelete(false)}
                className="px-3 py-1.5 text-sm border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}