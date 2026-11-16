"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import axios from "axios";
import BASE_URL from "@/app/api/BaseUrl";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

// -------------------------------------------------
// FORM TYPE
// -------------------------------------------------
type FormValues = {
    password: string;
    confirmPassword: string;

    role?: string;

    date_of_birth?: string | null;
    address_1?: string | null;
    address_2?: string | null;

    sourcing_type: "self" | "referral";
    referral_id?: string;

    adhaar_number?: string | null;
    pan_number?: string | null;
    driving_license_number?: string | null;
    voter_id_number?: string | null;

    ifsc_code?: string | null;
    bank_account_number?: string | null;
    bank_name?: string | null;

    adhaar_image?: FileList | undefined;
    pan_image?: FileList | undefined;
    driving_license_image?: FileList | undefined;
    voter_id_image?: FileList | undefined;
    passbook_image?: FileList | undefined;

    status?: string;
    agent_unique_id?: string;
};

type KycOption =
    | "aadhaar"
    | "panCard"
    | "voterId"
    | "drivingLicense"
    | "rationCard"
    | "otherDocument";

type AssetOption =
    | "twoWheeler"
    | "tv"
    | "fridge"
    | "washingMachine"
    | "cooler"
    | "lpg";

type ProfileFormState = {
    // enrollmentNumber: string;
    enrollmentDate: string;
    // customerId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    gender: string;
    dob: string;
    fatherName: string;
    serviceAreaPin: string;
    religion: string;
    caste: string;
    kycSelected: Record<KycOption, boolean>;
    kycImages: Record<KycOption, string>;
    kycImagePreviews: Record<KycOption, string>;
    kycNumbers: Record<KycOption, string> & { otherName: string };
    permanentAddress: string;
    correspondenceAddress: string;
    sameAsPermanentAddress: boolean;
    contactNumber1: string;
    contactNumber2: string;
    emailId: string;
    nomineeName: string;
    nomineeRelationship: string;
    nomineeRelationshipOther: string;
    nomineeAddress: string;
    occupation: string;
    salariedType: string;
    businessNature: string;
    spouseOccupation: string;
    spouseSalariedType: string;
    spouseBusinessNature: string;
    residenceType: string;
    yearsOfStaying: string;
    houseType: string;
    numberOfRooms: string;
    assets: Record<AssetOption, boolean>;
    customerPhotoName: string;
    customerPhotoPreview: string;
    customerPhotoSize: number;
    isDisabled: string;
    disabilityType: string;
    customerConsent: boolean;
};

const kycLabels: Record<KycOption, string> = {
    aadhaar: "UID / Aadhaar",
    panCard: "PAN Card",
    voterId: "Voter ID",
    drivingLicense: "Driving License",
    rationCard: "Ration Card",
    otherDocument: "Other Document",
};

const assetLabels: Record<AssetOption, string> = {
    twoWheeler: "Two Wheeler",
    tv: "TV",
    fridge: "Fridge",
    washingMachine: "Washing Machine",
    cooler: "Cooler",
    lpg: "LPG",
};

const religionOptions = [
    "Hindu",
    "Muslim",
    "Christian",
    "Sikh",
    "Buddhist",
    "Jain",
    "Other",
];

const getKycMaxLength = (option: KycOption) => {
    switch (option) {
        case "aadhaar":
            return 12;
        case "panCard":
        case "voterId":
            return 10;
        default:
            return undefined;
    }
};

const sanitizeKycNumber = (option: KycOption, value: string) => {
    switch (option) {
        case "aadhaar":
            return value.replace(/\D/g, "").slice(0, 12);
        case "panCard":
        case "voterId":
            return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        default:
            return value;
    }
};

const getKycValidationMessage = (option: KycOption, value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return `Please enter ${kycLabels[option]} number before preview.`;
    }

    switch (option) {
        case "aadhaar":
            return /^\d{12}$/.test(trimmedValue)
                ? ""
                : "Aadhaar number must contain exactly 12 digits.";
        case "panCard":
            return /^[A-Z0-9]{10}$/.test(trimmedValue)
                ? ""
                : "PAN Card number must be exactly 10 characters.";
        case "voterId":
            return /^[A-Z0-9]{10}$/.test(trimmedValue)
                ? ""
                : "Voter ID number must be exactly 10 characters.";
        default:
            return "";
    }
};

const sanitizeProfileField = (field: keyof ProfileFormState, value: string) => {
    switch (field) {
        case "contactNumber1":
        case "contactNumber2":
            return value.replace(/\D/g, "").slice(0, 12);
        case "serviceAreaPin":
            return value.replace(/\D/g, "").slice(0, 6);
        default:
            return value;
    }
};

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

const calculateAgeFromDob = (dob: string) => {
    if (!dob) return "";

    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age -= 1;
    }

    return age >= 0 ? String(age) : "";
};

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const validateImageSize = (file: File | undefined, label: string) => {
    if (!file) return true;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return false;
    }

    return true;
};

// -------------------------------------------------
// YUP VALIDATION
// -------------------------------------------------
const schema: any = yup
    .object({
        password: yup
            .string()
            .min(6, "Minimum 6 characters required")
            .required("Password is required"),

        confirmPassword: yup
            .string()
            .oneOf([yup.ref("password")], "Passwords must match")
            .required("Confirm Password is required"),

        role: yup.string().required(),

        date_of_birth: yup.string().nullable(),
        address_1: yup.string().nullable(),
        address_2: yup.string().nullable(),

        sourcing_type: yup
            .string()
            .oneOf(["self", "referral"], "Invalid sourcing type")
            .required("Sourcing type is required"),

        referral_id: yup.string().when("sourcing_type", {
            is: "referral",
            then: (schema) => schema.required("Referral ID is required"),
            otherwise: (schema) => schema.nullable(),
        }),


        adhaar_number: yup
            .string()
            .matches(/^[0-9]{12}$/, "Aadhaar must be 12 digits")
            .nullable(),

        pan_number: yup
            .string()
            .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
            .nullable(),

        driving_license_number: yup.string().nullable(),
        voter_id_number: yup.string().nullable(),
        agent_unique_id: yup.string().required("Agent is required"),
        adhaar_image: yup.mixed<FileList>().nullable(),
        pan_image: yup.mixed<FileList>().nullable(),
        driving_license_image: yup.mixed<FileList>().nullable(),
        voter_id_image: yup.mixed<FileList>().nullable(),
        bank_account_number: yup.string().nullable(),

        bank_name: yup.string().nullable(),

        ifsc_code: yup
            .string()
            .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
            .nullable(),

        passbook_image: yup
            .mixed<FileList>()
            .test(
                "fileSize",
                "File size must be less than 2MB",
                (value) =>
                    !value || !value[0] || value[0].size <= 2 * 1024 * 1024
            )
            .test(
                "fileType",
                "Only JPG, PNG or PDF allowed",
                (value) =>
                    !value ||
                    !value[0] ||
                    ["image/jpeg", "image/png", "application/pdf"].includes(
                        value[0].type
                    )
            )
            .nullable(),

    })
    .required();

