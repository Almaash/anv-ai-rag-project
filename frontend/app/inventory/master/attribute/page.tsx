"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Edit2, Trash2, Loader2,
  ChevronLeft, ChevronRight, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Attribute {
  id: number;
  unique_id: string;
  name: string;
  values: string;
  status: "active" | "inactive";
  category_id?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
}

export default function AttributeListPage() {
  const router = useRouter();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEditId, setConfirmEditId] = useState<number | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [editFormData, setEditFormData] = useState({
    name: "",
    values: "",
    status: "active" as "active" | "inactive"
  });

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!editFormData.name.trim()) newErrors.name = "Attribute name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_ATTRIBUTES + `?t=${Date.now()}`);
      if (res.data.success) {
        setAttributes(res.data.data);
      }
    } catch (err) {
      console.error("Fetch attributes failed", err);
      toast.error("Failed to load attributes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttribute) return;
    if (!validate()) {
      toast.error("Please fix errors in the form");
      return;
    }
    setFormLoading(true);

    try {
      const res = await axiosInstance.post(`${ProjectApiList.UPDATE_ATTRIBUTE}/${selectedAttribute.unique_id}`, editFormData);
      if (res.data.success) {
        toast.success("Attribute updated successfully");
        fetchAttributes();
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      console.error("Update attribute failed", err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAttribute) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_ATTRIBUTE}/${selectedAttribute.unique_id}`);
      if (res.data.success) {
        toast.success("Attribute deleted successfully");
        fetchAttributes();
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error("Delete attribute failed", err);
      toast.error("Delete failed");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = attributes.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.unique_id.toLowerCase().includes(search.toLowerCase())
  );

  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/40">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-100 rounded-lg sm:hidden">
                <Layers size={18} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Attribute Master</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inventory Master</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative w-full sm:w-[280px] md:w-[340px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search by name or ID..."
                className="pl-10 h-10 sm:h-11 border-slate-200 focus-visible:ring-black rounded-lg text-sm bg-white shadow-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <Button
              type="button"
              onClick={() => router.push("/inventory/master/attribute/add")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              <Plus size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Add New Attribute</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Table Container */}
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="h-10 px-6 text-left w-16">#</th>
                <th className="h-10 px-6 text-left">Attribute Detail</th>
                <th className="h-10 px-6 text-left">Category</th>
                <th className="h-10 px-6 text-center">Values</th>
                <th className="h-10 px-6 text-center">Status</th>
                <th className="h-10 px-6 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    Loading attributes...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((attr, index) => (
                  <tr key={attr.unique_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-bold text-xs italic">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col text-slate-900">
                            <span className="font-bold">{attr.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        {attr.category?.name || "All Categories"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/inventory/master/attribute/values?id=${attr.unique_id}&name=${attr.name}`}>
                        <Button variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                          {attr.values ? attr.values.split(',').length : 0} Values <ChevronRight size={12} className="ml-1" />
                        </Button>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        attr.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {attr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/master/attribute/add?id=${attr.unique_id}`)} className="h-8 w-8 text-slate-400 hover:text-black hover:bg-slate-100 transition-colors opacity-100 visible">
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {setSelectedAttribute(attr); setIsDeleteModalOpen(true);}} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 visible">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No attributes found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t bg-slate-50/30 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages || 1}</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0 rounded-md border-slate-200"><ChevronLeft size={14} /></Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0 rounded-md border-slate-200"><ChevronRight size={14} /></Button>
            </div>
          </div>
        </div>
      </main>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-0 rounded-xl border-none shadow-2xl overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">Update Attribute</DialogTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Edit attribute details</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdate} className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 text-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Attribute Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({...editFormData, name: e.target.value});
                    if (errors.name) setErrors({...errors, name: ""});
                  }}
                  className="h-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none font-bold italic"
                  placeholder="e.g. Color, Size, Style"
                  required
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status</Label>
                <div className="flex bg-slate-100 p-1 rounded-lg h-10 w-full sm:w-2/3">
                  {["active", "inactive"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditFormData({...editFormData, status: s as any})}
                      className={`flex-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                        editFormData.status === s 
                        ? "bg-white text-black shadow-sm" 
                        : "text-slate-400 hover:text-black"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)} className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-slate-200">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="h-9 px-6 bg-black text-white text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                {formLoading ? <Loader2 className="animate-spin" size={14} /> : "Update Details"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SimpleConfirmDialog
        open={confirmEditId !== null}
        onOpenChange={(open) => !open && setConfirmEditId(null)}
        title="Edit Attribute?"
        message="Do you want to open the attribute edit page now?"
        confirmText="Yes, Continue"
        onConfirm={() => {
          router.push(`/inventory/master/attribute/add?id=${confirmEditId}`);
          setConfirmEditId(null);
        }}
      />

      <SimpleConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Attribute?"
        message={`"${selectedAttribute?.name || "This attribute"}" will be permanently removed.`}
        confirmText={formLoading ? "Deleting..." : "Confirm Delete"}
        onConfirm={handleDelete}
        loading={formLoading}
        destructive
      />
    </div>
  );
}

