"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useEffect } from "react";

export default function EditBranchModal({
  branch,
  open,
  onOpenChange,
  onUpdated,
}: any) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  useEffect(() => {
    reset(branch);
  }, [branch, reset]);

  async function onSubmit(data: any) {
    await axiosInstance.post(`/branches/${branch.id}`, data);
    toast.success("Branch updated successfully");
    onOpenChange();
    onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit Branch
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-2"
        >
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Branch Name
            </label>
            <input
              {...register("name")}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              {...register("phone")}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              {...register("address")}
              rows={2}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              {...register("email")}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-md border">
            <span className="text-sm font-medium text-gray-700">
              Active Status
            </span>
            <input
              type="checkbox"
              {...register("is_active")}
              className="h-4 w-4 accent-blue-600"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Updating..." : "Update Branch"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenChange}
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}