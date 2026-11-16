"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Edit2, Loader2, Package, ShoppingCart, UserSquare2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import Link from "next/link";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";
import BASE_URL from "@/app/api/BaseUrl";

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

interface Vendor {
  id: number;
  unique_id: string;
  name: string;
  business_name?: string;
  profile_photo?: string;
  phone: string;
  email?: string;
  address?: string;
  gst_number?: string;
  status: "active" | "inactive";
}

interface VendorReportData {
  summary: {
    total_purchase_amount: number;
    total_purchase_orders: number;
    total_supplied_quantity: number;
  };
  product_supply_by_vendor: Array<{
    product_id: number;
    product_name: string;
    sku_code: string;
    supplied_quantity: number | string;
    supplied_value: number | string;
    avg_purchase_price: number | string;
  }>;
  detailed_vendor_purchases: Array<{
    id: number;
    unique_id: string;
    purchase_date: string;
    total_amount: number | string;
    items: Array<{
      id: number;
      product_master_id?: string;
      product_master?: {
        name: string;
        sku_code?: string;
      };
      is_product_deleted?: boolean;
      product_deleted_on?: string | null;
    }>;
  }>;
}

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

export default function VendorViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [report, setReport] = useState<VendorReportData>({
    summary: {
      total_purchase_amount: 0,
      total_purchase_orders: 0,
      total_supplied_quantity: 0,
    },
    product_supply_by_vendor: [],
    detailed_vendor_purchases: [],
  });
  const apiOrigin = (BASE_URL || "").replace(/\/api\/?$/, "");
  const getPhotoUrl = (photo: string) => {
    if (!photo) return "";
    if (/^https?:\/\//i.test(photo)) return photo;
    return `${apiOrigin}${photo.startsWith("/") ? photo : `/${photo}`}`;
  };

  useEffect(() => {
    if (!vendorId) {
      toast.error("Vendor id missing");
      router.push("/inventory/master/vendor");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fix: Use the correct vendor_id and low_stock_threshold
        // Check if vendorId is a string like "VND-001" or a numeric ID
        const finalVendorId = isNaN(Number(vendorId)) ? vendorId : Number(vendorId);

        const [vendorRes, reportRes] = await Promise.all([
          axiosInstance.get(`${ProjectApiList.GET_SINGLE_VENDOR}/${vendorId}`),
          axiosInstance.get(ProjectApiList.GET_VENDOR_PURCHASE_REPORT, {
            params: {
              vendor_id: finalVendorId,
              low_stock_threshold: 10,
            },
          }),
        ]);

        if (vendorRes.data?.success) {
          setVendor(vendorRes.data.data || null);
        }

        if (reportRes.data?.success) {
          const data = reportRes.data.data || {};
          setReport({
            summary: data.summary || {
              total_purchase_amount: 0,
              total_purchase_orders: 0,
              total_supplied_quantity: 0,
            },
            product_supply_by_vendor: data.product_supply_by_vendor || [],
            detailed_vendor_purchases: data.detailed_vendor_purchases || [],
          });
        }
      } catch (error) {
        toast.error("Failed to load vendor details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, vendorId]);

  const vendorName = useMemo(() => vendor?.business_name || vendor?.name || "Vendor", [vendor]);
  const vendorPhotoUrl = useMemo(() => (vendor?.profile_photo ? getPhotoUrl(vendor.profile_photo) : ""), [vendor]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/inventory/master/vendor" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50">
              <ArrowLeft size={18} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Vendor Overview</h1>
              <p className="hidden text-xs font-medium text-slate-500 sm:block">{vendorName}</p>
            </div>
          </div>
          <Button type="button" onClick={() => setConfirmEdit(true)} className="h-10 bg-blue-600 px-5 text-xs font-bold uppercase tracking-wider hover:bg-blue-700">
            <Edit2 size={14} className="mr-1.5" />
            Edit Vendor
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={24} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading vendor details...</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[112px_1fr]">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {vendor?.profile_photo ? (
                  <img
                    src={vendorPhotoUrl}
                    alt={vendorName}
                    className="h-full w-full cursor-zoom-in object-cover"
                    onClick={() => setIsImagePreviewOpen(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UserSquare2 size={42} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {hasValue(vendor?.business_name) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Name</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.business_name}</p>
                  </div>
                )}
                {hasValue(vendor?.name) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Person</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.name}</p>
                  </div>
                )}
                {hasValue(vendor?.phone) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.phone}</p>
                  </div>
                )}
                {hasValue(vendor?.email) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.email}</p>
                  </div>
                )}
                {hasValue(vendor?.gst_number) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">GST</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.gst_number}</p>
                  </div>
                )}
                {hasValue(vendor?.address) && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{vendor?.address}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <ShoppingCart size={12} />
                  Total Purchase Value
                </p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(report.summary.total_purchase_amount)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <Building2 size={12} />
                  Purchase Orders
                </p>
                <p className="text-2xl font-black text-slate-900">{Number(report.summary.total_purchase_orders || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <Package size={12} />
                  Supplied Quantity
                </p>
                <p className="text-2xl font-black text-slate-900">{Number(report.summary.total_supplied_quantity || 0).toLocaleString()}</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">Product Supply by Vendor</h2>
              </div>
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.product_supply_by_vendor.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                          No supplied products found
                        </td>
                      </tr>
                    ) : (
                      report.product_supply_by_vendor.map((item) => (
                        <tr key={item.product_id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{item.product_name}</p>
                            <p className="text-xs text-slate-400">{item.sku_code}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{Number(item.supplied_quantity || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(item.supplied_value)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.avg_purchase_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">Recent Purchases</h2>
              </div>
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Purchase ID</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Products</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.detailed_vendor_purchases.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                          No purchase history found
                        </td>
                      </tr>
                    ) : (
                      report.detailed_vendor_purchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="px-4 py-3 font-semibold text-slate-700">{purchase.unique_id}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={12} />
                              {purchase.purchase_date || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {purchase.items?.length ? (
                              <div className="space-y-1">
                                {purchase.items.map((item) => {
                                  const productName = item.product_master?.name?.trim();
                                  const deletedOn = item.product_deleted_on || purchase.purchase_date || "-";

                                  if (productName && !item.is_product_deleted) {
                                    return (
                                      <p key={item.id} className="text-slate-700">
                                        {productName}
                                      </p>
                                    );
                                  }

                                  return (
                                    <div key={item.id} className="space-y-0.5">
                                      <p className="font-semibold text-red-600">
                                        Recently deleted: {productName || item.product_master_id || "Product"}
                                      </p>
                                      <p className="text-xs font-semibold text-red-500">
                                        Removed on {deletedOn}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(purchase.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {isImagePreviewOpen && vendorPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setIsImagePreviewOpen(false)}>
          <button
            type="button"
            onClick={() => setIsImagePreviewOpen(false)}
            className="absolute right-4 top-4 rounded-md bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
          <img
            src={vendorPhotoUrl}
            alt={`${vendorName} large preview`}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <SimpleConfirmDialog
        open={confirmEdit}
        onOpenChange={setConfirmEdit}
        title="Edit Vendor?"
        message={`Do you want to open edit page for "${vendorName}"?`}
        confirmText="Yes, Continue"
        onConfirm={() => router.push(`/inventory/master/vendor/add?id=${vendorId}`)}
      />
    </div>
  );
}

