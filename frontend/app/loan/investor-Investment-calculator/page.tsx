"use client";

import { useState } from "react";

export default function InvestmentCalculator() {
  const [form, setForm] = useState({
    principal: 100000,
    rate: 10,
    referral: 0,
    refRate: 1.2,
    charge: 5,
    years: 3,
  });

  const [result, setResult] = useState<any>(null);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: Number(e.target.value) });
  };

  const calculate = () => {
    let { principal, rate, referral, refRate, charge, years } = form;

    let totalWeeks = years * 52;
    let grossSelfTotal = 0;
    let grossRefTotal = 0;
    let totalGross = 0;
    let netClosing = 0;

    for (let i = 1; i <= totalWeeks; i++) {
      let weeklySelf = (principal + netClosing) * (rate / 100 / 52);
      let weeklyRef = referral * (refRate / 100 / 52);

      grossSelfTotal += weeklySelf;
      grossRefTotal += weeklyRef;

      totalGross = grossSelfTotal + grossRefTotal;
      netClosing = totalGross * (1 - charge / 100);
    }

    let totalDeduction = totalGross - netClosing;
    let finalBalance = principal + netClosing;

    setResult({
      grossSelfTotal,
      grossRefTotal,
      totalGross,
      totalDeduction,
      netClosing,
      finalBalance,
    });
  };

  const format = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-bold text-center">
          Investment & Referral Calculator
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Self Investment" name="principal" value={form.principal} onChange={handleChange} />
          <Input label="Target Return %" name="rate" value={form.rate} onChange={handleChange} />

          <Input label="Referral Amount" name="referral" value={form.referral} onChange={handleChange} />
          <Input label="Referral %" name="refRate" value={form.refRate} onChange={handleChange} />

          <Input label="Charge %" name="charge" value={form.charge} onChange={handleChange} />
          <Input label="Years" name="years" value={form.years} onChange={handleChange} />
        </div>

        <button
          onClick={calculate}
          className="w-full py-3 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700"
        >
          Calculate
        </button>

        {result && (
          <div className="bg-gray-50 border rounded-lg p-4 space-y-2 mt-4">
            <Row label="Gross Self Profit" value={format(result.grossSelfTotal)} />
            <Row label="Gross Referral Profit" value={format(result.grossRefTotal)} />
            <Row label="Total Gross" value={format(result.totalGross)} />
            <Row label="Total Deduction" value={`- ${format(result.totalDeduction)}`} red />
            <Row label="Net Profit" value={format(result.netClosing)} green />

            <div className="text-center mt-4 border-t pt-3">
              <p className="text-xs text-gray-500">Final Balance</p>
              <p className="text-xl font-bold text-green-600">
                {format(result.finalBalance)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</p>
      <input
        type="number"
        className="w-full border rounded-md px-3 py-2 text-sm"
        {...props}
      />
    </div>
  );
}

function Row({ label, value, red, green }: any) {
  return (
    <div className="flex justify-between text-sm border-b pb-1">
      <span>{label}</span>
      <span
        className={`${red ? "text-red-500" : ""} ${green ? "text-green-600" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
