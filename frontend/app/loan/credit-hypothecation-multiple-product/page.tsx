"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function CreditHypothecationMultipleProductPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold text-blue-900">
          Credit Hypothecation Agreement (Multiple Product)
        </h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white">
          <Printer className="w-4 h-4" /> Print Agreement
        </Button>
      </div>

      {/* Printable Area */}
      <div 
        ref={componentRef} 
        className="print-container bg-white p-12 text-black leading-relaxed text-[13px] border shadow-sm"
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; background: white !important; }
            .print-container { padding: 40px !important; margin: 0 !important; width: 100% !important; border: none !important; box-shadow: none !important; }
            @page { margin: 1.5cm; }
          }
          .underline-span { border-bottom: 1px solid #000; min-width: 120px; display: inline-block; padding: 0 5px; text-align: center; font-weight: 600; }
          .section-title { font-weight: 700; text-decoration: underline; text-transform: uppercase; text-align: center; margin-bottom: 20px; font-size: 16px; }
          .table-bordered { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .table-bordered th, .table-bordered td { border: 1px solid black; padding: 8px; text-align: left; }
          .bold { font-weight: bold; }
        `}} />
        
        <div className="text-center mb-8">
          <h2 className="section-title">CREDIT HYPOTHECATION AGREEMENT (MULTIPLE PRODUCTS)</h2>
        </div>

        <div className="space-y-4">
          <p>
            THIS AGREEMENT is made at <span className="underline-span"></span> on this <span className="underline-span"></span> day of <span className="underline-span"></span> 20<span className="underline-span"></span>.
          </p>

          <p className="bold">BETWEEN:</p>
          <p>
            <span className="bold">ANAVRAN LIVELIHOOD SERVICES PRIVATE LIMITED</span>, a company incorporated under the Companies Act, 2013, having its registered office at [Office Address], hereinafter referred to as the <span className="bold">"Lender/Service Provider"</span> (which expression shall, unless it be repugnant to the context or meaning thereof, be deemed to mean and include its successors and assigns).
          </p>

          <p className="bold">AND:</p>
          <p>
            Mr./Ms./Mrs. <span className="underline-span"></span>, S/o, D/o, W/o <span className="underline-span"></span>, resident of <span className="underline-span"></span>, hereinafter referred to as the <span className="bold">"Borrower"</span> (which expression shall, unless it be repugnant to the context or meaning thereof, be deemed to mean and include his/her heirs, executors, and administrators).
          </p>

          <h3 className="font-bold mt-6 underline">1. DETAILS OF PRODUCTS FINANCED:</h3>
          <table className="table-bordered">
            <thead>
              <tr className="bg-gray-50">
                <th>S.No.</th>
                <th>Product Description</th>
                <th>Model/Serial No.</th>
                <th>Unit Price (INR)</th>
                <th>Quantity</th>
                <th>Total Value (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1.</td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td>2.</td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td>3.</td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr className="font-bold">
                <td colSpan={5} className="text-right">Grand Total:</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-bold mt-6 underline">2. LOAN & REPAYMENT TERMS:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded bg-gray-50/50">
            <p><span className="bold">Total Product Cost:</span> Rs. <span className="underline-span"></span></p>
            <p><span className="bold">Down Payment Paid:</span> Rs. <span className="underline-span"></span></p>
            <p><span className="bold">Loan Amount Financed:</span> Rs. <span className="underline-span"></span></p>
            <p><span className="bold">Interest Rate (% p.a.):</span> <span className="underline-span"></span></p>
            <p><span className="bold">Tenure (Months):</span> <span className="underline-span"></span></p>
            <p><span className="bold">EMI Amount:</span> Rs. <span className="underline-span"></span></p>
            <p><span className="bold">EMI Start Date:</span> <span className="underline-span"></span></p>
            <p><span className="bold">EMI End Date:</span> <span className="underline-span"></span></p>
          </div>

          <h3 className="font-bold mt-6 underline">3. HYPOTHECATION:</h3>
          <p>
            The Borrower hereby hypothecates the Products mentioned in Section 1 in favor of the Lender as security for the repayment of the Loan Amount along with interest, costs, and charges. The Borrower agrees that the ownership of the products remains with the Lender until the entire loan amount is cleared.
          </p>

          <h3 className="font-bold mt-6 underline">4. TERMS AND CONDITIONS:</h3>
          <ul className="list-decimal pl-6 space-y-2">
            <li>The Borrower shall pay the EMIs on or before the due date. Any delay will attract a penalty of <span className="underline-span"></span>% per month.</li>
            <li>The hypothecated products shall be kept in good condition and shall not be sold, gifted, or transferred to any third party without the written consent of the Lender.</li>
            <li>The Lender or its authorized representatives shall have the right to inspect the products at any reasonable time.</li>
            <li>In case of default in payment of two consecutive EMIs, the Lender shall have the absolute right to repossess the products without any prior notice.</li>
            <li>The Borrower has provided Post Dated Cheques (PDCs) or ECS mandate for the repayment of the loan. In case of cheque bounce, legal action under Section 138 of the NI Act will be initiated.</li>
            <li>All taxes, insurance, and maintenance costs related to the products shall be borne by the Borrower.</li>
          </ul>

          <div className="mt-12 grid grid-cols-2 gap-20 pt-10">
            <div className="text-center">
              <div className="border-t border-black pt-2">
                <p className="bold">Signature of Borrower</p>
                <p>(Name: <span className="underline-span"></span>)</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2">
                <p className="bold">Authorized Signatory</p>
                <p>For Anavran Livelihood Services Pvt Ltd</p>
              </div>
            </div>
          </div>

          <div className="mt-20 border p-4 bg-gray-50 italic text-[11px]">
            <p className="bold underline mb-1">Witnesses:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>1. Name & Signature: __________________________</div>
              <div>2. Name & Signature: __________________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
