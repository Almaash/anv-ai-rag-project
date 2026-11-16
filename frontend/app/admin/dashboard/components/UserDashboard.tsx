"use client";

import React, { useState } from "react";
import SectionBox from "./SectionBox";
import { Wallet, Users, Crown, Gift, ArrowUpCircle, UserCheck, Sparkles, Coins, Medal, UsersRound, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function UserDashboard() {
  const username = "Demo User";

  const dashboard = {
    financial_summary: { current_bv: 3200, total_referral_bonus: 900, total_level_bonus: 600 },
    sales_performance: { total_orders: 24, completed_orders: 20, total_sales_value: 54000 },
    team_performance: { total_team_size: 40, active_team_members: 28, left_team_size: 18, right_team_size: 22, direct_referrals: 6 },
    binary_team: { left_team_bv: 1500, right_team_bv: 1700, matching_bv: 1500, carry_forward_left: 200, carry_forward_right: 100 },
    team_performance_bonuses: { total_amount: 450 },
    sponsor_royalty_bonuses: { total_amount: 300 }
  };

  const monthlyGrowth = [
    { month: "Jan", earning: 400 },
    { month: "Feb", earning: 700 },
    { month: "Mar", earning: 1200 },
    { month: "Apr", earning: 900 },
    { month: "May", earning: 1500 },
  ];

  const bonusBreakdown = [
    { bonus: "Referral", amount: 900 },
    { bonus: "Level", amount: 600 },
    { bonus: "Royalty", amount: 300 },
    { bonus: "Performance", amount: 450 },
  ];

  const incomeCards = [
    { label: "Current BV", value: dashboard.financial_summary.current_bv, icon: <TrendingUp size={22} /> },
    { label: "Referral Bonus", value: dashboard.financial_summary.total_referral_bonus, icon: <UserCheck size={22} /> },
    { label: "Level Bonus", value: dashboard.financial_summary.total_level_bonus, icon: <ArrowUpCircle size={22} /> },
    { label: "Total Orders", value: dashboard.sales_performance.total_orders, icon: <Gift size={22} /> },
    { label: "Completed Orders", value: dashboard.sales_performance.completed_orders, icon: <Gift size={22} /> },
    { label: "Team Performance Bonus", value: dashboard.team_performance_bonuses.total_amount, icon: <Medal size={22} /> },
    { label: "Sponsor Royalty Bonus", value: dashboard.sponsor_royalty_bonuses.total_amount, icon: <Crown size={22} /> },
    { label: "Total Sales Value", value: dashboard.sales_performance.total_sales_value, icon: <Wallet size={22} /> },
    { label: "Total Team Size", value: dashboard.team_performance.total_team_size, icon: <UsersRound size={22} /> },
    { label: "Active Team Members", value: dashboard.team_performance.active_team_members, icon: <Users size={22} /> },
  ];

  const teamPieData = [
    { name: "Left Team", value: dashboard.team_performance.left_team_size },
    { name: "Right Team", value: dashboard.team_performance.right_team_size },
  ];
  const PIE_COLORS = ["#15803d", "#4ade80"];

  return (
    <div className="min-h-screen p-6 bg-green-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold text-green-900">Welcome, {username}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {incomeCards.map((item, index) => (
            <div key={index} className="p-4 bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-center mb-2">
                <div className="text-green-700">{item.icon}</div>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
              <h2 className="text-xl font-bold text-green-800">{item.value}</h2>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBox title="Monthly Growth">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="earning" stroke="#15803d" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionBox>

          <SectionBox title="Bonus Breakdown">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bonusBreakdown}>
                  <XAxis dataKey="bonus" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionBox>
        </div>

        <SectionBox title="Team Strength">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={teamPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {teamPieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionBox>
      </div>
    </div>
  );
}
