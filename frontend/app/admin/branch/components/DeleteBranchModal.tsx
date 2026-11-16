"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useState } from "react";

export default function DeleteBranchModal({ branch, open, onOpenChange, onDeleted }: any) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await axiosInstance.delete(`/branches/${branch.id}`);
    toast.success("Branch deleted successfully");
    onOpenChange();
    onDeleted();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete <strong>{branch.name}</strong>?</p>

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