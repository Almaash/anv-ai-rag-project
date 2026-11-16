"use client";

import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import axios from "axios";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

type InvestorFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  mobile: string;
  date_of_birth: string;
  gender: string;
  pan_number: string;
  aadhaar_number: string | null | undefined;
  current_address: string;
  permanent_address: string;

  referral_type: "Self" | "Referral";
  referral_id: string | null | undefined;
  enrollment_date: string;
  emergency_contact: string;
  nominees?: Array<{
    name: string;
    relation: string;
    contact: string;
    share: number;
  }>;

  profile_photo?: FileList;
  pan_card_doc?: FileList;
  aadhaar_card_doc?: FileList;
  passbook_doc?: FileList;
  voter_id_doc?: FileList;
};

/* ================= VALIDATION ================= */
const schema = yup.object({
  first_name: yup
    .string()
    // .matches(/^[A-Za-z]+$/, "First name must contain only alphabets")
    .required("First name is required"),
  last_name: yup
    .string()
    // .matches(/^[A-Za-z]+$/, "Last name must contain only alphabets")
    .required("Last name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().optional(),
  mobile: yup
    .string()
    .matches(/^[0-9]{1,12}$/, "Mobile number cannot exceed 12 digits")
    .required("Mobile number is required"),

  date_of_birth: yup
    .string()
    .required("Date of birth is required")
    .test("age", "Must be at least 18 years old", (value) => {
      if (!value) return false;
      const dob = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= 18;
    }),
  gender: yup.string().required("Gender is required"),
  pan_number: yup
    .string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (ABCDE1234F)")
    .required("PAN number is required"),
  aadhaar_number: yup
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .nullable()
    .optional()
    .matches(/^[0-9]{12}$/, "Aadhaar number must be exactly 12 digits"),
  current_address: yup.string().required("Current address is required"),
  permanent_address: yup.string().required("Permanent address is required"),
  referral_type: yup.string().oneOf(["Self", "Referral"]).required("Referral type is required"),
  referral_id: yup.string().when("referral_type", {
    is: "Referral",
    then: (schema) => schema.required("Referral ID is required"),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  enrollment_date: yup.string().required("Enrollment date is required"),

  emergency_contact: yup
    .string()
    .matches(/^[0-9]{1,12}$/, "Emergency contact cannot exceed 12 digits")
    .required("Emergency contact is required"),
  nominees: yup.array().of(
    yup.object({
      name: yup.string().required("Nominee name is required"),
      relation: yup.string().required("Relation is required"),
      contact: yup.string().matches(/^[0-9]{10}$/, "10 digits").required("Contact is required"),
      share: yup.number().typeError("Must be a number").required("Share % is required").min(1, "Min 1%").max(100, "Max 100%"),
    })
  ).test("total-share", "Total share % cannot exceed 100", (val) => {
    if (!val) return true;
    const total = val.reduce((acc, curr) => acc + (Number(curr.share) || 0), 0);
    return total <= 100;
  }),
});

function InvestorAddForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<InvestorFormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [checkingReferral, setCheckingReferral] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<InvestorFormValues>({
    resolver: yupResolver(schema) as Resolver<InvestorFormValues>,
    defaultValues: {
      gender: "male",
      referral_type: "Self",
      enrollment_date: new Date().toISOString().split('T')[0],
      nominees: [{ name: "", relation: "", contact: "", share: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "nominees"
  });

  const dobValue = watch("date_of_birth");
  const currentAddress = watch("current_address");
  const referralIdValue = watch("referral_id");

  const age = useMemo(() => {
    if (!dobValue) return "";
    const dob = new Date(dobValue);
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    return calculatedAge >= 0 ? calculatedAge : 0;
  }, [dobValue]);

  const referralType = watch("referral_type");

  const setFieldRef = (field: string, node: HTMLElement | null) => {
    if (node) {
      fieldRefs.current[field] = node;
    }
  };

  const clearFieldError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const fieldErrorClass = (field: keyof InvestorFormValues | string, base = "") =>
    errors[field as keyof InvestorFormValues]?.message || fieldErrors[field]
      ? `${base || inputClass} border border-red-500`
      : base || inputClass;

  const focusFirstError = (errs: Record<string, string>) => {
    const key = Object.keys(errs)[0];
    if (!key) return;
    const node = fieldRefs.current[key];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof node.focus === "function") node.focus();
    }
  };

  const registerWithRef = <T extends keyof InvestorFormValues>(
    field: T,
    options?: Parameters<typeof register<T>>[1]
  ) => {
    const reg = register(field, {
      ...(options || {}),
      onChange: (...args: any[]) => {
        clearFieldError(String(field));
        // @ts-expect-error
        options?.onChange?.(...args);
      },
    });

    return {
      ...reg,
      ref: (el: HTMLElement | null) => {
        setFieldRef(String(field), el);
        reg.ref?.(el);
      },
    };
  };

  useEffect(() => {
    if (sameAsCurrent) {
      setValue("permanent_address", currentAddress || "");
    }
  }, [sameAsCurrent, currentAddress, setValue]);

  useEffect(() => {
    if (!referralIdValue || referralType !== "Referral") return;

    const delay = setTimeout(async () => {
      try {
        setCheckingReferral(true);

        const res = await axiosInstance.get(`${ProjectApiList.CHECK_REFERRAL}/${referralIdValue}`)

        if (res.data.available) {
          setReferralInfo(res.data.data);
          setFieldErrors((prev) => {
            const copy = { ...prev };
            delete copy.referral_id;
            return copy;
          });
        } else {
          setReferralInfo(null);
          setFieldErrors((prev) => ({
            ...prev,
            referral_id: "Referral ID not found",
          }));
        }
      } catch (err) {
        setReferralInfo(null);
        setFieldErrors((prev) => ({
          ...prev,
          referral_id: "Invalid Referral ID",
        }));
      } finally {
        setCheckingReferral(false);
      }
    }, 500); // debounce

    return () => clearTimeout(delay);
  }, [referralIdValue, referralType]);

  /* ================= FETCH DATA (EDIT) ================= */
  useEffect(() => {
    if (activeId) {
      const fetchItem = async () => {
        setFetching(true);
        try {
          const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_INVESTOR_BASIC_INFO}/${activeId}`);
          if (res.data.success) {
            const data = res.data.data;
            setValue("first_name", data.first_name || "");
            setValue("last_name", data.last_name || "");
            setValue("email", data.email || "");
            setValue("mobile", data.mobile || "");
            setValue("date_of_birth", data.date_of_birth || "");
            setValue("gender", data.gender || "male");
            setValue("pan_number", data.pan_number || "");
            setValue("aadhaar_number", data.aadhaar_number || "");
            setValue("current_address", data.current_address || "");
            setValue("permanent_address", data.permanent_address || "");

            setValue("referral_type", data.referral_type || "Self");
            setValue("referral_id", data.referral_id || "");
            setValue("enrollment_date", data.enrollment_date || "");
            setValue("emergency_contact", data.emergency_contact || "");
            if (data.nominee_details) {
              try {
                const parsed = typeof data.nominee_details === 'string'
                  ? JSON.parse(data.nominee_details)
                  : data.nominee_details;
                setValue("nominees", Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Nominee parse error", e);
              }
            }

            // Handle existing previews if any
            const existingPreviews: any = {};
            const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
            if (data.profile_photo) existingPreviews.profile_photo = `${baseUrl}/${data.profile_photo}`;
            if (data.pan_card_doc) {
              const panUrl = `${baseUrl}/${data.pan_card_doc}`;
              existingPreviews.pan_card_doc = panUrl.toLowerCase().endsWith('.pdf') ? "/images/pdf-placeholder.png" : panUrl;
            }
            if (data.aadhaar_card_doc) {
              const aadhaarUrl = `${baseUrl}/${data.aadhaar_card_doc}`;
              existingPreviews.aadhaar_card_doc = aadhaarUrl.toLowerCase().endsWith('.pdf') ? "/images/pdf-placeholder.png" : aadhaarUrl;
            }
            if (data.passbook_doc) {
              const passbookUrl = `${baseUrl}/${data.passbook_doc}`;
              existingPreviews.passbook_doc = passbookUrl.toLowerCase().endsWith('.pdf') ? "/images/pdf-placeholder.png" : passbookUrl;
            }
            if (data.voter_id_doc) {
              const voterUrl = `${baseUrl}/${data.voter_id_doc}`;
              existingPreviews.voter_id_doc = voterUrl.toLowerCase().endsWith('.pdf') ? "/images/pdf-placeholder.png" : voterUrl;
            }
            setPreview(existingPreviews);
          }
        } catch (err) {
          console.error("Fetch error", err);
          toast.error("Failed to load investor data");
        } finally {
          setFetching(false);
        }
      };
      fetchItem();
    }
  }, [activeId, setValue]);

  /* ================= FILE PREVIEW ================= */
  const profilePhoto = watch("profile_photo");
  const panDoc = watch("pan_card_doc");
  const aadhaarDoc = watch("aadhaar_card_doc");
  const passbookDoc = watch("passbook_doc");
  const voterDoc = watch("voter_id_doc");

  useEffect(() => {
    const generatePreview = (file: FileList | undefined, key: string) => {
      if (file?.[0]) {
        if (file[0].type.includes("image")) {
          setPreview((p) => ({
            ...p,
            [key]: URL.createObjectURL(file[0]),
          }));
        } else {
          setPreview((p) => ({
            ...p,
            [key]: "/images/pdf-placeholder.png" // Placeholder for PDF
          }));
        }
      }
    };

    generatePreview(profilePhoto, "profile_photo");
    generatePreview(panDoc, "pan_card_doc");
    generatePreview(aadhaarDoc, "aadhaar_card_doc");
    generatePreview(passbookDoc, "passbook_doc");
    generatePreview(voterDoc, "voter_id_doc");
  }, [profilePhoto, panDoc, aadhaarDoc, passbookDoc, voterDoc]);

  /* ================= SUBMIT ================= */
  const onSubmit = async () => {
    if (!pendingData) return;


    // ❌ SAFETY CHECK AGAIN
    if (referralType === "Referral" && referralInfo?.total_referrals >= 10) {
      toast.error("This referral ID has reached its limit");
      return;
    }
    setFieldErrors({});
    const toastId = toast.loading(activeId ? "Updating investor..." : "Creating investor...");
    try {
      setLoading(true);
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = stored ? JSON.parse(stored) : null;

      const formData = new FormData();
      Object.entries(pendingData).forEach(([key, value]) => {
        if (activeId && key === "password") {
          return;
        }

        if (value instanceof FileList) {
          if (value[0]) formData.append(key, value[0]);
        } else if (key === "nominees") {
          formData.append("nominee_details", JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });

      // Always attach branch context
      if (user?.branch_id || user?.branch) {
        formData.append("branch_id", user.branch_id || user.branch);
      }
      const cmsAdminId = user?.cms_admin || user?.created_by || null;
      if (cmsAdminId) {
        formData.append("cms_admin_id", cmsAdminId);
      }

      const url = activeId
        ? `${ProjectApiList.UPDATE_INVESTOR_BASIC_INFO}/${activeId}`
        : ProjectApiList.CREATE_INVESTOR_BASIC_INFO;

      const res = await axiosInstance.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        toast.success(activeId ? "Investor updated successfully" : "Investor created successfully", { id: toastId });
        router.push("/loan/investor-basic-info");
      }
    } catch (error: any) {
      const response = error?.response?.data;
      if (response?.errors) {
        const firstErrorKey = Object.keys(response.errors)[0];
        const firstErrorMessage = response.errors[firstErrorKey][0];
        toast.error(firstErrorMessage, { id: toastId });

        const backendFieldErrors: Record<string, string> = {};
        Object.keys(response.errors).forEach((field) => {
          setError(field as any, { type: "server", message: response.errors[field][0] });
          backendFieldErrors[field] = response.errors[field][0];
        });
        setFieldErrors(backendFieldErrors);
        focusFirstError(backendFieldErrors);
      } else {
        toast.error(response?.message || "Something went wrong", { id: toastId });
      }
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const inputClass = "bg-gray-50 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-600 outline-none";
  const fileButton = "bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer inline-block";

  if (fetching) {
    return <div className="p-10 text-center">Loading investor details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border rounded-lg p-6 space-y-8 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">{activeId ? "Edit Investor Details" : "Create New Investor"}</h1>
          <div className="flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Enrollment Date</span>
              <input type="date" {...registerWithRef("enrollment_date")} className="text-sm font-semibold border-none bg-transparent outline-none cursor-pointer" />
              <p className="text-red-500 text-[10px]">{errors.enrollment_date?.message}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 h-fit"
            >
              Back
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            if (!activeId && !data.password) {
              toast.error("Password is required");
              return;
            }

            if (
              referralType === "Referral" &&
              referralInfo?.total_referrals >= 10
            ) {
              toast.error("This referral ID has reached its limit");
              return;
            }

            setPendingData(data);
            setShowConfirm(true);
          })}
          className="space-y-8"
        >
          {/* ================= REFERRAL INFO ================= */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Investor Type</label>
                <select {...registerWithRef("referral_type")} className={fieldErrorClass("referral_type")}>
                  <option value="Self">Self</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
              {referralType === "Referral" && (
                <div>
                  <label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Referral ID <span className="text-red-500">*</span></label>
                  <input {...registerWithRef("referral_id")} className={fieldErrorClass("referral_id")} placeholder="Enter referral ID" />
                  <p className="text-red-500 text-xs">{errors.referral_id?.message || fieldErrors.referral_id}</p>
                </div>
              )}
              {checkingReferral && (
                <p className="text-xs text-blue-500 mt-1">Checking...</p>
              )}

              {referralInfo && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs font-semibold text-green-700">
                    {referralInfo.full_name}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    Id : {referralInfo.unique_id} <br /> Total Referrals : {referralInfo.total_referrals}
                  </p>
                </div>
              )}

              {referralInfo?.total_referrals >= 10 && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  This referral ID has reached its limit
                </p>
              )}
            </div>
          </div>

          {/* ================= BASIC INFO ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">Basic Information</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">First Name <span className="text-red-500">*</span></label>
                <input {...registerWithRef("first_name")} className={fieldErrorClass("first_name")} placeholder="Enter first name" />
                <p className="text-red-500 text-xs">{errors.first_name?.message || fieldErrors.first_name}</p>
              </div>
              <div>
                <label className="text-sm">Last Name <span className="text-red-500">*</span></label>
                <input {...registerWithRef("last_name")} className={fieldErrorClass("last_name")} placeholder="Enter last name" />
                <p className="text-red-500 text-xs">{errors.last_name?.message || fieldErrors.last_name}</p>
              </div>
              <div>
                <label className="text-sm">Email Address <span className="text-red-500">*</span></label>
                <input {...registerWithRef("email")} className={fieldErrorClass("email")} placeholder="Enter email address" />
                <p className="text-red-500 text-xs">{errors.email?.message || fieldErrors.email}</p>
              </div>
              {!activeId && (
                <div>
                  <label className="text-sm">
                    Password <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...registerWithRef("password")}
                      className={`${fieldErrorClass("password")} pr-10`}
                      placeholder="Enter password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <p className="text-red-500 text-xs">
                    {errors.password?.message || fieldErrors.password}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" {...registerWithRef("date_of_birth")} className={fieldErrorClass("date_of_birth")} />
                <p className="text-red-500 text-xs">{errors.date_of_birth?.message || fieldErrors.date_of_birth}</p>
              </div>
              <div>
                <label className="text-sm">Age</label>
                <input type="text" readOnly value={age} className={`${inputClass} bg-gray-100 font-bold border-none active:outline-none`} />
              </div>
              <div>
                <label className="text-sm">Gender <span className="text-red-500">*</span></label>
                <select {...registerWithRef("gender")} className={fieldErrorClass("gender")}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-red-500 text-xs">{errors.gender?.message || fieldErrors.gender}</p>
              </div>
            </div>
          </div>

          {/* ================= CONTACT ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">Contact Details</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  {...registerWithRef("mobile")}
                  className={fieldErrorClass("mobile")}
                  placeholder="Enter mobile number"
                  maxLength={12}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="text"
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, "").slice(0, 12);
                  }}
                />

                <p className="text-red-500 text-xs">{errors.mobile?.message || fieldErrors.mobile}</p>
              </div>
              <div>
                <label className="text-sm">Emergency Contact <span className="text-red-500">*</span></label>
                <input
                  {...registerWithRef("emergency_contact")}
                  className={fieldErrorClass("emergency_contact")}
                  placeholder="Emergency contact"
                  maxLength={12}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="text"
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, "").slice(0, 12);
                  }}
                />
                <p className="text-red-500 text-xs">{errors.emergency_contact?.message || fieldErrors.emergency_contact}</p>
              </div>
            </div>
          </div>

          {/* ================= IDENTITY ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">Identity Details</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">PAN Number <span className="text-red-500">*</span></label>
                <input {...registerWithRef("pan_number")} className={fieldErrorClass("pan_number")} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
                <p className="text-red-500 text-xs">{errors.pan_number?.message || fieldErrors.pan_number}</p>
              </div>
              <div>
                <label className="text-sm">Aadhaar Number (Optional)</label>
                <input {...registerWithRef("aadhaar_number")} className={fieldErrorClass("aadhaar_number")} placeholder="12 digit Aadhaar" maxLength={12} type="number" />
                <p className="text-red-500 text-xs">{errors.aadhaar_number?.message || fieldErrors.aadhaar_number}</p>
              </div>
            </div>
          </div>

          {/* ================= ADDRESS ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">Address Details</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm">Current Address <span className="text-red-500">*</span></label>
                <textarea {...registerWithRef("current_address")} className={fieldErrorClass("current_address")} rows={3} placeholder="Enter current address" />
                <p className="text-red-500 text-xs">{errors.current_address?.message || fieldErrors.current_address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="sameAsCurrent"
                    checked={sameAsCurrent}
                    onChange={(e) => setSameAsCurrent(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="sameAsCurrent" className="text-xs text-gray-600 cursor-pointer">Same as current address</label>
                </div>
              </div>
              <div>
                <label className="text-sm">Permanent Address <span className="text-red-500">*</span></label>
                <textarea
                  {...registerWithRef("permanent_address")}
                  className={fieldErrorClass("permanent_address")}
                  rows={3}
                  placeholder="Enter permanent address"
                  readOnly={sameAsCurrent}
                />
                <p className="text-red-500 text-xs">{errors.permanent_address?.message || fieldErrors.permanent_address}</p>
              </div>
            </div>
          </div>

          {/* ================= NOMINEES ================= */}
          <div className="bg-gray-50/50 border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <div>
                <h2 className="text-md font-semibold text-blue-700">Nominee Details</h2>
                <p className="text-xs text-gray-500">Add up to 100% share in total</p>
              </div>
              <button
                type="button"
                onClick={() => append({ name: "", relation: "", contact: "", share: 0 })}
                className="bg-blue-600 font-bold hover:bg-blue-700 text-white rounded-md px-4 py-1.5 text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Plus size={14} /> Add Nominee
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start bg-white p-3 rounded-md border shadow-sm">
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nominee Name</label>
                    <input {...register(`nominees.${index}.name`)} className={inputClass} placeholder="Full name" />
                    <p className="text-red-500 text-[10px] mt-1">{errors.nominees?.[index]?.name?.message}</p>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Relation</label>
                    <input {...register(`nominees.${index}.relation`)} className={inputClass} placeholder="Relation" />
                    <p className="text-red-500 text-[10px] mt-1">{errors.nominees?.[index]?.relation?.message}</p>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Contact</label>
                    <input {...register(`nominees.${index}.contact`)} className={inputClass} placeholder="10 digit" maxLength={10} />
                    <p className="text-red-500 text-[10px] mt-1">{errors.nominees?.[index]?.contact?.message}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Share %</label>
                    <input type="number" {...register(`nominees.${index}.share`)} className={inputClass} placeholder="0-100" />
                    <p className="text-red-500 text-[10px] mt-1">{errors.nominees?.[index]?.share?.message}</p>
                  </div>
                  <div className="col-span-1 pt-5 flex justify-center">
                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors disabled:opacity-30" disabled={fields.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {errors.nominees?.root?.message && (
              <p className="text-red-600 font-bold text-xs mt-3 bg-red-50 p-2 rounded border border-red-100">{errors.nominees.root.message}</p>
            )}
            {/* Field Array Level Error from custom test */}
            {errors.nominees && !Array.isArray(errors.nominees) && (errors.nominees as any).message && (
              <p className="text-red-600 font-bold text-xs mt-3 bg-red-50 p-2 rounded border border-red-100">{(errors.nominees as any).message}</p>
            )}
          </div>

          {/* ================= DOCUMENTS ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">Documents Upload</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Profile Photo", name: "profile_photo" },
                { label: "PAN Card", name: "pan_card_doc" },
                { label: "Aadhaar Card", name: "aadhaar_card_doc" },
                { label: "Passbook", name: "passbook_doc" },
                { label: "Voter ID", name: "voter_id_doc" },
              ].map((doc: any) => (
                <div key={doc.name}>
                  <label className="text-sm font-medium block mb-1">{doc.label}</label>
                  <label className={fileButton}>
                    Choose File
                    <input
                      type="file"
                      {...register(doc.name as any)}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 6 * 1024 * 1024) {
                          toast.error(`${doc.label} must be under 6MB`);
                          e.target.value = "";
                          return;
                        }
                        register(doc.name as any).onChange(e);
                      }}
                    />
                  </label>
                  {preview[doc.name] && (
                    <div className="mt-2">
                      {preview[doc.name].includes("pdf-placeholder") ? (
                        <div className="w-24 h-24 border flex flex-col items-center justify-center bg-gray-50 rounded-md">
                          <span className="text-[10px] font-bold text-red-600">PDF</span>
                          <span className="text-[8px] text-gray-500 truncate w-full px-1">{watch(doc.name as any)?.[0]?.name}</span>
                        </div>
                      ) : (
                        <img src={preview[doc.name]} className="w-24 h-24 rounded-md object-cover border" alt={doc.label} />
                      )}
                    </div>
                  )}
                  <p className="text-red-500 text-xs">{errors[doc.name as keyof InvestorFormValues]?.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ================= BUTTON ================= */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (referralType === "Referral" && referralInfo?.total_referrals >= 10)}
              className={`px-8 py-2 rounded-md text-white text-sm font-semibold transition-all shadow-md ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
            >
              {loading ? "Processing..." : (activeId ? "Update Investor" : "Save Investor")}
            </button>
          </div>
        </form>

        <SimpleConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          onConfirm={onSubmit}
          title={activeId ? "Update Confirmation" : "Save Confirmation"}
          message={`Are you sure you want to ${activeId ? "update" : "save"} this investor?`}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default function InvestorAddPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <InvestorAddForm />
    </Suspense>
  );
}

