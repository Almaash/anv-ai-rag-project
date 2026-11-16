"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Search,
  Calendar as CalendarIcon,
  Loader2,
  User,
  Wallet,
  Clock,
  MessageSquare,
  X
} from "lucide-react";

type RedemptionStatus = "pending" | "approved" | "rejected";

export default function WeeklyRedemptionsClient() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<RedemptionStatus>("pending");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Modal State
  const [selectedRedemption, setSelectedRedemption] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");

  // Approval Form State
  const [transactionId, setTransactionId] = useState("");
  const [paymentDocument, setPaymentDocument] = useState<File | null>(null);

  const fetchRedemptions = async () => {
    try {
      setLoading(true);
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = stored ? JSON.parse(stored) : null;
      const res = await axiosInstance.get(ProjectApiList.GET_ALL_WEEKLY_REDEMPTIONS, {
        params: {
          status: status,
          start_date: startDate,
          page: page,
          branch_id: user?.branch_id || user?.branch || undefined,
          cms_admin_id: user?.cms_admin || user?.created_by || undefined,
        },
      });

      if (res.data.success) {
        setRedemptions(res.data.data || []);
        setLastPage(res.data.pagination?.last_page || 1);
      }
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      toast.error("Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  };

  const fetchRedemptionDetail = async (id: number, type: "approve" | "reject") => {
    try {
      setDetailLoading(true);
      setModalType(type);
      setTransactionId("");
      setPaymentDocument(null);

      // First, get the basic data from the list item
      const item = redemptions.find(r => r.id === id);
      if (!item) return;

      // Fetch full details (Investor Profile, etc.) from the specific ID endpoint
      const res = await axiosInstance.get(`${ProjectApiList.GET_WEEKLY_REDEMPTION_BY_ID}/${item.unique_id}`);

      if (res.data.success) {
        // Merge the basic list data with the detailed data
        // This ensures transaction_id and payment_document from the list are preserved
        const mergedData = {
          ...item,
          ...res.data.data
        };
        setSelectedRedemption(mergedData);
        setShowModal(true);
      } else {
        toast.error("Failed to load redemption details");
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("Error loading details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, [status, startDate, page]);

  const handleAction = async (type: "approve" | "reject") => {
    if (!selectedRedemption) return;

    try {
      setActionLoading(true);
      setModalType(type);

      let res;
      if (type === "approve") {
        const formData = new FormData();
        formData.append("transaction_id", transactionId);
        if (paymentDocument) {
          formData.append("payment_document", paymentDocument);
        }
        res = await axiosInstance.post(
          `${ProjectApiList.APPROVE_WEEKLY_REDEMPTION}/${selectedRedemption.unique_id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        res = await axiosInstance.post(`${ProjectApiList.REJECT_WEEKLY_REDEMPTION}/${selectedRedemption.unique_id}`);
      }

      if (res.data.success) {
        toast.success(`Redemption ${type}ed successfully`);
        setShowModal(false);
        setTransactionId("");
        setPaymentDocument(null);
        fetchRedemptions();
      } else {
        toast.error(res.data.message || `Failed to ${type} redemption`);
      }
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      toast.error(`Failed to ${type} redemption`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  /* ================= INFO COMPONENT ================= */
  const InfoRow = ({ label, value, colorClass = "" }: { label: string; value: any; colorClass?: string }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className={`text-sm font-semibold text-gray-800 ${colorClass}`}>{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="space-y-1 text-left">
          <label className="text-xs font-medium text-gray-500 tracking-wider">Status</label>
          <div className="flex bg-gray-100 p-1 rounded-md">
            {(["pending", "approved", "rejected"] as RedemptionStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${status === s
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 font-normal"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs font-medium text-gray-500 tracking-wider">Start Date</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-44"
            />
            <CalendarIcon className="absolute left-2.5 top-2 text-gray-400 w-4 h-4" />
          </div>
        </div>

        <div className="ml-auto">
          <button
            onClick={() => fetchRedemptions()}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refresh"
          >
            <Loader2 className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p className="text-sm font-medium">Fetching redemption records...</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-700">No redemptions found</p>
            <p className="text-xs">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-700 tracking-wider">
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Investor Details</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Week info</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-left">
                      <div className="font-semibold text-gray-800 text-sm">{item.unique_id}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5 font-medium uppercase">
                        {formatDate(item.redemption_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="font-bold text-gray-800 text-sm">{item.investor_name}</div>
                      <div className="text-[11px] text-blue-600 font-semibold mt-0.5 uppercase">{item.investment_unique_id}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-gray-800">₹{Number(item.redemption_amount).toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Requested Value</div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[12px] font-bold text-gray-700">Week {item.week_number}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Closing: ₹{Number(item.weekly_schedule?.closing_balance).toLocaleString("en-IN")}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize ${item.status === "approved" ? "bg-green-100 text-green-700" :
                          item.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => fetchRedemptionDetail(item.id, item.status === "pending" ? "approve" : "approve")}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition font-sans"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white overflow-hidden">
            <p className="text-sm text-gray-600 font-medium">
              Page <b>{page}</b> of <b>{lastPage}</b>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-1.5 border border-gray-200 rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
                className="px-4 py-1.5 border border-gray-200 rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL ================= */}
      {showModal && selectedRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 text-left border border-slate-200">

            {/* Modal Header - More Compact */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${modalType === 'approve' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                  {modalType === 'approve' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                    {modalType === 'approve' ? 'Approve' : 'Reject'} Request
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    ID: {selectedRedemption.unique_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Scrollable and Tighter Spacing */}
            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-6">
                {/* Information Sections - Tighter spacing */}
                <InfoRow label="Investor" value={selectedRedemption.investor?.name} />
                <InfoRow label="Investor ID" value={selectedRedemption.investor_investment?.investor_unique_id} colorClass="text-blue-600" />
                <InfoRow label="Total Pool" value={formatCurrency(selectedRedemption.investor_investment?.total_amount)} />
                <InfoRow label="Req. Date" value={formatDate(selectedRedemption.redemption_date)} />
                <InfoRow label="Week" value={`Week ${selectedRedemption.week_number}`} />
                <InfoRow
                  label="Req. Amount"
                  value={formatCurrency(selectedRedemption.redemption_amount)}
                  colorClass={modalType === "approve" ? "text-green-600 font-bold" : "text-red-600 font-bold"}
                />
              </div>

              {/* Stats Bar - Compact version */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 mb-6 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Earnings</div>
                  <div className="text-xs font-semibold text-slate-700">{formatCurrency(selectedRedemption.weekly_schedule?.total_earning)}</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Redeemed</div>
                  <div className="text-xs font-semibold text-slate-700">{formatCurrency(selectedRedemption.weekly_schedule?.redemption_value)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Closing</div>
                  <div className="text-xs font-semibold text-orange-600">{formatCurrency(selectedRedemption.weekly_schedule?.closing_balance)}</div>
                </div>
              </div>

              {/* Remarks - Minimal */}
              {selectedRedemption.remarks && (
                <div className="mb-6 bg-blue-50/20 rounded-lg p-3 border border-blue-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5 text-blue-600 font-bold">
                    <MessageSquare size={12} />
                    <span className="text-[9px] uppercase tracking-wider">Note</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic leading-snug">
                    "{selectedRedemption.remarks}"
                  </p>
                </div>
              )}

              {/* Action Forms - Tighter */}
              {modalType === "approve" && status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Reference ID"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Payment Proof
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setPaymentDocument(e.target.files ? e.target.files[0] : null)}
                      accept="image/*"
                      className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 border border-slate-200 p-1 rounded-lg bg-slate-50/30"
                    />
                    {/* Image Preview */}
                    {paymentDocument && (
                      <div className="relative mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center group">
                        <img
                          src={URL.createObjectURL(paymentDocument)}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setPaymentDocument(null)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View Processed Details (Approved/Rejected) */}
              {(selectedRedemption.status === "approved" || selectedRedemption.status === "rejected") && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedRedemption.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processing Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                      label="Transaction ID"
                      value={selectedRedemption.transaction_id || "N/A"}
                      colorClass={selectedRedemption.transaction_id ? "text-blue-600 font-mono text-[13px]" : "text-slate-400"}
                    />
                    <InfoRow
                      label="Processed Date"
                      value={selectedRedemption.approved_at ? formatDate(selectedRedemption.approved_at) : (selectedRedemption.rejected_at ? formatDate(selectedRedemption.rejected_at) : "—")}
                    />
                  </div>

                  {selectedRedemption.payment_document && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Document</label>
                      <div
                        onClick={() => window.open(selectedRedemption.payment_document, "_blank")}
                        className="relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-sm transition hover:shadow-md aspect-video bg-slate-50 flex items-center justify-center group"
                      >
                        <img
                          src={selectedRedemption.payment_document}
                          alt="Payment Proof"
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                          <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 shadow-sm transition-opacity">Click to View Full</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all font-sans"
              >
                {selectedRedemption.status === "pending" ? "Cancel" : "Close"}
              </button>

              {selectedRedemption.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={actionLoading}
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-1.5 disabled:opacity-50 font-sans"
                  >
                    {actionLoading && modalType === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading || !transactionId || !paymentDocument}
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-50 font-sans"
                  >
                    {actionLoading && modalType === 'approve' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
