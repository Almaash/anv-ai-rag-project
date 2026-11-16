"use client";

import { useState } from "react";

export default function SubscriptionExpiredPage() {
  const [subscription] = useState({ end_date: "2025-12-31", status: "expired" });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Expired</h1>
        <p className="text-gray-600 mb-6">Your subscription has expired. Please renew to continue.</p>

        <div className="bg-gray-50 rounded-md p-4 mb-6 text-left">
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">End Date:</span> {formatDate(subscription.end_date)}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">Status:</span> <span className="capitalize text-red-600">{subscription.status}</span></p>
        </div>
      </div>
    </div>
  );
}
