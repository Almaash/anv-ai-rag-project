"use client";

import React, { useState, useEffect } from "react";
import {
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  ArrowUpRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  UserCheck,
  Award,
  Building2,
  BarChart3
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getHrmsDashboard, getEmployees, getSalaries, getHolidays } from "../api/hrmsApi";
import { toast } from "sonner";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";

export default function HrmsDashboard() {
  const [data, setData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    setUserType(localStorage.getItem("user_type"));
  }, []);

  const isEmployee = userType === "employee";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // For employees, we only need the dashboard data which now includes their profile and stats
      const [dashRes, empRes, salRes, holidaysRes] = await Promise.all([
        getHrmsDashboard(),
        !isEmployee ? getEmployees() : Promise.resolve({ data: { status: "success", data: [] } }),
        getSalaries(),
        getHolidays()
      ]);
      
      if (dashRes.data.status === "success") {
        setData(dashRes.data.data);
      }
      if (empRes.data.status === "success") {
        setEmployees(empRes.data.data || []);
      }
      if (salRes.data.status === "success") {
        setSalaries(salRes.data.data || []);
      }
      if (holidaysRes.data.status === "success") {
        setHolidays(holidaysRes.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userType !== null) {
      fetchDashboardData();
    }
  }, [userType]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = data?.stats || {
    total_employees: 0,
    on_leave_today: 0,
    present_today: 0,
    pending_leaves: 0,
    last_salary: 0,
    present_this_month: 0,
    total_leaves_taken: 0
  };

  // Enhanced statistics using API data
  const totalPayroll = data?.salary_costs?.total ? parseFloat(data.salary_costs.total) : 0;
  const activeEmployees = stats.total_employees;
  
  // Salary Trend Data from API
  const salaryTrendData = data?.salary_costs?.map((record: any) => ({
    month: record.month,
    total: parseFloat(record.total)
  })) || [];
  
  // Department distribution data from API
  const chartDepartmentData = data?.charts?.department_distribution?.map((dept: any) => ({
    name: dept.name,
    value: parseInt(dept.value),
  })) || [];
  
  // Attendance trend data from API
  const attendanceData = data?.charts?.attendance_trend || data?.charts?.attendance_overview || [];
  
  // Salary distribution data
  const salaryRanges = {
    '< 30K': 0,
    '30K - 50K': 0,
    '50K - 80K': 0,
    '> 80K': 0
  };
  
  employees.forEach(emp => {
    const salary = parseFloat(emp.basic_salary || 0);
    if (salary < 30000) salaryRanges['< 30K']++;
    else if (salary <= 50000) salaryRanges['30K - 50K']++;
    else if (salary <= 80000) salaryRanges['50K - 80K']++;
    else salaryRanges['> 80K']++;
  });
  
  const salaryDistributionData = Object.entries(salaryRanges).map(([range, count]) => ({
    range,
    count,
    fill: `hsl(${Math.random() * 60 + 200}, 70%, 50%)`
  }));

  // Holiday calculations
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const upcomingHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    if (holiday.recurring) {
      // For recurring holidays, check this year
      const thisYearHoliday = new Date(currentYear, holidayDate.getMonth(), holidayDate.getDate());
      return thisYearHoliday >= today;
    }
    return holidayDate >= today;
  }).slice(0, 5); // Next 5 holidays
  
  const thisMonthHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    if (holiday.recurring) {
      const thisYearHoliday = new Date(currentYear, holidayDate.getMonth(), holidayDate.getDate());
      return thisYearHoliday.getMonth() === currentMonth && thisYearHoliday.getFullYear() === currentYear;
    }
    return holidayDate.getMonth() === currentMonth && holidayDate.getFullYear() === currentYear;
  }).length;

  const statCards = isEmployee ? [
    {
      title: "Pending Leaves",
      value: stats.pending_leaves,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      description: "Awaiting approval",
      trend: "Leaves",
      trendUp: true
    },
    {
      title: "Approved Leaves",
      value: stats.total_leaves_taken,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      description: "Ready to use",
      trend: "Leaves",
      trendUp: true
    },
    {
      title: "Last Salary",
      value: `₹${stats.last_salary?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      description: "Disbursed",
      trend: "Details",
      trendUp: true
    },
    {
      title: "Total Present",
      value: stats.present_this_month,
      icon: UserCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      description: "This Month",
      trend: "Attendance",
      trendUp: true
    }
  ] : [
    {
      title: "Total Employees",
      value: stats.total_employees,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      description: "Active staff",
      trend: "Total",
      trendUp: true
    },
    {
      title: "Present Today",
      value: stats.present_today,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50", 
      border: "border-green-200",
      description: "Attendance today",
      trend: `${((stats.present_today / (stats.total_employees || 1)) * 100).toFixed(0)}%`,
      trendUp: true
    },
    {
      title: "Monthly Payroll",
      value: stats.monthly_payroll || 0,
      isCurrency: true,
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200", 
      description: "Current Month Cost",
      trend: "Budget",
      trendUp: true
    },
    {
      title: "Leave Requests",
      value: stats.pending_leaves,
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      description: "Pending approval",
      trend: "Action",
      trendUp: false
    },
    {
      title: "On Leave Today",
      value: stats.on_leave_today,
      icon: Clock,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      description: "Currently out",
      trend: "Daily",
      trendUp: true
    }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {isEmployee ? `Hello, ${data?.employee_profile?.first_name || 'Employee'}` : 'HRMS Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEmployee ? 'Welcome back! Here is your personal overview.' : "Welcome back! Here's what's happening in your organization."}
          </p>
        </div>
        {!isEmployee && (
          <div className="flex gap-2">
            <Link href="/hrms/employees">
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex items-center gap-2.5 p-3">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} shrink-0`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 truncate lowercase first-letter:uppercase">
                    {stat.title}
                  </p>
                  <h3 className="text-base font-semibold text-slate-900 truncate">
                    {stat.isCurrency ? "₹" : ""}{stat.value?.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="px-3 pb-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{stat.description}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stat.bg} ${stat.color}`}>
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {!isEmployee && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Department Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Department Distribution
              </CardTitle>
              <CardDescription>Employee distribution across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDepartmentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      {chartDepartmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Trends */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-green-600" />
                Weekly Attendance
              </CardTitle>
              <CardDescription>Attendance pattern for current week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="present" 
                      stackId="1"
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="absent" 
                      stackId="1"
                      stroke="#EF4444" 
                      fill="#EF4444" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Section for Employee */}
     {isEmployee && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    
    {/* ================= Profile Card ================= */}
    <Card className="border-0 shadow-lg rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Users className="h-5 w-5 text-blue-600" />
          My Profile
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {[
            { label: "Employee ID", value: data?.employee_profile?.employee_id },
            { label: "Designation", value: data?.employee_profile?.designation?.name || "N/A" },
            { label: "Department", value: data?.employee_profile?.department?.name || "N/A" },
            { label: "Email", value: data?.employee_profile?.email },
            { label: "Joining Date", value: data?.employee_profile?.joining_date },
          ].map((item, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 border-b last:border-b-0 pb-3"
            >
              <span className="text-slate-500 text-sm sm:text-base">
                {item.label}
              </span>
              <span className="font-semibold text-sm sm:text-base break-words text-right sm:text-right">
                {item.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* ================= Quick Actions ================= */}
    <Card className="border-0 shadow-lg rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Award className="h-5 w-5 text-purple-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/hrms/attendance"
          className="group p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <CalendarDays className="h-8 w-8 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm sm:text-base">
              My Attendance
            </span>
          </div>
        </Link>

        <Link
          href="/hrms/leaves"
          className="group p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Calendar className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm sm:text-base">
              My Leaves
            </span>
          </div>
        </Link>

        <Link
          href="/hrms/salaries"
          className="group p-6 rounded-2xl border border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <BarChart3 className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm sm:text-base">
              My Payroll
            </span>
          </div>
        </Link>
      </CardContent>
    </Card>

  </div>
)}

      {/* Bottom Section */}
      {!isEmployee && (
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Recent Activities */}
          <Card className="lg:col-span-4 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Recent Activities
              </CardTitle>
              <CardDescription>Latest updates from the HR system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data?.recent_activities?.length > 0 ? (
                  data.recent_activities.map((activity: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className={`mt-0.5 rounded-full p-2 ${
                        activity.type === 'leave' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {activity.type === 'leave' ? <Calendar className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{activity.title || activity.description?.split(' ')[0]}</span>
                          <span className="text-xs text-slate-500">{activity.time || activity.date}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-tight">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Clock className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-lg font-medium">No recent activities</p>
                    <p className="text-sm">Activities will appear here as they happen</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-3 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Shortcuts to frequent tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/hrms/attendance" className="group block">
                <div className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2.5 rounded-xl text-green-700 group-hover:bg-green-200">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Mark Attendance</div>
                      <div className="text-xs text-slate-500">Log today's presence</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-green-600" />
                </div>
              </Link>
              
              <Link href="/hrms/leaves" className="group block">
                <div className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2.5 rounded-xl text-purple-700 group-hover:bg-purple-200">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Leave Management</div>
                      <div className="text-xs font-medium text-orange-600">
                        {stats.pending_leaves} pending requests
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600" />
                </div>
              </Link>

              <Link href="/hrms/salaries/structures" className="group block">
                <div className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 group-hover:bg-blue-200">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Salary Management</div>
                      <div className="text-xs text-slate-500">Process monthly payouts</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                </div>
              </Link>

              <Link href="/hrms/payroll/reports" className="group block">
                <div className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 group-hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2.5 rounded-xl text-orange-700 group-hover:bg-orange-200">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Payroll Reports</div>
                      <div className="text-xs text-slate-500">Analytics & insights</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-orange-600" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

