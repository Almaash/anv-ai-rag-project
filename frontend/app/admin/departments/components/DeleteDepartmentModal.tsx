"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useState } from "react";
import ProjectApiList from "@/app/api/ProjectApiList";

type Props = {
  department: any;
  open: boolean;
  onOpenChange: () => void;
  onDeleted: () => void;
};

export default function DeleteDepartmentModal({ department, open, onOpenChange, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await axiosInstance.delete(`${ProjectApiList.api_deleteDepartments}/${department.id}`);
    toast.success("Department deleted");
    onOpenChange();
    onDeleted();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Department</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete <strong>{department.name}</strong>?</p>

        <DialogFooter>
          <Button className="bg-red-600 text-white" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
          <Button variant="outline" onClick={onOpenChange}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}