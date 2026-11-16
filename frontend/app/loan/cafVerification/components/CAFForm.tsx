"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type FrequencyOption = "monthly" | "weekly" | "biweekly";
type CreditMode = "product" | "cash" | "";
type TenureOption =
    | "12 Month"
    | "18 Month"
    | "1 Week"
    | "1 Bi-week"
    | `${number} Week`
    | `${number} Bi-week`;
type ApplicantType = "qualifying" | "nonQualifying";
type BusinessMode = "shopBased" | "homeBased";
type BusinessOwnership = "owned" | "rented";
type EntitledOption = "proprietor" | "partnership";
type IncomeSourceKey =
    | "business"
    | "agriculture"
    | "wages"
    | "rental"
    | "pension"
    | "bankDeposits";

type ExpenseKey =
    | "houseRent"
    | "food"
    | "electricity"
    | "education"
    | "telephone"
    | "festival"
    | "health";

type ObligationRow = {
    companyName: string;
    creditType: string;
    creditAmount: string;
    repaymentMode: string;
    installmentAmount: string;
};

export type CAFFormData = {
    creditMode: CreditMode;
    creditAppliedFor: string;
    productName: string;
    productCode: string;
    frequency: FrequencyOption;
    tenureOption: TenureOption;
    applicantType: ApplicantType;
    applicantIncome: string;
    otherSourcesIncome: string;
    spouseIncome: string;
    nomineeIncome: string;
    incomeSources: Record<IncomeSourceKey, boolean>;
    incomeProofName: string;
    familyDependents: string;
    expenses: Record<ExpenseKey, { monthly: string; yearly: string }>;
    travelExpense: string;
    otherObligations: string;
    obligationRows: ObligationRow[];
    businessType: BusinessMode;
    businessNature: string;
    entitled: EntitledOption;
    businessAddress: string;
    businessOwnership: BusinessOwnership;
    businessVintage: string;
    businessPhotoName: string;
    businessProofName: string;
    bankFirstName: string;
    bankMiddleName: string;
    bankLastName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
};

const incomeSourceLabels: Record<IncomeSourceKey, string> = {
    business: "Business",
    agriculture: "Agriculture",
    wages: "Wages",
    rental: "Rental",
    pension: "Pension",
    bankDeposits: "Bank Deposits",
};

const expenseLabels: Record<ExpenseKey, string> = {
    houseRent: "House Rent",
    food: "Food",
    electricity: "Electricity",
    education: "Education",
    telephone: "Telephone",
    festival: "Festival",
    health: "Health",
};

const defaultObligationRow = (): ObligationRow => ({
    companyName: "",
    creditType: "",
    creditAmount: "",
    repaymentMode: "",
    installmentAmount: "",
});

export const createDefaultCAFData = (): CAFFormData => ({
    creditMode: "",
    creditAppliedFor: "",
    productName: "",
    productCode: "",
    frequency: "monthly",
    tenureOption: "12 Month",
    applicantType: "qualifying",
    applicantIncome: "",
    otherSourcesIncome: "",
    spouseIncome: "",
    nomineeIncome: "",
    incomeSources: {
        business: false,
        agriculture: false,
        wages: false,
        rental: false,
        pension: false,
        bankDeposits: false,
    },
    incomeProofName: "",
    familyDependents: "",
    expenses: {
        houseRent: { monthly: "", yearly: "" },
        food: { monthly: "", yearly: "" },
        electricity: { monthly: "", yearly: "" },
        education: { monthly: "", yearly: "" },
        telephone: { monthly: "", yearly: "" },
        festival: { monthly: "", yearly: "" },
        health: { monthly: "", yearly: "" },
    },
    travelExpense: "",
    otherObligations: "",
    obligationRows: [defaultObligationRow(), defaultObligationRow()],
    businessType: "shopBased",
    businessNature: "",
    entitled: "proprietor",
    businessAddress: "",
    businessOwnership: "owned",
    businessVintage: "",
    businessPhotoName: "",
    businessProofName: "",
    bankFirstName: "",
    bankMiddleName: "",
    bankLastName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
});

