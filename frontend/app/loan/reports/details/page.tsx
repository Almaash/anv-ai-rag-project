"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Calendar, 
  Landmark, 
  FileText, 
  Clock,
  ShieldCheck,
  Layers
} from "lucide-react";
import moment from "moment";

const reportFilterParams = {
  user_id: "anv_7",
  branch_id: "HZB-4401",
  cms_admin_id: "anv_2",
};

function ReportDetailsContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "loans";
  const id = searchParams.get("id");
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isApplicationLike = ["applications", "customer", "caf"].includes(type);
  const isPdReport = type === "pd";
  const isCamReport = type === "cam";
  const isDisbursementReport = type === "disbursements";
  const isLoanReport = type === "loan" || type === "loans";

  useEffect(() => {
    if (!id) {
      setError("Missing Record ID");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const listEndpoints: Record<string, string> = {
          customer: ProjectApiList.GET_REPORT_CUSTOMER,
          caf: ProjectApiList.GET_REPORT_CAF,
          pd: ProjectApiList.GET_REPORT_PD,
          cam: ProjectApiList.GET_REPORT_CAM,
          disbursements: ProjectApiList.GET_REPORT_DISBURSEMENT,
          loan: ProjectApiList.GET_REPORT_LOANS,
          loans: ProjectApiList.GET_REPORT_LOANS,
        };

        const listTypes = ["customer", "caf", "pd", "cam", "disbursements", "loan", "loans"];

        if (listTypes.includes(type)) {
          const response = await axiosInstance.get(listEndpoints[type], {
            params: { ...reportFilterParams, search: id, page: 1, per_page: 1000 },
          });

          if (response.data.success) {
            const records = response.data.data?.data || [];
            const record = records.find((item: any) => {
              if (type === "pd") return item.pd_application_id === id || String(item.id) === id;
              if (type === "cam") return item.cam_unique_id === id || String(item.id) === id || item.loan_application_id === id;
              if (type === "disbursements") return item.disbursement_id === id || String(item.id) === id || item.loan_application_id === id;
              if (type === "loan" || type === "loans") return item.loan_number === id || item.loan_application_id === id || String(item.id) === id;
              return item.loan_application_id === id || String(item.id) === id || item.customer_unique_id === id;
            }) || records[0];

            if (record) {
              setData(record);
              return;
            }
          }

          if (type === "loans") {
            const fallback = await axiosInstance.get(`${ProjectApiList.VIEW_LOAN_REPORT}/${id}`);
            if (fallback.data.success) {
              setData(fallback.data.data);
              return;
            }
          }

          if (type === "disbursements") {
            const fallback = await axiosInstance.get(`${ProjectApiList.VIEW_DISBURSEMENT_REPORT}/${id}`);
            if (fallback.data.success) {
              setData(fallback.data.data);
              return;
            }
          }

          setError("Record not found");
          return;
        }

        let endpoint = "";
        if (type === "applications") endpoint = `${ProjectApiList.VIEW_APPLICATION_REPORT}/${id}`;
        else if (type === "customers") endpoint = `${ProjectApiList.VIEW_CUSTOMER_REPORT}/${id}`;
        else endpoint = `${ProjectApiList.VIEW_LOAN_REPORT}/${id}`;

        const response = await axiosInstance.get(endpoint, { params: reportFilterParams });

        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError(response.data.message || "Record not found");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch record details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
      <Clock className="w-8 h-8 animate-spin mb-3 opacity-50" />
      <p className="text-sm tracking-wide">Loading record details...</p>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-md mx-auto mt-20 p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-6 h-6 text-red-500 opacity-50" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Not Found</h2>
      <p className="text-gray-500 text-sm mb-6">{error || "The requested information could not be found."}</p>
      <button 
        onClick={() => router.back()} 
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Go Back
      </button>
    </div>
  );

  const isLoan = isLoanReport;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Reports
        </button>
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
          Report ID: {id} • {type}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            {type === 'customers' || type === 'customer' || type === 'caf' ? <User className="w-6 h-6" /> : isLoanReport ? <Landmark className="w-6 h-6" /> : isCamReport ? <ShieldCheck className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 uppercase tracking-tight leading-none mb-1.5">
              {type === 'customers' || type === 'customer' || type === 'caf'
                ? `${data.customer?.first_name || data.first_name || ""} ${data.customer?.last_name || data.last_name || ""}`.trim()
                : (isCamReport ? (data.cam_unique_id || data.loan_application_id || "N/A") : isDisbursementReport ? (data.disbursement_id || data.loan_application_id || "N/A") : (data.loan_number || data.loan_application_id || data.disbursement_id || data.pd_application_id || "N/A"))}
            </h1>
            <p className="text-gray-500 text-xs">
              {(type === 'customers' || type === 'customer' || type === 'caf') ? `Customer ID: ${data.customer?.customer_unique_id || data.customer_unique_id || "N/A"}` : `Created on ${moment(data.created_at).format("MMM DD, YYYY")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
            (data.loan_status === "active" || data.application_status === "approved" || data.status === "verified" || data.verification_status === "verified" || data.is_disbursed === 1 || data.payment_status === "paid") 
            ? "bg-green-50 text-green-700 border border-green-100" 
            : "bg-amber-50 text-amber-700 border border-amber-100"
          }`}>
            {data.loan_status || (data.verification_status === "verified" ? "Verified" : data.application_status) ||( data.is_disbursed === 1 ? "Disbursed" : data.application_status) || data.application_status ||( data.is_verified === 1 ? "Verified" : data.status)|| "Processing"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {(isDisbursementReport || isApplicationLike || isPdReport || isCamReport) && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-400" /> {isDisbursementReport ? "Disbursement Information" : isCamReport ? "CAM Information" : isPdReport ? "PD Information" : "Verification Status"}
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-[13px]">
                {isDisbursementReport ? (
                  <>
                    <SimpleDetailItem label="Disbursement ID" value={data.disbursement_id || "N/A"} />
                    <SimpleDetailItem label="Application ID" value={data.loan_application_id || "N/A"} />
                    <SimpleDetailItem label="Disbursement Date" value={data.date_of_disbursement ? moment(data.date_of_disbursement).format("ll") : "N/A"} />
                    <SimpleDetailItem label="Payment Status" value={data.payment_status || "N/A"} />
                    <SimpleDetailItem label="Booking Date" value={data.booking_date ? moment(data.booking_date).format("ll") : "N/A"} />
                    <SimpleDetailItem label="Is Disbursed" value={data.is_disbursed ? "Yes" : "No"} />
                    <SimpleDetailItem label="Loan Started" value={data.is_loan_started ? "Yes" : "No"} />
                  </>
                ) : isCamReport ? (
                  <>
                    <SimpleDetailItem label="CAM ID" value={data.cam_unique_id || "N/A"} />
                    <SimpleDetailItem label="Loan Application ID" value={data.loan_application_id || "N/A"} />
                    <SimpleDetailItem label="Customer ID" value={data.customer_unique_id || "N/A"} />
                    <SimpleDetailItem label="Branch" value={data.branch_id || "N/A"} />
                    <SimpleDetailItem label="Credit Decision" value={data.credit_decision || "N/A"} />
                    <SimpleDetailItem label="Verified" value={data.is_verified ? "Yes" : "No"} />
                    <SimpleDetailItem label="Disbursement Created" value={data.is_disbursement_created ? "Yes" : "No"} />
                    <SimpleDetailItem label="Created At" value={data.created_at ? moment(data.created_at).format("lll") : "N/A"} />
                  </>
                ) : isPdReport ? (
                  <>
                    <SimpleDetailItem label="PD Application ID" value={data.pd_application_id || "N/A"} />
                    <SimpleDetailItem label="Loan Application ID" value={data.loan_application_id || "N/A"} />
                    <SimpleDetailItem label="Verification Status" value={data.verification_status || "N/A"} />
                    <SimpleDetailItem label="Status" value={data.status || "N/A"} />
                    <SimpleDetailItem label="Is Verified" value={data.is_verified ? "Yes" : "No"} />
                    <SimpleDetailItem label="Is CAM Created" value={data.is_cam_created ? "Yes" : "No"} />
                    <SimpleDetailItem label="Is Disbursement Created" value={data.is_disbursement_created ? "Yes" : "No"} />
                    <SimpleDetailItem label="Created At" value={data.created_at ? moment(data.created_at).format("lll") : "N/A"} />
                  </>
                ) : (
                  <>
                    <SimpleDetailItem label="Loan Application ID" value={data.loan_application_id || "N/A"} />
                    <SimpleDetailItem label="Customer ID" value={data.customer_unique_id || data.customer?.customer_unique_id || "N/A"} />
                    <SimpleDetailItem label="Credit Mode" value={data.credit_mode || "N/A"} />
                    <SimpleDetailItem label="Credit Applied" value={`₹${Number(data.credit_applied_for || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Down Payment" value={data.down_payment ? `₹${Number(data.down_payment).toLocaleString("en-IN")}` : "N/A"} />
                    <SimpleDetailItem label="Discount" value={data.discount ? `₹${Number(data.discount).toLocaleString("en-IN")}` : "N/A"} />
                    <SimpleDetailItem label="Tenure" value={data.tenure_option || "N/A"} />
                    <SimpleDetailItem label="Progress" value={`${data.is_verified ? "Verified" : "Pending"} / PD ${data.is_pd_created ? "Yes" : "No"} / CAM ${data.is_cam_created ? "Yes" : "No"} / Disb. ${data.is_disbursement_created ? "Yes" : "No"}`} />
                  </>
                )}
              </div>
            </div>
          )}

          {isLoan && data.customer && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-400" /> Verification & Nominee
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-[13px]">
                <SimpleDetailItem label="Verification Status" value={data.customer.verification_status || "N/A"} />
                <SimpleDetailItem label="Verified By" value={data.customer.verified_by || "N/A"} />
                <SimpleDetailItem label="Verified At" value={data.customer.verified_at ? moment(data.customer.verified_at).format("lll") : "N/A"} />
                <SimpleDetailItem label="Nominee" value={`${data.customer.nominee_name || "N/A"} (${data.customer.nominee_relationship || ""})`} />
                <SimpleDetailItem label="Nominee Address" value={data.customer.nominee_address || "N/A"} />
              </div>
            </div>
          )}

          {type === "customers" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-400" /> Verification & Nominee
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-[13px]">
                <SimpleDetailItem label="Verification Status" value={data.verification_status || "N/A"} />
                <SimpleDetailItem label="Verified By" value={data.verified_by || "N/A"} />
                <SimpleDetailItem label="Verified At" value={data.verified_at ? moment(data.verified_at).format("lll") : "N/A"} />
                <SimpleDetailItem label="Nominee" value={`${data.nominee_name || "N/A"} (${data.nominee_relationship || ""})`} />
                <SimpleDetailItem label="Nominee Address" value={data.nominee_address || "N/A"} />
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Customer Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <SimpleDetailItem label="Full Name" value={`${data.customer?.first_name || data.first_name || ""} ${data.customer?.middle_name || data.middle_name || ""} ${data.customer?.last_name || data.last_name || ""}`.trim() || "N/A"} />
              <SimpleDetailItem label="Customer ID" value={data.customer?.customer_unique_id || data.customer_unique_id || "N/A"} />
              <SimpleDetailItem label="Branch" value={data.branch?.name || data.branch_name || "N/A"} />
              <SimpleDetailItem label="Contact Number" value={data.customer?.contact_number_1 || data.contact_number_1 || data.customer?.contact_number || data.contact_number || "N/A"} />
              <SimpleDetailItem label="Email Address" value={data.customer?.email || data.email || "N/A"} />
              <SimpleDetailItem label="Date of Birth" value={data.customer?.date_of_birth ? moment(data.customer.date_of_birth).format("ll") : data.date_of_birth ? moment(data.date_of_birth).format("ll") : "N/A"} />
              {((type === "applications") || (type === "disbursements") || (type === "loans" && data.customer) || (type === 'customers')) && (
                <>
                  <SimpleDetailItem label="Father's Name" value={data.customer?.father_name || data.father_name || "N/A"} />
                  <SimpleDetailItem label="Gender" value={data.customer?.gender || data.gender || "N/A"} />
                  <SimpleDetailItem label="Occupation" value={data.customer?.occupation || data.occupation || "N/A"} />
                  <SimpleDetailItem label="Religion" value={data.customer?.religion || data.religion || "N/A"} />
                  <SimpleDetailItem label="Caste" value={data.customer?.caste || data.caste || "N/A"} />
                  <SimpleDetailItem label="Address" value={data.customer?.permanent_address || data.permanent_address || "N/A"} />
                </>
              )}
            </div>
          </div>

          {type === "customers" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> Identity Documents
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <DocumentItem label="Aadhaar Image" path={data.adhaar_image} />
                <DocumentItem label="PAN Image" path={data.pan_image} />
                <DocumentItem label="Voter ID Image" path={data.voter_id_image} />
                <DocumentItem label="DL Image" path={data.driving_license_image} />
              </div>
            </div>
          )}

          {type === "disbursements" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> Disbursement Documents
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <DocumentItem label="DFA Document" path={data.dfa_document} />
                <DocumentItem label="CFA Document" path={data.cfa_document} />
                <DocumentItem label="DPN Document" path={data.dpn_document} />
                <DocumentItem label="Vernacular" path={data.vernacular_document} />
              </div>
            </div>
          )}

          {((type !== "customers" && !isDisbursementReport && !isPdReport && !isCamReport) || isApplicationLike || isLoanReport) && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" /> Financial & {isApplicationLike ? "Application" : "Loan"} Details
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                {isApplicationLike ? (
                  <>
                    <SimpleDetailItem label="Credit Applied For" value={`₹${Number(data.credit_applied_for || 0).toLocaleString("en-IN")}`} isBold />
                    <SimpleDetailItem label="Interest Rate" value={`${data.interest_rate || "0.00"}%`} />
                    <SimpleDetailItem label="Tenure" value={data.tenure_option || "N/A"} />
                    <SimpleDetailItem label="Applicant Income" value={`₹${Number(data.applicant_income || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Total Yearly Income" value={`₹${Number(data.total_income_yearly || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Monthly Expenses" value={`₹${Number(data.total_monthly_expenses || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Net Surplus" value={`₹${Number(data.net_surplus || 0).toLocaleString("en-IN")}`} isBold />
                    <SimpleDetailItem label="Business Type" value={data.business_type || "N/A"} />
                    <SimpleDetailItem label="Credit Mode" value={data.credit_mode || "N/A"} />
                  </>
                ) : (
                  <>
                    <SimpleDetailItem label="Loan Amount" value={`₹${Number(data.loan_amount || data.amount || 0).toLocaleString("en-IN")}`} isBold />
                    <SimpleDetailItem label="Interest Rate" value={`${data.interest_rate || "0.00"}%`} />
                    <SimpleDetailItem label="Tenure" value={`${data.tenure_months || "0"} Months`} />
                    <SimpleDetailItem label="EMI Amount" value={data.emi_amount ? `₹${Number(data.emi_amount).toLocaleString("en-IN")}` : "N/A"} isBold />
                    <SimpleDetailItem label="Processing Fee" value={`₹${Number(data.processing_fee || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Insurance" value={`₹${Number(data.insurance_amount || 0).toLocaleString("en-IN")}`} />
                    <SimpleDetailItem label="Disbursement Amount" value={`₹${Number(data.disbursement_amount || 0).toLocaleString("en-IN")}`} isBold />
                    <SimpleDetailItem label="Start Date" value={data.loan_start_date ? moment(data.loan_start_date).format("ll") : "N/A"} />
                    <SimpleDetailItem label="First EMI Date" value={data.installment_start_date ? moment(data.installment_start_date).format("ll") : "N/A"} />
                  </>
                )}
              </div>
            </div>
          )}

          {type === "applications" && data.income_sources && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gray-400" /> Income Sources
                </h3>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(JSON.parse(data.income_sources)).map(([key, value]) => (
                    value ? (
                      <span key={key} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ) : null
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoan && data.emi_schedules && data.emi_schedules.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Repayment Schedule
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-500 font-medium border-b border-gray-100 bg-gray-50/30">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3 text-right">EMI Amount</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.emi_schedules.map((emi: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-400">{(emi.installment_no ?? emi.installment_number ?? (i+1)).toString().padStart(2, "0")}</td>
                        <td className="px-6 py-4 text-gray-700">{moment(emi.installment_date || emi.due_date).format("MMM DD, YYYY")}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">₹{Number(emi.installment_amount || emi.emi_amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${emi.status === "paid" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>
                            {emi.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-6 text-white shadow-md">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">Account Summary</p>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {type === "applications" ? "Applied Amount" : type === "disbursements" ? "Payment Status" : type === "customers" ? "Enrollment No" : "Outstanding Balance"}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {type === "disbursements" 
                    ? (data.payment_status?.replace('_', ' ').toUpperCase() || "PENDING")
                    : type === "customers"
                    ? (data.enrollment_number || "N/A")
                    : `₹${Number(data.credit_applied_for || data.loan_amount || 0).toLocaleString()}`
                  }
                </p>
              </div>
              {type !== "applications" && type !== "disbursements" && type !== "customers" && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Last Payment Date</p>
                  <p className="text-lg font-medium">{data.last_payment_date ? moment(data.last_payment_date).format("ll") : "N/A"}</p>
                </div>
              )}
              {(type === "applications" || type === "disbursements" || type === "customers") && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {type === "disbursements" ? "Disbursement Date" : type === "customers" ? "Enrollment Date" : "Application Date"}
                  </p>
                  <p className="text-lg font-medium">
                    {moment(data.date_of_disbursement || data.enrollment_date || data.created_at).format("ll")}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-800 flex items-center gap-3">



              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">Secure & verified internal record.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Location Context</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{data.branch?.name || "Main Branch"}</p>
                  <p className="text-[11px] text-gray-500">Service Area Control</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleDetailItem({ label, value, isBold = false }: { label: string, value: string, isBold?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${isBold ? "font-bold text-gray-900" : "text-gray-700 font-medium"}`}>{value}</p>
    </div>
  );
}

function DocumentItem({ label, path }: { label: string, path: string | null }) {
  if (!path) return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-400 italic">Not available</p>
    </div>
  );

  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <a 
        href={`https://anavaran.alibrosinfotech.com/storage/${path}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
      >
        <FileText className="w-3 h-3" /> View Doc
      </a>
    </div>
  );
}

export default function ReportDetailsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        }>
            <ReportDetailsContent />
        </Suspense>
    );
}