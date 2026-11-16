"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

export default function SubscriptionModal() {
  const [subscription, setSubscription] = useState<any>(null);
  const [isCmsAdmin, setIsCmsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      
      // Exclusion logic: show if user is NOT super_admin
      // Requirement: show to all roles/sections except super_admin if completely expired
      if (user.role !== "super_admin") {
        const isShown = sessionStorage.getItem("subscription_modal_shown");
        
        // If it's already completely expired, we always fetch and check
        // because we might need to block access entirely.
        fetchSubscription(user.role);
      }
    }
  }, []);

  const handleClose = () => {
    if (daysLeft !== null && daysLeft < 0) return; // Prevent closing if expired
    setIsOpen(false);
    sessionStorage.setItem("subscription_modal_shown", "true");
  };

  const fetchSubscription = async (role: string) => {
    try {
      const res = await axiosInstance.get(ProjectApiList.api_getSubscription);
      const sub = res?.data?.data?.subscription;
      if (sub) {
        setSubscription(sub);
        
        const endDate = new Date(sub.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysLeft(diffDays);

        // LOGIC:
        // 1. If completely expired (diffDays < 0): Show to everyone except super_admin
        // 2. If expiring soon (0 <= diffDays <= 10): Show to cms_admin (original logic)
        
        if (diffDays < 0) {
          setIsOpen(true);
        } else if (diffDays <= 10 && role === "cms_admin") {
          const isShown = sessionStorage.getItem("subscription_modal_shown");
          if (!isShown) {
            setIsOpen(true);
          }
        }
      }
    } catch (err) {
      console.error("Subscription API error in modal:", err);
    }
  };

  if (!isOpen || !subscription) return null;

  const isCritical = daysLeft !== null && daysLeft <= 5;

  let message = "";
  if (daysLeft! < 0) message = `Expired ${Math.abs(daysLeft!)} days ago`;
  else if (daysLeft === 0) message = "Expires today";
  else if (daysLeft === 1) message = "Expires tomorrow";
  else message = `Expires in ${daysLeft} days`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className={`w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border transform transition-all animate-in zoom-in-95 duration-200 ${isCritical ? "border-rose-200" : "border-amber-200"}`}>
        <div className={`px-5 py-3 flex items-center justify-between ${isCritical ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"} border-b border-inherit`}>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-semibold tracking-wide uppercase">Subscription Alert</span>
          </div>
          {daysLeft !== null && daysLeft >= 0 && (
            <button 
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className={`text-lg font-medium mb-1 ${isCritical ? "text-rose-600" : "text-amber-600"}`}>
              {message}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your <span className="text-slate-700 font-medium">{subscription.plan_name}</span> plan {daysLeft !== null && daysLeft < 0 ? "has ended" : "is ending"} on <span className="text-slate-700 font-medium">{subscription.end_date}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {daysLeft !== null && daysLeft < 0 ? (
              <div className="mt-2 space-y-4">
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <p className="text-xs text-rose-800 font-medium text-center uppercase tracking-wider mb-2">Contact Operator for Renewal</p>
                  <div className="flex flex-col gap-2">
                    {/* <a 
                      href="tel:+918888888888" 
                      className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-rose-200 rounded-md text-slate-700 text-sm hover:bg-rose-100 transition-colors"
                    >
                      <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      +91 88888 88888
                    </a> */}
                    <button 
                      onClick={() => {
                        document.cookie.split(";").forEach((cookie) => {
                          const name = cookie.split("=")[0].trim();
                          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                        });
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = "/auth/signin";
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 bg-rose-600 rounded-md text-white text-sm hover:bg-rose-700 transition-colors shadow-sm"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout from Account
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 italic">Access is limited until renewal is processed.</p>
              </div>
            ) : (
              <>
                <button 
                  className={`w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-[0.98] ${isCritical ? "bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-100" : "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-100"}`}
                  onClick={() => {
                    handleClose();
                  }}
                >
                  Renew Now
                </button>
                <button 
                  className="w-full py-2 text-slate-400 text-sm font-normal hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                  onClick={handleClose}
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}