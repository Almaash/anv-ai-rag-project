"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AttendanceCalendar from "../employees/view/AttendanceCalendar";
import { getHrmsDashboard, getAttendance, markBulkAttendance, markMultipleAttendance, getHrmsDepartments } from "../api/hrmsApi";

interface EmployeeProfile {
  id: number;
  joining_date: string;
}

interface AttendanceEmployee {
  employee_id: number;
  name: string;
  employee_code: string;
  designation?: string;
  status?: string;
  role?: string;
}

export default function AttendancePage() {
  const [userType, setUserType] = useState<string | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const type = localStorage.getItem("user_type");
    setUserType(type);
    
    if (type === "employee") {
      fetchEmployeeData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await getHrmsDashboard();
      if (response.data.status === "success" && response.data.data.employee_profile) {
        setEmployeeProfile(response.data.data.employee_profile);
      }
    } catch (error) {
      console.error("Failed to load employee profile", error);
      toast.error("Failed to load your profile information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (userType === "employee") {
    return (
      <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div className="w-full lg:w-auto">
            <h1 className="text-2xl md:text-3xl text-slate-900">
              Attendance History
            </h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Viewing your presence records for the selected period.
            </p>
          </div>

          {/* Improved Year Selection Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center overflow-hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="px-4 py-2 flex items-center gap-2 min-w-[120px] justify-center border-x border-slate-100">
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <span className="text-base text-slate-800">{currentYear}</span>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                disabled={currentYear >= new Date().getFullYear()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <select 
              value={currentYear} 
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm focus:ring-2 focus:ring-slate-200 outline-none cursor-pointer"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend Section */}
        <div className="flex overflow-x-auto pb-2 sm:pb-0 gap-2 sm:flex-wrap no-scrollbar">
          {[
            { label: "Present", color: "bg-green-500", icon: CheckCircle2 },
            { label: "Absent", color: "bg-red-500", icon: XCircle },
            { label: "Late", color: "bg-yellow-500", icon: Clock },
            { label: "Half Day", color: "bg-orange-500", icon: Info },
            { label: "Leave", color: "bg-purple-500", icon: AlertCircle },
            { label: "OT", color: "bg-cyan-500", icon: Clock },
            { label: "Holiday", color: "bg-slate-400", icon: CalendarIcon },
          ].map((item) => (
            <div key={item.label} className="flex-shrink-0 bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2 cursor-default">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-xs text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Attendance Calendar Container */}
        <div className="w-full">
          {employeeProfile?.id ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <AttendanceCalendar 
                  employeeId={employeeProfile.id} 
                  year={currentYear}
                  joiningDate={employeeProfile.joining_date}
                />
            </div>
          ) : (
            <Card className="border border-slate-200 bg-white rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-14 text-slate-500 text-center px-6">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg text-slate-900 mb-1">Profile Sync Required</h3>
                <p className="text-slate-500 max-w-sm">We couldn&apos;t synchronize your employee identification. Please contact HR to verify your system profile.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return <AdminAttendanceView />;
}

function AdminAttendanceView() {
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getHrmsDepartments();
        if (res.data.status === "success") {
          setDepartments(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch departments", error);
      }
    };
    fetchDepartments();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { 
        department_id: departmentFilter 
      };
      
      if (fromDate && toDate) {
        params.from_date = fromDate;
        params.to_date = toDate;
      } else {
        params.date = date;
      }

      const attendanceRes = await getAttendance(params);
      let attendanceRows = (attendanceRes.data || []) as any[];
      
      // If result is in range format (has .records), flatten it for the list view or handle differently
      // For now, index(Request) returns flat list if date is single, else range structure.
      // We expect the user mostly wants to see the list for a specific day or a simplified summary.
      // If we are in range mode, we'll just show the first day's status or similar for the list.
      if (attendanceRows.length > 0 && attendanceRows[0].records) {
        // Range mode: simple transform for the table
        attendanceRows = attendanceRows.map(emp => ({
          ...emp,
          status: emp.records[0]?.status, // Show first day in range
          note: emp.records[0]?.note
        }));
      }

      setEmployees(attendanceRows);
      setSelectedEmployeeIds((prev) =>
        prev.filter((employeeId) => attendanceRows.some((row) => row.employee_id === employeeId))
      );
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [date, fromDate, toDate, departmentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markStatus = async (employeeId: number, status: string) => {
    try {
      await markBulkAttendance({ employee_id: employeeId, date, status });
      toast.success("Attendance marked");
      fetchData();
    } catch {
      toast.error("Failed to mark attendance");
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
      return;
    }
    setSelectedEmployeeIds(employees.map((emp) => emp.employee_id));
  };

  const toggleSelectEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const markSelectedStatus = async (status: string) => {
    if (selectedEmployeeIds.length === 0) return;
    try {
      await markMultipleAttendance({
        employee_ids: selectedEmployeeIds,
        date,
        status,
      });
      toast.success("Attendance updated for selected employees");
      setSelectedEmployeeIds([]);
      fetchData();
    } catch {
      toast.error("Failed to update selected attendance");
    }
  };

  const getStatusButton = (emp: AttendanceEmployee, status: string, label: string, color: string) => {
    const isActive = emp.status === status;
    return (
      <button
        className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
          isActive 
            ? `${color} text-white` 
            : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
        onClick={() => markStatus(emp.employee_id, status)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-slate-900">
            Attendance Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track daily attendance.</p>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-4 md:p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-slate-700 flex items-center gap-2">
                 <CalendarIcon className="h-4 w-4 text-slate-500" />
                 Single Date
              </label>
              <input 
                type="date" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:opacity-50" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                disabled={!!(fromDate && toDate)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-slate-700">From Date</label>
              <input 
                type="date" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-slate-700">To Date</label>
              <input 
                type="date" 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-slate-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                Department
              </label>
              <select 
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 cursor-pointer"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(fromDate || toDate) && (
            <div className="mt-3 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-blue-600 hover:text-blue-700 h-7"
                onClick={() => { setFromDate(""); setToDate(""); }}
              >
                Clear Range
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              {selectedEmployeeIds.length} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selectedEmployeeIds.length === 0}
                onClick={() => markSelectedStatus("present")}
              >
                Mark Present
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selectedEmployeeIds.length === 0}
                onClick={() => markSelectedStatus("half-day")}
              >
                Mark Half Day
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selectedEmployeeIds.length === 0}
                onClick={() => markSelectedStatus("absent")}
              >
                Mark Absent
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px] sm:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-medium text-slate-600 uppercase tracking-wide w-12 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={employees.length > 0 && selectedEmployeeIds.length === employees.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all employees"
                  />
                </th>
                <th className="px-5 py-4 text-xs font-medium text-slate-600 uppercase tracking-wide">Employee Name</th>
                <th className="px-5 py-4 text-xs font-medium text-slate-600 uppercase tracking-wide">Employee ID</th>
                <th className="px-5 py-4 text-xs font-medium text-slate-600 uppercase tracking-wide">Designation</th>
                <th className="px-5 py-4 text-xs font-medium text-slate-600 uppercase tracking-wide text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                      <span className="text-slate-500 text-sm">Loading attendance...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedEmployeeIds.includes(emp.employee_id)}
                        onChange={() => toggleSelectEmployee(emp.employee_id)}
                        aria-label={`Select ${emp.name}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 text-slate-700 h-10 w-10 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0 text-slate-900 text-sm sm:text-base">{emp.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-white border-slate-200 text-slate-500 uppercase">
                        {emp.employee_code || "-"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {emp.designation || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        {emp.status === 'not-joined' ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none px-3">
                            Not Joined Yet
                          </Badge>
                        ) : (
                          <>
                            {getStatusButton(emp, 'present', 'P', 'bg-green-500')}
                            {getStatusButton(emp, 'half-day', 'HD', 'bg-orange-500')}
                            {getStatusButton(emp, 'absent', 'A', 'bg-red-500')}
                            {getStatusButton(emp, 'late', 'L', 'bg-yellow-500')}
                            {getStatusButton(emp, 'overtime', 'OT', 'bg-cyan-500')}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
