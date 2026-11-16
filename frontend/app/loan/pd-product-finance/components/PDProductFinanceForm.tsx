"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type PDAnswer = "yes" | "no" | "na" | "";
type PDQuestionKey =
    | "geoLocation" | "notRentedHouse" | "bnplOwnUse" | "productDescription"
    | "hypothecationAgreement" | "creditFacilitatorAgreement" | "repaymentsPolicy"
    | "processingFee" | "serviceFees" | "referralScheme";

type ObligationRow = {
    companyName: string; creditType: string; creditAmount: string;
    repaymentMode: string; installmentAmount: string;
};

type SelectedProduct = {
    product_unique_id: string;
    product_name: string;
    quantity: string;
    attribute_summary: string;
    credit_applied_for: string;
    unit_price: number;
    stock: number;
    variant_options: any[];
};

const pdQuestions: Array<{ key: PDQuestionKey; label: string }> = [
    { key: "geoLocation",               label: "11. Customer is under Geo location" },
    { key: "notRentedHouse",            label: "12. Customer is not staying at a rented house" },
    { key: "bnplOwnUse",                label: "13. Customer purchases BNPL product for its own use" },
    { key: "productDescription",        label: "14. Customer satisfied about product description, pricing and service norms" },
    { key: "hypothecationAgreement",    label: "15. Customer aware of Hypothecation agreement" },
    { key: "creditFacilitatorAgreement",label: "16. Customer aware of Credit Facilitator agreement" },
    { key: "repaymentsPolicy",          label: "17. Customer aware of repayments policy" },
    { key: "processingFee",             label: "18. Customer aware of Processing fee and Down payment" },
    { key: "serviceFees",               label: "19. Customer aware of all service fees PF and CLI" },
    { key: "referralScheme",            label: "20. Customer aware of referral scheme" },
];

const defaultObligation = (): ObligationRow => ({
    companyName: "", creditType: "", creditAmount: "", repaymentMode: "", installmentAmount: "",
});

const defaultProduct = (): SelectedProduct => ({
    product_unique_id: "", product_name: "", quantity: "1",
    attribute_summary: "", credit_applied_for: "", unit_price: 0, stock: 0, variant_options: [],
});

const defaultAnswers = (): Record<PDQuestionKey, PDAnswer> => ({
    geoLocation: "", notRentedHouse: "", bnplOwnUse: "", productDescription: "",
    hypothecationAgreement: "", creditFacilitatorAgreement: "", repaymentsPolicy: "",
    processingFee: "", serviceFees: "", referralScheme: "",
});

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-[1.05rem] font-semibold text-green-700">{title}</h2>
            <div className="mt-3 border-t border-gray-200 pt-4">{children}</div>
        </section>
    );
}

function ReadonlyValue({ value }: { value: string }) {
    return (
        <div className="min-h-[42px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700">
            {value || "—"}
        </div>
    );
}

type Props = { mode?: "create" | "view"; initialData?: any };

