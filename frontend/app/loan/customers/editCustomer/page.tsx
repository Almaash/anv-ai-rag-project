"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
// import axiosInstance from "@/app/api/axiosInstance";
// import ProjectApi from "@/app/api/ProjectApi/s";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import axios from "axios";
import BASE_URL from "@/app/api/BaseUrl";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Suspense } from "react";
import Image from "next/image";

// -------------------------------------------------
// FORM TYPE
// -------------------------------------------------
type FormValues = {
    password?: string;
    confirmPassword?: string;

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
        toast.error(`${label} must be 2MB or smaller.`);
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
            .nullable()
            .optional(),

        confirmPassword: yup
            .string()
            .oneOf([yup.ref("password")], "Passwords must match")
            .nullable()
            .optional(),

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
                "File size must be less than 6MB",
                (value) =>
                    !value || !value[0] || value[0].size <= 6 * 1024 * 1024
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

export default function EditUserPage() {
    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <EditCustomerForm />
        </Suspense>
    );
}

function EditCustomerForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
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
    const [customer, setCustomer] = useState<any>({});
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
            aadhaarBack: "",
            panCard: "",
            voterId: "",
            voterIdBack: "",
            drivingLicense: "",
            rationCard: "",
            otherDocument: "",
        },
        kycImagePreviews: {
            aadhaar: "",
            aadhaarBack: "",
            panCard: "",
            voterId: "",
            voterIdBack: "",
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
        isDisabled: "",
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

                const isCmsAdmin =
                    user.role === "CMS Admin" ||
                    user.role === "cms_admin";

                const res = await axiosInstance.get(
                    ProjectApiList.api_getAllAgents,
                    {
                        params: {
                            branch_id: user.branch,
                            cms_admin_id: isCmsAdmin
                                ? user.user_id
                                : user.cms_admin,

                            ...(isCmsAdmin
                                ? {}
                                : { user_id: user.user_id }),
                        },
                    }
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

        const fetchCustomerData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const res = await axiosInstance.get(`${ProjectApiList.api_getLonaCustomerById}/${id}`);
                if (res.data.success) {
                    const customerData = res.data.data;
                    setCustomer(customerData);

                    // Set Profile Form
                    setProfileForm({
                        enrollmentDate: customerData.enrollment_date ? customerData.enrollment_date.split("T")[0] : "",
                        firstName: customerData.first_name || "",
                        middleName: customerData.middle_name || "",
                        lastName: customerData.last_name || "",
                        gender: customerData.gender || "",
                        dob: customerData.date_of_birth || "",
                        fatherName: customerData.father_name || "",
                        serviceAreaPin: customerData.service_area_pin || "",
                        religion: customerData.religion || "",
                        caste: customerData.caste || "",
                        kycSelected: {
                            aadhaar: !!customerData.adhaar_number,
                            panCard: !!customerData.pan_number,
                            voterId: !!customerData.voter_id_number,
                            drivingLicense: !!customerData.driving_license_number,
                            rationCard: !!customerData.ration_card_number,
                            otherDocument: !!customerData.other_document,
                        },
                        kycImages: {
                            aadhaar: customerData.adhaar_image || "",
                            aadhaarBack: customerData.adhaar_image_back || "",
                            panCard: customerData.pan_image || "",
                            voterId: customerData.voter_id_image || "",
                            voterIdBack: customerData.voter_id_image_back || "",
                            drivingLicense: customerData.driving_license_image || "",
                            rationCard: customerData.ration_card_image || "",
                            otherDocument: customerData.other_document || "",
                        },
                        kycImagePreviews: {
                            aadhaar: customerData.adhaar_image ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.adhaar_image}` : "",
                            aadhaarBack: customerData.adhaar_image_back ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.adhaar_image_back}` : "",
                            panCard: customerData.pan_image ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.pan_image}` : "",
                            voterId: customerData.voter_id_image ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.voter_id_image}` : "",
                            voterIdBack: customerData.voter_id_image_back ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.voter_id_image_back}` : "",
                            drivingLicense: customerData.driving_license_image ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.driving_license_image}` : "",
                            rationCard: customerData.ration_card_image ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.ration_card_image}` : "",
                            otherDocument: customerData.other_document ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.other_document}` : "",
                        },
                        kycNumbers: {
                            aadhaar: customerData.adhaar_number || "",
                            panCard: customerData.pan_number || "",
                            voterId: customerData.voter_id_number || "",
                            drivingLicense: customerData.driving_license_number || "",
                            rationCard: customerData.ration_card_number || "",
                            otherDocument: "",
                            otherName: customerData.other_name || "",
                        },
                        permanentAddress: customerData.permanent_address || "",
                        correspondenceAddress: customerData.correspondence_address || "",
                        sameAsPermanentAddress: customerData.permanent_address === customerData.correspondence_address,
                        contactNumber1: customerData.contact_number_1 || "",
                        contactNumber2: customerData.contact_number_2 || "",
                        emailId: customerData.email || "",
                        nomineeName: customerData.nominee_name || "",
                        nomineeRelationship: customerData.nominee_relationship || "",
                        nomineeRelationshipOther: customerData.nominee_relationship_other || "",
                        nomineeAddress: customerData.nominee_address || "",
                        occupation: customerData.occupation || "",
                        salariedType: customerData.salaried_type || "",
                        businessNature: customerData.business_nature || "",
                        spouseOccupation: customerData.spouse_occupation || "",
                        spouseSalariedType: customerData.spouse_salaried_type || "",
                        spouseBusinessNature: customerData.spouse_business_nature || "",
                        residenceType: customerData.residence_type || "",
                        yearsOfStaying: customerData.years_of_staying || "",
                        houseType: customerData.house_type || "",
                        numberOfRooms: customerData.number_of_rooms || "",
                        assets: customerData.assets ? JSON.parse(customerData.assets) : {
                            twoWheeler: false, tv: false, fridge: false, washingMachine: false, cooler: false, lpg: false,
                        },
                        customerPhotoName: customerData.customer_photo || "",
                        customerPhotoPreview: customerData.customer_photo ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${customerData.customer_photo}` : "",
                        isDisabled:
                            customerData.is_disabled !== null &&
                                customerData.is_disabled !== undefined
                                ? customerData.is_disabled
                                    ? "Yes"
                                    : "No"
                                : "",

                        disabilityType: customerData.disability_type ?? "",
                        customerConsent: true,
                    });

                    // Set Form Values
                    setValue("agent_unique_id", customerData.agent_unique_id);
                    setValue("sourcing_type", customerData.sourcing_type || "self");
                    setValue("referral_id", customerData.referral_id || "");

                }
            } catch (error) {
                console.error("Failed to fetch customer data", error);
                toast.error("Failed to load customer details");
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
        fetchCustomerData();
    }, [id, setValue]);



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

            cms_admin_id:
                role === "cms_admin" ||
                    role === "cms admin"
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
        const toastId = toast.loading("Updating customer...");

        try {
            setLoading(true);

            const payload: any = {
                ...buildCustomerSubmissionPayload(),
                password: data.password || null,
                sourcing_type: data.sourcing_type,
                referral_id: data.referral_id || null,
            };
            // console.log("Customer update payload:", payload);

            const formData = new FormData();

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
                        // Use consistent keys for primary images
                        if (option === "otherDocument") {
                            formData.append("kycImages[otherDocument]", fileInput.files[0]);
                        } else {
                            formData.append(`${option}Image`, fileInput.files[0]);
                        }
                    }

                    // Append Back Images for Aadhaar and Voter ID
                    if (option === "aadhaar" || option === "voterId") {
                        const backFileInput = document.querySelector(`input[type="file"][data-kyc-back="${option}"]`) as HTMLInputElement;
                        if (backFileInput?.files?.[0]) {
                            const backKey = option === "aadhaar" ? "adhaarImageBack" : "voterIdImageBack";
                            formData.append(`kycImages[${backKey}]`, backFileInput.files[0]);
                        }
                    }
                }
            });

            // Append Customer Photo
            if (profileForm.customerPhotoPreview && profileForm.customerPhotoPreview.startsWith("data:image")) {
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
                `${ProjectApiList.api_updateLoanCustomer}/${id}`,
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

                // OLD: always redirected to the customer list page regardless of where the user came from.
                // router.push("/loan/customers");

                // NEW: go back one step so branch managers and other roles return to the
                // customer detail page (or wherever they navigated from) instead of the list.
                router.back();

            } else {

                toast.error("Failed to update customer", { id: toastId });

            }

        } catch (error: any) {

            const response = error?.response?.data;

            // console.log("Error response from error:", error);
            // console.log("Error response from server:", response);

            if (response?.errors) {

                const backendFieldErrors: Record<string, string> = {};

                Object.entries(response.errors).forEach(([key, val]) => {

                    const message = Array.isArray(val)
                        ? val[0]
                        : String(val);

                    // ✅ SHOW TOAST FOR EACH ERROR
                    toast.error(message, { id: toastId });

                    if (key === "password") {
                        setError("password", {
                            type: "server",
                            message,
                        });
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

                        case "aadhaarImage":
                            backendFieldErrors.aadhaarImage = message;
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
        option: KycOption | "aadhaarBack" | "voterIdBack" | "otherName",
        value: string
    ) => {
        const nextValue =
            type === "kycNumbers" && (Object.keys(kycLabels) as KycOption[]).includes(option as KycOption) ? sanitizeKycNumber(option as KycOption, value) : value;

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
            label: kycLabels[option],
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
        const newErrors: Record<string, string> = {};

        if (!selectedAgentId) {
            newErrors.agent_unique_id = "Please select an agent before submitting.";
        }

        if (!profileForm.kycSelected.voterId) {
            newErrors.kycSelected = "Voter ID is required.";
        }

        if (!profileForm.kycNumbers.voterId.trim()) {
            newErrors["kycNumbers.voterId"] = "Please enter the Voter ID number.";
        }

        if (selectedKycCount < 3) {
            newErrors.kycSelected = "Please select at least 3 KYC details.";
        }

        for (const option of Object.keys(kycLabels) as KycOption[]) {
            if (!profileForm.kycSelected[option]) continue;

            const validationMessage = getKycValidationMessage(
                option,
                profileForm.kycNumbers[option]
            );

            if (validationMessage) {
                if (option === "voterId") {
                    newErrors["kycNumbers.voterId"] = validationMessage;
                } else {
                    newErrors[`kycNumbers.${option}`] = validationMessage;
                }
            }
        }

        const requiredChecks: Array<[string, string]> = [
            ["firstName", profileForm.firstName],
            ["lastName", profileForm.lastName],
            ["gender", profileForm.gender],
            ["dob", profileForm.dob],
            ["fatherName", profileForm.fatherName],
            ["serviceAreaPin", profileForm.serviceAreaPin],
            ["religion", profileForm.religion],
            ["caste", profileForm.caste],
            ["permanentAddress", profileForm.permanentAddress],
            ["correspondenceAddress", profileForm.correspondenceAddress],
            ["contactNumber1", profileForm.contactNumber1],
            ["emailId", profileForm.emailId],
            ["nomineeName", profileForm.nomineeName],
            ["nomineeRelationship", profileForm.nomineeRelationship],
            ["nomineeAddress", profileForm.nomineeAddress],
            ["occupation", profileForm.occupation],
            ["spouseOccupation", profileForm.spouseOccupation],
            ["residenceType", profileForm.residenceType],
            ["houseType", profileForm.houseType],
            ["numberOfRooms", profileForm.numberOfRooms],
        ];

        requiredChecks.forEach(([key, value]) => {
            if (!String(value || "").trim()) {
                newErrors[key] = "This field is required";
            }
        });

        if (!profileForm.customerConsent) {
            newErrors.customerConsent = "Your consent is required to proceed.";
            toast.error("Please provide your consent to share KYC documents before submitting.");
        }

        if (
            profileForm.nomineeRelationship === "Other" &&
            !profileForm.nomineeRelationshipOther.trim()
        ) {
            newErrors.nomineeRelationshipOther = "This field is required";
        }

        if (
            profileForm.occupation === "Salaried" &&
            !profileForm.salariedType.trim()
        ) {
            newErrors.salariedType = "This field is required";
        }

        if (
            profileForm.occupation === "Self Employed" &&
            !profileForm.businessNature.trim()
        ) {
            newErrors.businessNature = "This field is required";
        }

        if (
            profileForm.spouseOccupation === "Salaried" &&
            !profileForm.spouseSalariedType.trim()
        ) {
            newErrors.spouseSalariedType = "This field is required";
        }

        if (
            profileForm.spouseOccupation === "Self Employed" &&
            !profileForm.spouseBusinessNature.trim()
        ) {
            newErrors.spouseBusinessNature = "This field is required";
        }

        if (
            (profileForm.residenceType === "Rented" || profileForm.residenceType === "Own") &&
            !profileForm.yearsOfStaying.trim()
        ) {
            newErrors.yearsOfStaying = "This field is required";
        }

        if (!/^\d{6}$/.test(profileForm.serviceAreaPin.trim())) {
            newErrors.serviceAreaPin = "Service Area PIN must contain exactly 6 digits.";
        }

        if (!/^\d{10,12}$/.test(profileForm.contactNumber1.trim())) {
            newErrors.contactNumber1 = "Enter valid number";
        }

        if (
            profileForm.contactNumber2.trim() &&
            !/^\d{10,12}$/.test(profileForm.contactNumber2.trim())
        ) {
            newErrors.contactNumber2 = "Enter valid number";
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (profileForm.emailId && !emailPattern.test(profileForm.emailId.trim())) {
            newErrors.emailId = "Enter a valid email";
        }

        const age = parseInt(calculatedAge);
        if (isNaN(age) || age < 18) {
            newErrors.dob = "Customer must be at least 18 years old";
        }

        if (!profileForm.customerPhotoName.trim()) {
            newErrors.customerPhotoName = "Customer photo is required";
        }

        if (!otpVerified) {
            return "Please verify your email via OTP before submitting.";
        }

        return true;
    };

    const handleCustomerSubmit = async () => {
        if (!profileForm.customerConsent) {
            toast.error("Please provide your consent to share KYC documents before proceeding.");
            setFieldErrors({ customerConsent: "Consent is required" });
            const el = fieldRefs.current["customerConsent"];
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setFieldErrors({});

        const isValid = await trigger();

        if (!isValid) {
            const firstErrorKey = Object.keys(errors)[0];
            const message = typeof (errors as any)?.[firstErrorKey]?.message === "string"
                ? (errors as any)[firstErrorKey].message
                : "Please fill all required fields.";
            if (firstErrorKey) {
                const reactHookFormErrorMap: Record<string, string> = { [firstErrorKey]: message };
                focusFirstError(reactHookFormErrorMap);
            }
            toast.error(message);
            return;
        }

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
                                disabled
                                // disabled={getLoggedInUser()?.role === "Field Executive"}
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
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Enrollment Number
                                    </label>
                                    <input
                                        disabled
                                        value={customer.enrollment_number || ""}
                                        className={inputClass}
                                        placeholder="Enrollment Number"
                                    />
                                </div>
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
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Customer ID
                                    </label>
                                    <input
                                        disabled
                                        value={customer.customer_unique_id || ""}
                                        className={inputClass}
                                        placeholder="Customer ID"
                                    />
                                </div>
                            </div>

                            <div className={profileGridClass}>
                                <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        First Name
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
                                        Last Name
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
                                        Gender
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
                                        DOB (As per KYC)
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
                                        Father Name
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
                                        Service Area PIN
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
                                        Religion
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
                                        Caste
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                                            {/* Document Name (Only for Other Document) */}
                                            {option === "otherDocument" ? (
                                                <div className="lg:col-span-1">
                                                    <label className="text-gray-700 text-sm mb-1 block">
                                                        Document Type Name
                                                    </label>
                                                    <input
                                                        value={profileForm.kycNumbers.otherName}
                                                        onChange={(e) =>
                                                            updateKycField("kycNumbers", "otherName", e.target.value)
                                                        }
                                                        className={`${inputClass} bg-white border border-gray-300`}
                                                        placeholder="Enter Document Name"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="lg:col-span-1">
                                                    <label className="text-gray-700 text-sm mb-1 block">
                                                        {kycLabels[option]} Number
                                                    </label>
                                                    <input
                                                        ref={option === "voterId" ? voterIdNumberRef : undefined}
                                                        value={profileForm.kycNumbers[option]}
                                                        maxLength={getKycMaxLength(option)}
                                                        onChange={(e) =>
                                                            updateKycField("kycNumbers", option, e.target.value)
                                                        }
                                                        className={`${inputClass} bg-white ${option === "voterId" && fieldErrors["kycNumbers.voterId"]
                                                            ? "border border-red-500 ring-1 ring-red-200 focus:ring-red-500"
                                                            : "border border-gray-300"
                                                            }`}
                                                        placeholder={`${kycLabels[option]} Number`}
                                                    />
                                                    {option === "voterId" && fieldErrors["kycNumbers.voterId"] && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            {fieldErrors["kycNumbers.voterId"]}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Primary/Front Image */}
                                            <div className="lg:col-span-1">
                                                <label className="text-sm font-medium block mb-1">
                                                    {option === "aadhaar" || option === "voterId"
                                                        ? "Front Image"
                                                        : `Upload ${kycLabels[option]} Image`}
                                                </label>

                                                <input
                                                    type="file"
                                                    data-kyc={option}
                                                    className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];

                                                        if (!validateImageSize(file, `${kycLabels[option]} image`)) {
                                                            e.target.value = "";
                                                            updateKycField("kycImages", option, "");
                                                            updateKycField("kycImagePreviews", option, "");
                                                            return;
                                                        }

                                                        updateKycField("kycImages", option, file?.name || "");

                                                        updateKycField(
                                                            "kycImagePreviews",
                                                            option,
                                                            file && file.type.startsWith("image/")
                                                                ? URL.createObjectURL(file)
                                                                : ""
                                                        );
                                                    }}
                                                />

                                                {/* Front Image Preview */}
                                                {profileForm.kycImagePreviews[option] && (
                                                    <div className="mt-2 relative w-32 h-20 border rounded-md overflow-hidden bg-white shadow-sm">
                                                        <Image
                                                            src={profileForm.kycImagePreviews[option]}
                                                            alt={`${option} preview`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Back Image (Only for Aadhaar & Voter ID) */}
                                            {(option === "aadhaar" || option === "voterId") && (
                                                <div className="lg:col-span-1">
                                                    <label className="text-sm font-medium block mb-1">Back Image</label>
                                                    <input
                                                        type="file"
                                                        data-kyc-back={option}
                                                        className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            const backOption = option === "aadhaar" ? "aadhaarBack" : "voterIdBack";

                                                            if (!validateImageSize(file, `${kycLabels[option]} back image`)) {
                                                                e.target.value = "";
                                                                updateKycField("kycImages", backOption, "");
                                                                updateKycField("kycImagePreviews", backOption, "");
                                                                return;
                                                            }

                                                            updateKycField("kycImages", backOption, file?.name || "");
                                                            updateKycField(
                                                                "kycImagePreviews",
                                                                backOption,
                                                                file && file.type.startsWith("image/")
                                                                    ? URL.createObjectURL(file)
                                                                    : ""
                                                            );
                                                        }}
                                                    />
                                                    {profileForm.kycImagePreviews[option === "aadhaar" ? "aadhaarBack" : "voterIdBack"] && (
                                                        <div className="mt-2 relative w-32 h-20 border rounded-md overflow-hidden bg-white shadow-sm">
                                                            <Image
                                                                src={profileForm.kycImagePreviews[option === "aadhaar" ? "aadhaarBack" : "voterIdBack"]}
                                                                alt={`${option} back preview`}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            {!showCustomerProfileSections && (
                                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                                    Select and fill Voter ID to unlock the remaining customer
                                    profile details and preview.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Address Details</h3>
                        <hr className="my-2 border-gray-300" />

                        <div className="space-y-3">
                            <div>
                                <label className="text-gray-700 text-sm mb-1 block">
                                    Permanent Address
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
                                    Correspondence Address
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
                                        Contact Number 1
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
                                        Email ID
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
                                        )}
                                        {otpVerified && (
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

                                {/* <div>
                                    <label className="text-gray-700 text-sm mb-1 block">
                                        Password (Leave blank to keep current)
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
                                            placeholder="Enter New Password (Optional)"
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
                                        Confirm Password
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
                                </div> */}
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
                                        Nominee Name
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
                                        Relationship
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
                                            Please Specify
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
                                    Nominee Address
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
                                        Occupation
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
                                        Residence Type
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
                                            Years of Staying
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
                        <h3 className={sectionHeadingClass}>House Type</h3>
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
                                        Number of Rooms
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
                                    I am sharing my KYCs document to the service provider <strong>"Anavran livelihood services Pvt Ltd"</strong> with my own consent.
                                </label>
                            </div>
                            {fieldErrors.customerConsent && (
                                <p className="text-xs text-red-500 font-medium">{fieldErrors.customerConsent}</p>
                            )}
                        </div>
                    </div>

                    <div className={showCustomerProfileSections ? sectionCardClass : "hidden"}>
                        <h3 className={sectionHeadingClass}>Customer Photo</h3>
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
                                {/* <p className="mt-1 text-sm text-gray-800 break-words">
                                    {profileForm.customerPhotoName || "-"}
                                </p> */}
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
                            Confirm Customer Update
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
                                {loading ? "Updating..." : "Yes, Update"}
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
