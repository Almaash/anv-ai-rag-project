"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface SalaryEmployee {
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  designation?: { name?: string };
  user?: { name?: string };
}

interface SalaryRecord {
  id?: number;
  employee_id?: number;
  payout_id?: string;
  month?: string;
  payment_date?: string;
  total_working_days?: string | number;
  present_days?: string | number;
  absent_days?: string | number;
  leave_days?: string | number;
  basic_pay?: string | number;
  allowances?: string | number;
  deductions?: string | number;
  net_pay?: string | number;
  status?: string;
  payment_method?: string;
  method?: string | null;
  note?: string | null;
  basic_salary?: string | number;
  attendance?: {
    present?: string | number;
    absent?: string | number;
    leaves?: string | number;
    total_days?: string | number;
  };
  name?: string;
  employee_code?: string;
  designation?: string;
  employee?: SalaryEmployee;
}

const toNumber = (value: string | number | null | undefined) => Number(value || 0);
const toMoney = (value: string | number | null | undefined) => `Rs ${toNumber(value).toLocaleString()}`;

export default function SalaryRecordDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const payoutId = searchParams.get("payoutId");
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<SalaryRecord | null>(null);

  useEffect(() => {
    if (recordId) {
      void fetchSalaryDetail(recordId);
      return;
    }
    if (payoutId || employeeId) {
      void fetchSalaryByLookup();
      return;
    }
    setLoading(false);
  }, [recordId, payoutId, employeeId, month]);

  const fetchSalaryDetail = async (id: string) => {
    try {
      setLoading(true);
      // Fixed: The backend treats GET /hrms/salaries/{id} as show()
      // But we need to make sure we are hitting /hrms/salaries/{id} correctly
      const res = await axiosInstance.get(`${ProjectApiList.GET_SALARIES}/${id}`);
      if (res.data.status === "success") {
        setRecord(res.data.data || null);
      } else {
        setRecord(null);
      }
    } catch {
      toast.error("Failed to load payout record details");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryByLookup = async () => {
    try {
      setLoading(true);
      const params: { month?: string } = {};
      if (month) params.month = month;

      const res = await axiosInstance.get(ProjectApiList.GET_SALARIES, { params });
      if (res.data.status !== "success") {
        setRecord(null);
        return;
      }

      const listRows = Array.isArray(res.data.data) ? res.data.data : [];
      const match = listRows.find((row: SalaryRecord) => {
        if (payoutId && row.payout_id === payoutId) return true;
        if (employeeId && String(row.employee_id) === String(employeeId)) return true;
        return false;
      }) as SalaryRecord | undefined;

      if (!match) {
        setRecord(null);
        return;
      }

      if (match.id) {
        await fetchSalaryDetail(String(match.id));
        return;
      }

      const fullName = String(match.name || "").trim();
      const [firstName, ...rest] = fullName.split(" ");

      setRecord({
        ...match,
        id: 0,
        basic_pay: match.basic_pay ?? match.basic_salary ?? 0,
        payment_method: match.payment_method ?? match.method ?? "-",
        total_working_days: match.total_working_days ?? match.attendance?.total_days ?? 0,
        present_days: match.present_days ?? match.attendance?.present ?? 0,
        absent_days: match.absent_days ?? match.attendance?.absent ?? 0,
        leave_days: match.leave_days ?? match.attendance?.leaves ?? 0,
        employee: match.employee || {
          employee_id: match.employee_code,
          first_name: firstName || "-",
          last_name: rest.join(" "),
          designation: { name: match.designation || "-" },
        },
      });
    } catch {
      toast.error("Failed to load payout record details");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const employeeName = useMemo(() => {
    if (!record) return "-";
    const fromEmployee = `${record.employee?.first_name || ""} ${record.employee?.last_name || ""}`.trim();
    return fromEmployee || record.employee?.user?.name || "-";
  }, [record]);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-slate-400" />
        <p className="text-slate-600">Record not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const basicPay = toNumber(record.basic_pay);
  const allowances = toNumber(record.allowances);
  const deductions = toNumber(record.deductions);
  const netPay = toNumber(record.net_pay);
  const totalEarnings = basicPay + allowances;
  const totalWorkingDays = toNumber(record.total_working_days);
  const presentDays = toNumber(record.present_days);
  const absentDays = toNumber(record.absent_days);
  const leaveDays = toNumber(record.leave_days);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={() => router.back()} className="border-gray-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="border-gray-300">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <div id="receipt-content" className="rounded-lg border border-gray-300 bg-white p-6 md:p-8 shadow-sm print:border-none print:rounded-none print:p-0">
          <div className="mb-6 rounded-lg border border-gray-200 bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-1.5">
                  <Image src="/images/logo.png" alt="Anavaran Logo" width={42} height={42} className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight">ANAVARAN</h1>
                  <p className="text-xs uppercase tracking-wide text-blue-100">Salary Payment Receipt</p>
                </div>
              </div>
              <div className="text-right text-xs md:text-sm">
                <p className="text-blue-100">Receipt No: <span className="font-semibold text-white">{record.payout_id || "-"}</span></p>
                <p className="text-blue-100">Generated: <span className="font-semibold text-white">{format(new Date(), "dd MMM yyyy")}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Employee</p>
              <p className="text-gray-900 font-semibold">{employeeName}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Employee ID</p>
              <p className="text-gray-900 font-semibold">{record.employee?.employee_id || "-"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Designation</p>
              <p className="text-gray-900 font-semibold">{record.employee?.designation?.name || "-"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Month</p>
              <p className="text-gray-900 font-semibold">{record.month || "-"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Payment Date</p>
              <p className="text-gray-900 font-semibold">
                {record.payment_date ? format(new Date(record.payment_date), "dd MMM yyyy") : "-"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Status</p>
              <Badge
                variant="outline"
                className={
                  (record.status || "").toLowerCase() === "paid"
                    ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold"
                }
              >
                {record.status || "unknown"}
              </Badge>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">Attendance Summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-600 font-medium">Working</p>
                <p className="text-gray-900 font-bold text-lg">{totalWorkingDays}</p>
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Present</p>
                <p className="text-green-700 font-bold text-lg">{presentDays}</p>
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Absent</p>
                <p className="text-red-700 font-bold text-lg">{absentDays}</p>
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Leaves</p>
                <p className="text-orange-700 font-bold text-lg">{leaveDays}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-300 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right text-gray-700 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-700 font-medium">Basic Pay</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">{toMoney(basicPay)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-700 font-medium">Allowances</td>
                  <td className="px-4 py-3 text-right text-green-700 font-semibold">+ {toMoney(allowances)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-700 font-medium">Deductions</td>
                  <td className="px-4 py-3 text-right text-red-700 font-semibold">- {toMoney(deductions)}</td>
                </tr>
                <tr className="border-t-2 border-gray-300 bg-blue-50">
                  <td className="px-4 py-3 text-gray-900 font-bold">Net Pay</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-bold text-lg">{toMoney(netPay)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Payment Method</p>
              <p className="text-gray-900 font-semibold">{record.payment_method || "-"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600 font-medium">Total Earnings</p>
              <p className="text-gray-900 font-semibold">{toMoney(totalEarnings)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-green-300 bg-green-50 p-3">
              <p className="text-xs text-green-700 font-medium">Present Days</p>
              <p className="text-lg font-bold text-green-900">{presentDays}</p>
            </div>
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <p className="text-xs text-red-700 font-medium">Total Deductions</p>
              <p className="text-lg font-bold text-red-900">{toMoney(deductions)}</p>
            </div>
            <div className="rounded-lg border border-blue-600 bg-blue-600 p-3">
              <p className="text-xs text-blue-100 font-medium">Total Payout</p>
              <p className="text-lg font-bold text-white">{toMoney(netPay)}</p>
            </div>
          </div>

          {record.note ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-yellow-50 p-3 text-sm text-gray-700">
              <p className="text-xs text-gray-600 font-medium">Note</p>
              <p className="mt-1 font-medium">{record.note}</p>
            </div>
          ) : null}

          <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-600">
            This is a system-generated receipt from Anavaran HRMS Payroll - {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body, html {
            background: #ffffff !important;
          }
          nav, header, aside, footer, .print\\:hidden {
            display: none !important;
          }
          #receipt-content {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
