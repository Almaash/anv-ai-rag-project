"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

// import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import axiosInstance from "@/app/api/axiosInstance";

// const staticApplications = [
//   {
//     loan_application_id: "APP1001",
//     loan_amount: 50000,
//     interest_rate: 29,
//     loan_tenure_months: 18,
//     monthly_income: 35000,
//     employment_type: "Salaried",
//     loan_purpose: "Business",
//     application_status: "approved",
//     applied_date: "2025-02-10",

//     // 🔴 Disbursement date from application
//     disbursement_date: "2026-03-25",

//     processing_fee_amount: 2000,
//     gst_amount: 360,
//     insurance_amount: 1300,

//     user: {
//       name: "Rahul Sharma",
//       customer_unique_id: "CUS1001",
//     },
//   },
// ];

type FormValues = {
  loan_start_date: string;
  installment_start_date: string;
  installment_end_date: string;
};
// ADD HERE
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
export default function ApplyLoanPage() {
  const router = useRouter();

  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");

  const [feeMaster, setFeeMaster] = useState<any>(null);

  const [appSearch, setAppSearch] = useState("");
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [includeProductInsurance, setIncludeProductInsurance] = useState(false);
  const [insuranceMultiplier, setInsuranceMultiplier] = useState<number>(2);
  const [gstPercentage, setGstPercentage] = useState<number>(0);

  const loanStartDate = watch("loan_start_date");
  const installmentStartDate = watch("installment_start_date");

  const loanAmount = selectedApplication?.loan_amount || 0;
  const interestRate = selectedApplication?.interest_rate || 0;
  const tenure = selectedApplication?.loan_tenure || 0;
  const frequency = selectedApplication?.frequency || "monthly";
  const isProductLoan = String(selectedApplication?.credit_mode || "").toLowerCase() === "product";

  // console.log("Selected Application:", selectedApplication.repayment_day);
  // ✅ 👉 PUT IT HERE
  const getIntervalDays = () => {
    if (frequency === "weekly") return 7;
    if (frequency === "biweekly") return 14;
    return 7; // Default or Monthly (handled separately)
  };

  // Processing Fee: Product = 5%, Cash/others = 4%
  const processingFeePercent = isProductLoan ? 5 : 4;
  const processingFeeAmount = Math.round((loanAmount * processingFeePercent) / 100);

  // GST calculation using editable GST percentage
  const gstAmount = Math.round(
    (processingFeeAmount * gstPercentage) / 100
  );

  // Insurance = LoanAmount * 1.3% * multiplier (1 or 2)
  const baseInsuranceAmount = Math.round(
    loanAmount * 0.013 * (insuranceMultiplier || 1)
  );

  const insuranceAmount = isProductLoan
    ? (includeProductInsurance ? baseInsuranceAmount : 0)
    : baseInsuranceAmount;


  const disbursementDateObj = selectedApplication?.disbursement_date
    ? new Date(selectedApplication.disbursement_date)
    : null;


  let extraDays = 0;

  if (disbursementDateObj && installmentStartDate) {

    const emiStart = new Date(installmentStartDate);

    const diffDays =
      (emiStart.getTime() - disbursementDateObj.getTime()) /
      (1000 * 60 * 60 * 24);

    extraDays = Math.max(0, Math.round(diffDays - 30));

  }

  const extraInterest = Math.round(
    loanAmount *
    (interestRate / 100 / 365) *
    extraDays
  );


  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const parseProductAttributes = (value: any): Record<string, any> => {
    if (!value) return {};
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    return {};
  };

  const fetchFeeMaster = async () => {
    try {
      const user = getLoggedInUser();
      if (!user) return;

      const res = await axiosInstance.get(ProjectApiList.api_getFeeMaster, {
        params: {
          user_id: user.user_id,
          branch_id: user.branch,
          cms_admin_id: user.cms_admin,
        },
      });

      if (res.data.success) {
        setFeeMaster(res.data.data?.[0] || null);
      }
    } catch (err) {
      console.error("Fee master fetch failed", err);
    }
  };


  useEffect(() => {
    fetchApplications();
    fetchFeeMaster();
  }, []);

  useEffect(() => {
    if (feeMaster?.gst_percentage != null) {
      setGstPercentage(feeMaster.gst_percentage);
    }
  }, [feeMaster]);

  useEffect(() => {
  if (!selectedApplication) return;

  // Initialize only once when a different application is selected
  if (isProductLoan) {
    setIncludeProductInsurance(false);
  } else {
    setIncludeProductInsurance(true);
  }
}, [selectedApplication?.loan_application_id]);

  const fetchApplications = async () => {
    try {
      const userData = localStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : (user?.cms_admin_id || user?.cms_admin || "");

      const res = await axiosInstance.get(ProjectApiList.GET_ALL_RAW_DISBURSEMENTS, {
        params: {
          search: "",
          is_loan_started: false,
          branch_id: user?.branch_id || user?.branch || "",
          cms_admin_id: cmsAdminId,
        },
      });

      const data = res.data;

      if (data.success) {
        const mapped = data.data
          .filter((item: any) => item.is_disbursed === 1) // still keep if needed
          .map((item: any) => ({
            disbursement_id: item.disbursement_id,
            loan_application_id: item.loan_application_id,
            disbursement_date: item.date_of_disbursement,
            booking_date: item.booking_date,
            disbursement_status: item.disbursement_status,
            customer_unique_id: item.customer_unique_id,

            loan_amount: item.loan_amount ?? null,
            interest_rate: item.interest_rate ?? null,
            loan_tenure_months: item.loan_tenure_months ?? null,
            processing_fee_amount: item.processing_fee_amount ?? null,
            gst_amount: item.gst_amount ?? null,
            insurance_amount: item.insurance_amount ?? null,

            user: {
              name: item.customer_name,
              customer_unique_id: item.customer_unique_id,
            },
          }));

        setApplications(mapped);
      }
    } catch (err) {
      console.error("Fetch applications error:", err);
      toast.error("Failed to fetch applications");
    }
  };

  const fetchDisbursementDetails = async (disbursementId: string) => {
    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.api_getDisbursementCompleteDetails}?disbursement_id=${disbursementId}`
      );

      const data = res.data;

      if (data.success) {
        const { disbursement, credit_application_form, customer, cam } = data.data;

        const frequency = credit_application_form?.frequency || "monthly";
        const tenure = parseInt(credit_application_form?.tenure_option || "0");
        const creditMode = String(credit_application_form?.credit_mode || "").toLowerCase();

        setSelectedApplication({
          disbursement_id: disbursement.disbursement_id,
          loan_application_id: disbursement.loan_application_id,
          disbursement_date: disbursement.date_of_disbursement,
          booking_date: disbursement.booking_date,
          disbursement_status: disbursement.disbursement_status,
          customer_unique_id: disbursement.customer_unique_id,
          agent_unique_id: credit_application_form.agent_unique_id,

          loan_amount: credit_application_form?.credit_applied_for ?? null,
          interest_rate: creditMode === "product" ? 0 : (cam?.interest_rate ?? 0),
          frequency,
          repayment_day: credit_application_form?.repayment_day,
          loan_tenure: tenure,
          credit_mode: credit_application_form?.credit_mode,
          products: credit_application_form?.products || [],
          product_code: credit_application_form?.products?.[0]?.product_code ?? null,
          product_attributes: credit_application_form?.products?.[0]?.product_attributes ?? null,
          product_quantity: credit_application_form?.products?.[0]?.product_quantity ?? 1,
          customer_phone: customer?.contact_number_1,

          processing_fee_amount: feeMaster?.processing_fee ?? 0,
          gst_amount:
            (credit_application_form?.credit_applied_for || 0) *
            (feeMaster?.gst_percentage || 0) /
            100,
          insurance_amount: null,

          user: {
            name: `${customer?.first_name || ""} ${customer?.last_name || ""}`,
            customer_unique_id: customer?.customer_unique_id,
          },
        });
      }
    } catch (error) {
      console.error("Fetch disbursement details error:", error);
      toast.error("Failed to fetch disbursement details");
    }
  };

  const emi = schedule.length ? schedule[0].installment : 0;

  const total = Math.round(
    schedule.reduce((sum, row) => sum + row.installment, 0)
  );


  const interest = Math.round(
    schedule.reduce((sum, row) => sum + row.interestDue, 0)
  );

  /* ================= EMI CALCULATION ================= */




  /* ================= LOAN SCHEDULE CALCULATION ================= */

  const generateLoanSchedule = (
    principal: number,
    annualRate: number,
    tenure: number
  ) => {

    const rate =
      frequency === "weekly"
        ? annualRate / 52 / 100
        : frequency === "biweekly"
          ? annualRate / 26 / 100
          : annualRate / 12 / 100;

    const emi = rate === 0
      ? Math.round(principal / tenure)
      : Math.round(
        (principal * rate * (Math.pow(1 + rate, tenure))) /
        (Math.pow(1 + rate, tenure) - 1)
      );

    let balance = Math.round(principal);

    const schedule = [];

    for (let period = 1; period <= tenure; period++) {

      let interestDue = Math.round(balance * rate);

      // Add extra interest for first EMI
      if (period === 1 && extraDays > 0) {
        interestDue += extraInterest;
      }

      let principalDue = Math.round(emi - interestDue);

      if (period === tenure) {
        principalDue = balance;
      }

      const outstandingBalance = Math.round(balance - principalDue);

      schedule.push({
        period,
        principalOutstanding: Math.round(balance),
        principalDue,
        interestDue,
        installment: Math.round(principalDue + interestDue),
        outstandingBalance,
      });

      balance = outstandingBalance;
    }

    return schedule;
  };


  useEffect(() => {

    if (loanAmount > 0 && interestRate >= 0 && tenure > 0) {

      const data = generateLoanSchedule(loanAmount, interestRate, tenure);

      setSchedule(data);
    }

  }, [loanAmount, interestRate, tenure, frequency]);
  /* ================= INSTALLMENT END DATE ================= */

  useEffect(() => {
    if (installmentStartDate && tenure) {
      const start = new Date(installmentStartDate);
      const end = new Date(start);

      if (frequency === "monthly") {
        end.setMonth(end.getMonth() + tenure - 1);
      } else {
        end.setDate(end.getDate() + (tenure - 1) * getIntervalDays());
      }

      setValue("installment_end_date", formatLocalDate(end));
    }

  }, [installmentStartDate, tenure, frequency, setValue]);

  const disbursementAmount = Math.round(
    loanAmount -
    processingFeeAmount -
    gstAmount -
    insuranceAmount
  );

  const inputClass =
    "border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";

  /* ================= CREDIT SUMMARY VALUES ================= */

  const creditCycle = "Cycle-01";

  const disLoanNumber = selectedApplication?.disbursement_id || "-";

  const disbursementDate = selectedApplication?.disbursement_date
    ? new Date(selectedApplication.disbursement_date).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    )
    : "-";


  useEffect(() => {
    if (!loanStartDate) return;

    if (isProductLoan && (frequency === "weekly" || frequency === "biweekly")) {
      const loanDate = new Date(loanStartDate);
      const currentDay = loanDate.getDay(); // 0-6 (Sun-Sat)
      const dayMap: { [key: string]: number } = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };

      const repaymentDayName = selectedApplication?.repayment_day?.toLowerCase();
      // Use predefined repayment day OR default to Monday (1) if not available
      const targetDay = dayMap[repaymentDayName] ?? 1;

      if (targetDay !== undefined) {
        let installmentDate = new Date(loanDate);

        // Logical check based on updated user's rules:
        if (currentDay === 0 || currentDay === 6) {
          // If user somehow selects Sat/Sun, clear the installment dates
          setValue("installment_start_date", "");
          setValue("installment_end_date", "");
          return;
        }

        if (currentDay === 1 || currentDay === 2) {
          // Rule for Mon (1) or Tue (2) Start Date:
          // We look at the repayment day (targetDay).

          let daysToRepayment = (targetDay - currentDay + 7) % 7;

          // Updated Rule: If start is Mon/Tue and repayment is Wed/Thu/Fri/Sat/Sun, 
          // skip the immediate occurrence and go to the next week.
          // User said: "if repaymnet day is thursday friday or wednessday and i choose... monday so... skip the current week"
          // We already skip for same day (0) or tomorrow (1). 
          // Now we also explicitly skip if it's Wed(3), Thu(4), Fri(5).

          let finalDaysToAdd;
          if (daysToRepayment === 0 || daysToRepayment === 1 || [3, 4, 5].includes(targetDay)) {
            finalDaysToAdd = daysToRepayment + 7;
          } else {
            finalDaysToAdd = daysToRepayment;
          }

          installmentDate.setDate(loanDate.getDate() + finalDaysToAdd);
        } else if ([3, 4, 5].includes(currentDay)) {
          // Rule 2: Wed, Thu, Fri -> ALWAYS add a full week buffer (next week's occurrence)
          let daysToRepayment = (targetDay - currentDay + 7) % 7;
          const finalDaysToAdd = daysToRepayment + 7;
          installmentDate.setDate(loanDate.getDate() + finalDaysToAdd);
        }

        setValue("installment_start_date", formatLocalDate(installmentDate));
        return;
      }
    }

    const loanDate = new Date(loanStartDate);

    const nextMonthEMI = new Date(
      loanDate.getFullYear(),
      loanDate.getMonth() + 1,
      3
    );

    const diffDays =
      (nextMonthEMI.getTime() - loanDate.getTime()) /
      (1000 * 60 * 60 * 24);

    let emiDate;

    if (diffDays >= 30) {
      emiDate = nextMonthEMI;
    } else {
      emiDate = new Date(
        loanDate.getFullYear(),
        loanDate.getMonth() + 2,
        3
      );
    }

    setValue(
      "installment_start_date",
      formatLocalDate(emiDate)
    );
    console.log("Local:", emiDate);
    console.log("ISO:", emiDate.toISOString());
  }, [loanStartDate, setValue, isProductLoan, frequency, selectedApplication?.repayment_day]);

  // const calculateLoanSchedule = (
  //   principal: number,
  //   annualRate: number,
  //   months: number
  // ) => {

  //   const monthlyRate = annualRate / 12 / 100;

  //   const emi =
  //     (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
  //     (Math.pow(1 + monthlyRate, months) - 1);

  //   let balance = principal;

  //   const schedule = [];

  //   for (let period = 1; period <= months; period++) {

  //     const interestDue = balance * monthlyRate;

  //     const principalDue = emi - interestDue;

  //     const outstanding = balance - principalDue;

  //     schedule.push({
  //       period,
  //       principalOutstanding: balance,
  //       principalDue,
  //       interestDue,
  //       installment: emi,
  //       outstandingBalance: outstanding,
  //     });

  //     balance = outstanding;
  //   }

  //   return schedule;
  // };

  // const schedule = calculateLoanSchedule(
  //   loanAmount,
  //   interestRate,
  //   tenureMonths
  // );

  const getInstallmentDate = (period: number) => {
    if (!installmentStartDate) return "-";

    const date = new Date(installmentStartDate);

    if (frequency === "monthly") {
      date.setMonth(date.getMonth() + period - 1);
    } else {
      date.setDate(date.getDate() + (period - 1) * getIntervalDays());
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  // console.log(selectedApplication,"===================>")
  const startLoan = async () => {
    if (!formData) return;

    const user = getLoggedInUser();

    if (!user) {
      toast.error("User not found");
      return;
    }

    try {
      setLoading(true);

      if (!selectedApplication) {
        toast.error("Please select application");
        return;
      }

      const payload = {
        loan_application_id: selectedApplication.loan_application_id,
        customer_unique_id: selectedApplication.customer_unique_id,
        branch_id: user.branch,

        cms_admin_id:
          user?.role?.toLowerCase() === "cms_admin"
            ? user?.user_id
            : (user?.cms_admin_id || user?.cms_admin || ""),

        agent_unique_id: selectedApplication.agent_unique_id,
        disbursement_id: selectedApplication.disbursement_id,
        loan_amount: loanAmount,
        interest_rate: interestRate,
        tenure: tenure,
        frequency: frequency,
        processing_fee: processingFeeAmount,
        gst_amount: gstAmount,
        insurance_amount: insuranceAmount,
        loan_start_date: formData.loan_start_date,
        installment_start_date: formData.installment_start_date,
      };

      // console.log("Starting loan with payload:", payload);

      const res = await axiosInstance.post(ProjectApiList.START_LOAN, payload);

      if (res.data.success) {
        // If product loan, inventory order must also succeed — treat both as atomic
        if (selectedApplication.credit_mode === "product" && selectedApplication.products?.length > 0) {
          const inventoryPayload = {
            loan_application_id: selectedApplication.loan_application_id,
            customer_unique_id: selectedApplication.customer_unique_id,
            branch_id: user?.branch || "",
            products: selectedApplication.products.map((p: any) => {
              const attrs = parseProductAttributes(p.product_attributes);
              const attrSummary = Object.keys(attrs).length > 0
                ? Object.keys(attrs).sort().map((k) => `${k}: ${attrs[k]}`).join(" | ")
                : "";
              return {
                product_unique_id: p.product_code,
                quantity: parseInt(p.product_quantity) || 1,
                attribute_summary: attrSummary,
                credit_applied_for: parseFloat(p.credit_applied_for) || 0,
              };
            }),
            loan_detail: {
              ...res.data.data,
              customer_name: selectedApplication.user.name,
              mobile_number: selectedApplication.customer_phone || "",
              remarks: `Order generated for Loan: ${selectedApplication.loan_application_id}`
            }
          };

          const invRes = await axiosInstance.post(ProjectApiList.LOAN_PRODUCT_ORDERS, inventoryPayload);
          if (!invRes.data.success) {
            toast.error(invRes.data.message || "Inventory order failed — loan not confirmed");
            return;
          }
        }

        toast.success("Loan Started Successfully");
        router.push("/loan/loans/allLoans/");
      } else {
        const resp = res.data || {};
        if (resp.errors) {
          const messages = Object.values(resp.errors).flat().filter(Boolean) as string[];
          const combined = messages.join(" ");
          const title = resp.message ? `${resp.message}: ` : "";
          toast.error(title + (combined || "Failed to start loan"));
        } else {
          toast.error(resp.message || "Failed to start loan");
        }
      }

    } catch (error: any) {
      const errorData = error?.response?.data;
      console.error("Start loan error:", error);

      if (errorData?.errors) {
        const messages = Object.values(errorData.errors)
          .flat()
          .filter(Boolean) as string[];
        const combined = messages.join(" ");
        const title = errorData?.message ? `${errorData.message}: ` : "";
        toast.error(title + (combined || "Failed to start loan"));
      } else if (errorData?.message) {
        toast.error(errorData.message);
      } else if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* HEADER */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Start Loan
          </h1>
          <p className="text-sm text-gray-500">
            Create loan from approved application
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-1 text-sm border rounded-md"
        >
          ← Back
        </button>
      </div>

      {/* APPLICATION SELECT */}

      <div ref={dropdownRef} className="relative">

        <label className="text-sm font-medium">
          Select Application
        </label>

        <input
          placeholder="Search application"
          value={
            selectedApplication
              ? selectedApplication.loan_application_id
              : appSearch
          }
          onFocus={() => setShowAppDropdown(true)}
          onChange={(e) => {
            setAppSearch(e.target.value);
            setSelectedApplication(null);
            setShowAppDropdown(true);
          }}
          className={inputClass}
        />

        {showAppDropdown && (
          <div className="absolute w-full bg-white border rounded-lg shadow mt-1">

            {applications.map((app) => (
              <div
                key={app.loan_application_id}
                onClick={() => {
                  setSelectedApplicationId(app.loan_application_id);
                  setShowAppDropdown(false);

                  fetchDisbursementDetails(app.disbursement_id);
                }}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
              >
                <div>
                  <p className="font-medium">
                    {app.loan_application_id}
                  </p>

                  <p className="text-xs text-gray-500">
                    Customer ID: {app.customer_unique_id}
                  </p>

                  <p className="text-xs text-blue-600 font-medium">
                    {app.user?.name}
                  </p>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {selectedApplication && (
        <div>
          <Link
            href={`/loan/caf/viewDetails/?id=${encodeURIComponent(selectedApplication.loan_application_id)}&type=dis`}
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            View CAF
          </Link>
        </div>
      )}

      {/* CREDIT PANEL */}

      {selectedApplication && (

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-12">

            {/* CREDIT DETAILS */}

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-4 border-b pb-2">
                Credit Details
              </h3>

              <div className="space-y-3">

                <Info label="Customer name" value={selectedApplication.user.name} />

                <Info label="Total Credit Limit" value={loanAmount ? `₹${loanAmount}` : "-"} />

                <Info label="Disbursement amount" value={`₹${disbursementAmount}`} />

                <Info
                  label={`Processing Fee (${processingFeePercent}%)`}
                  value={loanAmount ? `₹${processingFeeAmount}` : "-"}
                />

                <div className="space-y-1">
                  <label className="text-sm text-gray-500">GST (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gstPercentage}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setGstPercentage(Number.isNaN(value) ? 0 : Math.max(0, value));
                    }}
                    className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <Info
                  label="GST Amount"
                  value={processingFeeAmount ? `₹${gstAmount}` : "-"}
                />

                <Info
                  label={"Insurance (1.3% × " + insuranceMultiplier + ")"}
                  value={loanAmount ? `₹${insuranceAmount}` : "-"}
                />

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Multiplier</span>
                  <select
                    value={insuranceMultiplier}
                    onChange={(e) => setInsuranceMultiplier(Number(e.target.value))}
                    className="border px-2 py-1 rounded-md text-sm bg-white"
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                  </select>
                </div>
                {isProductLoan && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Include Product Insurance</span>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={includeProductInsurance}
                        onChange={(e) => setIncludeProductInsurance(e.target.checked)}
                      />
                      Apply
                    </label>
                  </div>
                )}
                <Info label="Interest Rate" value={interestRate >= 0 ? `${interestRate}%` : "-"} />

                <Info label="Tenure" value={
                  tenure
                    ? `${tenure} ${frequency === "weekly"
                      ? "weeks"
                      : frequency === "biweekly"
                        ? "bi-weeks"
                        : "months"
                    }`
                    : "-"
                } />

                <Info label="Creadit For" value={isProductLoan ? "Product" : "Cash"} />
                <Info label="Repayment Day" value={selectedApplication.repayment_day} />


              </div>
            </div>


            {/* CREDIT SUMMARY */}

            <div>

              <h3 className="text-sm font-semibold text-gray-800 mb-4 border-b pb-2">
                Credit Summary
              </h3>

              {/* BASIC DETAILS */}

              <div className="space-y-3">
                <Info label="Credit Cycle" value={creditCycle} />

                <Info label="Dis Loan Number" value={selectedApplication ? disLoanNumber : "-"} />

                <Info
                  label={`Installment per ${frequency === "weekly"
                    ? "week"
                    : frequency === "biweekly"
                      ? "2 weeks"
                      : "month"
                    }`}
                  value={emi ? `₹${emi}` : "-"}
                />

                <Info
                  label="Disbursement date"
                  value={selectedApplication?.disbursement_date ? disbursementDate : "-"}
                />

                {selectedApplication?.credit_mode === "product" && (
                  <Info
                    label="Product Quantity"
                    value={selectedApplication.products?.reduce((s: number, p: any) => s + (parseInt(p.product_quantity) || 0), 0) || "-"}
                  />
                )}
              </div>


              {/* LOAN SCHEDULE */}

              <div className="mt-6 pt-4 border-t border-gray-200">

                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                  Loan Schedule
                </p>

                <div className="space-y-3">

                  <Info label="Loan Start Date" value={loanStartDate || "-"} />

                  <Info label="Installment Start Date" value={installmentStartDate || "-"} />

                  <Info label="Last Installment Date" value={watch("installment_end_date") || "-"} />

                </div>

              </div>


              {/* FINANCIAL SUMMARY */}

              <div className="mt-6 pt-4 border-t border-gray-200">

                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                  Financial Summary
                </p>

                <div className="space-y-3">

                  <Info
                    label="Total Payable"
                    value={total ? `₹${total}` : "-"}
                  />
                  <Info
                    label="Total Interest Paid"
                    value={interest >= 0 ? `₹${interest}` : "-"}
                  />
                </div>

              </div>

            </div>

          </div>
        </div>

      )}


      {/* {schedule.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Installment Chart
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Tenure</th>
                  <th className="p-2 border">Principal Outstanding</th>
                  <th className="p-2 border">Principal Due</th>
                  <th className="p-2 border">Interest Due</th>
                  <th className="p-2 border">Installment Due</th>
                  <th className="p-2 border">Outstanding Balance</th>
                </tr>
              </thead>

              <tbody>
                {schedule.map((row) => (
                  <tr key={row.period} className="text-center">
                    <td className="p-2 border">{getInstallmentDate(row.period)}</td>
                    <td className="p-2 border">{row.period}</td>
                    <td className="p-2 border">₹{row.principalOutstanding}</td>
                    <td className="p-2 border">₹{row.principalDue}</td>
                    <td className="p-2 border">₹{row.interestDue}</td>
                    <td className="p-2 border">₹{row.installment}</td>
                    <td className="p-2 border">₹{row.outstandingBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )} */}

      {/* FORM */}

      <form
        onSubmit={handleSubmit((data) => {
          setFormData(data);
          setConfirmOpen(true);
        })}
        className="bg-white p-6 rounded-xl border"
      >

        <h2 className="text-lg font-semibold mb-4">
          Loan Details
        </h2>

        <div className="grid md:grid-cols-2 gap-5">

          <Field label="Interest Rate (%)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={selectedApplication?.interest_rate ?? 0}
              onChange={(e) => {
                if (!selectedApplication) return;

                setSelectedApplication((prev: any) => ({
                  ...prev,
                  interest_rate: Number(e.target.value),
                }));
              }}
              className={inputClass}
            />
          </Field>

          <Field label="Loan Start Date">
            <input
              type="date"
              {...register("loan_start_date")}
              onChange={(e) => {
                const dateVal = e.target.value;

                if (!dateVal) {
                  setValue("loan_start_date", "");
                  setValue("installment_start_date", "");
                  setValue("installment_end_date", "");
                  return;
                }

                const date = new Date(dateVal);

                const day = date.getDay();

                if (day === 0 || day === 6) {
                  toast.error("Saturday and Sunday are not selectable");
                  setValue("loan_start_date", "");
                  setValue("installment_start_date", "");
                  setValue("installment_end_date", "");
                  return;
                }

                setValue("loan_start_date", dateVal);
              }}
              className={inputClass}
            />
          </Field>

          <Field label="Installment Start Date">
            <input
              type="date"
              {...register("installment_start_date")}
              className={inputClass}
              disabled
            />
          </Field>

          <Field label="Installment End Date">
            <input
              type="date"
              {...register("installment_end_date")}
              className={inputClass}
              disabled
            />
          </Field>

        </div>

        <div className="flex justify-end mt-6">
          <button
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {loading ? "Starting..." : "Start Loan"}
          </button>
        </div>

      </form>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-[420px] p-6">

            <h2 className="text-lg font-semibold mb-3">
              Confirm Loan Start
            </h2>

            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to start this loan?
              This will create the loan and EMI schedule.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className={`px-4 py-2 border rounded-md ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                Cancel
              </button>

              <button
                onClick={startLoan}
                disabled={loading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center ${loading ? "opacity-90 cursor-wait" : ""}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Starting...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-sm text-gray-700 font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <p className="text-sm flex justify-between py-1">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </p>
  );
}