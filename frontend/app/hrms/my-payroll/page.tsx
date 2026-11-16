"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, Loader2, Calendar, FileText, Download, Eye, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSalaries } from "../api/hrmsApi";
import { format, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MyPayrollPage() {
  const router = useRouter();
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetchMySalaries = async () => {
    try {
      setLoading(true);
      // Backend automatically filters by employee_id for employee role
      const res = await getSalaries({ year: selectedYear });

      if (res.data.status === "success") {
        let salaryData = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.data || []);
        
        // Filter: only show months BEFORE current month
        salaryData = salaryData.filter((salary: any) => {
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          
          let salDate: Date;
          if (salary.month && salary.month.includes(' ')) {
            salDate = new Date(salary.month + " 1");
          } else if (salary.month) {
            salDate = new Date(salary.month + (salary.month.length === 7 ? "-01" : ""));
          } else {
            return true;
          }

          return salDate < currentMonthStart;
        });

        setSalaries(salaryData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your salary records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySalaries();
  }, [selectedYear]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'generated': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Salary & Slips</h1>
          <p className="text-slate-500 text-sm">View and download your monthly salary statements.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm px-3 py-1.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            {[0, 1, 2].map(yearDiff => {
              const year = new Date().getFullYear() - yearDiff;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm animate-pulse">Loading salary records...</p>
          </div>
        ) : salaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-semibold italic">No salary records found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">
              Salary slips appear here after they are generated for the month.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Month</TableHead>
                  <TableHead className="font-semibold text-slate-700">Earnings</TableHead>
                  <TableHead className="font-semibold text-slate-700">Deductions</TableHead>
                  <TableHead className="font-semibold text-slate-700 font-bold">Net Pay</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map((salary) => (
                  <TableRow key={salary.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {salary.month}
                    </TableCell>
                    <TableCell className="text-emerald-600">
                      ₹{parseFloat(salary.basic_pay || 0) + parseFloat(salary.allowances || 0)}
                    </TableCell>
                    <TableCell className="text-red-500">
                      ₹{parseFloat(salary.deductions || 0)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      ₹{parseFloat(salary.net_pay || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-medium capitalize", getStatusColor(salary.status))}>
                        {salary.status || 'Generated'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => router.push(`/hrms/payroll/records?id=${salary.id}`)}
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          title="Download Slip"
                        >
                          <Download className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">
          Salary slips are typically generated by the 5th of every month. If you notice any discrepancy, please contact the HR department.
        </p>
      </div>
    </div>
  );
}
