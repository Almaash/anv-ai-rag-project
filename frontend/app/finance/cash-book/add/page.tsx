"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  getCashBookToday,
  getCashBookEntryById,
  createCashBookEntry,
  updateCashBookEntry,
} from "../../api/financeApi";

interface FormValues {
  date: string;
  opening_balance: string;
  cash_in: string;
  cash_out: string;
  payment_mode: string;
  description: string;
  note: string;
}

export default function AddEditCashBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [closingPreview, setClosingPreview] = useState(0);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isDirty } } = useForm<FormValues>({
    defaultValues: { date: "", opening_balance: "0", cash_in: "0", cash_out: "0", payment_mode: "Bank Transfer", description: "", note: "" },
  });

  const watchedValues = watch(["opening_balance", "cash_in", "cash_out"]);
  const watchedDate = watch("date");

  // Live closing balance preview
  useEffect(() => {
    const [ob, ci, co] = watchedValues.map((v) => parseFloat(v || "0") || 0);
    setClosingPreview(ob + ci - co);
  }, [watchedValues[0], watchedValues[1], watchedValues[2]]);

  // Watch date changes to fetch opening balance for that specific day
  useEffect(() => {
    if (!watchedDate || isEdit || loading) return;
    
    const fetchBalanceForDate = async () => {
      try {
        const res = await getCashBookToday({ date: watchedDate });
        if (!res.data.exists) {
          setValue("opening_balance", String(res.data.data.opening_balance));
        }
      } catch (err) {
        console.error("Failed to fetch balance for selected date", err);
      }
    };
    
    const timer = setTimeout(fetchBalanceForDate, 500); // Debounce to avoid too many requests
    return () => clearTimeout(timer);
  }, [watchedDate, isEdit]);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      try {
        if (isEdit) {
          const res = await getCashBookEntryById(editId!);
          const entry = res.data.data;
          if (entry) {
            reset({
              date: entry.date,
              opening_balance: String(entry.opening_balance),
              cash_in: String(entry.cash_in),
              cash_out: String(entry.cash_out),
              payment_mode: entry.payment_mode || "Bank Transfer",
              description: entry.description || "",
              note: entry.note || "",
            });
          } else {
            toast.error("Entry not found");
            router.back();
          }
        } else {
          // New entry — prefill from today API
          const res = await getCashBookToday();
          const d = res.data.data;
          reset({
            date: d.date,
            opening_balance: String(d.opening_balance),
            payment_mode: "Bank Transfer",
            description: "",
            cash_in: "0",
            cash_out: "0",
            note: "",
          });
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSubmit = (data: FormValues) => {
    setPendingData(data);
    setShowSaveConfirm(true);
  };

  const onConfirmSave = async () => {
    if (!pendingData) return;
    setSubmitting(true);
    setShowSaveConfirm(false);
    try {
      const loggedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
      
      const payload: any = {
        date: pendingData.date,
        opening_balance: parseFloat(pendingData.opening_balance) || 0,
        payment_mode: pendingData.payment_mode,
        description: pendingData.description,
        cash_in: parseFloat(pendingData.cash_in) || 0,
        cash_out: parseFloat(pendingData.cash_out) || 0,
        note: pendingData.note || null,
      };

      // Updated payload to match backend requirements based on login user details
      if (loggedUser.user_id) payload.user_id = loggedUser.user_id; // Sending as user_id for created_by
      if (loggedUser.cms_admin) payload.cms_admin_id = loggedUser.cms_admin; // Sending as cms_admin_id
      if (loggedUser.branch) payload.branch = loggedUser.branch;

      if (isEdit) {
        await updateCashBookEntry(editId!, payload);
        toast.success("Entry updated successfully");
      } else {
        await createCashBookEntry(payload);
        toast.success("Entry saved successfully");
      }
      router.push("/finance/cash-book");
    } catch (err: any) {
      const errs = err?.response?.data?.errors;
      if (errs) {
        Object.values(errs).flat().forEach((msg: any) => toast.error(msg));
      } else {
        toast.error(err?.response?.data?.message || "Failed to save entry");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) setShowCancelConfirm(true);
    else router.back();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {isEdit ? "Edit Cash Book Entry" : "Add Cash Book Entry"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {isEdit ? "Update the cash book record" : "Opening balance is auto-filled from yesterday's closing balance"}
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="text-emerald-700 text-base sm:text-lg">Cash Book Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm">Date <span className="text-red-500">*</span></Label>
                <Input
                  id="date"
                  type="date"
                  className="h-10"
                  {...register("date", { required: "Date is required" })}
                />
                {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
              </div>

              {/* Opening Balance */}
              <div className="space-y-1.5">
                <Label htmlFor="opening_balance" className="text-sm">
                  Opening Balance <span className="text-red-500">*</span>
                  {!isEdit && <span className="ml-2 text-xs text-blue-500 font-normal">(auto-filled from yesterday's closing)</span>}
                </Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-10"
                  {...register("opening_balance", { required: "Opening balance is required", min: { value: 0, message: "Cannot be negative" } })}
                />
                {errors.opening_balance && <p className="text-red-500 text-xs">{errors.opening_balance.message}</p>}
              </div>

              {/* Cash In + Cash Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cash_in" className="text-sm text-emerald-700">Cash In <span className="text-red-500">*</span></Label>
                  <Input
                    id="cash_in"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-10 border-emerald-200 focus:ring-emerald-500"
                    {...register("cash_in", { required: "Cash in is required", min: { value: 0, message: "Cannot be negative" } })}
                  />
                  {errors.cash_in && <p className="text-red-500 text-xs">{errors.cash_in.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cash_out" className="text-sm text-red-600">Cash Out <span className="text-red-500">*</span></Label>
                  <Input
                    id="cash_out"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-10 border-red-200 focus:ring-red-400"
                    {...register("cash_out", { required: "Cash out is required", min: { value: 0, message: "Cannot be negative" } })}
                  />
                  {errors.cash_out && <p className="text-red-500 text-xs">{errors.cash_out.message}</p>}
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5 single">
                <Label htmlFor="payment_mode" className="text-sm">Payment Mode <span className="text-red-500">*</span></Label>
                <select
                  id="payment_mode"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  {...register("payment_mode", { required: "Payment mode is required" })}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
                {errors.payment_mode && <p className="text-red-500 text-xs">{errors.payment_mode.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description <span className="text-red-500">*</span></Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="e.g. Give more details...."
                  {...register("description", { required: "Description is required" })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
              </div>

              {/* Closing Balance Preview */}
              <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">Closing Balance (auto-calculated)</span>
                <span className={`text-lg font-bold ${closingPreview >= 0 ? "text-purple-700" : "text-red-600"}`}>
                  ₹{closingPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-sm">Note</Label>
                <textarea
                  id="note"
                  rows={3}
                  placeholder="Optional note..."
                  {...register("note")}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 sm:flex-1 h-10">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {submitting ? "Saving..." : isEdit ? "Update Entry" : "Save Entry"}
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
        title={isEdit ? "Confirm Update" : "Confirm Save"}
        message={`Closing balance will be ₹${closingPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Proceed?`}
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
