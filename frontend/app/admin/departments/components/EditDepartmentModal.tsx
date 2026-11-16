"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useEffect } from "react";

type Props = {
  department: any;
  open: boolean;
  onOpenChange: () => void;
  onUpdated: () => void;
};

export default function EditDepartmentModal({ department, open, onOpenChange, onUpdated }: Props) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    reset(department);
  }, [department, reset]);

  async function onSubmit(data: any) {
    await axiosInstance.put(`/departments/${department.id}`, data);
    toast.success("Department updated");
    onOpenChange();
    onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input {...register("name")} className="w-full border px-3 py-2 rounded text-sm" />
          <textarea {...register("description")} className="w-full border px-3 py-2 rounded text-sm" />

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
            <Button variant="outline" onClick={onOpenChange}>Cancel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}