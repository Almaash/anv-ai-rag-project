"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Globe, Monitor, Moon, Sun } from "lucide-react";

export default function PreferencesPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">App Preferences</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Personalize your experience with custom settings.</p>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/5 rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-8 space-y-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><Monitor size={12}/> Interface Theme</label>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border-2 border-slate-900 bg-slate-50 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3"><Sun size={20}/><span className="text-sm font-black">Light Mode</span></div>
                    <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"/></div>
                </div>
                 <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-center justify-between cursor-pointer opacity-50">
                    <div className="flex items-center gap-3"><Moon size={20}/><span className="text-sm font-black">Dark Mode</span></div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><Globe size={12}/> Global Language</label>
             <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm bg-slate-50/20 focus:ring-4 focus:ring-slate-900/5">
                <option>English (US)</option>
                <option>Hindi (IN)</option>
             </select>
          </div>

          <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Bell size={18} className="text-slate-900" />
                    <p className="font-black text-slate-900 text-sm">System Notifications</p>
                </div>
                <div className="w-12 h-6 rounded-full bg-slate-900 relative cursor-pointer"><div className="w-4 h-4 rounded-full bg-white absolute right-1 top-1"/></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
