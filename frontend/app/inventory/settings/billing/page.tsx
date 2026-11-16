"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap, CheckCircle2 } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Plans</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Manage your inventory subscription and payment history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 bg-slate-900 border-none shadow-2xl rounded-3xl p-8 relative overflow-hidden">
            <Zap className="absolute -right-4 -top-4 w-32 h-32 text-white/5 rotate-12" />
            <div className="relative z-10 space-y-6">
                <div>
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Plan</p>
                   <h3 className="text-2xl font-black text-white">Enterprise</h3>
                </div>
                <Button className="w-full h-11 bg-white text-slate-900 font-black rounded-2xl shadow-xl shadow-white/10">Manage Subscription</Button>
            </div>
        </Card>

        <Card className="md:col-span-2 border-slate-200/60 shadow-xl shadow-slate-200/5 rounded-3xl p-8 bg-white flex flex-col justify-center">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">Multi-warehouse support active</p>
                </div>
                 <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">Unlimited attribute variants</p>
                </div>
                 <div className="flex items-center gap-3 text-slate-400">
                    <div className="min-w-[18px] min-h-[18px] rounded-full border border-slate-200" />
                    <p className="text-sm font-bold">Priority API access available</p>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
}
