"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";

type AgentFormValues = {
  name: string;
  email: string;
  phone_no: string;
  password?: string;
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

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

const schema = yup.object({
  name: yup.string().required("Agent name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone_no: yup.string().matches(/^[0-9]{10}$/, "Mobile number must be 10 digits").required("Mobile number is required"),
  password: yup.string().optional(),
  role: yup.string().required("Role is required"),
  department: yup.string().required("Department is required"),
  gender: yup.string().required("Gender is required"),
  location: yup.string().required("Location is required"),
  address: yup.string().required("Address is required"),
  status: yup.string().required(),
});

function EditAgentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<AgentFormValues | null>(null);

  const validateImageSize = (file: File | undefined) => {
    if (!file) return true;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Upload image up to 2 MB only.");
      return false;
    }
    return true;
  };

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<AgentFormValues>({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    if (!id) return;
    const fetchAgent = async () => {
      try {
        const res = await axiosInstance.get(`${ProjectApiList.api_getAgentById}/${id}`);
        if (res.data.success) {
          const agent = res.data.data;
          reset({
            name: agent.name,
            email: agent.email,
            phone_no: agent.phone_no,
            role: agent.role || "Field Executive",
            department: agent.department || "loan",
            gender: agent.gender,
            location: agent.location,
            address: agent.address,
            status: agent.status
          });
          const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
          setPreview({
            photo: agent.photo ? `${baseUrl}/${agent.photo}` : "",
            adhaar_image: agent.adhaar_image ? `${baseUrl}/${agent.adhaar_image}` : "",
            aadhaar_image_back: agent.aadhaar_image_back ? `${baseUrl}/${agent.aadhaar_image_back}` : "",
            pan_image: agent.pan_image ? `${baseUrl}/${agent.pan_image}` : "",
            voter_id_image: agent.voter_id_image ? `${baseUrl}/${agent.voter_id_image}` : "",
            voter_id_image_back: agent.voter_id_image_back ? `${baseUrl}/${agent.voter_id_image_back}` : "",
            driving_license_image: agent.driving_license_image ? `${baseUrl}/${agent.driving_license_image}` : "",
            passbook_image: agent.passbook_image ? `${baseUrl}/${agent.passbook_image}` : "",
            police_verification_image: agent.police_verification_image ? `${baseUrl}/${agent.police_verification_image}` : ""
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load agent");
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [id, reset]);

  const photoFile = watch("photo");
  const adhaarFile = watch("adhaar_image");
  const aadhaarBackFile = watch("aadhaar_image_back");
  const panFile = watch("pan_image");
  const voterFile = watch("voter_id_image");
  const voterBackFile = watch("voter_id_image_back");
  const dlFile = watch("driving_license_image");
  const passbookFile = watch("passbook_image");
  const policeFile = watch("police_verification_image");

  useEffect(() => {
    const gen = (f: FileList | undefined, k: string) => {
      if (f?.[0]) setPreview(p => ({ ...p, [k]: URL.createObjectURL(f[0]) }));
    };
    gen(photoFile, "photo");
    gen(adhaarFile, "adhaar_image");
    gen(aadhaarBackFile, "aadhaar_image_back");
    gen(panFile, "pan_image");
    gen(voterFile, "voter_id_image");
    gen(voterBackFile, "voter_id_image_back");
    gen(dlFile, "driving_license_image");
    gen(passbookFile, "passbook_image");
    gen(policeFile, "police_verification_image");
  }, [photoFile, adhaarFile, aadhaarBackFile, panFile, voterFile, voterBackFile, dlFile, passbookFile, policeFile]);

  const onSubmit = async (data: AgentFormValues) => {
    const toastId = toast.loading("Updating...");
    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof FileList) {
          if (value[0]) formData.append(key, value[0]);
        }
        else if (value !== undefined) formData.append(key, value as string);
      });
      const res = await axiosInstance.post(`${ProjectApiList.api_updateAgent}/${id}`, formData);
      if (res.data.success) {
        toast.success("Updated", { id: toastId });
        router.push("/admin/field-executive");
      }
      else toast.error("Failed", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Error", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20">Loading...</div>;

  const inputClass = "bg-gray-50 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-600 outline-none border";
  const fileButton = "bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer inline-block";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border rounded-lg p-6 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Edit Field Executive</h1>
          <button onClick={() => router.back()} className="px-3 py-1 text-sm rounded-md bg-gray-100">Back</button>
        </div>
        <form
          onSubmit={handleSubmit((data) => {
            setPendingData(data);
            setShowConfirm(true);
          })}
          className="space-y-8"
        >          <div>
            <h2 className="text-md font-semibold text-blue-700">Basic Information</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm">Name</label><input {...register("name")} className={inputClass} /><p className="text-red-500 text-xs">{errors.name?.message}</p></div>
              <div><label className="text-sm">Email</label><input {...register("email")} className={inputClass} /><p className="text-red-500 text-xs">{errors.email?.message}</p></div>
              {/* <div>
                <label className="text-sm">Password (Optional)</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} {...register("password")} className={inputClass} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div> */}
              <div><label className="text-sm">Role</label><input {...register("role")} className={inputClass + " bg-gray-100"} readOnly /></div>
              <div><label className="text-sm">Phone</label><input {...register("phone_no")} className={inputClass} maxLength={10} /><p className="text-red-500 text-xs">{errors.phone_no?.message}</p></div>
              <div>
                <label className="text-sm">Gender</label>
                <select {...register("gender")} className={inputClass}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-md font-semibold text-blue-700">Location</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm">Location</label><input {...register("location")} className={inputClass} /></div>
              <div className="col-span-2"><label className="text-sm">Address</label><textarea {...register("address")} className={inputClass} rows={3} /></div>
            </div>
          </div>
          <div>
            <h2 className="text-md font-semibold text-blue-700">Documents</h2>
            <hr className="my-2" />
            <div className="grid grid-cols-2 gap-6">
              {[
                { l: "Photo", n: "photo" },
                { l: "Aadhaar Card (Front)", n: "adhaar_image" },
                { l: "Aadhaar Card (Back)", n: "aadhaar_image_back" },
                { l: "PAN Card", n: "pan_image" },
                { l: "Voter ID (Front)", n: "voter_id_image" },
                { l: "Voter ID (Back)", n: "voter_id_image_back" },
                { l: "Driving License", n: "driving_license_image" },
                { l: "Passbook", n: "passbook_image" },
                { l: "Police Verification", n: "police_verification_image" },
              ].map(d => (
                <div key={d.n}>
                  <label className="text-sm font-medium block">{d.l}</label>
                  {(() => {
                    const fieldRegistration = register(d.n as any);

                    return (
                      <label className={fileButton}>
                        Choose
                        <input
                          type="file"
                          accept="image/*"
                          {...fieldRegistration}
                          onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (!validateImageSize(file)) {
                              event.target.value = "";
                              fieldRegistration.onChange(event);
                              return;
                            }

                            fieldRegistration.onChange(event);

                            if (file) {
                              setPreview((current) => ({
                                ...current,
                                [d.n]: URL.createObjectURL(file),
                              }));
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    );
                  })()}
                  {preview[d.n] && <img src={preview[d.n]} className="mt-2 w-24 h-20 object-cover border" alt={d.l} />}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-md font-semibold text-blue-700">Status</h2>
            <hr className="my-2" />
            <div className="flex gap-6">
              <label><input type="radio" value="active" {...register("status")} /> Active</label>
              <label><input type="radio" value="inactive" {...register("status")} /> Inactive</label>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-md">
              {submitting ? "Saving..." : "Update Agent"}
            </button>
          </div>
        </form>
      </div>


      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">

            <h3 className="text-lg font-semibold mb-2">
              Confirm Agent Update
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to update this agent?
              Please verify all details before proceeding.
            </p>

            <div className="flex justify-end gap-3">

              <button
                disabled={submitting}
                onClick={() => {
                  setShowConfirm(false);
                  setPendingData(null);
                }}
                className={`px-4 py-1.5 rounded-md text-sm
          ${submitting
                    ? "bg-gray-200 cursor-not-allowed"
                    : "bg-gray-100 hover:bg-gray-200"
                  }`}
              >
                Cancel
              </button>

              <button
                disabled={submitting}
                onClick={() => {
                  if (pendingData && !submitting) {
                    onSubmit(pendingData);
                    setShowConfirm(false);
                  }
                }}
                className={`px-4 py-1.5 rounded-md text-sm text-white
          ${submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {submitting ? "Updating..." : "Yes, Update"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditAgentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditAgentForm />
    </Suspense>
  );
}
