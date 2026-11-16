"use client";

import Link from "next/link";

const links = [
    {
        href: "/loan/disbursement/panel",
        title: "Disbursement Panel (Role BM)",
        description: "Track PD completion, booking date, and disbursement status.",
    },
    {
        href: "/loan/disbursement/final",
        title: "Final Disbursement (Role BM)",
        description: "Handle action panel, document upload, and account team transfer.",
    },
    {
        href: "/loan/disbursement/payment-inventory",
        title: "Payment Inventory (NEFT/RTGS)",
        description: "Manage NEFT/RTGS flow and consumer product delivery status.",
    },
];

export default function DisbursementIndexPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Disbursement</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Select a disbursement workflow from the cards below.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {links.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow"
                    >
                        <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                        <p className="mt-2 text-sm text-gray-500">{item.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
