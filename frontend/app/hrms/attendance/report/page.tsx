"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  Search,
  Loader2,
  TrendingUp,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAttendanceReport } from "../../api/hrmsApi";

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  on_leave: number;
  overtime: number;
  total_working_days: number;
  not_joined: number;
}

interface ReportItem {
  employee_id: number;
  employee_code: string;
  name: string;
  department: string;
  designation: string;
  joining_date: string;
  summary: AttendanceSummary;
}

export default function AttendanceReportPage() {
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAttendanceReport({ from_date: fromDate, to_date: toDate });
      if (response.data.status === "success") {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch report", error);
      toast.error("Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportReport = () => {
      // In a real app, this would generate CSV or Excel
      toast.success("Generating export...");
      
      const headers = ["Employee ID", "Name", "Department", "Designation", "Present", "Absent", "Late", "Half Day", "Leave", "Overtime", "Working Days"];
      const rows = reportData.map(item => [
          item.employee_code,
          item.name,
          item.department,
          item.designation,
          item.summary.present,
          item.summary.absent,
          item.summary.late,
          item.summary.half_day,
          item.summary.on_leave,
          item.summary.overtime,
          item.summary.total_working_days
      ]);
      
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_report_${fromDate}_to_${toDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 space-y-3">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Attendance Report
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Summary of employee presence and leave performance.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white border-slate-200 text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 text-xs h-8"
          onClick={exportReport}
          disabled={reportData.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="border border-slate-200 rounded-lg overflow-hidden">
        <CardContent className="p-3 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                From Date
              </label>
              <input 
                type="date" 
                className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-blue-100 outline-none" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                To Date
              </label>
              <input 
                type="date" 
                className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-blue-100 outline-none" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
              />
            </div>
            <div className="flex items-center w-full">
               <Button 
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs"
                onClick={fetchReport}
                disabled={loading}
               >
                 {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                 Generate
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard 
            title="Avg. Presence" 
            value={reportData.length > 0 ? (reportData.reduce((acc, item) => acc + (item.summary.present / item.summary.total_working_days), 0) / reportData.length * 100).toFixed(1) + "%" : "0%"}
            icon={CheckCircle2}
            color="text-green-600"
            bg="bg-green-50"
          />
          <StatCard 
            title="Total Working Days" 
            value={reportData[0]?.summary.total_working_days || 0}
            icon={CalendarDays}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard 
            title="Total Employees" 
            value={reportData.length}
            icon={Users}
            color="text-purple-600"
            bg="bg-purple-50"
          />
          <StatCard 
            title="Avg. Absence" 
            value={reportData.length > 0 ? (reportData.reduce((acc, item) => acc + (item.summary.absent / item.summary.total_working_days), 0) / reportData.length * 100).toFixed(1) + "%" : "0%"}
            icon={XCircle}
            color="text-red-600"
            bg="bg-red-50"
          />
      </div>

      {/* Report Table */}
      <Card className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase">Employee</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase">Dept/Desig</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-green-600 uppercase text-center">P</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-red-600 uppercase text-center">A</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-yellow-600 uppercase text-center">L</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-orange-600 uppercase text-center">HD</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-purple-600 uppercase text-center">LV</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-cyan-600 uppercase text-center">OT</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <p className="text-slate-500 text-xs">Processing...</p>
                    </div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarIcon className="h-6 w-6 text-slate-300" />
                      <p className="text-slate-500 text-xs">No records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reportData.map((item) => {
                    const presenceRate = ((item.summary.present / item.summary.total_working_days) * 100) || 0;
                    return (
                        <tr key={item.employee_id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-900">{item.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{item.employee_code}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-700">{item.department}</span>
                              <span className="text-[9px] text-slate-500">{item.designation}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-green-700">{item.summary.present}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-red-700">{item.summary.absent}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-yellow-700">{item.summary.late}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-orange-700">{item.summary.half_day}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-purple-700">{item.summary.on_leave}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-medium text-cyan-700">{item.summary.overtime}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-[10px] font-bold ${presenceRate > 90 ? 'text-green-600' : presenceRate > 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {presenceRate.toFixed(1)}%
                                </span>
                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${presenceRate > 90 ? 'bg-green-500' : presenceRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${presenceRate}%` }}
                                    />
                                </div>
                            </div>
                          </td>
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Help Legend */}
      <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 font-medium uppercase">
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-green-500 rounded-full" /> P: Present</span>
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-red-500 rounded-full" /> A: Absent</span>
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-yellow-500 rounded-full" /> L: Late</span>
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-orange-500 rounded-full" /> HD: Half Day</span>
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-purple-500 rounded-full" /> LV: Leave</span>
          <span className="flex items-center gap-1"><Badge className="h-1.5 w-1.5 p-0 bg-cyan-500 rounded-full" /> OT: Overtime</span>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <Card className="border border-slate-200">
            <CardContent className="p-2.5 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-medium text-slate-500 uppercase mb-0.5">{title}</p>
                    <h3 className="text-base font-bold text-slate-900">{value}</h3>
                </div>
                <div className={`${bg} p-1.5 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
            </CardContent>
        </Card>
    );
}