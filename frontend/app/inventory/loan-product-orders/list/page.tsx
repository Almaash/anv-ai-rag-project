"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

type LoanProductOrder = {
  id: number;
  order_code: string;
  loan_application_id: string;
  customer_unique_id: string;
  caf_status?: string;
  display_product_name?: string;
  display_amount?: number;
  total_products?: number;
  total_cost?: number;
  status?: string;
  created_at?: string;
  products?: any[];

  loan_detail?: {
    loan_id?: number;
    loan_number?: string;
    disbursement_id?: string;
    disbursement_updated?: boolean;
    frequency?: string;
    emi_amount?: number;
    total_interest?: number;
    total_amount?: number;
    customer_name?: string;
    mobile_number?: string;
    remarks?: string;

    // Allow any additional fields returned by the API
    [key: string]: any;
  };
};

export default function LoanProductOrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<LoanProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LoanProductOrder | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const user = getLoggedInUser();
      const params: any = {
        page,
        per_page: perPage,
        search,
      };

      if (user?.branch) {
        params.branch_id = user.branch;
      }

      const res = await axiosInstance.get(ProjectApiList.LOAN_PRODUCT_ORDERS, {
        params,
      });

      if (res.data.success) {
        setOrders(res.data.data || []);
        const pagination = res.data.pagination || res.data.pagination || null;
        if (pagination) {
          setTotal(pagination.total || 0);
          setLastPage(pagination.last_page || 1);
        } else {
          // fallback
          setTotal((res.data.data || []).length || 0);
        }
      } else {
        toast.error(res.data.message || "Failed to load loan product orders");
      }
    } catch (err) {
      console.error("Fetch loan product orders failed", err);
      toast.error("Failed to load loan product orders");
    } finally {
      setLoading(false);
    }
  };


  const handleRestoreInventory = async () => {
    if (!selectedOrder) return;

    try {
      setRestoring(true);

      const res = await axiosInstance.post(
        `${ProjectApiList.RESTORE_LOAN_PRODUCT_ORDER}/${selectedOrder.id}/restore`
      );
      if (res.data.success) {
        toast.success(res.data.message);

        // Close modal
        setViewOpen(false);
        setSelectedOrder(null);

        // Refresh listing
        fetchOrders();
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to restore inventory."
      );
    } finally {
      setRestoring(false);
    }
  };

  const from = orders.length ? (page - 1) * perPage + 1 : 0;
  const to = orders.length ? Math.min(page * perPage, total) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Loan Product Orders</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">{total} orders found</p>
          <Input
            placeholder="Search order, loan id or customer id"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {['S.No', 'Order Code', 'Loan', 'Customer', 'CAF Status', 'Product', 'Amount', 'Products', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10">
                      <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                      <p className="mt-2 text-xs text-gray-500">Loading orders...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-500">No orders found</td>
                  </tr>
                ) : (
                  orders.map((o, idx) => {
                    const serial = (page - 1) * perPage + idx + 1;
                    return (
                      <tr key={o.id} className="hover:bg-blue-50">
                        <td className="px-4 py-3">{serial}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{o.order_code}</td>
                        <td className="px-4 py-3">{o.loan_application_id}</td>
                        <td className="px-4 py-3">{o.customer_unique_id}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${o.caf_status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {o.caf_status === "active" ? "Active" : "Deleted"}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-72">
                          <div
                            className="max-w-[180px] truncate font-medium"
                            title={
                              o.display_product_name ||
                              (o.products && o.products[0]?.product_name) ||
                              "-"
                            }
                          >
                            {o.display_product_name ||
                              (o.products && o.products[0]?.product_name) ||
                              "-"}
                          </div>
                        </td>                        <td className="px-4 py-3 font-medium text-gray-900">₹{Number(o.display_amount || o.total_cost || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{o.total_products ?? (o.products ? o.products.length : 0)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize
      ${o.status === "loan_booked"
                                ? "bg-blue-100 text-blue-700"
                                : o.status === "restored"
                                  ? "bg-green-100 text-green-700"
                                  : o.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : o.status === "cancelled"
                                      ? "bg-red-100 text-red-700"
                                      : o.status === "failed"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {(o.status || "-")}
                          </span>
                        </td>                        {/* <td className="px-4 py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td> */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(o as any);
                                setViewOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1"><Eye size={14} /><span>View</span></div>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <>
              <div className="flex justify-between items-center p-4 bg-gray-50 text-sm">
                <p>Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b> orders</p>

                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50">Previous</button>
                  <button disabled={page === lastPage} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50">Next</button>
                </div>
              </div>

              {/* View Modal */}
              {viewOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 md:p-6">
                  <div className="bg-white rounded-sm w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="sticky top-0 bg-white z-20 border-b px-4 md:px-6 py-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Loan Product Order Details
                        </h2>
                        <p className="text-sm text-gray-500">
                          Complete order information
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-3">

                        {selectedOrder?.caf_status === "deleted" &&
                          selectedOrder?.status !== "restored" && (
                            <Button
                              onClick={() => setRestoreConfirmOpen(true)}
                              disabled={restoring}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {restoring ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Restoring...
                                </>
                              ) : (
                                "Restore Products to Inventory"
                              )}
                            </Button>
                          )}

                        <Button
                          variant="outline"
                          onClick={() => {
                            setViewOpen(false);
                            setSelectedOrder(null);
                          }}
                        >
                          Close
                        </Button>

                      </div>
                    </div>

                    {viewLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2
                          className="animate-spin text-blue-600"
                          size={40}
                        />
                      </div>
                    ) : selectedOrder ? (
                      <div className="flex-1 overflow-y-auto p-4 md:p-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

                          <div className="bg-blue-50 border rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                              Order Code
                            </p>
                            <p className="font-bold text-gray-900 mt-1 break-all">
                              {selectedOrder.order_code}
                            </p>
                          </div>

                          <div className="bg-green-50 border rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                              Loan Application
                            </p>
                            <p className="font-bold text-gray-900 mt-1 break-all">
                              {selectedOrder.loan_application_id}
                            </p>
                          </div>

                          <div className="bg-yellow-50 border rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                              Customer ID
                            </p>
                            <p className="font-bold text-gray-900 mt-1 break-all">
                              {selectedOrder.customer_unique_id}
                            </p>
                          </div>

                          <div className="bg-purple-50 border rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                              Status
                            </p>
                            <p className="font-bold text-gray-900 mt-1">
                              {selectedOrder.status || "-"}
                            </p>
                          </div>

                          <div className="bg-emerald-50 border rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                              CAF Status
                            </p>

                            <div className="mt-2">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${selectedOrder.caf_status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                                  }`}
                              >
                                {selectedOrder.caf_status === "active"
                                  ? "Active"
                                  : "Deleted"}
                              </span>
                            </div>
                          </div>

                        </div>

                        <div className="flex flex-col gap-6">

                          {/* LEFT SIDE */}
                          <div className="w-full space-y-6">
                            {/* Products */}
                            <div className="bg-white border rounded-xl">

                              <div className="p-4 border-b">
                                <h3 className="font-semibold text-lg">
                                  Products
                                </h3>
                              </div>

                              {/* Desktop Table */}
                              <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="text-left px-4 py-3 border-b">
                                        Product
                                      </th>
                                      <th className="text-left px-4 py-3 border-b">
                                        Variant
                                      </th>
                                      <th className="text-left px-4 py-3 border-b">
                                        Qty
                                      </th>
                                      <th className="text-left px-4 py-3 border-b">
                                        Unit Price
                                      </th>
                                      <th className="text-left px-4 py-3 border-b">
                                        Total
                                      </th>
                                      {/* <th className="text-left px-4 py-3 border-b">
                                        Stock Before
                                      </th>
                                      <th className="text-left px-4 py-3 border-b">
                                        Stock After
                                      </th> */}
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {selectedOrder.products?.map((p, i) => (
                                      <tr
                                        key={i}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-3 border-b max-w-md">
                                          <div className="font-medium">
                                            {p.product_name}
                                          </div>
                                        </td>

                                        <td className="px-4 py-3 border-b">
                                          <div className="flex flex-wrap gap-1">
                                            {(p.attribute_summary || "")
                                              .split("|")
                                              .filter(Boolean)
                                              .map(
                                                (
                                                  attr: string,
                                                  idx: number
                                                ) => (
                                                  <span
                                                    key={idx}
                                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                                                  >
                                                    {attr.trim()}
                                                  </span>
                                                )
                                              )}
                                          </div>
                                        </td>

                                        <td className="px-4 py-3 border-b">
                                          {p.quantity}
                                        </td>

                                        <td className="px-4 py-3 border-b">
                                          ₹
                                          {Number(
                                            p.unit_price || 0
                                          ).toLocaleString()}
                                        </td>

                                        <td className="px-4 py-3 border-b font-semibold">
                                          ₹
                                          {Number(
                                            p.total_cost || 0
                                          ).toLocaleString()}
                                        </td>

                                        {/* <td className="px-4 py-3 border-b">
                                          {p.stock_before}
                                        </td>

                                        <td className="px-4 py-3 border-b">
                                          {p.stock_after}
                                        </td> */}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Cards */}
                              <div className="lg:hidden p-4 space-y-4">
                                {selectedOrder.products?.map((p, i) => (
                                  <div
                                    key={i}
                                    className="border rounded-xl p-4"
                                  >
                                    <h4 className="font-semibold text-gray-900">
                                      {p.product_name}
                                    </h4>

                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {(p.attribute_summary || "")
                                        .split("|")
                                        .filter(Boolean)
                                        .map(
                                          (
                                            attr: string,
                                            idx: number
                                          ) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                                            >
                                              {attr.trim()}
                                            </span>
                                          )
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">

                                      <div>
                                        <p className="text-gray-500">
                                          Quantity
                                        </p>
                                        <p>{p.quantity}</p>
                                      </div>

                                      <div>
                                        <p className="text-gray-500">
                                          Unit Price
                                        </p>
                                        <p>
                                          ₹
                                          {Number(
                                            p.unit_price || 0
                                          ).toLocaleString()}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-gray-500">
                                          Stock Before
                                        </p>
                                        <p>{p.stock_before}</p>
                                      </div>

                                      <div>
                                        <p className="text-gray-500">
                                          Stock After
                                        </p>
                                        <p>{p.stock_after}</p>
                                      </div>

                                    </div>
                                  </div>
                                ))}
                              </div>

                            </div>
                          </div>

                          {/* RIGHT SIDE */}
                          <div className="w-full">

                            <div className="bg-white border rounded-xl shadow-sm">

                              <div className="border-b p-4">
                                <h3 className="font-semibold text-lg">
                                  Loan Details
                                </h3>
                              </div>

                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                                {selectedOrder?.loan_detail ? (
                                  Object.entries(
                                    selectedOrder?.loan_detail
                                  ).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="bg-gray-50 rounded-lg p-3"
                                    >
                                      <p className="text-xs text-gray-500 uppercase">
                                        {key.replace(/_/g, " ")}
                                      </p>

                                      <p className="font-medium text-gray-900 break-words">
                                        {String(value ?? "-")}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    No loan details available
                                  </p>
                                )}

                              </div>

                            </div>

                          </div>

                        </div>

                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        No details available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AlertDialog
        open={restoreConfirmOpen}
        onOpenChange={(open) => {
          setRestoreConfirmOpen(open);

          if (!open) {
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore Inventory?
            </AlertDialogTitle>

            <AlertDialogDescription className="space-y-2">
              <p>
                This action will restore all products from this order back into
                inventory.
              </p>

              <div className="rounded-lg border bg-yellow-50 p-3 text-yellow-800 text-sm">
                <strong>Order:</strong> {selectedOrder?.order_code}
                <br />
                <strong>CAF:</strong> {selectedOrder?.loan_application_id}
              </div>

              <div className="space-y-2 pt-3">
                <Label htmlFor="restore-confirm">
                  Type <span className="font-bold text-red-600">RESTORE</span> to continue
                </Label>

                <Input
                  id="restore-confirm"
                  placeholder="Type RESTORE"
                  value={confirmText}
                  onChange={(e) =>
                    setConfirmText(e.target.value.toUpperCase())
                  }
                />
              </div>

              <p className="text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={restoring}
              onClick={() => {
                setConfirmText("");
              }}
            >              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={
                restoring ||
                confirmText !== "RESTORE"
              }
              onClick={async (e) => {
                e.preventDefault();

                await handleRestoreInventory();

                setConfirmText("");
                setRestoreConfirmOpen(false);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Yes, Restore Inventory"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
