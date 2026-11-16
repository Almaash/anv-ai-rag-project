"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type BusinessType = "shopBased" | "homeBased";
type EntitledOption = "proprietor" | "partnership";
type BusinessOwnership = "owned" | "rented";
type PDAnswer = "yes" | "no" | "na" | "";
type PDQuestionKey =
    | "geoLocation"
    | "notRentedHouse"
    | "bnplOwnUse"
    | "productDescription"
    | "hypothecationAgreement"
    | "creditFacilitatorAgreement"
    | "repaymentsPolicy"
    | "processingFee"
    | "serviceFees"
    | "referralScheme";
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const validateImageSize = (file: File | undefined) => {
    if (!file) return true;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error("Upload image up to 2 MB only.");
        return false;
    }
    return true;
};

type MemberRow = {
    memberName: string;
    custId: string;
    productCode: string;
    creditAmount: string;
};

type ObligationRow = {
    companyName: string;
    creditType: string;
    creditAmount: string;
    emiAmount: string;
    repaymentMode: string;
    installmentAmount: string;
};

export type PDFormData = {
    memberRows: MemberRow[];
    businessType: BusinessType;
    businessNature: string;
    entitled: EntitledOption;
    businessAddress: string;
    businessOwnership: BusinessOwnership;
    businessVintage: string;
    businessPhotoName: string;
    businessProofName: string;
    obligationRows: ObligationRow[];
    houseVerificationPhotoName: string;
    businessVerificationPhotoName: string;
    pdAnswers: Record<PDQuestionKey, PDAnswer>;
};

const pdQuestions: Array<{ key: PDQuestionKey; label: string }> = [
    { key: "geoLocation", label: "Customer is under Geo location" },
    { key: "notRentedHouse", label: "Customer is not staying at a rented house" },
    { key: "bnplOwnUse", label: "Customer purchases BNPL product for its own use" },
    {
        key: "productDescription",
        label: "Customer satisfied about product description pricing and service norms",
    },
    { key: "hypothecationAgreement", label: "Customer aware of Hypothecation agreement" },
    {
        key: "creditFacilitatorAgreement",
        label: "Customer aware of Credit Facilitator agreement",
    },
    { key: "repaymentsPolicy", label: "Customer aware of repayments policy" },
    {
        key: "processingFee",
        label: "Customer aware of Processing fee and Down payment",
    },
    { key: "serviceFees", label: "Customer aware of all service fees PF and CLI" },
    { key: "referralScheme", label: "Customer aware of referral scheme" },
];

const defaultMemberRow = (): MemberRow => ({
    memberName: "",
    custId: "",
    productCode: "",
    creditAmount: "",
});

const defaultObligationRow = (): ObligationRow => ({
    companyName: "",
    creditType: "",
    creditAmount: "",
    emiAmount: "",
    repaymentMode: "monthly",
    installmentAmount: "",
});

const getObligationMultiplier = (repaymentMode: string) => {
    switch (repaymentMode) {
        case "weekly":
            return 4;
        case "biweekly":
            return 2;
        default:
            return 1;
    }
};

const calculateInstallmentAmount = (emiAmount: string, repaymentMode: string) =>
    String(toNumber(emiAmount) * getObligationMultiplier(repaymentMode));

export const createDefaultPDData = (): PDFormData => ({
    memberRows: [defaultMemberRow()],
    businessType: "shopBased",
    businessNature: "",
    entitled: "proprietor",
    businessAddress: "",
    businessOwnership: "owned",
    businessVintage: "",
    businessPhotoName: "",
    businessProofName: "",
    obligationRows: [defaultObligationRow()],
    houseVerificationPhotoName: "",
    businessVerificationPhotoName: "",
    pdAnswers: {
        geoLocation: "",
        notRentedHouse: "",
        bnplOwnUse: "",
        productDescription: "",
        hypothecationAgreement: "",
        creditFacilitatorAgreement: "",
        repaymentsPolicy: "",
        processingFee: "",
        serviceFees: "",
        referralScheme: "",
    },
});

export const createSamplePDData = (): PDFormData => ({
    memberRows: [
        {
            memberName: "Anita Verma",
            custId: "CUS-1001",
            productCode: "PRD-CAF-101",
            creditAmount: "45000",
        },
        {
            memberName: "Rakesh Kumar",
            custId: "CUS-1002",
            productCode: "PRD-CAF-102",
            creditAmount: "30000",
        },
    ],
    businessType: "shopBased",
    businessNature: "Retail grocery and daily needs store",
    entitled: "proprietor",
    businessAddress: "Ward 8, Main Road, Near Panchayat Bhawan",
    businessOwnership: "rented",
    businessVintage: "5",
    businessPhotoName: "business-photo.jpg",
    businessProofName: "business-proof.pdf",
    obligationRows: [
        {
            companyName: "ABC Finance",
            creditType: "Business Loan",
            creditAmount: "85000",
            emiAmount: "4200",
            repaymentMode: "EMI",
            installmentAmount: "4200",
        },
        {
            companyName: "Village Credit",
            creditType: "Consumer Loan",
            creditAmount: "32000",
            emiAmount: "1500",
            repaymentMode: "EWI",
            installmentAmount: "1500",
        },
    ],
    houseVerificationPhotoName: "house-verification-photo.jpg",
    businessVerificationPhotoName: "business-verification-photo.jpg",
    pdAnswers: {
        geoLocation: "yes",
        notRentedHouse: "no",
        bnplOwnUse: "yes",
        productDescription: "yes",
        hypothecationAgreement: "yes",
        creditFacilitatorAgreement: "yes",
        repaymentsPolicy: "yes",
        processingFee: "yes",
        serviceFees: "yes",
        referralScheme: "na",
    },
});

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

