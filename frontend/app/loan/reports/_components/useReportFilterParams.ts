"use client";

import { useEffect, useState } from "react";

export type ReportFilterParams = {
  user_id: string;
  branch_id: string;
  cms_admin_id: string;
};

const readLoggedInUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function useReportFilterParams() {
  const [reportFilterParams, setReportFilterParams] = useState<ReportFilterParams | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = readLoggedInUser();

    if (!user) {
      setReportFilterParams(null);
      setReady(true);
      return;
    }

    setReportFilterParams({
      user_id: user.user_id || "",
      branch_id: user.branch || user.branch_id || "",
      cms_admin_id: user.cms_admin || user.cms_admin_id || user.admin_user_id || "",
    });
    setReady(true);
  }, []);

  return { reportFilterParams, ready };
}
