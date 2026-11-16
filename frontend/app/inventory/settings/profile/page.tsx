"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Phone, User } from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type LocalUser = {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  branch?: string;
  profile_photo?: string;
};

type BranchDetails = {
  id?: number;
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
};

export default function ProfilePage() {
  const [user, setUser] = useState<LocalUser>({});
  const [branch, setBranch] = useState<BranchDetails | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(parsed || {});
    } catch {
      setUser({});
    }
  }, []);

  useEffect(() => {
    const loadBranch = async () => {
      if (!user?.branch) return;
      try {
        const res = await axiosInstance.get(`${ProjectApiList.GET_PUBLIC_BRANCHES}?per_page=200`);
        const rows = Array.isArray(res.data?.data?.data)
          ? res.data.data.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

        const matched = rows.find(
          (b: BranchDetails) => String(b.code || "").trim() === String(user.branch || "").trim()
        );
        setBranch(matched || null);
      } catch {
        setBranch(null);
      }
    };
    loadBranch();
  }, [user?.branch]);

  const displayName = useMemo(() => user?.name || "User", [user?.name]);
  const displayRole = useMemo(() => user?.role || "Inventory User", [user?.role]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Account and branch details</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {user?.profile_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-slate-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{displayName}</h2>
            <p className="text-sm text-slate-500">{displayRole}</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={<Mail size={14} />} label="Email" value={user?.email || "-"} />
          <InfoRow icon={<User size={14} />} label="Department" value={user?.department || "-"} />
          <InfoRow icon={<MapPin size={14} />} label="Branch Code" value={user?.branch || "-"} />
          <InfoRow icon={<MapPin size={14} />} label="Branch Name" value={branch?.name || "-"} />
          <InfoRow icon={<MapPin size={14} />} label="Branch Address" value={branch?.address || "-"} />
          <InfoRow icon={<Phone size={14} />} label="Branch Phone" value={branch?.phone || "-"} />
          <InfoRow icon={<Mail size={14} />} label="Branch Email" value={branch?.email || "-"} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm text-slate-900 font-medium mt-1 break-words">{value}</p>
    </div>
  );
}
