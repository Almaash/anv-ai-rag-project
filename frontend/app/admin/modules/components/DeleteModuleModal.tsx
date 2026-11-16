"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";

type Props = {
  module: any;
  open: boolean;
  onOpenChange: () => void;
  onDeleted: () => void;
};

export default function DeleteModuleModal({
  module,
  open,
  onOpenChange,
  onDeleted,
}: Props) {

  const deleteModule = async () => {
    try {

      await axiosInstance.delete(
        `${ProjectApiList.api_deleteModule}/${module.module_id}`
      );

      toast.success("Module deleted");

      onOpenChange();
      onDeleted();

    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">

        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-red-600">
            Delete Module
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <p className="text-sm text-gray-600">
            Are you sure you want to delete this module?
          </p>

          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <strong>{module?.module_name}</strong>
          </div>

          <div className="flex justify-end gap-2">

            <button
              onClick={onOpenChange}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={deleteModule}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}