export default function PDProductFinanceForm({ mode = "create", initialData }: Props) {
    const router = useRouter();
    const readOnly = mode === "view";
    const inputClass = "w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600";
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";

    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([defaultProduct()]);
    const [obligationRows, setObligationRows] = useState<ObligationRow[]>([defaultObligation()]);
    const [pdAnswers, setPdAnswers] = useState<Record<PDQuestionKey, PDAnswer>>(defaultAnswers());
    const [housePhotoFile, setHousePhotoFile] = useState<File | null>(null);
    const [housePhotoName, setHousePhotoName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [decision, setDecision] = useState<"approved" | "rejected" | "">("");
    const [loanApplicationId, setLoanApplicationId] = useState("");
    const [customerUniqueId, setCustomerUniqueId] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingRemoveObligation, setPendingRemoveObligation] = useState<number | null>(null);

    useEffect(() => {
        axiosInstance.get(ProjectApiList.LOAN_READY_PRODUCT_CATALOG).then((res) => {
            if (res.data.success) setCatalogProducts(res.data.data.products || []);
        }).catch(console.error);
    }, []);

    const totalCreditAmount = useMemo(
        () => selectedProducts.reduce((s, p) => s + (parseFloat(p.credit_applied_for) || 0), 0),
        [selectedProducts]
    );

    const totalObligationAmount = useMemo(
        () => obligationRows.reduce((s, r) => s + (parseFloat(r.creditAmount) || 0), 0),
        [obligationRows]
    );

    const totalInstallmentAmount = useMemo(
        () => obligationRows.reduce((s, r) => s + (parseFloat(r.installmentAmount) || 0), 0),
        [obligationRows]
    );

    const updateProduct = (idx: number, field: keyof SelectedProduct, value: any) => {
        setSelectedProducts((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const handleProductSelect = (idx: number, uniqueId: string) => {
        const p = catalogProducts.find((c) => c.product_unique_id === uniqueId);
        if (!p) { updateProduct(idx, "product_unique_id", ""); return; }
        setSelectedProducts((prev) => prev.map((item, i) => i === idx ? {
            ...item,
            product_unique_id: p.product_unique_id,
            product_name: p.product_name,
            unit_price: p.selling_price,
            stock: p.stock,
            variant_options: p.variant_options || [],
            attribute_summary: "",
            credit_applied_for: String(p.selling_price || ""),
            quantity: "1",
        } : item));
    };

    const handleSubmit = async () => {
        // Validate
        const validProducts = selectedProducts.filter((p) => p.product_unique_id);
        if (validProducts.length === 0) { toast.error("Please select at least one product."); return; }
        if (validProducts.some((p) => !p.quantity || parseInt(p.quantity) < 1)) { toast.error("Please enter valid quantity for all products."); return; }
        if (!housePhotoName) { toast.error("Please upload house visit photo."); return; }
        const unanswered = pdQuestions.find(({ key }) => !pdAnswers[key]);
        if (unanswered) { toast.error(`Please answer: ${unanswered.label}`); return; }
        if (!decision) { toast.error("Please select PD decision."); return; }
        if (!remarks.trim()) { toast.error("Please enter remarks."); return; }

        setLoading(true);
        try {
            const payload = {
                loan_application_id: loanApplicationId || null,
                customer_unique_id: customerUniqueId || null,
                branch_id: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.branch : null) || null,
                products: validProducts.map((p) => ({
                    product_unique_id: p.product_unique_id,
                    quantity: parseInt(p.quantity) || 1,
                    attribute_summary: p.attribute_summary || null,
                    credit_applied_for: parseFloat(p.credit_applied_for) || 0,
                })),
                loan_detail: {
                    pd_answers: pdAnswers,
                    decision,
                    remarks,
                    obligation_rows: obligationRows,
                    house_visit_photo: housePhotoName,
                },
                notes: remarks,
            };

            const res = await axiosInstance.post(ProjectApiList.LOAN_PRODUCT_ORDERS, payload);

            if (res.data.success) {
                toast.success("Loan product order created successfully!");
                router.push("/loan/pd-product-finance");
            } else {
                toast.error(res.data.message || "Failed to create order");
            }
        } catch (error: any) {
            const errs = error.response?.data?.errors;
            if (errs) {
                Object.values(errs).flat().forEach((e: any) => toast.error(e));
            } else {
                toast.error(error.response?.data?.message || "An error occurred");
            }
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-300 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <button type="button" onClick={() => router.push("/loan/pd-product-finance")}
                        className="mb-3 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Credit Appraisal — Product Finance (PD)</h1>
                    <p className="mt-1 text-sm text-gray-500">Create a loan product order with PD verification.</p>
                </div>
            </div>

            {/* CAF Reference */}
            {!readOnly && (
                <SectionCard title="CAF Reference (Optional)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-700 mb-1 block">CAF / Loan Application ID</label>
                            <input value={loanApplicationId} onChange={(e) => setLoanApplicationId(e.target.value)}
                                className={inputClass} placeholder="e.g. CAF-1003" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-700 mb-1 block">Customer Unique ID</label>
                            <input value={customerUniqueId} onChange={(e) => setCustomerUniqueId(e.target.value)}
                                className={inputClass} placeholder="e.g. LN202603005" />
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* Section 1: Products */}
            <SectionCard title="Section 1 : Product Selection">
                <div className="space-y-3">
                    {selectedProducts.map((sp, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block font-medium">Product</label>
                                    {readOnly ? <ReadonlyValue value={sp.product_name} /> : (
                                        <select value={sp.product_unique_id}
                                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                                            className={inputClass}>
                                            <option value="">Select Product</option>
                                            {catalogProducts.map((p) => (
                                                <option key={p.product_unique_id} value={p.product_unique_id}>
                                                    {p.product_name} ({p.product_unique_id})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block font-medium">Quantity</label>
                                    {readOnly ? <ReadonlyValue value={sp.quantity} /> : (
                                        <input type="number" min="1" value={sp.quantity}
                                            onChange={(e) => updateProduct(idx, "quantity", e.target.value)}
                                            className={inputClass} placeholder="Qty" />
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block font-medium">Credit Amount (₹)</label>
                                    {readOnly ? <ReadonlyValue value={sp.credit_applied_for} /> : (
                                        <input type="number" value={sp.credit_applied_for}
                                            onChange={(e) => updateProduct(idx, "credit_applied_for", e.target.value)}
                                            className={inputClass} placeholder="Amount" />
                                    )}
                                </div>
                                {sp.variant_options.length > 0 && (
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block font-medium">Variant</label>
                                        {readOnly ? <ReadonlyValue value={sp.attribute_summary} /> : (
                                            <select value={sp.attribute_summary}
                                                onChange={(e) => updateProduct(idx, "attribute_summary", e.target.value)}
                                                className={inputClass}>
                                                <option value="">Select Variant</option>
                                                {sp.variant_options.map((v: any) => (
                                                    <option key={v.attribute_summary} value={v.attribute_summary}>
                                                        {v.attribute_summary} (Stock: {v.available_stock})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}
                                {sp.product_unique_id && (
                                    <div className="md:col-span-3 text-xs text-gray-500 flex gap-4 flex-wrap bg-white rounded p-2 border border-gray-100">
                                        <span>Price: <b className="text-green-700">₹{sp.unit_price}</b></span>
                                        <span>Stock: <b className="text-blue-700">{sp.stock}</b></span>
                                        <span>SKU: <b>{sp.product_unique_id}</b></span>
                                    </div>
                                )}
                            </div>
                            {!readOnly && selectedProducts.length > 1 && (
                                <button type="button"
                                    onClick={() => setSelectedProducts((prev) => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded">
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    {!readOnly && (
                        <button type="button"
                            onClick={() => setSelectedProducts((prev) => [...prev, defaultProduct()])}
                            className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors">
                            + Add Another Product
                        </button>
                    )}
                    {selectedProducts.length > 0 && (
                        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                            <span className="text-gray-600 font-medium">Total Credit Applied</span>
                            <span className="font-bold text-blue-700 text-base">₹{totalCreditAmount.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Section 2: Obligations */}
            <SectionCard title="Section 2 : Obligation Details">
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {["Company Name", "Credit Type", "Credit Amount", "Mode of Repayment", "EMI/EWI/EFI", !readOnly ? "Action" : null]
                                    .filter(Boolean).map((h) => (
                                        <th key={h!} className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">{h}</th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {obligationRows.map((row, idx) => (
                                <tr key={idx}>
                                    {(["companyName", "creditType", "creditAmount", "repaymentMode", "installmentAmount"] as (keyof ObligationRow)[]).map((field) => (
                                        <td key={field} className="border border-gray-300 px-4 py-3">
                                            {readOnly ? <ReadonlyValue value={row[field]} /> : (
                                                <input value={row[field]}
                                                    onChange={(e) => setObligationRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: e.target.value } : r))}
                                                    className={inputClass} placeholder={field} />
                                            )}
                                        </td>
                                    ))}
                                    {!readOnly && (
                                        <td className="border border-gray-300 px-4 py-3">
                                            <button type="button" onClick={() => setPendingRemoveObligation(idx)}
                                                className="rounded-md bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700">Remove</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold">
                                <td colSpan={2} className="border border-gray-300 px-4 py-3">Total</td>
                                <td className="border border-gray-300 px-4 py-3">{totalObligationAmount}</td>
                                <td className="border border-gray-300 px-4 py-3">—</td>
                                <td className="border border-gray-300 px-4 py-3">{totalInstallmentAmount}</td>
                                {!readOnly && <td className="border border-gray-300 px-4 py-3" />}
                            </tr>
                        </tbody>
                    </table>
                </div>
                {!readOnly && (
                    <div className="mt-4 flex justify-end">
                        <button type="button" onClick={() => setObligationRows((prev) => [...prev, defaultObligation()])}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Add Row</button>
                    </div>
                )}
            </SectionCard>

            {/* Section 3: House Visit Photo */}
            <SectionCard title="Section 3 : House Visit Photo">
                <div>
                    <label className="mb-1 block text-sm text-gray-700">House Visit Photo</label>
                    {readOnly ? <ReadonlyValue value={housePhotoName} /> : (
                        <input type="file" accept="image/*"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) { setHousePhotoFile(f); setHousePhotoName(f.name); }
                            }}
                            className={inputClass} />
                    )}
                    {housePhotoName && <p className="mt-1 text-xs text-green-600">✓ {housePhotoName}</p>}
                </div>
            </SectionCard>

            {/* Section 4: PD Information */}
            <SectionCard title="Section 4 : PD Information">
                <div className="space-y-4">
                    {pdQuestions.map((q) => (
                        <div key={q.key} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-gray-800">{q.label}</p>
                                <div className="flex flex-wrap gap-5 lg:min-w-[180px] lg:justify-end">
                                    {(["yes", "no", "na"] as const).map((v) => (
                                        <label key={v} className="flex items-center gap-2 text-sm text-gray-700">
                                            <input type="radio" name={q.key} checked={pdAnswers[q.key] === v}
                                                onChange={() => setPdAnswers((prev) => ({ ...prev, [q.key]: v }))}
                                                className={radioClass} disabled={readOnly} />
                                            {v === "yes" ? "Yes" : v === "no" ? "No" : "N/A"}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Section 5: Decision */}
            <SectionCard title="Section 5 : PD Decision">
                <div className="flex flex-wrap gap-6 rounded-md bg-gray-50 px-3 py-3">
                    {(["approved", "rejected"] as const).map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="radio" name="decision" checked={decision === v}
                                onChange={() => setDecision(v)} className={radioClass} disabled={readOnly} />
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                    ))}
                </div>
            </SectionCard>

            {/* Section 6: Remarks */}
            <SectionCard title="Section 6 : Remarks">
                <label className="mb-1 block text-sm text-gray-700">Remarks</label>
                {readOnly ? <ReadonlyValue value={remarks} /> : (
                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
                        className={`${inputClass} min-h-[120px]`} placeholder="Enter remarks" />
                )}
            </SectionCard>

            {!readOnly && (
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button type="button" onClick={() => setShowConfirm(true)}
                        className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700">
                        {loading ? "Submitting..." : "Submit Order"}
                    </button>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirm Order</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Submit order for <b>{selectedProducts.filter((p) => p.product_unique_id).length}</b> product(s) with total credit of <b>₹{totalCreditAmount.toLocaleString()}</b>?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowConfirm(false)} disabled={loading}
                                className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={handleSubmit} disabled={loading}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                                {loading ? "Submitting..." : "Yes, Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Obligation Confirm */}
            {pendingRemoveObligation !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Remove Row?</h3>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setPendingRemoveObligation(null)}
                                className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">Cancel</button>
                            <button type="button" onClick={() => {
                                setObligationRows((prev) => prev.length === 1 ? [defaultObligation()] : prev.filter((_, i) => i !== pendingRemoveObligation));
                                setPendingRemoveObligation(null);
                            }} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
