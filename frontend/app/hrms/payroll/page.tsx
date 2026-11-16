"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, DollarSign, Loader2, Calendar, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalaries } from "../api/hrmsApi";
import { getHrmsDepartments } from "../api/hrmsApi";
import { format, subMonths } from "date-fns";
import { useRouter } from "next/navigation";

export default function PayrollPage() {
  const router = useRouter();
  const [salaryRows, setSalaryRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const type = localStorage.getItem("user_type");
    setUserType(type);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { 
        month: selectedMonth,
        page: currentPage,
        per_page: 15,
      };
      
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (departmentFilter) params.department_id = departmentFilter;

      // console.log('Sending params:', params);

      const salRes = await getSalaries(params);

      if (salRes.data.status === "success") {
        const data = salRes.data.data;
        if (data.data) {
          setSalaryRows(data.data);
          setCurrentPage(data.current_page);
          setTotalPages(data.last_page);
          setTotal(data.total);
        } else {
          setSalaryRows(Array.isArray(data) ? data : []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      } else {
        setSalaryRows([]);
        setTotal(0);
      }
    } catch (err) {
      toast.error("Failed to load payroll information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getHrmsDepartments();
        if (res.data.status === "success") {
          setDepartments(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, currentPage, statusFilter, departmentFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchData();
      } else {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isEmployee = userType === "employee";

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-lg flex items-center gap-2 text-slate-900">
            <DollarSign className="text-blue-600 h-5 w-5" /> Employee Salary Listing
          </h1>
          <p className="text-slate-500 text-xs">Select a month to process payroll for employees.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none focus-visible:ring-0 w-32 h-7 text-xs"
          />
        </div>
      </div>

      {/* Filters */}
      {!isEmployee && (
        <div className="bg-white p-3 rounded-lg border space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-200 text-xs focus:ring-1 focus:ring-blue-100 outline-none"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-200 text-xs focus:ring-1 focus:ring-blue-100 outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          {(search || statusFilter || departmentFilter) && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{total} results found</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setDepartmentFilter("");
                }}
                className="h-6 text-xs"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] py-2">Emp ID</TableHead>
              <TableHead className="text-[10px] py-2">Employee Name</TableHead>
              <TableHead className="text-[10px] py-2">Department</TableHead>
              <TableHead className="text-[10px] py-2">Basic Salary</TableHead>
              <TableHead className="text-center text-[10px] py-2">Present Days</TableHead>
              <TableHead className="text-center text-[10px] py-2">Status</TableHead>
              <TableHead className="text-right text-[10px] py-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </TableCell>
              </TableRow>
            ) : salaryRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500 text-xs">No personnel records.</TableCell>
              </TableRow>
            ) : (
              salaryRows.map((salary) => {
                const isPaid = String(salary?.status || "").toLowerCase() === "paid";
                const recordId = salary?.id || salary?.record_id;
                return (
                  <TableRow key={salary.employee_id} className="hover:bg-slate-50">
                    <TableCell className="text-blue-600 text-xs py-2">{salary.employee_code}</TableCell>
                    <TableCell className="py-2">
                      <div className="text-xs text-slate-900">{salary.first_name} {salary.last_name || ''}</div>
                      <div className="text-[10px] text-slate-500">{salary.designation}</div>
                    </TableCell>
                    <TableCell className="text-xs py-2">{salary.department}</TableCell>
                    <TableCell className="text-xs py-2">₹{salary.basic_salary || '0'}</TableCell>
                    <TableCell className="text-center py-2">
                      <span className="text-xs text-green-600">{salary.present_days} / {salary.total_working_days}</span>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase ${
                        isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {isPaid ? "paid" : "unpaid"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {isPaid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            recordId
                              ? router.push(`/hrms/payroll/records?id=${recordId}`)
                              : router.push(`/hrms/payroll/records?payoutId=${encodeURIComponent(salary?.payout_id || "")}&employeeId=${salary.employee_id}&month=${selectedMonth}`)
                          }
                          className="h-7 text-[10px] px-2"
                        >
                          View Slip
                        </Button>
                      ) : (
                        !isEmployee && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => router.push(`/hrms/payroll/payout?employeeId=${salary.employee_id}&month=${selectedMonth}`)}
                            className="bg-indigo-600 hover:bg-indigo-700 h-7 text-[10px] px-2"
                          >
                            Process <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border">
          <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
