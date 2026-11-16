"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  DollarSign, Loader2, ArrowLeft, Save, 
  Calendar as CalendarIcon, User, CreditCard, Plus, Minus, Calculator, Eye,
  TrendingDown, TrendingUp, Info, CheckCircle2, XCircle, Clock,
  IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  getAttendance,
  getEmployeeById,
  generateSalary,
  getAttendanceCalendar,
  getSalaries,
} from "../../api/hrmsApi";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, subMonths, isSaturday, isSunday,
  startOfWeek
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function EmployeePayoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId") || searchParams.get("id");
  
  // Default to the previous month (last month) if no month is provided
  const lastMonthValue = format(subMonths(new Date(), 1), "yyyy-MM");
  const monthParam = searchParams.get("month") || lastMonthValue;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [paidRecordId, setPaidRecordId] = useState<number | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    present: 0,
    absent: 0,
    leave: 0,
    halfDay: 0,
    late: 0,
    holidays: 0
  });

  const [payrollForm, setPayrollForm] = useState({
    basic_salary: 0,
    bonus: 0,
    allowances: 0,
    deductions: 0,
    payment_method: "Bank Transfer",
    note: ""
  });

  useEffect(() => {
    if (employeeId) {
      fetchData();
      return;
    }
    setLoading(false);
  }, [employeeId, monthParam]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const selectedDate = new Date(`${monthParam}-01T00:00:00`);
      const selectedYear = selectedDate.getFullYear();

      const [empRes, attRes, salRes] = await Promise.all([
        getEmployeeById(Number(employeeId)),
        getAttendanceCalendar(Number(employeeId), { year: selectedYear }),
        getSalaries({ month: monthParam })
      ]);

      if (empRes.data.status === "success") {
        const emp = empRes.data.data;
        setEmployee(emp);
        setPayrollForm(prev => ({
          ...prev,
          basic_salary: parseFloat(emp.basic_salary) || 0
        }));
      }

      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const days = eachDayOfInterval({ start, end });

      const raw = Array.isArray(attRes?.data?.data)
        ? attRes.data.data
        : Array.isArray(attRes?.data)
          ? attRes.data
          : [];

      setAttendanceRecords(raw);

      const monthAtt = raw.filter((a: any) => isSameMonth(new Date(a.date), selectedDate));

      const stats = {
        totalDays: days.length,
        present: monthAtt.filter((a: any) => 
          ["present", "p"].includes(String(a.status).toLowerCase())
        ).length,
        absent: monthAtt.filter((a: any) => 
          ["absent", "a"].includes(String(a.status).toLowerCase()) && !isSunday(new Date(a.date))
        ).length,
        leave: monthAtt.filter((a: any) => 
          ["on-leave", "leave"].includes(String(a.status || "").toLowerCase())
        ).length,
        halfDay: monthAtt.filter((a: any) => 
          ["half-day", "halfday"].includes(String(a.status || "").toLowerCase())
        ).length,
        late: monthAtt.filter((a: any) => 
          String(a.status).toLowerCase() === 'late'
        ).length,
        holidays: days.filter(d => isSunday(d)).length 
      };
      setAttendanceStats(stats);

      // Prevent duplicate payout for same employee + month if already paid
      const salaryRows = Array.isArray(salRes?.data?.data)
        ? salRes.data.data
        : Array.isArray(salRes?.data?.data?.data)
          ? salRes.data.data.data
          : [];

      const paidRow = salaryRows.find((row: any) =>
        Number(row.employee_id) === Number(employeeId) &&
        String(row.status || "").toLowerCase() === "paid"
      );

      setAlreadyPaid(Boolean(paidRow));
      setPaidRecordId(paidRow?.id || paidRow?.record_id || null);
    } catch (err) {
      toast.error("Failed to load payout details");
    } finally {
      setLoading(false);
    }
  };

  const calculateProratedBasic = () => {
    if (attendanceStats.totalDays === 0) return 0;
    const dailyRate = payrollForm.basic_salary / attendanceStats.totalDays;
    // Calculation: (Present + Paid Leave + Sundays + (Half-days * 0.5))
    const paidDays = attendanceStats.present + 
                     attendanceStats.leave + 
                     attendanceStats.holidays + 
                     (attendanceStats.halfDay * 0.5);
    return dailyRate * paidDays;
  };

  const calculateNetPay = () => {
    // Net Pay = Basic Salary + Bonus + Allowances - Deductions
    return (Number(payrollForm.basic_salary) + Number(payrollForm.bonus) + Number(payrollForm.allowances)) - Number(payrollForm.deductions);
  };

  // Calendar Components
  const renderCalendar = () => {
    const date = new Date(`${monthParam}-01T00:00:00`);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    const firstDay = startOfWeek(start);
    
    // Create empty cells for days before the start of the month
    const emptyCells = [];
    let curr = firstDay;
    while (!isSameDay(curr, start)) {
      emptyCells.push(<div key={`empty-${curr}`} className="h-10 rounded-lg bg-slate-50/50" />);
      curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`header-${i}`} className="text-[10px] font-bold text-center text-slate-400 uppercase py-1">{d}</div>
        ))}
        {emptyCells}
        {days.map(day => {
          const isoDate = format(day, "yyyy-MM-dd");
          const record = attendanceRecords.find(r => r.date === isoDate);
          const isSun = isSunday(day);
          
          const rawStatus = String(record?.status || "").toLowerCase();
          
          let statusColor = "bg-white border-slate-100 text-slate-400";
          let icon = null;

          if (isSun && !["present", "p", "half-day", "halfday", "leave", "on-leave", "onleave", "late"].includes(rawStatus)) {
            statusColor = "bg-blue-50 border-blue-100 text-blue-600";
            icon = <span className="text-[8px] font-bold">SUN</span>;
          } else if (["present", "p"].includes(rawStatus)) {
            statusColor = "bg-emerald-50 border-emerald-100 text-emerald-600";
            icon = <CheckCircle2 className="h-3 w-3" />;
          } else if (["absent", "a", "absent"].includes(rawStatus)) {
            statusColor = "bg-red-50 border-red-100 text-red-600";
            icon = <XCircle className="h-3 w-3" />;
          } else if (["half-day", "halfday"].includes(rawStatus)) {
            statusColor = "bg-orange-50 border-orange-100 text-orange-600";
            icon = <Clock className="h-3 w-3" />;
          } else if (["leave", "on-leave", "onleave"].includes(rawStatus)) {
            statusColor = "bg-purple-50 border-purple-100 text-purple-600";
            icon = <CalendarIcon className="h-3 w-3" />;
          } else if (rawStatus === 'late') {
            statusColor = "bg-amber-50 border-amber-100 text-amber-600";
            icon = <Clock className="h-3 w-3" />;
          } else if (rawStatus === 'holiday' || isSun) {
            statusColor = "bg-blue-50 border-blue-100 text-blue-600";
            icon = <span className="text-[8px] font-bold">SUN</span>;
          }

          return (
            <div 
              key={day.toString()} 
              className={cn(
                "h-12 border rounded-lg flex flex-col items-center justify-center relative transition-all hover:scale-105 cursor-help group",
                statusColor
              )}
              title={record?.status || (isSun ? 'Sunday' : 'No Record')}
            >
              <span className="text-[10px] font-bold z-10">{format(day, 'd')}</span>
              {icon && <div className="mt-0.5">{icon}</div>}
              {record?.check_in && (
                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-[6px] font-mono bg-white/80 px-0.5 rounded">
                  {record.check_in.substring(0, 5)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSavePayout = async () => {
    if (alreadyPaid) {
      toast.error("Salary is already paid for this employee and month");
      return;
    }

    setSaving(true);
    try {
        const payload = {
            employee_id: employee.id,
            month: format(new Date(monthParam), "MMMM yyyy"),
            payment_date: format(new Date(), "yyyy-MM-dd"),
            total_working_days: attendanceStats.totalDays,
            present_days: attendanceStats.present,
            absent_days: attendanceStats.absent,
            leave_days: attendanceStats.leave,
            basic_pay: Number(payrollForm.basic_salary), // Use full basic salary for manual processing
            allowances: Number(payrollForm.allowances) + Number(payrollForm.bonus),
            deductions: Number(payrollForm.deductions),
            net_pay: calculateNetPay(),
            status: "paid",
            payment_method: payrollForm.payment_method,
            note: payrollForm.note
        };

        const res = await generateSalary(payload);
        if (res.data.status === "success") {
            toast.success("Salary payout recorded successfully");
            router.push("/hrms/payroll");
        }
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to record payout");
    } finally {
        setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (alreadyPaid) {
      toast.error("Salary is already paid for this employee and month");
      return;
    }
    setConfirmOpen(true);
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Process Payout</h1>
            <p className="text-muted-foreground">{employee?.first_name} {employee?.last_name} • {format(new Date(monthParam), "MMMM yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs text-muted-foreground font-medium uppercase">Manual Net Payout</p>
            <p className="text-2xl font-bold text-blue-600">₹{calculateNetPay().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          {alreadyPaid && paidRecordId ? (
            <Button
              onClick={() => router.push(`/hrms/payroll/records?id=${paidRecordId}`)}
              className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Receipt
            </Button>
          ) : null}
          <Button onClick={handleSaveClick} disabled={saving || alreadyPaid} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 rounded-xl disabled:bg-slate-400">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {alreadyPaid ? "Already Paid" : "Submit Payment"}
          </Button>
        </div>
      </div>

      {alreadyPaid ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment already exists for this employee in {format(new Date(monthParam), "MMMM yyyy")}. Duplicate save is disabled.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats and Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm bg-blue-50/50 overflow-hidden">
            <CardHeader className="pb-2 bg-white/50 border-b">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600" /> Attendance Calendar
                </div>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">{format(new Date(monthParam), "MMM yy")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-white/30 backdrop-blur-sm">
                {renderCalendar()}
                <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-bold uppercase text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Present: {attendanceStats.present}</div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Absent: {attendanceStats.absent}</div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Half-Day: {attendanceStats.halfDay}</div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Leaves: {attendanceStats.leave}</div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Late: {attendanceStats.late}</div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Sundays: {attendanceStats.holidays}</div>
                </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-600">
                <User className="h-4 w-4" /> Personnel Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm pt-4">
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500">Designation</span>
                <span className="font-medium">{employee?.designation?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500">Joining Date</span>
                <span className="font-medium">{employee?.joining_date ? format(new Date(employee.joining_date), "dd MMM yyyy") : "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl mt-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Method Preference</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-500" />
                    {payrollForm.payment_method}
                  </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Calculations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" /> 
                    Salary Configuration
                </CardTitle>
                <CardDescription>Adjust earnings and deductions for this payout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    Basic Salary (Monthly) <Info className="h-3 w-3 text-slate-400" />
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        type="number"
                        value={payrollForm.basic_salary}
                        onChange={(e) => setPayrollForm({...payrollForm, basic_salary: parseFloat(e.target.value) || 0})}
                        className="pl-9 h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Payment Method</Label>
                  <Select 
                    value={payrollForm.payment_method} 
                    onValueChange={(v) => setPayrollForm({...payrollForm, payment_method: v})}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Earnings */}
                <div className="space-y-4">
                  <h3 className="text-sm border-l-4 border-green-500 pl-2 font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" /> Extra Earnings
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-500">Monthly Allowances</Label>
                      <Input 
                        type="number" 
                        value={payrollForm.allowances}
                        onChange={(e) => setPayrollForm({...payrollForm, allowances: parseFloat(e.target.value) || 0})}
                        className="rounded-xl border-slate-200"
                        placeholder="House Rent, Med etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-500">Bonus / Performance</Label>
                      <Input 
                        type="number" 
                        value={payrollForm.bonus}
                        onChange={(e) => setPayrollForm({...payrollForm, bonus: parseFloat(e.target.value) || 0})}
                        className="rounded-xl border-slate-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-4">
                  <h3 className="text-sm border-l-4 border-red-500 pl-2 font-bold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" /> Deductions
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-500">Penalty / LOP / Tax</Label>
                      <Input 
                        type="number" 
                        value={payrollForm.deductions}
                        onChange={(e) => setPayrollForm({...payrollForm, deductions: parseFloat(e.target.value) || 0})}
                        className="rounded-xl border-slate-200 text-red-600 font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label className="text-xs uppercase text-slate-500">Notes / Remarks</Label>
                <Input 
                  value={payrollForm.note}
                  onChange={(e) => setPayrollForm({...payrollForm, note: e.target.value})}
                  className="rounded-xl border-slate-200"
                  placeholder="e.g. Performance bonus for Q1"
                />
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-6 mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                   <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Net Disbursement</p>
                   <p className="text-4xl font-black">₹{calculateNetPay().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right text-xs text-slate-400 space-y-1">
                  <p className="flex justify-between gap-10"><span>Basic Salary:</span> <span className="text-white">₹{Number(payrollForm.basic_salary).toLocaleString()}</span></p>
                  <p className="flex justify-between gap-10"><span>Adjustments:</span> <span className="text-green-400">+₹{(Number(payrollForm.allowances) + Number(payrollForm.bonus)).toLocaleString()}</span></p>
                  <p className="flex justify-between gap-10 border-t border-slate-700 pt-1"><span>Deductions:</span> <span className="text-red-400">-₹{Number(payrollForm.deductions).toLocaleString()}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    
    <ConfirmDialog
      isOpen={confirmOpen}
      title="Confirm Salary Payment"
      message={`Are you sure you want to submit salary payment for ${employee?.first_name || "this employee"} for ${format(new Date(monthParam), "MMMM yyyy")}?`}
      confirmText="Confirm Payment"
      cancelText="Cancel"
      onConfirm={() => {
        setConfirmOpen(false);
        void handleSavePayout();
      }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