export const createSampleCAFData = (): CAFFormData => ({
    ...createDefaultCAFData(),
    creditMode: "product",
    creditAppliedFor: "45000",
    productName: "Working Capital Advance",
    productCode: "CAF-101",
    frequency: "monthly",
    tenureOption: "18 Month",
    applicantType: "qualifying",
    applicantIncome: "180000",
    otherSourcesIncome: "24000",
    spouseIncome: "120000",
    nomineeIncome: "60000",
    incomeSources: {
        business: true,
        agriculture: true,
        wages: false,
        rental: false,
        pension: false,
        bankDeposits: true,
    },
    incomeProofName: "income-proof.pdf",
    familyDependents: "4",
    expenses: {
        houseRent: { monthly: "5000", yearly: "60000" },
        food: { monthly: "9000", yearly: "108000" },
        electricity: { monthly: "1800", yearly: "21600" },
        education: { monthly: "2500", yearly: "30000" },
        telephone: { monthly: "600", yearly: "7200" },
        festival: { monthly: "1200", yearly: "14400" },
        health: { monthly: "1500", yearly: "18000" },
    },
    travelExpense: "2000",
    otherObligations: "1500",
    obligationRows: [
        {
            companyName: "ABC Finance",
            creditType: "Business Loan",
            creditAmount: "85000",
            repaymentMode: "Monthly",
            installmentAmount: "4200",
        },
        {
            companyName: "Village Credit",
            creditType: "Equipment Loan",
            creditAmount: "45000",
            repaymentMode: "Biweekly",
            installmentAmount: "1800",
        },
    ],
    businessType: "shopBased",
    businessNature: "Retail grocery and household supplies",
    entitled: "proprietor",
    businessAddress: "Ward No. 8, Main Road, Near Community Hall",
    businessOwnership: "rented",
    businessVintage: "6",
    businessPhotoName: "shop-front.jpg",
    businessProofName: "shop-license.pdf",
    bankFirstName: "Anita",
    bankMiddleName: "Kumari",
    bankLastName: "Verma",
    bankName: "State Bank of India",
    accountNumber: "123456789012",
    ifscCode: "SBIN0001234",
});

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeNonNegativeNumber = (value: string) =>
    value.replace(/-/g, "");

const normalizeEmptyToNull = (value: unknown): unknown => {
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        return trimmedValue === "" ? null : trimmedValue;
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeEmptyToNull(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                normalizeEmptyToNull(nestedValue),
            ])
        );
    }

    return value ?? null;
};

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border border-gray-300 rounded-lg p-5 bg-white">
            <h2 className="text-md font-semibold text-green-700">{title}</h2>
            <hr className="my-2 border-gray-300" />
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function ReadonlyValue({ value }: { value: string }) {
    return (
        <div className="min-h-[42px] rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
            {value || "-"}
        </div>
    );
}

type CAFFormProps = {
    mode?: "create" | "view";
    initialData?: CAFFormData;
};

