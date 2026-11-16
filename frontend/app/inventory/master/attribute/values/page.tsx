"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit2, X, Save, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";

function ValuesContent() {
  const searchParams = useSearchParams();
  const attrId = searchParams.get('id');
  const attrName = searchParams.get('name') || "Attribute";

  const [attribute, setAttribute] = useState<any>(null);
  const [values, setValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeValue, setActiveValue] = useState("");

  const fetchAttributeDetails = async () => {
    if (!attrId) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${ProjectApiList.GET_SINGLE_ATTRIBUTE}/${attrId}`);
      if (res.data.success) {
        setAttribute(res.data.data);
        const valsString = res.data.data.values || "";
        setValues(valsString ? valsString.split(',') : []);
      }
    } catch (err) { toast.error("Failed to load details"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAttributeDetails(); }, [attrId]);

  const saveToBackend = async (newValues: string[]) => {
    if (!attrId || !attribute) return;
    setSaveLoading(true);
    try {
      // Use standard update endpoint with either ID or Unique ID
      const res = await axiosInstance.post(`${ProjectApiList.UPDATE_ATTRIBUTE}/${attribute.unique_id}`, {
        name: attribute.name,
        status: attribute.status,
        values: newValues.join(",")
      });
      if (res.data.success) {
        setValues(newValues);
        toast.success("Updated successfully");
      }
    } catch (err: any) { toast.error("Failed to save changes"); } finally { setSaveLoading(false); }
  };

  const addValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || values.includes(newValue.trim())) return;
    saveToBackend([...values, newValue.trim()]);
    setNewValue("");
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <nav className="border-b bg-white sticky top-0 z-30 h-16 sm:h-20 flex items-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex items-center gap-4">
          <Link href="/inventory/master/attribute" className="h-9 w-9 flex items-center justify-center rounded-full border hover:bg-slate-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">Manage: {attribute?.name || attrName}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Configuration Pool</p>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Add Form */}
          {/* <div className="bg-white border rounded-xl p-6 shadow-sm h-fit">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
               <Plus size={16} /> Add Value
            </h3>
            <form onSubmit={addValue} className="space-y-4">
              <Input 
                placeholder="Enter new value" 
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-11 border-slate-200"
                required
              />
              <Button type="submit" disabled={saveLoading} className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-[10px] font-bold uppercase">
                {saveLoading ? <Loader2 className="animate-spin" size={16} /> : "Save Value"}
              </Button>
            </form>
          </div> */}

          {/* List */}
          <div className="md:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
               <span className="text-[11px] font-bold uppercase tracking-widest">Available Options</span>
            </div>
            <div className="divide-y">
              {values.length > 0 ? values.map((val, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between">
                  <span className="font-bold text-sm">{val}</span>
                  <div className="flex gap-2">
                    {/* <Button variant="ghost" size="sm" onClick={() => { setActiveIndex(index); setActiveValue(val); setIsEditModalOpen(true); }}><Edit2 size={16} /></Button> */}
                    {/* <Button variant="ghost" size="sm" onClick={() => { setActiveIndex(index); setActiveValue(val); setIsDeleteModalOpen(true); }}><Trash2 size={16} className="text-red-500" /></Button> */}
                  </div>
                </div>
              )) : <div className="py-20 text-center text-slate-400 text-[10px] font-bold uppercase">No values configured</div>}
            </div>
          </div>
        </div>
      </main>

      {/* Simplified Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-sm p-8 space-y-6 shadow-2xl border border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Update Value</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Change attribute option</p>
            </div>
            <div className="space-y-4 pt-2">
              <Input 
                value={activeValue} 
                onChange={(e) => setActiveValue(e.target.value)} 
                className="h-12 border-slate-200 font-bold text-slate-700" 
                placeholder="Enter value"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 border-slate-200" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100" onClick={() => { 
                  if (!activeValue.trim()) return;
                  const u = [...values]; 
                  u[activeIndex!] = activeValue.trim(); 
                  saveToBackend(u); 
                  setIsEditModalOpen(false); 
                }}>Update Now</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-sm p-8 space-y-6 shadow-2xl border border-rose-50">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 text-rose-500 shadow-inner">
                 <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Delete Value?</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 leading-relaxed">
                  Are you sure you want to remove <span className="text-rose-600 font-black">"{activeValue}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-11 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 border-slate-200" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-100 text-white" onClick={() => { 
                const u = values.filter((_, i) => i !== activeIndex);
                saveToBackend(u); 
                setIsDeleteModalOpen(false); 
              }}>Delete Now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttributeValuesPage() {
  return <Suspense fallback={<div className="p-20 text-center animate-pulse">Syncing...</div>}><ValuesContent /></Suspense>;
}
