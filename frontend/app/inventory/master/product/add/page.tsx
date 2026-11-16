"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Package, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import BASE_URL from "@/app/api/BaseUrl";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

interface MasterOption {
  id: number;
  name: string;
  unique_id?: string;
}

interface UnitOption {
  id: number;
  unit_name: string;
  short_name: string;
  unique_id?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) || null;
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.trim().toLowerCase())
  );
  const safeHighlightIndex = Math.min(
    highlightIndex,
    Math.max(filteredOptions.length - 1, 0)
  );

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch("");
          setHighlightIndex(0);
        }}
        className={`w-full h-11 border rounded-lg px-3 bg-white text-xs font-semibold outline-none flex items-center justify-between ${error
            ? "border-red-500 ring-2 ring-red-100"
            : isOpen
              ? "border-black"
              : "border-slate-200"
          }`}
      >
        <span className={`truncate text-left ${selected ? "text-slate-900" : "text-slate-400 font-medium"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="h-11 px-3 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const active = filteredOptions[safeHighlightIndex];
                  if (active) {
                    onChange(active.value);
                    setIsOpen(false);
                    setSearch("");
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              placeholder="Search..."
              className="w-full text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-[11px] font-semibold text-slate-400">No result found</p>
            ) : (
              filteredOptions.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold border-b border-slate-50 last:border-b-0 ${option.value === value
                      ? "bg-blue-600 text-white"
                      : idx === safeHighlightIndex
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddProductMasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [brands, setBrands] = useState<MasterOption[]>([]);
  const [categories, setCategories] = useState<MasterOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [existingImagePaths, setExistingImagePaths] = useState<string[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    brand_id: "",
    unit_id: "",
    gst_percent: "",
    stock: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const pageIsEditMode = Boolean(editId) || isEditMode;
  const mediaBaseUrl = (BASE_URL || "").replace(/\/api\/?$/, "");
  const toMediaUrl = (path: string) =>
    /^https?:\/\//i.test(path) ? path : `${mediaBaseUrl}${path}`;
  const categoryOptions: SelectOption[] = categories.map((c) => ({
    value: String(c.unique_id || c.id),
    label: c.name,
  }));
  const brandOptions: SelectOption[] = brands.map((b) => ({
    value: String(b.unique_id || b.id),
    label: b.name,
  }));
  const unitOptions: SelectOption[] = units.map((u) => ({
    value: String(u.unique_id || u.id),
    label: u.short_name && u.unit_name ? `${u.short_name} - ${u.unit_name}` : (u.unit_name || u.short_name || String(u.id)),
  }));

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }

    if (productImages.length > 10) {
      newErrors.product_images = "Maximum 10 images allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      setMastersLoading(true);
      try {
        if (editId) {
          setIsEditMode(true);
          // Optimized Single API Call for Edit Mode
          const res = await axiosInstance.get(
            `${ProjectApiList.GET_PRODUCT_EDIT_DATA}/${editId}`
          );
          if (res.data.success) {
            const { product, categories, brands, units } = res.data.data;
            setBrands(brands || []);
            setCategories(categories || []);
            setUnits(units || []);

            setFormData({
              name: product.name || "",
              category_id: String(product.category_id || product.category?.unique_id || product.category?.id || ""),
              brand_id: String(product.brand_id || product.brand?.unique_id || product.brand?.id || ""),
              unit_id: String(product.unit_id || product.unit?.unique_id || product.unit?.id || ""),
              gst_percent: (product.gst_percent ?? "").toString(),
              stock: (product.stock ?? "").toString(),
              description: product.description || "",
              status: product.status || "active",
            });
            setExistingImagePaths(Array.isArray(product.product_images) ? product.product_images : []);
          }
        } else {
          // Standard parallel fetch for Add Mode
          const [bRes, cRes, uRes] = await Promise.all([
            axiosInstance.get(ProjectApiList.GET_BRANDS),
            axiosInstance.get(ProjectApiList.GET_CATEGORIES),
            axiosInstance.get(ProjectApiList.GET_UNITS),
          ]);
          if (bRes.data.success) setBrands(bRes.data.data || []);
          if (cRes.data.success) setCategories(cRes.data.data || []);
          if (uRes.data.success) setUnits(uRes.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load data", err);
        toast.error("Failed to load required data");
      } finally {
        setMastersLoading(false);
      }
    };

    fetchData();
  }, [editId]);

  useEffect(() => {
    const nextPreviews = productImages.map((file) => URL.createObjectURL(file));
    setProductImagePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productImages]);

  const removeSelectedImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill required fields");
      return;
    }

    const id = searchParams.get("id");

    // Show confirmation modal for both add and edit
    if (!showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("category_id", formData.category_id || "");
      payload.append("brand_id", formData.brand_id || "");
      payload.append("unit_id", formData.unit_id || "");
      payload.append("gst_percent", formData.gst_percent || "0");
      payload.append("stock", formData.stock || "0");
      // payload.append("selling_price", "0");
      payload.append("description", formData.description || "");
      payload.append("status", formData.status);

      existingImagePaths.forEach((path) => {
        payload.append("existing_product_images[]", path);
      });

      productImages.forEach((file) => {
        payload.append("product_images[]", file);
      });

      const res = id
        ? await axiosInstance.post(
          `${ProjectApiList.UPDATE_PRODUCT_MASTER}/${id}`,
          payload,
          { headers: { "Content-Type": "multipart/form-data" } }
        )
        : await axiosInstance.post(
          ProjectApiList.CREATE_PRODUCT_MASTER,
          payload,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

      if (res.data.success) {
        toast.success(id ? "Product updated successfully" : "Product created successfully");
        router.push("/inventory/master/product");
      }
    } catch (err: unknown) {
      console.error("Save product failed", err);

      type ApiError = {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      const apiError = err as ApiError;
      const errorMessage =
        apiError.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Navigation */}
      <nav className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/inventory/master/product"
              className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {pageIsEditMode ? "Edit Product (Master)" : "Add Product (Master)"}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 font-medium mt-0.5">
                Simple configuration for product master.
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {mastersLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {editId ? "Loading product data..." : "Loading form data..."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">
              <div className="px-6 py-8 sm:px-10 sm:py-10 space-y-6">
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold uppercase tracking-widest text-[11px]">
                  <Package size={16} /> Product Information
                </div>

                <div className="space-y-2">
                  <Label
                    className={`text-[11px] font-bold uppercase tracking-wider ${errors.name ? "text-red-500" : "text-slate-500"
                      }`}
                  >
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter product name"
                    className={`h-11 rounded-lg shadow-none focus-visible:ring-1 ${errors.name
                        ? "border-red-500 focus-visible:ring-red-500"
                        : "border-slate-200 focus-visible:ring-black"
                      }`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                  />
                  {errors.name && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      className={`text-[11px] font-bold uppercase tracking-wider ${errors.category_id ? "text-red-500" : "text-slate-500"
                        }`}
                    >
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                      value={formData.category_id}
                      onChange={(nextValue) => {
                        setFormData({ ...formData, category_id: nextValue });
                        if (errors.category_id) {
                          setErrors({ ...errors, category_id: "" });
                        }
                      }}
                      disabled={mastersLoading}
                      options={categoryOptions}
                      placeholder="Select Category"
                      error={Boolean(errors.category_id)}
                    />
                    {errors.category_id && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">
                        {errors.category_id}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Brand
                    </Label>
                    <SearchableSelect
                      value={formData.brand_id}
                      onChange={(nextValue) =>
                        setFormData({ ...formData, brand_id: nextValue })
                      }
                      disabled={mastersLoading}
                      options={brandOptions}
                      placeholder="Select Brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Unit
                    </Label>
                    <SearchableSelect
                      value={formData.unit_id}
                      onChange={(nextValue) =>
                        setFormData({ ...formData, unit_id: nextValue })
                      }
                      disabled={mastersLoading}
                      options={unitOptions}
                      placeholder="Select Unit"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Description
                    </Label>
                    <textarea
                      placeholder="Optional description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Product Images (Multiple)
                  </Label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;

                      setProductImages((prev) => {
                        const merged = [...prev];
                        files.forEach((newFile) => {
                          const exists = merged.some(
                            (oldFile) =>
                              oldFile.name === newFile.name &&
                              oldFile.size === newFile.size &&
                              oldFile.lastModified === newFile.lastModified
                          );
                          if (!exists) {
                            merged.push(newFile);
                          }
                        });
                        return merged;
                      });

                      // Allows selecting same file again after removal.
                      e.currentTarget.value = "";
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black bg-white"
                  />

                  {errors.product_images && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">
                      {errors.product_images}
                    </p>
                  )}

                  {productImages.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[10px] font-bold text-slate-600 mb-2">Selected Images ({productImages.length}):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {productImages.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="relative rounded border border-slate-200 bg-white p-1">
                            {productImagePreviews[idx] ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(productImagePreviews[idx])}
                                className="w-full"
                              >
                                <img
                                  src={productImagePreviews[idx]}
                                  alt={file.name}
                                  className="h-20 w-full object-cover rounded"
                                />
                              </button>
                            ) : (
                              <div className="h-20 w-full rounded bg-slate-100" />
                            )}
                            <p className="text-[10px] mt-1 truncate" title={file.name}>{file.name}</p>
                            <button
                              type="button"
                              onClick={() => removeSelectedImage(idx)}
                              className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pageIsEditMode && existingImagePaths.length > 0 && productImages.length === 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[10px] font-bold text-slate-600 mb-2">Existing Saved Images ({existingImagePaths.length}):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {existingImagePaths.map((path, idx) => (
                          <div key={`${path}-${idx}`} className="relative rounded border border-slate-200 bg-white p-1">
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(toMediaUrl(path))}
                              className="w-full"
                            >
                              <img
                                src={toMediaUrl(path)}
                                alt={`Existing image ${idx + 1}`}
                                className="h-20 w-full object-cover rounded"
                              />
                            </button>
                            <p className="text-[10px] mt-1 truncate" title={path}>Image {idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => setExistingImagePaths((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Status
                  </Label>
                  <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100 h-11 sm:w-1/2">
                    {(["active", "inactive"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, status: s })
                        }
                        className={`flex-1 text-[10px] font-bold uppercase rounded-md transition-all ${formData.status === s
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
                type="submit"
                disabled={loading}
                className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save className="mr-2" size={18} />
                    {pageIsEditMode ? "Update Product" : "Create Product"}
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
        title="Confirm Save?"
        message={`Are you sure you want to ${pageIsEditMode ? "update" : "create"} this product master record?`}
        confirmText={loading ? "Saving..." : "Yes, Save"}
        onConfirm={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
        loading={loading}
      />

      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white bg-black/50 hover:bg-black/70 rounded px-3 py-1 text-sm"
            >
              Close
            </button>
            <img src={previewImageUrl} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
}


