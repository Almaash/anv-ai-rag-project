"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function AddCategoryPage() {
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
    description: "",
    status: "active" as "active" | "inactive"
  });

  useEffect(() => {
    if (!isEditMode || !editId) {
      setPageLoading(false);
      return;
    }

    const fetchCategory = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_CATEGORY}/${editId}`);
        if (res.data.success && res.data.data) {
          const category = res.data.data;
          setFormData({
            name: category.name || "",
            description: category.description || "",
            status: category.status || "active",
          });
        }
      } catch (err) {
        toast.error("Failed to load category details");
      } finally {
        setPageLoading(false);
      }
    };

    fetchCategory();
  }, [editId, isEditMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Category name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    setLoading(true);
    
    try {
      const res = isEditMode
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_CATEGORY}/${editId}`, formData)
        : await axiosInstance.post(ProjectApiList.CREATE_CATEGORY, formData);
      if (res.data.success) {
        toast.success(res.data.message || (isEditMode ? "Category updated successfully" : "Category created successfully"));
        router.push("/inventory/master/category");
      }
    } catch (err: any) {
      console.error("Create category failed", err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
        Object.keys(validationErrors).forEach((key) => {
          validationErrors[key].forEach((msg: string) => {
            toast.error(msg, {
              description: `Field: ${key.replace(/_/g, ' ').toUpperCase()}`,
              duration: 5000,
            });
          });
        });
      } else {
        toast.error(err.response?.data?.message || "Failed to add category");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Navigation */}
      <nav className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/inventory/master/category" 
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-blue-600" />
              <h1 className="text-sm font-semibold tracking-tight uppercase">{isEditMode ? "Edit Category" : "New Category"}</h1>
            </div>
          </div>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
            Inventory / Masters
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
        {pageLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading category data...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="grid grid-cols-1 gap-y-6">
                
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold uppercase tracking-widest text-[11px]">
                   <LayoutGrid size={16} /> Category Information
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className={`text-[11px] font-bold uppercase tracking-wider ${errors.name ? "text-red-500" : "text-slate-500"}`}>
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    placeholder="Enter category name (e.g. Electronics, Stationary)" 
                    className={`h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none ${errors.name ? "border-red-500 ring-red-100 ring-2" : ""}`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (errors.name) setErrors({...errors, name: ""});
                    }}
                    required
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                   <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Initial Status</Label>
                   <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100 h-11 sm:w-1/2">
                    {["active", "inactive"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({...formData, status: s as any})}
                        className={`flex-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                          formData.status === s 
                          ? "bg-white text-black shadow-sm border border-slate-100" 
                          : "text-slate-400 hover:text-slate-500"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
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
              className="px-6 h-11 rounded-lg text-xs font-bold uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
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
              className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-[0.1em] shadow-lg transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Save className="mr-2" size={18} />
                  {isEditMode ? "Update Category" : "Create Category"}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </main>

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={isEditMode ? "Update Category?" : "Save Category?"}
        message={isEditMode ? `Are you sure you want to update ${formData.name || "this category"}?` : `Are you sure you want to add ${formData.name || "this category"} to your inventory masters?`}
        confirmText={loading ? "Saving..." : (isEditMode ? "Yes, Update" : "Yes, Create")}
        onConfirm={() => handleSubmit()}
        loading={loading}
      />
    </div>
  );
}


