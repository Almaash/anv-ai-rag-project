"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Smartphone, ShieldCheck } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Access</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Enhance your account safety and access controls.</p>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/5 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="p-8">
            <CardTitle className="text-lg font-black text-slate-900">Authentication</CardTitle>
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest">Login and recovery methods</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-8">
            <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Lock size={18} /></div>
                    <div>
                        <p className="font-black text-slate-900 text-sm">Update Password</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Last changed 3 months ago</p>
                    </div>
                </div>
                <Button variant="outline" className="rounded-xl h-9 px-4 font-bold text-xs border-slate-200">Reset Now</Button>
            </div>

            <div className="p-6 rounded-2xl border border-rose-100 bg-rose-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white"><Smartphone size={18} /></div>
                    <div>
                        <p className="font-black text-rose-900 text-sm">Two-Factor Authentication</p>
                        <p className="text-rose-700/60 text-[10px] font-bold uppercase tracking-wider">Not connected</p>
                    </div>
                </div>
                <Button className="rounded-xl h-9 px-4 font-bold text-xs bg-rose-500 hover:bg-rose-600">Connect Device</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
