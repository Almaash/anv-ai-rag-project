"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";

const formatCurrency = (val: any) =>
  val ? `₹${Number(val).toLocaleString("en-IN")}` : "₹0";

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getUser = () => {
    if (typeof window === "undefined") return null;
    return JSON.parse(localStorage.getItem("user") || "{}");
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const id = getUser()?.customer_unique_id;

      const res = await axiosInstance.get(`/customer-dashboard/${id}`);
      if (res.data.success) setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <Loader />;
  if (!data) return <p className="p-6">No data</p>;

  const { customer, summary } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* 🔝 HEADER */}
      <div className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-semibold text-lg">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-xs text-gray-500">
            {customer.customer_unique_id}
          </p>
        </div>

        <div className="flex gap-2">
          <Badge text={customer.status} />
          <Badge text={customer.verification_status} />
        </div>
      </div>

      {/* 📊 SUMMARY TILES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatTile title="Applications" value={summary.total_applications} />
        <StatTile title="Approved" value={summary.approved_applications} type="success" />
        <StatTile title="Pending" value={summary.pending_applications} type="warning" />
        <StatTile title="Rejected" value={summary.rejected_applications} type="danger" />
        <StatTile title="Active Loans" value={summary.total_active_loans} />
        <StatTile title="Loan Amount" value={formatCurrency(summary.total_loan_amount)} />
        <StatTile title="Outstanding" value={formatCurrency(summary.total_outstanding)} />
      </div>

      {/* 📋 APPLICATIONS */}
      <Table title="Applications">
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Product</Th>
            <Th>Amount</Th>
            <Th>CAF</Th>
            <Th>PD</Th>
            <Th>CAM</Th>
            <Th>Decision</Th>
            <Th>Verified</Th>
            <Th>Disbursed</Th>
          </tr>
        </thead>
        <tbody>
          {data.applications.length === 0 ? (
            <Empty colSpan={9} />
          ) : (
            data.applications.map((app: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/40">
                <Td>{app.loan_application_id}</Td>
                <Td>{app.product_name}</Td>
                <Td>{formatCurrency(app.credit_applied_for)}</Td>
                <Td><Badge text={app.caf_status} /></Td>
                <Td>{app.pd_status}</Td>
                <Td>{app.cam_status}</Td>
                <Td><Badge text={app.credit_decision} /></Td>
                <Td>{app.is_verified ? "Yes" : "No"}</Td>
                <Td>{app.disbursed ? "Yes" : "No"}</Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* 💰 ACTIVE LOANS */}
      <Table title="Active Loans">
        <thead>
          <tr>
            <Th>Loan No</Th>
            <Th>Amount</Th>
            <Th>EMI</Th>
            <Th>Tenure</Th>
            <Th>Paid</Th>
            <Th>Pending</Th>
          </tr>
        </thead>
        <tbody>
          {data.active_loans.map((loan: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/40">
              <Td>{loan.loan_number}</Td>
              <Td>{formatCurrency(loan.loan_amount)}</Td>
              <Td>{formatCurrency(loan.emi_amount)}</Td>
              <Td>{loan.tenure_months}</Td>
              <Td>{loan.paid_emis}</Td>
              <Td>{loan.pending_emis}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 📅 EMI DETAILS */}
      {Object.entries(data.emi_details || {}).map(
        ([loanId, emiData]: any, idx: number) => (
          <div key={idx} className="space-y-4">

            <h2 className="text-sm font-semibold text-gray-700">
              EMI Details - {loanId}
            </h2>

            {/* PAID */}
            <Table title="Paid EMIs">
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Amount</Th>
                  <Th>Due Date</Th>
                  <Th>Paid Date</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {emiData.paid_emis?.length === 0 ? (
                  <Empty colSpan={5} />
                ) : (
                  emiData.paid_emis.map((emi: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/40">
                      <Td>{emi.emi_number}</Td>
                      <Td>{formatCurrency(emi.emi_amount)}</Td>
                      <Td>{formatDate(emi.due_date)}</Td>
                      <Td>{emi.paid_date ? formatDate(emi.paid_date) : "-"}</Td>
                      <Td><Badge text={emi.status} /></Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* UPCOMING */}
            <Table title="Upcoming EMIs">
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Amount</Th>
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {emiData.upcoming_emis?.length === 0 ? (
                  <Empty colSpan={4} />
                ) : (
                  emiData.upcoming_emis.map((emi: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/40">
                      <Td>{emi.emi_number}</Td>
                      <Td>{formatCurrency(emi.emi_amount)}</Td>
                      <Td>{formatDate(emi.due_date)}</Td>
                      <Td><Badge text={emi.status} /></Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* PENDING */}
            <Table title="Pending EMIs">
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Amount</Th>
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {emiData.pending_emis?.length === 0 ? (
                  <Empty colSpan={4} />
                ) : (
                  emiData.pending_emis.map((emi: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/40">
                      <Td>{emi.emi_number}</Td>
                      <Td>{formatCurrency(emi.emi_amount)}</Td>
                      <Td>{formatDate(emi.due_date)}</Td>
                      <Td><Badge text={emi.status} /></Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

          </div>
        )
      )}

    </div>
  );
}

/* COMPONENTS */

const Table = ({ title, children }: any) => (
  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  </div>
);

const Th = ({ children }: any) => (
  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b sticky top-0">
    {children}
  </th>
);

const Td = ({ children }: any) => (
  <td className="px-4 py-3 border-b text-gray-700">{children}</td>
);

const Badge = ({ text }: any) => {
  const value = String(text).toLowerCase();

  const color =
    value.includes("approved") || value.includes("verified") || value === "paid"
      ? "bg-green-100 text-green-700"
      : value.includes("pending")
      ? "bg-yellow-100 text-yellow-700"
      : value.includes("rejected")
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`px-2 py-1 text-xs rounded-md font-medium ${color}`}>
      {text}
    </span>
  );
};

const StatTile = ({ title, value, type = "default" }: any) => {
  const colors: any = {
    default: "bg-white border",
    success: "bg-green-50 border border-green-200",
    warning: "bg-yellow-50 border border-yellow-200",
    danger: "bg-red-50 border border-red-200",
  };

  return (
    <div className={`rounded-xl p-4 shadow-sm ${colors[type]}`}>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold mt-1 text-gray-800">{value}</p>
    </div>
  );
};

const Empty = ({ colSpan }: any) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-6 text-gray-400">
      No data found
    </td>
  </tr>
);

const Loader = () => (
  <div className="flex justify-center items-center h-[300px]">
    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
  </div>
);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN");