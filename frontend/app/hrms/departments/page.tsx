"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getHrmsDepartments, createHrmsDepartment, updateHrmsDepartment, deleteHrmsDepartment } from "../api/hrmsApi";

interface Department {
  id: number;
  name: string;
  description: string;
  status: boolean;
}

export default function HrmsDepartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") || "";
  const initialPerPage = Number(searchParams.get("per_page")) || 25;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: true });
  const [formLoading, setFormLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
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
    router.push(`/hrms/departments${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router]);

  const fetchDepartments = useCallback(async (page = pagination.current_page, query = search) => {
    try {
      setLoading(true);
      const res = await getHrmsDepartments({ page, search: query, per_page: pagination.per_page });
      if (res.data.status === "success") {
        setDepartments(res.data.data || []);
        if (res.data.meta) {
          setPagination({
            current_page: res.data.meta.current_page,
            last_page: res.data.meta.last_page,
            total: res.data.meta.total,
            per_page: res.data.meta.per_page,
          });
        }
        updateUrl(page, query, pagination.per_page);
      }
    } catch (err) {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, updateUrl]);

  useEffect(() => {
    fetchDepartments(initialPage, search);
  }, []);

  const handleSearch = () => {
    fetchDepartments(1, search);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage }));
    fetchDepartments(1, search);
  };

  const handleOpenModal = (dept: Department | null = null) => {
    if (dept) {
      setSelectedDept(dept);
      setFormData({
        name: dept.name,
        description: dept.description || "",
        status: dept.status
      });
    } else {
      setSelectedDept(null);
      setFormData({ name: "", description: "", status: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // Get scoping properties from logged-in user if available
      const userStr = localStorage.getItem("user");
      let branch_id = null;
      let cms_admin = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        branch_id = user.branch || user.branch_id || null;
        cms_admin = user.cms_admin || null;
      }

      const payload = { ...formData, branch_id, cms_admin };

      if (selectedDept) {
        await updateHrmsDepartment(selectedDept.id, payload);
        toast.success("Department updated successfully");
      } else {
        await createHrmsDepartment(payload);
        toast.success("Department created successfully");
      }
      fetchDepartments();
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Operation failed";
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await deleteHrmsDepartment(itemToDelete);
      toast.success("Department removed successfully");
      fetchDepartments();
      setIsConfirmOpen(false);
    } catch (err) {
      toast.error("Failed to delete department");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">HRMS Departments</h1>
          <p className="text-muted-foreground">Isolate HR departments from organizational units.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Add Dept
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              className="pl-8 bg-white border-blue-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-blue-50/50">
            <TableRow>
              <TableHead className="font-bold text-blue-900">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
            ) : departments.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No departments found.</TableCell></TableRow>
            ) : (
              departments.map((d) => (
                <TableRow key={d.id} className="hover:bg-blue-50/20">
                  <TableCell className="font-semibold text-gray-800">{d.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{d.description || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${d.status ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                      {d.status ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100/50 text-blue-600" onClick={() => handleOpenModal(d)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100/50 text-red-600" onClick={() => confirmDelete(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 gap-4 shadow-sm mt-4">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500">
              Page {pagination.current_page} of {pagination.last_page}
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows</span>
              <select 
                className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 px-1.5 font-medium outline-none transition-all"
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
              onClick={() => fetchDepartments(pagination.current_page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchDepartments(pageNum)}
                    className={cn(
                      "h-8 w-8 text-xs font-bold rounded-lg transition-all",
                      pagination.current_page === pageNum 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
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
              onClick={() => fetchDepartments(pagination.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-blue-900">{selectedDept ? "Edit Department" : "Create HR Department"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Department Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Talent Acquisition"
                className="border-blue-100 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief purpose..."
                className="border-blue-100 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <input
                type="checkbox"
                id="status"
                checked={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="status" className="text-sm font-medium text-gray-700 cursor-pointer">Set as Active Department</Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[80px]">
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedDept ? "Update" : "Save Dept")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Remove Department?"
        message="This will isolate any employees currently assigned to this department. Proceed?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
