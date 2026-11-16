"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Calendar, Eye, ChevronRight, Filter } from "lucide-react";
import { format, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getSalaries } from "../../api/hrmsApi";

interface AttendanceSummary {
  present?: number;
  absent?: number;
  leaves?: number;
  off_days?: number;
  total_days?: number;
}

interface SalaryStructureRow {
  id?: number;
  record_id?: number;
  employee_id: number;
  employee_code?: string;
  name?: string;
  designation?: string;
  payout_id?: string | null;
  attendance?: AttendanceSummary;
  basic_salary?: string | number;
  net_pay?: string | number;
  status?: string;
  method?: string | null;
  month?: string;
  payment_date?: string | null;
  join_date?: string | null;
}

type ViewScope = "allEmployees" | "paidOnly";

const toNumber = (value: string | number | null | undefined) => Number(value || 0);
const toCurrency = (value: string | number | null | undefined) => `Rs ${toNumber(value).toLocaleString()}`;

const extractRows = (payload: unknown): SalaryStructureRow[] => {
  if (Array.isArray(payload)) return payload as SalaryStructureRow[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as SalaryStructureRow[];
  }
  return [];
};

export default function SalaryDetailsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SalaryStructureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [viewScope, setViewScope] = useState<ViewScope>("allEmployees");

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { month: selectedMonth };
      
      // Add status filter if needed
      if (viewScope === "paidOnly") {
        params.status = "paid";
      }
      
      // Add search filter if provided
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const salRes = await getSalaries(params);

      if (salRes.data.status === "success") {
        const data = extractRows(salRes.data.data);
        
        // Filter out employees who joined after the selected month
        const selectedDate = new Date(`${selectedMonth}-01`);
        const filteredData = data.filter((row) => {
          // If employee has join_date in response, check it
          if (row.join_date) {
            const joinDate = new Date(row.join_date);
            return joinDate <= selectedDate;
          }
          // If no join_date, include the record (backward compatibility)
          return true;
        });
        
        setRows(filteredData);
      } else {
        setRows([]);
      }
    } catch (err) {
      toast.error("Failed to load salary data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [selectedMonth, viewScope]);
  
  const handleSearch = () => {
    setSearchTerm(tempSearchTerm);
  };
  
  useEffect(() => {
    void fetchData();
  }, [searchTerm]);

  const selectedMonthLabel = useMemo(() => {
    const date = new Date(`${selectedMonth}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? selectedMonth : format(date, "MMMM yyyy");
  }, [selectedMonth]);

  const displayRows = useMemo(() => {
    // Since filtering is now done on the backend, just return the rows
    return rows;
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Salary Details</h1>
              <p className="text-sm text-gray-600 mt-1">Monthly payroll status with attendance and payout details</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
              <Calendar className="h-4 w-4 text-gray-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm text-gray-900 bg-transparent outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, employee ID, payout ID"
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setViewScope("allEmployees")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewScope === "allEmployees" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All Employees
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("paidOnly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewScope === "paidOnly" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Paid Only
                </button>
              </div>
              <Badge variant="outline" className="text-gray-700 font-medium">
                {selectedMonthLabel}
              </Badge>
              <Badge variant="outline" className="text-gray-700 font-medium">
                {displayRows.length} Records
              </Badge>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Payout ID</TableHead>
                <TableHead className="font-semibold">Attendance</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Method</TableHead>
                <TableHead className="text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span>Loading salary records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="text-gray-500">
                      <p className="font-medium">No records found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row) => {
                  const isPaid = String(row.status || "").toLowerCase() === "paid";
                  const recordId = row.record_id ?? row.id;
                  return (
                    <TableRow key={`${row.employee_id}-${row.month}`} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">{row.name || "-"}</p>
                          <p className="text-xs text-gray-600">
                            {row.employee_code || "-"} • {row.designation || "N/A"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm font-medium text-gray-900">{row.payout_id || "-"}</p>
                        <p className="text-xs text-gray-600">{row.payment_date || "-"}</p>
                      </TableCell>

                      <TableCell className="text-sm text-gray-700">
                        <div className="space-y-1">
                          <div className="font-medium">Total: {toNumber(row.attendance?.total_days)} days</div>
                          <div className="text-xs">
                            P: {toNumber(row.attendance?.present)} | A: {toNumber(row.attendance?.absent)} | L: {toNumber(row.attendance?.leaves)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">Basic: <span className="font-medium">{toCurrency(row.basic_salary)}</span></div>
                          <div className="text-sm text-gray-900 font-semibold">Net: {toCurrency(row.net_pay)}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isPaid
                              ? "bg-green-50 text-green-700 border-green-200 font-medium"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200 font-medium"
                          }
                        >
                          {row.status || "unpaid"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-gray-700">{row.method || "-"}</TableCell>

                      <TableCell className="text-right">
                        {isPaid ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              if (recordId) {
                                router.push(`/hrms/payroll/records?id=${recordId}`);
                                return;
                              }
                              router.push(
                                `/hrms/payroll/records?payoutId=${encodeURIComponent(row.payout_id || "")}&employeeId=${row.employee_id}&month=${encodeURIComponent(selectedMonth)}`
                              );
                            }}
                            className="border-gray-300 hover:bg-gray-50"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Slip
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => router.push(`/hrms/payroll/payout?employeeId=${row.employee_id}&month=${selectedMonth}`)}
                          >
                            Payout Detail
                            <ChevronRight className="ml-1 h-4 w-4" />
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
    </div>
  );
}
