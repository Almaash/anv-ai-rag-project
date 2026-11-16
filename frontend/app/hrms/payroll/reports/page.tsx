"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Download, Filter, Calendar, Users, 
  CreditCard, TrendingUp, BarChart3, PieChart,
  ArrowUpRight, Loader2, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { getSalaries, getEmployees } from "../../api/hrmsApi";

export default function PayrollReportsPage() {
  const [loading, setLoading] = useState(true);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Pass month or range as proper objects to match axios expectations
      const params: any = {};
      
      if (fromDate && toDate) {
        params.from_date = fromDate;
        params.to_date = toDate;
      } else {
        params.month = selectedMonth;
      }

      const salRes = await getSalaries(params);
      
      if (salRes.data.status === "success") {
        setSalaryRecords(salRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    fetchData();
  };

  const filteredRecords = salaryRecords.filter(record => {
    const matchesSearch = record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPayroll = filteredRecords.reduce((sum, record) => sum + parseFloat(record.net_pay || 0), 0);
  const avgSalary = filteredRecords.length > 0 ? totalPayroll / filteredRecords.length : 0;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Reports</h1>
          <p className="text-slate-500">Comprehensive payroll analytics and reporting.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
            {/* <div className="flex items-center gap-2 border-r pr-3">
              <span className="text-xs text-slate-400 font-medium uppercase">By Month</span>
              <Calendar className="h-4 w-4 text-blue-600" />
              <input
                type="month"
                className="border-none focus:ring-0 text-sm font-medium"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setFromDate("");
                  setToDate("");
                }}
              />
            </div> */}
            <div className="flex items-center gap-2 pr-3 border-r">
              <span className="text-xs text-slate-400 font-medium uppercase ml-2">Range</span>
              <input
                type="date"
                className="border-none focus:ring-0 text-sm font-medium bg-transparent"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From"
              />
              <span className="text-slate-300">-</span>
              <input
                type="date"
                className="border-none focus:ring-0 text-sm font-medium bg-transparent"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To"
              />
            </div>
            <Button 
              onClick={fetchData} 
              size="sm" 
              variant="ghost" 
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-8"
            >
              <Search className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
          {/* <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button> */}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <div className="bg-blue-50 p-2 rounded-full">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPayroll.toLocaleString()}</div>
            <p className="text-xs text-slate-500">
              {fromDate && toDate 
                ? `${format(new Date(fromDate), "dd MMM")} - ${format(new Date(toDate), "dd MMM yyyy")}`
                : `For ${format(new Date(selectedMonth), "MMMM yyyy")}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Employees Paid</CardTitle>
            <div className="bg-green-50 p-2 rounded-full">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRecords.filter(r => r.status === 'paid').length}</div>
            <p className="text-xs text-slate-500">Out of {filteredRecords.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
            <div className="bg-purple-50 p-2 rounded-full">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(avgSalary).toLocaleString()}</div>
            <p className="text-xs text-slate-500">Per employee average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
            <div className="bg-orange-50 p-2 rounded-full">
              <PieChart className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredRecords.length > 0 ? ((filteredRecords.filter(r => r.status === 'paid').length / filteredRecords.length) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-slate-500">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Records Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Payroll Records</CardTitle>
              <CardDescription>
                Detailed salary disbursement records for {fromDate && toDate 
                  ? `${format(new Date(fromDate), "dd MMM yyyy")} to ${format(new Date(toDate), "dd MMM yyyy")}` 
                  : format(new Date(selectedMonth), "MMMM yyyy")}.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employees..."
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Employee Details</TableHead>
                  <TableHead className="font-semibold">Bank Information</TableHead>
                  <TableHead className="font-semibold">Attendance</TableHead>
                  <TableHead className="font-semibold text-right">Basic Salary</TableHead>
                  <TableHead className="font-semibold text-right">Net Pay</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <TableRow key={record.employee_id || index} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{record.name || "N/A"}</div>
                          <div className="text-xs text-slate-500 font-mono tracking-tighter">{record.employee_code || "N/A"}</div>
                          <div className="flex gap-2 pt-1">
                            {record.personal_detail?.pan_number && (
                              <Badge variant="outline" className="text-[9px] font-normal py-0 px-1 border-slate-200 text-slate-500">
                                PAN: {record.personal_detail.pan_number}
                              </Badge>
                            )}
                            {record.personal_detail?.aadhaar_number && (
                              <Badge variant="outline" className="text-[9px] font-normal py-0 px-1 border-slate-200 text-slate-500">
                                UID: {record.personal_detail.aadhaar_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.bank_details ? (
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium text-slate-700 uppercase">{record.bank_details.bank_name || "Bank N/A"}</div>
                            <div className="text-slate-500 font-mono">A/C: {record.bank_details.account_number || "N/A"}</div>
                            <div className="text-slate-400 text-[10px]">IFSC: {record.bank_details.ifsc_code || "N/A"}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-light tracking-wide">Details pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between w-24">
                            <span>Present:</span>
                            <span className="font-medium text-green-600">{record.attendance?.present}</span>
                          </div>
                          <div className="flex justify-between w-24 text-red-600">
                            <span>Absent:</span>
                            <span className="font-medium">{record.attendance?.absent}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">₹{parseFloat(record.basic_salary || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-700">₹{parseFloat(record.net_pay || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold tracking-wider",
                          record.status === 'paid' 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        )}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>No payroll data found for the selected period.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}