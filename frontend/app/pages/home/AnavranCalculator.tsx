"use client";

import React, { useMemo, useState } from "react";
import {
    Calculator,
    Languages,
    BadgeIndianRupee,
} from "lucide-react";
import { motion } from "framer-motion";

type Lang = "en" | "hi";

const translations = {
    en: {
        title: "Finance EMI Calculator",
        subtitle:
            "Calculate booking amount and EMI instantly.",
        amount: "Credit Amount",
        placeholder: "Enter amount",
        booking: "Booking Amount",
        downPayment: "Down Payment",
        processingFee: "Processing Fee",
        gst: "GST",
        insurance: "Insurance",
        tenure: "Tenure",
        interest: "Interest",
        emi: "Estimated EMI",
        monthly: "Monthly",
        biWeekly: "Bi-Weekly",
        note:
            "Note : Up to ₹30,000 → 0% Interest. Above ₹30,000 → 32% reducing interest.",
    },

    hi: {
        title: "फाइनेंस EMI कैलकुलेटर",
        subtitle:
            "बुकिंग अमाउंट और EMI तुरंत जानें।",
        amount: "क्रेडिट अमाउंट",
        placeholder: "राशि दर्ज करें",
        booking: "बुकिंग अमाउंट",
        downPayment: "डाउन पेमेंट",
        processingFee: "प्रोसेसिंग फीस",
        gst: "जीएसटी",
        insurance: "इंश्योरेंस",
        tenure: "अवधि",
        interest: "ब्याज",
        emi: "आपकी EMI",
        monthly: "मासिक",
        biWeekly: "हर 15 दिन",
        note:
            "₹30,000 तक → 0% ब्याज। ₹30,000 से ऊपर → 32% रिड्यूसिंग ब्याज।",
    },
};

