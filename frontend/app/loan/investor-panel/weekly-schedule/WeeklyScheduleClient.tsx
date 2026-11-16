"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";

/* ================= HELPERS ================= */

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "—";

const formatCurrency = (val: any) =>
  `₹ ${Number(val || 0).toLocaleString("en-IN")}`;

/* ================= MAIN ================= */

export default function WeeklyScheduleClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [redeemLoading, setRedeemLoading] = useState<number | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [proofModal, setProofModal] = useState(false);
  const [proofData, setProofData] = useState<any>(null);
  const [proofLoading, setProofLoading] = useState(false);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.GET_INVESTOR_WEEKLY_SCHEDULE}/${id}/weekly-schedule`
      );

      if (res.data.success) {
        const allWeeks: any[] = res.data.data?.weekly_schedules || [];
        const currentWeekIndex = allWeeks.findIndex((week: any) => week.is_current_week);
        const visibleWeeks = currentWeekIndex >= 0 ? allWeeks.slice(0, currentWeekIndex + 1) : [];
        setSchedule(visibleWeeks);
      }
    } catch (err) {
      console.error("Failed to fetch weekly schedule", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  /* ================= LOGIC ================= */

  const getRedeemableAmount = (row: any) =>
    Number(row.redemption_value || 0) - Number(row.redeem || 0);

  const openProofModal = async (row: any) => {
    const uniqueId = row.latest_redemption?.unique_id;
    if (!uniqueId) return;
    try {
      setProofLoading(true);
      setProofModal(true);
      const res = await axiosInstance.get(`${ProjectApiList.GET_WEEKLY_REDEMPTION_BY_ID}/${uniqueId}`);
      if (res.data.success) setProofData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load proof");
    } finally {
      setProofLoading(false);
    }
  };

  const getStatusUI = (row: any) => {
    if (row.redemption_status === "at_admin") {
      return (
        <span className="text-[11px] px-2 py-1 rounded bg-yellow-100 text-yellow-700">
          Requested
        </span>
      );
    }

    if (row.latest_redemption?.status === "approved") {
      return (
        <button
          onClick={() => openProofModal(row)}
          className="text-[11px] px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"
        >
          Approved ↗
        </button>
      );
    }

    if (row.latest_redemption?.status === "rejected") {
      return (
        <span className="text-[11px] px-2 py-1 rounded bg-red-100 text-red-700">
          Rejected
        </span>
      );
    }

    return null;
  };

  /* ================= REDEEM ================= */

  const handleRedeem = async () => {
    if (!selectedRow) return;

    const redeemableAmount = getRedeemableAmount(selectedRow);

    if (redeemableAmount <= 0) {
      toast.error("Nothing available to redeem");
      return;
    }

    try {
      setRedeemLoading(selectedRow.week_number);

      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = stored ? JSON.parse(stored) : null;

      const payload = {
        investment_unique_id: id,
        week_number: selectedRow.week_number,
        redemption_amount: redeemableAmount,
        redemption_type: "partial",
        remarks: "Requested from UI",
        branch_id: user?.branch_id || user?.branch || undefined,
        cms_admin_id: user?.cms_admin || user?.created_by || undefined,
      };

      const res = await axiosInstance.post(
        `${ProjectApiList.REQUEST_WEEKLY_REDEMPTION}`,
        payload
      );

      if (res.data.success) {
        toast.success(
          `₹${redeemableAmount} requested for Week ${selectedRow.week_number}`
        );

        setOpenModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Redemption failed");
    } finally {
      setRedeemLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Weekly Portfolio Schedule
          </h1>
          <p className="text-sm text-gray-500">
            Investment ID: {id}
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-100"
        >
          ← Back
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border">
        {loading ? (
          <div className="py-20 text-center text-gray-500">
            Loading weekly schedule…
          </div>
        ) : schedule.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            No schedule found.
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Self Bonus</th>
                  <th className="px-4 py-3 text-left">Referral Bonus</th>
                  <th className="px-4 py-3 text-left">Total Earning</th>
                  <th className="px-4 py-3 text-left">Redemption Value</th>
                  <th className="px-4 py-3 text-left">Redeem</th>
                  <th className="px-4 py-3 text-left">Closing Balance</th>
                  {/* <th className="px-4 py-3 text-left">Redeem Request</th> */}
                </tr>
              </thead>

              <tbody>
                {schedule
                  .map((row: any, i: number) => {
                    const redeemable = getRedeemableAmount(row);

                    return (
                      <tr key={row.id || i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{i + 1}</td>
                        <td className="px-4 py-3">Week {row.week_number}</td>
                        <td className="px-4 py-3">{formatDate(row.date)}</td>

                        <td className="px-4 py-3">
                          {formatCurrency(row.self_bonus)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCurrency(row.referral_bonus)}
                        </td>

                        <td className="px-4 py-3 text-blue-600 font-semibold">
                          {formatCurrency(row.total_earning)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCurrency(row.redemption_value)}
                        </td>

                        <td className="px-4 py-3 text-orange-600">
                          {formatCurrency(row.redeem)}
                        </td>

                        <td className="px-4 py-3 text-green-600 font-semibold">
                          {formatCurrency(row.closing_balance)}
                        </td>

                        {/* 🔥 UPDATED LOGIC ONLY */}
                        {/* <td className="px-4 py-3"> */}
                          {/* {row.redemption_status === "at_admin" ? (
                          getStatusUI(row)
                        ) : row.latest_redemption?.status === "approved" ? (
                          getStatusUI(row)
                        ) : row.latest_redemption?.status === "rejected" ? (
                          <button
                            onClick={() => {
                              setSelectedRow(row);
                              setOpenModal(true);
                            }}
                            disabled={
                              redeemLoading === row.week_number ||
                              getRedeemableAmount(row) <= 0
                            }
                            className="text-[11px] px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                          >
                            Re-Request
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRow(row);
                              setOpenModal(true);
                            }}
                            disabled={
                              redeemLoading === row.week_number ||
                              redeemable <= 0
                            }
                            className="text-[11px] px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                          >
                            {redeemable <= 0 ? "Done" : "Request"}
                          </button>
                        )} */}
                        {/* </td> */}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROOF MODAL */}
      {proofModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[420px] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Approval Proof</h3>
                {proofData && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    ID: {proofData.unique_id}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setProofModal(false); setProofData(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {proofLoading ? (
                <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
              ) : proofData ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Week</p>
                      <p className="text-sm font-semibold text-gray-800">Week {proofData.week_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Amount</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(proofData.redemption_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Transaction ID</p>
                      <p className="text-sm font-semibold text-blue-600 font-mono">{proofData.transaction_id || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Approved Date</p>
                      <p className="text-sm font-semibold text-gray-800">{formatDate(proofData.approved_at)}</p>
                    </div>
                  </div>

                  {proofData.payment_document && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Document</p>
                      <div
                        onClick={() => window.open(proofData.payment_document, "_blank")}
                        className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:shadow-md aspect-video bg-gray-50 flex items-center justify-center group"
                      >
                        <img
                          src={proofData.payment_document}
                          alt="Payment Proof"
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                          <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 shadow-sm transition-opacity">Click to View Full</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-10 text-center text-gray-400 text-sm">No proof data found.</div>
              )}
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => { setProofModal(false); setProofData(null); }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDEEM MODAL */}
      {openModal && selectedRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[420px] max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* HEADER */}
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Confirm Redemption
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Week {selectedRow.week_number}
                </p>
              </div>

              <button
                onClick={() => setOpenModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="px-5 py-5 space-y-4">

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Date
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDate(selectedRow.date)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Total Earning
                  </p>
                  <p className="text-sm font-semibold text-blue-600">
                    {formatCurrency(selectedRow.total_earning)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Already Redeemed
                  </p>
                  <p className="text-sm font-semibold text-orange-600">
                    {formatCurrency(selectedRow.redeem)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Closing Balance
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatCurrency(selectedRow.closing_balance)}
                  </p>
                </div>

              </div>

              {/* AVAILABLE */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  Available to Redeem
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(getRedeemableAmount(selectedRow))}
                </p>
              </div>

            </div>

            {/* FOOTER */}
            <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">

              <button
                onClick={() => setOpenModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleRedeem}
                disabled={redeemLoading === selectedRow.week_number}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {redeemLoading === selectedRow.week_number
                  ? "Processing..."
                  : "Confirm"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}