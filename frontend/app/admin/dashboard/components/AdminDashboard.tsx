"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

import StatCard from "./StatCard";
import SectionBox from "./SectionBox";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [fetchingOverview, setFetchingOverview] = useState(false);
  const [fetchingBranchWise, setFetchingBranchWise] = useState(false);

  const [overview, setOverview] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchWise, setBranchWise] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isCmsAdmin, setIsCmsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  /* ================= FILTER STATE ================= */
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    branch_id: ""
  });

  /* ================= INITIALIZE USER FILTER ================= */
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      // If user is cms_admin, default to their branch and disable the filter
      if (user.role === "cms_admin" && user.branch) {
        setFilters(prev => ({ ...prev, branch_id: user.branch }));
        setIsCmsAdmin(true);
      }
    }
  }, []);

  /* ================= PARAM BUILDER ================= */
  const getParams = () => {
    const params: any = {};

    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.branch_id) params.branch_id = filters.branch_id;

    return params;
  };

  /* ================= API CALLS ================= */

  useEffect(() => {
    fetchDashboard();
    fetchBranches();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await axiosInstance.get(ProjectApiList.api_getSubscription);
      setSubscription(res?.data?.data?.subscription || null);
    } catch (err) {
      console.error("Subscription API error:", err);
    }
  };

  // Auto-fetch dashboard when branch filter changes
  useEffect(() => {
    if (!loading) {
      fetchDashboard();
      if (filters.branch_id) {
        fetchBranchWise(filters.branch_id);
        setSelectedBranch(filters.branch_id);
      } else {
        setBranchWise(null);
        setSelectedBranch("");
      }
    }
  }, [filters.branch_id, loading]);

  const fetchDashboard = async () => {
    setFetchingOverview(true);
    try {
      const res = await axiosInstance.get(
        ProjectApiList.GET_DASHBOARD_OVERVIEW,
        { params: getParams() }
      );
      setOverview(res?.data?.data || null);
    } catch (err) {
      console.error("Overview API error:", err);
    } finally {
      setFetchingOverview(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axiosInstance.get(ProjectApiList.api_getBranches);
      const branchesData = res.data.data.data; // The /branches API has pagination so it's data.data.data
      setBranches(branchesData || []);
    } catch (err) {
      console.error("Branches API error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchWise = async (code?: string) => {
    setFetchingBranchWise(true);
    try {
      const res = await axiosInstance.get(
        ProjectApiList.GET_ALL_DASHBOARD_BRANCHES_WISE,
        {
          params: {
            ...getParams(),
            branch_id: code || filters.branch_id
          }
        }
      );
      setBranchWise(res?.data?.data || null);
    } catch (err) {
      console.error("Branch-wise API error:", err);
    } finally {
      setFetchingBranchWise(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  const charts = overview?.charts;

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">


        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Monitor your business performance across branches</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <select
              className="bg-white border-none text-slate-700 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5 shadow-sm min-w-[200px]"
              value={filters.branch_id}
              disabled={isCmsAdmin}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, branch_id: e.target.value }));
              }}
            >
              <option value="">All Branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= STAT CARDS ================= */}
        {fetchingOverview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Branches"
              value={overview?.branches_summary?.total_branches || 0}
              className="bg-white border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Active Branches"
              value={overview?.branches_summary?.active_branches || 0}
              className="bg-white border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Total Revenue"
              value={overview?.financial_overview?.total_revenue || 0}
              suffix="Rs."
              className="bg-white border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Net Profit"
              value={overview?.financial_overview?.net_profit || 0}
              suffix="Rs."
              className="bg-white border-l-4 border-l-amber-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Loan Disbursed"
              suffix="Rs."
              value={overview?.department_metrics?.loans?.disbursed_amount || 0}
              className="bg-white border-l-4 border-l-rose-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Total Products"
              value={overview?.department_metrics?.inventory?.total_products || 0}
              className="bg-white border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Employees"
              value={overview?.department_metrics?.hrms?.total_employees || 0}
              className="bg-white border-l-4 border-l-purple-500 hover:shadow-md transition-shadow"
            />
            <StatCard
              title="Low Stock Items"
              value={overview?.department_metrics?.inventory?.low_stock_items || 0}
              className="bg-white border-l-4 border-l-orange-500 hover:shadow-md transition-shadow"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ================= BRANCH WISE (LEFT COL) ================= */}
          <div className="lg:col-span-1">
            <SectionBox title="Branch Insight" description="Real-time branch metrics">
              {fetchingBranchWise ? (
                <div className="space-y-4 py-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
                  ))}
                </div>
              ) : branchWise ? (
                <div className="grid grid-cols-1 gap-4 py-2">
                  <MetricRow label="Loans" value={branchWise?.loans?.disbursements || 0} color="text-rose-600" bg="bg-rose-50" />
                  <MetricRow label="Collections" value={branchWise?.loans?.collections || 0} color="text-emerald-600" bg="bg-emerald-50" />
                  <MetricRow label="Sales" value={branchWise?.inventory?.sales || 0} color="text-blue-600" bg="bg-blue-50" />
                  <MetricRow label="Staff Count" value={branchWise?.hrms?.employees || 0} color="text-purple-600" bg="bg-purple-50" />
                  <MetricRow label="Revenue" value={`Rs. ${branchWise?.financial_summary?.revenue || 0}`} color="text-slate-900 font-bold" bg="bg-slate-100" />
                  <MetricRow label="Profit" value={`Rs. ${branchWise?.financial_summary?.profit || 0}`} color="text-indigo-600 font-bold" bg="bg-indigo-50" />
                </div>
              ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400 text-sm">Select a branch to view detailed insights</p>
                </div>
              )}
            </SectionBox>
          </div>

          {/* ================= CHARTS (RIGHT COL) ================= */}
          <div className="lg:col-span-2">
            {fetchingOverview ? (
              <div className="grid grid-cols-1 gap-8">
                <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {charts?.revenue_breakdown && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">{charts.revenue_breakdown.title}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={charts.revenue_breakdown.data.map((d: any) => ({
                            ...d,
                            value: Number(d.value)
                          }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={5}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {charts.revenue_breakdown.data.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {charts?.monthly_trends && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">{charts.monthly_trends.title}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={charts.monthly_trends.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= TABLE ================= */}
        {/* <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">Performance Ranking</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4 text-left">Branch Name</th>
                  <th className="px-6 py-4 text-left">Code</th>
                  <th className="px-6 py-4 text-right">Phone</th>
                  <th className="px-6 py-4 text-right">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-700">{b.name}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">{b.phone}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        User
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> */}

      </div>
    </div>
  );
}

// Helper Components for the new design
function MetricRow({ label, value, color, bg }: { label: string, value: any, color: string, bg: string }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl ${bg} border border-white/50 shadow-sm transition-transform hover:scale-[1.02]`}>
      <span className="text-slate-600 font-medium">{label}</span>
      <span className={`${color} text-lg`}>{value}</span>
    </div>
  );
}
