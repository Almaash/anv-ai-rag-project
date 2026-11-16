"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Edit2, Trash2, Loader2,
  ChevronLeft, ChevronRight, Layers
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
  DialogTitle,
} from "@/components/ui/dialog";

interface Unit {
  id: number;
  unique_id: string;
  unit_name: string;
  short_name: string;
  description?: string;
  status: 'active' | 'inactive';
}

export default function UnitPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEditId, setConfirmEditId] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [editFormData, setEditFormData] = useState({
    unit_name: "",
    short_name: "",
    description: "",
    status: "active" as "active" | "inactive"
  });

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_UNITS);
      if (res.data.success) {
        setUnits(res.data.data);
      }
    } catch (err) {
      console.error("Fetch units failed", err);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setFormLoading(true);

    try {
      const res = await axiosInstance.post(`${ProjectApiList.UPDATE_UNIT}/${selectedUnit.unique_id}`, editFormData);
      if (res.data.success) {
        toast.success("Unit updated successfully");
        fetchUnits();
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      console.error("Update unit failed", err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUnit) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_UNIT}/${selectedUnit.unique_id}`);
      if (res.data.success) {
        toast.success("Unit deleted successfully");
        fetchUnits();
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error("Delete unit failed", err);
      toast.error("Delete failed");
    } finally {
      setFormLoading(false);
    }
  };

  // ?? useMemo: Fast filtering without re-rendering entire list
  const { currentItems, totalPages } = useMemo(() => {
    const filtered = units.filter(u => 
      u.unit_name.toLowerCase().includes(search.toLowerCase()) || 
      u.short_name.toLowerCase().includes(search.toLowerCase()) ||
      u.unique_id.toLowerCase().includes(search.toLowerCase())
    );
    const total = Math.ceil(filtered.length / itemsPerPage);
    const items = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return { currentItems: items, totalPages: total };
  }, [units, search, currentPage, itemsPerPage]);

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
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Unit Master</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inventory Master</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative w-full sm:w-[280px] md:w-[340px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search units..."
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
              onClick={() => router.push("/inventory/master/unit/add")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              <Plus size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Table Container - Horizontal Scroll for Mobile */}
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="h-10 px-8 text-left w-34">SL No</th>
                <th className="h-10 px-6 text-left">Unit Name</th>
                <th className="h-10 px-6 text-left">Short Name</th>
                <th className="h-10 px-6 text-center">Status</th>
                <th className="h-10 px-6 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    Loading units...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((unit, index) => (
                    <tr key={unit.unique_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-bold text-xs italic">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{unit.unit_name}</td>
                      <td className="px-6 py-4 uppercase font-bold text-[10px] text-slate-500 tracking-wider">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{unit.short_name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          unit.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/master/unit/add?id=${unit.unique_id}`)} className="h-8 w-8 text-slate-400 hover:text-black hover:bg-slate-100">
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {setSelectedUnit(unit); setIsDeleteModalOpen(true);}} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No units found</td>
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

      {/* EDIT MODAL - CLEAN WHITE THEME */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[550px] p-0 rounded-xl border-none shadow-2xl overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">Update Unit Details</DialogTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Edit inventory properties</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdate} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Full Unit Name</Label>
                <Input 
                  value={editFormData.unit_name}
                  onChange={(e) => setEditFormData({...editFormData, unit_name: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none"
                  placeholder="e.g. Kilogram"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Short Code</Label>
                <Input 
                  value={editFormData.short_name}
                  onChange={(e) => setEditFormData({...editFormData, short_name: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none uppercase"
                  placeholder="e.g. KG"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Description</Label>
                <Input 
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-black rounded-lg shadow-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Availability Status</Label>
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                  {['active', 'inactive'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditFormData({...editFormData, status: s as any})}
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all ${
                          editFormData.status === s 
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

            <div className="flex gap-2 pt-4 border-t">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 h-10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-lg"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={formLoading} 
                    className="flex-1 bg-black hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest h-10 rounded-lg shadow-sm active:scale-[0.98] transition-all"
                >
                    {formLoading ? <Loader2 className="animate-spin" size={16} /> : "Update unit"}
                </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SimpleConfirmDialog
        open={confirmEditId !== null}
        onOpenChange={(open) => !open && setConfirmEditId(null)}
        title="Edit Unit?"
        message="Do you want to open the unit edit page now?"
        confirmText="Yes, Continue"
        onConfirm={() => {
          router.push(`/inventory/master/unit/add?id=${confirmEditId}`);
          setConfirmEditId(null);
        }}
      />

      <SimpleConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Unit?"
        message={`Delete "${selectedUnit?.unit_name || "this unit"}" permanently?`}
        confirmText="Confirm Delete"
        onConfirm={handleDelete}
        loading={formLoading}
        destructive
      />
    </div>
  );
}

