"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type PersonalInventoryRow = {
    id?: number;
    caseType: "personal";
    dateOfDisbursement: string;
    memberName: string;
    custId: string;
    loanId: string;
    product: string;
    productType: string;
    loanAmount: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    dateOfNeft: string;
    status: "NEFT Done" | "On Process" | "NEFT Failed";
};

type FinalDisbursementOption = {
    id: number;
    loan_id?: string;
    member_name?: string;
    cust_id?: string;
    product?: string;
    product_type?: string;
    loan_amount?: string | number;
    bank_name?: string;
    account_number?: string;
    ifsc?: string;
    date_of_disbursement?: string;
    payment_date?: string;
    payment_status?: PersonalInventoryRow["status"];
    investor_unique_id?: string;
    payment_method?: string;
    upi_reference_no?: string;
    payment_screenshot?: string;
};

type ConsumerInventoryRow = {
    caseType: "consumer";
    dateOfDisbursement: string;
    memberName: string;
    custId: string;
    loanId: string;
    product: string;
    productType: string;
    loanAmount: string;
    documentDownload: string;
    dateOfDoIssue: string;
    dateOfDelivery: string;
    status: "Delivered";
};

type PaymentHistoryEntry = {
    payment_id?: string | number;
    loan_id?: string;
    date?: string;
    amount?: string | number;
};

const personalRowSeed: PersonalInventoryRow = {
    caseType: "personal",
    dateOfDisbursement: "",
    memberName: "",
    custId: "",
    loanId: "",
    product: "",
    productType: "",
    loanAmount: "0",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    dateOfNeft: "",
    status: "NEFT Done",
};

const consumerRowSeed: ConsumerInventoryRow = {
    caseType: "consumer",
    dateOfDisbursement: "",
    memberName: "",
    custId: "",
    loanId: "",
    product: "",
    productType: "",
    loanAmount: "0",
    documentDownload: "",
    dateOfDoIssue: "",
    dateOfDelivery: "",
    status: "Delivered",
};

function PaymentInventoryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedId = searchParams.get("id");
    const [activeCase] = useState<"personal" | "consumer">("personal");
    const [personalRow, setPersonalRow] = useState<PersonalInventoryRow>(personalRowSeed);
    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
    const [referenceNumber, setReferenceNumber] = useState<string>("");
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string>("");
    const [consumerRow, setConsumerRow] = useState<ConsumerInventoryRow>(consumerRowSeed);
    const [saved, setSaved] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Search and Selection State
    const [searchQuery, setSearchQuery] = useState("");
    const [cams, setCams] = useState<FinalDisbursementOption[]>([]);
    const [filteredCams, setFilteredCams] = useState<FinalDisbursementOption[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Investor pool balance state
    const [investmentUniqueId, setInvestmentUniqueId] = useState<string>(""); // ANVINV... for deduct endpoint
    const [poolTotalAmount, setPoolTotalAmount] = useState<number | null>(null);
    const [poolBalance, setPoolBalance] = useState<number | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
    const [loadingBalance, setLoadingBalance] = useState(false);

    const isCashDisbursement = [personalRow.productType, personalRow.product]
        .map((value) => value?.trim().toLowerCase())
        .some((value) => value === "cash");

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

 const fetchCams = useCallback(async () => {
    try {
        const user = getLoggedInUser();

        const cmsAdminId =
            user?.role?.toLowerCase() === "cms_admin"
                ? user?.user_id
                : user?.cms_admin;

        const response = await axiosInstance.get(
            ProjectApiList.GET_FINAL_DISBURSEMENTS_FOR_INVENTORY,
            {
                params: {
                    branch_id: user?.branch || undefined,
                    cms_admin_id: cmsAdminId || undefined,
                    user_id: user?.user_id || undefined,
                },
            }
        );

        if (response.data.success) {
            const resultData = response.data.data;
            setCams(Array.isArray(resultData) ? resultData : []);
            return Array.isArray(resultData) ? resultData : [];
        }
    } catch (error) {
        console.error("Error fetching Inventory Disbursements:", error);
        return [];
    }
}, []);

    const handleSelectCam = useCallback(async (item: FinalDisbursementOption) => {
        setPersonalRow((prev) => ({
            ...prev,
            id: item.id,
            dateOfDisbursement: item.date_of_disbursement || "N/A",
            memberName: item.member_name || "N/A",
            custId: item.cust_id || "N/A",
            loanId: item.loan_id || "N/A",
            product: item.product || "N/A",
            productType: item.product_type || "N/A",
            loanAmount: String(parseFloat(String(item.loan_amount || "0").replace(/[^0-9.]/g, "")) || 0),
            bankName: item.bank_name || "N/A",
            accountNumber: item.account_number || "N/A",
            ifsc: item.ifsc || "N/A",
            dateOfNeft: item.payment_date || "",
            status: item.payment_status || "NEFT Done"
        }));
        setSearchQuery(item.member_name || "");
        setShowDropdown(false);

        // Prefill payment method and UPI fields if editing
        setPaymentMethod(item.payment_method || "Cash");
        setReferenceNumber(item.upi_reference_no || "");
        setPaymentProofPreview(item.payment_screenshot ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${item.payment_screenshot}` : "");
        setPaymentProof(null);

        // Fetch investor pool balance via disbursement record → investor_unique_id
        setPoolBalance(null);
        setPoolTotalAmount(null);
        setPaymentHistory([]);
        setInvestmentUniqueId("");
        if (item.loan_id) {
            setLoadingBalance(true);
            try {
                // Step 1: Resolve investor ID from the selected row or disbursement details.
                let investorId = item.investor_unique_id || "";
                if (!investorId) {
                    const disbRes = await axiosInstance.get(
                        `${ProjectApiList.GET_ALL_DISBURSEMENTS_ID}/${item.id}`
                    );
                    const disbData = disbRes.data?.data;
                    investorId =
                        disbData?.investor_unique_id ||
                        disbData?.disbursement?.investor_unique_id ||
                        disbData?.record?.investor_unique_id ||
                        "";
                }

                if (investorId) {
                    // Step 2: Fetch investment by investor_unique_id (POST fallback handles IDs with slashes)
                    const invRes = await axiosInstance.post(
                        `${ProjectApiList.GET_INVESTOR_INVESTMENT_BY_ID}`,
                        { id: investorId }
                    );
                    const invData = invRes.data?.data;
                    const inv =
                        invData?.investment ||
                        invData?.data?.investment ||
                        invData?.record ||
                        invData;
                    if (inv) {
                        setInvestmentUniqueId(inv.unique_id || inv.investment_unique_id || investorId);
                        const rawTotal = inv.total_amount ?? inv.amount;
                        const parsedTotal = Number.parseFloat(String(rawTotal));
                        setPoolTotalAmount(Number.isFinite(parsedTotal) ? parsedTotal : null);

                        const rawBalance =
                            inv.remaining_pool_balance ??
                            inv.pool_balance ??
                            inv.total_amount ??
                            inv.amount;
                        const parsedBalance = Number.parseFloat(String(rawBalance));
                        setPoolBalance(Number.isFinite(parsedBalance) ? parsedBalance : 0);
                        setPaymentHistory(inv.payment_history || invData?.payment_history || []);
                    }
                }
            } catch (error) {
                console.warn("Failed to load investor balance", error);
            } finally {
                setLoadingBalance(false);
            }
        }
    }, []);

    // useEffect(() => {
    //     fetchCams();
    // }, [fetchCams]);

    useEffect(() => {
        if (preselectedId && cams.length > 0) {
            const found = cams.find(item => String(item.id) === preselectedId);
            if (found) {
                handleSelectCam(found);
            }
        }
    }, [preselectedId, cams, handleSelectCam]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredCams(cams);
            return;
        }
        const filtered = cams.filter(item =>
            item.loan_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.cust_id?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredCams(filtered);
        setShowDropdown(filtered.length > 0);
    }, [searchQuery, cams]);

    useEffect(() => {
        if (!isCashDisbursement) {
            setPaymentMethod("Cash");
            setReferenceNumber("");
            setPaymentProof(null);
            setPaymentProofPreview("");
        }
    }, [isCashDisbursement]);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                setInitialLoading(true);

                const camsData: any = await fetchCams();

                // If ID is present → auto select
                if (preselectedId && camsData.length > 0) {
                    const found = camsData.find(item => String(item.id) === preselectedId);
                    if (found) {
                        await handleSelectCam(found); // wait for balance also
                    }
                }

            } catch (error) {
                toast.error("Failed to load data");
            } finally {
                setInitialLoading(false);
            }
        };

        loadAllData();
    }, [fetchCams, preselectedId, handleSelectCam]);

    const inputClass =
        "w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600";

    const handleUpdateClick = () => {
        if (activeCase === "personal" && !personalRow.id) {
            toast.error("Please select a record first.");
            return;
        }
        if (activeCase === "personal" && !personalRow.dateOfNeft.trim()) {
            toast.error("Please select Date of NEFT.");
            return;
        }

        if (activeCase === "consumer" && !consumerRow.dateOfDelivery.trim()) {
            toast.error("Please select Date of Delivery.");
            return;
        }

        if (personalRow.dateOfNeft) {
            const day = new Date(personalRow.dateOfNeft).getDay();
            if (day === 0) {
                toast.error("NEFT date cannot be Sunday");
                return;
            }
        }

        setIsConfirmOpen(true);
    };

    const handleSave = async () => {
        setIsConfirmOpen(false);
        try {
            // Step 1: If investor linked, deduct pool balance FIRST
            // This ensures payment is blocked if balance is insufficient
            if (investmentUniqueId && personalRow.loanAmount && parseFloat(personalRow.loanAmount) > 0) {
                try {
                    const deductRes = await axiosInstance.post(
                        `${ProjectApiList.api_deductInvestorPoolBalance}/deduct-balance/${encodeURIComponent(investmentUniqueId)}`,
                        {
                            payment_amount: parseFloat(personalRow.loanAmount),
                            loan_id: personalRow.loanId,
                            payment_date: personalRow.dateOfNeft,
                        }
                    );
                    if (!deductRes.data.success) {
                        toast.error(deductRes.data.message || "Pool balance deduction failed");
                        return;
                    }
                    setPoolBalance(deductRes.data.remaining_pool_balance);
                    setPaymentHistory(deductRes.data.payment_history || []);
                } catch (err: unknown) {
                    const message =
                        typeof err === "object" &&
                            err !== null &&
                            "response" in err &&
                            typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
                            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                            : "Pool balance deduction failed";
                    toast.error(message);
                    return;
                }
            }

            // Step 2: Save payment status
            const formData = new FormData();
            formData.append("payment_date", personalRow.dateOfNeft);
            formData.append("payment_status", personalRow.status);
            if (isCashDisbursement) {
                formData.append("payment_method", paymentMethod);
                if (paymentMethod === "UPI") {
                    formData.append("upi_reference_no", referenceNumber);
                    if (paymentProof) {
                        formData.append("payment_screenshot", paymentProof);
                    }
                }
            }

            const response = await axiosInstance.post(
                `${ProjectApiList.UPDATE_INVENTORY_PAYMENT}/${personalRow.id}`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            if (response.data.success) {
                setSaved(true);
                toast.success("Payment inventory updated successfully.");
                router.push("/loan/disbursement/payment-inventory/");
            } else {
                toast.error(response.data.message || "Failed to update.");
            }
        } catch (error) {
            console.error("Save Error:", error);
            toast.error("Something went wrong!");
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-600">Loading data...</p>
                </div>
            </div>
        );
    }

    const renderReadOnlyField = (label: string, value: string) => (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6 pb-[300px]">
            <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6 overflow-visible">
                <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                    Payment Inventory (NEFT/RTGS) (Operation Head)
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Backend case ke hisaab se ek hi record visible rahega.
                </p>

                {/* Section to select verified customer */}
                <div className="mt-6 border-t pt-6 overflow-visible">
                    <h3 className="mb-4 text-sm font-semibold text-gray-700">Select Final Disbursement</h3>
                    <div className="relative w-full max-w-md" ref={dropdownRef}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name or customer ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowDropdown(true)}
                                className="w-full rounded-lg border-2 border-blue-100 px-4 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {showDropdown && filteredCams.length > 0 && (
                            <div className="absolute z-100 mt-1 max-h-[300px] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                {filteredCams.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectCam(item)}
                                        className="flex w-full flex-col px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 hover:bg-blue-50/50"
                                    >
                                        <span className="text-sm font-semibold text-gray-900">{item.member_name}</span>
                                        <span className="text-[11px] text-gray-500 mt-0.5 tracking-tight">{item.cust_id} | {item.loan_id}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {activeCase === "personal" && personalRow.loanId && (
                <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[1.05rem] font-semibold text-green-700">
                            Personal Loans Payment Inventory
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">Credit Applied Amount:</span>
                                <span className="text-base font-black text-blue-700 font-mono">
                                    ₹{parseFloat(String(personalRow.loanAmount || "0").replace(/[^0-9.]/g, "")).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {loadingBalance && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                    <Loader2 size={14} className="animate-spin text-gray-400" />
                                    <span className="text-xs text-gray-400">Loading balance...</span>
                                </div>
                            )}
                            {!loadingBalance && poolBalance !== null && (
                                <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${poolBalance < parseFloat(String(personalRow.loanAmount || "0").replace(/[^0-9.]/g, ""))
                                    ? "bg-red-50 border-red-200"
                                    : "bg-emerald-50 border-emerald-200"
                                    }`}>
                                    <span className="text-xs text-gray-500 font-medium">Remaining Balance:</span>
                                    <span className={`text-base font-black font-mono ${poolBalance < parseFloat(String(personalRow.loanAmount || "0").replace(/[^0-9.]/g, ""))
                                        ? "text-red-700"
                                        : "text-emerald-700"
                                        }`}>
                                        ₹{poolBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            {!loadingBalance && poolTotalAmount !== null && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <span className="text-xs text-gray-500 font-medium">Pool Amount:</span>
                                    <span className="text-base font-black text-indigo-700 font-mono">
                                        ₹{poolTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            {!loadingBalance && poolBalance === null && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <span className="text-xs text-amber-700 font-medium">Pool/Remaining: Not available</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Payment history preview */}
                    {/* {paymentHistory.length > 0 && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Recent Payment History</p>
                            <div className="space-y-1">
                                {paymentHistory.slice(-3).map((p) => (
                                    <div key={p.payment_id} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">{p.payment_id} &bull; {p.loan_id} &bull; {p.date}</span>
                                        <span className="font-bold text-red-600">−₹{Number(p.amount).toLocaleString("en-IN")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )} */}
                    <div className="mt-3 border-t border-gray-200 pt-4">
                        <div className="space-y-4 2xl:hidden">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {renderReadOnlyField("Date of Disbursement", personalRow.dateOfDisbursement)}
                                    {renderReadOnlyField("Member Name", personalRow.memberName)}
                                    {renderReadOnlyField("Cust ID", personalRow.custId)}
                                    {renderReadOnlyField("Loan ID", personalRow.loanId)}
                                    {renderReadOnlyField("Product", personalRow.product)}
                                    {renderReadOnlyField("Product Type", personalRow.productType)}
                                    {renderReadOnlyField("Loan Amount", personalRow.loanAmount)}
                                    {isCashDisbursement && (
                                        <>
                                            {renderReadOnlyField("Bank Name", personalRow.bankName)}
                                            {renderReadOnlyField("Account Number", personalRow.accountNumber)}
                                            {renderReadOnlyField("IFSC", personalRow.ifsc)}
                                        </>
                                    )}

                                    {/* Payment Method for cash disbursement only */}
                                    {isCashDisbursement && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment Method</label>
                                                <select
                                                    className={`${inputClass} mt-2`}
                                                    value={paymentMethod}
                                                    onChange={e => {
                                                        setPaymentMethod(e.target.value);
                                                        if (e.target.value !== "UPI") {
                                                            setReferenceNumber("");
                                                            setPaymentProof(null);
                                                            setPaymentProofPreview("");
                                                        }
                                                    }}
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="UPI">UPI</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </select>
                                            </div>

                                            {/* UPI Fields (Reference Number, Payment Proof) */}
                                            {paymentMethod === "UPI" && (
                                                <>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reference Number <span className="text-red-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            className={`${inputClass} mt-2`}
                                                            value={referenceNumber}
                                                            onChange={e => setReferenceNumber(e.target.value)}
                                                            required={paymentMethod === "UPI"}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment Proof (Image, optional)</label>
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/jpg"
                                                            className={`${inputClass} mt-2`}
                                                            onChange={e => {
                                                                const file = e.target.files?.[0] || null;
                                                                setPaymentProof(file);
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = ev => setPaymentProofPreview(ev.target?.result as string);
                                                                    reader.readAsDataURL(file);
                                                                } else {
                                                                    setPaymentProofPreview("");
                                                                }
                                                            }}
                                                        />
                                                        {paymentProofPreview && (
                                                            <Image
                                                                src={paymentProofPreview}
                                                                alt="Payment Proof Preview"
                                                                width={240}
                                                                height={128}
                                                                unoptimized
                                                                className="mt-2 max-h-32 w-auto rounded border"
                                                            />
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Date of NEFT (Selection) */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Date of NEFT (Selection)</label>
                                        <input
                                            type="date"
                                            value={personalRow.dateOfNeft}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (!value) return;

                                                const selectedDate = new Date(value);

                                                if (selectedDate.getDay() === 0) {
                                                    toast.error("Sunday is not allowed for NEFT");
                                                    return;
                                                }

                                                setPersonalRow((prev) => ({
                                                    ...prev,
                                                    dateOfNeft: value,
                                                }));
                                                setSaved(false);
                                            }}
                                        className={`${inputClass} mt-2`}
                                        />
                                    </div>

                                    {/* Status Dropdown */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</label>
                                        <select
                                            value={personalRow.status}
                                            onChange={(e) => {
                                                setPersonalRow((prev) => ({ ...prev, status: e.target.value as PersonalInventoryRow["status"] }));
                                                setSaved(false);
                                            }}
                                            className={`${inputClass} mt-2`}
                                        >
                                            <option value="NEFT Done">NEFT Done</option>
                                            <option value="On Process">On Process</option>
                                            <option value="NEFT Failed">NEFT Failed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden overflow-x-auto 2xl:block">
                            <table className="w-[1320px] border border-gray-300 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            "Date of Disbursement",
                                            "Member Name",
                                            "Cust ID",
                                            "Loan ID",
                                            "Product",
                                            "Product Type",
                                            "Loan Amount",
                                            "Bank Name",
                                            "Account Number",
                                            "IFSC",
                                            "Date of NEFT (Selection)",
                                            "Status",
                                        ].map((heading) => (
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
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.dateOfDisbursement}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.memberName}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.custId}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.loanId}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.product}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.productType}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.loanAmount}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.bankName}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.accountNumber}</td>
                                        <td className="border border-gray-300 px-4 py-3">{personalRow.ifsc}</td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <input
                                                type="date"
                                                value={personalRow.dateOfNeft}
                                                onChange={(e) => {
                                                    setPersonalRow((prev) => ({
                                                        ...prev,
                                                        dateOfNeft: e.target.value,
                                                    }));
                                                    setSaved(false);
                                                }}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <select
                                                value={personalRow.status}
                                                onChange={(e) => {
                                                    setPersonalRow((prev) => ({
                                                        ...prev,
                                                        status: e.target.value as PersonalInventoryRow["status"],
                                                    }));
                                                    setSaved(false);
                                                }}
                                                className={inputClass}
                                            >
                                                <option value="NEFT Done">NEFT Done</option>
                                                <option value="On Process">On Process</option>
                                                <option value="NEFT Failed">NEFT Failed</option>
                                            </select>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleUpdateClick}
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 sm:w-auto"
                            >
                                Update
                            </button>
                            <p className="text-sm text-gray-700">
                                Status : NEFT Done / On Process / NEFT Failed
                            </p>
                            <p className={saved ? "text-sm text-green-600" : "text-sm text-gray-700"}>
                                {saved ? "Updated" : "Not Updated"}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {activeCase === "consumer" && consumerRow.loanId && (
                <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                    <h2 className="text-[1.05rem] font-semibold text-green-700">
                        Consumer Product Loans Table
                    </h2>
                    <div className="mt-3 border-t border-gray-200 pt-4">
                        <div className="space-y-4 2xl:hidden">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {renderReadOnlyField("Date of Disbursement", consumerRow.dateOfDisbursement)}
                                    {renderReadOnlyField("Member Name", consumerRow.memberName)}
                                    {renderReadOnlyField("Cust ID", consumerRow.custId)}
                                    {renderReadOnlyField("Loan ID", consumerRow.loanId)}
                                    {renderReadOnlyField("Product", consumerRow.product)}
                                    {renderReadOnlyField("Product Type", consumerRow.productType)}
                                    {renderReadOnlyField("Loan Amount", consumerRow.loanAmount)}
                                    {renderReadOnlyField("Document Download", consumerRow.documentDownload)}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Date of DO issue to Hub/Partner
                                        </label>
                                        <input
                                            type="date"
                                            value={consumerRow.dateOfDoIssue}
                                            onChange={(e) => {
                                                setConsumerRow((prev) => ({
                                                    ...prev,
                                                    dateOfDoIssue: e.target.value,
                                                }));
                                                setSaved(false);
                                            }}
                                            className={`${inputClass} mt-2`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Date of Delivery of Product
                                        </label>
                                        <input
                                            type="date"
                                            value={consumerRow.dateOfDelivery}
                                            onChange={(e) => {
                                                setConsumerRow((prev) => ({
                                                    ...prev,
                                                    dateOfDelivery: e.target.value,
                                                }));
                                                setSaved(false);
                                            }}
                                            className={`${inputClass} mt-2`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Status
                                        </label>
                                        <input value={consumerRow.status} readOnly className={`${inputClass} mt-2`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden overflow-x-auto 2xl:block">
                            <table className="w-[1220px] border border-gray-300 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            "Date of Disbursement",
                                            "Member Name",
                                            "Cust ID",
                                            "Loan ID",
                                            "Product",
                                            "Product Type",
                                            "Loan Amount",
                                            "Document Download",
                                            "Date of DO issue to Hub/Partner",
                                            "Date of Delivery of Product",
                                            "Status",
                                        ].map((heading) => (
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
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.dateOfDisbursement}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.memberName}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.custId}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.loanId}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.product}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.productType}</td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.loanAmount}</td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <button className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">
                                                {consumerRow.documentDownload}
                                            </button>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <input
                                                type="date"
                                                value={consumerRow.dateOfDoIssue}
                                                onChange={(e) => {
                                                    setConsumerRow((prev) => ({
                                                        ...prev,
                                                        dateOfDoIssue: e.target.value,
                                                    }));
                                                    setSaved(false);
                                                }}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">
                                            <input
                                                type="date"
                                                value={consumerRow.dateOfDelivery}
                                                onChange={(e) => {
                                                    setConsumerRow((prev) => ({
                                                        ...prev,
                                                        dateOfDelivery: e.target.value,
                                                    }));
                                                    setSaved(false);
                                                }}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3">{consumerRow.status}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleUpdateClick}
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 sm:w-auto"
                            >
                                Update
                            </button>
                            <p className="text-sm text-gray-700">Status : Delivered (Default)</p>
                            <p className="text-sm text-gray-700">DO : Dealer Offer</p>
                        </div>
                    </div>
                </section>
            )}

            <ConfirmDialog
                isOpen={isConfirmOpen}
                title="Confirm Update"
                message="Are you sure you want to update this payment information?"
                onConfirm={handleSave}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </div>
    );
}

export default function PaymentInventoryPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        }>
            <PaymentInventoryContent />
        </Suspense>
    );
}
