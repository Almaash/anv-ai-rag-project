"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

const formSchema = z.object({
  name: z.string().min(1, "Pool name is required"),
  limit_from: z.coerce.number().min(0, "Minimum amount is required"),
  limit_to: z.coerce.number().min(0, "Maximum amount is required"),
  notes: z.string().optional().nullable(),
  status: z.number().int().min(0).max(1),
}).refine((data) => data.limit_to > data.limit_from, {
  message: "Max limit must be strictly greater than Min limit",
  path: ["limit_to"],
});

type FormValues = z.infer<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;

function AddMoneyPoolForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const investorId = searchParams.get("investor_id");
  const fallbackId = searchParams.get("id");
  const activeId = investorId && investorId !== "null" ? investorId : (fallbackId && fallbackId !== "null" ? fallbackId : null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [lastPoolLimit, setLastPoolLimit] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      limit_from: undefined,
      limit_to: undefined,
      notes: "",
      status: 1,
    },
  });

  const currentStatus = watch("status");

  useEffect(() => {
    const fetchLastPool = async () => {
      try {
        const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
        const branchId = user?.branch || user?.branch_id || undefined;

        const res = await axiosInstance.get(ProjectApiList.GET_MONEY_POOLS, {
          params: { branch_id: branchId }
        });
        if (res.data.success && res.data.data.length > 0) {
          const pools = res.data.data as Array<{ limit_to?: number | string }>;
          const maxLimitTo = Math.max(...pools.map((p) => Number(p.limit_to ?? 0)));
          setLastPoolLimit(maxLimitTo);
          if (!activeId) {
            setValue("limit_from", maxLimitTo);
          }
        } else {
          // No pools in this branch - start from 0
          setLastPoolLimit(null);
          if (!activeId) {
            setValue("limit_from", undefined);
          }
        }
      } catch (err) {
        console.error("Error fetching last pool limit", err);
      }
    };

    if (!activeId) {
      fetchLastPool();
    }
  }, [activeId, setValue]);

  useEffect(() => {
    if (activeId) {
      const fetchItem = async () => {
        setFetching(true);
        try {
          const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_MONEY_POOL}/${activeId}`);
          if (res.data.success) {
            const data = res.data.data;
            setValue("name", data.name || "");
            setValue("limit_from", Number(data.limit_from) || 0);
            setValue("limit_to", Number(data.limit_to) || 0);
            setValue("notes", data.notes || "");
            setValue("status", data.status ? 1 : 0);
          }
        } catch (err) {
          console.error("Fetch error", err);
          toast.error("Failed to load money pool data");
        } finally {
          setFetching(false);
        }
      };
      fetchItem();
    }
  }, [activeId, setValue]);

  const handlePreSubmit = (values: FormValues) => {
    setFormData(values);
    setShowConfirm(true);
  };

  const onSubmit = async () => {
    if (!formData) return;
    setLoading(true);
    const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
    const branchId = user?.branch || user?.branch_id || null;
    try {
      if (activeId) {
        const res = await axiosInstance.post(`${ProjectApiList.UPDATE_MONEY_POOL}/${activeId}`, {
          unique_id: investorId && investorId !== "null" ? investorId : undefined,
          name: formData.name,
          limit_from: formData.limit_from,
          limit_to: formData.limit_to,
          notes: formData.notes,
          status: formData.status,
          branch_id: branchId,
          cms_admin_id: user?.cms_admin || user?.user_id || null,
        });
        if (res.data.success) {
          toast.success("Money pool updated successfully");
          router.push("/loan/investor-money-pool");
        }
      } else {
        const res = await axiosInstance.post(ProjectApiList.CREATE_MONEY_POOL, {
          ...formData,
          branch_id: branchId,
          cms_admin_id: user?.cms_admin || user?.user_id || null,
        });
        if (res.data.success) {
          toast.success("Money pool created successfully");
          router.push("/loan/investor-money-pool");
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errors = axiosErr.response?.data?.errors;
      const firstField = errors ? Object.keys(errors)[0] : null;
      const firstError = firstField && errors?.[firstField]?.[0] ? errors[firstField][0] : null;

      console.error("Submit error", err);
      toast.error(firstError || axiosErr.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <Loader2 className="animate-spin mb-2" /> Loading details...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-blue-600 uppercase">
            <span>Loan</span>
            <span className="text-gray-300">/</span>
            <span>Investor</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {activeId ? "Edit Money Pool" : "Add Money Pool"}
          </h1>
          <p className="text-sm text-gray-500">
            {activeId ? "Update existing money pool details." : "Create a new multi-investor money pool."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-8 py-6 border-b bg-gray-50/50 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Money Pool Details</h2>
                <p className="text-sm text-gray-500">Information needed to manage the pool.</p>
            </div>
            {activeId && (
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    ID: {activeId}
                </div>
            )}
        </div>

        <form onSubmit={handleSubmit(handlePreSubmit)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                Pool Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder="Enter pool name"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white ${
                  errors.name ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 font-medium pl-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                Limit From (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  {...register("limit_from")}
                  type="number"
                  step="1"
                  readOnly={lastPoolLimit !== null && !activeId}
                  placeholder="Enter minimum amount"
                  className={`w-full pl-8 pr-4 py-2.5 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white ${
                    errors.limit_from ? "border-red-500 bg-red-50/50" : "border-gray-200"
                  } ${lastPoolLimit !== null && !activeId ? "opacity-70 cursor-not-allowed bg-blue-50/30" : ""}`}
                />
              </div>
              {lastPoolLimit !== null && !activeId && (
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                  Auto-set to {lastPoolLimit} (Sequential to last pool)
                </p>
              )}
              {errors.limit_from && <p className="text-xs text-red-500 font-medium pl-1">{errors.limit_from.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                Limit To (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  {...register("limit_to")}
                  type="number"
                  step="1"
                  placeholder="Enter maximum amount"
                  className={`w-full pl-8 pr-4 py-2.5 bg-gray-50 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white ${
                    errors.limit_to ? "border-red-500 bg-red-50/50" : "border-gray-200"
                  }`}
                />
              </div>
              {errors.limit_to && <p className="text-xs text-red-500 font-medium pl-1">{errors.limit_to.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <div className="flex p-1 bg-gray-100 rounded-xl w-fit min-w-[200px]">
                <button
                  type="button"
                  onClick={() => setValue("status", 1)}
                  className={`flex-1 px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                    currentStatus === 1
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setValue("status", 0)}
                  className={`flex-1 px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                    currentStatus === 0 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Inactive
                </button>
              </div>
              <input type="hidden" {...register("status")} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Additional details about this money pool..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Processing...
                </>
              ) : (
                <>
                  <Save size={20} /> {investorId ? "Update Changes" : "Save Money Pool"}
                </>
              )}
            </button>
          </div>
        </form>

        <SimpleConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          onConfirm={onSubmit}
          title={investorId ? "Update Confirmation" : "Save Confirmation"}
          message={`Are you sure you want to ${investorId ? "update" : "save"} these investor money pool details?`}
        />
      </div>
    </div>
  );
}

export default function MoneyPoolAddPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="animate-spin text-blue-600" />
        </div>
    }>
      <AddMoneyPoolForm />
    </Suspense>
  );
}