export default function AnavranCalculator() {
    const [amount, setAmount] = useState<number>(10000);
    const [language, setLanguage] = useState<Lang>("en");

    const t = translations[language];

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(value);

const data = useMemo(() => {
    let dpP = 0;
    let installments = 0;
    let freq = "";
    let interestRate = 0;
    let insFactor = 0;
    let tenure = "";

    // Slabs
    if (amount >= 1000 && amount <= 5000) {
        dpP = 10;
        installments = 6;
        tenure = "6 INS (3 Months)";
        freq = t.biWeekly;
    } else if (amount <= 10000) {
        dpP = 15;
        installments = 8;
        tenure = "8 INS (4 Months)";
        freq = t.biWeekly;
    } else if (amount <= 25000) {
        dpP = 20;
        installments = 10;
        tenure = "10 INS (5 Months)";
        freq = t.biWeekly;
    } else if (amount <= 30000) {
        dpP = 30;
        installments = 12;
        tenure = "12 INS (6 Months)";
        freq = t.biWeekly;
        insFactor = 1;
    } else {
        dpP = 40;
        installments = 12;
        tenure = "12 INS (1 Year)";
        freq = t.monthly;
        interestRate = 32;
        insFactor = 2;
    }

    // Down Payment
    const dpAmt = (amount * dpP) / 100;

    // Credit Amount
    const creditAmt = amount - dpAmt;

    // Processing Fee on Credit Amount
    const pf = creditAmt * 0.05;

    // GST on PF
    const gst = pf * 0.18;

    // Insurance on Credit Amount
    const insurance = (creditAmt * 0.013) * insFactor;

    // Booking Amount
    const booking = dpAmt + pf + gst;

    let emi = 0;

    if (interestRate === 0) {
        emi = creditAmt / installments;
    } else {
        const loanAmount = creditAmt + insurance;

        const r = interestRate / 100 / 12;

        emi =
            (loanAmount *
                r *
                Math.pow(1 + r, installments)) /
            (Math.pow(1 + r, installments) - 1);
    }

    // Dynamic Note
    const note =
        amount > 30000
            ? "Interest 17% (Flat to reducing upto 32%). Insurance fee 1 saal wale credit me 2 person ka dena anivarya hai."
            : "Interest 0%. Insurance fee 6 mahine wale credit me 1 person ka dena anivarya hai.";

    return {
        dpAmt,
        creditAmt,
        pf,
        gst,
        insurance,
        booking,
        emi,
        tenure,
        freq,
        interestRate,
        note,
    };
}, [amount, language]);

    return (
        <section className="py-10 bg-[#F7FAF9]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <div className="text-center mb-8 md:mb-10">

                    {/* Top Badge */}
                    {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#199A95]/10 text-[#199A95] text-xs sm:text-sm font-semibold">
                        <Calculator className="w-4 h-4" />
                        {language === "en"
                            ? "EMI Calculator"
                            : "EMI कैलकुलेटर"}
                    </div> */}

                    {/* Heading */}
                    <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-slate-900 leading-snug mt-4">
                        {language === "en" ? (
                            <>
                                Calculate Your{" "}
                                <span className="text-[#199A95] italic">
                                    EMI Instantly.
                                </span>
                            </>
                        ) : (
                            <>
                                अपनी{" "}
                                <span className="text-[#199A95] italic">
                                    EMI तुरंत
                                </span>{" "}
                                जानें।
                            </>
                        )}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-slate-600 mt-3 max-w-lg mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
                        {language === "en"
                            ? "Plan your financial journey with our smart EMI calculator."
                            : "हमारे स्मार्ट EMI कैलकुलेटर से अपनी फाइनेंस प्लानिंग करें।"}
                    </p>

                    {/* Language Switch */}
                    <div className="mt-5 flex justify-center">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">

                            <Languages className="w-4 h-4 text-[#199A95]" />

                            <select
                                value={language}
                                onChange={(e) =>
                                    setLanguage(e.target.value as Lang)
                                }
                                className="bg-transparent text-sm outline-none"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिंदी</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-lg border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT */}
                    <div className="space-y-6">

                        <h3 className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-[#199A95]" />
                            {t.amount}
                        </h3>

                        {/* Amount */}
                        <div>

                            <label className="block text-slate-600 text-xs sm:text-sm font-medium mb-2">
                                {t.amount} ({formatCurrency(amount)})
                            </label>

                            <div className="relative">

                                <BadgeIndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#199A95]" />

                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) =>
                                        setAmount(Number(e.target.value))
                                    }
                                    placeholder={t.placeholder}
                                    className="w-full h-12 rounded-xl border border-slate-200 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#199A95]"
                                />
                            </div>
                        </div>

                        {/* Range */}
                        <div>
                            <input
                                type="range"
                                min="1000"
                                max="100000"
                                step="1000"
                                value={amount}
                                onChange={(e) =>
                                    setAmount(Number(e.target.value))
                                }
                                className="w-full h-2 bg-[#199A95]/20 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Note */}
                        <div className="bg-[#199A95]/10 rounded-2xl p-4 border border-[#199A95]/10">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {t.note}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="bg-[#199A95]/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-center items-center">

                        <motion.div
                            key={data.emi}
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >

                            <h4 className="text-xs uppercase tracking-wider text-[#199A95] font-semibold">
                                {t.emi}
                            </h4>

                            <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">
                                {formatCurrency(data.emi)}
                            </p>

                            <p className="text-slate-500 text-xs mt-1">
                                {data.freq}
                            </p>
                        </motion.div>

                        {/* Cards */}
                        <div className="grid grid-cols-2 gap-3 w-full mt-6">

                            <ResultCard
                                label={t.downPayment}
                                value={formatCurrency(data.dpAmt)}
                            />

                            <ResultCard
                                label={t.processingFee}
                                value={formatCurrency(data.pf)}
                            />

                            <ResultCard
                                label={t.gst}
                                value={formatCurrency(data.gst)}
                            />

                            <ResultCard
                                label={t.insurance}
                                value={formatCurrency(data.insurance)}
                            />

                            <ResultCard
                                label={t.booking}
                                value={formatCurrency(data.booking)}
                            />

                            <ResultCard
                                label={t.interest}
                                value={
                                    data.interestRate === 0
                                        ? "0%"
                                        : `${data.interestRate}%`
                                }
                            />
                        </div>

                        {/* Footer */}
                        <div className="w-full mt-5 bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase">
                                    {t.tenure}
                                </p>

                                <h4 className="text-sm font-semibold text-slate-800 mt-1">
                                    {data.tenure}
                                </h4>
                            </div>

                            <div className="w-px h-10 bg-slate-200" />

                            <div className="text-right">
                                <p className="text-[11px] text-slate-500 uppercase">
                                    EMI
                                </p>

                                <h4 className="text-sm font-semibold text-[#199A95] mt-1">
                                    {formatCurrency(data.emi)}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const ResultCard = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-medium">
            {label}
        </p>

        <p className="text-sm sm:text-base font-semibold text-slate-800 mt-1">
            {value}
        </p>
    </div>
);