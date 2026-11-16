"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "@/app/api/axiosInstance";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ProjectApiList from "@/app/api/ProjectApiList";
import PageSkeleton from "@/components/common/PageSkeleton";

/* ================= TYPES ================= */

type Subscription = {
  id: number;
  start_date: string;
  end_date: string;
  status: "active" | "expired";
  plan_name?: string | null;
  price?: number | null;
  remarks?: string | null;
};

type FormState = {
  start_date: string;
  end_date: string;
  plan_name: string;
  price: string;
  remarks: string;
};

/* ================= PAGE ================= */

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({
    start_date: "",
    end_date: "",
    plan_name: "",
    price: "",
    remarks: "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  /* ================= LOAD FROM API ================= */

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(ProjectApiList.api_getSubscription);
      const sub = res?.data?.data?.subscription;

      if (!sub) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const end = new Date(sub.end_date);
      const expired = end < today;

      const mapped: Subscription = {
        id: sub.id,
        start_date: sub.start_date,
        end_date: sub.end_date,
        status: expired ? "expired" : "active",
        plan_name: sub.plan_name,
        price: Number(sub.price),
        remarks: sub.remarks,
      };

      setSubscription(mapped);
      setIsExpired(expired);
      setIsActive(!expired);
      setIsEditing(expired);

      hydrateForm(mapped);
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  /* ================= HYDRATE FORM ================= */

  const hydrateForm = (data: Subscription | null) => {
    setForm({
      start_date: data?.start_date ?? "",
      end_date: data?.end_date ?? "",
      plan_name: data?.plan_name ?? "",
      price: data?.price ? String(data.price) : "",
      remarks: data?.remarks ?? "",
    });
  };

  /* ================= SAVE TO API WITH CONFIRM ================= */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.start_date || !form.end_date) {
      toast.error("Start date and end date required");
      return;
    }

    const payload = {
      start_date: form.start_date,
      end_date: form.end_date,
      plan_name: form.plan_name,
      price: form.price ? Number(form.price) : 0,
      remarks: form.remarks,
    };

    // store data and open dialog
    setPendingPayload(payload);
    setConfirmOpen(true);
  };

  /* ================= CONFIRM SAVE ================= */

  const confirmSaveSubscription = async () => {
    if (!pendingPayload) return;

    try {
      setConfirmOpen(false);

      toast.loading("Saving subscription...", { id: "sub" });

      await axiosInstance.post(ProjectApiList.api_postSubscription, pendingPayload);

      toast.success("Subscription saved successfully", { id: "sub" });

      await loadSubscription();
      setIsEditing(false);

    } catch (error: any) {
      // console.log(error);

      toast.error(
        error?.response?.data?.message || "Failed to save subscription",
        { id: "sub" }
      );
    }
  };

  /* ================= BADGE ================= */

  const renderStatusBadge = () => {
    if (!subscription?.start_date)
      return (
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
          Not set
        </span>
      );

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs capitalize ${subscription.status === "active"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-700"
          }`}
      >
        {subscription.status}
      </span>
    );
  };

  /* ================= UI ================= */

  if (loading) return <PageSkeleton rows={4} />;


  return (
    <section className="min-h-screen bg-blue-50/40 py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Subscription</h1>
            <p className="text-blue-700 text-sm">Manage your plan</p>
          </div>

          {isActive && !isExpired && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-md border border-blue-200 bg-white text-blue-800 hover:bg-blue-100 text-sm"
            >
              Edit subscription
            </button>
          )}
        </div>

        {/* STATUS CARD */}
        <div className="bg-white border border-blue-100 shadow-sm rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">Status</p>
                {renderStatusBadge()}
              </div>
              <p className="text-sm text-gray-600">
                {subscription
                  ? `Valid from ${subscription.start_date} to ${subscription.end_date}`
                  : "No subscription configured yet."}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">End date</p>
              <p className="text-lg font-semibold text-blue-800">
                {subscription?.end_date || "--"}
              </p>
            </div>
          </div>

          {isExpired && (
            <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              Subscription expired. Update to activate.
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="bg-white border border-blue-100 shadow-sm rounded-lg p-5">
          <form className="space-y-5" onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-blue-800">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  disabled={!isEditing}
                  className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-blue-800">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  disabled={!isEditing}
                  className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-blue-800">
                  Plan Name
                </label>
                <input
                  type="text"
                  placeholder="Ex: Premium / Gold / Trial"
                  value={form.plan_name}
                  onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                  disabled={!isEditing}
                  className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-blue-800">
                  Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="Enter plan price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  disabled={!isEditing}
                  className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-blue-800">
                Remarks / Notes
              </label>
              <textarea
                placeholder="Optional notes about subscription..."
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                disabled={!isEditing}
                className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 min-h-[110px] focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {isEditing && (
              <div className="flex justify-end pt-2">
                <button className="px-5 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition">
                  {subscription ? "Update Subscription" : "Save Subscription"}
                </button>
              </div>
            )}

          </form>
        </div>

      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={subscription ? "Update Subscription" : "Create Subscription"}
        message={
          subscription
            ? "Are you sure you want to update this subscription plan?"
            : "Are you sure you want to create this subscription plan?"
        }
        confirmText="Yes, Save"
        cancelText="Cancel"
        onConfirm={confirmSaveSubscription}
        onCancel={() => setConfirmOpen(false)}
      />

    </section>
  );
}
