"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

export default function LoanDetails() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH LOAN DETAILS ================= */

  useEffect(() => {
    const fetchLoan = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const res = await axiosInstance.get(
          `${ProjectApiList.api_getLOANSDetails}/${id}`
        );

        setLoan(res.data?.data || null);
      } catch (error) {
        console.error("Failed to fetch loan details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [id]);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const money = (val: any) =>
    `₹${Number(val || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loan not found
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Loan Details
          </h1>

          <p className="text-sm text-gray-500">
            Loan Number: {loan.loan_info?.loan_number}
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              router.push(`/loan/loans/loanCard?id=${loan.loan_info?.loan_number}`)
            }
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            View Loan Card
          </button>
          <button
            onClick={() =>
              router.push(`/loan/loans/emi?id=${loan.loan_info?.loan_number}`)
            }
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            View EMI Schedule
          </button>

          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Back
          </button>

        </div>

      </div>

      {/* ================= SUMMARY CARDS ================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <Card title="Loan Amount" value={money(loan.loan_terms?.loan_amount)} />

        <Card title="EMI Amount" value={money(loan.loan_terms?.emi_amount)} />

        <Card title="Interest Rate" value={`${loan.loan_terms?.interest_rate}%`} />

        <Card
          title="Tenure"
          value={`${loan.loan_terms?.tenure} ${loan.loan_terms?.frequency
            }`}
        />

      </div>

      {/* ================= LOAN INFORMATION ================= */}

      <Section title="Loan Information">

        <Grid>

          <Field label="Loan Number" value={loan.loan_info?.loan_number} />
          <Field label="Application ID" value={loan.loan_info?.loan_application_id} />
          <Field label="Customer ID" value={loan.customer_info?.customer_unique_id} />
          <Field label="Disbursement ID" value={loan.loan_info?.disbursement_id} />

        </Grid>

      </Section>


      {/* ================= CUSTOMER INFORMATION ================= */}

      <Section title="Customer Information">
        <Grid>
          <Field
            label="Customer ID"
            value={loan.customer_info?.customer_unique_id}
          />

          <Field
            label="Customer Name"
            value={loan.customer_info?.name}
          />

          <Field
            label="Email"
            value={loan.customer_info?.email}
          />

          <Field
            label="Primary Contact"
            value={loan.customer_info?.contact_number_1}
          />

          <Field
            label="Secondary Contact"
            value={loan.customer_info?.contact_number_2}
          />

          <Field
            label="Status"
            value={loan.customer_info?.status}
          />
        </Grid>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Field
            label="Permanent Address"
            value={loan.customer_info?.permanent_address}
          />

          <Field
            label="Correspondence Address"
            value={loan.customer_info?.correspondence_address}
          />
        </div>
      </Section>
      {/* ================= FINANCIAL DETAILS ================= */}

      <Section title="Financial Details">

        <Grid>

          <Field label="Loan Amount" value={money(loan.loan_terms?.loan_amount)} />
          <Field label="Processing Fee" value={money(loan.loan_terms?.processing_fee)} />
          <Field label="GST Amount" value={money(loan.loan_terms?.gst_amount)} />
          <Field label="Insurance Amount" value={money(loan.loan_terms?.insurance_amount)} />
          <Field label="Disbursement Amount" value={money(loan.loan_terms?.disbursement_amount)} />

        </Grid>

      </Section>

      {/* ================= LOAN TIMELINE ================= */}

      <Section title="Loan Timeline">

        <Grid>

          <Field
            label="Loan Start Date"
            value={formatDate(loan.important_dates?.loan_start_date)}
          />

          <Field
            label="Installment Start Date"
            value={formatDate(loan.important_dates?.installment_start_date)}
          />

          <Field
            label="Created At"
            value={formatDate(loan.important_dates?.loan_created_at)}
          />

        </Grid>

      </Section>

    </div>
  );
}

/* ================= UI COMPONENTS ================= */

const Section = ({ title, children }: any) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-6">
      {title}
    </h2>
    {children}
  </div>
);

const Grid = ({ children }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {children}
  </div>
);

const Field = ({ label, value }: any) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-900 mt-1">{value || "-"}</p>
  </div>
);

const Card = ({ title, value }: any) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-lg font-semibold text-gray-900 mt-1">
      {value}
    </p>
  </div>
);