"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type IncomeSource = "business" | "agriculture" | "wages" | "rental" | "pension" | "dbt";
type DayKey =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
type CreditDecision = "approved" | "rejected" | "";
type ExpenditureKey =
    | "shopHouseRent"
    | "food"
    | "electricity"
    | "education"
    | "telephone"
    | "festival"
    | "health"
    | "travel"
    | "labor"
    | "fuelTransport"
    | "fixedObligation"
    | "otherMiscellaneous";

type DailySales = Record<DayKey, string>;
type ExpenditureValues = Record<ExpenditureKey, string>;

export type CAMFormData = {
    primarySources: IncomeSource[];
    secondarySources: IncomeSource[];
    dailySales: DailySales;
    totalMonthlySale: string;
    profitMargin: string;
    totalAccumulatedProfit: string;
    secondaryIncomeAmount: string;
    totalAccumulatedIncome: string;
    numberOfStaff: string;
    wagesSalary: string;
    expenditureMonthly: ExpenditureValues;
    proposedEmi: string;
    isQualifyingCustomer: boolean;
    creditDecision: CreditDecision;
    remarks: string;
};

const weekdayLabels: Array<{ key: DayKey; label: string }> = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
];

const expenditureRows: Array<{ key: ExpenditureKey; label: string }> = [
    { key: "shopHouseRent", label: "Shop / House Rent" },
    { key: "food", label: "Food" },
    { key: "electricity", label: "Electricity" },
    { key: "education", label: "Education" },
    { key: "telephone", label: "Telephone" },
    { key: "festival", label: "Festival" },
    { key: "health", label: "Health" },
    { key: "travel", label: "Travel" },
    { key: "labor", label: "Labor" },
    { key: "fuelTransport", label: "Fuel & Transport" },
    { key: "fixedObligation", label: "Fixed Obligation (EMIs)" },
    { key: "otherMiscellaneous", label: "Other Miscellaneous Expense" },
];

const sourceOptions = {
    primary: [
        { label: "Business", value: "business" as const },
        { label: "Agriculture", value: "agriculture" as const },
        { label: "Wages", value: "wages" as const },
    ],
    secondary: [
        { label: "Rental", value: "rental" as const },
        { label: "Pension", value: "pension" as const },
        { label: "DBT", value: "dbt" as const },
    ],
};

const emptyDailySales = (): DailySales => ({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
});

const emptyExpenditureValues = (): ExpenditureValues => ({
    shopHouseRent: "",
    food: "",
    electricity: "",
    education: "",
    telephone: "",
    festival: "",
    health: "",
    travel: "",
    labor: "",
    fuelTransport: "",
    fixedObligation: "",
    otherMiscellaneous: "",
});

export const createDefaultCAMData = (): CAMFormData => ({
    primarySources: [],
    secondarySources: [],
    dailySales: emptyDailySales(),
    totalMonthlySale: "",
    profitMargin: "",
    totalAccumulatedProfit: "",
    secondaryIncomeAmount: "",
    totalAccumulatedIncome: "",
    numberOfStaff: "",
    wagesSalary: "",
    expenditureMonthly: emptyExpenditureValues(),
    proposedEmi: "",
    isQualifyingCustomer: false,
    creditDecision: "",
    remarks: "",
});

export const createSampleCAMData = (): CAMFormData => ({
    primarySources: ["business", "agriculture"],
    secondarySources: ["rental", "dbt"],
    dailySales: {
        monday: "4200",
        tuesday: "4500",
        wednesday: "4000",
        thursday: "4600",
        friday: "4800",
        saturday: "5200",
        sunday: "3900",
    },
    totalMonthlySale: "124800",
    profitMargin: "18",
    totalAccumulatedProfit: "22464",
    secondaryIncomeAmount: "8500",
    totalAccumulatedIncome: "30964",
    numberOfStaff: "3",
    wagesSalary: "12000",
    expenditureMonthly: {
        shopHouseRent: "4500",
        food: "5200",
        electricity: "1500",
        education: "1800",
        telephone: "700",
        festival: "1200",
        health: "900",
        travel: "1000",
        labor: "2500",
        fuelTransport: "1600",
        fixedObligation: "3500",
        otherMiscellaneous: "1100",
    },
    proposedEmi: "6000",
    isQualifyingCustomer: true,
    creditDecision: "approved",
    remarks: "Stable business cash flow and manageable monthly obligations.",
});

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const normalizeEmptyToNull = (value: unknown): unknown => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
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

    return value;
};

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-[1.05rem] font-semibold text-green-700">{title}</h2>
            <div className="mt-3 border-t border-gray-200 pt-4">{children}</div>
        </section>
    );
}

function ReadonlyValue({
    value,
    className = "",
}: {
    value: string;
    className?: string;
}) {
    return (
        <div
            className={`min-h-[42px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 ${className}`}
        >
            {value || "-"}
        </div>
    );
}

type CAMFormProps = {
    mode?: "create" | "view" | "edit";
    initialData?: any;
};

