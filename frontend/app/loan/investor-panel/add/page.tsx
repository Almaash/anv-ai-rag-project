"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

type InvestmentFormValues = {
  investor_id: string;
  investor_unique_id: string;
  investor_type_id: string;
  investor_type_unique_id: string;
  pool_id: string;
  pool_unique_id: string;
  investment_type: string;
  amount: string;
  self_amount: string;
  referral_amount: string;
  total_amount: string;
  date: string;
  rate: string;
  referral_commission: string;
  lockin: string;
  yearly: string;
  maturity: string;
  declaration_text: string;
  declaration_accepted: boolean;
};

/* ================= VALIDATION ================= */
const schema = yup.object({
  investor_id: yup.string().required("Investor is required"),
  investor_unique_id: yup.string().required(),
  investor_type_id: yup.string().required("Investor Type is required"),
  investor_type_unique_id: yup.string().required(),
  pool_id: yup.string().required("Pool is auto-selected based on amount"),
  pool_unique_id: yup.string().required(),
  investment_type: yup.string().required("Investment type is required"),
  self_amount: yup.number().transform((v) => (isNaN(v) ? 0 : v)).min(0, "Min 0"),
  referral_amount: yup.number().transform((v) => (isNaN(v) ? 0 : v)).min(0, "Min 0"),
  amount: yup
    .number()
    .transform((value) => (isNaN(value) ? 0 : value))
    .required("At least one amount is required")
    .positive("Total amount must be positive"),
  date: yup.string().required("Date is required"),
  rate: yup.string().required("Rate is required"),
  referral_commission: yup.string().required("Commission is required"),
  lockin: yup.string().required("Lockin period is required"),
  declaration_accepted: yup.boolean().oneOf([true], "You must accept the declaration"),
  declaration_text: yup.string().required("Declaration statement is required"),
});

