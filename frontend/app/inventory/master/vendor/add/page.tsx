"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, UserPlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import BASE_URL from "@/app/api/BaseUrl";

export default function AddVendorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    name: "",
    business_name: "",
    profile_photo: null as File | string | null,
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    status: "active" as "active" | "inactive"
  });

  const apiOrigin = (BASE_URL || "").replace(/\/api\/?$/, "");
  const getPhotoUrl = (photo: string) => {
    if (!photo) return "";
    if (/^https?:\/\//i.test(photo)) return photo;
    return `${apiOrigin}${photo.startsWith("/") ? photo : `/${photo}`}`;
  };

  useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchVendor = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_VENDOR}/${editId}`);
        if (res.data.success && res.data.data) {
          const vendor = res.data.data;
          setFormData({
            name: vendor.name || "",
            business_name: vendor.business_name || "",
            profile_photo: vendor.profile_photo || null,
            phone: vendor.phone || "",
            email: vendor.email || "",
            address: vendor.address || "",
            gst_number: vendor.gst_number || "",
            status: vendor.status || "active",
          });
        }
      } catch (err) {
        toast.error("Failed to load vendor details");
      } finally {
        setPageLoading(false);
      }
    };
    fetchVendor();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Vendor name is required";
    if (!formData.business_name.trim()) newErrors.business_name = "Business name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit phone number";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields correctly");
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('business_name', formData.business_name);
      data.append('phone', formData.phone);
      data.append('email', formData.email);
      data.append('address', formData.address);
      data.append('gst_number', formData.gst_number);
      data.append('status', formData.status || 'active');
      if (formData.profile_photo instanceof File) {
        data.append('profile_photo', formData.profile_photo);
      }

      const res = await axiosInstance.post(
        isEditMode ? `${ProjectApiList.UPDATE_VENDOR}/${editId}` : ProjectApiList.CREATE_VENDOR,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (res.data.success) {
        toast.success(res.data.message || "Operation successful");
        setTimeout(() => {
          router.push("/inventory/master/vendor");
        }, 800);
      }
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
        
        // Find the first error message to show in toast
        const firstErrorKey = Object.keys(validationErrors)[0];
        const firstErrorMessage = Array.isArray(validationErrors[firstErrorKey]) 
          ? validationErrors[firstErrorKey][0] 
          : validationErrors[firstErrorKey];
          
        toast.error(firstErrorMessage || "Validation failed");
      } else {
        toast.error(err.response?.data?.message || "Failed to save vendor");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <nav className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push("/inventory/master/vendor")}
              className="p-2 rounded-full border hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">{isEditMode ? "Edit Vendor" : "Add Vendor"}</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {pageLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Loading data...</p>
          </div>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if(validate()) setShowConfirmModal(true);
            }} 
            className="space-y-6"
          >
            <div className="bg-white border rounded-xl shadow-sm p-6 sm:p-10 space-y-8">
              
              {/* Photo Upload */}
              <div className="flex justify-center">
                <Label htmlFor="photo" className="cursor-pointer group flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group-hover:border-blue-400 transition-colors">
                    {formData.profile_photo ? (
                      <img src={formData.profile_photo instanceof File ? URL.createObjectURL(formData.profile_photo) : getPhotoUrl(formData.profile_photo as string)} alt="profile" className="h-full w-full object-cover" />
                    ) : <UserPlus2 className="text-slate-400" size={28} />}
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase text-slate-500">Upload Photo</span>
                  <Input id="photo" type="file" className="hidden" accept="image/*" onChange={(e) => setFormData({...formData, profile_photo: e.target.files?.[0] || formData.profile_photo})} />
                </Label>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={`text-[11px] font-bold uppercase ${errors.name ? "text-red-500" : "text-slate-500"}`}>
                    Vendor Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (errors.name) setErrors({...errors, name: ""});
                    }}
                    placeholder="Enter vendor full name"
                    className={`h-11 rounded-lg ${errors.name ? "border-red-500 focus-visible:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]" : "focus-visible:ring-blue-600"}`}
                    required
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={`text-[11px] font-bold uppercase ${errors.business_name ? "text-red-500" : "text-slate-500"}`}>
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => {
                      setFormData({...formData, business_name: e.target.value});
                      if (errors.business_name) setErrors({...errors, business_name: ""});
                    }}
                    placeholder="Enter business/shop name"
                    className={`h-11 rounded-lg ${errors.business_name ? "border-red-500 focus-visible:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]" : "focus-visible:ring-blue-600"}`}
                    required
                  />
                  {errors.business_name && <p className="text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">{errors.business_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={`text-[11px] font-bold uppercase ${errors.phone ? "text-red-500" : "text-slate-500"}`}>
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({...formData, phone: onlyDigits});
                      if (errors.phone) setErrors({...errors, phone: ""});
                    }}
                    placeholder="10-digit mobile number"
                    className={`h-11 rounded-lg ${errors.phone ? "border-red-500 focus-visible:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]" : "focus-visible:ring-blue-600"}`}
                    required
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Email</Label>
                  <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-11 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Status</Label>
                  <div className="flex bg-slate-50 rounded-lg p-1">
                    {['active', 'inactive'].map(s => (
                      <button key={s} type="button" onClick={() => setFormData({...formData, status: s as any})} className={`flex-1 h-9 rounded-md text-[10px] font-bold uppercase transition ${formData.status === s ? 'bg-white shadow text-black' : 'text-slate-400'}`}>{s}</button>
                    ))}
                  </div>
                </div>
               <div className="space-y-2 md:col-span-2">
  <Label htmlFor="address" className={`text-[11px] font-bold uppercase tracking-wider ${errors.address ? 'text-red-500' : 'text-slate-500'}`}>
    Full Address (Shop / Godown) <span className="text-red-500">*</span>
  </Label>
  <textarea
    id="address"
    placeholder="Enter street, area, landmark details"
    rows={3}
    className={`w-full min-h-[100px] p-3 border rounded-lg text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-black transition-all ${
      errors.address 
        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/50 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]' 
        : 'border-slate-200 focus:border-black'
    }`}
    value={formData.address}
    onChange={(e) => {
      setFormData({...formData, address: e.target.value});
      // Clear error on change if it exists
      if (errors.address) setErrors({...errors, address: ""});
    }}
    required
  />
  {errors.address && (
    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
      {errors.address}
    </p>
  )}
</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/inventory/master/vendor")} className="h-11 px-6 rounded-lg">Cancel</Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : (
                  <Save className="mr-2" size={16} />
                )}
                {isEditMode ? "Update Vendor" : "Save Vendor"}
              </Button>
            </div>
          </form>
        )}
      </main>

      <SimpleConfirmDialog 
        open={showConfirmModal} 
        onOpenChange={setShowConfirmModal} 
        title="Save Changes?" 
        message="Are you sure you want to save this vendor record?" 
        confirmText="Yes, Save" 
        onConfirm={() => handleSubmit()} 
        loading={loading} 
      />
    </div>
  );
}
