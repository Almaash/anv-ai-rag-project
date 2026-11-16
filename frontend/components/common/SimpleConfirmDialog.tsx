"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SimpleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export default function SimpleConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = "Continue",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
}: SimpleConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-[400px] rounded-2xl border border-slate-200 p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-800 uppercase">
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm font-medium leading-relaxed text-slate-500">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3 text-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            className="h-10 rounded-xl border-slate-200 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-10 rounded-xl px-7 text-xs font-bold text-white uppercase tracking-widest shadow-lg ${
              destructive
                ? "bg-red-600 hover:bg-red-700 shadow-red-100"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            }`}
          >
            {loading ? "..." : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