export default function CAMForm({
    mode = "create",
    initialData,
}: CAMFormProps) {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<CAMFormData>(createDefaultCAMData());

    useEffect(() => {
        if (mode === "edit" || mode === "view") {
            if (initialData) {
                // Set selected customer from initial data
                if (initialData.loan_application) {
                    const customerObj = initialData.loan_application;
                    setSelectedCustomer({
                        ...customerObj,
                        customer: initialData.customer,
                        pd_application_id: initialData.pd_id
                    });

                    const fullName = initialData.customer
                        ? `${initialData.customer.first_name || ""} ${initialData.customer.last_name || ""}`.trim()
                        : customerObj.customer_name || "Unknown";
                    setCustomerSearch(fullName);
                }

                // Map data to form fields
                const income = initialData.income_details || {};
                const expenditure = initialData.expenditure_details || {};

                setFormData({
                    primarySources: income.primarySources || [],
                    secondarySources: income.secondarySources || [],
                    dailySales: income.dailySales || emptyDailySales(),
                    totalMonthlySale: income.totalMonthlySale || "",
                    profitMargin: income.profitMargin || "",
                    totalAccumulatedProfit: income.totalAccumulatedProfit || "",
                    secondaryIncomeAmount: income.secondaryIncomeAmount || "",
                    totalAccumulatedIncome: income.totalAccumulatedIncome || "",
                    numberOfStaff: income.numberOfStaff || "",
                    wagesSalary: income.wagesSalary || "",
                    expenditureMonthly: expenditure.monthlyRows || emptyExpenditureMonthly(),
                    proposedEmi: initialData.net_surplus?.proposedEmi || "",
                    isQualifyingCustomer: true,
                    creditDecision: initialData.credit_decision || "",
                    remarks: initialData.remarks || "",
                });
            }
        }
    }, [mode, initialData]);

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const fetchVerifiedPdCustomers = async (search = "") => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) return;

            const cmsAdminId =
                user?.role?.toLowerCase() === "cms_admin"
                    ? user?.user_id
                    : user?.cms_admin;

            const response = await axiosInstance.get(
                ProjectApiList.api_getAllPD,
                {
                    params: {
                        page: 1,
                        search,
                        user_id: user?.user_id,
                        branch_id: user?.branch,
                        cms_admin_id: cmsAdminId,
                        is_cam_created: false,
                    },
                }
            );

            if (response.data.success) {
                setCustomers(response.data.data);
            } else {
                toast.error(
                    response.data.message || "Failed to fetch customers"
                );
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === "create") {
            fetchVerifiedPdCustomers();
        }
    }, [mode]);

    const idFromParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;
    useEffect(() => {
        if (idFromParams && customers.length > 0) {
            const customerMatch = customers.find(c => String(c.loan_application_id) === idFromParams);
            if (customerMatch) handleSelectCustomer(customerMatch);
        }
    }, [idFromParams, customers]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter((c) => {
            const fullName = c.customer
                ? `${c.customer.first_name || ""} ${c.customer.last_name || ""}`.trim()
                : c.customer_name || "";
            return (
                fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                (c.loan_application_id || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                (c.customer_unique_id || "").toLowerCase().includes(customerSearch.toLowerCase())
            );
        });
    }, [customerSearch, customers]);

    const handleSelectCustomer = (customer: any) => {
        setSelectedCustomer(customer);
        const fullName = customer.customer
            ? `${customer.customer.first_name || ""} ${customer.customer.last_name || ""}`.trim()
            : customer.customer_name || "Unknown";
        setCustomerSearch(fullName);
        setShowDropdown(false);
        toast.info(`Selected: ${fullName}`);
        clearFieldError("customer");
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const readOnly = mode === "view";

    const inputClass =
        "bg-gray-50 rounded-md px-3 py-2 text-sm w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600";
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";
    const checkboxClass = "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600";

    const setFieldRef = (field: string, node: HTMLElement | null) => {
        if (node) {
            fieldRefs.current[field] = node;
        }
    };

    const fieldErrorClass = (field: string, baseClass = inputClass) =>
        fieldErrors[field]
            ? `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`
            : baseClass;

    const clearFieldError = (field: string) => {
        if (!fieldErrors[field]) return;
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const focusFirstError = (errors: Record<string, string>) => {
        const key = Object.keys(errors)[0];
        if (!key) return;
        const node = fieldRefs.current[key];
        if (node) {
            node.scrollIntoView({ behavior: "smooth", block: "center" });
            if (typeof node.focus === "function") node.focus();
        }
    };

    const dailySalesTotal = useMemo(
        () =>
            weekdayLabels.reduce(
                (sum, { key }) => sum + toNumber(formData.dailySales[key]),
                0
            ),
        [formData.dailySales]
    );

    const computedTotalMonthlySale = useMemo(() => dailySalesTotal * 4, [dailySalesTotal]);

    const computedTotalAccumulatedProfit = useMemo(() => {
        const sale = toNumber(formData.totalMonthlySale);
        const margin = toNumber(formData.profitMargin);
        return (sale * margin) / 100;
    }, [formData.totalMonthlySale, formData.profitMargin]);

    const computedTotalAccumulatedIncome = useMemo(
        () =>
            computedTotalAccumulatedProfit + toNumber(formData.secondaryIncomeAmount),
        [computedTotalAccumulatedProfit, formData.secondaryIncomeAmount]
    );

    const totalAccumulatedIncomeMonthly =
        computedTotalMonthlySale + computedTotalAccumulatedIncome;

    const totalMonthlyExpenditure = useMemo(
        () =>
            expenditureRows.reduce(
                (sum, { key }) => sum + toNumber(formData.expenditureMonthly[key]),
                0
            ),
        [formData.expenditureMonthly]
    );

    const totalYearlyExpenditure = useMemo(
        () =>
            expenditureRows.reduce(
                (sum, { key }) => sum + toNumber(formData.expenditureMonthly[key]) * 12,
                0
            ),
        [formData.expenditureMonthly]
    );

    const computedTotalYearlySale = useMemo(
        () => computedTotalMonthlySale * 12,
        [computedTotalMonthlySale]
    );

    const fixedMonthlyObligation = toNumber(formData.expenditureMonthly.fixedObligation);

    const yearlyAccumulatedIncome = computedTotalAccumulatedIncome * 12;
    const yearlyWagesSalary = toNumber(formData.wagesSalary) * 12;

    const totalYearlyIncome =
        computedTotalYearlySale +
        computedTotalAccumulatedIncome -
        toNumber(formData.wagesSalary);

    const monthlyExpenditure = totalMonthlyExpenditure;

    const netSurplus =
        totalAccumulatedIncomeMonthly - monthlyExpenditure;

    const proposedEmi = toNumber(formData.proposedEmi);

    const eligibilityStatus =
        proposedEmi > 0 && netSurplus >= proposedEmi * 1.5
            ? "Eligible"
            : "Not Eligible";

    const foir =
        formData.isQualifyingCustomer && computedTotalAccumulatedIncome > 0
            ? (fixedMonthlyObligation / computedTotalAccumulatedIncome) * 100
            : 0;


    const syncDerivedValues = (draft: CAMFormData): CAMFormData => {
        const monthlySale = weekdayLabels.reduce(
            (sum, { key }) => sum + toNumber(draft.dailySales[key]),
            0
        ) * 4;
        const totalAccumulatedProfit = (monthlySale * toNumber(draft.profitMargin)) / 100;
        const totalAccumulatedIncome =
            totalAccumulatedProfit + toNumber(draft.secondaryIncomeAmount);

        return {
            ...draft,
            totalMonthlySale: monthlySale ? formatNumber(monthlySale) : "",
            totalAccumulatedProfit: totalAccumulatedProfit
                ? formatNumber(totalAccumulatedProfit)
                : "",
            totalAccumulatedIncome: totalAccumulatedIncome
                ? formatNumber(totalAccumulatedIncome)
                : "",
        };
    };

    const sanitizeNumber = (value: string) => value.replace(/[^\d.]/g, "");

    const updateDailySale = (day: DayKey, value: string) => {
        clearFieldError("dailySales");
        setFormData((prev) =>
            syncDerivedValues({
                ...prev,
                dailySales: {
                    ...prev.dailySales,
                    [day]: sanitizeNumber(value),
                },
            })
        );
    };

    const updateField = <K extends keyof CAMFormData>(field: K, value: CAMFormData[K]) => {
        clearFieldError(String(field));
        setFormData((prev) => {
            const nextValue =
                typeof value === "string" &&
                    [
                        "profitMargin",
                        "secondaryIncomeAmount",
                        "numberOfStaff",
                        "wagesSalary",
                        "proposedEmi",
                    ].includes(field)
                    ? (sanitizeNumber(value) as CAMFormData[K])
                    : value;

            const nextData = {
                ...prev,
                [field]: nextValue,
            };

            if (field === "profitMargin" || field === "secondaryIncomeAmount") {
                return syncDerivedValues(nextData);
            }

            return nextData;
        });
    };

    const updateExpenditure = (key: ExpenditureKey, value: string) => {
        clearFieldError("expenditureMonthly");
        setFormData((prev) => ({
            ...prev,
            expenditureMonthly: {
                ...prev.expenditureMonthly,
                [key]: sanitizeNumber(value),
            },
        }));
    };

    const toggleSource = (
        field: "primarySources" | "secondarySources",
        value: IncomeSource
    ) => {
        clearFieldError(field === "primarySources" ? "primarySources" : "secondarySources");
        setFormData((prev) => {
            const sourceList = prev[field];
            return {
                ...prev,
                [field]: sourceList.includes(value)
                    ? sourceList.filter((item) => item !== value)
                    : [...sourceList, value],
            };
        });
    };
    // console.log(selectedCustomer)
    const buildPayload = () => {
        const user = getLoggedInUser();
        const cmsAdminId =
            user?.role?.toLowerCase() === "cms_admin"
                ? user?.user_id
                : (user?.cms_admin || user?.cms_admin_id || "");

        return normalizeEmptyToNull({
            user_id: user?.user_id ?? user?.id ?? null,
            branch_id: user?.branch_id ?? user?.branch ?? null,
            cms_admin_id: cmsAdminId,
            loan_application_id: selectedCustomer?.loan_application_id || "",
            customer_unique_id: selectedCustomer?.customer_unique_id || "",
            pd_id: selectedCustomer?.pd_application_id || null,
            formData,
            computed: {
                dailySalesTotal,
                totalMonthlySale: computedTotalMonthlySale,
                totalAccumulatedProfit: computedTotalAccumulatedProfit,
                totalAccumulatedIncome: computedTotalAccumulatedIncome,
                totalMonthlyExpenditure,
                totalYearlyExpenditure,
                fixedMonthlyObligation,
                netSurplus,
                proposedEmi,
                eligibilityStatus,
                foir,
            },
        });
    };

    const validateCAMSubmissionStepWise = () => {
        if (!selectedCustomer) {
            return {
                field: "customer",
                message: "Please select a PD Application first.",
            };
        }

        if (formData.primarySources.length === 0) {
            return {
                field: "primarySources",
                message: "Please select at least one primary income source.",
            };
        }

        const hasDailySales = weekdayLabels.some(
            ({ key }) => formData.dailySales[key].trim() !== ""
        );

        if (!hasDailySales) {
            return {
                field: "dailySales",
                message: "Please enter daily sales details.",
            };
        }

        if (!formData.profitMargin.trim()) {
            return {
                field: "profitMargin",
                message: "Please enter profit margin percentage.",
            };
        }

        if (!formData.secondaryIncomeAmount.trim()) {
            return {
                field: "secondaryIncomeAmount",
                message: "Please enter secondary income amount.",
            };
        }

        if (!formData.numberOfStaff.trim()) {
            return {
                field: "numberOfStaff",
                message: "Please enter number of staff.",
            };
        }

        if (!formData.wagesSalary.trim()) {
            return {
                field: "wagesSalary",
                message: "Please enter wages / salary.",
            };
        }

        const hasExpenditure = expenditureRows.some(
            ({ key }) => formData.expenditureMonthly[key].trim() !== ""
        );

        if (!hasExpenditure) {
            return {
                field: "expenditureMonthly",
                message: "Please enter expenditure details.",
            };
        }

        if (!formData.proposedEmi.trim()) {
            return {
                field: "proposedEmi",
                message: "Please enter proposed EMI.",
            };
        }

        if (!formData.creditDecision) {
            return {
                field: "creditDecision",
                message: "Please select credit decision.",
            };
        }

        if (!formData.remarks.trim()) {
            return {
                field: "remarks",
                message: "Please enter remarks.",
            };
        }

        return null;
    };

    const handleSave = () => {

        if (!selectedCustomer) {
            toast.error("Please select a PD Application first.");
            return;
        }

        const payload = buildPayload();
        // console.log("CAM save payload:", payload);
        toast.success("CAM details saved successfully.");
    };

    const handleSubmit = async () => {
        const error = validateCAMSubmissionStepWise();

        if (error) {
            const errors = {
                [error.field]: error.message,
            };

            setFieldErrors(errors);
            focusFirstError(errors);

            toast.error(error.message);
            return;
        }

        setFieldErrors({});

        try {
            setLoading(true);
            const user = getLoggedInUser();

            const data = new FormData();

            // Context
            const cmsAdminId =
                user?.role?.toLowerCase() === "cms_admin"
                    ? user?.user_id
                    : (user?.cms_admin || user?.cms_admin_id || "");

            data.append("cms_admin_id", cmsAdminId);
            data.append("branch_id", user?.branch || user?.branch_id || "");

            // Basic Info
            data.append("loan_application_id", selectedCustomer?.loan_application_id || "");
            data.append("customer_unique_id", selectedCustomer?.customer_unique_id || "");
            data.append("pd_id", selectedCustomer?.pd_application_id || ""); // Send pd_application_id instead of internal ID

            // Section JSONs
            data.append(
                "income_details",
                JSON.stringify({
                    primarySources: formData.primarySources,
                    secondarySources: formData.secondarySources,
                    dailySales: formData.dailySales,

                    totalMonthlySale: formatNumber(computedTotalMonthlySale),
                    totalYearlySale: formatNumber(computedTotalYearlySale),

                    profitMargin: formData.profitMargin,

                    totalAccumulatedProfit: formatNumber(computedTotalAccumulatedProfit),

                    secondaryIncomeAmount: formData.secondaryIncomeAmount,

                    totalAccumulatedIncome: formatNumber(computedTotalAccumulatedIncome),

                    totalAccumulatedIncomeMonthly: formatNumber(totalAccumulatedIncomeMonthly),

                    numberOfStaff: formData.numberOfStaff,
                    wagesSalary: formData.wagesSalary
                })
            );

            data.append(
                "expenditure_details",
                JSON.stringify({
                    monthlyRows: formData.expenditureMonthly,
                    totalMonthlyExpenditure: formatNumber(totalMonthlyExpenditure),
                    totalYearlyExpenditure: formatNumber(totalYearlyExpenditure)
                })
            );

            data.append(
                "net_surplus",
                JSON.stringify({
                    monthlyIncome: formatNumber(totalAccumulatedIncomeMonthly),
                    monthlyExpenditure: formatNumber(totalMonthlyExpenditure),
                    netSurplus: formatNumber(netSurplus),
                    proposedEmi: formData.proposedEmi,
                    eligibilityStatus,
                    foir: formatNumber(foir)
                })
            );

            data.append("credit_decision", formData.creditDecision);
            data.append("remarks", formData.remarks);

            if (mode === "edit" && initialData?.id) {
                data.append("id", String(initialData.id));
            }

            // console.log(mode === "edit" ? "Updating CAM..." : "Submitting CAM...");
            const res = await axiosInstance.post(ProjectApiList.api_createCAM, data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data.success) {
                toast.success(mode === "edit" ? "CAM updated successfully!" : "CAM submitted successfully!");
                router.push("/loan/cam/");
            } else {
                toast.error(res.data.message || (mode === "edit" ? "Failed to update CAM" : "Failed to submit CAM"));
            }
        } catch (error: any) {
            console.error("CAM Submission error:", error);
            const response = error.response?.data;
            const msg = response?.message || "An error occurred during submission.";
            toast.error(msg);
            const backendErrors: Record<string, string> = {};
            if (response?.errors) {
                Object.entries(response.errors).forEach(([key, val]: any) => {
                    const message = Array.isArray(val) ? val[0] : String(val);
                    backendErrors[key] = message;
                });
                if (Object.keys(backendErrors).length) {
                    setFieldErrors(backendErrors);
                    focusFirstError(backendErrors);
                }
            }
        } finally {
            setLoading(false);
            setShowSubmitConfirm(false);
        }
    };

    const requestSubmitConfirmation = () => {
        const error = validateCAMSubmissionStepWise();

        if (error) {
            const errors = {
                [error.field]: error.message,
            };

            setFieldErrors(errors);
            focusFirstError(errors);

            toast.error(error.message);
            return;
        }
        setFieldErrors({});

        setShowSubmitConfirm(true);
    };

    const renderSourceCheckboxes = (
        title: string,
        field: "primarySources" | "secondarySources",
        options: Array<{ label: string; value: IncomeSource }>
    ) => (
        <div>
            <label className="mb-2 block text-sm text-gray-700">{title}</label>
            <div
                className={`flex flex-wrap gap-5 rounded-md bg-gray-50 px-3 py-3 ${fieldErrors[field] ? "border border-red-500 bg-red-50/50" : ""}`}
                ref={(el) => setFieldRef(field, el as HTMLElement)}
                tabIndex={-1}
            >
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm text-gray-700"
                    >
                        <input
                            type="checkbox"
                            checked={formData[field].includes(option.value)}
                            onChange={() => toggleSource(field, option.value)}
                            className={checkboxClass}
                            disabled={readOnly}
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            {fieldErrors[field] && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors[field]}</p>
            )}
        </div>
    );

    return (

        <div className="relative">

            {/* 🔥 GLOBAL LOADER */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600 font-medium">
                            Processing...
                        </span>
                    </div>
                </div>
            )}
            <div className="p-6 space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-300 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="mb-3 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                        >
                            Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">
                            CAM (Credit Appraisal Memorandum)
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Maintain CAM details in the existing loan module UI style.
                        </p>
                    </div>

                    {readOnly && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/loan/cam/createCAM")}
                                className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                            >
                                Edit
                            </button>
                        </div>
                    )}
                </div>

                {/* Customer Selector Section */}
                {mode === "create" && (
                    <SectionCard title="Select PD Application ">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="relative" ref={dropdownRef}>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Search Application (Name or ID)
                                </label>
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setCustomerSearch(value);
                                        setShowDropdown(true);
                                        fetchVerifiedPdCustomers(value); // API search
                                        clearFieldError("customer");
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="Start typing to search..."
                                    ref={(el) => setFieldRef("customer", el as HTMLElement)}
                                    className={fieldErrorClass(
                                        "customer",
                                        "w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    )}
                                />
                                {fieldErrors.customer && (
                                    <p className="mt-1 text-xs text-red-600">{fieldErrors.customer}</p>
                                )}
                                {showDropdown && (
                                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
                                        {loading ? (
                                            <li className="px-4 py-2 text-gray-500">Loading...</li>
                                        ) : filteredCustomers.length > 0 ? (
                                            filteredCustomers
                                                .filter(
                                                    (customer) =>
                                                        customer?.loan_application?.credit_mode !== "product"
                                                )
                                                .map((customer) => (<li
                                                    key={customer.id}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                    className="cursor-pointer px-4 py-3 hover:bg-green-50 hover:text-green-700 border-b"
                                                >
                                                    {/* Application Name */}
                                                    <div className="font-semibold text-gray-900">
                                                        {customer.product_name || "Loan Application"}
                                                    </div>

                                                    {/* Customer Name */}
                                                    <div className="text-sm text-gray-700">
                                                        {customer.customer
                                                            ? `${customer.customer.first_name || ""} ${customer.customer.last_name || ""}`.trim()
                                                            : customer.customer_name || "Unknown"}
                                                    </div>

                                                    {/* Extra Info */}
                                                    <div className="text-xs text-gray-500">
                                                        ID: {customer.loan_application_id || customer.customer_unique_id} |
                                                        Mobile: {customer.customer?.contact_number_1 || "N/A"}
                                                    </div>
                                                </li>
                                                ))
                                        ) : (
                                            <li className="px-4 py-2 text-gray-500">
                                                No verified customers found
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>

                            {selectedCustomer && (
                                <div className="rounded-lg bg-green-50 p-4 border border-green-100">
                                    <h3 className="mb-2 text-sm font-semibold text-green-800">
                                        Selected Customer Info
                                    </h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-700">
                                        <span>ID:</span>
                                        <span className="font-medium">
                                            {selectedCustomer.loan_application_id || selectedCustomer.customer_unique_id}
                                        </span>
                                        <span>Mobile:</span>
                                        <span className="font-medium">
                                            {selectedCustomer?.customer?.contact_number_1 || "N/A"}
                                        </span>
                                        <span>Loan Amount:</span>
                                        <span className="font-medium">
                                            ₹{selectedCustomer?.loan_application?.credit_applied_for || "0"}
                                        </span>
                                        <span>Product:</span>
                                        <span className="font-medium">
                                            {selectedCustomer?.loan_application?.product_name || selectedCustomer.credit_mode || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                )}

                <SectionCard title=" Income Details">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {renderSourceCheckboxes(
                            "Primary Source *",
                            "primarySources",
                            sourceOptions.primary
                        )}
                        {renderSourceCheckboxes(
                            "Secondary Source *",
                            "secondarySources",
                            sourceOptions.secondary
                        )}
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block text-sm text-gray-700">Daily Sales <span className="text-red-500">*</span></label>
                        <div
                            className={`grid grid-cols-1 gap-4 rounded-md border px-3 py-3 sm:grid-cols-2 xl:grid-cols-4 ${fieldErrors.dailySales ? "border-red-500 bg-red-50/50" : "border-transparent"}`}
                            ref={(el) => setFieldRef("dailySales", el as HTMLElement)}
                            tabIndex={-1}
                        >
                            {weekdayLabels.map(({ key, label }) => (
                                <div key={key}>
                                    <label className="mb-1 block text-sm text-gray-600">{label}</label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.dailySales[key]} />
                                    ) : (
                                        <input
                                            value={formData.dailySales[key]}
                                            onChange={(e) => updateDailySale(key, e.target.value)}
                                            className={fieldErrorClass("dailySales", inputClass)}
                                            placeholder={label}
                                            inputMode="decimal"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {fieldErrors.dailySales && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.dailySales}</p>
                        )}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">Total Monthly Sale</label>
                            <ReadonlyValue
                                value={formData.totalMonthlySale || formatNumber(computedTotalMonthlySale)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-700">Total Yearly Sale</label>
                            <ReadonlyValue
                                value={formatNumber(computedTotalYearlySale)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">Profit Margin % <span className="text-red-500">*</span></label>
                            {readOnly ? (
                                <ReadonlyValue value={formData.profitMargin} />
                            ) : (
                                <input
                                    value={formData.profitMargin}
                                    onChange={(e) => updateField("profitMargin", e.target.value)}
                                    ref={(el) => setFieldRef("profitMargin", el as HTMLElement)}
                                    className={fieldErrorClass("profitMargin")}
                                    placeholder="Profit Margin %"
                                    inputMode="decimal"
                                />
                            )}
                            {fieldErrors.profitMargin && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.profitMargin}</p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Total Accumulated Profit (Monthly)
                            </label>
                            <ReadonlyValue
                                value={
                                    formData.totalAccumulatedProfit ||
                                    formatNumber(computedTotalAccumulatedProfit)
                                }
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Secondary Income Amount <span className="text-red-500">*</span>
                            </label>
                            {readOnly ? (
                                <ReadonlyValue value={formData.secondaryIncomeAmount} />
                            ) : (
                                <input
                                    value={formData.secondaryIncomeAmount}
                                    onChange={(e) =>
                                        updateField("secondaryIncomeAmount", e.target.value)
                                    }
                                    ref={(el) => setFieldRef("secondaryIncomeAmount", el as HTMLElement)}
                                    className={fieldErrorClass("secondaryIncomeAmount")}
                                    placeholder="Secondary Income Amount"
                                    inputMode="decimal"
                                />
                            )}
                            {fieldErrors.secondaryIncomeAmount && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.secondaryIncomeAmount}</p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Total Accumulated Income
                            </label>
                            <ReadonlyValue
                                value={
                                    formData.totalAccumulatedIncome ||
                                    formatNumber(computedTotalAccumulatedIncome)
                                }
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">Number of Staff <span className="text-red-500">*</span></label>
                            {readOnly ? (
                                <ReadonlyValue value={formData.numberOfStaff} />
                            ) : (
                                <input
                                    value={formData.numberOfStaff}
                                    onChange={(e) => updateField("numberOfStaff", e.target.value)}
                                    ref={(el) => setFieldRef("numberOfStaff", el as HTMLElement)}
                                    className={fieldErrorClass("numberOfStaff")}
                                    placeholder="Number of Staff"
                                    inputMode="numeric"
                                />
                            )}
                            {fieldErrors.numberOfStaff && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.numberOfStaff}</p>
                            )}
                        </div>
                        <div className="xl:col-span-2">
                            <label className="mb-1 block text-sm text-gray-700">Wages / Salary <span className="text-red-500">*</span></label>
                            {readOnly ? (
                                <ReadonlyValue value={formData.wagesSalary} />
                            ) : (
                                <input
                                    value={formData.wagesSalary}
                                    onChange={(e) => updateField("wagesSalary", e.target.value)}
                                    ref={(el) => setFieldRef("wagesSalary", el as HTMLElement)}
                                    className={fieldErrorClass("wagesSalary")}
                                    placeholder="Wages / Salary"
                                    inputMode="decimal"
                                />
                            )}
                            {fieldErrors.wagesSalary && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.wagesSalary}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Total Accumulated Income (Monthly)
                            </label>

                            <ReadonlyValue
                                value={formatNumber(totalAccumulatedIncomeMonthly)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Total Accumulated Income (Yearly)
                            </label>

                            <ReadonlyValue
                                value={formatNumber(totalAccumulatedIncomeMonthly * 12)}
                            />
                        </div>


                    </div>
                </SectionCard>

                <SectionCard title=" Expenditure Details *">
                    <div
                        className={`overflow-x-auto rounded-md ${fieldErrors.expenditureMonthly ? "border border-red-500 bg-red-50/50" : ""}`}
                        ref={(el) => setFieldRef("expenditureMonthly", el as HTMLElement)}
                        tabIndex={-1}
                    >
                        <table className="min-w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {["Expense Details", "Monthly", "Yearly"].map((heading) => (
                                        <th
                                            key={heading}
                                            className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {expenditureRows.map((row) => (
                                    <tr key={row.key}>
                                        <td className="border border-gray-300 px-4 py-3 text-gray-800">
                                            {row.label}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            {readOnly ? (
                                                <ReadonlyValue
                                                    value={formData.expenditureMonthly[row.key]}
                                                />
                                            ) : (
                                                <input
                                                    value={formData.expenditureMonthly[row.key]}
                                                    onChange={(e) =>
                                                        updateExpenditure(row.key, e.target.value)
                                                    }
                                                    className={inputClass}
                                                    placeholder="Monthly"
                                                    inputMode="decimal"
                                                />
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <ReadonlyValue
                                                value={
                                                    formData.expenditureMonthly[row.key]
                                                        ? formatNumber(
                                                            toNumber(
                                                                formData.expenditureMonthly[row.key]
                                                            ) * 12
                                                        )
                                                        : ""
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="border border-gray-300 px-4 py-3">Total</td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        {formatNumber(totalMonthlyExpenditure)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        {formatNumber(totalYearlyExpenditure)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        {fieldErrors.expenditureMonthly && (
                            <p className="px-4 py-2 text-xs text-red-600">{fieldErrors.expenditureMonthly}</p>
                        )}
                    </div>
                </SectionCard>

                <SectionCard title=" Net Surplus">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Net Surplus (A - B)
                            </label>

                            <ReadonlyValue value={formatNumber(netSurplus)} />

                            <p className="mt-2 text-xs text-gray-500">
                                A = Monthly Income | B = Monthly Expenditure
                                <br />
                                Net Surplus = A − B
                                <br />
                                Net Surplus should be ≥ 1.5 × Proposed EMI.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Proposed EMI <span className="text-red-500">*</span>
                            </label>
                            {readOnly ? (
                                <ReadonlyValue value={formData.proposedEmi} />
                            ) : (
                                <input
                                    value={formData.proposedEmi}
                                    onChange={(e) => updateField("proposedEmi", e.target.value)}
                                    ref={(el) => setFieldRef("proposedEmi", el as HTMLElement)}
                                    className={fieldErrorClass("proposedEmi")}
                                    placeholder="Proposed EMI"
                                    inputMode="decimal"
                                />
                            )}
                            {fieldErrors.proposedEmi && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.proposedEmi}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-700">
                                Eligible / Not Eligible
                            </label>

                            <ReadonlyValue
                                value={proposedEmi > 0 ? eligibilityStatus : ""}
                                className={
                                    proposedEmi > 0 && eligibilityStatus === "Eligible"
                                        ? "border-green-300 bg-green-50 text-green-700"
                                        : proposedEmi > 0
                                            ? "border-red-300 bg-red-50 text-red-700"
                                            : ""
                                }
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title=" FOIR Calculation">
                    <p className="text-sm text-gray-700">
                        FOIR : CR 40% DR 60% (Fixed monthly obligation/ Monthly income)*100
                        (Applicable for only Qualifying Customer)
                    </p>
                </SectionCard>

                <SectionCard title=" Credit Decision *">
                    <div
                        className={`flex flex-wrap gap-6 rounded-md bg-gray-50 px-3 py-3 ${fieldErrors.creditDecision ? "border border-red-500 bg-red-50/50" : ""}`}
                        ref={(el) => setFieldRef("creditDecision", el as HTMLElement)}
                        tabIndex={-1}
                    >
                        {[
                            { label: "Approved", value: "approved" as const },
                            { label: "Rejected", value: "rejected" as const },
                        ].map((option) => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 text-sm text-gray-700"
                            >
                                <input
                                    type="radio"
                                    name="creditDecision"
                                    checked={formData.creditDecision === option.value}
                                    onChange={() => updateField("creditDecision", option.value)}
                                    className={radioClass}
                                    disabled={readOnly}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                    {fieldErrors.creditDecision && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.creditDecision}</p>
                    )}
                </SectionCard>

                <SectionCard title=" Remarks">
                    <div>
                        <label className="mb-1 block text-sm text-gray-700">Remarks <span className="text-red-500">*</span></label>
                        {readOnly ? (
                            <ReadonlyValue value={formData.remarks} className="min-h-[120px]" />
                        ) : (
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => updateField("remarks", e.target.value)}
                                ref={(el) => setFieldRef("remarks", el as HTMLElement)}
                                className={`${fieldErrorClass("remarks")} min-h-[120px]`}
                                placeholder="Enter remarks"
                            />
                        )}
                        {fieldErrors.remarks && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.remarks}</p>
                        )}
                    </div>
                </SectionCard>

                {!readOnly && (
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        {/* <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                    >
                        Save
                    </button> */}
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedCustomer) {
                                    toast.error("Please select a PD Application first.");
                                    return;
                                }
                                setIsPreviewOpen(true);
                            }} className="rounded-md bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                        >
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={requestSubmitConfirmation}
                            disabled={loading}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading
                                ? (mode === "edit" ? "Updating..." : "Submitting...")
                                : (mode === "edit" ? "Update" : "Submit")}
                        </button>
                    </div>
                )}

                {isPreviewOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-6xl rounded-xl bg-white p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">CAM Preview</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mt-5 max-h-[75vh] space-y-5 overflow-y-auto pr-1">
                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Income Summary
                                    </h4>
                                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm">
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Primary Source</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.primarySources.length > 0
                                                    ? formData.primarySources.join(", ")
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Secondary Source</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.secondarySources.length > 0
                                                    ? formData.secondarySources.join(", ")
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Total Monthly Sale</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formatNumber(computedTotalMonthlySale)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Profit Margin %</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.profitMargin || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">
                                                Total Accumulated Profit (Monthly)
                                            </p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formatNumber(computedTotalAccumulatedProfit)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Total Accumulated Income</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formatNumber(computedTotalAccumulatedIncome)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Expenditure Details
                                    </h4>
                                    <div className="mt-3 overflow-x-auto">
                                        <table className="min-w-full border border-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {["Expense Details", "Monthly", "Yearly"].map(
                                                        (heading) => (
                                                            <th
                                                                key={heading}
                                                                className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700"
                                                            >
                                                                {heading}
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenditureRows.map((row) => (
                                                    <tr key={`preview-${row.key}`}>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.label}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {formData.expenditureMonthly[row.key] || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {formData.expenditureMonthly[row.key]
                                                                ? formatNumber(
                                                                    toNumber(
                                                                        formData.expenditureMonthly[row.key]
                                                                    ) * 12
                                                                )
                                                                : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-medium">
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        Total
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {formatNumber(totalMonthlyExpenditure)}
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {formatNumber(totalYearlyExpenditure)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">Decision</h4>
                                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Net Surplus</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formatNumber(netSurplus)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Proposed EMI</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.proposedEmi || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Eligibility</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {proposedEmi > 0 ? eligibilityStatus : "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">FOIR</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.isQualifyingCustomer &&
                                                    computedTotalAccumulatedIncome > 0
                                                    ? `${formatNumber(foir)}%`
                                                    : "N/A"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4 md:col-span-2 xl:col-span-4">
                                            <p className="text-gray-500">Credit Decision</p>
                                            <p className="mt-1 font-medium text-gray-900 capitalize">
                                                {formData.creditDecision || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4 md:col-span-2 xl:col-span-4">
                                            <p className="text-gray-500">Remarks</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.remarks || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showSubmitConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {mode === "edit" ? "Confirm Update" : "Confirm Submit"}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">
                                {mode === "edit"
                                    ? "Are you sure you want to update this CAM information?"
                                    : "Are you sure you want to submit this CAM information?"}
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitConfirm(false)}
                                    className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading
                                        ? (mode === "edit" ? "Updating..." : "Submitting...")
                                        : (mode === "edit" ? "Yes, Update" : "Yes, Submit")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
