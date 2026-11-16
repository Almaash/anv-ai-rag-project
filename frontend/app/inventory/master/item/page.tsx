"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreHorizontal, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ItemPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Item Master</h1>
          <p className="text-slate-500 text-sm font-medium tracking-wide">Manage and monitor your Item Master data records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl font-bold bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button size="sm" className="h-10 px-5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95">
            <Plus size={16} className="mr-2" /> Add Record
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/5 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="px-6 py-5 border-b border-slate-50 bg-slate-50/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-slate-900" size={16} />
              <input 
                type="text" 
                placeholder="Search records..." 
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 transition-all"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:bg-slate-50">
                <Filter size={18} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">Quick Actions</p>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-100"><FileText size={14} /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-left'>Item Name</th>
<th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-left'>SKU</th>
<th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-left'>Category</th>
<th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-left'>Sales Price</th>
<th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-left'>Purchase Price</th>
<th className='px-6 py-4 text-[11px] font-black text-slate-400库 uppercase tracking-widest text-right'>Status</th>

                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {/* Static Placeholder Rows */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="group hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-0 cursor-pointer">
                    {/* Placeholder cells for each header */}
                    {Array(6).fill(null).map((_, idx) => (
                      <td key={idx} className={cn(
                        "px-6 py-5 text-sm font-medium",
                        idx === 0 ? "text-slate-900 font-bold" : "text-slate-500",
                        idx === 5 ? "text-right" : "text-left"
                      )}>
                        {idx === 5 ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Active</span>
                        ) : (
                            "---"
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-5 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-slate-900">
                        <MoreHorizontal size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50/20 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">Showing 5 of 24 records</p>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled className="h-8 px-3 rounded-lg text-xs font-bold">Prev</Button>
                <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold border-slate-900 text-slate-900">1</Button>
                <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold">2</Button>
                <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
