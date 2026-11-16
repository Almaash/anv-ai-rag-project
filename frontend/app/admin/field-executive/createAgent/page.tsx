"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { useState, useEffect } from "react";

type AgentFormValues = {
  name: string;
  email: string;
  phone_no: string;
  password: string;
  role: string;
  department: string;

  gender: string;
  location: string;
  address: string;

  status: string;

  photo?: FileList;
  adhaar_image?: FileList;
  aadhaar_image_back?: FileList;
  pan_image?: FileList;
  voter_id_image?: FileList;
  voter_id_image_back?: FileList;
  driving_license_image?: FileList;
  passbook_image?: FileList;
  police_verification_image?: FileList;
};
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
/* ================= VALIDATION ================= */
const schema = yup.object({
  name: yup.string().required("Agent name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),

  phone_no: yup
    .string()
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
    .required("Mobile number is required"),

  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),

  role: yup.string().required("Role is required"),
  department: yup.string().required("Department is required"),

  gender: yup.string().required("Gender is required"),
  location: yup.string().required("Location is required"),
  address: yup.string().required("Address is required"),
  status: yup.string().required(),
});
export default function CreateAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<AgentFormValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<AgentFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      status: "active",
      role: "Field Executive",
      department: "loan",
    },
  });

  /* ================= FILE PREVIEW ================= */

  const photoFile = watch("photo");
  const adhaarFile = watch("adhaar_image");
  const adhaarBackFile = watch("aadhaar_image_back");
  const panFile = watch("pan_image");
  const voterFile = watch("voter_id_image");
  const voterBackFile = watch("voter_id_image_back");
  const dlFile = watch("driving_license_image");
  const passbookFile = watch("passbook_image");
  const policeFile = watch("police_verification_image");

  useEffect(() => {
    const generatePreview = (file: FileList | undefined, key: string) => {
      if (file?.[0]) {
        setPreview((p) => ({
          ...p,
          [key]: URL.createObjectURL(file[0]),
        }));
      }
    };

    generatePreview(photoFile, "photo");
    generatePreview(adhaarFile, "adhaar_image");
    generatePreview(adhaarBackFile, "aadhaar_image_back");
    generatePreview(panFile, "pan_image");
    generatePreview(voterFile, "voter_id_image");
    generatePreview(voterBackFile, "voter_id_image_back");
    generatePreview(dlFile, "driving_license_image");
    generatePreview(passbookFile, "passbook_image");
    generatePreview(policeFile, "police_verification_image");
  }, [
    photoFile,
    adhaarFile,
    adhaarBackFile,
    panFile,
    voterFile,
    voterBackFile,
    dlFile,
    passbookFile,
    policeFile,
  ]);

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: AgentFormValues) => {
    const loadingToast = toast.loading("Creating agent...");
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const formData = new FormData();

      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("phone_no", data.phone_no);
      formData.append("password", data.password);

      formData.append("role", data.role);
      formData.append("department", data.department);

      formData.append("gender", data.gender);
      formData.append("location", data.location);
      formData.append("address", data.address);
      formData.append("status", data.status);

      formData.append("branch", user.branch);
      formData.append("branch_id", user.branch);
      formData.append("cms_admin", user.cms_admin);
      formData.append("cms_admin_id", user.user_id);
      formData.append("created_by", user.cms_admin);
      formData.append("admin_user_id", user.admin_user_id);
      formData.append("is_deleted", user.is_deleted);

      if (data.photo?.[0]) formData.append("photo", data.photo[0]);
      if (data.adhaar_image?.[0]) formData.append("adhaar_image", data.adhaar_image[0]);
      if (data.aadhaar_image_back?.[0]) formData.append("aadhaar_image_back", data.aadhaar_image_back[0]);
      if (data.pan_image?.[0]) formData.append("pan_image", data.pan_image[0]);
      if (data.voter_id_image?.[0]) formData.append("voter_id_image", data.voter_id_image[0]);
      if (data.voter_id_image_back?.[0]) formData.append("voter_id_image_back", data.voter_id_image_back[0]);
      if (data.driving_license_image?.[0])
        formData.append("driving_license_image", data.driving_license_image[0]);
      if (data.passbook_image?.[0])
        formData.append("passbook_image", data.passbook_image[0]);
      if (data.police_verification_image?.[0])
        formData.append("police_verification_image", data.police_verification_image[0]);

      // console.log("FormData entries:", formData);

      const res = await axiosInstance.post(
        ProjectApiList.api_createAgents,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Handle API returning success: false (validation errors sent in 200 response)
      if (!res.data.success) {
        toast.dismiss(loadingToast);

        const response = res.data;

        if (response?.errors) {
          Object.values(response.errors).forEach((messages: any) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg: string) => toast.error(msg));
            }
          });
        } else {
          toast.error(response?.message || "Something went wrong");
        }

        setLoading(false);
        return;
      }

      // Success
      toast.dismiss(loadingToast);
      toast.success("Agent created successfully");

      router.push("/admin/field-executive");
    } catch (error: any) {
      toast.dismiss(loadingToast);

      const response = error?.response?.data;

      if (response?.errors) {
        Object.values(response.errors).forEach((messages: any) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(msg));
          }
        });
      } else {
        toast.error(response?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "bg-gray-50 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-600 outline-none";

  const fileButton =
    "bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer inline-block";

  const validateImageSize = (file: File | undefined) => {
    if (!file) return true;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Upload image up to 2 MB only.");
      return false;
    }
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border rounded-lg p-6 space-y-8">

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Create New Field Executive</h1>
          <button
            onClick={() => router.back()}
            className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
          >
            Back
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            setPendingData(data);
            setShowConfirm(true);
          })}
          className="space-y-8"
        >
          {/* ================= BASIC INFO ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Basic Information
            </h2>
            <hr className="my-2" />

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm"> Name</label>
                <input {...register("name")} className={inputClass} />
                <p className="text-red-500 text-xs">{errors.name?.message}</p>
              </div>

              <div>
                <label className="text-sm">Email Address</label>
                <input
                  {...register("email")}
                  className={`${inputClass} ${errors.email ? "border border-red-500" : ""}`}
                />
                <p className="text-red-500 text-xs">{errors.email?.message}</p>
              </div>

              <div>
                <label className="text-sm">Password</label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className={`${inputClass} pr-10`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="text-red-500 text-xs">{errors.password?.message}</p>
              </div>

              <div>
                <label className="text-sm">Role</label>
                <input
                  {...register("role")}
                  className={`${inputClass} bg-gray-100 cursor-not-allowed`}
                  readOnly
                />
              </div>

              {/* <div>
                <label className="text-sm">Department</label>
                <input {...register("department")} className={inputClass} />
              </div> */}

              <div>
                <label className="text-sm">Mobile Number</label>
                <input
                  {...register("phone_no")}
                  className={inputClass}
                  maxLength={10}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      e.key !== "Backspace" &&
                      e.key !== "Tab" &&
                      e.key !== "ArrowLeft" &&
                      e.key !== "ArrowRight" &&
                      e.key !== "Delete"
                    ) {
                      e.preventDefault();
                    }
                  }}
                />
                <p className="text-red-500 text-xs">
                  {errors.phone_no?.message}
                </p>
              </div>

              <div>
                <label className="text-sm">Gender</label>
                <select {...register("gender")} className={inputClass}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

            </div>
          </div>

          {/* ================= LOCATION ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Location Details
            </h2>
            <hr className="my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Location</label>
                <input {...register("location")} className={inputClass} />
                <p className="text-red-500 text-xs">
                  {errors.location?.message}
                </p>
              </div>

              <div className="col-span-2">
                <label className="text-sm">Address</label>
                <textarea
                  {...register("address")}
                  className={inputClass}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ================= DOCUMENTS ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Documents Upload
            </h2>
            <hr className="my-2" />

            <div className="grid grid-cols-2 gap-6">

              {[
                { label: "Photo", name: "photo" },
                { label: "Aadhaar Card (Front)", name: "adhaar_image" },
                { label: "Aadhaar Card (Back)", name: "aadhaar_image_back" },
                { label: "PAN Card", name: "pan_image" },
                { label: "Voter ID (Front)", name: "voter_id_image" },
                { label: "Voter ID (Back)", name: "voter_id_image_back" },
                { label: "Driving License", name: "driving_license_image" },
                { label: "Passbook", name: "passbook_image" },
                { label: "Police Verification", name: "police_verification_image" },
              ].map((doc: any) => (
                <div key={doc.name}>
                  <label className="text-sm font-medium block mb-1">
                    {doc.label}
                  </label>

                  {(() => {
                    const fieldRegistration = register(doc.name as any);

                    return (
                  <label className={fileButton}>
                    Choose File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      {...fieldRegistration}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!validateImageSize(file)) {
                          event.target.value = "";
                          setPreview((current) => {
                            const next = { ...current };
                            delete next[doc.name];
                            return next;
                          });
                          fieldRegistration.onChange(event);
                          return;
                        }

                        fieldRegistration.onChange(event);

                        if (file) {
                          setPreview((current) => ({
                            ...current,
                            [doc.name]: URL.createObjectURL(file),
                          }));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                    );
                  })()}

                  {preview[doc.name] && (
                    <img
                      src={preview[doc.name]}
                      className="mt-2 w-24 h-20 rounded-md object-cover"
                    />
                  )}
                </div>
              ))}

            </div>
          </div>

          {/* ================= STATUS ================= */}
          <div>
            <h2 className="text-md font-semibold text-blue-700">
              Status
            </h2>
            <hr className="my-2" />

            <div className="flex gap-6 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="active"
                  {...register("status")}
                />
                Active
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="inactive"
                  {...register("status")}
                />
                Inactive
              </label>
            </div>
          </div>

          {/* ================= BUTTON ================= */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-md text-white text-sm
                ${loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Saving..." : "Save Agent"}
            </button>
          </div>

        </form>
      </div>
      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">

            <h3 className="text-lg font-semibold mb-2">
              Confirm Agent Creation
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to create this agent?
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
                    setShowConfirm(false);
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
    </div>
  );
}