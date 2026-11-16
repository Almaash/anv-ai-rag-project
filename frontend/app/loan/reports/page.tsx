"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { useReportFilterParams } from "./_components/useReportFilterParams";
import { 
  FileBox, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  FileText,
  Eye,
  Users,
  ClipboardCheck,
  FileBadge
} from "lucide-react";
import Link from "next/link";

type ReportType = 'loans' | 'applications' | 'disbursements' | 'customers';

const tabs = [
  { id: 'loans', name: 'Loan Report', icon: CreditCard },
  { id: 'applications', name: 'Application Report', icon: FileText },
  { id: 'disbursements', name: 'Disbursement Report', icon: TrendingUp },
  { id: 'customers', name: 'Customer Report', icon: Users },
] as const;

export default function LoanReportsPage() {
  const router = useRouter();
  const { reportFilterParams, ready } = useReportFilterParams();
  const [activeTab, setActiveTab] = useState<ReportType>('loans');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Temporary filter state for search button
  const [filterState, setFilterState] = useState({
    search: "",
    startDate: "",
    endDate: "",
    status: ""
  });

  const fetchReport = useCallback(async () => {
    if (!ready || !reportFilterParams) return;

    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      if (activeTab === 'loans') endpoint = ProjectApiList.GET_LOAN_REPORT;
      else if (activeTab === 'applications') endpoint = ProjectApiList.GET_APPLICATION_REPORT;
      else if (activeTab === 'disbursements') endpoint = ProjectApiList.GET_DISBURSEMENT_REPORT;
      else if (activeTab === 'customers') endpoint = ProjectApiList.GET_CUSTOMER_REPORT;

      const response = await axiosInstance.get(endpoint, {
        params: {
          ...reportFilterParams,
          start_date: startDate,
          end_date: endDate,
          status: status,
          search: search,
          page: page,
          per_page: 15
        }
      });

      if (response.data.success) {
        // Handle Laravel pagination structure (response.data.data.data)
        setData(response.data.data.data || []);
        setLastPage(response.data.data.last_page || 1);
        setTotal(response.data.data.total || 0);
      } else {
        throw new Error(response.data.message || "Failed to fetch report");
      }
    } catch (err: any) {
      console.error("Report Fetch Error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, status, search, page, ready, reportFilterParams]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSearch = () => {
    setPage(1);
    setSearch(filterState.search);
    setStartDate(filterState.startDate);
    setEndDate(filterState.endDate);
    setStatus(filterState.status);
  };

  // const handleExport = () => {
  //   // Basic CSV export logic would go here
  //   alert("Export functionality triggered. This would typically generate a CSV/Excel file.");
  // };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Loan Reports</h1>
          <p className="text-sm text-gray-500">View and analyze loan data across the organization</p>
        </div>
        {/* <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm w-fit"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button> */}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/loan/reports/customer" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">Customer Report</h2>
            </div>
          </div>
        </Link>

        <Link href="/loan/reports/caf" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-green-600"><ClipboardCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">CAF Report</h2>
            </div>
          </div>
        </Link>

        <Link href="/loan/reports/pd" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-3 text-amber-600"><FileBadge className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">PD Report</h2>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/loan/reports/cam" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-50 p-3 text-violet-600"><ClipboardCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">CAM Report</h2>
            </div>
          </div>
        </Link>

        <Link href="/loan/reports/disbursement" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">Disbursement Report</h2>
            </div>
          </div>
        </Link>

        <Link href="/loan/reports/loans" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-3 text-sky-600"><CreditCard className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Report Section</p>
              <h2 className="text-base font-semibold text-gray-900">Loan Report</h2>
            </div>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportType)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Loan ID / Name..." 
              value={filterState.search}
              onChange={(e) => setFilterState(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Start Date</label>
          <input 
            type="date" 
            value={filterState.startDate}
            onChange={(e) => setFilterState(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">End Date</label>
          <input 
            type="date" 
            value={filterState.endDate}
            onChange={(e) => setFilterState(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        {activeTab !== 'disbursements' && activeTab !== 'customers' && (
          <div>
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Status</label>
            <select 
              value={filterState.status}
              onChange={(e) => setFilterState(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              {activeTab === 'loans' ? (
                <>
                  <option value="active">Active/Disbursed</option>
                  <option value="closed">Closed</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Verification Status</label>
            <select 
              value={filterState.status}
              onChange={(e) => setFilterState(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button 
            onClick={handleSearch}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button 
            onClick={() => {
              setFilterState({ search: "", startDate: "", endDate: "", status: "" });
              setSearch("");
              setStartDate("");
              setEndDate("");
              setStatus("");
              setPage(1);
            }}
            className="text-gray-500 text-[11px] font-medium hover:text-red-500 px-2 py-2"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 animate-pulse text-sm">Generating your report...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 bg-red-50 p-4 rounded-lg inline-block">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 space-y-2">
            <FileBox className="w-12 h-12" />
            <p>No records found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {activeTab === 'loans' ? 'Loan Number' : activeTab === 'applications' ? 'Application ID' : activeTab === 'disbursements' ? 'Disbursement ID' : 'Customer ID'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {activeTab === 'disbursements' ? 'Payment Status' : activeTab === 'customers' ? 'Mobile' : 'Amount'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">{activeTab === 'customers' ? 'Reg. Date' : 'Date'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((item, idx) => {
                  const customer = activeTab === 'customers' ? item : (item.customer || item.loan_application?.customer);
                  return (
                    <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-blue-600 uppercase">
                          {activeTab === 'customers' ? (item.customer_unique_id || 'N/A') : (item.loan_number || item.disbursement_id || item.loan_application_id || 'N/A')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 uppercase">
                            {item.first_name || customer?.first_name} {item.last_name || customer?.last_name}
                          </span>
                          {activeTab !== 'customers' && (
                            <span className="text-xs text-gray-500 uppercase">{item.customer_unique_id || customer?.customer_unique_id}</span>
                          )}
                          {activeTab === 'customers' && (
                            <span className="text-xs text-gray-500">{item.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium uppercase">
                        {item.branch_name || item.branch?.name || item.branch_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {activeTab === 'disbursements' ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.payment_status || 'N/A'}
                          </span>
                        ) : activeTab === 'customers' ? (
                          <span className="text-sm text-gray-600">{item.contact_number_1 || 'N/A'}</span>
                        ) : (
                          <span className="text-sm font-bold text-gray-800 tabular-nums">
                            ₹{Number(item.loan_amount || item.credit_applied_for || item.amount || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(item.created_at || item.date_of_disbursement).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          (item.status === 'verified' || item.loan_status === 'active' || item.application_status === 'approved' || item.is_disbursed || item.verification_status === 'verified')
                            ? "bg-green-100 text-green-700"
                            : (item.status === 'rejected' || item.application_status === 'rejected' || item.verification_status === 'rejected')
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.verification_status || item.status || item.loan_status || item.application_status || (item.is_disbursed ? 'Disbursed' : 'Processing')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => router.push(`/loan/reports/details?type=${activeTab}&id=${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && data.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between font-medium">
            <span className="text-sm text-gray-500">
              Showing total <span className="text-gray-900 font-bold">{total}</span> records
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center px-4 bg-white border border-gray-300 rounded text-sm text-gray-700">
                Page {page} of {lastPage}
              </div>
              <button 
                disabled={page === lastPage}
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50 transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
