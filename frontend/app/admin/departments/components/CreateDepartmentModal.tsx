"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import ProjectApiList from "@/app/api/ProjectApiList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type FormValues = {
  name: string;
  description: string;
};

export default function CreateDepartmentModal({ open, onOpenChange, onCreated }: Props) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  async function onSubmit(data: FormValues) {
    await axiosInstance.post(ProjectApiList.api_postDepartments, data);
    toast.success("Department created successfully");
    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input {...register("name", { required: true })} className="w-full border px-3 py-2 rounded text-sm" />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea {...register("description")} className="w-full border px-3 py-2 rounded text-sm" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}