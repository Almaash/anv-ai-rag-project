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
import { getDesignations, createDesignation, updateDesignation, deleteDesignation } from "../api/hrmsApi";

interface Designation {
  id: number;
  name: string;
  description: string;
  status: boolean;
}

export default function DesignationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") || "";
  const initialPerPage = Number(searchParams.get("per_page")) || 25;

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
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
    router.push(`/hrms/designations${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router]);

  const fetchDesignations = useCallback(async (page = pagination.current_page, query = search) => {
    try {
      setLoading(true);
      const res = await getDesignations({ page, search: query, per_page: pagination.per_page });
      if (res.data.status === "success") {
        setDesignations(res.data.data || []);
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
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, updateUrl]);

  useEffect(() => {
    fetchDesignations(initialPage, search);
  }, []);

  const handleSearch = () => {
    fetchDesignations(1, search);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage }));
    fetchDesignations(1, search);
  };

  const handleOpenModal = (designation: Designation | null = null) => {
    if (designation) {
      setSelectedDesignation(designation);
      setFormData({
        name: designation.name,
        description: designation.description || "",
        status: designation.status
      });
    } else {
      setSelectedDesignation(null);
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

      if (selectedDesignation) {
        await updateDesignation(selectedDesignation.id, payload);
        toast.success("Designation updated successfully");
      } else {
        await createDesignation(payload);
        toast.success("Designation created successfully");
      }
      fetchDesignations();
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
      await deleteDesignation(itemToDelete);
      toast.success("Designation deleted");
      fetchDesignations();
      setIsConfirmOpen(false);
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Designations</h1>
          <p className="text-muted-foreground">Manage job roles and positions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Designation
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search designations..."
              className="pl-8"
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

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </TableCell>
              </TableRow>
            ) : designations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No designations found.
                </TableCell>
              </TableRow>
            ) : (
              designations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.description || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${d.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {d.status ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenModal(d)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-red-600" onClick={() => confirmDelete(d.id)}>
                      <Trash2 className="h-4 w-4" />
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
              onClick={() => fetchDesignations(pagination.current_page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchDesignations(pageNum)}
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
              onClick={() => fetchDesignations(pagination.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDesignation ? "Edit Designation" : "Add New Designation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Designation Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Job responsibilities..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="status"
                checked={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="status">Active</Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedDesignation ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Designation"
        message="Are you sure you want to remove this designation? This may affect linked employees."
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
