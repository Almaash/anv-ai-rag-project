"use client";

import React, { useState } from "react";
import { DollarSign, Percent, Calculator } from "lucide-react";
import { motion } from "framer-motion";

export function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState(10000);
  const [interestRate, setInterestRate] = useState(10);
  const [loanTenure, setLoanTenure] = useState(60);

  const calculateEMI = () => {
    const principal = loanAmount;
    const annualInterestRate = interestRate;
    const tenureInMonths = loanTenure;

    if (principal <= 0 || annualInterestRate < 0 || tenureInMonths <= 0) {
      return { emi: 0, totalInterest: 0, totalPayment: 0 };
    }

    const monthlyInterestRate = annualInterestRate / 12 / 100;

    if (monthlyInterestRate === 0) {
      const emi = principal / tenureInMonths;
      return {
        emi,
        totalInterest: 0,
        totalPayment: principal,
      };
    }

    const emi =
      (principal *
        monthlyInterestRate *
        Math.pow(1 + monthlyInterestRate, tenureInMonths)) /
      (Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1);

    const totalPayment = emi * tenureInMonths;
    const totalInterest = totalPayment - principal;

    return { emi, totalInterest, totalPayment };
  };

  const { emi, totalInterest, totalPayment } = calculateEMI();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <section className="py-12 md:py-16 bg-[#F7FAF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-slate-900 leading-snug">
            Estimate Your{" "}
            <span className="text-[#199A95] italic">Monthly EMI.</span>
          </h2>
          <p className="text-slate-600 mt-3 max-w-lg mx-auto text-xs sm:text-sm md:text-base">
            Plan your financial journey with our easy-to-use EMI calculator.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-lg border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">

          {/* Inputs */}
          <div className="space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#199A95]" />
              Calculate EMI
            </h3>

            {/* Loan Amount */}
            <div>
              <label className="block text-slate-600 text-xs sm:text-sm font-medium mb-2">
                Loan Amount ({formatCurrency(loanAmount)})
              </label>
              <input
                type="range"
                min="10000"
                max="100000"
                step="10000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                className="w-full h-2 sm:h-3 bg-[#199A95]/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-slate-600 text-xs sm:text-sm font-medium mb-2">
                Interest Rate ({interestRate}%)
              </label>
              <input
                type="range"
                min="5"
                max="20"
                step="0.5"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full h-2 sm:h-3 bg-[#199A95]/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Loan Tenure */}
            <div>
              <label className="block text-slate-600 text-xs sm:text-sm font-medium mb-2">
                Loan Tenure ({loanTenure} Months)
              </label>
              <input
                type="range"
                min="12"
                max="120"
                step="12"
                value={loanTenure}
                onChange={(e) => setLoanTenure(parseFloat(e.target.value))}
                className="w-full h-2 sm:h-3 bg-[#199A95]/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Results */}
          <div className="bg-[#199A95]/10 rounded-2xl p-5 sm:p-6 md:p-8 text-center flex flex-col justify-center items-center">
            <motion.div
              key={emi}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h4 className="text-xs sm:text-sm text-[#199A95] font-semibold uppercase tracking-wider">
                Estimated EMI
              </h4>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2">
                {formatCurrency(emi)}
              </p>
              <p className="text-slate-500 text-xs mt-1">per month</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-6">
              <ResultBox
                label="Total Interest"
                value={formatCurrency(totalInterest)}
                icon={<Percent className="w-4 h-4 text-[#199A95]" />}
              />
              <ResultBox
                label="Total Payment"
                value={formatCurrency(totalPayment)}
                icon={<DollarSign className="w-4 h-4 text-[#199A95]" />}
              />
            </div>

            {/* <button className="mt-8 w-full sm:w-auto px-6 py-3 text-sm bg-[#199A95] text-white rounded-full font-semibold hover:bg-[#147C78] transition-all shadow-md shadow-[#199A95]/20">
              Apply for Loan
            </button> */}
          </div>
        </div>
      </div>
    </section>
  );
}

const ResultBox = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="bg-white p-4 rounded-xl flex items-center gap-3 shadow-sm border border-slate-100">
    <div className="p-2 rounded-full bg-[#199A95]/10">{icon}</div>
    <div>
      <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-medium">
        {label}
      </p>
      <p className="text-sm sm:text-base font-semibold text-slate-800">
        {value}
      </p>
    </div>
  </div>
);