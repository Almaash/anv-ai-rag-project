"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Save, Search, ChevronDown, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function AddAttributePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categories, setCategories] = useState<{ id: number; unique_id?: string; name: string }[]>([]);
  const [formData, setFormData] = useState({ name: "", status: "active" as "active" | "inactive", category_id: "" });
  const [attributeValues, setAttributeValues] = useState<string[]>([]);
  const [addedAttributes, setAddedAttributes] = useState<{ name: string; category_id: string; category_name: string; values: string[] }[]>([]);
  const [valueInput, setValueInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return categories.slice(0, 25);
    return categories
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [categories, categorySearch]);

  const selectedCategory = useMemo(() => {
    if (!formData.category_id) return null;
    return categories.find((c) => String(c.unique_id || c.id) === String(formData.category_id)) || null;
  }, [categories, formData.category_id]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get(ProjectApiList.GET_CATEGORIES);
        if (res.data.success) setCategories(res.data.data || []);
      } catch (err) {}
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isEditMode || !editId) { setPageLoading(false); return; }
    const fetchAttribute = async () => {
      setPageLoading(true);
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_ATTRIBUTE}/${editId}`);
        if (res.data.success && res.data.data) {
          const attribute = res.data.data;
          setFormData({ name: attribute.name || "", status: attribute.status || "active", category_id: attribute.category_id ? String(attribute.category_id) : "" });
          const values = String(attribute.values || "")
            .split(",")
            .map((v: string) => v.trim())
            .filter(Boolean);
          setAttributeValues(values);
        }
      } catch (err) { toast.error("Failed to load details"); } finally { setPageLoading(false); }
    };
    fetchAttribute();
  }, [editId, isEditMode]);

  const validate = () => {
    // If we have items in the list, the main form can be empty
    if (addedAttributes.length > 0) return true;
    
    // Otherwise, validate the main form
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Attribute name is required";
    if (!formData.category_id) newErrors.category_id = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizeValues = (values: string[]) => {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const raw of values) {
      const value = String(raw || "").trim();
      if (!value) continue;

      const key = value.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      normalized.push(value);
    }

    return normalized;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let res;
      if (isEditMode) {
        const normalizedEditValues = normalizeValues(attributeValues);
        const payload = {
          ...formData,
          values: normalizedEditValues.join(","),
        };
        res = await axiosInstance.post(`${ProjectApiList.UPDATE_ATTRIBUTE}/${editId}`, payload);
      } else {
        const attributesToCreate = addedAttributes.map(attr => ({
          name: attr.name,
          category_id: attr.category_id || null,
          values: normalizeValues(attr.values).join(","),
          status: formData.status
        }));
        
        // Also include current form if NOT empty and NOT already added
        if (formData.name.trim()) {
           if (!formData.category_id) {
             setErrors((prev) => ({ ...prev, category_id: "Category is required" }));
             toast.error("Please select a category");
             setLoading(false);
             return;
           }

           // check if already added by name AND category to avoid duplicates
           const isAlreadyInList = addedAttributes.some(a => 
             a.name.toLowerCase() === formData.name.trim().toLowerCase() && 
             String(a.category_id || "") === String(formData.category_id || "")
           );
           
           if (!isAlreadyInList) {
              attributesToCreate.push({
                name: formData.name.trim(),
                category_id: formData.category_id || null,
               values: normalizeValues(attributeValues).join(","),
                status: formData.status
              });
           }
        }

        if (attributesToCreate.length === 0) {
          toast.error("Please add at least one attribute to the list first");
          setLoading(false);
          return;
        }

        // IMPORTANT: Ensure we send it as { attributes: [...] } to match the controller
        res = await axiosInstance.post(ProjectApiList.CREATE_ATTRIBUTE, {
          attributes: attributesToCreate,
        });
      }

      if (res.data.success) {
        toast.success(res.data.message || "Success!");
        router.refresh(); 
        router.push("/inventory/master/attribute");
      }
    } catch (err: unknown) {
      const apiErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            errors?: { [key: string]: string | string[] };
          };
        };
      };

      const status = apiErr.response?.status;
      const responseMessage = apiErr.response?.data?.message || apiErr.response?.data?.error;

      if (status === 422 && apiErr.response?.data?.errors) {
        setErrors(Object.fromEntries(
          Object.entries(apiErr.response.data.errors).map(([key, val]) => [key, Array.isArray(val) ? val[0] : val])
        ));
        toast.error(responseMessage || "Validation failed");
      }
      else if (status === 401 || status === 403) {
        toast.error(responseMessage || "Session expired or unauthorized. Please login again.");
      }
      else {
        toast.error(responseMessage || "Failed to process request");
      }

      console.error("Attribute save failed", {
        status,
        data: apiErr.response?.data,
        error: err,
      });
    } finally { setLoading(false); setShowConfirmModal(false); }
  };

  const addAttributeToList = () => {
    if (!formData.name.trim()) {
      setErrors({ name: "Attribute name is required" });
      return;
    }

    if (!formData.category_id) {
      setErrors((prev) => ({ ...prev, category_id: "Category is required" }));
      return;
    }
    
    const newAttr = {
      name: formData.name,
      category_id: formData.category_id,
      category_name: selectedCategory ? selectedCategory.name : "Unknown Category",
      values: [...attributeValues]
    };

    setAddedAttributes(prev => [...prev, newAttr]);
    
    // Clear current form for next attribute
    setFormData(prev => ({ ...prev, name: "" }));
    setAttributeValues([]);
    setValueInput("");
    setErrors({});
    toast.success("Attribute added to list");
  };

  const removeAttributeFromList = (index: number) => {
    setAddedAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const addValue = () => {
    const value = valueInput.trim();
    if (!value) return;
    const exists = attributeValues.some((v) => v.toLowerCase() === value.toLowerCase());
    if (exists) {
      toast.error("This value is already added");
      return;
    }
    setAttributeValues((prev) => [...prev, value]);
    setValueInput("");
  };

  const removeValue = (index: number) => {
    setAttributeValues((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sticky Header with Adjusted Z-Index */}
      <nav className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/inventory/master/attribute" className="hover:opacity-70"><ArrowLeft size={18} /></Link>
            <h1 className="text-sm font-semibold uppercase tracking-tight">{isEditMode ? "Edit Attribute" : "New Attribute"}</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {pageLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest italic animate-pulse">Fetching attribute details...</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (validate()) setShowConfirmModal(true); }} className="space-y-6">
          <div className="bg-white border rounded-xl shadow-sm p-6 sm:p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Category Field */}
              <div className="space-y-2 md:col-span-2">
                <Label className={cn("text-[11px] font-bold uppercase", errors.category_id ? "text-red-500" : "text-slate-500")}>Category *</Label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryDropdownOpen((prev) => {
                        const next = !prev;
                        if (next) setCategorySearch("");
                        return next;
                      });
                    }}
                    className={cn(
                      "w-full h-11 border rounded-lg px-4 bg-white text-xs transition-all outline-none flex items-center justify-between",
                      isCategoryDropdownOpen ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200"
                    )}
                  >
                    <span className={cn("truncate text-left", selectedCategory ? "font-semibold text-slate-800" : "font-medium text-slate-400")}>
                      {selectedCategory ? selectedCategory.name : "Select Category"}
                    </span>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isCategoryDropdownOpen && "rotate-180")} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute top-[calc(100%+5px)] left-0 z-40 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b bg-slate-50/50 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search category..."
                          className="bg-transparent border-none outline-none text-xs font-medium w-full text-slate-600 placeholder:text-slate-400"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, category_id: String(c.unique_id || c.id) }));
                                if (errors.category_id) {
                                  setErrors((prev) => ({ ...prev, category_id: "" }));
                                }
                                setIsCategoryDropdownOpen(false);
                                setCategorySearch("");
                              }}
                              className={`w-full p-3 text-left text-sm border-b border-slate-50 transition-colors ${String(formData.category_id) === String(c.unique_id || c.id) ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-800"}`}
                            >
                              {c.name}
                            </button>
                          ))
                        ) : (
                          <p className="p-6 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">No category found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.category_id && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.category_id}</p>}
              </div>

              {/* Name Field with Dynamic Validation Styles */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className={cn("text-[11px] font-bold uppercase", errors.name ? "text-red-500" : "text-slate-500")}>
                  Attribute Name *
                </Label>
                <Input 
                  id="name"
                  value={formData.name}
                  onChange={(e) => { setFormData({...formData, name: e.target.value}); if(errors.name) setErrors({...errors, name: ""}) }}
                  className={cn("h-11 border-slate-200 rounded-lg transition-all", errors.name && "border-red-500 ring-2 ring-red-100 bg-red-50/50")}
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name}</p>}
              </div>

              {/* Attribute Values Add More */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase text-slate-500">
                  Attribute Values
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addValue();
                      }
                    }}
                    placeholder="Type value and click Add More (e.g. Red, Blue, 5KG)"
                    className="h-11 border-slate-200 rounded-lg"
                  />
                  <Button
                    type="button"
                    onClick={addValue}
                    className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase"
                  >
                    <Plus size={14} className="mr-1" /> Add More
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {attributeValues.length > 0 ? (
                    attributeValues.map((val, idx) => (
                      <span key={`${val}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                        {val}
                        <button
                          type="button"
                          onClick={() => removeValue(idx)}
                          className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100"
                          aria-label={`Remove ${val}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">No values added yet</span>
                  )}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Status</Label>
                <div className="flex bg-slate-50 p-1 rounded-lg border h-11">
                  {(["active", "inactive"] as const).map(s => (
                    <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={cn("flex-1 text-[10px] font-bold uppercase rounded-md transition", formData.status === s ? "bg-white shadow text-blue-600" : "text-slate-400")}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Add Attribute Button (only in Add Mode) */}
              {!isEditMode && (
                <div className="md:col-span-2 pt-4 flex justify-between items-center border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">Click "Add to List" to prepare multiple attributes before saving.</p>
                  <Button
                    type="button"
                    onClick={addAttributeToList}
                    className="h-10 px-6 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider"
                  >
                    Add to List
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* List of Added Attributes (Preview) */}
          {!isEditMode && addedAttributes.length > 0 && (
            <div className="bg-white border rounded-xl shadow-sm p-6 overflow-hidden">
               <h3 className="text-[11px] font-bold uppercase text-slate-500 mb-4 tracking-wider">Prepared Attributes ({addedAttributes.length})</h3>
               <div className="space-y-3">
                  {addedAttributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{attr.name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded uppercase">{attr.category_name}</span>
                        </div>
                        {attr.values.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {attr.values.map((v, vidx) => (
                              <span key={vidx} className="text-[9px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeAttributeFromList(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()} className="h-11 px-8 rounded-lg">Cancel</Button>
            <Button type="submit" className="h-11 px-10 bg-blue-600 hover:bg-blue-700 rounded-lg">
              <Save size={16} className="mr-2"/>
              {addedAttributes.length > 0 ? `Save All (${addedAttributes.length + (formData.name.trim() ? 1 : 0)})` : "Save"}
            </Button>
          </div>
        </form>
        )}
      </main>

      <SimpleConfirmDialog open={showConfirmModal} onOpenChange={setShowConfirmModal} title="Confirm Action" message="Are you sure you want to proceed?" onConfirm={handleSubmit} loading={loading} />
    </div>
  );
}
