"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Check, X, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "../api/hrmsApi";
import Link from "next/link";

export default function LeaveRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userType, setUserType] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSearch = searchParams.get("search") || "";
  const initialPerPage = Number(searchParams.get("per_page")) || 15;
  const initialStatus = searchParams.get("status") || "";

  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    current_page: initialPage,
    last_page: 1,
    total: 0,
    per_page: initialPerPage,
  });

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<{ id: number; status: string } | null>(null);
  const [statusRemarks, setStatusRemarks] = useState("");

  useEffect(() => {
    setUserType(localStorage.getItem("user_type"));
  }, []);

  const updateUrl = useCallback((page: number, query: string, perPage: number, status: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (query) params.set("search", query);
    if (perPage !== 15) params.set("per_page", perPage.toString());
    if (status) params.set("status", status);
    
    router.push(`/hrms/leaves?${params.toString()}`, { scroll: false });
  }, [router]);

  const fetchData = useCallback(async (page = pagination.current_page, query = search, status = filterStatus, per_page = pagination.per_page) => {
    try {
      setLoading(true);
      const params: any = { page, search: query, per_page: per_page };
      if (status) params.status = status;
      
      const res = await getLeaveRequests(params);
      
      if (res.data?.status === "success") {
        setRequests(res.data.data || []);
        if (res.data.meta) {
          setPagination({
            current_page: res.data.meta.current_page,
            last_page: res.data.meta.last_page,
            total: res.data.meta.total,
            per_page: res.data.meta.per_page,
          });
        }
      } else {
        const payload = res.data;
        const items = Array.isArray(payload) ? payload : (payload?.data || []);
        setRequests(items);
        if (payload?.current_page) {
          setPagination({
            current_page: payload.current_page,
            last_page: payload.last_page,
            total: payload.total,
            per_page: payload.per_page,
          });
        }
      }
      updateUrl(page, query, per_page, status);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, updateUrl]);

  useEffect(() => {
    fetchData(initialPage, search, filterStatus, pagination.per_page);
  }, []);

  const handleSearch = () => {
    fetchData(1, search, filterStatus);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage }));
    fetchData(1, search, filterStatus, newPerPage);
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage, search, filterStatus, pagination.per_page);
  };

  const handleStatusUpdate = (id: number, status: string) => {
    setStatusAction({ id, status });
    setStatusRemarks("");
    setIsStatusDialogOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (!statusAction) return;
    setFormLoading(true);
    try {
      const userId = 1;
      const payload = { approved_by: userId, remarks: statusRemarks };
      
      if (statusAction.status === 'approved') {
        await approveLeaveRequest(statusAction.id, payload);
      } else {
        await rejectLeaveRequest(statusAction.id, payload);
      }
      
      toast.success(`Request ${statusAction.status === 'approved' ? 'Approved' : 'Rejected'}`);
      fetchData();
      setIsStatusDialogOpen(false);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setFormLoading(false);
      setStatusAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">Manage employee leave applications and approvals.</p>
        </div>
        <Link href="/hrms/leaves/request">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> {userType === "employee" ? "Apply Leave" : "New Request"}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant={filterStatus === "" ? "default" : "outline"} onClick={() => setFilterStatus("")}>All</Button>
          <Button variant={filterStatus === "pending" ? "default" : "outline"} onClick={() => setFilterStatus("pending")}>Pending</Button>
          <Button variant={filterStatus === "approved" ? "default" : "outline"} onClick={() => setFilterStatus("approved")}>Approved</Button>
          <Button variant={filterStatus === "rejected" ? "default" : "outline"} onClick={() => setFilterStatus("rejected")}>Rejected</Button>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
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

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>From / To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-blue-600"><Loader2 className="animate-spin mx-auto"/></TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No records</TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold text-blue-600">{r.request_id || r.id}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{r.employee?.user?.name || r.employee?.first_name + ' ' + r.employee?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{r.employee?.employee_id}</div>
                  </TableCell>
                  <TableCell>{r.leave_type?.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      r.leave_category === 'sick' ? 'bg-purple-100 text-purple-700' :
                      r.leave_category === 'casual' ? 'bg-blue-100 text-blue-700' :
                      r.leave_category === 'maternity' ? 'bg-pink-100 text-pink-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {r.leave_category?.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.start_date} <br/> {r.end_date}
                  </TableCell>
                  <TableCell>{r.total_days}</TableCell>
                  <TableCell>
                    {r.is_paid_leave ? 
                      <span className="text-orange-600 font-semibold">Yes</span> : 
                      <span className="text-gray-500">No</span>
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {userType !== 'employee' && r.status === 'pending' && (
                      <>
                        <Button variant="outline" size="icon" className="text-green-600" onClick={() => handleStatusUpdate(r.id, 'approved')}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-red-600" onClick={() => handleStatusUpdate(r.id, 'rejected')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 gap-4 shadow-sm">
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
                {[10, 15, 25, 50, 100].map(size => (
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
              onClick={() => handlePageChange(pagination.current_page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
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
              onClick={() => handlePageChange(pagination.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {statusAction?.status === 'approved' ? 'Approval' : 'Rejection'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to <strong>{statusAction?.status}</strong> this leave request?
            </p>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <textarea
                id="remarks"
                className="w-full border rounded-md p-2 min-h-[100px] outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                placeholder="Enter reason or comments..."
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
              <Button 
                type="button" 
                className={statusAction?.status === 'approved' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                disabled={formLoading}
                onClick={confirmStatusUpdate}
              >
                {formLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                Confirm {statusAction?.status === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
