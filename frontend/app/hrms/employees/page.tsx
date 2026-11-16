"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Loader2, Eye, LayoutGrid, Table2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { deleteEmployee, getEmployees } from "../api/hrmsApi";
import { cn } from "@/lib/utils";
import BASE_URL from "@/app/api/BaseUrl";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation?: { name: string };
  department?: { name: string };
  employment_type: string;
  status: string;
  profile_photo?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") || "";
  const initialPerPage = Number(searchParams.get("per_page")) || 25;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: initialPage,
    last_page: 1,
    total: 0,
    per_page: initialPerPage,
  });

  const updateUrl = useCallback((page: number, query: string, perPage: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (query) params.set("search", query);
    if (perPage !== 25) params.set("per_page", perPage.toString());
    
    const queryString = params.toString();
    router.push(`/hrms/employees${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router]);

  const fetchEmployees = useCallback(async (page = 1, query = search, perPage = pagination.per_page) => {
    try {
      setLoading(true);
      const res = await getEmployees({ page, search: query, per_page: perPage });
      if (res.status === 200 || res.data.status === "success") {
        const payload = res.data.data;
        const finalEmployees = Array.isArray(payload) ? payload : payload?.data || [];
        setEmployees(finalEmployees);

        const meta = res.data.meta || (payload && payload.current_page ? payload : null);
        if (meta) {
          setPagination({
            current_page: meta.current_page,
            last_page: meta.last_page,
            total: meta.total,
            per_page: meta.per_page,
          });
        }
        updateUrl(page, query, perPage);
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, updateUrl]);

  useEffect(() => {
    fetchEmployees(initialPage, search, initialPerPage);
  }, [fetchEmployees, initialPage, initialPerPage]);

  const handleSearch = () => {
    fetchEmployees(1, search);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage }));
    fetchEmployees(1, search, newPerPage);
  };

  const initials = (firstName?: string, lastName?: string) => {
    const a = (firstName || "").charAt(0).toUpperCase();
    const b = (lastName || "").charAt(0).toUpperCase();
    return `${a}${b}`.trim() || "--";
  };

  const getProfilePhotoUrl = (employee: Employee) => {
    if (!employee.profile_photo) return null;
    if (employee.profile_photo.startsWith("http")) return employee.profile_photo;
    return `${IMAGE_BASE_URL}/${employee.profile_photo}`;
  };

  const statusTone = (status: string) => {
    if (status?.toLowerCase() === "active") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await deleteEmployee(itemToDelete);
      toast.success("Employee deleted");
      fetchEmployees(pagination.current_page, search);
    } catch {
      toast.error("Delete failed");
    } finally {
      setItemToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  const showingText = useMemo(() => {
    if (pagination.total === 0) return "No records";
    const start = (pagination.current_page - 1) * pagination.per_page + 1;
    const end = Math.min(pagination.current_page * pagination.per_page, pagination.total);
    return `Showing ${start} - ${end} of ${pagination.total}`;
  }, [pagination]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl text-slate-900">Employees</h1>
              <p className="text-sm text-slate-500">Manage your team in one place.</p>
            </div>
            <Button onClick={() => router.push("/hrms/employees/create")} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Add employee
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full gap-2 md:max-w-sm">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, email, employee ID"
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary" className="px-3">
                <Search className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Search</span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs ${
                    viewMode === "table" ? "bg-slate-100 text-slate-800" : "text-slate-500"
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs ${
                    viewMode === "card" ? "bg-slate-100 text-slate-800" : "text-slate-500"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Card
                </button>
              </div>
              <div className="text-sm text-slate-500">{showingText}</div>
            </div>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-slate-600">Employee</TableHead>
                    <TableHead className="text-slate-600">Role</TableHead>
                    <TableHead className="text-slate-600">Department</TableHead>
                    <TableHead className="text-slate-600">Type</TableHead>
                    {/* <TableHead className="text-slate-600 text-center">Paid Leave</TableHead> */}
                    <TableHead className="text-slate-600">Status</TableHead>
                    <TableHead className="text-right text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">
                              {initials(employee.first_name, employee.last_name)}
                            </div>
                            <div>
                              <div className="text-slate-900">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {employee.employee_id} - {employee.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700">{employee.designation?.name || "-"}</TableCell>
                        <TableCell className="text-slate-700">{employee.department?.name || "-"}</TableCell>
                        <TableCell className="text-slate-700">{employee.employment_type || "-"}</TableCell>
                        {/* <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center h-7 px-2 rounded-md bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                            {(employee as any).paid_leave_days || 0}
                          </span>
                        </TableCell> */}
                        <TableCell>
                          <Badge variant="outline" className={statusTone(employee.status)}>
                            {employee.status || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button onClick={() => router.push(`/hrms/employees/view?id=${employee.id}`)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => router.push(`/hrms/employees/edit?id=${employee.id}`)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => confirmDelete(employee.id)} variant="ghost" size="icon" className="h-8 w-8 text-rose-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {employees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No employees found
                </div>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">
                          {initials(employee.first_name, employee.last_name)}
                        </div>
                        <div>
                          <p className="text-slate-900">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{employee.employee_id}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusTone(employee.status)}>
                        {employee.status || "unknown"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>Role: {employee.designation?.name || "-"}</p>
                      <p>Department: {employee.department?.name || "-"}</p>
                      <p>Type: {employee.employment_type || "-"}</p>
                      <p className="truncate">Email: {employee.email || "-"}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Button onClick={() => router.push(`/hrms/employees/view?id=${employee.id}`)} variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => router.push(`/hrms/employees/edit?id=${employee.id}`)} variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => confirmDelete(employee.id)} variant="ghost" size="icon" className="h-8 w-8 text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            {employees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No employees found
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="relative group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm", statusTone(employee.status))}>
                        {employee.status || "unknown"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-inner group-hover:border-indigo-100 transition-colors">
                          {getProfilePhotoUrl(employee) && !photoErrors[employee.id] ? (
                            <img
                              src={getProfilePhotoUrl(employee)!}
                              alt={`${employee.first_name} ${employee.last_name}`}
                              className="h-full w-full object-cover"
                              onError={() => setPhotoErrors((prev) => ({ ...prev, [employee.id]: true }))}
                            />
                          ) : (
                            <span className="text-xl font-bold text-slate-400">
                              {initials(employee.first_name, employee.last_name)}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                           <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", employee.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300')} />
                        </div>
                      </div>

                      <div className="space-y-1 w-full px-2">
                        <h3 className="font-bold text-slate-900 line-clamp-1">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-md">
                          {employee.designation?.name || "No Designation"}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-500 text-xs">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{employee.department?.name || "General"}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">{employee.employee_id}</p>
                      </div>

                      <div className="mt-6 flex w-full items-center gap-2">
                        <Button 
                          onClick={() => router.push(`/hrms/employees/view?id=${employee.id}`)} 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1 h-9 rounded-xl text-xs bg-slate-50 hover:bg-slate-100 border-none shadow-none"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                        <div className="flex items-center gap-1">
                           <Button 
                            onClick={() => router.push(`/hrms/employees/edit?id=${employee.id}`)} 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => confirmDelete(employee.id)} 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-500">
                Page {pagination.current_page} of {pagination.last_page}
              </div>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Rows per page</span>
                <select 
                  className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1 px-1.5 font-medium outline-none transition-all"
                  value={pagination.per_page}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold px-3 rounded-lg hover:bg-slate-100 disabled:opacity-40"
                disabled={pagination.current_page === 1}
                onClick={() => fetchEmployees(pagination.current_page - 1, search)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                  const pageNum = i + 1;
                  // Handle case for many pages later if needed
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchEmployees(pageNum, search)}
                      className={cn(
                        "h-8 w-8 text-xs font-bold rounded-lg transition-all",
                        pagination.current_page === pageNum 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold px-3 rounded-lg hover:bg-slate-100 disabled:opacity-40"
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchEmployees(pagination.current_page + 1, search)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete employee?"
        message="This action cannot be undone."
      />
    </div>
  );
}
