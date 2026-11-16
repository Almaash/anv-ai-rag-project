"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Loader2, Phone, Edit2, Printer, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceItem {
  id: number;
  product_name: string;
  attribute_summary: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: number;
  invoice_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  grand_total: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  payment_method: string;
  items: InvoiceItem[];
}

export default function OrderListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, search]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ProjectApiList.GET_ADVANCE_BOOKINGS, {
        params: { page: currentPage, per_page: ITEMS_PER_PAGE, search }
      });
      if (res.data.status === 'success') {
        const data = res.data.data;
        setInvoices(data.data || []);
        setTotalPages(data.last_page || 1);
        setTotalItems(data.total || 0);
      }
    } catch (err) {
      console.error("Fetch invoices failed", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    const label = status || "Pending";

    if (s === "paid") return <Badge className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{label}</Badge>;
    if (s === "partial") return <Badge className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">{label}</Badge>;
    return <Badge className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">{label}</Badge>;
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;

    try {
      setActionLoading(true);
      const res = await axiosInstance.delete(`${ProjectApiList.DELETE_ADVANCE_BOOKING}/${selectedInvoice.id}`);

      if (res.data.status === "success" || res.data.success) {
        toast.success(res.data.message || "Advance booking deleted successfully");
        setIsDeleteModalOpen(false);
        setSelectedInvoice(null);
        fetchInvoices();
      } else {
        toast.error("Failed to delete advance booking");
      }
    } catch (err) {
      console.error("Delete advance booking failed", err);
      toast.error("Failed to delete advance booking");
    } finally {
      setActionLoading(false);
    }
  };

  const from = invoices.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const to = invoices.length ? Math.min(currentPage * ITEMS_PER_PAGE, totalItems) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Advance Bookings</h1>
        <Button
          type="button"
          onClick={() => router.push("/inventory/advance-booking/add")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          + Create Advance Booking
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">{totalItems} orders found</p>
          <Input
            placeholder="Search invoice, name or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-72 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["S.No", "Customer", "Phone", "Total", "Paid", "Due", "Status", "Actions"].map((head) => (
                    <th key={head} className="px-4 py-3 border-b">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                      <p className="mt-2 text-xs text-gray-500">Loading orders...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, index) => {
                    const serialNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                    return (
                      <tr key={inv.id} className="hover:bg-blue-50">
                        <td className="px-4 py-3">{serialNo}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{inv.customer_name || "Walk-in Customer"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          {inv.customer_phone || "N/A"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">₹{Number(inv.grand_total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">₹{Number(inv.paid_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600">₹{Number(inv.balance_amount).toLocaleString()}</td>
                        <td className="px-4 py-3">{getStatusBadge(inv.payment_status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/inventory/advance-booking/view?id=${inv.booking_no}`)}
                              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1">
                                <Eye size={14} />
                                <span>View</span>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsDeleteModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-md bg-white border border-red-200 text-xs text-red-600 shadow-sm hover:bg-red-50"
                            >
                              <div className="flex items-center gap-1">
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </div>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
                                  <MoreVertical size={16} className="text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-white border border-gray-200 shadow-md p-1 rounded-md"
                              >
                                <DropdownMenuItem
                                  onClick={() => router.push(`/inventory/orders/add?id=${inv.invoice_no}`)}
                                  className="text-sm flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900"
                                >
                                  <Edit2 size={14} /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/inventory/orders/print?id=${inv.invoice_no}`)}
                                  className="text-sm flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:text-gray-900"
                                >
                                  <Printer size={14} /> Print
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <div className="flex justify-between items-center p-4 bg-gray-50 text-sm">
              <p>
                Showing <b>{from}</b> – <b>{to}</b> of <b>{totalItems}</b> orders
              </p>

              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SimpleConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        title="Delete Invoice?"
        message={`Delete invoice #${selectedInvoice?.invoice_no || ""} for ${selectedInvoice?.customer_name || "this customer"}? This action cannot be undone.`}
        confirmText={actionLoading ? "Deleting..." : "Confirm Delete"}
        onConfirm={handleDelete}
        loading={actionLoading}
        destructive
      />
    </div>
  );
}