export default function AddInvestmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit"); // unique_id for edit mode
  const isEdit = !!editId;
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [investors, setInvestors] = useState<any[]>([]);
  const [investorTypes, setInvestorTypes] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<InvestmentFormValues | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<InvestmentFormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      investment_type: "Monthly",
      rate: "10",
      referral_commission: "1.2",
      lockin: "12",
      date: new Date().toISOString().split("T")[0],
      self_amount: "",
      referral_amount: "",
      amount: "",
      declaration_text: "I hereby declare that the funds invested are from legitimate sources and I accept the terms of this investment for a period of 3 years.",
      declaration_accepted: false
    },
  });

  const watchSelfAmount = watch("self_amount");
  const watchReferralAmount = watch("referral_amount");
  const watchAmount = watch("amount");
  const watchRate = watch("rate");
  const watchDate = watch("date");
  const watchInvestorId = watch("investor_id");
  const watchInvestorTypeId = watch("investor_type_id");
  const watchPoolId = watch("pool_id");

  // Unique ID Syncer Effect
  useEffect(() => {
    const fetchInvestorDetails = async () => {
      if (!watchInvestorId) {
        setSelectedInvestorDetails(null);
        return;
      }

      try {
        const res = await axiosInstance.get(
          `${ProjectApiList.GET_SINGLE_INVESTOR_BASIC_INFO}/${watchInvestorId}`
        );

        if (res.data.success) {
          setSelectedInvestorDetails(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch investor details");
      }
    };

    fetchInvestorDetails();
  }, [watchInvestorId]);

  useEffect(() => {
    if (watchPoolId) {
      const p = pools.find(i => String(i.unique_id || i.id) === String(watchPoolId));
      if (p) {
        setValue("pool_unique_id", p.unique_id || p.pool_unique_id || "");
      }
    }
  }, [watchPoolId, pools, setValue]);

  // Sync Total Amount
  useEffect(() => {
    const self = parseFloat(watchSelfAmount) || 0;

    // Only self investment goes to main amount
    setValue("amount", self.toString());
    setValue("total_amount", self.toString());

  }, [watchSelfAmount, setValue]);

  const [selectedInvestorDetails, setSelectedInvestorDetails] = useState<any>(null);

  // Load existing investment data in edit mode
  useEffect(() => {
    if (!editId) return;
    const fetchExisting = async () => {
      try {
        setEditLoading(true);
        const res = await axiosInstance.get(`${ProjectApiList.GET_INVESTOR_INVESTMENTS}/${editId}`);
        if (res.data.success) {
          const d = res.data.data;
          const inv = d.investment || d;
          setValue("investor_id", String(inv.investor_id || ""));
          setValue("investor_unique_id", inv.investor_unique_id || "");
          setValue("investor_type_id", String(inv.investor_type_id || inv.investor_type?.unique_id || inv.investor_type?.id || ""));
          setValue("investor_type_unique_id", inv.investor_type_unique_id || inv.investor_type?.unique_id || "");
          setValue("pool_id", String(inv.pool_id || inv.pool?.unique_id || inv.pool?.id || ""));
          setValue("pool_unique_id", inv.pool_unique_id || inv.pool?.unique_id || "");
          setValue("self_amount", String(inv.self_amount || "0"));
          setValue("referral_amount", String(inv.referral_amount || "0"));
          setValue("amount", String(inv.amount || "0"));
          setValue("total_amount", String(inv.total_amount || "0"));
          setValue("date", inv.date ? inv.date.split("T")[0] : "");
          setValue("rate", String(inv.rate || "10"));
          setValue("referral_commission", String(inv.referral_commission || "1.2"));
          setValue("lockin", String(inv.lockin || ""));
          setValue("yearly", String(inv.yearly || ""));
          setValue("maturity", String(inv.maturity || ""));
          setValue("declaration_text", inv.declaration_text || "");
          setValue("declaration_accepted", Boolean(inv.declaration_accepted));
        }
      } catch {
        toast.error("Failed to load investment data");
      } finally {
        setEditLoading(false);
      }
    };
    fetchExisting();
  }, [editId]);

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const user = stored ? JSON.parse(stored) : null;
        const branchId = user?.branch_id || user?.branch || undefined;
        const cmsAdminId = user?.cms_admin || user?.created_by || undefined;

        const isInvestor = user?.role === "investor";

        const [investorRes, typeRes, poolRes] = await Promise.all([
          axiosInstance.get(ProjectApiList.GET_INVESTOR_BASIC_INFO, {
            params: {
              branch_id: branchId,

              ...(isInvestor
                ? {
                  unique_id: user?.unique_id,
                }
                : {
                  cms_admin_id: cmsAdminId,
                }),
            },
          }),

          axiosInstance.get(ProjectApiList.GET_INVESTOR_TYPES, {
            params: {
              branch_id: branchId,
              cms_admin_id: cmsAdminId,
            },
          }),

          axiosInstance.get(ProjectApiList.GET_MONEY_POOLS, {
            params: {
              branch_id: branchId,
              cms_admin_id: cmsAdminId,
            },
          }),
        ]);
        setInvestors(investorRes.data.data || []);
        setInvestorTypes(typeRes.data.data || []);
        setPools(poolRes.data.data || []);
      } catch (error) {
        toast.error("Failed to load required data");
      }
    };
    fetchData();
  }, []);

  // Update selected unique IDs
  useEffect(() => {
    const inv = investors.find((i) => i.id.toString() === watchInvestorId);
    if (inv) {
      setValue("investor_unique_id", inv.unique_id);
    }
  }, [watchInvestorId, investors, setValue]);

  useEffect(() => {
    const type = investorTypes.find((t) => String(t.unique_id || t.id) === String(watchInvestorTypeId));
    if (type) {
      setValue("investor_type_unique_id", type.unique_id || type.name);
    }
  }, [watchInvestorTypeId, investorTypes, setValue]);

  useEffect(() => {
    const pool = pools.find(p => String(p.unique_id || p.id) === String(watchPoolId));
    if (pool) {
      setValue("pool_unique_id", pool.unique_id || pool.pool_unique_id || pool.name);
    }
  }, [watchPoolId, pools, setValue]);

  // Update selected investor details
  // useEffect(() => {
  //   if (watchInvestorId) {
  //     const inv = investors.find((i) => i.id.toString() === watchInvestorId);
  //     setSelectedInvestorDetails(inv || null);
  //   } else {
  //     setSelectedInvestorDetails(null);
  //   }
  // }, [watchInvestorId, investors]);

  // Pool Auto-Select & Calculations
  useEffect(() => {
    const amount = parseFloat(watchSelfAmount) || 0;
    const referralAmount = parseFloat(watchReferralAmount) || 0;
    const rate = parseFloat(watchRate) || 0;
    const refRate = parseFloat(watch("referral_commission")) || 0;
    const charge = 5; // Standard 5% charge from calculator

    // ✅ Pool logic
    if (amount > 0) {
      const matchingPool = pools.find(
        (p) => amount >= p.limit_from && amount <= p.limit_to
      );

      if (matchingPool) {
        setValue("pool_id", String(matchingPool.unique_id || matchingPool.id));
        setValue("pool_unique_id", String(matchingPool.unique_id || matchingPool.pool_unique_id || ""));
      } else {
        setValue("pool_id", "");
        setValue("pool_unique_id", "");
        // setError("pool_id", {
        //   type: "manual",
        //   message: "No money pool available for this investment amount",
        // });
      }
    } else {
      setValue("pool_id", "");
      setValue("pool_unique_id", "");
    }

    // ✅ Investment Calculator Logic (Weekly Compounding for 3 Years)
    if ((amount > 0 || referralAmount > 0) && (rate > 0 || refRate > 0)) {
      const years = 3;
      const totalWeeks = years * 52;

      let grossSelfTotal = 0;
      let grossRefTotal = 0;
      let netClosing = 0;

      for (let i = 1; i <= totalWeeks; i++) {
        let weeklySelf = (amount + netClosing) * (rate / 100 / 52);
        let weeklyRef = referralAmount * (refRate / 100 / 52);

        grossSelfTotal += weeklySelf;
        grossRefTotal += weeklyRef;

        let totalGross = grossSelfTotal + grossRefTotal;
        netClosing = totalGross * (1 - charge / 100);
      }

      const yearlyProfit = Math.round(netClosing / years);
      const maturity = Math.round(amount + netClosing);

      setValue("yearly", yearlyProfit.toString());
      setValue("maturity", maturity.toString());
    } else {
      setValue("yearly", "0");
      setValue("maturity", "0");
    }

  }, [watchSelfAmount, watchReferralAmount, watchRate, watch("referral_commission"), pools, setValue, setError]);

  const onSubmit = async (data: InvestmentFormValues) => {
    setFormData(data);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!formData) return;
    setFieldErrors({});
    const toastId = toast.loading("Saving investment...");
    try {
      setLoading(true);

      // Calculate lockin date (3 years from investment date) if required by backend as date
      const lockinDate = new Date(new Date(formData.date).setFullYear(new Date(formData.date).getFullYear() + 3))
        .toISOString().split('T')[0];

      const payload = {
        ...formData,
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
          return user?.cms_admin || user?.created_by || null;
        })(),
      };

      const res = isEdit
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_INVESTOR_INVESTMENT}/${editId}`, payload)
        : await axiosInstance.post(ProjectApiList.CREATE_INVESTOR_INVESTMENT, payload);
      if (res.data.success) {
        toast.success(isEdit ? "Investment updated successfully" : "Investment added successfully", { id: toastId });
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

  useEffect(() => {
    if (!selectedInvestorDetails) return;

    if (selectedInvestorDetails.total_referral_bonus) {
      const referralBonus = Number(selectedInvestorDetails.total_referral_bonus || 0);

      if (!isNaN(referralBonus)) {
        setValue("referral_amount", referralBonus.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    } else {
      setValue("referral_amount", "0", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [selectedInvestorDetails, setValue]);

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

  const isPoolValid = !!watchPoolId;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {editLoading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Investment Data...</p>
        </div>
      )}
      <div className="bg-white border rounded-lg p-6 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800">{isEdit ? "Edit Investment" : "Confirm New Investment"}</h1>
          <button
            onClick={() => router.back()}
            className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* ================= INVESTMENT INFO ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Investment Information
            </h2>
            <hr className="my-2" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ================= LEFT SIDE ================= */}
              <div className="space-y-4">

                {/* Investor Name */}
                <div>
                  <label className={labelClass}>Investor Name *</label>
                  <select {...registerWithRef("investor_id")} className={fieldErrorClass("investor_id")}>
                    <option value="">Select Investor</option>
                    {investors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.first_name} {i.last_name} ({i.unique_id})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInvestorDetails && (
                  <div className="mt-3 p-4 rounded-lg border bg-gray-50 shadow-sm animate-in fade-in duration-200">

                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">
                      Investor Details
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-sm">

                      <div>
                        <span className="text-gray-400 text-xs">Name</span>
                        <p className="font-semibold text-gray-800">
                          {selectedInvestorDetails.first_name} {selectedInvestorDetails.last_name}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400 text-xs">Investor ID</span>
                        <p className="font-semibold text-gray-800">
                          {selectedInvestorDetails.unique_id}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400 text-xs">Mobile</span>
                        <p className="font-semibold text-gray-800">
                          {selectedInvestorDetails.mobile || "-"}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400 text-xs">Email</span>
                        <p className="font-semibold text-gray-800">
                          {selectedInvestorDetails.email || "-"}
                        </p>
                      </div>
                      {/* 
                        <div className="col-span-2">
                          <span className="text-gray-400 text-xs">Address</span>
                          <p className="font-semibold text-gray-800 truncate">
                            {selectedInvestorDetails.current_address || "-"}
                          </p>
                        </div> */}

                    </div>
                  </div>
                )}

                {/* Self Investment */}
                <div>
                  <label className={labelClass}>Self Investment (₹)</label>
                  <input
                    type="number"
                    {...registerWithRef("self_amount")}
                    className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    placeholder="Enter self amount"
                  />
                </div>

                {/* Referral Investment */}
                <div>
                  <label className={labelClass}>Referral Investment (₹)</label>
                  <input
                    type="number"
                    {...registerWithRef("referral_amount")}
                    className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    placeholder="Enter referral amount"
                    readOnly
                  />
                </div>

                {/* Investment Start Date */}
                <div>
                  <label className={labelClass}>Investment Start Date *</label>
                  <input
                    type="date"
                    {...registerWithRef("date")}
                    className={fieldErrorClass("date")}
                  />
                </div>

                {/* Lock-in Period */}
                <div>
                  <label className={labelClass}>Lock-in Period</label>
                  <input
                    type="text"
                    readOnly
                    value="3 Years"
                    className={`${inputClass} bg-gray-100`}
                  />
                </div>

                {/* Allocation Charges */}
                <div>
                  <label className={labelClass}>Allocation Charges</label>
                  <input
                    type="text"
                    readOnly
                    value="5% per year"
                    className={`${inputClass} bg-gray-100`}
                  />
                </div>

              </div>

              {/* ================= RIGHT SIDE ================= */}
              <div className="space-y-4">

                {/* Investor Type */}
                <div>
                  <label className={labelClass}>Investor Type *</label>
                  <select {...registerWithRef("investor_type_id")} className={fieldErrorClass("investor_type_id")}>
                    <option value="">Select Type</option>
                    {investorTypes.map((t) => (
                      <option key={t.id} value={String(t.unique_id || t.id)}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Money Pool */}
                <div>
                  <label className={labelClass}>Money Pool</label>
                  <select
                    disabled
                    {...register("pool_id")}
                    className={`${inputClass} ${!watchPoolId && parseFloat(watchAmount) > 0 && pools.length > 0 ? 'bg-red-50 border border-red-300' : 'bg-gray-100'}`}
                  >
                    <option value="">{!watchPoolId && parseFloat(watchAmount) > 0 ? 'No pool matched' : 'Auto Selected'}</option>
                    {pools.map((p) => (
                      <option key={p.id} value={String(p.unique_id || p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {!watchPoolId && parseFloat(watchAmount) > 0 && pools.length > 0 && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      ⚠️ No pool available for ₹{Number(watchAmount).toLocaleString('en-IN')}. Please adjust amount or add a pool.
                    </p>
                  )}
                </div>

                {/* ROI */}
                <div>
                  <label className={labelClass}>Target ROI (%)</label>
                  <input
                    type="number"
                    readOnly
                    {...registerWithRef("rate")}
                    className={`${inputClass} bg-gray-100`}
                  />
                </div>

                {/* Commission */}
                <div>
                  <label className={labelClass}>Referral Commission (%)</label>
                  <input
                    type="number"
                    readOnly
                    {...registerWithRef("referral_commission")}
                    className={`${inputClass} bg-gray-100`}
                  />
                </div>

                {/* Total */}
                <div className="bg-blue-50 p-3 rounded-md border">
                  <p className="text-xs text-gray-500">Total Investment</p>
                  <p className="text-lg font-bold text-blue-700">
                    ₹ {(Number(watchAmount) || 0).toLocaleString("en-IN")}
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* ================= CALCULATION PREVIEW ================= */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 grid grid-cols-2 row-gap-6 gap-x-8">
            <div>
              <label className="text-xs  font-bold text-blue-600  block mb-1">Target Returned Amount (Yearly)</label>
              <p className="text-xl font-bold text-gray-800">₹ {Number(watch("yearly") || 0).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <label className="text-xs  font-bold text-blue-600  block mb-1">Maturity value (After 3yr & Allocation Charges)</label>
              <p className="text-xl font-bold text-gray-800">₹ {Number(watch("maturity") || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="col-span-2 pt-4 mt-2 border-t border-blue-100/50">
              <label className="text-xs  font-bold text-orange-600  mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lock-in Period End Date (Maturity Date)
              </label>
              <p className="text-sm font-bold text-gray-700">
                {watchDate ? (
                  new Date(new Date(watchDate).setFullYear(new Date(watchDate).getFullYear() + 3)).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })
                ) : (
                  "Select start date first"
                )}
              </p>
            </div>
          </div>

          {/* ================= DECLARATION ================= */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Legal Compliance & Declaration
            </h3>
            <div className="space-y-4">
              <textarea
                {...register("declaration_text")}
                className={`${inputClass} h-16 resize-none bg-white`}
                placeholder="Enter declaration text..."
              />
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register("declaration_accepted")}
                  className="mt-1 w-4 h-4 border-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] font-semibold text-gray-600 group-hover:text-blue-700 transition-colors">
                  {watch("declaration_text")}
                </span>
              </label>
              {errors.declaration_accepted && (
                <p className="text-xs text-red-500 font-bold">{errors.declaration_accepted.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading || !isPoolValid}
              className="bg-blue-600 text-white px-10 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-300/50 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : isEdit ? "Update Investment" : "Confirm Investment"}
            </button>
          </div>
        </form>
      </div>

      <SimpleConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isEdit ? "Confirm Update" : "Confirm Investment"}
        message={isEdit ? "Are you sure you want to update this investment?" : "Are you sure you want to register this new investment? Please verify all details before proceeding."}
        confirmText={isEdit ? "Update & Save" : "Confirm & Save"}
        cancelText="Review Again"
        onConfirm={handleConfirmedSubmit}
        loading={loading}
      />
    </div>
  );
}

