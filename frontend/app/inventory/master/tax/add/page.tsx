"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, Loader2, Save, Percent, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function AddTaxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    status: "active" as "active" | "inactive"
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  React.useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchTax = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_TAX}/${editId}`);
        if (res.data.success && res.data.data) {
          const tax = res.data.data;
          setFormData({
            name: tax.name || "",
            rate: (tax.rate ?? "").toString(),
            status: tax.status || "active",
          });
        }
      } catch (err) {
        toast.error("Failed to load tax details");
      } finally {
        setPageLoading(false);
      }
    };

    fetchTax();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Tax name is required";
    if (!formData.rate) {
        newErrors.rate = "Tax rate is required";
    } else if (isNaN(Number(formData.rate)) || Number(formData.rate) < 0 || Number(formData.rate) > 100) {
        newErrors.rate = "Rate must be between 0 and 100";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields correctly");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setLoading(true);
    try {
      const res = isEditMode
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_TAX}/${editId}`, formData)
        : await axiosInstance.post(ProjectApiList.CREATE_TAX, formData);

      if (res.data.success) {
        toast.success(isEditMode ? "Tax updated successfully!" : "Tax added successfully!");
        router.push("/inventory/master/tax");
      }
    } catch (err: any) {
      console.error("Add tax failed", err);
      toast.error(err.response?.data?.message || "Failed to add tax");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-500 border border-slate-100 shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{isEditMode ? "Edit Tax" : "Add New Tax"}</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Inventory Master</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 sm:py-16">
        {pageLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading tax data...</p>
          </div>
        ) : (
        <form onSubmit={handleOpenConfirm} className="space-y-8">
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="grid grid-cols-1 gap-y-8">
                
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold uppercase tracking-widest text-[11px]">
                   <Percent size={16} /> Tax Configuration
                </div>

                {/* Tax Name */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tax Name (e.g. GST 18%) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    placeholder="Enter tax label..."
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (errors.name) setErrors({...errors, name: ""});
                    }}
                    className={cn(
                        "h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none",
                        errors.name && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Tax Rate Percentage */}
                    <div className="space-y-2.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Rate Percentage (%) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.rate}
                        onChange={(e) => {
                            setFormData({...formData, rate: e.target.value});
                            if (errors.rate) setErrors({...errors, rate: ""});
                        }}
                        className={cn(
                            "h-11 pr-12 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none font-bold",
                            errors.rate && "border-red-500 focus-visible:ring-red-500"
                        )}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Percent size={14} />
                        </div>
                    </div>
                    {errors.rate && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{errors.rate}</p>}
                    </div>

                    {/* Status Toggle */}
                    <div className="space-y-2.5">
                    <Label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Default Status</Label>
                    <div className="flex bg-slate-50 p-1 rounded-lg h-11 w-full border border-slate-100">
                        {(["active", "inactive"] as const).map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setFormData({...formData, status})}
                            className={cn(
                            "flex-1 text-[10px] font-bold uppercase rounded-md transition-all duration-200",
                            formData.status === status 
                                ? "bg-white text-black shadow-sm border border-slate-100" 
                                : "text-slate-400 hover:text-slate-500"
                            )}
                        >
                            {status}
                        </button>
                        ))}
                    </div>
                    </div>
                </div>
              </div>
            </div>
          </div>

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
              type="submit" 
              disabled={loading}
              className="px-12 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <div className="flex items-center gap-2">
                   <Save size={16} />
                   <span>{isEditMode ? "Update Tax Type" : "Save Tax Type"}</span>
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
        title={isEditMode ? "Update Tax Type?" : "Save Tax Type?"}
        message={isEditMode ? `Are you sure you want to update ${formData.name || "this tax type"}?` : `Are you sure you want to add ${formData.name || "this tax type"} to your inventory masters?`}
        confirmText={loading ? "Saving..." : (isEditMode ? "Yes, Update" : "Yes, Save")}
        onConfirm={handleSubmit}
        loading={loading}
      />
    </div>
  );
}