const formatPDAnswerLabel = (value: PDAnswer) => {
    switch (value) {
        case "yes":
            return "Yes";
        case "no":
            return "No";
        case "na":
            return "N/A";
        default:
            return "-";
    }
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

function ReadonlyValue({ value }: { value: string }) {
    return (
        <div className="min-h-[42px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700">
            {value || "-"}
        </div>
    );
}

type PDFormProps = {
    mode?: "create" | "view" | "edit";
    initialData?: PDFormData;
    status?: "verified" | "pending"; // Add status prop
    pdId?: string; // Add pdId for update
    selectedCustomerInfo?: any; // Add selectedCustomer if in edit mode
};


const getImageUrl = (path?: string | null) => {
    if (!path) return null;

    const baseUrl =
        process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "")

    return `${baseUrl}/${path}`;
};

export default function PDForm({
    mode = "create",
    initialData,
    status = "pending", // Default status
    pdId,
    selectedCustomerInfo,
}: PDFormProps) {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(
        selectedCustomerInfo ?? null
    );
    const [customerSearch, setCustomerSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<PDFormData>(
        initialData ?? createDefaultPDData()
    );

    const [houseFile, setHouseFile] = useState<File | null>(null);
    const [businessFile, setBusinessFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showCamera, setShowCamera] = useState(false);
    const [cameraType, setCameraType] = useState<"house" | "business" | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const isVerifiedStatus = status === "verified";
    const readOnly = isVerifiedStatus || mode === "view";
    const creditMode = String(selectedCustomer?.credit_mode || "").toLowerCase();
    const shouldShowBusinessSection = creditMode !== "product";
    const shouldShowObligationSection = creditMode === "product";

    const startCamera = async (type: "house" | "business") => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            setCameraType(type);
            setShowCamera(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
            toast.error("Could not access camera");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
        setCameraType(null);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current && cameraType) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `${cameraType}-verification-${Date.now()}.jpg`, { type: "image/jpeg" });
                        if (cameraType === "house") {
                            setHouseFile(file);
                            updateField("houseVerificationPhotoName", file.name);
                        } else {
                            setBusinessFile(file);
                            updateField("businessVerificationPhotoName", file.name);
                        }
                        stopCamera();
                    }
                }, "image/jpeg");
            }
        }
    };

    useEffect(() => {
        if (showCamera && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [showCamera, stream]);

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) {
                toast.error("User not found in localStorage");
                return;
            }

            const response = await axiosInstance.get(
                ProjectApiList.api_getAllCAF,
                {
                    params: {
                        page: 1,
                        search: customerSearch,
                        status: "branch_manager",
                        is_verified: true,
                        is_pd_created: false,
                        user_id: user.user_id,
                        branch_id: user.branch,
                        cms_admin_id: user.cms_admin,
                    },
                }
            );

            if (response.data.success || response.data.status) {
                setCustomers(response.data.data);
            } else {
                toast.error(response.data.message || "Failed to fetch customers");
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("An error occurred while fetching customers");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (mode === "create") {
            fetchUsers();
        }
    }, [mode]);

    const idFromParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;

    useEffect(() => {
        if (idFromParams && customers.length > 0) {
            const customerMatch = customers.find(c => String(c.loan_application_id) === idFromParams);
            if (customerMatch) {
                handleSelectCustomer(customerMatch);
            }
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

    // console.log("Customers:", customers);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter(
            (c) => {
                const fullName = c.customer
                    ? `${c.customer.first_name || ""} ${c.customer.middle_name || ""} ${c.customer.last_name || ""}`.replace(/\s+/g, " ").trim()
                    : c.customer_name || "";

                return (
                    fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    (c.loan_application_id || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                    (c.customer_unique_id || "").toLowerCase().includes(customerSearch.toLowerCase())
                );
            }
        );
    }, [customerSearch, customers]);

    const fetchCAFById = async (loanApplicationId: string) => {
        try {
            setLoading(true);

            const res = await axiosInstance.get(
                `${ProjectApiList.api_getCAFById}/${loanApplicationId}`
            );

            if (res.data.success || res.data.status) {
                return res.data.data;
            } else {
                toast.error(res.data.message || "Failed to fetch CAF details");
                return null;
            }
        } catch (error) {
            console.error("CAF fetch error:", error);
            toast.error("Error fetching CAF details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCustomer = async (customer: any) => {
        try {
            setLoading(true);

            const loanId = customer.loan_application_id;

            const res = await axiosInstance.get(
                `${ProjectApiList.api_getCAFById}/${loanId}`
            );

            if (!res.data.success) {
                toast.error("Failed to fetch CAF details");
                return;
            }

            const caf = res.data.data;

            setSelectedCustomer(caf);
            setCustomerSearch(caf.loan_application_id);
            setShowDropdown(false);

            const fullName = `${caf.customer?.first_name || ""} ${caf.customer?.middle_name || ""
                } ${caf.customer?.last_name || ""}`.replace(/\s+/g, " ").trim();

            setFormData((prev) => ({
                ...prev,

                memberRows: [
                    {
                        memberName: fullName,
                        custId: caf.loan_application_id,
                        productCode: caf.product_code || caf.credit_mode || "N/A",
                        creditAmount: caf.credit_applied_for?.toString() || "0",
                    },
                ],

                businessType: caf.business_type || prev.businessType,
                businessNature: caf.business_nature || prev.businessNature,
                entitled: caf.entitled || prev.entitled,
                businessAddress: caf.business_address || prev.businessAddress,
                businessOwnership: caf.business_ownership || prev.businessOwnership,
                businessVintage: caf.business_vintage || prev.businessVintage,
                businessPhotoName: caf.business_photo_name || prev.businessPhotoName,
                businessProofName: caf.business_proof_name || prev.businessProofName,

                obligationRows: [defaultObligationRow()],
            }));

            toast.success("CAF details loaded");

        } catch (error) {
            console.error(error);
            toast.error("Error loading CAF details");
        } finally {
            setLoading(false);
        }
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [pendingRemoveMemberIndex, setPendingRemoveMemberIndex] = useState<number | null>(
        null
    );
    const [pendingRemoveObligationIndex, setPendingRemoveObligationIndex] = useState<
        number | null
    >(null);

    const inputClass =
        "bg-gray-50 rounded-md px-3 py-2 text-sm w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600";
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";

    const totalCreditAmount = useMemo(
        () =>
            formData.memberRows.reduce(
                (sum, row) => sum + toNumber(row.creditAmount),
                0
            ),
        [formData.memberRows]
    );

    const totalObligationAmount = useMemo(
        () =>
            formData.obligationRows.reduce(
                (sum, row) => sum + toNumber(row.creditAmount),
                0
            ),
        [formData.obligationRows]
    );

    const totalEmiAmount = useMemo(
        () =>
            formData.obligationRows.reduce(
                (sum, row) => sum + toNumber(row.emiAmount),
                0
            ),
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

    const updateField = <K extends keyof PDFormData>(field: K, value: PDFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const sanitizeNumber = (value: string) => value.replace(/\D/g, "");

    const updateMemberRow = (
        index: number,
        field: keyof MemberRow,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            memberRows: prev.memberRows.map((row, rowIndex) =>
                rowIndex === index
                    ? {
                        ...row,
                        [field]: field === "creditAmount" ? sanitizeNumber(value) : value,
                    }
                    : row
            ),
        }));
    };

    const addMemberRow = () => {
        setFormData((prev) => ({
            ...prev,
            memberRows: [...prev.memberRows, defaultMemberRow()],
        }));
    };

    const confirmRemoveMemberRow = () => {
        if (pendingRemoveMemberIndex === null) return;

        setFormData((prev) => ({
            ...prev,
            memberRows:
                prev.memberRows.length === 1
                    ? [defaultMemberRow()]
                    : prev.memberRows.filter((_, index) => index !== pendingRemoveMemberIndex),
        }));
        setPendingRemoveMemberIndex(null);
    };

    const updateObligationRow = (
        index: number,
        field: keyof ObligationRow,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            obligationRows: prev.obligationRows.map((row, rowIndex) => {
                if (rowIndex !== index) return row;

                if (field === "emiAmount") {
                    const emiAmount = sanitizeNumber(value);
                    const installmentAmount = calculateInstallmentAmount(
                        emiAmount,
                        row.repaymentMode || "monthly"
                    );
                    return {
                        ...row,
                        emiAmount,
                        installmentAmount,
                    };
                }

                if (field === "repaymentMode") {
                    const repaymentMode = value;
                    const installmentAmount = calculateInstallmentAmount(
                        row.emiAmount,
                        repaymentMode
                    );
                    return {
                        ...row,
                        repaymentMode,
                        installmentAmount,
                    };
                }

                return {
                    ...row,
                    [field]:
                        field === "creditAmount" || field === "installmentAmount"
                            ? sanitizeNumber(value)
                            : value,
                };
            }),
        }));
    };

    const addObligationRow = () => {
        setFormData((prev) => ({
            ...prev,
            obligationRows: [...prev.obligationRows, defaultObligationRow()],
        }));
    };

    const confirmRemoveObligationRow = () => {
        if (pendingRemoveObligationIndex === null) return;

        setFormData((prev) => ({
            ...prev,
            obligationRows:
                prev.obligationRows.length === 1
                    ? [defaultObligationRow()]
                    : prev.obligationRows.filter(
                        (_, index) => index !== pendingRemoveObligationIndex
                    ),
        }));
        setPendingRemoveObligationIndex(null);
    };

    const updateAnswer = (key: PDQuestionKey, value: PDAnswer) => {
        setFormData((prev) => ({
            ...prev,
            pdAnswers: {
                ...prev.pdAnswers,
                [key]: value,
            },
        }));
    };

    const showBackendValidationErrors = (responseData: any, fallbackMessage: string) => {
        const errors = responseData?.errors;
        let hasShownError = false;

        if (errors && typeof errors === "object") {
            Object.values(errors).forEach((messages) => {
                if (Array.isArray(messages)) {
                    messages.forEach((message) => {
                        if (typeof message === "string" && message.trim()) {
                            toast.error(message);
                            hasShownError = true;
                        }
                    });
                    return;
                }

                if (typeof messages === "string" && messages.trim()) {
                    toast.error(messages);
                    hasShownError = true;
                }
            });
        }

        if (!hasShownError) {
            toast.error(responseData?.message || fallbackMessage);
        }
    };

    const buildPayload = () => {
        const user = getLoggedInUser();

        return {
            // pd_application_id: `PD-${Date.now()}`,
            loan_application_id: selectedCustomer?.loan_application_id || "",
            customer_unique_id: selectedCustomer?.customer_unique_id || "",
            branch_id: user?.branch || "",
            cms_admin_id:
                user?.cms_admin_id || user?.cms_admin || user?.admin_user_id || "",

            // Verification Photos
            house_verification_photo: formData.houseVerificationPhotoName,
            business_verification_photo: formData.businessVerificationPhotoName,

            // PD Answers
            pd_information: {
                geo_location: formData.pdAnswers.geoLocation,
                not_rented_house: formData.pdAnswers.notRentedHouse,
                bnpl_own_use: formData.pdAnswers.bnplOwnUse,
                product_description: formData.pdAnswers.productDescription,
                hypothecation_agreement: formData.pdAnswers.hypothecationAgreement,
                credit_facilitator_agreement:
                    formData.pdAnswers.creditFacilitatorAgreement,
                repayments_policy: formData.pdAnswers.repaymentsPolicy,
                processing_fee: formData.pdAnswers.processingFee,
                service_fees: formData.pdAnswers.serviceFees,
                referral_scheme: formData.pdAnswers.referralScheme,
            },
        };
    };

    const validatePDSubmission = () => {
        // Member details are captured during create flow; don't block edit updates on them.
        if (mode !== "edit") {
            const validMembers = formData.memberRows.filter((row) =>
                Object.values(row).some((value) => value.trim() !== "")
            );
            if (!selectedCustomer) {
                return "Please select a CAF application.";
            }
            
            if (validMembers.length === 0) {
                return "Please add at least one member detail before submit.";
            }

            const incompleteMember = validMembers.find((row) =>
                Object.values(row).some((value) => value.trim() === "")
            );

            if (incompleteMember) {
                return "Please complete all member details fields.";
            }
        }

        // Only validate business fields if credit_mode is NOT product
        // if (shouldShowBusinessSection) {
        //     if (!formData.businessNature.trim()) {
        //         return "Please enter business nature.";
        //     }
        //     if (!formData.businessAddress.trim()) {
        //         return "Please enter business address.";
        //     }
        //     if (!formData.businessVintage.trim()) {
        //         return "Please enter business vintage.";
        //     }
        //     if (!formData.businessPhotoName.trim()) {
        //         return "Please upload business photo.";
        //     }
        // }
        // A row is considered started only when core user-entered fields have data.
        // repaymentMode has a default value ("monthly"), so it must not be used to detect "started" rows.
        const hasObligationInput = (row: ObligationRow) =>
            [row.companyName, row.creditType, row.creditAmount, row.emiAmount].some(
                (value) => String(value ?? "").trim() !== ""
            );

        const validObligations = formData.obligationRows.filter(hasObligationInput);

        if (shouldShowObligationSection && validObligations.length === 0) {
            return "Please add at least one obligation row before submit.";
        }

        const incompleteObligation = shouldShowObligationSection
            ? validObligations.find(
                (row) =>
                    !row.companyName.trim() ||
                    !row.creditType.trim() ||
                    !row.creditAmount.trim() ||
                    !row.emiAmount.trim()
            )
            : null;

        if (incompleteObligation) {
            return "Please complete all fields for the obligation rows you have started filling.";
        }

        if (
    !formData.houseVerificationPhotoName?.trim() &&
    !houseFile
) {
    return "Please upload House Verification Photo.";
}

if (
    !formData.businessVerificationPhotoName?.trim() &&
    !businessFile
) {
    return "Please upload Business Verification Photo.";
}

// ==========================
// PD Information Section
// ==========================

for (const question of pdQuestions) {
    if (!formData.pdAnswers[question.key]) {
        return `Please answer: ${question.label}`;
    }
}
        return "";
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setIsSubmitting(true);
            const user = getLoggedInUser();

            const data = new FormData();
            data.append("loan_application_id", selectedCustomer?.loan_application_id || "");
            data.append("customer_unique_id", selectedCustomer?.customer_unique_id || "");
            data.append("branch_id", user?.branch || "");
            data.append("cms_admin_id", user?.cms_admin_id || user?.cms_admin || user?.admin_user_id || "");
            data.append("verification_status", "rejected");
            data.append("verification_notes", "Saved as Draft");

            if (houseFile) data.append("house_verification_photo", houseFile);
            else data.append("house_verification_photo", formData.houseVerificationPhotoName);

            if (businessFile) data.append("business_verification_photo", businessFile);
            else data.append("business_verification_photo", formData.businessVerificationPhotoName);

            // Add obligation details for separate column
            data.append("obligation_details", JSON.stringify(formData.obligationRows));

            data.append("pd_information", JSON.stringify({
                geo_location: formData.pdAnswers.geoLocation,
                not_rented_house: formData.pdAnswers.notRentedHouse,
                bnpl_own_use: formData.pdAnswers.bnplOwnUse,
                product_description: formData.pdAnswers.productDescription,
                hypothecation_agreement: formData.pdAnswers.hypothecationAgreement,
                credit_facilitator_agreement: formData.pdAnswers.creditFacilitatorAgreement,
                repayments_policy: formData.pdAnswers.repaymentsPolicy,
                processing_fee: formData.pdAnswers.processingFee,
                service_fees: formData.pdAnswers.serviceFees,
                referral_scheme: formData.pdAnswers.referralScheme,
                obligation_rows: formData.obligationRows,
            }));

            const response = await axiosInstance.post(ProjectApiList.api_storePD, data, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data.success) {
                toast.success("PD details saved successfully.");
                router.push("/loan/pd");
            } else {
                showBackendValidationErrors(response.data, "Failed to save PD details");
            }
        } catch (error: any) {
            console.error("Error saving PD:", error);
            showBackendValidationErrors(error?.response?.data, "An error occurred while saving");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        const errorMessage = validatePDSubmission();

        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            setLoading(true);
            setIsSubmitting(true);
            const user = getLoggedInUser();

            const data = new FormData();
            data.append("loan_application_id", selectedCustomer?.loan_application_id || "");
            data.append("customer_unique_id", selectedCustomer?.customer_unique_id || "");
            data.append("branch_id", user?.branch || "");
            data.append("cms_admin_id", user?.cms_admin_id || user?.cms_admin || user?.admin_user_id || "");
            data.append("verification_status", "verified");
            data.append("verification_notes", mode === "edit" ? "PD Information Updated" : "PD Information Verified and Submitted");

            if (houseFile) data.append("house_verification_photo", houseFile);
            else data.append("house_verification_photo", formData.houseVerificationPhotoName);

            if (businessFile) data.append("business_verification_photo", businessFile);
            else data.append("business_verification_photo", formData.businessVerificationPhotoName);

            // Add obligation details for separate column
            data.append("obligation_details", JSON.stringify(formData.obligationRows));

            const pdInfo = {
                geo_location: formData.pdAnswers.geoLocation,
                not_rented_house: formData.pdAnswers.notRentedHouse,
                bnpl_own_use: formData.pdAnswers.bnplOwnUse,
                product_description: formData.pdAnswers.productDescription,
                hypothecation_agreement: formData.pdAnswers.hypothecationAgreement,
                credit_facilitator_agreement: formData.pdAnswers.creditFacilitatorAgreement,
                repayments_policy: formData.pdAnswers.repaymentsPolicy,
                processing_fee: formData.pdAnswers.processingFee,
                service_fees: formData.pdAnswers.serviceFees,
                referral_scheme: formData.pdAnswers.referralScheme,
                obligation_rows: formData.obligationRows,
            };

            // If in edit mode, backend expects an array for pd_information validation
            // Check if backend API handles direct objects or requires array wrapper
            data.append("pd_information", JSON.stringify(pdInfo));

            const apiUrl = mode === "edit" ? `${ProjectApiList.api_updatePD}/${pdId}` : ProjectApiList.api_storePD;
            const response = await axiosInstance.post(apiUrl, data, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data.success) {
                toast.success(mode === "edit" ? "PD details updated successfully." : "PD details submitted successfully.");
                setShowSubmitConfirm(false);
                router.push("/loan/pd");
            } else {
                showBackendValidationErrors(response.data, "Failed to submit PD details");
            }
        } catch (error: any) {
            console.error("Error submitting PD:", error);
            showBackendValidationErrors(error?.response?.data, "An error occurred while submitting");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const requestSubmitConfirmation = () => {
        const errorMessage = validatePDSubmission();

        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setShowSubmitConfirm(true);
    };

    const infoCardClass =
        "rounded-lg border border-gray-200 bg-gray-50 p-3";

    const labelClass =
        "text-[10px] uppercase tracking-wide text-gray-500 font-semibold";

    const valueClass =
        "mt-1 text-sm font-medium text-gray-900 break-words";
    const customer = selectedCustomer?.customer;
    const enrollment = selectedCustomer?.enrollment;
    const docCardClass =
        "rounded-lg border border-gray-200 bg-white p-2 shadow-sm";

    return (
        <div className="relative">
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
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Credit Appraisal (PD Information)
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Maintain PD details in the existing loan module UI style.
                            </p>
                        </div>

                        {/* <button
                        type="button"
                        onClick={() => router.push("/loan/pd")}
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                    >
                        Back
                    </button> */}
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/loan/pd")}
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                    >
                        Back
                    </button>
                    {readOnly && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/loan/pd/createPD")}
                                className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                            >
                                Edit
                            </button>
                        </div>
                    )}
                </div>

                {/* Customer Selector Section */}
                {mode === "create" && (
                    <SectionCard title="Select CAF (Verified CAF Only)">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="relative" ref={dropdownRef}>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Search CAF
                                </label>
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="Start typing to search..."
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                                {showDropdown && (
                                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
                                        {loading ? (
                                            <li className="px-4 py-2 text-gray-500">Loading...</li>
                                        ) : filteredCustomers.length > 0 ? (
                                            filteredCustomers.map((customer) => (
                                                <li
                                                    key={customer.id}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                    className="cursor-pointer px-4 py-2 hover:bg-green-50 hover:text-green-700"
                                                >
                                                    <div className="text-sm font-medium">
                                                        {customer.loan_application_id || customer.customer_unique_id}
                                                    </div>

                                                    <div className="text-xs text-gray-500">
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
                                            ₹{selectedCustomer.credit_applied_for || "0"}
                                        </span>
                                        <span>Product:</span>
                                        <span className="font-medium">
                                            {selectedCustomer.product_name || selectedCustomer.credit_mode || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                )}

                <SectionCard title="Customer Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

                        <div className={infoCardClass}>
                            <p className={labelClass}>Customer ID</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.customer_unique_id || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Enrollment No</p>
                            <p className={valueClass}>
                                {selectedCustomer?.enrollment_number ||
                                    selectedCustomer?.customer?.enrollment_number ||
                                    "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Enrollment Date</p>
                            <p className={valueClass}>
                                {enrollment?.enrollment_date
                                    ? new Date(
                                        enrollment.enrollment_date
                                    ).toLocaleDateString("en-GB")
                                    : "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Agent ID</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.agent_unique_id || "-"}
                            </p>
                        </div>

                        <div className={`${infoCardClass} lg:col-span-2`}>
                            <p className={labelClass}>Full Name</p>
                            <p className={valueClass}>
                                {`${selectedCustomer?.customer?.first_name || ""} ${selectedCustomer?.customer?.middle_name || ""
                                    } ${selectedCustomer?.customer?.last_name || ""}`.trim() || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Gender</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.gender || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>DOB</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.date_of_birth || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Mobile 1</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.contact_number_1 || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Mobile 2</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.contact_number_2 || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Email</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.email || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Father Name</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.father_name || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Religion</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.religion || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Caste</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.caste || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Occupation</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.occupation || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Business Nature</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.business_nature || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Residence Type</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.residence_type || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Years Staying</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.years_of_staying || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>House Type</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.house_type || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Rooms</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.number_of_rooms || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Disabled</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.is_disabled ? "Yes" : "No"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Disability Type</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.disability_type || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Nominee Name</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.nominee_name || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Relationship</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.nominee_relationship || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Aadhaar</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.adhaar_number || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>PAN</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.pan_number || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Driving License</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.driving_license_number || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Voter ID</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.voter_id_number || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Ration Card</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.ration_card_number || "-"}
                            </p>
                        </div>

                        <div className={`${infoCardClass} lg:col-span-4`}>
                            <p className={labelClass}>Permanent Address</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.permanent_address || "-"}
                            </p>
                        </div>

                        <div className={`${infoCardClass} lg:col-span-4`}>
                            <p className={labelClass}>Correspondence Address</p>
                            <p className={valueClass}>
                                {selectedCustomer?.customer?.correspondence_address || "-"}
                            </p>
                        </div>

                    </div>
                </SectionCard>
                <SectionCard title="Enrollment Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

                        <div className={infoCardClass}>
                            <p className={labelClass}>Enrollment Number</p>
                            <p className={valueClass}>
                                {enrollment?.enrollment_number || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Enrollment Date</p>
                            <p className={valueClass}>
                                {enrollment?.enrollment_date
                                    ? new Date(
                                        enrollment.enrollment_date
                                    ).toLocaleString("en-GB")
                                    : "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Verification Status</p>
                            <p className={valueClass}>
                                {enrollment?.verification_status || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Verified By</p>
                            <p className={valueClass}>
                                {enrollment?.verified_by || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Verified At</p>
                            <p className={valueClass}>
                                {enrollment?.verified_at
                                    ? new Date(
                                        enrollment.verified_at
                                    ).toLocaleString("en-GB")
                                    : "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Enrolled By</p>
                            <p className={valueClass}>
                                {enrollment?.enrolled_by || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Branch ID</p>
                            <p className={valueClass}>
                                {enrollment?.branch_id || "-"}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <p className={labelClass}>Current Status</p>
                            <p className={valueClass}>
                                {enrollment?.status || "-"}
                            </p>
                        </div>

                    </div>
                </SectionCard>
                <SectionCard title="Customer KYC & Documents">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

                        {[
                            {
                                label: "Customer",
                                image: selectedCustomer?.customer?.customer_photo,
                            },
                            {
                                label: "Aadhaar Front",
                                image: selectedCustomer?.customer?.adhaar_image,
                            },
                            {
                                label: "Aadhaar Back",
                                image: selectedCustomer?.customer?.adhaar_image_back,
                            },
                            {
                                label: "PAN Card",
                                image: selectedCustomer?.customer?.pan_image,
                            },
                            {
                                label: "Driving License",
                                image: selectedCustomer?.customer?.driving_license_image,
                            },
                            {
                                label: "Voter Front",
                                image: selectedCustomer?.customer?.voter_id_image,
                            },
                            {
                                label: "Voter Back",
                                image: selectedCustomer?.customer?.voter_id_image_back,
                            },
                            {
                                label: "Ration Card",
                                image: selectedCustomer?.customer?.ration_card_image,
                            },
                            {
                                label: selectedCustomer?.customer?.other_name || "Other Doc",
                                image: selectedCustomer?.customer?.other_document,
                            },
                            {
                                label: "Passbook",
                                image: selectedCustomer?.customer?.passbook_image,
                            },
                        ]
                            .filter((doc) => doc.image)
                            .map((doc, index) => (
                                <div key={index} className={docCardClass}>
                                    <p className="text-[10px] font-semibold text-gray-700 truncate mb-2">
                                        {doc.label}
                                    </p>

                                    <a
                                        href={getImageUrl(doc.image)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img
                                            src={getImageUrl(doc.image)!}
                                            alt={doc.label}
                                            className="h-24 w-full rounded-md border object-cover hover:opacity-90 transition"
                                        />
                                    </a>

                                    {/* <a
                                        href={getImageUrl(doc.image)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 block text-center rounded bg-blue-600 px-2 py-1 text-[10px] text-white hover:bg-blue-700"
                                    >
                                        View
                                    </a> */}
                                </div>
                            ))}
                    </div>
                </SectionCard>


                {(mode === "view" || selectedCustomer) ? (
                    <>
                        {/* Hide Member Details and Business Information in Edit mode as requested */}
                        {mode !== "edit" && (
                            <>
                                <SectionCard title="Member Details">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border border-gray-300 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Members Name</th>
                                                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Cust ID</th>
                                                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Product Code</th>
                                                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Credit Amount</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {formData.memberRows.map((row, index) => (
                                                    <tr key={index}>
                                                        <td className="border border-gray-300 px-4 py-3">{row.memberName || "-"}</td>
                                                        <td className="border border-gray-300 px-4 py-3">{row.custId || "-"}</td>
                                                        <td className="border border-gray-300 px-4 py-3">{row.productCode || "-"}</td>
                                                        <td className="border border-gray-300 px-4 py-3">{row.creditAmount || "-"}</td>
                                                    </tr>
                                                ))}

                                                <tr className="bg-gray-50 font-semibold">
                                                    <td colSpan={3} className="border border-gray-300 px-4 py-3">
                                                        Total
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-3">
                                                        {totalCreditAmount || 0}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>

                                {shouldShowBusinessSection && (
                                    <SectionCard title="Business Information">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Business Type</p>
                                                <p className="mt-1 font-medium">
                                                    {formData.businessType === "shopBased" ? "Shop Based" : "Home Based"}
                                                </p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Business Nature</p>
                                                <p className="mt-1 font-medium">{formData.businessNature || "-"}</p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Entitled</p>
                                                <p className="mt-1 font-medium">
                                                    {formData.entitled === "proprietor" ? "Proprietor" : "Partnership"}
                                                </p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4 md:col-span-2">
                                                <p className="text-gray-500">Business Address</p>
                                                <p className="mt-1 font-medium">{formData.businessAddress || "-"}</p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Ownership</p>
                                                <p className="mt-1 font-medium">
                                                    {formData.businessOwnership === "owned" ? "Owned" : "Rented"}
                                                </p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Business Vintage</p>
                                                <p className="mt-1 font-medium">{formData.businessVintage || "-"} Years</p>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Business Photo</p>

                                                {formData.businessPhotoName ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${formData.businessPhotoName}`}
                                                        alt="Business Photo"
                                                        className="mt-2 h-28 w-40 object-cover rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="mt-1 font-medium">-</p>
                                                )}
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-4">
                                                <p className="text-gray-500">Business Proof</p>

                                                {formData.businessProofName ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${formData.businessProofName}`}
                                                        alt="Business Proof"
                                                        className="mt-2 h-28 w-40 object-cover rounded-md border"
                                                    />
                                                ) : (
                                                    <p className="mt-1 font-medium">-</p>
                                                )}
                                            </div>

                                        </div>
                                    </SectionCard>
                                )}
                            </>
                        )}

                        {shouldShowObligationSection && (
                            <SectionCard title="Obligation Details">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-300 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    Company Name
                                                </th>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    Credit Type
                                                </th>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    Credit Amount
                                                </th>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    EMI Amount
                                                </th>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    Mode of Repayment
                                                </th>
                                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                    EMI / EWI / EFI
                                                </th>
                                                {!readOnly && (
                                                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                                        Action
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {formData.obligationRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.companyName || "-"
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.companyName}
                                                                onChange={(e) => updateObligationRow(index, "companyName", e.target.value)}
                                                                className={inputClass}
                                                                placeholder="Company Name"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.creditType || "-"
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.creditType}
                                                                onChange={(e) => updateObligationRow(index, "creditType", e.target.value)}
                                                                className={inputClass}
                                                                placeholder="Credit Type"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.creditAmount || "-"
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.creditAmount}
                                                                onChange={(e) => updateObligationRow(index, "creditAmount", e.target.value)}
                                                                className={inputClass}
                                                                placeholder="Amount"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.emiAmount || "-"
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.emiAmount}
                                                                onChange={(e) => updateObligationRow(index, "emiAmount", e.target.value)}
                                                                className={inputClass}
                                                                placeholder="EMI"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.repaymentMode || "-"
                                                        ) : (
                                                            <select
                                                                value={row.repaymentMode}
                                                                onChange={(e) => updateObligationRow(index, "repaymentMode", e.target.value)}
                                                                className={inputClass}
                                                            >
                                                                <option value="monthly">Monthly</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="biweekly">Biweekly / Fortnightly</option>
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-2">
                                                        {readOnly ? (
                                                            row.installmentAmount || "-"
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row.installmentAmount}
                                                                readOnly
                                                                disabled
                                                                className={`${inputClass} bg-gray-100 cursor-not-allowed`}
                                                                placeholder="Installment"
                                                            />
                                                        )}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="border border-gray-300 px-2 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPendingRemoveObligationIndex(index)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}

                                            <tr className="bg-gray-50 font-semibold">
                                                <td colSpan={2} className="border border-gray-300 px-4 py-3 text-right">
                                                    Total
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3">
                                                    {totalObligationAmount || 0}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3">
                                                    {totalEmiAmount || 0}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3">-</td>
                                                <td className="border border-gray-300 px-4 py-3">
                                                    {totalInstallmentAmount || 0}
                                                </td>
                                                {!readOnly && <td className="border border-gray-300 px-4 py-3"></td>}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                {!readOnly && (
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={addObligationRow}
                                            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                )}
                            </SectionCard>
                        )}

                        <SectionCard title="Verification Photo">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm text-gray-700 font-medium">
                                        House Verification Photo
                                    </label>

                                    {mode === "edit" && !houseFile && formData.houseVerificationPhotoName && (
                                        <div className="mb-3 p-2 bg-gray-50 border rounded-md">
                                            <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Current Photo:</p>
                                            <img
                                                src={(process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "")) + "/" + formData.houseVerificationPhotoName}
                                                alt="Current House Verification"
                                                className="h-32 w-48 object-cover rounded border shadow-sm"
                                            />
                                        </div>
                                    )}

                                    {readOnly ? (
                                        <ReadonlyValue value={formData.houseVerificationPhotoName} />
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (!validateImageSize(file)) {
                                                        e.target.value = "";
                                                        return;
                                                    }
                                                    if (!validateImageSize(file)) {
                                                        e.target.value = "";
                                                        return;
                                                    }

                                                    setHouseFile(file);
                                                    updateField("houseVerificationPhotoName", file.name);
                                                }}
                                                className={inputClass}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => startCamera("house")}
                                                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Capture
                                            </button>
                                        </div>
                                    )}
                                    {houseFile && (
                                        <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
                                            <p className="text-[10px] text-blue-600 mb-1 uppercase font-bold">New Selected Photo:</p>
                                            <img
                                                src={URL.createObjectURL(houseFile)}
                                                alt="House Preview"
                                                className="h-32 w-48 rounded-md border border-blue-200 object-cover shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHouseFile(null);
                                                    // Reset to initial name if in edit mode
                                                    if (mode === "edit" && initialData) {
                                                        updateField("houseVerificationPhotoName", initialData.houseVerificationPhotoName);
                                                    } else {
                                                        updateField("houseVerificationPhotoName", "");
                                                    }
                                                }}
                                                className="text-xs text-red-500 mt-2 font-medium hover:underline"
                                            >
                                                Remove Selection
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm text-gray-700 font-medium">
                                        Business Verification Photo
                                    </label>

                                    {mode === "edit" && !businessFile && formData.businessVerificationPhotoName && (
                                        <div className="mb-3 p-2 bg-gray-50 border rounded-md">
                                            <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Current Photo:</p>
                                            <img
                                                src={(process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "")) + "/" + formData.businessVerificationPhotoName}
                                                alt="Current Business Verification"
                                                className="h-32 w-48 object-cover rounded border shadow-sm"
                                            />
                                        </div>
                                    )}

                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessVerificationPhotoName} />
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setBusinessFile(file);
                                                    updateField("businessVerificationPhotoName", file.name);
                                                }}
                                                className={inputClass}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => startCamera("business")}
                                                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Capture
                                            </button>
                                        </div>
                                    )}

                                    {businessFile && (
                                        <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-md">
                                            <p className="text-[10px] text-blue-600 mb-1 uppercase font-bold">New Selected Photo:</p>
                                            <img
                                                src={URL.createObjectURL(businessFile)}
                                                alt="Business Preview"
                                                className="h-32 w-48 rounded-md border border-blue-200 object-cover shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBusinessFile(null);
                                                    // Reset to initial name if in edit mode
                                                    if (mode === "edit" && initialData) {
                                                        updateField("businessVerificationPhotoName", initialData.businessVerificationPhotoName);
                                                    } else {
                                                        updateField("businessVerificationPhotoName", "");
                                                    }
                                                }}
                                                className="text-xs text-red-500 mt-2 font-medium hover:underline"
                                            >
                                                Remove Selection
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="PD Information">
                            <div className="space-y-4">
                                {pdQuestions.map((question, index) => (
                                    <div
                                        key={question.key}
                                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4"
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <p className="text-sm font-medium text-gray-800">
                                                {index + 1}. {question.label}
                                            </p>
                                            <div className="flex flex-wrap gap-5 lg:min-w-[180px] lg:justify-end">
                                                {[
                                                    { label: "Yes", value: "yes" as const },
                                                    { label: "No", value: "no" as const },
                                                    { label: "N/A", value: "na" as const },
                                                ].map((option) => (
                                                    <label
                                                        key={option.value}
                                                        className="flex items-center gap-2 text-sm text-gray-700"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={question.key}
                                                            checked={formData.pdAnswers[question.key] === option.value}
                                                            onChange={() => updateAnswer(question.key, option.value)}
                                                            className={radioClass}
                                                            disabled={readOnly}
                                                        />
                                                        {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>

                        {isVerifiedStatus && (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center shadow-sm">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-green-800">Verification Completed</h3>
                                <p className="mt-1 text-sm text-green-600">
                                    This Personal Discussion record has been successfully verified and is now locked for editing.
                                </p>
                            </div>
                        )}

                        {!readOnly && (
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                {/* <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Save"}
                                </button> */}
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(true)}
                                    className="rounded-md bg-yellow-400 px-4 py-2 text-sm text-gray-700 hover:bg-yellow-500"
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={requestSubmitConfirmation}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                                >
                                    {mode === "edit" ? "Update PD" : "Submit PD"}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                        <div className="mb-4 rounded-full bg-blue-50 p-4">
                            <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No Customer Selected</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Please search and select a verified CAF application above to start the Personal Discussion process.
                        </p>
                    </div>
                )}

                {isPreviewOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-6xl rounded-xl bg-white p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">PD Preview</h3>
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
                                    <h4 className="text-sm font-semibold text-gray-900">Member Details</h4>
                                    <div className="mt-3 overflow-x-auto">
                                        <table className="min-w-full border border-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {[
                                                        "Members Name",
                                                        "Cust ID",
                                                        "Product Code",
                                                        "Credit Amount",
                                                    ].map((heading) => (
                                                        <th
                                                            key={heading}
                                                            className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700"
                                                        >
                                                            {heading}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.memberRows.map((row, index) => (
                                                    <tr key={`preview-member-${index}`}>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.memberName || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.custId || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.productCode || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.creditAmount || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-medium">
                                                    <td
                                                        colSpan={3}
                                                        className="border border-gray-200 px-4 py-2"
                                                    >
                                                        Total
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {totalCreditAmount || 0}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Business Information
                                    </h4>
                                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Type</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessType === "shopBased"
                                                    ? "Shop Based"
                                                    : "Home Based"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Nature</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessNature || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Entitled</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.entitled === "proprietor"
                                                    ? "Proprietor"
                                                    : "Partnership"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4 md:col-span-2">
                                            <p className="text-gray-500">Business Address</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessAddress || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Owned / Rented</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessOwnership === "owned"
                                                    ? "Owned"
                                                    : "Rented"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Vintage</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessVintage || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Photo</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessPhotoName || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Proof</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessProofName || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Obligation Details
                                    </h4>
                                    <div className="mt-3 overflow-x-auto">
                                        <table className="min-w-full border border-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {[
                                                        "Company Name",
                                                        "Credit Type",
                                                        "Credit Amount",
                                                        "EMI Amount",
                                                        "Mode of Repayment",
                                                        "EMI / EWI / EFI",
                                                    ].map((heading) => (
                                                        <th
                                                            key={heading}
                                                            className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700"
                                                        >
                                                            {heading}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.obligationRows.map((row, index) => (
                                                    <tr key={`preview-obligation-${index}`}>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.companyName || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.creditType || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.creditAmount || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.emiAmount || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.repaymentMode || "-"}
                                                        </td>
                                                        <td className="border border-gray-200 px-4 py-2">
                                                            {row.installmentAmount || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-medium">
                                                    <td
                                                        colSpan={2}
                                                        className="border border-gray-200 px-4 py-2"
                                                    >
                                                        Total
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {totalObligationAmount || 0}
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {totalEmiAmount || 0}
                                                    </td>
                                                    <td className="border border-gray-200 px-4 py-2">-</td>
                                                    <td className="border border-gray-200 px-4 py-2">
                                                        {totalInstallmentAmount || 0}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        Verification Photo
                                    </h4>
                                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">House Verification Photo</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.houseVerificationPhotoName || "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-gray-500">Business Verification Photo</p>
                                            <p className="mt-1 font-medium text-gray-900">
                                                {formData.businessVerificationPhotoName || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-sm font-semibold text-gray-900">PD Information</h4>
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {pdQuestions.map((question, index) => (
                                            <div
                                                key={`preview-question-${question.key}`}
                                                className="rounded-lg bg-gray-50 p-4 text-sm"
                                            >
                                                <p className="text-gray-500">
                                                    {index + 1}. {question.label}
                                                </p>
                                                <p className="mt-1 font-medium text-gray-900">
                                                    {formatPDAnswerLabel(formData.pdAnswers[question.key])}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showCamera && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                                <h3 className="text-xl font-bold text-gray-900 capitalize">
                                    Capture {cameraType} Photo
                                </h3>
                                <button
                                    onClick={stopCamera}
                                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="relative aspect-video bg-black sm:mx-6 sm:mt-4 sm:rounded-xl overflow-hidden shadow-inner">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="h-full w-full object-contain"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Camera Overlay UI */}
                                <div className="absolute inset-0 pointer-events-none border-[2px] border-white/20 m-8 rounded-lg flex items-center justify-center">
                                    <div className="w-12 h-12 border-t-2 border-l-2 border-white/60 absolute top-0 left-0 rounded-tl-lg"></div>
                                    <div className="w-12 h-12 border-t-2 border-r-2 border-white/60 absolute top-0 right-0 rounded-tr-lg"></div>
                                    <div className="w-12 h-12 border-b-2 border-l-2 border-white/60 absolute bottom-0 left-0 rounded-bl-lg"></div>
                                    <div className="w-12 h-12 border-b-2 border-r-2 border-white/60 absolute bottom-0 right-0 rounded-br-lg"></div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-center gap-4 px-6 py-6 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="order-2 sm:order-1 rounded-xl border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="order-1 sm:order-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-10 py-3 text-sm font-semibold text-white hover:bg-emerald-700 hover:shadow-lg transition-all active:scale-95"
                                >
                                    <Camera className="h-5 w-5" />
                                    Take Photo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showSubmitConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Submit</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Are you sure you want to submit this PD information?
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
                                    disabled={isSubmitting}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Submitting..." : "Yes, Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {pendingRemoveMemberIndex !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Remove</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Are you sure you want to remove this member row?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPendingRemoveMemberIndex(null)}
                                    className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmRemoveMemberRow}
                                    className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                                >
                                    Yes, Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {pendingRemoveObligationIndex !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Remove</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Are you sure you want to remove this obligation row?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPendingRemoveObligationIndex(null)}
                                    className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmRemoveObligationRow}
                                    className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                                >
                                    Yes, Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
