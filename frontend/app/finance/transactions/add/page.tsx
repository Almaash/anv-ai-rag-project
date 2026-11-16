"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createTransaction } from "../../api/financeApi";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface FormValues {
  amount: string;
  transaction_type: "credit" | "debit" | "";
  transaction_date: string;
  description: string;
  payment_reference_id: string;
  payment_mode: string;
}

export default function AddTransactionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    defaultValues: { transaction_type: "", payment_mode: "" },
  });

  const paymentMode = watch("payment_mode");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onConfirmSave = async () => {
    if (!formData) return;
    setSubmitting(true);
    setShowSaveConfirm(false);
    try {
      const fd = new FormData();
      fd.append("amount", formData.amount);
      fd.append("transaction_type", formData.transaction_type);
      fd.append("transaction_date", formData.transaction_date);
      if (formData.description) fd.append("description", formData.description);
      if (formData.payment_mode) fd.append("payment_mode", formData.payment_mode);
      if (formData.payment_reference_id) fd.append("payment_reference_id", formData.payment_reference_id);
      if (selectedFile) fd.append("attachment", selectedFile);

      await createTransaction(fd);
      toast.success("Transaction created successfully");
      router.push("/finance/transactions");
    } catch (err: any) {
      const errs = err?.response?.data?.errors;
      if (errs) {
        Object.values(errs).flat().forEach((msg: any) => toast.error(msg));
      } else {
        toast.error(err?.response?.data?.message || "Failed to create transaction");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (data: FormValues) => {
    setFormData(data);
    setShowSaveConfirm(true);
  };

  const handleCancel = () => {
    if (isDirty || selectedFile) setShowCancelConfirm(true);
    else router.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Add Transaction</h1>
            <p className="text-xs sm:text-sm text-slate-500">Record a new financial transaction</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="text-emerald-700 text-base sm:text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Amount + Type — side by side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm">Amount <span className="text-red-500">*</span></Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="h-10"
                    {...register("amount", {
                      required: "Amount is required",
                      min: { value: 0.01, message: "Must be greater than 0" },
                    })}
                  />
                  {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transaction_type" className="text-sm">
                    Transaction Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="transaction_type"
                    {...register("transaction_type", { required: "Type is required", validate: v => v !== "" || "Type is required" })}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select type</option>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                  {errors.transaction_type && <p className="text-red-500 text-xs">{errors.transaction_type.message}</p>}
                </div>
              </div>

              {/* Date + Payment Mode — side by side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="transaction_date" className="text-sm">
                    Transaction Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    className="h-10"
                    {...register("transaction_date", { required: "Date is required" })}
                  />
                  {errors.transaction_date && <p className="text-red-500 text-xs">{errors.transaction_date.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment_mode" className="text-sm">Payment Mode</Label>
                  <select
                    id="payment_mode"
                    {...register("payment_mode")}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select mode</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="neft">NEFT</option>
                    <option value="rtgs">RTGS</option>
                    <option value="imps">IMPS</option>
                    <option value="cheque">Cheque</option>
                    <option value="demand_draft">Demand Draft</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Payment Ref ID — hidden for cash */}
              {paymentMode !== "cash" && (
                <div className="space-y-1.5">
                  <Label htmlFor="payment_reference_id" className="text-sm">Payment / Receipt Reference ID</Label>
                  <Input
                    id="payment_reference_id"
                    type="text"
                    placeholder="e.g. UTR123456, RCPT-001"
                    className="h-10"
                    {...register("payment_reference_id")}
                  />
                  <p className="text-xs text-slate-400">Optional. Bank UTR, receipt number, or payment ID.</p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Optional description..."
                  {...register("description")}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Attachment */}
              <div className="space-y-1.5">
                <Label className="text-sm">Attachment</Label>
                {selectedFile ? (
                  <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm text-emerald-700 truncate">{selectedFile.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={clearFile} className="ml-2 text-slate-400 hover:text-red-500 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="attachment"
                    className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-emerald-400 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-500">Click to upload (PDF, JPG, PNG, DOC, DOCX — max 10MB)</span>
                  </label>
                )}
                <input id="attachment" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 sm:flex-1 h-10">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {submitting ? "Saving..." : "Save Transaction"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="h-10">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Confirm Transaction"
        message="Are you sure you want to save this transaction?"
        confirmText={submitting ? "Saving..." : "Yes, Save"}
        cancelText="Review"
        onConfirm={onConfirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to leave?"
        confirmText="Yes, Discard"
        cancelText="Keep Editing"
        onConfirm={() => router.back()}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
