"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { useEffect, useRef, useState, Suspense } from "react";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

type InvestmentFormValues = {
  investor_id: string;
  investor_type_id: string;
  pool_id: string;
  investment_type: string;
  amount: string;
  date: string;
  rate: string;
  lockin: string;
  yearly: string;
  maturity: string;
};

/* ================= VALIDATION ================= */
const schema = yup.object({
  investor_id: yup.string().required("Investor is required"),
  investor_type_id: yup.string().required("Investor Type is required"),
  pool_id: yup.string().required("Pool is auto-selected based on amount"),
  investment_type: yup.string().required("Investment type is required"),
  amount: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required("Amount is required")
    .positive("Amount must be positive"),
  date: yup.string().required("Date is required"),
  rate: yup.string().required("Rate is required"),
});

export default function EditInvestmentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    }>
      <EditInvestmentContent />
    </Suspense>
  );
}

function EditInvestmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [investors, setInvestors] = useState<any[]>([]);
  const [investorTypes, setInvestorTypes] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [formDataState, setFormDataState] = useState<InvestmentFormValues | null>(null);
  const [selectedInvestorDetails, setSelectedInvestorDetails] = useState<any>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<InvestmentFormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      investment_type: "Monthly",
      rate: "10",
      lockin: "12",
    },
  });

  const watchAmount = watch("amount");
  const watchRate = watch("rate");
  const watchDate = watch("date");
  const watchInvestorId = watch("investor_id");

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setFetching(true);
        const [investorRes, typeRes, poolRes, investmentRes] = await Promise.all([
          axiosInstance.get(ProjectApiList.GET_INVESTOR_BASIC_INFO),
          axiosInstance.get(ProjectApiList.GET_INVESTOR_TYPES),
          axiosInstance.get(ProjectApiList.GET_MONEY_POOLS),
          axiosInstance.get(`${ProjectApiList.GET_INVESTOR_INVESTMENTS}/${id}`)
        ]);

        setInvestors(investorRes.data.data || []);
        setInvestorTypes(typeRes.data.data || []);
        setPools(poolRes.data.data || []);

        const investmentData = investmentRes.data.data;
        if (investmentData) {
          reset({
            investor_id: investmentData.investor_id?.toString(),
            investor_type_id: String(investmentData.investor_type_id || investmentData.investor_type?.unique_id || investmentData.investor_type?.id || ""),
            pool_id: String(investmentData.pool_id || investmentData.pool?.unique_id || investmentData.pool?.id || ""),
            investment_type: investmentData.investment_type || "Monthly",
            amount: investmentData.amount?.toString(),
            date: investmentData.date,
            rate: investmentData.rate?.toString(),
            lockin: investmentData.lockin,
            yearly: investmentData.yearly?.toString(),
            maturity: investmentData.maturity?.toString(),
          });
        }
      } catch (error) {
        toast.error("Failed to load required data");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, reset]);

  // Update selected investor details
  useEffect(() => {
    if (watchInvestorId) {
      const inv = investors.find((i) => i.id.toString() === watchInvestorId);
      setSelectedInvestorDetails(inv || null);
    } else {
      setSelectedInvestorDetails(null);
    }
  }, [watchInvestorId, investors]);

  // Pool Auto-Select & Calculations
  useEffect(() => {
    const amount = parseFloat(watchAmount);
    if (!isNaN(amount)) {
      const matchingPool = pools.find(
        (p) => amount >= p.limit_from && amount <= p.limit_to
      );
      if (matchingPool) {
        setValue("pool_id", String(matchingPool.unique_id || matchingPool.id));
      } else {
        setValue("pool_id", "");
      }
    } else {
      setValue("pool_id", "");
    }

    // Calculations
    const rate = parseFloat(watchRate);
    if (!isNaN(amount) && !isNaN(rate)) {
      const yearly = Math.round((amount * rate) / 100);
      const chargeRate = 0.02;
      const totalInterest = yearly * 3;
      const charges = amount * chargeRate * 3;
      const maturity = Math.round(amount + totalInterest - charges);
      
      setValue("yearly", yearly.toString());
      setValue("maturity", maturity.toString());
    } else {
      setValue("yearly", "");
      setValue("maturity", "");
    }
  }, [watchAmount, watchRate, pools, setValue]);

  const onSubmit = async (data: InvestmentFormValues) => {
    setFormDataState(data);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!formDataState || !id) return;
    setFieldErrors({});
    const toastId = toast.loading("Updating investment...");
    try {
      setLoading(true);
      const lockinDate = new Date(new Date(formDataState.date).setFullYear(new Date(formDataState.date).getFullYear() + 3))
        .toISOString().split('T')[0];

      const payload = { 
        ...formDataState,
        lockin: lockinDate, 
        investment_type: "Monthly",
        branch_id: (() => {
          const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
          const user = stored ? JSON.parse(stored) : null;
          return user?.branch_id || user?.branch || null;
        })(),
        cms_admin_id: (() => {
          const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
          const user = stored ? JSON.parse(stored) : null;
          return user?.cms_admin || user?.created_by || user?.id || null;
        })(),
      };
      
      const res = await axiosInstance.post(`${ProjectApiList.UPDATE_INVESTOR_INVESTMENT}/${id}`, payload);
      if (res.data.success) {
        toast.success("Investment updated successfully", { id: toastId });
        setShowConfirm(false);
        router.push("/loan/investor-panel");
      }
    } catch (error: any) {
      const response = error?.response?.data;
      if (response?.errors) {
        const backendFieldErrors: Record<string, string> = {};
        Object.keys(response.errors).forEach((field) => {
          setError(field as keyof InvestmentFormValues, {
            type: "server",
            message: response.errors[field][0],
          });
          backendFieldErrors[field] = response.errors[field][0];
        });
        setFieldErrors(backendFieldErrors);
        toast.error(response.errors[Object.keys(response.errors)[0]][0], { id: toastId });
      } else {
        toast.error(response?.message || "Something went wrong", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-gray-50 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-600 outline-none";
  const labelClass = "text-sm mb-1 block";

  const fieldErrorClass = (field: keyof InvestmentFormValues, base = "") =>
    errors[field]?.message || fieldErrors[field]
      ? `${base || inputClass} border border-red-500`
      : base || inputClass;

  const setFieldRef = (field: string, node: HTMLElement | null) => {
    if (node) fieldRefs.current[field] = node;
  };

  const registerWithRef = (field: keyof InvestmentFormValues) => {
    const { ref, ...rest } = register(field);
    return {
      ...rest,
      ref: (el: HTMLSelectElement | HTMLInputElement | null) => {
        setFieldRef(field, el);
        ref(el);
      },
    };
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border rounded-lg p-6 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800">Modify Investment</h1>
          <button
            onClick={() => router.back()}
            className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Update Investment Details
            </h2>
            <hr className="my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Select Investor <span className="text-red-500">*</span></label>
                <select {...registerWithRef("investor_id")} className={fieldErrorClass("investor_id")}>
                  <option value="">Select Investor</option>
                  {investors.map((i) => (
                    <option key={i.id} value={i.id}>{i.first_name} {i.last_name} ({i.unique_id})</option>
                  ))}
                </select>
                {selectedInvestorDetails && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-md text-[11px] space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    <p className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase tracking-tight">Contact</span>
                      <span className="text-gray-700 font-semibold">{selectedInvestorDetails.mobile}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase tracking-tight">Address</span>
                      <span className="text-gray-700 font-semibold truncate max-w-[150px]">{selectedInvestorDetails.current_address}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Investor Type <span className="text-red-500">*</span></label>
                <select {...registerWithRef("investor_type_id")} className={fieldErrorClass("investor_type_id")}>
                  <option value="">Select Type</option>
                  {investorTypes.map((t) => (
                    <option key={t.id} value={String(t.unique_id || t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Investment Amount (₹) <span className="text-red-500">*</span></label>
                <input type="number" {...registerWithRef("amount")} className={fieldErrorClass("amount")} />
              </div>

              <div>
                <label className={labelClass}>Money Pool (Auto-Selected)</label>
                <select disabled {...register("pool_id")} className={`${inputClass} bg-gray-100 cursor-not-allowed opacity-80`}>
                  <option value="">No matching pool found</option>
                  {pools.map((p) => (
                    <option key={p.id} value={String(p.unique_id || p.id)}>{p.name} (₹{p.limit_from} - ₹{p.limit_to})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Investment Date <span className="text-red-500">*</span></label>
                <input type="date" {...registerWithRef("date")} className={fieldErrorClass("date")} />
              </div>

              <div>
                <label className={labelClass}>Target ROI (%) <span className="text-red-500">*</span></label>
                <input type="number" {...registerWithRef("rate")} className={fieldErrorClass("rate")} />
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 grid grid-cols-2 row-gap-6 gap-x-8">
              <div>
                 <label className="text-[10px] uppercase font-bold text-blue-600 tracking-widest block mb-1">Target Returned Amount (Yearly)</label>
                 <p className="text-xl font-bold text-gray-800">₹ {Number(watch("yearly") || 0).toLocaleString("en-IN")}</p>
              </div>
              <div>
                 <label className="text-[10px] uppercase font-bold text-blue-600 tracking-widest block mb-1">Maturity value (for 3 year after deduction of allocation charges)</label>
                 <p className="text-xl font-bold text-gray-800">₹ {Number(watch("maturity") || 0).toLocaleString("en-IN")}</p>
              </div>
              <div className="col-span-2 pt-4 mt-2 border-t border-blue-100/50">
                 <label className="text-[10px] uppercase font-bold text-orange-600 tracking-widest mb-1 flex items-center gap-1">
                    Lock-in Period End Date (3 years by default)
                 </label>
                 <p className="text-sm font-bold text-gray-700">
                    {watchDate ? (
                        new Date(new Date(watchDate).setFullYear(new Date(watchDate).getFullYear() + 3)).toLocaleDateString('en-IN', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                        })
                    ) : (
                        "Select start date first"
                    )}
                 </p>
              </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-10 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-300/50 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Investment"}
            </button>
          </div>
        </form>
      </div>

      <SimpleConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Modification"
        message="Are you sure you want to update this investment record? This change will be reflected across all reports."
        confirmText="Yes, Update"
        cancelText="Review Again"
        onConfirm={handleConfirmedSubmit}
        loading={loading}
      />
    </div>
  );
}
