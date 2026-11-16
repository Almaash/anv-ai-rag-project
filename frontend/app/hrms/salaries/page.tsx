"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, DollarSign, Loader2, Download, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalaries, generateSalary, updatePayoutStatus, getEmployees } from "../api/hrmsApi";

export default function SalariesPage() {
  const [userType, setUserType] = useState<string | null>(null);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  
  const [formData, setFormData] = useState({
    employee_id: "",
    month: "January 2026",
    basic_pay: "0",
    allowances: "0",
    deductions: "0",
    net_pay: "0",
    status: "pending",
    payment_method: "Bank Transfer"
  });

  useEffect(() => {
    setUserType(localStorage.getItem("user_type"));
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isEmployee = localStorage.getItem("user_type") === "employee";
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedMonth) params.month = selectedMonth;
      
      const [salRes, empRes] = await Promise.all([
        getSalaries(params),
        !isEmployee ? getEmployees() : Promise.resolve({ data: { status: "success", data: [] } })
      ]);
      
      if (salRes.data.status === "success") {
        let salaryData = Array.isArray(salRes.data.data) ? salRes.data.data : [];
        
        // Filter out salary records for future months AND before joining date
        salaryData = salaryData.filter((salary: any) => {
          const now = new Date();
          const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          // Determine salary month (supports formats like "January 2026" or "2026-01")
          let salDate: Date;
          if (salary.month && salary.month.includes(' ')) {
            salDate = new Date(salary.month + " 1");
          } else if (salary.month) {
            salDate = new Date(salary.month + (salary.month.length === 7 ? "-01" : ""));
          } else {
            return true;
          }

          // If current month or future month, don't show
          if (salDate >= currentMonth) return false;
          
          // Show past months' details even if before joining date
          return true;
        });
        
        setSalaries(salaryData);
      }
      
      if (empRes.data.status === "success") {
        setEmployees(empRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payout data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateNet = () => {
    const basic = parseFloat(formData.basic_pay) || 0;
    const allow = parseFloat(formData.allowances) || 0;
    const ded = parseFloat(formData.deductions) || 0;
    setFormData({ ...formData, net_pay: (basic + allow - ded).toString() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await generateSalary(formData);
      toast.success("Salary record generated");
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      toast.error("Generation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updatePayoutStatus(id, { status, payment_date: new Date().toISOString().split('T')[0] });
      toast.success(`Marked as ${status}`);
      fetchData();
    } catch (err) {
      toast.error("Status update failed");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userType === 'employee' ? 'My Payroll Reports' : 'Payroll Payouts'}
            </h1>
            <p className="text-gray-600 mt-1">
              {userType === 'employee' ? 'View your monthly salary disbursements' : 'Manage monthly salary disbursements'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employee..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Input
              type="month"
              className="w-full md:w-40"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <Button onClick={handleSearch} variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-700">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
            {userType !== 'employee' && (
              <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Generate Payout
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Salary ID</TableHead>
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Month</TableHead>
              <TableHead className="font-semibold">Basic</TableHead>
              <TableHead className="font-semibold">Allowances</TableHead>
              <TableHead className="font-semibold">Deductions</TableHead>
              <TableHead className="font-bold">Net Pay</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="animate-spin h-5 w-5 text-blue-600"/>
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : salaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="text-gray-500">
                    <p className="font-medium">No records found</p>
                    <p className="text-sm mt-1">Generate your first payout to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              salaries.map((s) => {
                const isPaid = String(s.status || "").toLowerCase() === "paid";
                return (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-semibold text-blue-600">
                    {s.payout_id || s.salary_id || `SAL-${s.id}`}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-sm text-gray-900">
                      {s.name || (s.employee?.first_name ? `${s.employee.first_name} ${s.employee.last_name}` : 'N/A')}
                    </div>
                    <div className="text-xs text-gray-600">{s.employee_code || s.employee?.employee_id || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-700">{s.month}</TableCell>
                  <TableCell className="font-medium text-gray-700">Rs {s.basic_pay || s.basic_salary || 0}</TableCell>
                  <TableCell className="font-medium text-green-700">Rs {s.allowances || 0}</TableCell>
                  <TableCell className="font-medium text-red-700">Rs {s.deductions || 0}</TableCell>
                  <TableCell className="font-bold text-blue-700">Rs {s.net_pay || 0}</TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      s.status === 'paid' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    )}>
                      {s.status?.toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-2">
                    {/* {userType !== 'employee' && s.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(s.id, 'paid')} className="border-gray-300">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Mark Paid
                      </Button>
                    )} */}
                    {isPaid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300"
                        onClick={() => window.location.href = `/hrms/payroll/records?id=${s.salary_db_id || s.id}`}
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="ml-1">View</span>
                      </Button>
                    ) : userType !== "employee" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300"
                        onClick={() => window.location.href = "/hrms/payroll"}
                      >
                        Go Payroll
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate Monthly Payout</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
               <div><Label>Select Employee</Label><select className="w-full border rounded p-2 h-10 mt-1" required
                value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})}>
                <option value="">Choose Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.user?.name}</option>)}
              </select></div>
               <div><Label>Payment Month</Label><Input className="mt-1" required placeholder="e.g. Feb 2026"
                value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})}/></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div><Label>Basic Salary</Label><Input className="mt-1" type="number" onBlur={calculateNet}
                value={formData.basic_pay} onChange={e => setFormData({...formData, basic_pay: e.target.value})}/></div>
               <div><Label>Allowances</Label><Input className="mt-1" type="number" onBlur={calculateNet}
                value={formData.allowances} onChange={e => setFormData({...formData, allowances: e.target.value})}/></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div><Label>Deductions</Label><Input className="mt-1" type="number" onBlur={calculateNet}
                value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})}/></div>
               <div><Label>Net Payout</Label><Input className="mt-1 bg-gray-50 font-bold" type="number" readOnly
                value={formData.net_pay}/></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div><Label>Method</Label><select className="w-full border rounded p-2 h-10 mt-1"
                value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                  <option>Bank Transfer</option><option>Cash</option><option>Cheque</option>
              </select></div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-blue-600">Generate Slip</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