export default function CreateUserPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerType = searchParams.get("type"); // "existing" or null
    const isExistingFlow = customerType === "existing";

    // ── Existing Customer Flow State ──────────────────────────────────────────
    const [existingCustomerId, setExistingCustomerId] = useState("");
    const [existingCustomer, setExistingCustomer] = useState<any>(null);
    const [existingSearchLoading, setExistingSearchLoading] = useState(false);
    const [existingEnrollLoading, setExistingEnrollLoading] = useState(false);
    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [existingAgents, setExistingAgents] = useState<any[]>([]);
    const [existingSelectedAgentId, setExistingSelectedAgentId] = useState("");

    useEffect(() => {
        if (!isExistingFlow) return;
        const fetchExistingAgents = async () => {
            try {
                const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
                if (!user) return;
                const role = (user.role || "").toLowerCase();
                const params = {
                    branch_id: user.branch,
                    cms_admin_id: role === "cms_admin" ? user.user_id : user.cms_admin,
                    ...(role !== "cms_admin" && { user_id: user.user_id }),
                };
                const res = await axiosInstance.get(ProjectApiList.api_getAllAgents, { params });
                if (res.data.success) {
                    setExistingAgents(res.data.data.data);
                    if (role === "field executive") {
                        setExistingSelectedAgentId(user.agent_unique_id || "");
                    }
                }
            } catch (error) {
                console.error("Failed to fetch agents", error);
            }
        };
        fetchExistingAgents();
    }, [isExistingFlow]);

    const handleSearchExistingCustomer = async () => {
        if (!existingCustomerId.trim()) {
            toast.error("Please enter a Customer ID");
            return;
        }
        try {
            setExistingSearchLoading(true);
            setExistingCustomer(null);
            const loggedInUser = typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("user") || "null")
                : null;
            const res = await axiosInstance.get(
                `${ProjectApiList.api_getLonaCustomerById}/${existingCustomerId.trim()}`,
                {
                    params: {
                        branch_id: loggedInUser?.branch,
                    },
                }
            );
            if (res.data.success && res.data.data) {
                const customerData = res.data.data;
                setExistingCustomer(customerData);
                if (customerData.agent_unique_id) {
                    setExistingSelectedAgentId(customerData.agent_unique_id);
                }
            } else {
                toast.error("Customer not found. Please check the Customer ID.");
            }
        } catch {
            toast.error("Customer not found. Please check the Customer ID.");
        } finally {
            setExistingSearchLoading(false);
        }
    };
    const handleForwardToBSE = async () => {
        if (!existingCustomer) return;

        const loggedInUser = typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "null")
            : null;

        const isFieldExecutive = (loggedInUser?.role || "").toLowerCase() === "field executive";

        if (!isFieldExecutive && !existingSelectedAgentId) {
            toast.error("Please select a Field Executive before proceeding.");
            return;
        }

        if (isFieldExecutive) {
            const customerAgentId = existingCustomer.agent_unique_id || "";
            const userAgentId = loggedInUser?.agent_unique_id || "";
            if (!customerAgentId || customerAgentId !== userAgentId) {
                toast.error("You may only generate enrollment for customers created by logged in Field Executive.");
                return;
            }
        }

        try {
            setExistingEnrollLoading(true);

            const existingSelectedAgent = existingAgents.find(a => a.agent_unique_id === existingSelectedAgentId);
            const enrolledBy = isFieldExecutive
                ? loggedInUser?.user_id
                : existingSelectedAgent?.user_id ?? null;

            const userRole = (loggedInUser?.role || "").toLowerCase();
            const cmsAdminId = userRole === "cms_admin" ? loggedInUser?.user_id : loggedInUser?.cms_admin ?? null;

            const res = await axiosInstance.post(ProjectApiList.api_createEnrollment, {
                customer_unique_id: existingCustomer.customer_unique_id,
                enrollment_date: new Date().toISOString().split("T")[0],
                branch_id: loggedInUser?.branch ?? null,
                cms_admin_id: cmsAdminId,
                enrolled_by: enrolledBy,
            });

            if (res.data.success) {
                const { enrollment_number } = res.data.data;
                toast.success(`New Enrollment ${enrollment_number} generated & forwarded to BSE for verification.`);
                setShowForwardDialog(false);
                router.push("/loan/customers");
            } else {
                toast.error(res.data.message || "Failed to generate enrollment");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to generate enrollment");
        } finally {
            setExistingEnrollLoading(false);
        }
    };

    // ── Early return: Existing Customer UI ───────────────────────────────────
    if (isExistingFlow) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Existing Customer — New Loan</h1>
                    <button
                        onClick={() => router.back()}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                        Back
                    </button>
                </div>

                {/* Agent Selection */}
                {(() => {
                    const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
                    const isFE = (user?.role || "").toLowerCase() === "field executive";
                    if (isFE) return null;
                    return (
                        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-gray-700">Assign Field Executive <span className="text-red-500">*</span></h2>
                            <select
                                value={existingSelectedAgentId}
                                disabled={!!existingCustomer}
                                onChange={(e) => setExistingSelectedAgentId(e.target.value)}
                                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!existingSelectedAgentId ? "border-gray-300" : "border-gray-300"}`}
                            >
                                <option value="">Select Field Executive</option>
                                {existingAgents.map((agent) => (
                                    <option key={agent.id} value={agent.agent_unique_id}>
                                        {agent.name} ({agent.agent_unique_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })()}

                {/* Step 1 — Search */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700">Enter Customer ID</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"



                            onChange={(e) => {
                                setExistingCustomerId(e.target.value);
                                setExistingCustomer(null);
                            }}
                            placeholder="e.g. CUST-00001"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => e.key === "Enter" && handleSearchExistingCustomer()}
                        />
                        <button
                            type="button"
                            onClick={handleSearchExistingCustomer}
                            disabled={existingSearchLoading}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                        >
                            {existingSearchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {existingSearchLoading ? "Searching..." : "Search"}
                        </button>
                    </div>
                </div>

                {/* Step 2 — Read-only Customer Details */}
                {existingCustomer && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Customer Details</h2>

                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {[
                                ["Customer ID", existingCustomer.customer_unique_id],
                                [
                                    "Full Name",
                                    `${existingCustomer.first_name || ""} ${existingCustomer.middle_name || ""
                                        } ${existingCustomer.last_name || ""}`.trim(),
                                ],
                                ["Date of Birth", existingCustomer.date_of_birth],
                                ["Gender", existingCustomer.gender],
                                ["Contact", existingCustomer.contact_number_1],
                                ["Email", existingCustomer.email],
                                ["Permanent Address", existingCustomer.permanent_address],
                                ["Service Area PIN", existingCustomer.service_area_pin],
                                ["Role", existingCustomer.role],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className="font-medium text-gray-800 break-all">{value || "—"}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-xs text-gray-500 mb-3">
                                A new Enrollment ID will be generated for this loan cycle.
                                The Customer ID will remain unchanged.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowForwardDialog(true)}
                                disabled={existingEnrollLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 disabled:bg-green-300"
                            >
                                {existingEnrollLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {existingEnrollLoading ? "Generating Enrollment..." : "Generate New Enrollment & Forward to BSE"}
                            </button>
                        </div>
                    </div>
                )}
                {showForwardDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                            <h3 className="text-lg font-semibold">
                                Forward To BSE
                            </h3>

                            <p className="mt-3 text-sm text-gray-600">
                                Are you sure you want to generate a new enrollment
                                and forward this customer to BSE?
                            </p>

                            <div className="mt-4 bg-gray-50 rounded p-3">
                                <p>
                                    <strong>Customer ID:</strong>{" "}
                                    {existingCustomer?.customer_unique_id}
                                </p>

                                <p>
                                    <strong>Name:</strong>{" "}
                                    {existingCustomer?.first_name}{" "}
                                    {existingCustomer?.last_name}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-5">
                                <button
                                    onClick={() => setShowForwardDialog(false)}
                                    className="px-4 py-2 border rounded"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleForwardToBSE}
                                    disabled={existingEnrollLoading}
                                    className="px-4 py-2 bg-green-600 text-white rounded"
                                >
                                    {existingEnrollLoading
                                        ? "Forwarding..."
                                        : "Confirm & Forward"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    }
    // ── END Existing Customer UI ──────────────────────────────────────────────

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const voterIdCheckboxRef = useRef<HTMLInputElement | null>(null);
    const voterIdNumberRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewErrorMessage, setPreviewErrorMessage] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [pendingData, setPendingData] = useState<FormValues | null>(null);
    const [agents, setAgents] = useState<any[]>([]);
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
    const [profileForm, setProfileForm] = useState<ProfileFormState>({
        // enrollmentNumber: "",
        enrollmentDate: "",
        // customerId: "",
        firstName: "",
        middleName: "",
        lastName: "",
        gender: "",
        dob: "",
        fatherName: "",
        serviceAreaPin: "",
        religion: "",
        caste: "",
        kycSelected: {
            aadhaar: false,
            panCard: false,
            voterId: false,
            drivingLicense: false,
            rationCard: false,
            otherDocument: false,
        },
        kycImages: {
            aadhaar: "",
            panCard: "",
            voterId: "",
            drivingLicense: "",
            rationCard: "",
            otherDocument: "",
        },
        kycImagePreviews: {
            aadhaar: "",
            panCard: "",
            voterId: "",
            drivingLicense: "",
            rationCard: "",
            otherDocument: "",
        },
        kycNumbers: {
            aadhaar: "",
            panCard: "",
            voterId: "",
            drivingLicense: "",
            rationCard: "",
            otherDocument: "",
            otherName: "",
        },
        permanentAddress: "",
        correspondenceAddress: "",
        sameAsPermanentAddress: false,
        contactNumber1: "",
        contactNumber2: "",
        emailId: "",
        nomineeName: "",
        nomineeRelationship: "",
        nomineeRelationshipOther: "",
        nomineeAddress: "",
        occupation: "",
        salariedType: "",
        businessNature: "",
        spouseOccupation: "",
        spouseSalariedType: "",
        spouseBusinessNature: "",
        residenceType: "",
        yearsOfStaying: "",
        houseType: "",
        numberOfRooms: "",
        assets: {
            twoWheeler: false,
            tv: false,
            fridge: false,
            washingMachine: false,
            cooler: false,
            lpg: false,
        },
        customerPhotoName: "",
        customerPhotoPreview: "",
        customerPhotoSize: 0,
        isDisabled: "No",
        disabilityType: "",
        customerConsent: false,
    });

    const setFieldRef = (name: string, el: HTMLElement | null) => {
        fieldRefs.current[name] = el;
    };

    const focusFirstError = (errorsMap: Record<string, string>) => {
        const firstKey = Object.keys(errorsMap)[0];
        if (!firstKey) return;
        const el = fieldRefs.current[firstKey];
        if (el?.scrollIntoView) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if ((el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.focus) {
            (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).focus();
        }
    };

    const fieldErrorClass = (name: string) =>
        fieldErrors[name]
            ? "border border-red-500 ring-1 ring-red-200 focus:ring-red-500"
            : "border border-gray-300";

    const clearFieldError = (name: string) => {
        if (!fieldErrors[name]) return;
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        setError,
        clearErrors,
        trigger,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: yupResolver(schema),
        mode: "onChange",
        defaultValues: {
            role: "customer",
            status: "active",
            sourcing_type: "self",
        },
    });

    const { ref: agentRef, ...agentRest } = register("agent_unique_id");

    const selectedAgentId = watch("agent_unique_id");
    const calculatedAge = calculateAgeFromDob(profileForm.dob);

    const selectedAgent = agents.find(
        (a) => a.agent_unique_id === selectedAgentId
    );
    console.log("Selected Agent", selectedAgent);

    // -------------------------------------------------
    // FORCE ROLE = "customer" ALWAYS
    // -------------------------------------------------
    useEffect(() => {
        setValue("role", "customer");
    }, [setValue]);

    useEffect(() => {
        if (!videoRef.current || !cameraStream) return;

        videoRef.current.srcObject = cameraStream;
    }, [cameraStream]);

    useEffect(() => {
        return () => {
            cameraStream?.getTracks().forEach((track) => track.stop());
        };
    }, [cameraStream]);

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    useEffect(() => {
        const user = getLoggedInUser();

        if (
            user?.role === "Field Executive" &&
            agents.length > 0
        ) {
            const exists = agents.find(
                (a) => a.agent_unique_id === user.agent_unique_id
            );

            if (exists) {
                setValue("agent_unique_id", user.agent_unique_id);
            }
        }
    }, [agents, setValue]);

    useEffect(() => {
        const fetchAgents = async () => {
            setLoading(true);

            try {
                const user = getLoggedInUser();

                if (!user) return;

                const role = (user.role || "").toLowerCase();

                const params = {
                    branch_id: user.branch,

                    cms_admin_id:
                        role === "cms_admin"
                            ? user.user_id
                            : user.cms_admin,

                    ...(role !== "cms_admin" && {
                        user_id: user.user_id,
                    }),
                };

                console.log("Agent API Params =>", params);

                const res = await axiosInstance.get(
                    ProjectApiList.api_getAllAgents,
                    { params }
                );

                if (res.data.success) {
                    setAgents(res.data.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch agents", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, []);



    // -------------------------------------------------
    // SUBMIT HANDLER
    // -------------------------------------------------

    // const getLoggedInUser = () => {
    //     if (typeof window === "undefined") return null;
    //     const user = localStorage.getItem("user");
    //     return user ? JSON.parse(user) : null;
    // };

    const buildCustomerSubmissionPayload = () => {
        const user = getLoggedInUser();

        const role = (user?.role || "").toLowerCase();

        return normalizeEmptyToNull({
            user_id: user?.user_id ?? null,
            branch_id: user?.branch ?? null,
            enroll_by: selectedAgent?.user_id ?? user?.user_id ?? null,

            cms_admin_id:
                role === "cms_admin"
                    ? user?.user_id
                    : user?.cms_admin,

            agent_unique_id: selectedAgentId,
            profileForm,
            selectedKycPreview,
            selectedAssetsPreview,
            calculatedAge,
        });
    };

    const onSubmit = async (data: FormValues) => {
        const toastId = toast.loading("Creating customer...");

        try {
            setLoading(true);

            const payload: any = {
                ...buildCustomerSubmissionPayload(),
                password: data.password,
                sourcing_type: data.sourcing_type,
                referral_id: data.referral_id || null,
            };
            // console.log("Customer submission payload:", payload);

            const formData = new FormData();

            // formData.append("otp", otpValue);

            // convert payload object → FormData
            Object.entries(payload).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                    formData.append(key, "");
                    return;
                }

                if (key === "profileForm") {
                    // Handle nested profileForm images and data
                    const profile = value as any;
                    Object.entries(profile).forEach(([pKey, pValue]) => {
                        if (pKey === "kycSelected" || pKey === "kycNumbers" || pKey === "assets") {
                            formData.append(`profileForm[${pKey}]`, JSON.stringify(pValue));
                        } else if (pKey !== "kycImages" && pKey !== "kycImagePreviews" && pKey !== "customerPhotoPreview" && pKey !== "customerPhotoName") {
                            formData.append(`profileForm[${pKey}]`, String(pValue ?? ""));
                        }
                    });
                    return;
                }

                if (typeof value === "object" && !(value instanceof File)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value as any);
                }
            });

            // Append KYC Files correctly
            (Object.keys(profileForm.kycSelected) as KycOption[]).forEach((option) => {
                if (profileForm.kycSelected[option]) {
                    const fileInput = document.querySelector(`input[type="file"][data-kyc="${option}"]`) as HTMLInputElement;
                    if (fileInput?.files?.[0]) {
                        formData.append(`${option}Image`, fileInput.files[0]);
                    }

                    // Append Back Images for Aadhaar and Voter ID
                    if (option === "aadhaar" || option === "voterId") {
                        const backFileInput = document.querySelector(`input[type="file"][data-kyc-back="${option}"]`) as HTMLInputElement;
                        if (backFileInput?.files?.[0]) {
                            formData.append(`kycImages[${option}ImageBack]`, backFileInput.files[0]);
                        }
                    }

                    // Append Other Document
                    if (option === "otherDocument") {
                        const otherFileInput = document.querySelector(`input[type="file"][data-kyc="${option}"]`) as HTMLInputElement;
                        if (otherFileInput?.files?.[0]) {
                            formData.append(`kycImages[otherDocument]`, otherFileInput.files[0]);
                        }
                    }
                }
            });

            // Append Customer Photo
            if (profileForm.customerPhotoPreview.startsWith("data:image")) {
                // Handle base64 from camera
                const res = await fetch(profileForm.customerPhotoPreview);
                const blob = await res.blob();
                formData.append("customerPhoto", blob, profileForm.customerPhotoName);
            } else {
                const photoInput = document.querySelector('input[type="file"][data-type="customer-photo"]') as HTMLInputElement;
                if (photoInput?.files?.[0]) {
                    formData.append("customerPhoto", photoInput.files[0]);
                }
            }

            const res = await axiosInstance.post(
                ProjectApiList.api_createLonaCustomers,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (res.data.success) {

                toast.success(res.data.message, { id: toastId });

                setShowConfirm(false);
                setPendingData(null);

                router.push("/loan/customers");

            } else {

                toast.error("Failed to create customer", { id: toastId });

            }

        } catch (error: any) {

            const response = error?.response?.data;

            // console.log("Error response from error:", error);
            // console.log("Error response from server:", response);

            if (response?.errors) {
                const backendFieldErrors: Record<string, string> = {};

                Object.entries(response.errors).forEach(([key, val]) => {
                    const message = Array.isArray(val) ? val[0] : String(val);

                    if (key === "password") {
                        setError("password", { type: "server", message });
                    }

                    switch (key) {
                        case "email":
                        case "emailId":
                        case "profileForm.emailId":
                            backendFieldErrors.emailId = message;
                            break;

                        case "agent_unique_id":
                            backendFieldErrors.agent_unique_id = message;
                            break;

                        case "contact_number_1":
                        case "contactNumber1":
                            backendFieldErrors.contactNumber1 = message;
                            break;

                        default:
                            backendFieldErrors[key] = message;
                    }
                });

                setFieldErrors((prev) => ({
                    ...prev,
                    ...backendFieldErrors,
                }));

                focusFirstError(backendFieldErrors);

                const firstErrorMessage =
                    Object.values(backendFieldErrors)[0] ||
                    response.message ||
                    "Please fix highlighted fields";

                toast.error(firstErrorMessage, { id: toastId });
            } else {

                toast.error(
                    response?.message || "Something went wrong",
                    { id: toastId }
                );

            }

        } finally {

            setLoading(false);

        }
    };

    // -------------------------------------------------
    // UI
    // -------------------------------------------------
    const inputClass =
        "bg-gray-50 rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-600";

    const sectionCardClass = "border border-gray-300 rounded-lg p-5";
    const sectionHeadingClass = "text-md font-semibold text-green-700";
    const profileGridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3";
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";

    const updateProfileField = (field: keyof ProfileFormState, value: string) => {
        setProfileForm((prev) => {
            const sanitizedValue = sanitizeProfileField(field, value);
            const nextState = { ...prev, [field]: sanitizedValue };

            if (field === "permanentAddress" && prev.sameAsPermanentAddress) {
                nextState.correspondenceAddress = sanitizedValue;
            }

            return nextState;
        });
        clearFieldError(field as string);
    };

    const toggleKycOption = (option: KycOption) => {
        if (option === "voterId") {
            setPreviewErrorMessage("");
        }

        setProfileForm((prev) => ({
            ...prev,
            kycSelected: {
                ...prev.kycSelected,
                [option]: !prev.kycSelected[option],
            },
        }));
        clearFieldError("kycSelected");
    };

    const updateKycField = (
        type: "kycImages" | "kycNumbers" | "kycImagePreviews",
        option: KycOption,
        value: string
    ) => {
        const nextValue =
            type === "kycNumbers" ? sanitizeKycNumber(option, value) : value;

        if (type === "kycNumbers") {
            setPreviewErrorMessage("");
        }

        setProfileForm((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [option]: nextValue,
            },
        }));
        if (type === "kycNumbers" && option === "voterId") {
            clearFieldError("kycNumbers.voterId");
        }
    };

    const toggleAsset = (asset: AssetOption) => {
        setProfileForm((prev) => ({
            ...prev,
            assets: {
                ...prev.assets,
                [asset]: !prev.assets[asset],
            },
        }));
    };

    const handleSendOtp = async () => {
        if (!profileForm.emailId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.emailId)) {
            toast.error("Please enter a valid email address first");
            return;
        }
        setOtpLoading(true);
        try {
            const res = await axiosInstance.post(ProjectApiList.api_sendOtp, { email: profileForm.emailId });
            if (res.data.success) {
                toast.success("OTP sent to your email");
                setOtpSent(true);
            } else {
                toast.error(res.data.message || "Failed to send OTP");
            }
        } catch (error: any) {
            const response = error?.response?.data;
            if (response?.errors?.email) {
                toast.error(response.errors.email[0]);
            } else {
                toast.error(response?.message || "Failed to send OTP");
            }
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpValue || otpValue.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP");
            return;
        }
        setOtpLoading(true);
        try {
            const res = await axiosInstance.post(ProjectApiList.api_verifyOtp, { email: profileForm.emailId, otp: otpValue });
            if (res.data.success) {
                toast.success("Email verified successfully");
                setOtpVerified(true);
            } else {
                toast.error(res.data.message || "Invalid OTP");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Verification failed");
        } finally {
            setOtpLoading(false);
        }
    };


    const toggleSameAddress = () => {
        setProfileForm((prev) => {
            const nextChecked = !prev.sameAsPermanentAddress;

            return {
                ...prev,
                sameAsPermanentAddress: nextChecked,
                correspondenceAddress: nextChecked
                    ? prev.permanentAddress
                    : prev.correspondenceAddress,
            };
        });
    };

    const selectedKycPreview = (Object.keys(kycLabels) as KycOption[])
        .filter((option) => profileForm.kycSelected[option])
        .map((option) => ({
            label: option === "otherDocument" ? (profileForm.kycNumbers.otherName || kycLabels[option]) : kycLabels[option],
            value: profileForm.kycNumbers[option] || "-",
        }));
    const selectedKycCount = selectedKycPreview.length;

    const selectedAssetsPreview = (Object.keys(assetLabels) as AssetOption[])
        .filter((asset) => profileForm.assets[asset])
        .map((asset) => assetLabels[asset]);

    const customerFullName = [
        profileForm.firstName,
        profileForm.middleName,
        profileForm.lastName,
    ]
        .filter(Boolean)
        .join(" ");

    const showCustomerProfileSections = profileForm.kycSelected.voterId;

    const handleCustomerPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!validateImageSize(file, "Customer photo")) {
            toast.error("Customer photo must be 2MB or smaller.");
            e.target.value = "";
            setProfileForm((prev) => ({
                ...prev,
                customerPhotoName: "",
                customerPhotoPreview: "",
            }));
            return;
        }

        setProfileForm((prev) => ({
            ...prev,
            customerPhotoName: file?.name || "",
            customerPhotoPreview:
                file && file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : "",
        }));
    };

    const closeCameraModal = () => {
        cameraStream?.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setShowCameraModal(false);
    };

    const openCameraModal = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error("Camera is not supported on this device/browser");
            return;
        }

        try {
            setCameraLoading(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                },
                audio: false,
            });

            setCameraStream(stream);
            setShowCameraModal(true);
        } catch {
            toast.error("Unable to access camera. Please allow camera permission.");
        } finally {
            setCameraLoading(false);
        }
    };

    const captureCustomerPhoto = () => {
        if (!videoRef.current || !canvasRef.current) {
            toast.error("Camera preview is not ready");
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
            toast.error("Camera preview is not ready");
            return;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
            toast.error("Unable to capture photo");
            return;
        }

        context.drawImage(video, 0, 0, width, height);
        const imageData = canvas.toDataURL("image/png");

        setProfileForm((prev) => ({
            ...prev,
            customerPhotoName: `camera-capture-${Date.now()}.png`,
            customerPhotoPreview: imageData,
        }));

        closeCameraModal();
    };

    const clearCustomerPhoto = () => {
        if (typeof window !== "undefined") {
            const confirmed = window.confirm(
                "Are you sure you want to remove the selected photo?"
            );

            if (!confirmed) return;
        }

        setProfileForm((prev) => ({
            ...prev,
            customerPhotoName: "",
            customerPhotoPreview: "",
        }));
    };

    const previewSections = [
        {
            title: "Basic Information",
            items: [
                // ["Enrollment Number", profileForm.enrollmentNumber || "-"],
                ["Enrollment Date", profileForm.enrollmentDate || "-"],
                // ["Customer ID", profileForm.customerId || "-"],
                ["First Name", profileForm.firstName || "-"],
                ["Middle Name", profileForm.middleName || "-"],
                ["Last Name", profileForm.lastName || "-"],
                ["Gender", profileForm.gender || "-"],
                ["DOB", profileForm.dob || "-"],
                ["Age", calculatedAge || "-"],
                ["Father Name", profileForm.fatherName || "-"],
                ["Service Area PIN", profileForm.serviceAreaPin || "-"],
                ["Religion", profileForm.religion || "-"],
                ["Caste", profileForm.caste || "-"],
            ],
        },
        {
            title: "Address Details",
            items: [
                ["Permanent Address", profileForm.permanentAddress || "-"],
                ["Correspondence Address", profileForm.correspondenceAddress || "-"],
                ["Contact Number 1", profileForm.contactNumber1 || "-"],
                ["Contact Number 2", profileForm.contactNumber2 || "-"],
                ["Email ID", profileForm.emailId || "-"],
            ],
        },
        {
            title: "Nominee Details",
            items: [
                ["Nominee Name", profileForm.nomineeName || "-"],
                ["Relationship", profileForm.nomineeRelationship || "-"],
                ["Please Specify", profileForm.nomineeRelationshipOther || "-"],
                ["Nominee Address", profileForm.nomineeAddress || "-"],
            ],
        },
        {
            title: "Occupation Details",
            items: [
                ["Occupation", profileForm.occupation || "-"],
                ["Employee Type", profileForm.salariedType || "-"],
                ["Nature of Business", profileForm.businessNature || "-"],
                ["Spouse / Nominee Occupation", profileForm.spouseOccupation || "-"],
                ["Spouse Employee Type", profileForm.spouseSalariedType || "-"],
                ["Spouse Nature of Business", profileForm.spouseBusinessNature || "-"],
            ],
        },
        {
            title: "House Details",
            items: [
                ["Residence Type", profileForm.residenceType || "-"],
                ["Years of Staying", profileForm.yearsOfStaying || "-"],
                ["House Type", profileForm.houseType || "-"],
                ["Number of Rooms", profileForm.numberOfRooms || "-"],
                ["Assets", selectedAssetsPreview.join(", ") || "-"],
                ["Customer Photo", profileForm.customerPhotoName || "-"],
            ],
        },
        {
            title: "Person Disability",
            items: [
                ["Is Disabled", profileForm.isDisabled || "-"],
                [
                    "Disability Type",
                    profileForm.isDisabled === "Yes"
                        ? profileForm.disabilityType || "-"
                        : "-",
                ],
            ],
        },
        {
            title: "Customer Consent",
            items: [
                ["Consent Given", profileForm.customerConsent ? "Yes" : "No"],
            ],
        },
    ];

    const handlePreview = () => {
        if (!profileForm.kycSelected.voterId) {
            const errorMessage =
                "Please select Voter ID in KYC Details before preview.";
            setPreviewErrorMessage(errorMessage);
            toast.error(errorMessage);
            voterIdCheckboxRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            voterIdCheckboxRef.current?.focus();
            return;
        }

        if (!profileForm.kycNumbers.voterId.trim()) {
            const errorMessage =
                "Please enter the Voter ID number before preview.";
            setPreviewErrorMessage(errorMessage);
            toast.error(errorMessage);
            voterIdNumberRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            voterIdNumberRef.current?.focus();
            return;
        }

        if (selectedKycCount < 3) {
            setPreviewErrorMessage("");
            toast.error("Please select at least 3 KYC details before preview.");
            return;
        }

        for (const option of Object.keys(kycLabels) as KycOption[]) {
            if (!profileForm.kycSelected[option]) continue;

            const validationMessage = getKycValidationMessage(
                option,
                profileForm.kycNumbers[option]
            );

            if (validationMessage) {
                setPreviewErrorMessage(validationMessage);
                toast.error(validationMessage);

                if (option === "voterId") {
                    voterIdNumberRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                    voterIdNumberRef.current?.focus();
                }

                return;
            }
        }

        setPreviewErrorMessage("");
        setShowProfilePreview(true);
    };

    const validateCustomerSubmission = () => {
        // =========================
        // KYC VALIDATIONS
        // =========================

        const selectedDocs = (
            Object.keys(profileForm.kycSelected) as KycOption[]
        ).filter((option) => profileForm.kycSelected[option]);

        if (selectedDocs.length < 3) {
            const err = {
                kycSelected: "Minimum 3 KYC documents are required",
            };

            setFieldErrors(err);
            focusFirstError(err);
            toast.error(err.kycSelected);

            return false;
        }

        if (!profileForm.kycSelected.voterId) {
            const err = {
                kycSelected: "Voter ID is mandatory",
            };

            setFieldErrors(err);
            focusFirstError(err);
            toast.error(err.kycSelected);

            return false;
        }

        if (!profileForm.kycNumbers.voterId.trim()) {
            const err = {
                "kycNumbers.voterId":
                    "Voter ID number is mandatory",
            };

            setFieldErrors(err);
            focusFirstError(err);
            toast.error(err["kycNumbers.voterId"]);

            return false;
        }

        if (!profileForm.kycImages.voterId) {
            toast.error(
                "Voter ID document upload is mandatory"
            );

            return false;
        }

        for (const doc of selectedDocs) {
            if (!profileForm.kycNumbers[doc]?.trim()) {
                toast.error(
                    `${kycLabels[doc]} number is required`
                );

                return false;
            }

            if (!profileForm.kycImages[doc]) {
                toast.error(
                    `${kycLabels[doc]} file upload is required`
                );

                return false;
            }
        }

        // =========================
        // STEP BY STEP VALIDATION
        // =========================

        const sections = [
            {
                name: "Basic Information",
                validations: [
                    {
                        field: "firstName",
                        valid: !!profileForm.firstName.trim(),
                        message: "First Name is required",
                    },
                    {
                        field: "lastName",
                        valid: !!profileForm.lastName.trim(),
                        message: "Last Name is required",
                    },
                    {
                        field: "gender",
                        valid: !!profileForm.gender,
                        message: "Gender is required",
                    },
                    {
                        field: "dob",
                        valid: !!profileForm.dob,
                        message: "Date of Birth is required",
                    },
                    {
                        field: "fatherName",
                        valid: !!profileForm.fatherName.trim(),
                        message: "Father Name is required",
                    },
                    {
                        field: "serviceAreaPin",
                        valid: profileForm.serviceAreaPin.length === 6,
                        message: "Service Area PIN is required",
                    },
                    {
                        field: "religion",
                        valid: !!profileForm.religion,
                        message: "Religion is required",
                    },
                    {
                        field: "caste",
                        valid: !!profileForm.caste,
                        message: "Caste is required",
                    },
                ],
            },

            {
                name: "Address Details",
                validations: [
                    {
                        field: "permanentAddress",
                        valid: !!profileForm.permanentAddress.trim(),
                        message: "Permanent Address is required",
                    },
                    {
                        field: "correspondenceAddress",
                        valid: !!profileForm.correspondenceAddress.trim(),
                        message: "Correspondence Address is required",
                    },
                    {
                        field: "contactNumber1",
                        valid: profileForm.contactNumber1.length >= 10,
                        message: "Contact Number is required",
                    },
                    {
                        field: "emailId",
                        valid:
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                profileForm.emailId
                            ),
                        message: "Valid Email is required",
                    },
                ],
            },

            {
                name: "Nominee Details",
                validations: [
                    {
                        field: "nomineeName",
                        valid: !!profileForm.nomineeName.trim(),
                        message: "Nominee Name is required",
                    },
                    {
                        field: "nomineeRelationship",
                        valid: !!profileForm.nomineeRelationship,
                        message: "Nominee Relationship is required",
                    },
                ],
            },

            {
                name: "Password Section",
                validations: [
                    {
                        field: "password",
                        valid: !!watch("password"),
                        message: "Password is required",
                    },
                    {
                        field: "confirmPassword",
                        valid:
                            watch("password") ===
                            watch("confirmPassword"),
                        message: "Passwords must match",
                    },
                ],
            },

            {
                name: "House / Residence Details",
                validations: [
                    {
                        field: "residenceType",
                        valid: !!profileForm.residenceType,
                        message: "Residence Type is required",
                    },
                    {
                        field: "yearsOfStaying",
                        valid: !!profileForm.yearsOfStaying,
                        message: "Years Of Staying is required",
                    },
                    {
                        field: "houseType",
                        valid: !!profileForm.houseType,
                        message: "House Type is required",
                    },
                    {
                        field: "numberOfRooms",
                        valid: !!profileForm.numberOfRooms,
                        message: "Number Of Rooms is required",
                    },
                    {
                        field: "customerPhoto",
                        valid: !!profileForm.customerPhotoPreview,
                        message: "Customer Photo is required",
                    },
                ],
            },

            {
                name: "Person Disability",
                validations: [
                    {
                        field: "isDisabled",
                        valid: !!profileForm.isDisabled,
                        message:
                            "Please select disability status",
                    },
                    {
                        field: "disabilityType",
                        valid:
                            profileForm.isDisabled !== "Yes" ||
                            !!profileForm.disabilityType,
                        message:
                            "Disability Type is required",
                    },
                ],
            },

            {
                name: "Customer Consent",
                validations: [
                    {
                        field: "customerConsent",
                        valid: profileForm.customerConsent,
                        message:
                            "Customer Consent is required",
                    },
                ],
            },
        ];

        for (const section of sections) {
            for (const item of section.validations) {
                if (!item.valid) {
                    const err = {
                        [item.field]: item.message,
                    };

                    setFieldErrors(err);
                    focusFirstError(err);
                    toast.error(item.message);

                    return false;
                }
            }
        }

        setFieldErrors({});
        return true;
    };
    const handleCustomerSubmit = async () => {
        const loggedInUserForAgent = getLoggedInUser();
        const isFieldExecutive = (loggedInUserForAgent?.role || "").toLowerCase() === "field executive";

        if (!isFieldExecutive && !selectedAgentId) {
            toast.error("Please select a Field Executive before proceeding.");
            setFieldErrors({ agent_unique_id: "Field Executive is required" });
            const el = fieldRefs.current["agent_unique_id"];
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
            return;
        }


        setFieldErrors({});

        if (!profileForm.customerConsent) {
            toast.error("Please provide your consent to share KYC documents before proceeding.");
            setFieldErrors({ customerConsent: "Consent is required" });
            const el = fieldRefs.current["customerConsent"];
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        const isClean = validateCustomerSubmission();

        if (!isClean) {
            return;
        }
        // const isValid = await trigger();

        // if (!isValid) {
        //     const firstErrorKey = Object.keys(errors)[0];
        //     const message = typeof (errors as any)?.[firstErrorKey]?.message === "string"
        //         ? (errors as any)[firstErrorKey].message
        //         : "Please fill all required fields.";
        //     if (firstErrorKey) {
        //         const reactHookFormErrorMap: Record<string, string> = { [firstErrorKey]: message };
        //         focusFirstError(reactHookFormErrorMap);
        //     }
        //     toast.error(message);
        //     return;
        // }

        handleSubmit((data) => {
            setPendingData(data);

            const isClean = validateCustomerSubmission();
            if (!isClean) {
                toast.error("Please fix highlighted fields");
                return;
            }

            setShowConfirm(true);
        })();
    };
    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];

        setProfileForm((prev) => ({
            ...prev,
            enrollmentDate: today,
        }));
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6 relative">
            {/* Page Loader */}
            {loading && (
                <div className="absolute inset-x-6 inset-y-6 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Loading...</p>
                </div>
            )}

            <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                        Back
                    </button>
                </div>

                {/* FORM */}
                <form
                    onSubmit={handleSubmit((data) => {
                        setPendingData(data);
                        setShowConfirm(true);
                    })}
                    className="space-y-4"
                >

                    {/* Agent Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-gray-700 text-sm mb-1 block">
                                Assign Field Executives
                            </label>

                            <select
                                {...agentRest}
                                ref={(el) => {
                                    agentRef(el);
                                    setFieldRef("agent_unique_id", el);
                                }}
                                disabled={getLoggedInUser()?.role === "Field Executive"}
                                className={`${inputClass} ${fieldErrorClass("agent_unique_id")} ${getLoggedInUser()?.role === "Field Executive"
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : ""
                                    }`}
                            >
                                <option value="">Select Field Executives</option>
                                {agents.map((agent) => (
                                    <option
                                        key={agent.id}
                                        value={agent.agent_unique_id}
                                    >
                                        {agent.name} ({agent.agent_unique_id})
                                    </option>
                                ))}
                            </select>

                            {(errors.agent_unique_id || fieldErrors.agent_unique_id) && (
                                <p className="text-red-600 text-xs mt-1">
                                    {errors.agent_unique_id?.message || fieldErrors.agent_unique_id}
                                </p>
                            )}
                        </div>
                    </div>

                    {selectedAgent && (
                        <div className="p-4 border rounded-md bg-gray-50">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Field Executives Details
                            </h3>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="font-medium text-gray-600">Field Executives ID:</span>{" "}
                                    {selectedAgent.agent_unique_id}
                                </div>

                                <div>
                                    <span className="font-medium text-gray-600">Name:</span>{" "}
                                    {selectedAgent.name}
                                </div>

                                <div>
                                    <span className="font-medium text-gray-600">Email:</span>{" "}
                                    {selectedAgent.email}
                                </div>

                                <div>
                                    <span className="font-medium text-gray-600">Phone:</span>{" "}
                                    {selectedAgent.phone_no}
                                </div>

                                <div>
                                    <span className="font-medium text-gray-600">Location:</span>{" "}
                                    {selectedAgent.location}
                                </div>

                                <div>
                                    <span className="font-medium text-gray-600">Status:</span>{" "}
                                    <span className="text-green-600 font-medium">
                                        {selectedAgent.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 bg-white border border-gray-300 rounded-lg p-6 mt-6">

                {/* Sourcing Type */}
                <div>
                    <label className="text-gray-700 text-sm mb-1 block">
                        Sourcing Type
                    </label>
                    <select
                        {...register("sourcing_type")}
                        className={`${inputClass} ${errors.sourcing_type ? "border-red-500" : ""}`}
                    >
                        <option value="">Select</option>
                        <option value="self">Self</option>
                        <option value="referral">Referral</option>
                    </select>

                    {errors.sourcing_type && (
                        <p className="text-red-600 text-xs mt-1">
                            {errors.sourcing_type.message}
                        </p>
                    )}
                </div>

                {/* Referral ID */}
                {watch("sourcing_type") === "referral" && (
                    <div>
                        <label className="text-gray-700 text-sm mb-1 block">
                            Referral ID
                        </label>
                        <input
                            {...register("referral_id")}
                            className={`${inputClass} ${errors.referral_id ? "border-red-500" : ""}`}
                            placeholder="Enter Referral ID"
                        />

                        {errors.referral_id && (
                            <p className="text-red-600 text-xs mt-1">
                                {errors.referral_id.message}
                            </p>
                        )}
                    </div>
                )}
            </div>


            <div className="bg-white border border-gray-300 rounded-lg p-6 mt-6">
                <div className="mb-4">
                    <h2 className="text-xl font-semibold">Customer Profile Details</h2>
                </div>

                <div className="flex flex-col gap-6">
                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Basic Information</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-3">
                            <div className={profileGridClass}>
                                {/* <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Enrollment Number
                                    </label>
                                    <input
                                        value={profileForm.enrollmentNumber}
                                        onChange={(e) =>
                                            updateProfileField("enrollmentNumber", e.target.value)
                                        }
                                        className={inputClass}
                                        placeholder="Enrollment Number"
                                    />
                                </div> */}
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Enrollment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={profileForm.enrollmentDate}
                                        onChange={(e) =>
                                            updateProfileField("enrollmentDate", e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                {/* <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Customer ID
                                    </label>
                                    <input
                                        value={profileForm.customerId}
                                        onChange={(e) =>
                                            updateProfileField("customerId", e.target.value)
                                        }
                                        className={inputClass}
                                        placeholder="Customer ID"
                                    />
                                </div> */}
                            </div>

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.firstName}
                                        onChange={(e) =>
                                            updateProfileField("firstName", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("firstName", el)}
                                        className={`${inputClass} ${fieldErrorClass("firstName")}`}
                                        placeholder="First Name"
                                    />
                                    {fieldErrors.firstName && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Middle Name
                                    </label>
                                    <input
                                        value={profileForm.middleName}
                                        onChange={(e) =>
                                            updateProfileField("middleName", e.target.value)
                                        }
                                        className={inputClass}
                                        placeholder="Middle Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.lastName}
                                        onChange={(e) =>
                                            updateProfileField("lastName", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("lastName", el)}
                                        className={`${inputClass} ${fieldErrorClass("lastName")}`}
                                        placeholder="Last Name"
                                    />
                                    {fieldErrors.lastName && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>
                                    )}
                                </div>
                            </div>

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={profileForm.gender}
                                        onChange={(e) =>
                                            updateProfileField("gender", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("gender", el)}
                                        className={`${inputClass} ${fieldErrorClass("gender")}`}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {fieldErrors.gender && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.gender}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        DOB (As per KYC) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={profileForm.dob}
                                        onChange={(e) =>
                                            updateProfileField("dob", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("dob", el)}
                                        className={`${inputClass} ${fieldErrorClass("dob")}`}
                                    />
                                    {fieldErrors.dob && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.dob}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Age (Auto Calculated)
                                    </label>
                                    <div className="relative">
                                        <input
                                            value={calculatedAge}
                                            readOnly
                                            className={`${inputClass} ${calculatedAge && parseInt(calculatedAge) < 18
                                                ? "bg-red-50 text-red-600 border-red-300 ring-1 ring-red-300"
                                                : "bg-gray-100"
                                                }`}
                                            placeholder="Age"
                                        />
                                        {calculatedAge && parseInt(calculatedAge) < 18 && (
                                            <span className="text-[10px] text-red-500 absolute -bottom-4 left-0">
                                                Minimum 18 years required
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={profileGridClass}>
                                <div className="lg:col-span-2">
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Father Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.fatherName}
                                        onChange={(e) =>
                                            updateProfileField("fatherName", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("fatherName", el)}
                                        className={`${inputClass} ${fieldErrorClass("fatherName")}`}
                                        placeholder="Father Name"
                                    />
                                    {fieldErrors.fatherName && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.fatherName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Service Area PIN <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.serviceAreaPin}
                                        inputMode="numeric"
                                        maxLength={6}
                                        onChange={(e) =>
                                            updateProfileField("serviceAreaPin", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("serviceAreaPin", el)}
                                        className={`${inputClass} ${fieldErrorClass("serviceAreaPin")}`}
                                        placeholder="Service Area PIN"
                                    />
                                    {fieldErrors.serviceAreaPin && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.serviceAreaPin}</p>
                                    )}
                                </div>
                            </div>

                            <div className={profileGridClass}>
                                <div className="lg:col-span-2">
                                    <label className="text-gray-700 text-sm mb-2 block">
                                        Religion <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex min-h-[38px] flex-wrap items-center gap-4 rounded-md bg-gray-50 px-3 py-2">
                                        {religionOptions.map((religion) => (
                                            <label
                                                key={religion}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="religion"
                                                    className={radioClass}
                                                    checked={profileForm.religion === religion}
                                                    onChange={() =>
                                                        updateProfileField("religion", religion)
                                                    }
                                                />
                                                {religion}
                                            </label>
                                        ))}
                                    </div>
                                    {fieldErrors.religion && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.religion}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Caste <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={profileForm.caste}
                                        onChange={(e) =>
                                            updateProfileField("caste", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("caste", el)}
                                        className={`${inputClass} ${fieldErrorClass("caste")}`}
                                    >
                                        <option value="">Select Caste</option>
                                        <option value="General">General</option>
                                        <option value="SC">SC</option>
                                        <option value="ST">ST</option>
                                        <option value="OBC">OBC</option>
                                    </select>
                                    {fieldErrors.caste && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.caste}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${sectionCardClass} order-first`}>
                        <h3 className={sectionHeadingClass}>KYC Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700">
                                    Message KYC Details (Mandatory)
                                </h4>
                                <p className="mt-1 text-xs font-medium text-red-600">
                                    Voter ID is compulsory.
                                </p>
                                <p className="mt-1 text-xs font-medium text-red-600">
                                    At least 3 KYC details are mandatory.
                                </p>
                                {previewErrorMessage && (
                                    <p className="mt-2 text-sm font-semibold text-red-600">
                                        {previewErrorMessage}
                                    </p>
                                )}
                                {fieldErrors.kycSelected && (
                                    <p className="mt-2 text-sm font-semibold text-red-600">
                                        {fieldErrors.kycSelected}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(Object.entries(kycLabels) as [KycOption, string][]).map(
                                    ([option, label]) => (
                                        <label
                                            key={option}
                                            className="flex items-center gap-2 text-sm text-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                ref={
                                                    option === "voterId"
                                                        ? voterIdCheckboxRef
                                                        : undefined
                                                }
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                checked={profileForm.kycSelected[option]}
                                                onChange={() => toggleKycOption(option)}
                                            />
                                            <span>{label}</span>
                                        </label>
                                    )
                                )}
                            </div>

                            {(Object.keys(kycLabels) as KycOption[])
                                .filter((option) => profileForm.kycSelected[option])
                                .map((option) => (
                                    <div
                                        key={option}
                                        className="border border-gray-200 rounded-md p-4 bg-gray-50"
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
                                            <div>
                                                <label className="text-gray-700 text-sm mb-1 block">
                                                    {kycLabels[option]} Number
                                                </label>
                                                <input
                                                    ref={
                                                        option === "voterId"
                                                            ? voterIdNumberRef
                                                            : undefined
                                                    }
                                                    value={profileForm.kycNumbers[option]}
                                                    maxLength={getKycMaxLength(option)}
                                                    onChange={(e) =>
                                                        updateKycField(
                                                            "kycNumbers",
                                                            option,
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`${inputClass} bg-white ${option === "voterId" && fieldErrors["kycNumbers.voterId"]
                                                        ? "border border-red-500 ring-1 ring-red-200 focus:ring-red-500"
                                                        : "border border-gray-300"
                                                        }`}
                                                    placeholder={`${kycLabels[option]} Number`}
                                                />
                                                {option === "voterId" && fieldErrors["kycNumbers.voterId"] && (
                                                    <p className="text-xs text-red-500 mt-1">{fieldErrors["kycNumbers.voterId"]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium block mb-1">
                                                    Upload {kycLabels[option]} Image
                                                </label>
                                                <input
                                                    type="file"
                                                    data-kyc={option}
                                                    className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!validateImageSize(file, `${kycLabels[option]} image`)) {
                                                            toast.error(`${kycLabels[option]} image must be 2MB or smaller.`);
                                                            e.target.value = "";
                                                            updateKycField("kycImages", option, "");
                                                            updateKycField("kycImagePreviews", option, "");
                                                            return;
                                                        }
                                                        updateKycField(
                                                            "kycImages",
                                                            option,
                                                            file?.name || ""
                                                        );
                                                        updateKycField(
                                                            "kycImagePreviews",
                                                            option,
                                                            file &&
                                                                file.type.startsWith("image/")
                                                                ? URL.createObjectURL(file)
                                                                : ""
                                                        );
                                                    }}
                                                />
                                            </div>

                                            {(option === "aadhaar" || option === "voterId") && (
                                                <div className="mt-3">
                                                    <label className="text-sm font-medium block mb-1">
                                                        Upload {kycLabels[option]} Back Image
                                                    </label>
                                                    <input
                                                        type="file"
                                                        data-kyc-back={option}
                                                        className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!validateImageSize(file, `${kycLabels[option]} back image`)) {
                                                                toast.error(`${kycLabels[option]} back image must be 2MB or smaller.`);
                                                                e.target.value = "";
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {option === "otherDocument" && (
                                                <div className="mt-3">
                                                    <label className="text-gray-700 text-sm mb-1 block">
                                                        Document Name
                                                    </label>
                                                    <input
                                                        value={profileForm.kycNumbers.otherName}
                                                        onChange={(e) =>
                                                            setProfileForm((prev) => ({
                                                                ...prev,
                                                                kycNumbers: {
                                                                    ...prev.kycNumbers,
                                                                    otherName: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                        className={`${inputClass} bg-white`}
                                                        placeholder="Enter document name"
                                                    />
                                                </div>
                                            )}
                                            <div />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Address Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-3">
                            <div>
                                <label className="text-gray-700 text-sm mb-1 block">
                                    Permanent Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={profileForm.permanentAddress}
                                    onChange={(e) =>
                                        updateProfileField("permanentAddress", e.target.value)
                                    }
                                    ref={(el) => setFieldRef("permanentAddress", el)}
                                    className={`${inputClass} ${fieldErrorClass("permanentAddress")} min-h-24`}
                                    placeholder="Permanent Address"
                                />
                                {fieldErrors.permanentAddress && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.permanentAddress}</p>
                                )}
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    checked={profileForm.sameAsPermanentAddress}
                                    onChange={toggleSameAddress}
                                />
                                Correspondence address same as permanent
                            </label>

                            <div>
                                <label className="text-gray-700 text-sm mb-1 block">
                                    Correspondence Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={profileForm.correspondenceAddress}
                                    onChange={(e) =>
                                        updateProfileField(
                                            "correspondenceAddress",
                                            e.target.value
                                        )
                                    }
                                    disabled={profileForm.sameAsPermanentAddress}
                                    ref={(el) => setFieldRef("correspondenceAddress", el)}
                                    className={`${inputClass} ${fieldErrorClass("correspondenceAddress")} min-h-24 ${profileForm.sameAsPermanentAddress
                                        ? "bg-gray-100"
                                        : ""
                                        }`}
                                    placeholder="Correspondence Address"
                                />
                                {fieldErrors.correspondenceAddress && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.correspondenceAddress}</p>
                                )}
                            </div>

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Contact Number 1 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.contactNumber1}
                                        inputMode="numeric"
                                        maxLength={12}
                                        onChange={(e) =>
                                            updateProfileField("contactNumber1", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("contactNumber1", el)}
                                        className={`${inputClass} ${fieldErrorClass("contactNumber1")}`}
                                        placeholder="Contact Number 1"
                                    />
                                    {fieldErrors.contactNumber1 && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.contactNumber1}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Contact Number 2
                                    </label>
                                    <input
                                        value={profileForm.contactNumber2}
                                        inputMode="numeric"
                                        maxLength={12}
                                        onChange={(e) =>
                                            updateProfileField("contactNumber2", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("contactNumber2", el)}
                                        className={`${inputClass} ${fieldErrorClass("contactNumber2")}`}
                                        placeholder="Contact Number 2"
                                    />
                                    {fieldErrors.contactNumber2 && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.contactNumber2}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Email ID <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={profileForm.emailId}
                                            onChange={(e) => {
                                                updateProfileField("emailId", e.target.value);
                                                setOtpSent(false);
                                                setOtpVerified(false);
                                            }}
                                            disabled={otpVerified}
                                            className={`${inputClass} ${otpVerified ? "bg-green-50 border-green-200" : ""}`}
                                            placeholder="Email ID"
                                        />
                                        {fieldErrors.emailId && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.emailId}</p>
                                        )}
                                        {/* {!otpVerified && (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={otpLoading || !profileForm.emailId}
                                                className="whitespace-nowrap px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                            >
                                                {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Verify Email"}
                                            </button>
                                        )} */}
                                        {/* {otpVerified && (
                                            <span className="flex items-center text-green-600 text-sm font-medium">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Verified
                                            </span>
                                        )} */}
                                    </div>
                                    {/* {otpSent && !otpVerified && (
                                        <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={otpValue}
                                                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                                                className={`${inputClass} w-32`}
                                                placeholder="Enter OTP"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={otpLoading || otpValue.length !== 6}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:bg-green-300 transition-colors"
                                            >
                                                {otpLoading ? "Verifying..." : "Confirm"}
                                            </button>
                                        </div>
                                    )} */}
                                </div>

                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            {...register("password")}
                                            ref={(el) => {
                                                register("password").ref(el);
                                                setFieldRef("password", el as any);
                                            }}
                                            className={`${inputClass} ${errors.password ? "border border-red-500 ring-1 ring-red-200 focus:ring-red-500" : "border border-gray-300"}`}
                                            placeholder="Enter Password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-2 text-xs text-blue-600"
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {errors.password && (
                                        <p className="text-red-600 text-xs mt-1">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            {...register("confirmPassword")}
                                            ref={(el) => {
                                                register("confirmPassword").ref(el);
                                                setFieldRef("confirmPassword", el as any);
                                            }}
                                            className={`${inputClass} ${errors.confirmPassword ? "border border-red-500 ring-1 ring-red-200 focus:ring-red-500" : "border border-gray-300"}`}
                                            placeholder="Confirm Password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2 top-2 text-xs text-blue-600"
                                        >
                                            {showConfirmPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {errors.confirmPassword && (
                                        <p className="text-red-600 text-xs mt-1">
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Nominee Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Nominee Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.nomineeName}
                                        onChange={(e) =>
                                            updateProfileField("nomineeName", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("nomineeName", el)}
                                        className={`${inputClass} ${fieldErrorClass("nomineeName")}`}
                                        placeholder="Nominee Name"
                                    />
                                    {fieldErrors.nomineeName && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.nomineeName}</p>
                                    )}
                                </div>
                            </div>

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-2 block">
                                        Relationship <span className="text-red-500">*</span>
                                    </label>
                                    <div
                                        className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3"
                                        ref={(el) => setFieldRef("occupation", el)}
                                        tabIndex={-1}
                                    >
                                        {["Spouse", "Father", "Other"].map((relationship) => (
                                            <label
                                                key={relationship}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="nomineeRelationship"
                                                    className={radioClass}
                                                    checked={
                                                        profileForm.nomineeRelationship ===
                                                        relationship
                                                    }
                                                    onChange={() =>
                                                        updateProfileField(
                                                            "nomineeRelationship",
                                                            relationship
                                                        )
                                                    }
                                                />
                                                {relationship}
                                            </label>
                                        ))}
                                    </div>
                                    {fieldErrors.nomineeRelationship && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.nomineeRelationship}</p>
                                    )}
                                </div>
                                {profileForm.nomineeRelationship === "Other" && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Please Specify <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={profileForm.nomineeRelationshipOther}
                                            onChange={(e) =>
                                                updateProfileField(
                                                    "nomineeRelationshipOther",
                                                    e.target.value
                                                )
                                            }
                                            ref={(el) => setFieldRef("nomineeRelationshipOther", el)}
                                            className={`${inputClass} ${fieldErrorClass("nomineeRelationshipOther")}`}
                                            placeholder="Please Specify"
                                        />
                                        {fieldErrors.nomineeRelationshipOther && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.nomineeRelationshipOther}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-gray-700 text-sm mb-1 block">
                                    Nominee Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={profileForm.nomineeAddress}
                                    onChange={(e) =>
                                        updateProfileField("nomineeAddress", e.target.value)
                                    }
                                    ref={(el) => setFieldRef("nomineeAddress", el)}
                                    className={`${inputClass} ${fieldErrorClass("nomineeAddress")} min-h-24`}
                                    placeholder="Nominee Address"
                                />
                                {fieldErrors.nomineeAddress && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.nomineeAddress}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Occupation Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className={profileGridClass}>
                                <div className="lg:col-span-2">
                                    <label className="text-gray-700 text-sm mb-2 block">
                                        Occupation <span className="text-red-500">*</span>
                                    </label>
                                    <div
                                        className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3"
                                        ref={(el) => setFieldRef("spouseOccupation", el)}
                                        tabIndex={-1}
                                    >
                                        {["Salaried", "Self Employed", "Housewife"].map((occupation) => (
                                            <label
                                                key={occupation}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="occupation"
                                                    className={radioClass}
                                                    checked={profileForm.occupation === occupation}
                                                    onChange={() =>
                                                        updateProfileField("occupation", occupation)
                                                    }
                                                />
                                                {occupation}
                                            </label>
                                        ))}
                                    </div>
                                    {fieldErrors.occupation && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.occupation}</p>
                                    )}
                                </div>
                                {profileForm.occupation === "Salaried" && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Employee Type <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3">
                                            {["Private Employee", "Government Employee"].map((type) => (
                                                <label
                                                    key={type}
                                                    className="flex items-center gap-2 text-sm text-gray-700"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="salariedType"
                                                        className={radioClass}
                                                        checked={profileForm.salariedType === type}
                                                        onChange={() =>
                                                            updateProfileField("salariedType", type)
                                                        }
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                        {fieldErrors.salariedType && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.salariedType}</p>
                                        )}
                                    </div>
                                )}
                                {profileForm.occupation === "Self Employed" && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Nature of Business
                                        </label>
                                        <input
                                            value={profileForm.businessNature}
                                            onChange={(e) =>
                                                updateProfileField("businessNature", e.target.value)
                                            }
                                            ref={(el) => setFieldRef("businessNature", el)}
                                            className={`${inputClass} ${fieldErrorClass("businessNature")}`}
                                            placeholder="Nature of Business"
                                        />
                                        {fieldErrors.businessNature && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.businessNature}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>
                            Occupation Details (Spouse / Nominee)
                        </h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className={profileGridClass}>
                                <div className="lg:col-span-2">
                                    <label className="text-gray-700 text-sm mb-2 block">
                                        Spouse / Nominee Occupation
                                    </label>
                                    <div className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3">
                                        {["Salaried", "Self Employed", "Housewife"].map((occupation) => (
                                            <label
                                                key={occupation}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="spouseOccupation"
                                                    className={radioClass}
                                                    checked={profileForm.spouseOccupation === occupation}
                                                    onChange={() =>
                                                        updateProfileField("spouseOccupation", occupation)
                                                    }
                                                />
                                                {occupation}
                                            </label>
                                        ))}
                                    </div>
                                    {fieldErrors.spouseOccupation && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.spouseOccupation}</p>
                                    )}
                                </div>
                                {profileForm.spouseOccupation === "Salaried" && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Employee Type
                                        </label>
                                        <div className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3">
                                            {["Private Employee", "Government Employee"].map((type) => (
                                                <label
                                                    key={type}
                                                    className="flex items-center gap-2 text-sm text-gray-700"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="spouseSalariedType"
                                                        className={radioClass}
                                                        checked={profileForm.spouseSalariedType === type}
                                                        onChange={() =>
                                                            updateProfileField("spouseSalariedType", type)
                                                        }
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                        {fieldErrors.spouseSalariedType && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.spouseSalariedType}</p>
                                        )}
                                    </div>
                                )}
                                {profileForm.spouseOccupation === "Self Employed" && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Nature of Business
                                        </label>
                                        <input
                                            value={profileForm.spouseBusinessNature}
                                            onChange={(e) =>
                                                updateProfileField(
                                                    "spouseBusinessNature",
                                                    e.target.value
                                                )
                                            }
                                            ref={(el) => setFieldRef("spouseBusinessNature", el)}
                                            className={`${inputClass} ${fieldErrorClass("spouseBusinessNature")}`}
                                            placeholder="Nature of Business"
                                        />
                                        {fieldErrors.spouseBusinessNature && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.spouseBusinessNature}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>House / Residence Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className={profileGridClass}>
                                <div className="lg:col-span-2">
                                    <label className="text-gray-700 text-sm mb-2 block">
                                        Residence Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex h-[38px] items-center gap-4 rounded-md bg-gray-50 px-3">
                                        {["Own", "Rented"].map((type) => (
                                            <label
                                                key={type}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="residenceType"
                                                    className={radioClass}
                                                    checked={profileForm.residenceType === type}
                                                    onChange={() =>
                                                        updateProfileField("residenceType", type)
                                                    }
                                                />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                    {fieldErrors.residenceType && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.residenceType}</p>
                                    )}
                                </div>
                                {(profileForm.residenceType === "Rented" || profileForm.residenceType === "Own") && (
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Years of Staying <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={profileForm.yearsOfStaying}
                                            onChange={(e) =>
                                                updateProfileField("yearsOfStaying", e.target.value)
                                            }
                                            ref={(el) => setFieldRef("yearsOfStaying", el)}
                                            className={`${inputClass} ${fieldErrorClass("yearsOfStaying")}`}
                                            placeholder="Years of Staying"
                                        />
                                        {fieldErrors.yearsOfStaying && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.yearsOfStaying}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>House Type <span className="text-red-500">*</span></h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-6">
                                {["RCC Roof", "Sheet Roof"].map((type) => (
                                    <label
                                        key={type}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="radio"
                                            name="houseType"
                                            className={radioClass}
                                            checked={profileForm.houseType === type}
                                            onChange={() =>
                                                updateProfileField("houseType", type)
                                            }
                                        />
                                        {type}
                                    </label>
                                ))}
                            </div>

                            {fieldErrors.houseType && (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.houseType}</p>
                            )}

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Number of Rooms <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={profileForm.numberOfRooms}
                                        onChange={(e) =>
                                            updateProfileField("numberOfRooms", e.target.value)
                                        }
                                        ref={(el) => setFieldRef("numberOfRooms", el)}
                                        className={`${inputClass} ${fieldErrorClass("numberOfRooms")}`}
                                        placeholder="Number of Rooms"
                                    />
                                    {fieldErrors.numberOfRooms && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.numberOfRooms}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Asset Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(Object.entries(assetLabels) as [AssetOption, string][]).map(
                                ([asset, label]) => (
                                    <label
                                        key={asset}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                            checked={profileForm.assets[asset]}
                                            onChange={() => toggleAsset(asset)}
                                        />
                                        {label}
                                    </label>
                                )
                            )}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Person Disability</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-6">
                                {["Yes", "No"].map((option) => (
                                    <label
                                        key={option}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="radio"
                                            name="isDisabled"
                                            className={radioClass}
                                            checked={profileForm.isDisabled === option}
                                            onChange={() => {
                                                updateProfileField("isDisabled", option);
                                                if (option === "No") {
                                                    updateProfileField("disabilityType", "");
                                                }
                                            }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>

                            {profileForm.isDisabled === "Yes" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-700 text-sm mb-1 block">
                                            Select Disability Type
                                        </label>
                                        <select
                                            value={profileForm.disabilityType}
                                            onChange={(e) =>
                                                updateProfileField("disabilityType", e.target.value)
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">Select Disability Type</option>
                                            <option value="Handicapped (Blindness)">
                                                Handicapped (Blindness)
                                            </option>
                                            <option value="Handicapped (Leg disability)">
                                                Handicapped (Leg disability)
                                            </option>
                                            <option value="Handicapped (Hand disability)">
                                                Handicapped (Hand disability)
                                            </option>
                                            <option value="Handicapped (Voice disability)">
                                                Handicapped (Voice disability)
                                            </option>
                                            <option value="Abnormal (Unconscious)">
                                                Abnormal (Unconscious)
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Customer Consent</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <input
                                    type="checkbox"
                                    id="customerConsent"
                                    checked={profileForm.customerConsent}
                                    onChange={(e) => updateProfileField("customerConsent", e.target.checked)}
                                    ref={(el) => setFieldRef("customerConsent", el)}
                                    className="h-5 w-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                />
                                <label
                                    htmlFor="customerConsent"
                                    className="text-sm text-gray-700 leading-relaxed cursor-pointer select-none"
                                >
                                    I am sharing my KYCs document to the service provider <strong>"Anavran livelihood services Pvt Ltd"</strong> with my own consent.<span className="text-red-500">*</span>
                                </label>
                            </div>
                            {fieldErrors.customerConsent && (
                                <p className="text-xs text-red-500 font-medium">{fieldErrors.customerConsent}</p>
                            )}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Customer Photo <span className="text-red-500">*</span></h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1">
                                    Take Photo From Camera
                                </label>
                                <button
                                    type="button"
                                    onClick={openCameraModal}
                                    disabled={cameraLoading}
                                    className={`w-full px-4 py-2 rounded-md text-sm text-white ${cameraLoading
                                        ? "bg-blue-400"
                                        : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                >
                                    {cameraLoading ? "Opening Camera..." : "Open Camera"}
                                </button>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">
                                    Upload Attachment
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    data-type="customer-photo"
                                    className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                    onChange={handleCustomerPhotoChange}
                                />
                            </div>
                        </div>

                        {fieldErrors.customerPhotoName && (
                            <p className="text-xs text-red-500 mt-1">{fieldErrors.customerPhotoName}</p>
                        )}

                        {(profileForm.customerPhotoName || profileForm.customerPhotoPreview) && (
                            <div className="mt-4 rounded-md bg-gray-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-gray-600">
                                        Selected Photo
                                    </p>
                                    <button
                                        type="button"
                                        onClick={clearCustomerPhoto}
                                        className="px-3 py-1 rounded-md text-xs text-white bg-red-600 hover:bg-red-700"
                                    >
                                        Remove Photo
                                    </button>
                                </div>
                                <p className="mt-1 text-sm text-gray-800 break-words">
                                    {profileForm.customerPhotoName || "-"}
                                </p>
                                {profileForm.customerPhotoPreview && (
                                    <img
                                        src={profileForm.customerPhotoPreview}
                                        alt="Customer photo preview"
                                        className="mt-3 h-32 w-32 rounded-md object-cover border border-gray-200"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        className={
                            showCustomerProfileSections
                                ? "flex flex-wrap justify-end gap-3"
                                : "hidden"
                        }
                    >
                        {/* <button
                            type="button"
                            className="px-4 py-1.5 rounded-md text-sm text-white bg-emerald-600 hover:bg-emerald-700"
                        >
                            Save
                        </button> */}
                        <button
                            type="button"
                            onClick={handlePreview}
                            className="px-4 py-1.5 rounded-md text-sm text-white bg-amber-500 hover:bg-amber-600"
                        >
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={handleCustomerSubmit}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm text-white ${loading
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </div>
            </div>
            {/* CONFIRMATION MODAL */}
            {showConfirm && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
                        <h3 className="text-lg font-semibold mb-2">
                            Confirm Customer Creation
                        </h3>

                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to create this customer?
                            Please verify all details before proceeding.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                disabled={loading}
                                onClick={() => {
                                    setShowConfirm(false);
                                    setPendingData(null);
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm
    ${loading
                                        ? "bg-gray-200 cursor-not-allowed"
                                        : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                            >
                                Cancel
                            </button>


                            <button
                                disabled={loading}
                                onClick={() => {
                                    if (pendingData && !loading) {
                                        onSubmit(pendingData);
                                    }
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm text-white
    ${loading
                                        ? "bg-blue-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                {loading ? "Creating..." : "Yes, Create"}
                            </button>

                        </div>
                    </div>
                </div>
            )}
            {showProfilePreview && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg w-full max-w-5xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Customer Profile Preview</h3>
                            <button
                                type="button"
                                onClick={() => setShowProfilePreview(false)}
                                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-green-700">
                                    Customer Full Name
                                </h4>
                                <p className="mt-2 text-sm text-gray-800">
                                    {customerFullName || "-"}
                                </p>
                            </div>

                            {previewSections.map((section) => (
                                <div
                                    key={section.title}
                                    className="border border-gray-200 rounded-lg p-4"
                                >
                                    <h4 className="text-md font-semibold text-green-700">
                                        {section.title}
                                    </h4>
                                    <hr className="my-2 border-gray-300" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        {section.items.map(([label, value]) => (
                                            <div
                                                key={`${section.title}-${label}`}
                                                className="rounded-md bg-gray-50 p-3"
                                            >
                                                <p className="font-medium text-gray-600">{label}</p>
                                                <p className="mt-1 text-gray-800 break-words">
                                                    {value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    {fieldErrors.spouseOccupation && (
                                        <p className="text-xs text-red-500 mt-1">{fieldErrors.spouseOccupation}</p>
                                    )}
                                </div>
                            ))}

                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-green-700">
                                    KYC Details
                                </h4>
                                <hr className="my-2 border-gray-300" />
                                <div className="space-y-3">
                                    {selectedKycPreview.length > 0 ? (
                                        selectedKycPreview.map((item) => {
                                            const option = (Object.keys(kycLabels) as KycOption[]).find(
                                                (key) => kycLabels[key] === item.label
                                            );

                                            return (
                                                <div
                                                    key={item.label}
                                                    className="rounded-md bg-gray-50 p-4"
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-600">
                                                                KYC Type
                                                            </p>
                                                            <p className="mt-1 text-gray-800">
                                                                {item.label}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-600">
                                                                Number
                                                            </p>
                                                            <p className="mt-1 text-gray-800">
                                                                {item.value}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-600">
                                                                Image
                                                            </p>
                                                            <p className="mt-1 text-gray-800 break-words">
                                                                {(option && profileForm.kycImages[option]) ||
                                                                    "No image selected"}
                                                            </p>
                                                            {option &&
                                                                profileForm.kycImagePreviews[option] && (
                                                                    <img
                                                                        src={
                                                                            profileForm.kycImagePreviews[
                                                                            option
                                                                            ]
                                                                        }
                                                                        alt={`${item.label} preview`}
                                                                        className="mt-2 h-24 w-full max-w-[180px] rounded-md object-cover border border-gray-200"
                                                                    />
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                                            No KYC selected
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-green-700">
                                    Customer Photo
                                </h4>
                                <hr className="my-2 border-gray-300" />
                                <div className="rounded-md bg-gray-50 p-4">
                                    <p className="font-medium text-gray-600">Photo Name</p>
                                    <p className="mt-1 text-gray-800 break-words">
                                        {profileForm.customerPhotoName || "No photo selected"}
                                    </p>
                                    {profileForm.customerPhotoPreview && (
                                        <img
                                            src={profileForm.customerPhotoPreview}
                                            alt="Customer preview"
                                            className="mt-3 h-36 w-36 rounded-md object-cover border border-gray-200"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowProfilePreview(false)}
                                className="px-4 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowProfilePreview(false)}
                                className="px-4 py-1.5 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCameraModal && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Capture Customer Photo</h3>
                            <button
                                type="button"
                                onClick={closeCameraModal}
                                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-[360px] object-cover"
                            />
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={closeCameraModal}
                                className="px-4 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={captureCustomerPhoto}
                                className="px-4 py-1.5 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Capture Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
