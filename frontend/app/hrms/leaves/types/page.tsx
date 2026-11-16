"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, Info, Search } from "lucide-react";
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
  DialogFooter,
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
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from "../../api/hrmsApi";

interface LeaveType {
  id: number;
  name: string;
  limit_days: number;
  status: boolean;
}

export default function LeaveTypesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") || "";
  const initialPerPage = Number(searchParams.get("per_page")) || 25;

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    current_page: initialPage,
    last_page: 1,
    total: 0,
    per_page: initialPerPage,
  });

  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    limit_days: 0,
    status: true
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const updateUrl = useCallback((page: number, query: string, perPage: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (query) params.set("search", query);
    if (perPage !== 25) params.set("per_page", perPage.toString());
    
    const queryString = params.toString();
    router.push(`/hrms/leaves/types${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router]);

  const fetchTypes = useCallback(async (page = pagination.current_page, query = search) => {
    try {
      setLoading(true);
      const res = await getLeaveTypes({ page, search: query, per_page: pagination.per_page });
      const data = res.data?.data || res.data || [];
      
      if (res.data?.status === "success") {
        setTypes(res.data.data || []);
        if (res.data.meta) {
          setPagination({
            current_page: res.data.meta.current_page,
            last_page: res.data.meta.last_page,
            total: res.data.meta.total,
            per_page: res.data.meta.per_page,
          });
        }
        updateUrl(page, query, pagination.per_page);
      } else if (Array.isArray(data)) {
        setTypes(data);
      }
    } catch (err) {
      toast.error("Failed to load leave types");
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.per_page, search, updateUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTypes(initialPage, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchTypes, initialPage]);

  const handlePerPageChange = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage }));
    fetchTypes(1, search);
  };

  const handleOpenModal = (type: LeaveType | null = null) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        name: type.name,
        limit_days: type.limit_days,
        status: type.status
      });
    } else {
      setSelectedType(null);
      setFormData({
        name: "",
        limit_days: 0,
        status: true
      });
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

      if (selectedType) {
        await updateLeaveType(selectedType.id, payload);
        toast.success("Leave type updated successfully");
      } else {
        await createLeaveType(payload);
        toast.success("Leave type created successfully");
      }
      fetchTypes();
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Operation failed";
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setTypeToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (typeToDelete === null) return;
    try {
      setFormLoading(true);
      await deleteLeaveType(typeToDelete);
      toast.success("Leave type deleted successfully");
      fetchTypes();
      setIsConfirmOpen(false);
    } catch (err) {
      toast.error("Deletion failed");
    } finally {
      setFormLoading(false);
      setTypeToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Types</h1>
          <p className="text-muted-foreground">Manage various categories of employee leaves.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Leave Type
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leave types..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Name</TableHead>
              <TableHead>Days/Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-blue-600"><Loader2 className="animate-spin mx-auto"/></TableCell>
              </TableRow>
            ) : types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No records found</TableCell>
              </TableRow>
            ) : (
              types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.limit_days} Days</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(t)}>
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
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
              onClick={() => fetchTypes(pagination.current_page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchTypes(pageNum)}
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
              onClick={() => fetchTypes(pagination.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedType ? "Edit Leave Type" : "Create Leave Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Type Name</Label>
              <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Sick Leave, Annual Leave" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Days per Year</Label>
              <Input id="days" type="number" required value={formData.limit_days} onChange={e => setFormData({...formData, limit_days: parseInt(e.target.value)})} />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <input type="checkbox" checked={formData.status} onChange={e => setFormData({...formData, status: e.target.checked})} className="rounded border-gray-300" id="status" />
              <Label htmlFor="status">Active</Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                {formLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                {selectedType ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Deletion"
        message="Are you sure you want to delete this leave type? This action cannot be undone and may affect existing leave requests."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
