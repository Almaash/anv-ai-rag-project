"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProjectApiList from "@/app/api/ProjectApiList";

type LoanFormValues = {
    loan_amount: number;
    loan_purpose: string;
    interest_rate: string;
    loan_tenure_months: number;

    monthly_income?: number; // ✅ correct
    employment_type: string;
    company_name?: string;

    work_experience_years: number;
    existing_loans?: string;
    collateral_details?: string;

    salary_slip_document?: FileList;
    bank_statement_document?: FileList;
    identity_proof_document?: FileList;
    address_proof_document?: FileList;
    other_document_1?: FileList;
    other_document_2?: FileList;
};




// Validation Schema
const schema = yup.object({
    loan_amount: yup.number().required().min(10000).max(10000000),
    loan_purpose: yup.string().required(),
    interest_rate: yup.string().required(),
    loan_tenure_months: yup.number().required().min(3).max(360),
    monthly_income: yup
        .number()
        .transform((value, originalValue) =>
            originalValue === "" || originalValue === null ? undefined : value
        )
        .nullable()
        .required("Monthly income is required")
        .min(10000),
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

export default function CreateLoanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const applicationId = searchParams.get("id");

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


    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LoanFormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            monthly_income: undefined,
            employment_type: "",
            company_name: "",
        },
    });




    useEffect(() => {
        if (!applicationId) return;

        const fetchApplication = async () => {
            try {
                setPageLoading(true);

                const res = await axiosInstance.get(
                    `${ProjectApiList.api_getLoanApplicationById}/${applicationId}`
                );

                const app = res.data.data;

                /* 🚫 BLOCK EDIT IF APPROVED */
                if (app.application_status === "approved") {
                    toast.error("Approved applications cannot be edited");
                    router.back();
                    return; // ⛔ VERY IMPORTANT
                }

                // console.log(app,"--------------->")

                /* ================= PREFILL FORM ================= */
                setValue("loan_amount", app.loan_amount);
                setValue("loan_purpose", app.loan_purpose);
                setValue("interest_rate", app.interest_rate);
                setValue("loan_tenure_months", app.loan_tenure_months);
                setValue(
                    "monthly_income",
                    app.monthly_income ? Number(app.monthly_income) : undefined
                );
                setValue("employment_type", app.employment_type);
                setValue("company_name", app.company_name);
                setValue("work_experience_years", app.work_experience_years);
                setValue("existing_loans", app.existing_loans);
                setValue("collateral_details", app.collateral_details);

                /* ================= CUSTOMER ================= */
                setSelectedCustomerId(app.customer_unique_id);
                setSelectedCustomer(app.user);

                /* ================= EXISTING DOCUMENT PREVIEW ================= */
                const docFields = [
                    "salary_slip_document",
                    "bank_statement_document",
                    "identity_proof_document",
                    "address_proof_document",
                    "other_document_1",
                    "other_document_2",
                ];

                const previewData: any = {};

                docFields.forEach((field) => {
                    if (app[field]) {
                        previewData[field] = {
                            url: `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${app[field]}`,
                            type: app[field].endsWith(".pdf")
                                ? "application/pdf"
                                : "image",
                        };
                    }
                });

                setFilePreview(previewData);
            } catch (err) {
                toast.error("Failed to load loan application");
            } finally {
                setPageLoading(false);
            }
        };

        fetchApplication();
    }, [applicationId, setValue, router]);



    useEffect(() => {
        const storedUser = localStorage.getItem("auth_user");
        // ⬆️ adjust key if your app uses a different one

        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setLoggedInUser(parsedUser);
            setUserRole(parsedUser.role);
        }
    }, []);


    useEffect(() => {
        // ❌ Do NOT auto-fill customer data when editing
        if (applicationId) return;

        if (
            userRole === "customer" &&
            loggedInUser &&
            customers.length > 0
        ) {
            const matchedCustomer = customers.find(
                (c) => c.customer_unique_id === loggedInUser.customer_unique_id
            );

            if (matchedCustomer) {
                setSelectedCustomerId(matchedCustomer.customer_unique_id);
                setSelectedCustomer(matchedCustomer);

                setValue(
                    "monthly_income",
                    matchedCustomer.monthly_income
                        ? Number(matchedCustomer.monthly_income)
                        : undefined
                );
                setValue("employment_type", matchedCustomer.employment_type || "");
                setValue("company_name", matchedCustomer.company_name || "");
            }
        }
    }, [userRole, loggedInUser, customers, applicationId, setValue]);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                setPageLoading(true);
                const res = await axiosInstance.get(ProjectApiList.api_getAllLonaCustomers);
                setCustomers(res.data.data || []);
            } catch {
                toast.error("Failed to load customers");
            } finally {
                setPageLoading(false);
            }
        };

        fetchCustomers();
    }, []);



    useEffect(() => {
        const loadInterestRates = async () => {
            try {
                const res = await axiosInstance.get("get-all-interest-rates");
                setInterestList(res.data.data || []);
            } catch (err) {
                toast.error("Failed to load interest rates");
            }
        };

        loadInterestRates();
    }, []);



    // PREVIEWS: { fieldName: { url, type } }
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


    // console.log({ loanAmount, interestRate, tenureMonths })

    useEffect(() => {
        if (
            loanAmount > 0 &&
            interestRate > 0 &&
            tenureMonths > 0
        ) {
            const interest = (loanAmount * interestRate) / 100;
            const total = loanAmount + interest;
            const emi = total / tenureMonths;

            // console.log({
            //     loanAmount,
            //     interestRate,
            //     tenureMonths,
            //     interest,
            //     total,
            //     emi,
            // })

            setTotalPayable(Math.round(total));
            setMonthlyEmi(Math.round(emi));
        } else {
            setTotalPayable(null);
            setMonthlyEmi(null);
        }
    }, [loanAmount, interestRate, tenureMonths]);


    const confirmSubmit = async () => {
        if (!formDataCache || !selectedCustomerId) return;

        const toastId = toast.loading("Submitting loan application...");
        setLoading(true);

        try {
            const form = new FormData();

            // ✅ ADD CUSTOMER ID
            form.append("customer_unique_id", selectedCustomerId);

            Object.keys(formDataCache).forEach((key) => {
                const value = formDataCache[key];

                // ✅ Only append file IF user selected a new file
                if (value instanceof FileList) {
                    if (value.length > 0) {
                        form.append(key, value[0]);
                    }
                    // ❌ DO NOTHING if no file selected
                    return;
                }

                // ✅ Normal text / number fields
                form.append(key, value ?? "");
            });



            await axiosInstance.post(
                `${ProjectApiList.api_editLoanApplication}/${applicationId}`,
                form,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            toast.success("Loan application updated successfully!", { id: toastId });
            router.push(`/loan/loanApplications/view?id=${applicationId}`);
            // router.push("/admin/loanApplication/allApplications");
        } catch (error: any) {
            toast.dismiss(toastId);

            if (error.response?.data?.errors) {
                Object.values(error.response.data.errors).forEach((errs: any) =>
                    errs.forEach((msg: string) => toast.error(msg))
                );
            } else {
                toast.error(error.response?.data?.message || "Failed to submit loan");
            }
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    // console.log(selectedCustomer,"------------>")



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
                    <h1 className="text-2xl font-bold text-gray-900">Edit Loan Application</h1>
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

            {/* CUSTOMER SELECT */}
            <div className="bg-white p-5 mb-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="text-sm font-medium text-gray-700">
                    Select Customer
                </label>

                <select
                    value={selectedCustomerId}
                    disabled
                    onChange={(e) => {
                        const customerId = e.target.value;
                        setSelectedCustomerId(customerId);

                        const customer = customers.find(
                            (c) => c.customer_unique_id === customerId
                        );

                        if (customer) {
                            setSelectedCustomer(customer);

                            setValue("monthly_income", customer.monthly_income || "");
                            setValue("employment_type", customer.employment_type || "");
                            setValue("company_name", customer.company_name || "");
                        } else {
                            setSelectedCustomer(null);
                        }
                    }}
                    className={`${inputClass} ${userRole === "customer"
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                        }`}
                >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                        <option key={c.customer_unique_id} value={c.customer_unique_id}>
                            {c.name} ({c.customer_unique_id})
                        </option>
                    ))}
                </select>
                {userRole === "customer" && (
                    <p className="text-xs text-gray-500 mt-1">
                        You are logged in as a customer. Your profile is auto-selected.
                    </p>
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
                        {/* Total Payable (CALCULATED) */}
                        {totalPayable !== null && monthlyEmi !== null && (
                            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">

                                    <div>
                                        <p className="text-sm text-blue-700 font-medium">
                                            Total Amount to Pay
                                        </p>
                                        <p className="text-2xl font-bold text-blue-900 mt-1">
                                            ₹{totalPayable.toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            (Loan + Flat Interest)
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-blue-700 font-medium">
                                            Monthly EMI
                                        </p>
                                        <p className="text-2xl font-bold text-blue-900 mt-1">
                                            ₹{monthlyEmi.toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            for {tenureMonths} months
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
                        onClick={() => router.push("/admin/loanApplication/allApplications")}
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
