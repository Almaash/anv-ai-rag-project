"use client";

import React, { useState, useEffect } from "react";
import { getAttendanceCalendar, getHolidays } from "../../api/hrmsApi";
import { CalendarDays, Loader2 } from "lucide-react";

interface AttendanceCalendarProps {
  employeeId: number;
  year?: number;
  joiningDate?: string;
}

interface AttendanceDay {
  date: string;
  status: string;
  remarks?: string;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
  recurring: boolean;
}

const normalizeStatus = (rawStatus: unknown): string => {
  const normalized = String(rawStatus || "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-");

  const aliases: Record<string, string> = {
    present: "present",
    p: "present",
    absent: "absent",
    a: "absent",
    late: "late",
    "half-day": "half-day",
    halfday: "half-day",
    "on-leave": "on-leave",
    onleave: "on-leave",
    leave: "on-leave",
    overtime: "overtime",
    ot: "overtime",
  };

  return aliases[normalized] || normalized || "absent";
};

const parseAsLocalDate = (value: string | Date) => {
  if (value instanceof Date) return new Date(value.getTime());

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const toIsoDate = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const enrichWithAbsentDays = (
  days: AttendanceDay[],
  year: number,
  holidays: Holiday[] = [],
  joiningDate?: string
): AttendanceDay[] => {
  if (days.length === 0) return [];

  const dateMap = new Map<string, AttendanceDay>();
  const holidaySet = new Set<string>();

  holidays.forEach((holiday) => {
    const holidayDate = parseAsLocalDate(holiday.date);
    const iso = toIsoDate(holidayDate);
    holidaySet.add(iso);
    
    if (holiday.recurring) {
      const recurringHoliday = new Date(year, holidayDate.getMonth(), holidayDate.getDate());
      holidaySet.add(toIsoDate(recurringHoliday));
    }
  });

  days.forEach((day) => {
    const iso = toIsoDate(parseAsLocalDate(day.date));
    dateMap.set(iso, { ...day, date: iso, status: normalizeStatus(day.status) });
  });

  // Find the first and last attendance dates
  const sortedDays = days.map(d => parseAsLocalDate(d.date)).sort((a, b) => a.getTime() - b.getTime());
  const firstAttendanceDate = sortedDays[0];
  const lastAttendanceDate = sortedDays[sortedDays.length - 1];

  const parsedJoiningDate = joiningDate ? parseAsLocalDate(joiningDate) : null;
  const rangeStart = (parsedJoiningDate && parsedJoiningDate > firstAttendanceDate) 
    ? parsedJoiningDate 
    : firstAttendanceDate;

  const today = new Date();
  const rangeEnd = lastAttendanceDate > today ? today : lastAttendanceDate;

  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    const iso = toIsoDate(d);
    if (!dateMap.has(iso)) {
      const dayOfWeek = d.getDay();
      if (holidaySet.has(iso)) {
        dateMap.set(iso, {
          date: iso,
          status: "holiday",
          remarks: holidays.find(h => toIsoDate(parseAsLocalDate(h.date)) === iso || (h.recurring && toIsoDate(new Date(year, parseAsLocalDate(h.date).getMonth(), parseAsLocalDate(h.date).getDate())) === iso))?.name
        });
      } else if (dayOfWeek === 0) {
        dateMap.set(iso, {
          date: iso,
          status: "holiday",
          remarks: "Sunday"
        });
      } else {
        dateMap.set(iso, {
          date: iso,
          status: "absent",
        });
      }
    }
  }

  return Array.from(dateMap.values())
    .filter(day => {
      if (!parsedJoiningDate || Number.isNaN(parsedJoiningDate.getTime())) return true;
      const dayDate = parseAsLocalDate(day.date);
      return dayDate >= parsedJoiningDate;
    })
    .sort(
      (a, b) => parseAsLocalDate(a.date).getTime() - parseAsLocalDate(b.date).getTime()
    );
};

