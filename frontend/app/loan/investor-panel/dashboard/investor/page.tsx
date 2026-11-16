"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Loader2 } from "lucide-react";

const formatCurrency = (value?: string | number) =>
    value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

interface DashboardData {
    investor: {
        unique_id: string;
        name: string;
        email: string;
        mobile: string;
        branch_id: string;
    };

    investment_stats: {
        total_investments: number;
        total_invested: number;
        total_self_amount: number;
        total_referral_used: number;
    };

    portfolio_stats: {
        current_week_total_earning: number;
        current_week_redemption_value: number;
        current_week_closing_balance: number;
        total_redeemed_all_time: number;
    };

    referral_stats: {
        total_referral_earned: number;
        available_referral_bonus: number;
        total_referrals: number;
    };

    redemption_stats: {
        total_requests: number;
        pending: number;
        approved: number;
        rejected: number;
        total_amount: number;
    };

    rinvestments: {
        investment_unique_id: string;
        investment_date: string;
        amount: string;
        rate: string;
        lockin: string;
        total_weeks: number;
        current_week: number;
        current_week_data: {
            week_number: number;
            date: string;
            self_bonus: number;
            referral_bonus: number;
            total_earning: number;
            redemption_value: number;
            closing_balance: number;
            redemption_status: string;
        };
    }[];
}

const StatCard = ({
    title,
    value,
}: {
    title: string;
    value: string | number;
}) => (

    <div className="bg-white border rounded-xl p-4 shadow-sm">
        <p className="text-xs uppercase text-gray-500 tracking-wider">
            {title}
        </p>
        <p className="text-xl font-semibold text-blue-600 mt-2">
            {value}
        </p>
    </div>
);

export default function InvestorDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const stored = localStorage.getItem("user");
                const user = stored ? JSON.parse(stored) : null;

                if (!user?.unique_id) return;

                const res = await axiosInstance.get(
                    `${ProjectApiList.INVESTOR_DASHBOARD}/${user.unique_id}`
                );

                if (res.data.success) {
                    if (res.data.success) {
                        setData(res.data.data);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();

    }, []);

    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center"> <Loader2 size={40} className="animate-spin text-blue-600" /> </div>
        );
    }

    if (!data) {
        return (<div className="min-h-screen flex items-center justify-center">
            Failed to load dashboard </div>
        );
    }

    return (<div className="min-h-screen bg-gray-50 p-6 space-y-6">
        {/* Header */} <div className="bg-white border rounded-xl p-6 shadow-sm"> <h1 className="text-2xl font-bold text-gray-800">
            Investor Dashboard </h1>

            <p className="text-gray-500 mt-1">
                Welcome back, {data.investor.name}
            </p>
        </div>

        {/* Investor Info */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">
                Investor Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-500">Investor ID</p>
                    <p>{data.investor.unique_id}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Branch</p>
                    <p>{data.investor.branch_id}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p>{data.investor.email}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Mobile</p>
                    <p>{data.investor.mobile}</p>
                </div>
            </div>
        </div>

        {/* Investment Stats */}
        <div>
            <h2 className="font-semibold text-lg mb-4">
                Investment Statistics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Current Week Earning"
                    value={formatCurrency(
                        data.portfolio_stats.current_week_total_earning
                    )}
                />

                <StatCard
                    title="Current Week Redemption"
                    value={formatCurrency(
                        data.portfolio_stats.current_week_redemption_value
                    )}
                />

                <StatCard
                    title="Current Week Closing Balance"
                    value={formatCurrency(
                        data.portfolio_stats.current_week_closing_balance
                    )}
                />

                <StatCard
                    title="Total Redeemed"
                    value={formatCurrency(
                        data.portfolio_stats.total_redeemed_all_time
                    )}
                />
            </div>
        </div>


        {/* Referral Stats */}
        <div>
            <h2 className="font-semibold text-lg mb-4">
                Referral Statistics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                    title="Referral Earned"
                    value={formatCurrency(
                        data.referral_stats.total_referral_earned
                    )}
                />

                <StatCard
                    title="Available Bonus"
                    value={formatCurrency(
                        data.referral_stats.available_referral_bonus
                    )}
                />

                <StatCard
                    title="Total Referrals"
                    value={data.referral_stats.total_referrals}
                />
            </div>
        </div>


        {/*   Investment Portfolio */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="font-semibold">
                    Investment Portfolio
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-3">Investment ID</th>
                            <th className="text-left p-3">Amount</th>
                            <th className="text-left p-3">Rate</th>
                            <th className="text-left p-3">Current Week</th>
                            <th className="text-left p-3">Weekly Earning</th>
                            <th className="text-left p-3">Redemption Value</th>
                            <th className="text-left p-3">Closing Balance</th>
                        </tr>
                    </thead>

                    <tbody>
                        {(data.investments || []).map((item) => (
                            <tr
                                key={item.investment_unique_id}
                                className="border-t hover:bg-gray-50"
                            >
                                <td className="p-3">
                                    {item.investment_unique_id}
                                </td>

                                <td className="p-3">
                                    {formatCurrency(item.amount)}
                                </td>

                                <td className="p-3">
                                    {item.rate}%
                                </td>

                                <td className="p-3">
                                    Week {item.current_week}
                                </td>

                                <td className="p-3">
                                    {formatCurrency(
                                        item.current_week_data.total_earning
                                    )}
                                </td>

                                <td className="p-3">
                                    {formatCurrency(
                                        item.current_week_data.redemption_value
                                    )}
                                </td>

                                <td className="p-3">
                                    {formatCurrency(
                                        item.current_week_data.closing_balance
                                    )}
                                </td>
                            </tr>
                        ))}

                        {(!data.investments ||
                            data.investments.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="p-10 text-center text-gray-500"
                                    >
                                        No investments found
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
