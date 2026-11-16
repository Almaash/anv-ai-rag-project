"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getHrmsDashboard } from "../api/hrmsApi";
import { toast } from "sonner";

export default function EmployeeProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const res = await getHrmsDashboard();
        if (res.data.status === "success" && res.data.data?.employee_profile?.id) {
          router.replace(`/hrms/employees/view?id=${res.data.data.employee_profile.id}`);
        } else {
          toast.error("Profile not found");
          router.replace("/hrms/dashboard");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load your profile details");
        router.replace("/hrms/dashboard");
      }
    };

    fetchAndRedirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <p className="text-slate-500 animate-pulse text-sm">Redirecting to your profile...</p>
    </div>
  );
}


