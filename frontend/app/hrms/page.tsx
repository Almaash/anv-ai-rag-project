"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  Calendar, 
  UserMinus, 
  TrendingUp, 
  DollarSign,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  getEmployees, 
  getAttendance, 
  getHolidays, 
  getLeaveRequests 
} from "./api/hrmsApi";

export default function HrmsDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    upcomingHolidays: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [empRes, attRes, holRes, leaveRes] = await Promise.all([
          getEmployees(),
          getAttendance(),
          getHolidays(),
          getLeaveRequests()
        ]);

        const today = new Date().toISOString().split('T')[0];
        
        // Basic calculations
        const totalEmp = empRes.data?.data?.length || 0;
        const presentToday = (attRes.data?.data || []).filter((a: any) => a.date === today && a.status === 'present').length || 0;
        const pendingLeaves = (leaveRes.data?.data || []).filter((l: any) => l.status === 'pending').length || 0;
        const futureHolidays = (holRes.data?.data || []).filter((h: any) => new Date(h.date) >= new Date()).length || 0;

        setStats({
          totalEmployees: totalEmp,
          presentToday: presentToday,
          onLeave: pendingLeaves, 
          upcomingHolidays: futureHolidays
        });

        setRecentAttendance(attRes.data?.data?.slice(0, 5) || []);
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <Card className="border-none shadow-sm overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="flex items-center p-6">
          <div className={`p-4 rounded-xl ${color} mr-4`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">HRMS Dashboard</h1>
          <p className="text-gray-500 mt-1">Operational overview for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          title="Total Workforce" 
          value={stats.totalEmployees} 
          color="bg-indigo-600" 
        />
        <StatCard 
          icon={Clock} 
          title="Present Today" 
          value={stats.presentToday} 
          color="bg-emerald-500" 
        />
        <StatCard 
          icon={UserMinus} 
          title="Leave Requests" 
          value={stats.onLeave} 
          color="bg-rose-500" 
        />
        <StatCard 
          icon={Calendar} 
          title="Future Holidays" 
          value={stats.upcomingHolidays} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-white/50 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" /> Recent Attendance
            </CardTitle>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 italic">View Full Log</span>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-transparent">
                  <TableHead className="font-bold text-gray-700">Employee</TableHead>
                  <TableHead className="font-bold text-gray-700">Check In</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   [1,2,3].map(i => (
                    <TableRow key={i}><TableCell colSpan={3} className="h-10 animate-pulse bg-gray-100 rounded"></TableCell></TableRow>
                   ))
                ) : recentAttendance.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-gray-900">{row.employee?.user?.name}</div>
                      <div className="text-xs text-gray-500">{row.employee?.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-sm">{row.check_in || '--:--'}</TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        row.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                        row.status === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {row.status.toUpperCase()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="bg-white/20 p-4 rounded-full mb-4">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-lg font-medium opacity-90">Payroll Health</h4>
              <p className="text-3xl font-bold mt-1">Optimized</p>
              <p className="text-sm mt-4 opacity-75">All monthly payouts have been processed successfully.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm border-l-4 border-l-indigo-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <Briefcase className="h-4 w-4 mr-2" /> Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-gray-500 mb-4">Commonly performed administrative tasks.</p>
              <button className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-sm font-medium text-gray-700 flex items-center">
                <Users className="h-4 w-4 mr-3 text-indigo-500" /> Onboard New Employee
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-3 text-emerald-500" /> Update Holiday List
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

