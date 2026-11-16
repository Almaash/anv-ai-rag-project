"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("user_type");

    if (!token) {
      router.push("/auth/signin");
      return;
    }

    // Restriction for employees: allow only specific HRMS routes
    const allowedEmployeePaths = [
      "/hrms/dashboard",
      "/hrms/profile",
      "/hrms/attendance",
      "/hrms/leaves",
      "/hrms/salaries",
      "/hrms/payroll",
      "/hrms/payroll/records",
      "/hrms/employees/view",
      "/hrms/change-password",
      "/hrms/my-payroll",
    ];

    if (userType === "employee") {
      const isAllowed = allowedEmployeePaths.some((path) =>
        pathname.startsWith(path)
      );
      if (!isAllowed && pathname.startsWith("/hrms")) {
        router.push("/hrms/dashboard");
        return;
      }
    }

    // Finance user_type: restrict to /finance routes only
    if (userType === "finance" && !pathname.startsWith("/finance")) {
      router.push("/finance/dashboard");
      return;
    }

    setIsAuthenticated(true);
  }, [router, pathname]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