export default function CAFForm({
    mode = "create",
    initialData,
}: CAFFormProps) {
    const router = useRouter();
    const readOnly = mode === "view";
    const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [formData, setFormData] = useState<CAFFormData>(
        initialData ?? createDefaultCAFData()
    );

    const [files, setFiles] = useState<{
        incomeProof: File | null;
        businessPhoto: File | null;
        businessProof: File | null;
    }>({
        incomeProof: null,
        businessPhoto: null,
        businessProof: null,
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");

    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    const inputClass =
        "bg-gray-50 rounded-md px-3 py-2 text-sm w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600";
    const tableCellInputClass = `${inputClass} ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`;
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";
    const effectiveFrequency: FrequencyOption = formData.frequency;
    const effectiveTenureOption: TenureOption = formData.tenureOption;


    const fetchUsers = async (searchValue = "") => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) return;

            const res = await axiosInstance.get(
                ProjectApiList.api_getAllLonaCustomersWithoutPagination,
                {
                    params: {
                        search: searchValue,
                        verification_status: "verified",
                    },
                }
            );

            if (res.data.success) {
                setCustomers(res.data.data);
            }
        } catch (error) {
            console.error("Fetch users failed", error);
        } finally {
            setLoading(false);
        }
    };

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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const totalIncome = useMemo(
        () =>
            (toNumber(formData.applicantIncome) +
                toNumber(formData.otherSourcesIncome)) * 12,
        [formData.applicantIncome, formData.otherSourcesIncome]
    );

    const totalMonthlyExpenses = useMemo(
        () =>
            Object.values(formData.expenses).reduce(
                (sum, item) => sum + toNumber(item.monthly),
                0
            ) +
            toNumber(formData.travelExpense) +
            toNumber(formData.otherObligations),
        [formData.expenses, formData.otherObligations, formData.travelExpense]
    );

    const totalYearlyExpenses = useMemo(
        () =>
            Object.values(formData.expenses).reduce(
                (sum, item) => sum + toNumber(item.yearly),
                0
            ) +
            toNumber(formData.travelExpense) * 12 +
            toNumber(formData.otherObligations) * 12,
        [formData.expenses, formData.otherObligations, formData.travelExpense]
    );

    const totalObligationAmount = useMemo(
        () => formData.obligationRows.reduce((sum, row) => sum + toNumber(row.creditAmount), 0),
        [formData.obligationRows]
    );

    const totalInstallmentAmount = useMemo(
        () =>
            formData.obligationRows.reduce(
                (sum, row) => sum + toNumber(row.installmentAmount),
                0
            ),
        [formData.obligationRows]
    );

    const netSurplus = useMemo(() => {

        const A = totalIncome;

        const B = totalYearlyExpenses + (totalInstallmentAmount * 12);

        return (A - B) / 12;

    }, [totalIncome, totalYearlyExpenses, totalInstallmentAmount]);

    const updateField = <K extends keyof CAFFormData>(field: K, value: CAFFormData[K]) => {
        const numericFields: (keyof CAFFormData)[] = [
            "creditAppliedFor",
            "applicantIncome",
            "otherSourcesIncome",
            "familyDependents",
            "travelExpense",
            "otherObligations",
            "businessVintage",
        ];

        const nextValue =
            typeof value === "string" && numericFields.includes(field)
                ? sanitizeNonNegativeNumber(value)
                : value;

        setFormData((prev) => ({ ...prev, [field]: nextValue }));
    };

    const handleFrequencyChange = (value: FrequencyOption) => {
        setFormData((prev) => ({
            ...prev,
            frequency: value,
            tenureOption:
                value === "weekly"
                    ? "1 Week"
                    : value === "biweekly"
                        ? "1 Bi-week"
                        : prev.tenureOption === "1 Week" ||
                            prev.tenureOption === "1 Bi-week"
                            ? "12 Month"
                            : prev.tenureOption,
        }));
    };

    const updateExpense = (key: ExpenseKey, field: "monthly" | "yearly", value: string) => {
        const sanitizedValue = sanitizeNonNegativeNumber(value);

        setFormData((prev) => ({
            ...prev,
            expenses: {
                ...prev.expenses,
                [key]: {
                    ...prev.expenses[key],
                    [field]: sanitizedValue,
                    ...(field === "monthly"
                        ? {
                            yearly:
                                sanitizedValue === ""
                                    ? ""
                                    : String(toNumber(sanitizedValue) * 12),
                        }
                        : {}),
                },
            },
        }));
    };

    const toggleIncomeSource = (key: IncomeSourceKey) => {
        setFormData((prev) => ({
            ...prev,
            incomeSources: {
                ...prev.incomeSources,
                [key]: !prev.incomeSources[key],
            },
        }));
    };

    const updateObligationRow = (index: number, field: keyof ObligationRow, value: string) => {
        const sanitizedValue =
            field === "creditAmount" || field === "installmentAmount"
                ? sanitizeNonNegativeNumber(value)
                : value;

        setFormData((prev) => ({
            ...prev,
            obligationRows: prev.obligationRows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: sanitizedValue } : row
            ),
        }));
    };

    const addObligationRow = () => {
        setFormData((prev) => ({
            ...prev,
            obligationRows: [...prev.obligationRows, defaultObligationRow()],
        }));
    };

    const removeObligationRow = (index: number) => {
        setPendingRemoveIndex(index);
    };

    const confirmRemoveObligationRow = () => {
        if (pendingRemoveIndex === null) return;

        setFormData((prev) => ({
            ...prev,
            obligationRows:
                prev.obligationRows.length > 1
                    ? prev.obligationRows.filter(
                        (_, rowIndex) => rowIndex !== pendingRemoveIndex
                    )
                    : prev.obligationRows,
        }));
        setPendingRemoveIndex(null);
    };

    const handleFileChange = (
        field: "incomeProof" | "businessPhoto" | "businessProof",
        file: File | null
    ) => {
        if (file) {
            setFiles((prev) => ({ ...prev, [field]: file }));
            updateField(
                field === "incomeProof"
                    ? "incomeProofName"
                    : field === "businessPhoto"
                        ? "businessPhotoName"
                        : "businessProofName",
                file.name
            );
        }
    };

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const validateCAFSubmission = () => {
        const requiredChecks: Array<[string, string]> = [
            [formData.creditMode, "Please select Product or Cash before submitting."],
            [formData.creditAppliedFor, "Please enter Credit Applied amount before submitting."],
            [formData.applicantIncome, "Please enter Applicant / Spouse / Nominee Income before submitting."],
            [formData.familyDependents, "Please enter Number of Family Members Dependent before submitting."],
            [formData.businessNature, "Please enter Business Nature before submitting."],
            [formData.businessAddress, "Please enter Business Address before submitting."],
            [formData.businessVintage, "Please enter Business Vintage before submitting."],
            [formData.bankFirstName, "Please enter Bank First Name before submitting."],
            [formData.bankLastName, "Please enter Bank Last Name before submitting."],
            [formData.bankName, "Please enter Bank Name before submitting."],
            [formData.accountNumber, "Please enter Account Number before submitting."],
            [formData.ifscCode, "Please enter IFSC Code before submitting."],
        ];

        const firstMissing = requiredChecks.find(([value]) => !value.trim());
        if (firstMissing) {
            return firstMissing[1];
        }

        if (formData.creditMode === "product") {
            if (!formData.productName.trim()) {
                return "Please enter Product Name before submitting.";
            }

            if (!formData.productCode.trim()) {
                return "Please enter Product Code before submitting.";
            }
        }

        if (!/^\d+$/.test(formData.creditAppliedFor.trim())) {
            return "Credit Applied amount must contain numbers only.";
        }

        if (!/^\d+$/.test(formData.applicantIncome.trim())) {
            return "Applicant / Spouse / Nominee Income must contain numbers only.";
        }

        if (
            formData.otherSourcesIncome.trim() &&
            !/^\d+$/.test(formData.otherSourcesIncome.trim())
        ) {
            return "Other Sources Income must contain numbers only.";
        }

        if (!/^\d+$/.test(formData.familyDependents.trim())) {
            return "Number of Family Members Dependent must contain numbers only.";
        }

        if (!/^\d+$/.test(formData.businessVintage.trim())) {
            return "Business Vintage must contain numbers only.";
        }

        if (!Object.values(formData.incomeSources).some(Boolean)) {
            return "Please select at least one income source before submitting.";
        }

        if (!formData.incomeProofName.trim()) {
            return "Please choose Income Proof before submitting.";
        }

        if (!formData.businessPhotoName.trim()) {
            return "Please choose Business Photo before submitting.";
        }

        if (!formData.businessProofName.trim()) {
            return "Please choose Business Proof before submitting.";
        }

        if (!formData.obligationRows.some((row) => Object.values(row).some((value) => value.trim()))) {
            return "Please fill at least one Other Obligation Details row before submitting.";
        }

        return "";
    };

    const buildCAFSubmissionPayload = () => {
        const user = getLoggedInUser();
   
        return normalizeEmptyToNull({
            user_id: user?.user_id ?? null,
            branch_id: user?.branch ?? null,
            cms_admin_id: user?.cms_admin ?? null,

            customer_id: selectedCustomerId,

            formData,
            computed: {
                effectiveFrequency,
                effectiveTenureOption,
                totalIncome,
                totalMonthlyExpenses,
                totalYearlyExpenses,
                totalObligationAmount,
                totalInstallmentAmount,
                netSurplus,
            },
        });
    };

    const handleSubmit = async () => {
        const errorMessage = validateCAFSubmission();

        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            setLoading(true);
            const user = getLoggedInUser();
            
            const appendJson = (formData: FormData, key: string, value: any) => {
                formData.append(key, JSON.stringify(value));
            };

            const data = new FormData();
            
            // Context from logged in user
            data.append("cms_admin_id", user?.cms_admin ||  "");
            data.append("branch_id", user?.branch || "");

            // Basic Info
            data.append("customer_unique_id", selectedCustomer?.customer_unique_id || "");
            data.append("credit_mode", formData.creditMode);
            data.append("credit_applied_for", formData.creditAppliedFor);
            data.append("product_name", formData.productName);
            data.append("product_code", formData.productCode);
            data.append("frequency", effectiveFrequency);
            data.append("tenure_option", effectiveTenureOption);

            // Household Income
            data.append("applicant_type", formData.applicantType);
            data.append("applicant_income", formData.applicantIncome);
            // Convert boolean map to list of keys for backend or just stringify the whole thing
            data.append("income_sources", JSON.stringify(formData.incomeSources));
            data.append("other_sources_income", formData.otherSourcesIncome);
            data.append("family_dependents", formData.familyDependents);
            data.append("total_income_yearly", String(totalIncome));

            // Expenses
            data.append("expense_details", JSON.stringify(formData.expenses));
            data.append("travel_expense_monthly", formData.travelExpense);
            data.append("other_obligations_monthly", formData.otherObligations);
            data.append("total_monthly_expenses", String(totalMonthlyExpenses));
            data.append("total_yearly_expenses", String(totalYearlyExpenses));

            // Obligations
            data.append("obligation_rows", JSON.stringify(formData.obligationRows));
            data.append("total_obligation_amount", String(totalObligationAmount));
            data.append("total_installment_amount", String(totalInstallmentAmount));

            // Net Surplus
            data.append("net_surplus", String(netSurplus));

            // Business Details
            data.append("business_type", formData.businessType);
            data.append("business_nature", formData.businessNature);
            data.append("entitled", formData.entitled);
            data.append("business_address", formData.businessAddress);
            data.append("business_ownership", formData.businessOwnership);
            data.append("business_vintage", formData.businessVintage);

            // Bank Details
            data.append("bank_first_name", formData.bankFirstName);
            data.append("bank_middle_name", formData.bankMiddleName);
            data.append("bank_last_name", formData.bankLastName);
            data.append("bank_name", formData.bankName);
            data.append("account_number", formData.accountNumber);
            data.append("ifsc_code", formData.ifscCode);

            // Files
            if (files.incomeProof) data.append("income_proof", files.incomeProof);
            if (files.businessPhoto) data.append("business_photo", files.businessPhoto);
            if (files.businessProof) data.append("business_proof", files.businessProof);

            // console.log("Submitting CAF...");
            const res = await axiosInstance.post(ProjectApiList.api_createCAF, data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data.success) {
                toast.success("CAF submitted successfully!");
                router.push("/loan/caf/");
            } else {
                toast.error(res.data.message || "Failed to submit CAF");
            }
        } catch (error: any) {
            console.error("CAF Submission error:", error);
            const msg = error.response?.data?.message || "An error occurred during submission.";
            toast.error(msg);
        } finally {
            setLoading(false);
            setShowSubmitConfirm(false);
        }
    };

    const requestSubmitConfirmation = () => {
        const errorMessage = validateCAFSubmission();

        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setShowSubmitConfirm(true);
    };

    const renderTextField = (field: keyof CAFFormData, label: string, placeholder = label) => (
        <div>
            <label className="text-sm text-gray-700 mb-1 block">{label}</label>
            {readOnly ? (
                <ReadonlyValue value={String(formData[field] || "")} />
            ) : (
                <input
                    value={String(formData[field] || "")}
                    onChange={(e) => updateField(field, e.target.value as never)}
                    className={inputClass}
                    placeholder={placeholder}
                />
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        CAF (Credit Application Form)ss
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Maintain CAF details in the existing loan module UI style.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-md text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Back
                    </button>
                </div>
            </div>

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
                            ? `${selectedCustomer.first_name} ${selectedCustomer.last_name} (${selectedCustomer.enrollment_number})`
                            : customerSearch
                    }
                    readOnly={!!selectedCustomer}
                    onFocus={() => {
                        if (!selectedCustomer) {
                            setShowDropdown(true);
                            fetchUsers("");
                        }
                    }}
                    onChange={(e) => {
                        const value = e.target.value;

                        setCustomerSearch(value);
                        setSelectedCustomer(null);
                        setSelectedCustomerId("");

                        setShowDropdown(true);

                        fetchUsers(value);
                    }}
                    className={`${inputClass} ${selectedCustomer ? "bg-gray-100 cursor-not-allowed" : ""}`}
                />
                {selectedCustomer && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCustomer(null);
                            setSelectedCustomerId("");
                            setCustomerSearch("");
                        }}
                        className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                        Change Customer
                    </button>
                )}

                {/* Dropdown */}
                {showDropdown && !selectedCustomer && (
                    <div className="absolute z-50 mt-1 w-[98%] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">

                        {loading && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                Loading customers…
                            </div>
                        )}

                        {!loading && customers.length === 0 && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No customers found
                            </div>
                        )}

                        {!loading &&
                            customers.map((c: any) => (
                                <div
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCustomer(c);
                                        setSelectedCustomerId(c.id);
                                        setCustomerSearch("");
                                        setShowDropdown(false);
                                    }}
                                    className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b last:border-0"
                                >
                                    <div className="font-medium text-gray-800">
                                        {c.first_name} {c.last_name}
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        {c.enrollment_number} • {c.email}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {selectedCustomer && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Customer Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

                            <div>
                                <span className="text-gray-500 block">Name</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Enrollment ID</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.enrollment_number}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Mobile</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.contact_number_1}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Email</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.email || "-"}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Service Area</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.service_area_pin || "-"}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Status</span>
                                <span className={`font-semibold ${selectedCustomer.status === "active"
                                    ? "text-green-600"
                                    : "text-red-600"
                                    }`}>
                                    {selectedCustomer.status}
                                </span>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <SectionCard title="Credit Type">
                    <div className="max-w-sm">
                        <label className="text-sm text-gray-700 mb-1 block">
                            Select Type
                        </label>
                        {readOnly ? (
                            <ReadonlyValue
                                value={
                                    formData.creditMode
                                        ? formData.creditMode === "product"
                                            ? "Product"
                                            : "Cash"
                                        : ""
                                }
                            />
                        ) : (
                            <select
                                value={formData.creditMode}
                                onChange={(e) =>
                                    updateField("creditMode", e.target.value as CreditMode)
                                }
                                className={inputClass}
                            >
                                <option value="">Select Product / Cash</option>
                                <option value="product">Product</option>
                                <option value="cash">Cash</option>
                            </select>
                        )}
                    </div>
                </SectionCard>

                {formData.creditMode && (
                    <>
                        <SectionCard title="Credit Applied Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Credit Applied For
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.creditAppliedFor} />
                                    ) : (
                                        <input
                                            type="number"
                                            value={formData.creditAppliedFor}
                                            onChange={(e) =>
                                                updateField("creditAppliedFor", e.target.value)
                                            }
                                            className={inputClass}
                                            placeholder="Credit Applied Amount"
                                        />
                                    )}
                                </div>
                                {formData.creditMode === "product" && (
                                    <>
                                        {renderTextField("productName", "Product Name")}
                                        {renderTextField("productCode", "Product Code")}
                                    </>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Frequency">
                            <div className="flex flex-wrap gap-6 rounded-md bg-gray-50 px-3 py-3">
                                {[
                                    ["monthly", "Monthly"],
                                    ["weekly", "Weekly"],
                                    ["biweekly", "Biweekly / Fortnightly"],
                                ].map(([value, label]) => (
                                    <label
                                        key={value}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="radio"
                                            className={radioClass}
                                            checked={effectiveFrequency === value}
                                            disabled={readOnly}
                                            onChange={() =>
                                                handleFrequencyChange(value as FrequencyOption)
                                            }
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Tenure">
                            <div className="rounded-md bg-gray-50 px-3 py-3">
                                {effectiveFrequency === "monthly" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {(["12 Month", "18 Month"] as const).map((option) => (
                                            <label
                                                key={option}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="tenureOption"
                                                    className={radioClass}
                                                    checked={effectiveTenureOption === option}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField("tenureOption", option)
                                                    }
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="max-w-sm">
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            {effectiveFrequency === "weekly"
                                                ? "Week"
                                                : "Bi-week"}
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={effectiveTenureOption} />
                                        ) : (
                                            <select
                                                value={effectiveTenureOption}
                                                onChange={(e) =>
                                                    updateField(
                                                        "tenureOption",
                                                        e.target.value as TenureOption
                                                    )
                                                }
                                                className={inputClass}
                                            >
                                                {Array.from({ length: 25 }, (_, index) => {
                                                    const count = index + 1;
                                                    const label = `${count
                                                        } ${effectiveFrequency === "weekly" ? "Week" : "Bi-week"}`;

                                                    return (
                                                        <option key={label} value={label}>
                                                            {label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        )}
                                    </div>
                                )}
                                {readOnly && (
                                    <div className="mt-3">
                                        <ReadonlyValue value={effectiveTenureOption} />
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Household Income">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Applicant Type
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                            {[
                                                ["qualifying", "Qualifying"],
                                                ["nonQualifying", "Non-Qualifying"],
                                            ].map(([value, label]) => (
                                                <label
                                                    key={value}
                                                    className="flex items-center gap-2 text-sm text-gray-700"
                                                >
                                                    <input
                                                        type="radio"
                                                        className={radioClass}
                                                        checked={formData.applicantType === value}
                                                        disabled={readOnly}
                                                        onChange={() =>
                                                            updateField(
                                                                "applicantType",
                                                                value as ApplicantType
                                                            )
                                                        }
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Applicant / Spouse / Nominee Income
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.applicantIncome} />
                                        ) : (
                                            <input
                                                type="number"
                                                value={formData.applicantIncome}
                                                onChange={(e) =>
                                                    updateField("applicantIncome", e.target.value)
                                                }
                                                className={inputClass}
                                                placeholder="Applicant / Spouse / Nominee Income"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Income Sources
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3">
                                            {readOnly ? (
                                                <ReadonlyValue
                                                    value={(
                                                        ["business", "agriculture", "wages"] as IncomeSourceKey[]
                                                    )
                                                        .filter((key) => formData.incomeSources[key])
                                                        .map((key) => incomeSourceLabels[key])
                                                        .join(", ")}
                                                />
                                            ) : (
                                                <div className="flex flex-wrap gap-4">
                                                    {(
                                                        ["business", "agriculture", "wages"] as IncomeSourceKey[]
                                                    ).map((key) => (
                                                        <label
                                                            key={key}
                                                            className="flex items-center gap-2 text-sm text-gray-700"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                                checked={formData.incomeSources[key]}
                                                                onChange={() => toggleIncomeSource(key)}
                                                            />
                                                            {incomeSourceLabels[key]}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Other Sources
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3">
                                            {readOnly ? (
                                                <ReadonlyValue
                                                    value={(
                                                        [
                                                            "rental",
                                                            "pension",
                                                            "bankDeposits",
                                                        ] as IncomeSourceKey[]
                                                    )
                                                        .filter((key) => formData.incomeSources[key])
                                                        .map((key) => incomeSourceLabels[key])
                                                        .join(", ")}
                                                />
                                            ) : (
                                                <div className="flex flex-wrap gap-4">
                                                    {(
                                                        [
                                                            "rental",
                                                            "pension",
                                                            "bankDeposits",
                                                        ] as IncomeSourceKey[]
                                                    ).map((key) => (
                                                        <label
                                                            key={key}
                                                            className="flex items-center gap-2 text-sm text-gray-700"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                                checked={formData.incomeSources[key]}
                                                                onChange={() => toggleIncomeSource(key)}
                                                            />
                                                            {incomeSourceLabels[key]}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Other Sources Income
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.otherSourcesIncome} />
                                        ) : (
                                            <input
                                                type="number"
                                                value={formData.otherSourcesIncome}
                                                onChange={(e) =>
                                                    updateField(
                                                        "otherSourcesIncome",
                                                        e.target.value
                                                    )
                                                }
                                                className={inputClass}
                                                placeholder="Other Sources Income"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Specify With Proof
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.incomeProofName} />
                                        ) : (
                                            <input
                                                type="file"
                                                className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                onChange={(e) =>
                                                    handleFileChange(
                                                        "incomeProof",
                                                        e.target.files?.[0] || null
                                                    )
                                                }
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {renderTextField(
                                        "familyDependents",
                                        "Number of Family Members Dependent"
                                    )}
                                    <div>
                                        
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Total Income (Yearly Auto calculation)
                                        </label>
                                        <ReadonlyValue value={String(totalIncome)} />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Expense Details">
                            <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-300 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Expense Details
                                            </th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Monthly
                                            </th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Yearly
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Object.keys(expenseLabels) as ExpenseKey[]).map((key) => (
                                            <tr key={key}>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {expenseLabels[key]}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {readOnly ? (
                                                        <ReadonlyValue value={formData.expenses[key].monthly} />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={formData.expenses[key].monthly}
                                                            onChange={(e) =>
                                                                updateExpense(key, "monthly", e.target.value)
                                                            }
                                                            className={tableCellInputClass}
                                                            placeholder="Monthly"
                                                        />
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {readOnly ? (
                                                        <ReadonlyValue value={formData.expenses[key].yearly} />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={formData.expenses[key].yearly}
                                                            onChange={(e) =>
                                                                updateExpense(key, "yearly", e.target.value)
                                                            }
                                                            className={tableCellInputClass}
                                                            placeholder="Yearly"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-2">
                                                Travel Expense
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {readOnly ? (
                                                    <ReadonlyValue value={formData.travelExpense} />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.travelExpense}
                                                        onChange={(e) =>
                                                            updateField("travelExpense", e.target.value)
                                                        }
                                                        className={tableCellInputClass}
                                                        placeholder="Monthly"
                                                    />
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                <ReadonlyValue
                                                    value={
                                                        formData.travelExpense
                                                            ? String(
                                                                toNumber(formData.travelExpense) * 12
                                                            )
                                                            : "Yearly"
                                                    }
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-2">
                                                Other Obligations
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {readOnly ? (
                                                    <ReadonlyValue value={formData.otherObligations} />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.otherObligations}
                                                        onChange={(e) =>
                                                            updateField(
                                                                "otherObligations",
                                                                e.target.value
                                                            )
                                                        }
                                                        className={tableCellInputClass}
                                                        placeholder="Monthly"
                                                    />
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                <ReadonlyValue
                                                    value={
                                                        formData.otherObligations
                                                            ? String(
                                                                toNumber(
                                                                    formData.otherObligations
                                                                ) * 12
                                                            )
                                                            : "Yearly"
                                                    }
                                                />
                                            </td>
                                        </tr>
                                        <tr className="bg-gray-50 font-semibold text-gray-800">
                                            <td className="border border-gray-300 px-4 py-2">Total</td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalMonthlyExpenses}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalYearlyExpenses}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>

                        <SectionCard title="Other Obligation Details">
                            {!readOnly && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addObligationRow}
                                        className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Add Row
                                    </button>
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-300 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {[
                                                "Company Name",
                                                "Credit Type",
                                                "Credit Amount",
                                                "Mode of Repayment",
                                                "EMI / EWI / EFI",
                                            ].map((heading) => (
                                                <th
                                                    key={heading}
                                                    className="border border-gray-300 px-4 py-2 text-left"
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                            {!readOnly && (
                                                <th className="border border-gray-300 px-4 py-2 text-left">
                                                    Action
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.obligationRows.map((row, index) => (
                                            <tr key={`obligation-${index}`}>
                                                {(
                                                    [
                                                        "companyName",
                                                        "creditType",
                                                        "creditAmount",
                                                        "repaymentMode",
                                                        "installmentAmount",
                                                    ] as (keyof ObligationRow)[]
                                                ).map((field) => (
                                                    <td
                                                        key={field}
                                                        className="border border-gray-300 px-4 py-2"
                                                    >
                                                        {readOnly ? (
                                                            <ReadonlyValue value={row[field]} />
                                                        ) : (
                                                            <input
                                                                type={
                                                                    field === "creditAmount" ||
                                                                        field === "installmentAmount"
                                                                        ? "number"
                                                                        : "text"
                                                                }
                                                                value={row[field]}
                                                                onChange={(e) =>
                                                                    updateObligationRow(
                                                                        index,
                                                                        field,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={tableCellInputClass}
                                                                placeholder={field}
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                                {!readOnly && (
                                                    <td className="border border-gray-300 px-4 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeObligationRow(index)}
                                                            className="px-3 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-semibold text-gray-800">
                                            <td className="border border-gray-300 px-4 py-2" colSpan={2}>
                                                Total
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalObligationAmount}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">-</td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalInstallmentAmount}
                                            </td>
                                            {!readOnly && (
                                                <td className="border border-gray-300 px-4 py-2">-</td>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>

                        <SectionCard title="Net Surplus">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Net Surplus (A - B) / 12
                                    </label>
                                    <ReadonlyValue value={netSurplus.toFixed(2)} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                A = Total Household Income (Yearly)
                            </p>

                            <p className="text-xs text-gray-500">
                                B = Total Yearly Expenses + Loan Obligations
                            </p>
                        </SectionCard>

                        <SectionCard title="Business Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Business Type
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["shopBased", "Shop Based"],
                                            ["homeBased", "Home Based"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.businessType === value}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField(
                                                            "businessType",
                                                            value as BusinessMode
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {renderTextField("businessNature", "Business Nature")}
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Entitled
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["proprietor", "Proprietor"],
                                            ["partnership", "Partnership"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.entitled === value}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField("entitled", value as EntitledOption)
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Address
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessAddress} />
                                    ) : (
                                        <textarea
                                            value={formData.businessAddress}
                                            onChange={(e) =>
                                                updateField("businessAddress", e.target.value)
                                            }
                                            className={`${inputClass} min-h-24`}
                                            placeholder="Business Address"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Owned / Rented
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["owned", "Owned"],
                                            ["rented", "Rented"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.businessOwnership === value}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField(
                                                            "businessOwnership",
                                                            value as BusinessOwnership
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {renderTextField("businessVintage", "Business Vintage (Years)")}
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Photo
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessPhotoName} />
                                    ) : (
                                        <input
                                            type="file"
                                            className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    "businessPhoto",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Proof
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessProofName} />
                                    ) : (
                                        <input
                                            type="file"
                                            className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    "businessProof",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Bank A/C Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {renderTextField("bankFirstName", "First Name")}
                                {renderTextField("bankMiddleName", "Middle Name")}
                                {renderTextField("bankLastName", "Last Name")}
                                {renderTextField("bankName", "Bank Name")}
                                {renderTextField("accountNumber", "Account Number")}
                                {renderTextField("ifscCode", "IFSC Code")}
                            </div>
                        </SectionCard>

                        {!readOnly && (
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={requestSubmitConfirmation}
                                    className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Submit CAF
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showSubmitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Confirm Submit
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to submit this CAF?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSubmitConfirm(false)}
                                className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingRemoveIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Confirm Remove
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to remove this obligation row?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPendingRemoveIndex(null)}
                                className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRemoveObligationRow}
                                className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
