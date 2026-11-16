"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ================= HELPERS ================= */
const formatCurrency = (value?: string | number) =>
  value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

/* ================= TYPES ================= */
interface DashboardStats {
  total_customers: number;
  active_loans: number;
  total_applications: number;
  pending_applications: number;
  approved_cams: number;
  disbursed_loans: number;
  total_disbursed_amount: number;
  total_sanctioned_amount: number;
}

interface ChartData {
  month: string;
  amount?: number;
  count?: number;
}

interface RecentApplication {
  id: number;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [disbursementChart, setDisbursementChart] = useState<ChartData[]>([]);
  const [applicationTrend, setApplicationTrend] = useState<ChartData[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);


  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const loggedInUser = getLoggedInUser();

  const branchName = loggedInUser?.branch_name || loggedInUser?.branch_details?.name || loggedInUser?.branch;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axiosInstance.get(ProjectApiList.api_getLoanDashboard);
        if (response.data.success) {
          const { stats, charts, recent_applications } = response.data.data;
          setStats(stats);
          setDisbursementChart(charts.disbursement_trend);
          setApplicationTrend(charts.application_trend);
          setRecentApplications(recent_applications);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
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
        <p className="text-gray-500">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Loan Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Branch: <span className="font-medium text-gray-700">{branchName}</span>
          </p>
        </div>

        <p className="text-sm text-gray-500">
          Total Disbursed:{" "}
          <span className="font-semibold text-blue-600">
            {formatCurrency(stats.total_disbursed_amount)}
          </span>
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Customers", value: stats.total_customers },
          { title: "Approved CAMs", value: stats.approved_cams },
          { title: "Active Loans", value: stats.active_loans },
          { title: "Pending Apps", value: stats.pending_applications },
          { title: "Applications", value: stats.total_applications },
          { title: "Disbursed Loans", value: stats.disbursed_loans },
          { title: "Sanctioned Amt", value: formatCurrency(stats.total_sanctioned_amount) },
          { title: "Disbursed Amt", value: formatCurrency(stats.total_disbursed_amount) },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow transition"
          >
            <p className="text-xs text-gray-500">{item.title}</p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Disbursement */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Monthly Disbursement
          </h3>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={disbursementChart}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar
                dataKey="amount"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Application Trend */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Application Trend
          </h3>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={applicationTrend}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* RECENT APPLICATIONS */}
      {/* <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Recent Applications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentApplications.map((app) => (
                <tr key={app.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(app.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${app.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        app.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentApplications.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No recent applications found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div> */}
    </div>
  );
}