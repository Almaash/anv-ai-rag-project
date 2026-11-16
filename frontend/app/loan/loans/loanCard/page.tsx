"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function LoanCardPage() {
    const params = useSearchParams();
    const router = useRouter();
    const id = params.get("id");

    const [loan, setLoan] = useState<any>(null);
    const [emi, setEmi] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    useEffect(() => {
        const fetchLoanCard = async () => {
            if (!id) return;

            try {
                setLoading(true);

                const res = await axiosInstance.get(
                    `${ProjectApiList.api_getLoanCard}/${id}`
                );

                const data = res.data?.data;

                setLoan(data?.loan_details || null);
                setEmi(data?.emi_schedule || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchLoanCard();
    }, [id]);

    const money = (val: any) => (val ? `₹ ${val}` : "₹ 0");

    const getStatus = (status: string) => {
        if (status === "Paid") return "Paid";
        if (status === "Pending_at_admin") return "Pending (Admin)";
        if (status === "Closed") return "Closed";
        if (status === "Pre_closed") return "Pre Closed";
        return "Pending";
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-60">
                <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!loan) {
        return <div className="p-6 text-center">Loan card not found</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">

            <div className="flex justify-between items-center mb-4 no-print">

                {/* BACK BUTTON */}
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>

                {/* PRINT BUTTON */}
                <Button
                    onClick={() => handlePrint()}
                    className="flex items-center gap-2"
                >
                    <Printer className="w-4 h-4" />
                    Print Loan Card
                </Button>

            </div>

            {/* PRINTABLE AREA */}
            <div
                ref={componentRef}
                className="print-container border border-gray-300 bg-white text-[13px]"
            >
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; }
              .print-container {
                padding: 20px !important;
                width: 100% !important;
              }
              @page { margin: 1cm; }
            }
          `,
                    }}
                />

                {/* HEADER */}
                <div className="bg-green-600 text-white text-center font-semibold py-2 border-b">
                    ANAVRAN LIVELIHOOD SERVICES PVT LTD
                </div>

                {/* TOP SECTION */}
                <div className="grid grid-cols-2 border-b">

                    <div className="p-5 border-r">
                        <h2 className="font-semibold mb-3">Credit Details</h2>

                        <Row label="Disbursement Amount" value={money(loan.disbursement_amount)} />
                        <Row label="Processing Fee" value={money(loan.processing_fee)} />
                        <Row label="GST" value={money(loan.gst)} />
                        <Row label="Insurance" value={money(loan.insurance)} />
                        <Row label="Total Credit Limit" value={money(loan.total_credit)} />
                        <Row label="Interest Rate" value={loan.interest_rate} />
                        <Row label="Tenure" value={`${loan.tenure} (${loan.frequency})`} />
                    </div>

                    <div className="p-5">
                        <h2 className="font-semibold mb-3">Credit Summary</h2>

                        <Row label="Loan Number" value={loan.loan_number} />
                        <Row label="EMI" value={money(loan.installment_per_month)} />
                        <Row label="Disbursement Date" value={loan.disbursement_date} />
                        <Row label="Start Date" value={loan.installment_start_date} />
                        <Row label="Total Payable" value={money(loan.total_payable)} />
                        <Row label="Total Interest" value={money(loan.total_interest_paid)} />
                        <Row label="Last Installment" value={loan.last_installment_date} />
                    </div>

                </div>

                {/* TABLE */}
                <div>
                    <div className="bg-gray-100 text-center font-semibold py-2 border-b">
                        INSTALLMENT SCHEDULE
                    </div>

                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border p-2">#</th>
                                <th className="border p-2">Date</th>
                                <th className="border p-2">Principal</th>
                                <th className="border p-2">Interest</th>
                                <th className="border p-2">EMI</th>
                                <th className="border p-2">Balance</th>
                                <th className="border p-2">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {emi.map((item, i) => {
                                const status = getStatus(item.status);

                                return (
                                    <tr key={i} className="text-center">
                                        <td className="border p-1">{item.installment_no}</td>
                                        <td className="border p-1">{item.due_date}</td>
                                        <td className="border p-1">{money(item.principal_amount)}</td>
                                        <td className="border p-1">{money(item.interest_amount)}</td>
                                        <td className="border p-1">{money(item.installment_amount)}</td>
                                        <td className="border p-1">{money(item.outstanding_balance)}</td>
                                        <td className="border p-1">
                                            {(status === "Paid" || status === "Pre Closed") ? (
                                                <span className="text-green-600 font-medium">{status}</span>
                                            ) : (
                                                <span className="text-red-500 font-medium">{status}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* SIGNATURE */}
                <div className="flex justify-between px-10 py-10 text-xs">
                    <div className="text-center">
                        <div className="border-t w-40 mb-1"></div>
                        Customer Signature
                    </div>

                    <div className="text-center">
                        <div className="border-t w-40 mb-1"></div>
                        Authorized Signatory
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ROW */

const Row = ({ label, value }: any) => (
    <div className="flex justify-between text-gray-700 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);