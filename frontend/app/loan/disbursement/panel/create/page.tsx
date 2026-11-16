"use client";

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Loader2 } from "lucide-react";

type PanelStatus = "Pending" | "Disbursed";

type PanelRow = {
  id: string;
  dateOfPdDone: string;
  memberName: string;
  custId: string;
  loanId: string;
  product: string;
  productType: string;
  loanAmount: string;
  status: PanelStatus;
  dateOfDisbursement: string;
  bookingDate: string;
  savedBookingDate: string;
  cam_unique_id?: string;
  pd_application_id?: string;
};

interface Investment {
  id: number;
  unique_id: string;
  investor_unique_id: string;
  amount?: number | string;
  total_amount?: number | string;
  remaining_pool_balance?: number | string;
  investor?: { first_name: string; last_name: string };
  pool?: { name: string };
  investor_type?: { name: string };
}

const getUser = () => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};

// "Pool A" → "PA", "Pool B" → "PB"
const poolLabel = (poolName: string): string => {
  const match = poolName?.match(/Pool\s+([A-Z])/i);
  return match ? `P${match[1].toUpperCase()}` : `P${poolName?.replace(/\s+/g, "").toUpperCase() || "A"}`;
};

const toNumber = (value: number | string | undefined): number => {
  if (value === undefined || value === null) return 0;
  return Number(String(value).replace(/[^0-9.]/g, "")) || 0;
};

function DisbursementPanelRoleBMPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [row, setRow] = useState<PanelRow | null>(null);
  const [verifiedCams, setVerifiedCams] = useState<any[]>([]);
  const [verifiedPds, setVerifiedPds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const warnedLoanAmountRef = useRef<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Investor section state ──
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [previewDisbId, setPreviewDisbId] = useState<string>("");
  const [loadingDisbId, setLoadingDisbId] = useState(false);

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600";

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  // ── Fetch verified CAMs ──
  const fetchVerifiedCams = async () => {
    try {
      const user = getLoggedInUser();
      if (!user) return;

      const response = await axiosInstance.get(ProjectApiList.api_getVerifiedCams, {
        params: { branch_id: user.branch_id },
      });

      if (response.data.success) setVerifiedCams(response.data.data);
    } catch {
      toast.error("Failed to load verified data");
    }
  };

  const fetchVerifiedPds = async () => {
    try {
      const user = getLoggedInUser();
      if (!user) return;

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const response = await axiosInstance.get(
        ProjectApiList.api_getVProductPd,
        {
          params: {
            branch_id: user.branch_id || user.branch,
            cms_admin_id: cmsAdminId,
            is_cam_created: false,
          },
        }
      );

      if (response.data.success) {
        setVerifiedPds(response.data.data.data || response.data.data);
      }
    } catch {
      toast.error("Failed to load PD records");
    }
  };

  // ── Fetch investor investments (branch-wise) ──
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setInitialLoading(true);

        const user = getLoggedInUser();
        const branchId = user?.branch_id || user?.branch || undefined;

        await Promise.all([
          fetchVerifiedCams(),
          fetchVerifiedPds(),
          axiosInstance.get(ProjectApiList.GET_INVESTOR_INVESTMENTS, {
            params: { branch_id: branchId },
          }).then(res => setInvestments(res.data.data || []))
        ]);

      } catch (error) {
        toast.error("Failed to load initial data");
      } finally {
        setInitialLoading(false);
      }
    };

    loadAllData();
  }, []);

  // ── Fetch preview disbursement ID when investor selected ──
  useEffect(() => {
    if (!selectedInvestment) { setPreviewDisbId(""); return; }
    const user = getUser();
    const branchCode = user?.branch_code || user?.branch || "BRANCH";
    const label = poolLabel(selectedInvestment.pool?.name || "A");
    setLoadingDisbId(true);
    axiosInstance.get(ProjectApiList.api_previewInvestorDisbursementId, {
      params: { branch_code: branchCode, pool_label: label },
    })
      .then(res => { if (res.data.success) setPreviewDisbId(res.data.disbursement_id); })
      .catch(() => setPreviewDisbId("—"))
      .finally(() => setLoadingDisbId(false));
  }, [selectedInvestment]);

  const handleSelectCam = (cam: any) => {
    const customer = cam.loan_application?.customer;
    const fullName = customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "N/A";
    setRow({
      id: String(cam.id),
      dateOfPdDone: cam.created_at ? new Date(cam.created_at).toLocaleDateString() : "N/A",
      memberName: fullName,
      custId: cam.customer_unique_id || "N/A",
      loanId: cam.loan_application_id || "N/A",
      product:
        cam.loan_application?.products?.[0]?.product_name ||
        "N/A",
      productType: cam.loan_application?.credit_mode || "N/A",
      loanAmount: String(cam.loan_application?.credit_applied_for || "0"),
      status: "Pending",
      dateOfDisbursement: "",
      bookingDate: "",
      savedBookingDate: "",
      cam_unique_id: cam.cam_unique_id,
      pd_application_id: cam.pd_id,
    });
    setCustomerSearch(fullName);
    setShowDropdown(false);
  };

  const handleSelectPd = (pd: any) => {
    const customer = pd.customer;
    const fullName = customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "N/A";
    setRow({
      id: String(pd.id),
      dateOfPdDone: pd.created_at ? new Date(pd.created_at).toLocaleDateString() : "N/A",
      memberName: fullName,
      custId: pd.customer_unique_id || "N/A",
      loanId: pd.loan_application_id || "N/A",
      product:
        pd.loan_application?.products?.[0]?.product_name ||
        "N/A",
      productType: pd.loan_application?.credit_mode || "N/A",
      loanAmount: String(pd.loan_application?.credit_applied_for || "0"),
      status: "Pending",
      dateOfDisbursement: "",
      bookingDate: "",
      savedBookingDate: "",
      pd_application_id: pd.pd_application_id,
    });
    setCustomerSearch(fullName);
    setShowDropdown(false);
  };

  useEffect(() => {
    if (id) {
      if (verifiedCams.length > 0) {
        const selectedCam = verifiedCams.find(cam => String(cam.loan_application_id) === id);
        if (selectedCam) {
          handleSelectCam(selectedCam);
          return;
        }
      }
      if (verifiedPds.length > 0) {
        const selectedPd = verifiedPds.find(pd => String(pd.loan_application_id) === id);
        if (selectedPd) {
          handleSelectPd(selectedPd);
        }
      }
    }
  }, [id, verifiedCams, verifiedPds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredResults = useMemo(() => {
    const searchLower = customerSearch.toLowerCase();

    const cams = verifiedCams.filter((cam) => {
      const customer = cam.loan_application?.customer;
      const fullName = customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "";
      return (
        fullName.toLowerCase().includes(searchLower) ||
        (cam.loan_application_id || "").toLowerCase().includes(searchLower) ||
        (cam.customer_unique_id || "").toLowerCase().includes(searchLower)
      );
    });

    const pds = verifiedPds.filter((pd) => {
      const customer = pd.customer;
      const fullName = customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "";
      return (
        fullName.toLowerCase().includes(searchLower) ||
        (pd.loan_application_id || "").toLowerCase().includes(searchLower) ||
        (pd.customer_unique_id || "").toLowerCase().includes(searchLower)
      );
    });

    return { cams, pds };
  }, [customerSearch, verifiedCams, verifiedPds]);

  const renderReadOnlyField = (label: string, value: string) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );

  const updateField = (field: keyof PanelRow, value: string) => {
    if (!row) return;
    setRow((prev) => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleSave = async () => {
    if (!row) return;

    if (!row.bookingDate || !row.bookingDate.trim()) {
      toast.error("Booking Date should not be empty");
      return;
    }

    if (
      row.productType?.toLowerCase() === "cash" &&
      !selectedInvestment
    ) {
      toast.error("Investor selection is required for Cash product type");
      return;
    }

    if (
      !row.dateOfDisbursement ||
      !row.dateOfDisbursement.trim()
    ) {
      toast.error("Date of Disbursement should not be empty");
      return;
    }

    const bookingDateObj = new Date(`${row.bookingDate}T00:00:00`);

    if (bookingDateObj.getDay() === 0) {
      toast.error("Booking date cannot be Sunday");
      return;
    }

    try {
      setSaving(true);

      const user = getLoggedInUser();

      const cmsAdminId =
        user?.role?.toLowerCase() === "cms_admin"
          ? user?.user_id
          : user?.cms_admin;

      const branchCode =
        user?.branch_code ||
        user?.branch ||
        "BRANCH";

      const label = selectedInvestment
        ? poolLabel(selectedInvestment.pool?.name || "A")
        : "";

      const payload: Record<string, any> = {
        loan_application_id: row.loanId,
        pd_application_id: row.pd_application_id,
        cam_unique_id: row.cam_unique_id,
        customer_unique_id: row.custId,
        date_of_disbursement: row.dateOfDisbursement,
        booking_date: row.bookingDate,
        disbursement_status:
          row.status.toLowerCase() === "disbursed"
            ? "Disbursed"
            : "pending",

        branch_id: user?.branch || user?.branch_id || "",

        // ✅ CMS Admin sends user_id
        // ✅ Others send cms_admin
        cms_admin_id: cmsAdminId || "",
      };

      // If investor selected → pass investor fields
      if (selectedInvestment && label) {
        payload.investor_unique_id =
          selectedInvestment.investor_unique_id;

        payload.investor_pool_label = label;

        payload.investor_branch_code = branchCode;
      }

      const response = await axiosInstance.post(
        ProjectApiList.api_saveDisbursement,
        payload
      );

      if (response.data.success) {
        setRow((prev) =>
          prev
            ? {
              ...prev,
              savedBookingDate: prev.bookingDate,
            }
            : null
        );

        toast.success("Disbursement Created successfully!");
        setShowConfirm(false);

        setTimeout(() => {
          router.push("/loan/disbursement/panel");
        }, 1000);
      } else {
        toast.error(
          response.data.message ||
          "Failed to save disbursement"
        );
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Error saving disbursement details"
      );
    } finally {
      setSaving(false);
    }
  };

  const currentLoanAmount = toNumber(row?.loanAmount);
  const getAvailableAmount = (inv: Investment) => {
    // If remaining_pool_balance exists and is not null/undefined, use it.
    // Otherwise fall back to total_amount or amount.
    if (inv.remaining_pool_balance !== undefined && inv.remaining_pool_balance !== null) {
      return toNumber(inv.remaining_pool_balance);
    }
    return toNumber(inv.total_amount ?? inv.amount);
  };
  const hasInsufficientAmount = useCallback((inv: Investment) => {
    return currentLoanAmount > getAvailableAmount(inv);
  }, [currentLoanAmount]);
  const blockedInvestorsCount = row ? investments.filter((inv) => hasInsufficientAmount(inv)).length : 0;

  useEffect(() => {
    if (!selectedInvestment || !row) return;
    if (hasInsufficientAmount(selectedInvestment)) {
      setSelectedInvestment(null);
      toast.error("Selected investor has insufficient pool amount for this loan.");
    }
  }, [selectedInvestment, row, currentLoanAmount, hasInsufficientAmount]);

  useEffect(() => {
    if (!row || investments.length === 0) {
      warnedLoanAmountRef.current = null;
      return;
    }
    // Logic removed to prevent error message on page load per user request
  }, [row, blockedInvestorsCount, currentLoanAmount, investments.length]);


  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };


  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {saving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600 font-medium">Saving disbursement...</span>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1400px] space-y-6 overflow-x-hidden p-4 md:p-6">
        <Toaster richColors position="top-right" />

        <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Disbursement Panel (Role BM)
          </h1>
        </div>

        <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
          {/* ── Customer (CAM/PD) selector ── */}
          <div className="mb-6 max-w-md">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Select Verified Customer (CAM / Product PD)
            </label>
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                placeholder="Search by Name, Application ID or Customer ID..."
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
              {showDropdown && (filteredResults.cams.length > 0 || filteredResults.pds.length > 0) && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                  {filteredResults.cams.length > 0 && (
                    <>
                      <div className="bg-gray-100 px-4 py-1 text-[10px] font-bold uppercase text-gray-500">Verified CAMs</div>
                      {filteredResults.cams.map((cam) => {
                        const customer = cam.loan_application?.customer;
                        return (
                          <button
                            key={`cam-${cam.id}`}
                            onClick={() => handleSelectCam(cam)}
                            className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="font-semibold text-gray-900">
                              {customer ? `${customer.first_name} ${customer.last_name}` : "Unknown"}
                            </span>
                            <span className="text-xs text-gray-500">
                              App: {cam.loan_application_id} | Cust: {cam.customer_unique_id}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {filteredResults.pds.length > 0 && (
                    <>
                      <div className="bg-gray-100 px-4 py-1 text-[10px] font-bold uppercase text-gray-500 border-t border-gray-200">Verified Product PDs</div>
                      {filteredResults.pds.map((pd) => {
                        const customer = pd.customer;
                        return (
                          <button
                            key={`pd-${pd.id}`}
                            onClick={() => handleSelectPd(pd)}
                            className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="font-semibold text-gray-900">
                              {customer ? `${customer.first_name} ${customer.last_name}` : "Unknown"}
                            </span>
                            <span className="text-xs text-gray-500">
                              App: {pd.loan_application_id} | Cust: {pd.customer_unique_id}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {row ? (
            <div className="border-t border-gray-200 pt-6">
              {/* ── Mobile card view ── */}
              <div className="space-y-4 2xl:hidden">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {renderReadOnlyField("Date of PD Done", row.dateOfPdDone)}
                    {renderReadOnlyField("Member Name", row.memberName)}
                    {renderReadOnlyField("Cust ID", row.custId)}
                    {renderReadOnlyField("Loan ID", row.loanId)}
                    {renderReadOnlyField("Product", row.product)}
                    {renderReadOnlyField("Product Type", row.productType)}
                    {renderReadOnlyField("Loan Amount", `Rs ${row.loanAmount}`)}

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
                      <div className="mt-2 flex items-center gap-4">
                        {(["Pending", "Disbursed"] as PanelStatus[]).map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="mobile-status"
                              checked={row.status === status}
                              onChange={() => updateField("status", status)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="hidden">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Date of Disbursement
                      </label>
                      <input
                        type="date"
                        value={row.dateOfDisbursement}
                        onChange={(e) => updateField("dateOfDisbursement", e.target.value)}
                        className={`${inputClass} mt-2`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Booking Date
                      </label>
                      <input
                        type="date"
                        value={row.bookingDate}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (!value) return;

                          // Block Sundays
                          const selectedDate = new Date(`${value}T00:00:00`);

                          if (selectedDate.getDay() === 0) {
                            toast.error("Sunday is not allowed");
                            return;
                          }

                          setRow((prev) =>
                            prev
                              ? {
                                ...prev,
                                bookingDate: value,
                                dateOfDisbursement: value,
                              }
                              : null
                          );
                        }}
                        className={`${inputClass} mt-2`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Desktop table view ── */}
              <div className="hidden overflow-x-auto 2xl:block">
                <table className="w-[1180px] border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Date of PD Done", "Member Name", "Cust ID", "Loan ID",
                        "Product", "Product Type", "Loan Amount", "Status",
                        "Date of Disbursement", "Booking Date",
                      ].map((heading) => (
                        <th key={heading} className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3">{row.dateOfPdDone}</td>
                      <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">{row.memberName}</td>
                      <td className="border border-gray-300 px-4 py-3">{row.custId}</td>
                      <td className="border border-gray-300 px-4 py-3">{row.loanId}</td>
                      <td className="border border-gray-300 px-4 py-3 max-w-[300px]">
                        <div className="truncate" title={row.product}>
                          {row.product}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">{row.productType}</td>
                      <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900">Rs {row.loanAmount}</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {(["Pending", "Disbursed"] as PanelStatus[]).map((status) => (
                            <label key={status} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="desktop-status"
                                checked={row.status === status}
                                onChange={() => updateField("status", status)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              {status}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <input
                          type="date"
                          value={row.dateOfDisbursement}
                          onChange={(e) => updateField("dateOfDisbursement", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <input
                          type="date"
                          value={row.bookingDate}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (!value) return;

                            const selectedDate = parseLocalDate(value);

                            if (selectedDate.getDay() === 0) {
                              toast.error("Sunday is not allowed");
                              return;
                            }

                            setRow((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  bookingDate: value,
                                  dateOfDisbursement: value,
                                }
                                : null
                            );
                          }}
                          className={inputClass}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Investor Section (small addition below the table) ── */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Investor Linkage <span className="ml-1 font-normal normal-case text-gray-400">(optional)</span>
                </p>

                <div className="flex flex-wrap items-start gap-4">
                  {/* Investor dropdown */}
                  <div className="w-full max-w-xs">
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Select Investor</label>
                    <select
                      value={selectedInvestment?.id ?? ""}
                      onChange={(e) => {
                        const found = investments.find(i => String(i.id) === e.target.value);
                        if (!found) {
                          setSelectedInvestment(null);
                          return;
                        }

                        if (row && hasInsufficientAmount(found)) {
                          const available = getAvailableAmount(found).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          const required = currentLoanAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          toast.error(`Insufficient pool amount. Available Rs ${available}, required Rs ${required}.`);
                          setSelectedInvestment(null);
                          return;
                        }

                        setSelectedInvestment(found);
                      }}
                      disabled={row?.productType?.toLowerCase() !== "cash"}   // ✅ ADD THIS
                      className={`${inputClass} ${row?.productType?.toLowerCase() !== "cash"
                        ? "bg-gray-200 cursor-not-allowed"
                        : ""
                        }`}
                    >
                      <option value="">— None —</option>
                      {investments.map((inv) => {
                        const name = `${inv.investor?.first_name || ""} ${inv.investor?.last_name || ""}`.trim();
                        const available = getAvailableAmount(inv);
                        const blocked = row ? hasInsufficientAmount(inv) : false;

                        // Decide label: "Total Pool" if no deductions, else "Remaining Balance"
                        const isOriginal = (inv.remaining_pool_balance === undefined || inv.remaining_pool_balance === null);
                        const balanceLabel = isOriginal ? "Total Pool" : "Remaining Pool";

                        return (
                          <option key={inv.id} value={inv.id}>
                            {name} ({inv.investor_unique_id}) - {balanceLabel}: Rs {available.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Inline preview after selection */}
                  {selectedInvestment && (
                    <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-100 bg-white px-4 py-2.5 text-sm">
                      <span className="text-gray-500">
                        Pool: <strong className="text-gray-800">{selectedInvestment.pool?.name || "—"}</strong>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">
                        Type: <strong className="text-gray-800">{selectedInvestment.investor_type?.name || "—"}</strong>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">
                        Investor Balance: <strong className="text-green-700">₹{getAvailableAmount(selectedInvestment).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Save button row ── */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  disabled={
                    saving ||
                    row?.status !== "Disbursed" ||
                    !row?.bookingDate ||
                    !row?.dateOfDisbursement ||
                    (row?.productType?.toLowerCase() === "cash" && !selectedInvestment)
                  }
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                >
                  {saving ? "Saving Disbursement..." : "Save Disbursement"}
                </button>
                <p className="text-sm text-gray-700">Status : {row.status}</p>
                <p className={row.savedBookingDate ? "text-sm text-green-600" : "text-sm text-gray-700"}>
                  Booking Date : {row.savedBookingDate ? "Saved" : "Not Saved"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-gray-500">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p>Please select a verified customer to view disbursement details</p>
            </div>
          )}
        </section>

        <ConfirmDialog
          isOpen={showConfirm}
          title="Confirm Save"
          message="Are you sure you want to save these disbursement details?"
          confirmText={saving ? "Saving..." : "Yes, Save"}
          onConfirm={handleSave}
          onCancel={() => !saving && setShowConfirm(false)}
        />
      </div>
    </div>
  );
}

export default function DisbursementPanelRoleBMPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DisbursementPanelRoleBMPageContent />
    </Suspense>
  );
}
