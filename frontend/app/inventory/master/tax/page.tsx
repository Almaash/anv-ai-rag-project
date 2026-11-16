"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Edit2, Trash2, Loader2,
  ChevronLeft, ChevronRight, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Tax {
  id: number;
  unique_id: string;
  name: string;
  rate: string;
  status: "active" | "inactive";
}

export default function TaxPage() {
  const router = useRouter();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEditId, setConfirmEditId] = useState<number | null>(null);
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [editFormData, setEditFormData] = useState({
    name: "",
    rate: "",
    status: "active" as "active" | "inactive"
  });

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!editFormData.name.trim()) newErrors.name = "Tax name is required";
    if (!editFormData.rate) {
        newErrors.rate = "Tax rate is required";
    } else if (isNaN(Number(editFormData.rate)) || Number(editFormData.rate) < 0 || Number(editFormData.rate) > 100) {
        newErrors.rate = "Rate must be between 0 and 100";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_TAXES);
      if (res.data.success) {
        setTaxes(res.data.data);
      }
    } catch (err) {
      console.error("Fetch taxes failed", err);
      toast.error("Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleEditClick = (tax: Tax) => {
    setSelectedTax(tax);
    setErrors({});
    setEditFormData({
      name: tax.name,
      rate: tax.rate,
      status: tax.status
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTax) return;
    if (!validate()) {
      toast.error("Please fix errors in the form");
      return;
    }
    setFormLoading(true);

    try {
      const res = await axiosInstance.post(`${ProjectApiList.UPDATE_TAX}/${selectedTax.unique_id}`, editFormData);
      if (res.data.success) {
        toast.success("Tax updated successfully");
        fetchTaxes();
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      console.error("Update tax failed", err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTax) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_TAX}/${selectedTax.unique_id}`);
      if (res.data.success) {
        toast.success("Tax deleted successfully");
        fetchTaxes();
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error("Delete tax failed", err);
      toast.error("Delete failed");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = taxes.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.unique_id.toLowerCase().includes(search.toLowerCase())
  );

  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b sticky top-[72px] bg-white z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-100 rounded-lg sm:hidden">
                <Percent size={18} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Tax Master</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-widest font-sans">Inventory Master</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/inventory/master/tax/add")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Add New Tax</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search */}
        <div className="relative mb-6 sm:mb-8 w-full sm:max-w-md font-sans">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            placeholder="Search by tax name or ID..." 
            className="w-full pl-10 pr-4 h-10 sm:h-11 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-black rounded-lg text-sm transition-all"
            value={search}
            onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
          />
        </div>

        {/* Table Container */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white overflow-x-auto font-sans">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="h-10 px-6 text-left w-16">#</th>
                <th className="h-10 px-6 text-left">Tax Details</th>
                <th className="h-10 px-6 text-left">Rate (%)</th>
                <th className="h-10 px-6 text-center">Status</th>
                <th className="h-10 px-6 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    Loading taxes...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((tax, index) => (
                  <tr key={tax.unique_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-bold text-xs not-italic">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col text-slate-900 not-italic">
                            <span className="font-bold">{tax.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-900 not-italic">
                        {tax.rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        tax.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {tax.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/master/tax/add?id=${tax.unique_id}`)} className="h-8 w-8 text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {setSelectedTax(tax); setIsDeleteModalOpen(true);}} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No taxes found</td>
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
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-0 rounded-xl border-none shadow-2xl overflow-hidden font-sans">
          <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">Update Tax</DialogTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Edit configuration</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdate} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 text-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tax Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({...editFormData, name: e.target.value});
                    if (errors.name) setErrors({...errors, name: ""});
                  }}
                  className="h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none font-bold italic"
                  placeholder="e.g. GST 18%"
                  required
                />
                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rate (%) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <Input 
                        type="number"
                        step="0.01"
                        value={editFormData.rate}
                        onChange={(e) => {
                            setEditFormData({...editFormData, rate: e.target.value});
                            if (errors.rate) setErrors({...errors, rate: ""});
                        }}
                        className="h-11 pr-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none font-bold"
                        placeholder="0.00"
                        required
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.rate && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.rate}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status</Label>
                <div className="flex bg-slate-100 p-1.5 rounded-lg h-11 w-full sm:w-2/3 border border-slate-200/50">
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
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)} className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest border-slate-200 text-slate-400">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="h-10 px-8 bg-black text-white text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                {formLoading ? <Loader2 className="animate-spin" size={14} /> : "Update Details"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SimpleConfirmDialog
        open={confirmEditId !== null}
        onOpenChange={(open) => !open && setConfirmEditId(null)}
        title="Edit Tax?"
        message="Do you want to open the tax edit page now?"
        confirmText="Yes, Continue"
        onConfirm={() => {
          router.push(`/inventory/master/tax/add?id=${confirmEditId}`);
          setConfirmEditId(null);
        }}
      />

      <SimpleConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Tax?"
        message={`"${selectedTax?.name || "This tax"}" will be permanently removed.`}
        confirmText={formLoading ? "Deleting..." : "Confirm Delete"}
        onConfirm={handleDelete}
        loading={formLoading}
        destructive
      />
    </div>
  );
}

