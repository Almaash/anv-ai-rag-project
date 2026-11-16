"use client";

import { useEffect, useState, Suspense } from "react";
import WeeklyRedemptionsClient from "./WeeklyRedemptionsClient";
// import WeeklyRedemptionsClient from "./WeeklyRedemptionsClient";

export default function WeeklyRedemptionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Weekly Redemption Requests</h1>
          <p className="text-sm text-gray-500">Manage and approve investor weekly redemption payments</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <WeeklyRedemptionsClient />
      </Suspense>
    </div>
  );
}
