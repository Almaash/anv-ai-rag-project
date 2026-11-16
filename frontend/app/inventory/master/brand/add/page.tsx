"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Bookmark, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import BASE_URL from "@/app/api/BaseUrl";

export default function AddBrandPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
    logo: null as File | string | null,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [logoPreview, setLogoPreview] = useState<string>("");

  const apiOrigin = (BASE_URL || "").replace(/\/api\/?$/, "");
  const resolveLogoUrl = (logo: string | null) => {
    if (!logo) return "";
    if (/^https?:\/\//i.test(logo)) return logo;
    return `${apiOrigin}${logo.startsWith("/") ? logo : `/${logo}`}`;
  };

  useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchBrand = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_BRAND}/${editId}`);
        if (res.data.success && res.data.data) {
          const brand = res.data.data;
          setFormData({
            name: brand.name || "",
            description: brand.description || "",
            status: brand.status || "active",
            logo: brand.logo || null,
          });
          setLogoPreview(resolveLogoUrl(brand.logo || null));
        }
      } catch (err) {
        toast.error("Failed to load brand details");
      } finally {
        setPageLoading(false);
      }
    };

    fetchBrand();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Brand name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (formData.logo instanceof File) {
      const objectUrl = URL.createObjectURL(formData.logo);
      setLogoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof formData.logo === "string") {
      setLogoPreview(resolveLogoUrl(formData.logo));
    } else {
      setLogoPreview("");
    }
  }, [formData.logo]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("description", formData.description || "");
      payload.append("status", formData.status);
      if (formData.logo instanceof File) {
        payload.append("logo", formData.logo);
      } else if (formData.logo === null && isEditMode) {
        payload.append("remove_logo", "1");
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      const res = isEditMode
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_BRAND}/${editId}`, payload, config)
        : await axiosInstance.post(ProjectApiList.CREATE_BRAND, payload, config);
      if (res.data.success) {
        toast.success(res.data.message || (isEditMode ? "Brand updated successfully!" : "Brand added successfully!"));
        router.push("/inventory/master/brand");
      }
    } catch (err: any) {
      console.error("Add brand failed", err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
        Object.keys(validationErrors).forEach((key) => {
          const messages = validationErrors[key];
          const errorMsgs = Array.isArray(messages) ? messages : [messages];
          errorMsgs.forEach((msg: string) => {
            toast.error(msg, {
              description: `Field: ${key.replace(/_/g, ' ').toUpperCase()}`,
              duration: 5000,
            });
          });
        });
      } else {
        toast.error(err.response?.data?.message || "Failed to add brand");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-900">
      {/* Top Header */}
      <nav className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/inventory/master/brand"
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-blue-600" />
              <h1 className="text-sm font-semibold tracking-tight uppercase">{isEditMode ? "Edit Brand" : "New Brand"}</h1>
            </div>
          </div>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
            Inventory / Masters
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {pageLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading brand data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 text-sm">

            {/* Card Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="p-6 sm:p-10 space-y-10">

                <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-widest text-[11px]">
                  Brand Profiling
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">

                  {/* Brand Name */}
                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="name" className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Brand Name <span className="text-red-500 font-bold">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Samsung, Apple"
                      className={cn(
                        "h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none",
                        errors.name && "border-red-500 focus-visible:ring-red-500"
                      )}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      required
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Default Status</Label>
                    <div className="flex bg-slate-50 p-1 rounded-lg h-11 border border-slate-100">
                      {(['active', 'inactive'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          className={cn(
                            "flex-1 text-[10px] font-bold uppercase rounded-md transition-all duration-200",
                            formData.status === s
                              ? "bg-white text-black shadow-sm border border-slate-100"
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="description" className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Description (Optional)
                    </Label>
                    <Input
                      id="description"
                      placeholder="Brief detail about brand..."
                      className="h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none font-medium italic"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2.5 md:col-span-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <ImageIcon size={14} /> Brand Logo (optional)
                    </Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        id="brand-logo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, logo: file });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("brand-logo-input")?.click()}
                        className="h-11 px-4 text-xs font-bold uppercase tracking-widest"
                      >
                        Upload Logo
                      </Button>
                      {logoPreview && (
                        <div className="flex items-center gap-3">
                          <img src={logoPreview} alt="Brand logo preview" className="h-12 w-12 rounded-md object-cover border" />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setFormData({ ...formData, logo: null });
                              setLogoPreview(""); // 👈 important
                            }}
                            className="h-8 px-2 text-xs text-red-600"
                          >
                            <X size={14} className="mr-1" /> Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.back()}
                className="px-8 h-11 rounded-lg text-xs font-bold uppercase tracking-widest border-slate-200 text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (validate()) {
                    setShowConfirmModal(true);
                  } else {
                    toast.error("Please fill required fields");
                  }
                }}
                disabled={loading}
                className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Save size={16} />
                    <span>{isEditMode ? "Update Brand" : "Create Brand"}</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        )}
      </main>

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={isEditMode ? "Update Brand?" : "Save Brand?"}
        message={isEditMode ? `Are you sure you want to update ${formData.name || "this brand"}?` : `Are you sure you want to add ${formData.name || "this brand"} to your inventory?`}
        confirmText={loading ? "Saving..." : (isEditMode ? "Yes, Update" : "Yes, Create")}
        onConfirm={() => handleSubmit()}
        loading={loading}
      />
    </div>
  );
}


