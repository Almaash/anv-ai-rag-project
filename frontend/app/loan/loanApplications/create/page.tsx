"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import ProjectApiList from "@/app/api/ProjectApiList";


// Validation Schema
const schema = yup.object({
    loan_amount: yup.number().required().min(10000).max(10000000),
    loan_purpose: yup.string().required(),
    interest_rate: yup.string().required(),
    loan_tenure_months: yup.number().required().min(3).max(360),
    monthly_income: yup.number().required().min(10000),
    employment_type: yup.string().required(),

    company_name: yup.string().nullable(),
    work_experience_years: yup.number().required().min(1).max(50),
    existing_loans: yup.string().nullable(),
    collateral_details: yup.string().nullable(),

    salary_slip_document: yup.mixed().nullable(),
    bank_statement_document: yup.mixed().nullable(),
    identity_proof_document: yup.mixed().nullable(),
    address_proof_document: yup.mixed().nullable(),
    other_document_1: yup.mixed().nullable(),
    other_document_2: yup.mixed().nullable(),
});

type ProcessingFeeType = "fixed" | "percentage";

export default function CreateLoanPage() {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(false);
    const [interestList, setInterestList] = useState<any[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [formDataCache, setFormDataCache] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [loggedInUser, setLoggedInUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>("");
    const [pageLoading, setPageLoading] = useState(true);
    const [customerSearch, setCustomerSearch] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);

    const [showDropdown, setShowDropdown] = useState(false);

    const [feeMaster, setFeeMaster] = useState<{
        processing_fee: number;
        gst_percentage: number;
    } | null>(null);

    const [applyProcessingFee, setApplyProcessingFee] = useState(true);
    const [applyGst, setApplyGst] = useState(true);

    const [processingFeeType, setProcessingFeeType] =
        useState<ProcessingFeeType>("fixed");

    const [processingFeePercent, setProcessingFeePercent] = useState<number>(1);



    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setLoggedInUser(parsedUser);
            setUserRole(parsedUser.role);
        }

        // ✅ IMPORTANT
        setPageLoading(false);
    }, []);


    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };



    const fetchCustomers = async (searchValue = "") => {
        const user = getLoggedInUser();

        try {
            setSearchLoading(true);

            const params: any = {
                search: searchValue,
                per_page: 20,
                page: 1,
                user_id: user.user_id,
                branch_id: user.branch_id || user.branch,
                cms_admin_id: user.cms_admin_id || user.cms_admin,
            };

            // ✅ If logged user is customer → filter by their ID
            if (user.role === "customer") {
                params.customer_unique_id = user.customer_unique_id;
            }

            const res = await axiosInstance.get(
                ProjectApiList.api_getAllLonaCustomers,
                { params }
            );

            if (res.data.success) {
                setCustomers(res.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setSearchLoading(false);
        }
    };


   const fetchFeeMaster = async () => {
  const user = getLoggedInUser();
  if (!user) return;

  try {
    const res = await axiosInstance.get("/get-all-fee-masters", {
      params: {
        user_id: user.user_id,
        branch_id: user.role === "customer" ? user.branch_id : user.branch,
        cms_admin_id:
          user.role === "customer" ? user.cms_admin_id : user.cms_admin,
      },
    });

    if (res.data.success) {
      console.log(res.data.data);
      setFeeMaster(res.data.data[0]);
    }
  } catch (error) {
    console.error("Failed to fetch fee master", error);
  }
};



    useEffect(() => {
        if (userRole) {
            fetchCustomers();
        }
    }, [userRole]);

    useEffect(() => {
        fetchFeeMaster();
    }, []);

    useEffect(() => {
        if (userRole === "customer" && customers.length > 0) {
            const user = getLoggedInUser();

            const matchedCustomer = customers.find(
                (c) => c.customer_unique_id === user.customer_unique_id
            );

            if (matchedCustomer) {
                setSelectedCustomerId(matchedCustomer.customer_unique_id);
                setSelectedCustomer(matchedCustomer);

                // 🔥 Auto fill
                setValue("monthly_income", matchedCustomer.monthly_income || "");
                setValue("employment_type", matchedCustomer.employment_type || "");
                setValue("company_name", matchedCustomer.company_name || "");
            }
        }
    }, [customers, userRole, setValue]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);



    // useEffect(() => {
    //     if (
    //         userRole === "customer" &&
    //         loggedInUser &&
    //         customers.length > 0
    //     ) {
    //         const matchedCustomer = customers.find(
    //             (c) => c.customer_unique_id === loggedInUser.customer_unique_id
    //         );

    //         if (matchedCustomer) {
    //             setSelectedCustomerId(matchedCustomer.customer_unique_id);
    //             setSelectedCustomer(matchedCustomer);

    //             // 🔥 AUTO FILL FORM
    //             setValue("monthly_income", matchedCustomer.monthly_income || "");
    //             setValue("employment_type", matchedCustomer.employment_type || "");
    //             setValue("company_name", matchedCustomer.company_name || "");
    //         }
    //     }
    // }, [userRole, loggedInUser, customers, setValue]);


    // useEffect(() => {
    //     if (userRole === "customer" && loggedInUser) {
    //         setSelectedCustomer(loggedInUser);
    //         setSelectedCustomerId(loggedInUser.customer_unique_id);
    //     }
    // }, [userRole, loggedInUser]);


    useEffect(() => {
        const loadInterestRates = async () => {
            try {
                const user = getLoggedInUser();

                //   console.log(user, "============>");

                if (!user) {
                    toast.error("User not found");
                    return;
                }

                const res = await axiosInstance.get(
                    "get-all-interest-rates",
                    {
                        params: {
                            user_id: user.user_id,
                            branch_id:
                                user.role === "customer" ? user.branch_id : user.branch,
                            cms_admin_id:
                                user.role === "customer"
                                    ? user.cms_admin_id
                                    : user.cms_admin,
                        },
                    }
                );

                setInterestList(res.data.data || []);
            } catch (err) {
                toast.error("Failed to load interest rates");
            }
        };

        loadInterestRates();
    }, []);


    const [filePreview, setFilePreview] = useState<Record<string, { url: string; type: string }>>({});

    const handleFileChange = (e: any, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        setFilePreview((prev) => ({
            ...prev,
            [field]: { url, type: file.type },
        }));
    };

    const removeFile = (field: string) => {
        setFilePreview((prev) => {
            const updated = { ...prev };
            delete updated[field];
            return updated;
        });

        const input = document.getElementById(field) as HTMLInputElement;
        if (input) input.value = "";
    };



    const loanAmount = Number(watch("loan_amount"));
    const interestRate = Number(watch("interest_rate"));
    const tenureMonths = Number(watch("loan_tenure_months"));


    const [totalPayable, setTotalPayable] = useState<number | null>(null);
    const [monthlyEmi, setMonthlyEmi] = useState<number | null>(null);


    //  Gst & Fee logic -----------------------------------

    const baseProcessingFee = Number(feeMaster?.processing_fee || 0);
    const gstPercentage = Number(feeMaster?.gst_percentage || 0);

    const interestAmount =
        loanAmount > 0 && interestRate > 0
            ? Math.round((loanAmount * interestRate) / 100)
            : 0;

    // ✅ PROCESSING FEE CALCULATION
    let processingFeeAmount = 0;

    if (applyProcessingFee) {
        if (processingFeeType === "fixed") {
            processingFeeAmount = baseProcessingFee;
        } else {
            processingFeeAmount = Math.round(
                (loanAmount * processingFeePercent) / 100
            );
        }
    }

    // ✅ GST ON INTEREST
    const gstAmount =
        applyGst && interestAmount > 0
            ? Math.round((interestAmount * gstPercentage) / 100)
            : 0;

    const totalWithFees =
        loanAmount > 0
            ? loanAmount +
            interestAmount +
            processingFeeAmount +
            gstAmount
            : null;


    //  Gst & Fee logic -----------------------------------

    useEffect(() => {
        if (
            loanAmount > 0 &&
            interestRate > 0 &&
            tenureMonths > 0
        ) {
            const interest = Math.round((loanAmount * interestRate) / 100);

            const total =
                loanAmount +
                interest +
                processingFeeAmount +
                gstAmount;

            const emi = Math.round(total / tenureMonths);

            setTotalPayable(total);
            setMonthlyEmi(emi);
        } else {
            setTotalPayable(null);
            setMonthlyEmi(null);
        }
    }, [
        loanAmount,
        interestRate,
        tenureMonths,
        processingFeeAmount,
        gstAmount,
    ]);



    const confirmSubmit = async () => {
        if (!formDataCache || !selectedCustomerId) return;

        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) {
                toast.error("User not found");
                return;
            }

            const formData = new FormData();

            // ✅ SYSTEM REQUIRED FIELDS (VERY IMPORTANT)
            formData.append("user_id", user.user_id);

            formData.append(
                "branch_id",
                user.role === "customer" ? user.branch_id : user.branch
            );

            formData.append(
                "cms_admin_id",
                user.role === "customer" ? user.cms_admin_id : user.cms_admin
            );

            // 🔥 Basic Loan Data
            formData.append("customer_unique_id", selectedCustomerId);
            formData.append("loan_amount", formDataCache.loan_amount);
            formData.append("loan_purpose", formDataCache.loan_purpose);
            formData.append("interest_rate", formDataCache.interest_rate);
            formData.append("loan_tenure_months", formDataCache.loan_tenure_months);
            formData.append("monthly_income", formDataCache.monthly_income);
            formData.append("employment_type", formDataCache.employment_type);
            formData.append("company_name", formDataCache.company_name || "");
            formData.append("work_experience_years", formDataCache.work_experience_years);
            formData.append("existing_loans", formDataCache.existing_loans || "");
            formData.append("collateral_details", formDataCache.collateral_details || "");

            // 🔥 Fee & GST Info
            formData.append("apply_processing_fee", String(applyProcessingFee));
            formData.append("apply_gst", String(applyGst));
            formData.append("processing_fee_type", processingFeeType);
            formData.append("processing_fee_amount", String(processingFeeAmount));
            formData.append("gst_amount", String(gstAmount));
            formData.append("total_payable", String(totalWithFees || 0));
            formData.append("monthly_emi", String(monthlyEmi || 0));

            // 🔥 Documents
            [
                "salary_slip_document",
                "bank_statement_document",
                "identity_proof_document",
                "address_proof_document",
                "other_document_1",
                "other_document_2",
            ].forEach((field) => {
                const file = formDataCache[field]?.[0];
                if (file) {
                    formData.append(field, file);
                }
            });

            const res = await axiosInstance.post(
                "/create-loan-application",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (res.data.success) {
                toast.success("Loan application submitted successfully");
                setShowConfirm(false);
                router.push("/loan/loanApplications");
            }

        } catch (error: any) {
            console.error("Loan submission failed", error);

            const response = error?.response?.data;

            if (response?.errors) {
                const allErrors = Object.values(response.errors)
                    .flat()
                    .join("\n");

                toast.error(allErrors);
            } else {
                toast.error(response?.message || "Failed to submit loan application");
            }
        } finally {
            setLoading(false);
        }
    };


    const inputClass =
        "border border-gray-300 bg-white px-3 py-2 rounded-lg w-full text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";


    if (pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-3 text-gray-600">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></span>
                    Loading loan application…
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">

            {/* PAGE HEADER */}

            <div className="flex justify-between items-center pb-5 pl-1">
                {/* LEFT SIDE: Title + Subtitle */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Apply for a Loan Application</h1>
                    <p className="text-gray-600 text-sm mt-1">
                        Provide the necessary details to complete your loan application.
                    </p>
                </div>

                {/* RIGHT SIDE: Back Button */}
                <button
                    onClick={() => router.back()}
                    className="px-3 py-1 rounded-md text-xs 
                bg-white hover:bg-gray-100 
                border border-gray-300 text-gray-700 
                transition shadow-sm"
                >
                    ← Back
                </button>

            </div>

            {/* CUSTOMER SEARCH + SELECT */}
            <div
                ref={dropdownRef}
                className="bg-white p-5 mb-4 rounded-xl border border-gray-200 shadow-sm relative"
            >
                <label className="text-sm font-medium text-gray-700">
                    Select Customer
                </label>

                <input
                    type="text"
                    placeholder="Search customer by name, ID or email..."
                    value={
                        selectedCustomer
                            ? `${selectedCustomer.name} (${selectedCustomer.customer_unique_id})`
                            : customerSearch
                    }
                    onFocus={() => setShowDropdown(true)}
                    onChange={(e) => {
                        const value = e.target.value;
                        setCustomerSearch(value);
                        setSelectedCustomer(null);
                        setSelectedCustomerId("");
                        setShowDropdown(true);

                        fetchCustomers(value);   // 🔥 live search
                    }}
                    disabled={userRole === "customer"}
                    className={`${inputClass} ${userRole === "customer" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                />

                {/* Dropdown */}
                {showDropdown && userRole !== "customer" && (
                    <div className="absolute z-50 mt-1 w-[95%] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {searchLoading && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                Loading customers…
                            </div>
                        )}

                        {!searchLoading && customers.length === 0 && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No customers found
                            </div>
                        )}

                        {!searchLoading &&
                            customers.map((c) => (
                                <div
                                    key={c.customer_unique_id}
                                    onClick={() => {
                                        setSelectedCustomer(c);
                                        setSelectedCustomerId(c.customer_unique_id);
                                        setCustomerSearch("");
                                        setShowDropdown(false);

                                        setValue("monthly_income", c.monthly_income || "");
                                        setValue("employment_type", c.employment_type || "");
                                        setValue("company_name", c.company_name || "");
                                    }}
                                    className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50"
                                >
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {c.customer_unique_id} • {c.email}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>




            {selectedCustomer && (
                <div className="mt-4 mb-4  bg-white border border-gray-200 rounded-lg p-4 text-sm">
                    <h3 className="font-semibold text-gray-800 mb-2">
                        Customer Details
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <p><span className="font-medium">Name:</span> {selectedCustomer.name}</p>
                        <p><span className="font-medium">Customer ID:</span> {selectedCustomer.customer_unique_id}</p>
                        <p><span className="font-medium">Email:</span> {selectedCustomer.email}</p>
                        <p><span className="font-medium">Phone:</span> {selectedCustomer.phone_no}</p>
                    </div>
                </div>
            )}



            <form
                onSubmit={handleSubmit((data) => {
                    if (!selectedCustomerId) {
                        toast.error("Please select a customer");
                        return;
                    }

                    setFormDataCache(data);
                    setShowConfirm(true);
                })}
                className="space-y-10"
            >

                {/* SECTION: LOAN DETAILS */}
                <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan Details</h2>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Loan Amount */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Loan Amount
                            </label>
                            <input
                                type="number"
                                {...register("loan_amount")}
                                className={inputClass}
                                placeholder="e.g., 500000"
                            />
                            {errors.loan_amount && (
                                <p className="text-red-600 text-xs">
                                    {errors.loan_amount.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Loan Purpose
                            </label>
                            <input
                                {...register("loan_purpose")}
                                className={inputClass}
                                placeholder="e.g., Home Renovation"
                            />
                            {errors.loan_purpose && (
                                <p className="text-red-600 text-xs">
                                    {errors.loan_purpose.message}
                                </p>
                            )}
                        </div>

                        {/* Interest Rate */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Interest Rate (%)
                            </label>

                            <select
                                {...register("interest_rate")}
                                className={inputClass}
                            >
                                <option value="">Select Interest Rate</option>

                                {interestList.map((item: any) => (
                                    <option key={item.id} value={item.interest_rate}>
                                        {item.loan_type} — {item.interest_rate}%
                                    </option>
                                ))}
                            </select>

                            {errors.interest_rate && (
                                <p className="text-red-600 text-xs">
                                    {errors.interest_rate.message}
                                </p>
                            )}
                        </div>





                        {/* Loan Purpose */}


                        {/* Loan Tenure */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Loan Tenure (Months)
                            </label>
                            <input
                                type="number"
                                {...register("loan_tenure_months")}
                                className={inputClass}
                                placeholder="e.g., 36"
                            />
                        </div>

                        <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-6">
                            <label className="flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={applyProcessingFee}
                                    onChange={(e) => setApplyProcessingFee(e.target.checked)}
                                    className="accent-blue-600"
                                />
                                Apply Processing Fee
                            </label>

                            <label className="flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={applyGst}
                                    onChange={(e) => setApplyGst(e.target.checked)}
                                    className="accent-blue-600"
                                />
                                Apply GST
                            </label>


                            {applyProcessingFee && (
                                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-5">
                                    {/* Header */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-900">
                                            Processing Fee Configuration
                                        </h4>
                                        <p className="text-xs text-blue-700 mt-0.5">
                                            Choose how the processing fee should be calculated
                                        </p>
                                    </div>

                                    {/* Radio Options */}
                                    <div className="flex flex-wrap gap-6 text-sm text-blue-900">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="processingFeeType"
                                                value="fixed"
                                                checked={processingFeeType === "fixed"}
                                                onChange={() => setProcessingFeeType("fixed")}
                                                className="accent-blue-600"
                                            />
                                            <span>
                                                Fixed Amount
                                                <span className="text-blue-700 ml-1">
                                                    (₹{feeMaster?.processing_fee?.toLocaleString("en-IN") || 0})                                                </span>
                                            </span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="processingFeeType"
                                                value="percentage"
                                                checked={processingFeeType === "percentage"}
                                                onChange={() => setProcessingFeeType("percentage")}
                                                className="accent-blue-600"
                                            />
                                            Percentage of Loan Amount
                                        </label>
                                    </div>

                                    {/* Percentage Input */}
                                    {processingFeeType === "percentage" && (
                                        <div className="max-w-xs">
                                            <label className="block text-xs font-medium text-blue-800 mb-1">
                                                Processing Fee Percentage
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step={0.1}
                                                    value={processingFeePercent}
                                                    onChange={(e) =>
                                                        setProcessingFeePercent(Number(e.target.value) || 0)
                                                    }
                                                    className="w-full pr-8 px-3 py-2 text-sm rounded-md 
                       border border-blue-300 bg-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g. 1.5"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-700">
                                                    %
                                                </span>
                                            </div>
                                            <p className="text-xs text-blue-700 mt-1">
                                                Calculated on loan amount
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}


                        </div>

                        {loanAmount > 0 && interestRate > 0 && tenureMonths > 0 && feeMaster && (
                            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                                <h4 className="text-base font-semibold text-blue-900 mb-5">
                                    Loan Summary
                                </h4>

                                {/* Breakdown */}
                                <div className="space-y-3 text-sm text-blue-900">
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Loan Amount</span>
                                        <span className="font-medium">
                                            ₹{loanAmount.toLocaleString("en-IN")}
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Interest Amount</span>
                                        <span className="font-medium">
                                            ₹{interestAmount.toLocaleString("en-IN")}
                                        </span>
                                    </div>

                                    {applyProcessingFee && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-800">
                                                Processing Fee{" "}
                                                {processingFeeType === "percentage"
                                                    ? `(${processingFeePercent}% of Loan Amount)`
                                                    : "(Fixed)"}
                                            </span>
                                            <span className="font-medium">
                                                ₹{processingFeeAmount.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    )}


                                    <div className="flex justify-between">
                                        <span className="text-blue-800">
                                            GST ({gstPercentage}% on interest amount)                                        </span>
                                        <span className="font-medium">
                                            ₹{gstAmount.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-blue-200 my-5" />

                                {/* Totals */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-blue-700">
                                            Monthly EMI
                                        </p>
                                        <p className="text-2xl font-semibold text-blue-900 mt-1">
                                            ₹{monthlyEmi?.toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            for {tenureMonths} months
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs uppercase tracking-wide text-blue-700">
                                            Total Payable
                                        </p>
                                        <p className="text-2xl font-semibold text-blue-900 mt-1">
                                            ₹{totalWithFees?.toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Including interest, fees & GST
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}






                        {/* Monthly Income */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Monthly Income
                            </label>
                            <input
                                type="number"
                                {...register("monthly_income")}
                                className={inputClass}
                                placeholder="e.g., 60000"
                            />
                        </div>

                        {/* Employment Type */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Employment Type
                            </label>
                            <select {...register("employment_type")} className={inputClass}>
                                <option value="">Select Type</option>
                                <option value="salaried">Salaried</option>
                                <option value="self_employed">Self Employed</option>
                                <option value="business">Business</option>
                            </select>
                        </div>

                        {/* Work Experience */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Work Experience (Years)
                            </label>
                            <input
                                type="number"
                                {...register("work_experience_years")}
                                className={inputClass}
                                placeholder="e.g., 5"
                            />
                        </div>

                        {/* Company Name */}
                        <div className="">
                            <label className="text-sm font-medium text-gray-700">
                                Company Name
                            </label>
                            <input
                                {...register("company_name")}
                                className={inputClass}
                                placeholder="Company Name"
                            />
                        </div>

                        {/* Existing Loans */}
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                                Existing Loans
                            </label>
                            <textarea
                                {...register("existing_loans")}
                                className={inputClass}
                                rows={3}
                                placeholder="Describe if any..."
                            />
                        </div>

                        {/* Collateral */}
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                                Collateral Details
                            </label>
                            <textarea
                                {...register("collateral_details")}
                                className={inputClass}
                                rows={3}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                </div>

                {/* SECTION: DOCUMENT UPLOAD */}
                <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Documents</h2>

                    <div className="grid grid-cols-2 gap-5">

                        {[
                            "salary_slip_document",
                            "bank_statement_document",
                            "identity_proof_document",
                            "address_proof_document",
                            "other_document_1",
                            "other_document_2",
                        ].map((field: any) => (
                            <div key={field}>
                                <label className="text-sm font-medium text-gray-700 capitalize">
                                    {field.replaceAll("_", " ")}
                                </label>

                                {/* File Input */}
                                <input
                                    id={field}
                                    type="file"
                                    {...register(field)}
                                    onChange={(e) => handleFileChange(e, field)}
                                    className="mt-1 block w-full text-sm text-gray-700 
                                        file:px-4 file:py-2 file:rounded-md 
                                        file:border-0 file:bg-blue-600 file:text-white
                                        hover:file:bg-blue-700 cursor-pointer"
                                />

                                {/* Preview Section */}
                                {filePreview[field] && (
                                    <div className="mt-3 bg-gray-50 p-3 rounded-lg  relative shadow-sm">

                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(field)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-semibold"
                                        >
                                            ✕
                                        </button>

                                        <div className="flex items-center gap-3">

                                            {/* If image → show thumbnail */}
                                            {filePreview[field].type.startsWith("image") ? (
                                                <img
                                                    src={filePreview[field].url}
                                                    className="w-20 h-20 object-cover rounded-md border border-gray-500"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-red-100 text-red-600 
                                                        rounded-lg flex items-center justify-center text-3xl">
                                                    📄
                                                </div>
                                            )}

                                            <p className="text-sm text-gray-700 capitalize break-all">
                                                {field.replaceAll("_", " ")}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-3 py-1.5 rounded-md text-sm 
                            bg-gray-100 hover:bg-gray-200 
                            text-gray-700 border border-gray-300 
                            transition shadow-sm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-1.5 rounded-md text-sm font-medium 
                            bg-blue-600 hover:bg-blue-700 
                            disabled:bg-blue-300 disabled:cursor-not-allowed
                            text-white shadow-sm transition flex items-center gap-2"
                    >
                        {loading && (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                        )}
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </div>

            </form>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-999">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Confirm Loan Application
                        </h3>

                        <p className="text-sm text-gray-600 mt-2">
                            Are you sure you want to submit this loan application?
                            Once submitted, it cannot be edited.
                        </p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                className="px-4 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmSubmit}
                                disabled={loading}
                                className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                            >
                                {loading && (
                                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                )}
                                Confirm & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
