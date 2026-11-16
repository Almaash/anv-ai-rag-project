"use client";

import React from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";

type Props = {
  user: any;
  open: boolean;
  onOpenChange: () => void;
  onSuccess: () => void;
};

export default function DeleteUserModal({ user, open, onOpenChange, onSuccess }: Props) {
  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/users/${user.id}`);
      toast.success("User deleted");
      onOpenChange();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete <strong>{user.name}</strong>?</p>

        <DialogFooter>
          <Button className="bg-red-600 text-white" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}