export default function AttendanceCalendar({
  employeeId,
  year = new Date().getFullYear(),
  joiningDate,
}: AttendanceCalendarProps) {
  const [calendar, setCalendar] = useState<AttendanceDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both attendance and holidays in parallel
      const [attendanceResponse, holidaysResponse] = await Promise.all([
        getAttendanceCalendar(employeeId, { year }),
        getHolidays()
      ]);

      const attendanceRaw = Array.isArray(attendanceResponse?.data?.data)
        ? attendanceResponse.data.data
        : Array.isArray(attendanceResponse?.data)
          ? attendanceResponse.data
          : [];

      const holidaysRaw = Array.isArray(holidaysResponse?.data?.data)
        ? holidaysResponse.data.data
        : Array.isArray(holidaysResponse?.data)
          ? holidaysResponse.data
          : [];

      setHolidays(holidaysRaw);

      const normalized = attendanceRaw.map((item: Record<string, unknown>) => ({
        date: String(item.date || ""),
        status: normalizeStatus(item.status),
        remarks: item.remarks ? String(item.remarks) : undefined,
      }));

      setCalendar(enrichWithAbsentDays(normalized, year, holidaysRaw, joiningDate));
    } catch {
      console.error("Failed to load calendar or holidays");
      setCalendar([]);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, year, joiningDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const statusMeta: Record<string, { label: string; color: string }> = {
    present: { label: "Present", color: "#22c55e" },
    "half-day": { label: "Half Day", color: "#f59e0b" },
    late: { label: "Late", color: "#eab308" },
    absent: { label: "Absent", color: "#ef4444" },
    "on-leave": { label: "On Leave", color: "#8b5cf6" },
    overtime: { label: "Overtime", color: "#06b6d4" },
    holiday: { label: "Holiday", color: "#94a3b8" },
  };

  const fallbackStatus = { label: "Unknown", color: "#cbd5e1" };
  const dayHeadings = ["S", "M", "T", "W", "T", "F", "S"];

  const getStatusMeta = (status: string) => statusMeta[status] || fallbackStatus;

  const monthBlocks = React.useMemo(() => {
    const byMonth: Record<string, AttendanceDay[]> = {};
    const parsedJoiningDate = joiningDate ? parseAsLocalDate(joiningDate) : null;
    
    // Find the first actual attendance record date
    const firstAttendanceDate = calendar.length > 0 
      ? parseAsLocalDate(calendar[0].date) 
      : null;
    
    // Use the later of joining date or first attendance date as the start
    const effectiveStartDate = parsedJoiningDate && firstAttendanceDate
      ? (parsedJoiningDate > firstAttendanceDate ? parsedJoiningDate : firstAttendanceDate)
      : parsedJoiningDate || firstAttendanceDate;

    calendar.forEach((day) => {
      const date = parseAsLocalDate(day.date);
      
      // Skip months before the effective start date
      if (effectiveStartDate && !Number.isNaN(effectiveStartDate.getTime())) {
        if (date.getFullYear() < effectiveStartDate.getFullYear()) return;
        if (date.getFullYear() === effectiveStartDate.getFullYear() && date.getMonth() < effectiveStartDate.getMonth()) return;
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(day);
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, days]) => {
        const sortedDays = [...days].sort(
          (a, b) => parseAsLocalDate(a.date).getTime() - parseAsLocalDate(b.date).getTime()
        );
        const firstDayWeekIndex = parseAsLocalDate(sortedDays[0]?.date).getDay();
        const cells: (AttendanceDay | null)[] = Array(firstDayWeekIndex).fill(null);
        cells.push(...sortedDays);

        while (cells.length % 7 !== 0) {
          cells.push(null);
        }

        const weeks: (AttendanceDay | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
          weeks.push(cells.slice(i, i + 7));
        }

        const [y, m] = monthKey.split("-");
        const monthName = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "long" });

        return {
          monthKey,
          year: y,
          monthName,
          weeks,
        };
      });
  }, [calendar]);

  const statusCounts = React.useMemo(() => {
    return calendar.reduce((acc: Record<string, number>, day) => {
      const key = day.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [calendar]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 rounded-2xl border border-slate-200 bg-white/80">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 sm:p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-slate-900">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            Attendance Overview
          </h3>
          <p className="mt-1 text-sm text-slate-500">{year} year summary</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => {
            const meta = getStatusMeta(status);
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {monthBlocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
          No attendance records available for {year}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {monthBlocks.map((month) => (
            <div
              key={month.monthKey}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-semibold text-slate-800">
                  {month.monthName} {month.year}
                </h4>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[240px] space-y-1">
                  <div className="grid grid-cols-7 gap-1">
                    {dayHeadings.map((day, index) => (
                      <div key={`${month.monthKey}-heading-${index}`} className="text-center text-[10px] font-semibold text-slate-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  {month.weeks.map((week, weekIndex) => (
                    <div key={`${month.monthKey}-week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return <div key={`${month.monthKey}-empty-${weekIndex}-${dayIndex}`} className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />;
                        }

                        const date = parseAsLocalDate(day.date);
                        const meta = getStatusMeta(day.status);

                        return (
                          <div
                            key={day.date}
                            className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-lg cursor-pointer transition-transform hover:scale-105 hover:ring-2 hover:ring-indigo-200 flex items-center justify-center text-white text-[10px] sm:text-[11px] font-semibold shadow-sm"
                            style={{ backgroundColor: meta.color }}
                            title={`${day.date}: ${meta.label}${day.remarks ? ` - ${day.remarks}` : ""}`}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
