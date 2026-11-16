"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function AddUnitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    unit_name: "",
    short_name: "",
    description: "",
    status: "active" as "active" | "inactive"
  });

  useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchUnit = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_UNIT}/${editId}`);
        if (res.data.success && res.data.data) {
          const unit = res.data.data;
          setFormData({
            unit_name: unit.unit_name || "",
            short_name: unit.short_name || "",
            description: unit.description || "",
            status: unit.status || "active",
          });
        }
      } catch (err) {
        toast.error("Failed to load unit details");
      } finally {
        setPageLoading(false);
      }
    };

    fetchUnit();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.unit_name.trim()) newErrors.unit_name = "Unit name is required";
    if (!formData.short_name.trim()) newErrors.short_name = "Short name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fill required fields");
      return;
    }

    setLoading(true);
    try {
      const res = isEditMode
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_UNIT}/${editId}`, formData)
        : await axiosInstance.post(ProjectApiList.CREATE_UNIT, formData);
      if (res.data.success) {
        toast.success(res.data.message || (isEditMode ? "Unit updated successfully" : "Unit created successfully"));
        router.push("/inventory/master/unit");
      }
    } catch (err: any) {
      console.error("Create unit failed", err);
      // Detailed 422 validation error handling
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        Object.keys(validationErrors).forEach((key) => {
          validationErrors[key].forEach((msg: string) => {
            toast.error(msg, {
              description: `Field: ${key.replace(/_/g, ' ').toUpperCase()}`,
              duration: 5000,
            });
          });
        });
      } else {
        toast.error(err.response?.data?.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Super Clean */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/inventory/master/unit" className="hover:opacity-70 transition-opacity">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <PlusCircle size={18} className="text-slate-500" />
              <h1 className="text-sm font-semibold tracking-tight uppercase">{isEditMode ? "Edit Unit" : "New Unit"}</h1>
            </div>
          </div>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
            Inventory / Masters
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="w-full">
          {/* Header Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{isEditMode ? "Edit Unit Details" : "Unit Details"}</h2>
            <p className="text-sm text-slate-500 mt-1">{isEditMode ? "Update your unit of measurement settings." : "Configure your unit of measurement settings here."}</p>
          </div>

          {pageLoading ? (
            <div className="p-10 border rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={26} />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Loading unit data...</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="p-8 border rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="unit_name" className={`text-[12px] font-bold uppercase tracking-wider ${errors.unit_name ? "text-red-500" : "text-slate-500"}`}>
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="unit_name" 
                    placeholder="e.g. Kilogram" 
                    className={`rounded-md h-10 shadow-none focus-visible:ring-black ${errors.unit_name ? "border-red-500 ring-red-100 ring-2" : "border-slate-200"}`}
                    value={formData.unit_name}
                    onChange={(e) => {
                      setFormData({...formData, unit_name: e.target.value});
                      if (errors.unit_name) setErrors({...errors, unit_name: ""});
                    }}
                    required
                  />
                  {errors.unit_name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.unit_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_name" className={`text-[12px] font-bold uppercase tracking-wider ${errors.short_name ? "text-red-500" : "text-slate-500"}`}>
                    Short Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="short_name" 
                    placeholder="e.g. KG" 
                    className={`rounded-md h-10 shadow-none uppercase focus-visible:ring-black ${errors.short_name ? "border-red-500 ring-red-100 ring-2" : "border-slate-200"}`}
                    value={formData.short_name}
                    onChange={(e) => {
                      setFormData({...formData, short_name: e.target.value});
                      if (errors.short_name) setErrors({...errors, short_name: ""});
                    }}
                    required
                  />
                  {errors.short_name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.short_name}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">
                  Description
                </Label>
                <textarea
                  id="description" 
                  placeholder="Optional description..." 
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-black"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <Label className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">Availability Status</Label>
                <div className="flex bg-slate-50 p-1 rounded-lg border w-fit">
                  {['active', 'inactive'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s as any})}
                      className={`px-6 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        formData.status === s 
                        ? "bg-white text-black shadow-sm border border-slate-200" 
                        : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.back()}
                className="h-11 px-6 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-50"
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
                className="h-11 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-[0.1em] transition-all"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  isEditMode ? "Update Unit" : "Create Unit"
                )}
              </Button>
            </div>
          </form>
          )}
        </div>
      </main>

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Save?"
        message={isEditMode ? "Are you sure you want to update this unit of measurement?" : "Are you sure you want to create this new unit of measurement?"}
        confirmText={loading ? "Saving..." : "Yes, Save"}
        onConfirm={() => handleSubmit()}
        loading={loading}
      />
    </div>
  );
}

