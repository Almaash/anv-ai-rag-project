"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Edit2, Trash2, Loader2, Eye,
  ChevronLeft, ChevronRight, UserSquare2, Mail, Phone, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

interface Vendor {
  id: number;
  unique_id: string;
  name: string;
  business_name?: string;
  profile_photo?: string;
  phone: string;
  email?: string;
  address?: string;
  gst_number?: string;
  status: 'active' | 'inactive';
}

export default function VendorPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEditId, setConfirmEditId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_VENDORS);
      if (res.data.success) {
        setVendors(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleDelete = async () => {
    if (!selectedVendor) return;
    setFormLoading(true);
    try {
      // Using unique_id for delete to be consistent with other master data modules
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_VENDOR}/${selectedVendor.unique_id}`);
      if (res.data.success) {
        toast.success("Vendor deleted successfully");
        fetchVendors();
        setIsDeleteModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setFormLoading(false);
      setSelectedVendor(null);
    }
  };

  const { currentItems, totalPages } = useMemo(() => {
    const filtered = vendors.filter(v => 
      (v.name || "").toLowerCase().includes(search.toLowerCase()) || 
      (v.phone || "").includes(search) ||
      (v.unique_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.business_name || "").toLowerCase().includes(search.toLowerCase())
    );
    return {
      currentItems: filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  }, [vendors, search, currentPage]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserSquare2 size={20} /></div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Vendors</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory Master</p>
            </div>
          </div>
          <Button onClick={() => router.push("/inventory/master/vendor/add")} className="bg-blue-600 h-9 px-4 text-xs font-bold uppercase hover:bg-blue-700">
            <Plus size={16} className="mr-2" /> Add
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Search by name, phone or ID..." 
            className="pl-9 h-10 border-slate-200"
            value={search}
            onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
          />
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] uppercase font-bold text-slate-500">
                  <th className="px-6 py-3 text-left">Vendor Details</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                      <p className="text-sm text-slate-500 font-medium tracking-wide italic">Fetching vendors...</p>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                          <UserSquare2 size={32} className="text-slate-300" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-700">No Data Found</p>
                          <p className="text-sm text-slate-400">There are no vendors matching your search criteria.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {setSearch(""); setCurrentPage(1);}}
                          className="h-8 border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50"
                        >
                          Clear Search
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{v.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{v.unique_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600"><Phone size={12} className="text-slate-400" />{v.phone}</span>
                          {v.email && <span className="flex items-center gap-1.5 text-slate-400"><Mail size={12} />{v.email}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          v.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" onClick={() => router.push(`/inventory/master/vendor/view?id=${v.unique_id}`)} title="View Detail"><Eye size={16} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600" onClick={() => router.push(`/inventory/master/vendor/add?id=${v.unique_id}`)} title="Edit Record"><Edit2 size={16} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600" onClick={() => {setSelectedVendor(v); setIsDeleteModalOpen(true);}} title="Delete Vendor"><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3 pb-20">
          {loading ? (
            <div className="py-20 text-center bg-white rounded-xl border">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
              <p className="text-sm text-slate-500 font-medium tracking-wide">Fetching vendors...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-xl border shadow-sm flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner mb-4">
                <UserSquare2 size={32} className="text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-700">No Data Found</p>
              <p className="text-sm text-slate-400 mb-4 px-4">No vendors matching your search.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {setSearch(""); setCurrentPage(1);}}
                className="w-full max-w-[150px] border-slate-200 text-slate-600 font-bold uppercase text-[10px]"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            currentItems.map(v => (
              <div key={v.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-4 hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h2 className="font-extrabold text-slate-800 leading-tight">{v.name}</h2>
                    <p className="text-[10px] font-mono text-slate-400 tracking-tighter">{v.unique_id}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    v.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {v.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 py-3 border-y border-slate-50">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Phone</span>
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5 truncate"><Phone size={10} className="text-slate-300" /> {v.phone}</span>
                  </div>
                </div>

                    <div className="flex gap-1 w-full uppercase">
                      <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => router.push(`/inventory/master/vendor/view?id=${v.unique_id}`)}><Eye size={18} className="text-slate-400 mr-2" /> <span className="text-[10px] font-bold text-slate-600">View</span></Button>
                      <div className="w-[1px] bg-slate-200 my-2" />
                      <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => router.push(`/inventory/master/vendor/add?id=${v.unique_id}`)}><Edit2 size={16} className="text-slate-400 mr-2" /> <span className="text-[10px] font-bold text-slate-600">Edit</span></Button>
                      <div className="w-[1px] bg-slate-200 my-2" />
                      <Button variant="ghost" size="sm" className="flex-1 h-9 rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => {setSelectedVendor(v); setIsDeleteModalOpen(true);}}><Trash2 size={16} className="text-slate-400 mr-2" /> <span className="text-[10px] font-bold text-red-400">Delete</span></Button>
                    </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Confirmation Dialogs remain the same */}
      <SimpleConfirmDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} title="Delete Vendor?" message="Permanently delete this vendor?" onConfirm={handleDelete} loading={formLoading} destructive />
    </div>
  );
}