"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function InvestorTypeFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_INVESTOR_TYPE}/${editId}`);
        if (res.data.success && res.data.data) {
          const detail = res.data.data;
          setFormData({
            name: detail.name || "",
            description: detail.description || "",
            status: detail.status || "active",
          });
        }
      } catch {
        toast.error("Failed to load investor type details");
      } finally {
        setPageLoading(false);
      }
    };

    fetchDetails();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Investor type name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fill required fields");
      return;
    }

    setLoading(true);
    try {
      const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
      const branchId = user?.branch || user?.branch_id || null;
      const cmsAdminId = user?.cms_admin || user?.user_id || null;

      const payload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        branch_id: branchId,
        cms_admin_id: cmsAdminId,
      };

      const res = isEditMode
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_INVESTOR_TYPE}/${editId}`, payload)
        : await axiosInstance.post(ProjectApiList.CREATE_INVESTOR_TYPE, payload);

      if (res.data.success) {
        toast.success(res.data.message || (isEditMode ? "Investor type updated" : "Investor type created"));
        router.push("/loan/investor-type");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      console.error("Save investor type failed", err);
      if (axiosErr.response?.status === 422 && axiosErr.response?.data?.errors) {
        const validationErrors = axiosErr.response.data.errors;
        const mappedErrors: { [key: string]: string } = {};
        Object.keys(validationErrors).forEach((key) => {
          mappedErrors[key] = validationErrors[key]?.[0] || "Invalid value";
        });
        setErrors(mappedErrors);
        Object.keys(validationErrors).forEach((key) => {
          validationErrors[key].forEach((msg: string) => {
            toast.error(msg, {
              description: `Field: ${key.replace(/_/g, " ").toUpperCase()}`,
              duration: 5000,
            });
          });
        });
      } else {
        toast.error(axiosErr.response?.data?.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 relative">
      {pageLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
          <p className="text-sm text-gray-600 font-medium">Loading...</p>
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{isEditMode ? "Edit Investor Type" : "Add Investor Type"}</h1>
            <p className="text-sm text-gray-500">Use the form below to save investor type details.</p>
          </div>
          <Link href="/loan/investor-type" className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200">
            Back
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-700 text-sm mb-1 block">
                Investor Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${errors.name ? "border-red-500 ring-red-200" : "border-gray-300"}`}
                placeholder="Enter investor type"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-700 text-sm mb-1 block">Status</label>
              <div className="flex bg-gray-100 rounded-md p-1 w-fit border border-gray-300">
                {["active", "inactive"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: status as "active" | "inactive" })}
                    className={`px-4 py-1 text-sm font-semibold rounded ${
                      formData.status === status ? "bg-white shadow border" : "text-gray-500"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-1 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (validate()) {
                  setShowConfirmModal(true);
                } else {
                  toast.error("Please fill required fields");
                }
              }}
              className="px-5 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : isEditMode ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={isEditMode ? "Update Investor Type?" : "Save Investor Type?"}
        message={
          isEditMode
            ? `Are you sure you want to update ${formData.name || "this investor type"}?`
            : `Create ${formData.name || "this investor type"}?`
        }
        confirmText={loading ? "Saving..." : isEditMode ? "Yes, Update" : "Yes, Save"}
        onConfirm={() => handleSubmit()}
        loading={loading}
      />
    </div>
  );
}
