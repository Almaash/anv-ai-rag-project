"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, Download, PlusSquare, Filter, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface SaleRecord {
  id: number;
  product_name: string;
  attribute_summary: string;
  quantity: number;
  selling_price: number;
  total_amount: number;
  sale_source: string;
  customer_reference?: string;
  sale_date: string;
}

export default function SalesListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.SALES_LIST);
      if (res.data.success) {
        setSales(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load sales history", err);
      toast.error("Failed to load sales history");
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.product_name.toLowerCase().includes(search.toLowerCase()) || 
    (s.customer_reference || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FBFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white shadow-sm border border-slate-100">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sales History</h1>
              <p className="text-sm text-slate-500 font-medium">Tracking all direct issues and sales records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button onClick={() => router.push("/inventory/direct-sale")} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] h-11 px-6 shadow-md shadow-blue-100 transition-all active:scale-95">
                <PlusSquare size={16} className="mr-2" /> New Direct Sale
             </Button>
             <Button variant="outline" className="rounded-xl border-slate-200 h-11 px-4 text-slate-500 font-bold">
                <Download size={16} />
             </Button>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <CardTitle className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <Package size={14} /> Sold Products Records
                </CardTitle>
                <div className="relative w-full md:w-80">
                   <Input 
                      placeholder="Search product or reference..." 
                      className="rounded-xl border-slate-200 bg-slate-50/50 pl-10 focus:bg-white" 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                   />
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             {loading ? (
                <div className="p-20 text-center space-y-4">
                   <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Loading sales records...</p>
                </div>
             ) : (
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Product Name / Attribute</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Qty</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Selling Price</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Total Amount</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {filteredSales.length > 0 ? filteredSales.map((sale) => (
                            <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                               <TableCell className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                  {new Date(sale.sale_date).toLocaleDateString()} <br/>
                                  <span className="text-[10px] font-normal italic opacity-60">{new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </TableCell>
                               <TableCell>
                                  <div className="flex flex-col">
                                     <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{sale.product_name}</span>
                                     <span className="text-[10px] font-bold text-blue-500 uppercase">{sale.attribute_summary || 'Default'}</span>
                                     {sale.customer_reference && <span className="text-[9px] font-medium text-slate-400 italic">Ref: {sale.customer_reference}</span>}
                                  </div>
                               </TableCell>
                               <TableCell className="text-center">
                                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-[11px] font-black">{sale.quantity} Units</span>
                               </TableCell>
                               <TableCell className="text-right text-[11px] font-bold text-slate-600">₹ {Number(sale.selling_price).toLocaleString()}</TableCell>
                               <TableCell className="text-right text-[13px] font-black text-blue-600">₹ {Number(sale.total_amount).toLocaleString()}</TableCell>
                               <TableCell className="text-center">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${sale.sale_source === 'inventory' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                     {sale.sale_source}
                                  </span>
                               </TableCell>
                            </TableRow>
                         )) : (
                            <TableRow>
                               <TableCell colSpan={6} className="p-20 text-center">
                                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">No records found matching your query</p>
                               </TableCell>
                            </TableRow>
                         )}
                      </TableBody>
                   </Table>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
