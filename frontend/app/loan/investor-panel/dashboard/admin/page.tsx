"use client";

import { useEffect, useState, Suspense } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Loader2 } from "lucide-react";

/* ================= HELPERS ================= */
const formatCurrency = (value?: string | number) =>
    value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

/* ================= TYPES ================= */
interface DashboardStats {
    total_investors: number;
    total_investment_amount: number;
    active_investments: number;
    inactive_investments: number;
    total_pools: number;
    avg_investment: number;
}

interface RecentInvestment {
    unique_id: string;
    investor?: {
        first_name: string;
        last_name: string;
    };
    investor_type?: {
        name: string;
    };
    pool?: {
        pool_name: string;
    };
    amount: number;
    status?: string;
}

export default function AdminInvestorDashboardContent() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentInvestments, setRecentInvestments] = useState<RecentInvestment[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
                const user = stored ? JSON.parse(stored) : null;

                const response = await axiosInstance.get(ProjectApiList.GET_INVESTOR_DASHBOARD, {
                    params: {
                        branch_id: user?.branch_id || user?.branch || undefined,
                        cms_admin_id: user?.cms_admin || user?.created_by || undefined,
                    },
                });
                if (response.data.success) {
                    const { stats, recent_investments } = response.data.data;
                    setStats(stats);
                    setRecentInvestments(recent_investments);
                }
            } catch (error) {
                console.error("Error fetching investor dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500 uppercase text-xs">Failed to load dashboard data.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-xl font-medium text-gray-800 tracking-tight">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-gray-400">
                        Manage and track investor portfolios and pools.
                    </p>
                </div>

                <p className="text-sm text-gray-500">
                    Total Invested:{" "}
                    <span className="text-blue-600">
                        {formatCurrency(stats.total_investment_amount)}
                    </span>
                </p>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                    { title: "Total Investors", value: stats.total_investors },
                    { title: "Investment Amount", value: formatCurrency(stats.total_investment_amount) },
                    { title: "Active Investments", value: stats.active_investments },
                    { title: "Inactive Investments", value: stats.inactive_investments },
                    { title: "Total Pools Used", value: stats.total_pools },
                    { title: "Avg. Investment", value: formatCurrency(stats.avg_investment) },
                    { title: "Portfolio Yield", value: "Available" },
                    { title: "Market Growth", value: "Stable" },
                ].map((item, i) => (
                    <div
                        key={i}
                        className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow transition"
                    >
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider">{item.title}</p>
                        <p className="text-lg text-gray-800 mt-1">
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* INVESTMENT SUMMARY SECTION (Simple design like cards) */}
            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                <h2 className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-4">Investment Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Total Amount Invested</p>
                        <p className="text-2xl text-blue-600">{formatCurrency(stats.total_investment_amount)}</p>
                    </div>
                    <div className="space-y-1 border-l pl-8">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Number of Pools Used</p>
                        <p className="text-2xl text-gray-800">{stats.total_pools}</p>
                    </div>
                    <div className="space-y-1 border-l pl-8">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Average Investment</p>
                        <p className="text-2xl text-gray-800">{formatCurrency(stats.avg_investment)}</p>
                    </div>
                </div>
            </div>

            {/* RECENT INVESTMENTS TABLE */}
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h3 className="text-[11px] text-gray-600 uppercase tracking-widest">Recent Investors & Investments</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 italic-rows-removed">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Investor Name</th>
                                <th className="px-6 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {recentInvestments.map((inv) => (
                                <tr key={inv.unique_id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase tracking-tighter">
                                        {inv.investor ? `${inv.investor.first_name} ${inv.investor.last_name}` : "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500 uppercase">
                                        {inv.investor_type?.name || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase tracking-tighter">
                                        {inv.date || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(inv.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="px-2 py-0.5 inline-flex text-[9px] leading-5 rounded-md uppercase bg-blue-50 text-blue-700 border border-blue-100">
                                            {inv.status || "Active"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentInvestments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-xs text-gray-400 uppercase tracking-widest">
                                        No recent investment activity detected
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}


