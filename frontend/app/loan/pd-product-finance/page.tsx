"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

export default function PDProductFinancePage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(ProjectApiList.LOAN_PRODUCT_ORDERS);
            if (res.data.success) {
                setOrders(res.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filtered = orders.filter((o) =>
        [o.order_code, o.product_name, o.loan_application_id, o.customer_unique_id, o.status]
            .join(" ").toLowerCase().includes(search.toLowerCase())
    );

    const statusColor: Record<string, string> = {
        loan_booked: "bg-blue-50 text-blue-700",
        completed:   "bg-green-50 text-green-700",
        cancelled:   "bg-red-50 text-red-700",
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Loan Product Orders</h1>
                <Link href="/loan/pd-product-finance/createPDProduct">
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        + Create Order
                    </button>
                </Link>
            </div>

            <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-gray-600">{filtered.length} orders found</p>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by order code, product, CAF ID..."
                        className="w-72 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {["Order Code", "CAF ID", "Products", "Total Cost", "Status", "Date", "Action"].map((h) => (
                                        <th key={h} className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-gray-400">No orders found</td>
                                    </tr>
                                ) : filtered.map((o) => (
                                    <tr key={o.id} className="hover:bg-gray-50">
                                        <td className="border-b border-gray-200 px-4 py-3 font-medium">{o.order_code}</td>
                                        <td className="border-b border-gray-200 px-4 py-3">{o.loan_application_id || "—"}</td>
                                        <td className="border-b border-gray-200 px-4 py-3">
                                            {o.products && o.products.length > 0 ? (
                                                <div className="space-y-1">
                                                    {o.products.map((p: any, i: number) => (
                                                        <div key={i} className="text-xs">
                                                            <span className="font-medium">{p.product_name}</span>
                                                            <span className="text-gray-400 ml-1">×{p.quantity}</span>
                                                            {p.attribute_summary && p.attribute_summary !== "Default" && (
                                                                <span className="ml-1 text-gray-400">({p.attribute_summary})</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span>{o.product_name} ×{o.quantity}</span>
                                            )}
                                        </td>
                                        <td className="border-b border-gray-200 px-4 py-3 font-medium">₹{Number(o.display_amount ?? o.total_cost).toLocaleString()}</td>
                                        <td className="border-b border-gray-200 px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[o.status] || "bg-gray-50 text-gray-700"}`}>
                                                {o.status?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="border-b border-gray-200 px-4 py-3 text-gray-500">
                                            {new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="border-b border-gray-200 px-4 py-3">
                                            <Link href={`/loan/pd-product-finance/viewPDProduct?id=${o.id}`}>
                                                <button className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">View</button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
