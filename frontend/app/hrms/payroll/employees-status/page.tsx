"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, Search, Filter, Loader2, ArrowRight, 
  Calendar, DollarSign, CheckCircle2, XCircle, CreditCard, ChevronRight, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { getEmployees, getSalaries } from "../../api/hrmsApi";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function PayrollEmployeesStatusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, salRes] = await Promise.all([
        getEmployees(),
        getSalaries()
      ]);

      if (empRes.data.status === "success") {
        setEmployees(empRes.data.data || []);
      }
      if (salRes.data.status === "success") {
        setSalaries(salRes.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load payroll status data");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentStatus = (employeeId: number) => {
    const monthStr = format(new Date(selectedMonth), "MMMM yyyy");
    const salaryRecord = salaries.find(s => 
      s.employee_id === employeeId && 
      s.month === monthStr
    );

    if (!salaryRecord) return { label: "Not Processed", color: "bg-slate-100 text-slate-600", icon: <XCircle className="h-3 w-3" />, record: null };
    if (salaryRecord.status === 'paid') return { label: "Paid", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" />, record: salaryRecord };
    return { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: <CreditCard className="h-3 w-3" />, record: salaryRecord };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
            <Users className="text-blue-600 h-6 w-6" /> Payroll Status & Records
          </h1>
          <p className="text-muted-foreground">Monitor payment statuses and process monthly disbursements.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r h-8">
             <Calendar className="h-4 w-4 text-slate-500" />
             <Input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-none focus-visible:ring-0 w-36 h-full p-0 text-sm font-semibold"
             />
          </div>
          <div className="flex items-center gap-2 pl-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Employee..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none focus-visible:ring-0 w-48 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border flex items-center gap-4 shadow-sm">
             <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="h-6 w-6" />
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Workforce</p>
                <p className="text-2xl font-bold">{employees.length}</p>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border flex items-center gap-4 shadow-sm">
             <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-6 w-6" />
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Paid This Month</p>
                <p className="text-2xl font-bold">
                    {employees.filter(emp => getPaymentStatus(emp.id).label === "Paid").length}
                </p>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border flex items-center gap-4 shadow-sm">
             <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                <Filter className="h-6 w-6" />
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Remaining Payouts</p>
                <p className="text-2xl font-bold">
                    {employees.filter(emp => getPaymentStatus(emp.id).label !== "Paid").length}
                </p>
             </div>
          </div>
      </div>

      <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px]">Employee ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Basic Salary</TableHead>
              <TableHead className="text-center">Payment Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Retrieving records...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                  No matching employees found for {format(new Date(selectedMonth), "MMMM yyyy")}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const status = getPaymentStatus(emp.id);
                return (
                  <TableRow key={emp.id} className="group hover:bg-slate-50/80 transition-all border-b last:border-0">
                    <TableCell className="font-bold text-blue-600">{emp.employee_id}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{emp.designation?.name || "Unassigned"}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{emp.department?.name}</div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      ₹{emp.basic_salary?.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset",
                        status.color
                      )}>
                        {status.icon}
                        {status.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {status.record ? (
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/hrms/payroll/records?id=${status.record.id}`)}
                            className="rounded-xl border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all h-9 bg-white shadow-sm gap-1"
                          >
                             <Eye className="h-4 w-4" /> View Slip
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/hrms/payroll/payout?employeeId=${emp.id}&month=${selectedMonth}`)}
                            className="rounded-xl border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all h-9 bg-white shadow-sm"
                          >
                             Update Payout <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/hrms/payroll/payout?employeeId=${emp.id}&month=${selectedMonth}`)}
                          className="rounded-xl border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all h-9 bg-white shadow-sm"
                        >
                          Process Payout <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
