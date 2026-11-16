"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";

type Props = {
  module: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
};

export default function EditModuleModal({
  module,
  open,
  onOpenChange,
  onUpdated,
}: Props) {

  const { register, handleSubmit, setValue } = useForm();

  // console.log("Module in Edit Modal:", module);

  useEffect(() => {
    if (module) {
      setValue("module_name", module.module_name);
      setValue("key", module.key);
      setValue("is_active", module.is_active ? "true" : "false");
    }
  }, [module, setValue]);

  const onSubmit = async (data: any) => {
    try {

      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const payload = {
        ...data,
        branch_id: user?.branch,
      };

      await axiosInstance.post(
        `${ProjectApiList.api_updateModule}/${module.module_id}`,
        payload
      );

      toast.success("Module updated");

      onOpenChange(false);
      onUpdated();

    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">

        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-blue-800">
            Edit Module
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div>
            <label className="text-sm font-medium text-gray-700">
              Module Name
            </label>
            <input
              {...register("module_name")}
              className="w-full mt-1 border px-3 py-2 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Short Name
            </label>
            <input
              {...register("key")}
              className="w-full mt-1 border px-3 py-2 rounded-md text-sm"
            />
          </div>

          {/* <div>
            <label className="text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              {...register("is_active")}
              className="w-full mt-1 border px-3 py-2 rounded-md text-sm"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div> */}

          <div className="flex justify-end gap-2 pt-2">

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update
            </button>

          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}