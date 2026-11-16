"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import CAFForm, { CAFFormData, createDefaultCAFData } from "../components/CAFForm";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const parseProductAttributes = (value: any): Record<string, string> => {
    if (!value) return {};
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    if (typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    return {};
};

export default function EditCAFPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id"); // Getting loan_application_id from query param ?id=CAF-1004

    const [initialData, setInitialData] = useState<CAFFormData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCAFDetails = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const res = await axiosInstance.get(`${ProjectApiList.api_getCAFById}/${id}`);

            if (res.data.success) {
                const data = res.data.data;
                
                // Map API data to CAFFormData structure
                const mappedData: CAFFormData = {
                    ...createDefaultCAFData(),
                    creditMode: data.credit_mode || "product",
                    down_payment: data.down_payment ? String(data.down_payment) : "",
                    // Use first product for legacy single-product fields
                    productName: data.products && data.products.length > 0 ? data.products[0].product_name : data.product_name || "",
                    productCode: data.products && data.products.length > 0
                        ? (data.products[0].product_details?.product_unique_id || data.products[0].product_code)
                        : (data.product_unique_id || data.product_code || ""),
                    frequency: data.frequency || "monthly",
                    tenureOption: data.tenure_option || "12 Month",
                    repaymentDay: data.repayment_day || data.repaymentDay || "",
                    applicantType: data.applicant_type || "qualifying",
                    applicantIncome: data.applicant_income ? String(Math.floor(Number(data.applicant_income))) : "",
                    otherSourcesIncome: data.other_sources_income ? String(Math.floor(Number(data.other_sources_income))) : "",
                    spouseIncome: "", // Not in model yet or separate field
                    nomineeIncome: "", // Not in model yet or separate field
                    incomeSources: data.income_sources || createDefaultCAFData().incomeSources,
                    incomeProofName: data.income_proof_name || "",
                    familyDependents: data.family_dependents ? String(data.family_dependents) : "",
                    expenses: data.expense_details ? (Object.fromEntries(
                        Object.entries(data.expense_details).map(([key, val]: [string, any]) => [
                            key,
                            {
                                monthly: val.monthly ? String(Math.floor(Number(val.monthly))) : "",
                                yearly: val.yearly ? String(Math.floor(Number(val.yearly))) : ""
                            }
                        ])
                    ) as any) : createDefaultCAFData().expenses,
                    travelExpense: data.travel_expense_monthly ? String(Math.floor(Number(data.travel_expense_monthly))) : "",
                    otherObligations: data.other_obligations_monthly ? String(Math.floor(Number(data.other_obligations_monthly))) : "",
                    obligationRows: data.obligation_rows ? data.obligation_rows.map((row: any) => ({
                        ...row,
                        creditAmount: row.creditAmount ? String(Math.floor(Number(row.creditAmount))) : "",
                        installmentAmount: row.installmentAmount ? String(Math.floor(Number(row.installmentAmount))) : ""
                    })) : createDefaultCAFData().obligationRows,
                    productAttributes: parseProductAttributes((data.products && data.products.length > 0 && data.products[0].product_attributes) || data.product_attributes || {}),
                    productDetails: (data.products && data.products.length > 0 && data.products[0].product_details) || data.product_details || null,
                    productQuantity: data.products && data.products.length > 0 ? String(data.products[0].product_quantity || "1") : (data.product_quantity ? String(data.product_quantity) : ""),
                    creditAppliedFor: data.products && data.products.length > 0 ? String(Math.floor(Number(data.products[0].credit_applied_for || data.credit_applied_for || 0))) : (data.credit_applied_for ? String(Math.floor(Number(data.credit_applied_for))) : ""),
                    businessType: data.business_type || "shopBased",
                    businessNature: data.business_nature || "",
                    entitled: data.entitled || "proprietor",
                    businessAddress: data.business_address || "",
                    businessOwnership: data.business_ownership || "owned",
                    businessVintage: data.business_vintage ? String(data.business_vintage) : "",
                    businessPhotoName: data.business_photo_name || "",
                    businessProofName: data.business_proof_name || "",
                    partners: data.partners || [],
                    reference1Name: data.reference1_name || "",
                    reference1Contact: data.reference1_contact || "",
                    reference1Address: data.reference1_address || "",
                    reference2Name: data.reference2_name || "",
                    reference2Contact: data.reference2_contact || "",
                    reference2Address: data.reference2_address || "",
                    bankFirstName: data.bank_first_name || "",
                    bankMiddleName: data.bank_middle_name || "",
                    bankLastName: data.bank_last_name || "",
                    bankName: data.bank_name || "",
                    accountNumber: data.account_number || "",
                    ifscCode: data.ifsc_code || "",
                    passbookImageName: data.passbook_image || "",
                    // include direct URL for previewing existing uploaded files
                    incomeProofUrl: data.income_proof_url || null,
                    businessPhotoUrl: data.business_photo_url || null,
                    businessProofUrl: data.business_proof_url || null,
                };

                // attach customer object and set initial data once
                (mappedData as any).customerObject = data.customer;

                // Map ALL products from API into selectedProductsInit so CAFForm shows all of them
                if (data.products && data.products.length > 0) {
                    (mappedData as any).selectedProductsInit = data.products.map((p: any) => ({
                        product_name: p.product_name || "",
                        product_code: p.product_details?.product_unique_id || p.product_code || "",
                        product_quantity: String(p.product_quantity || "1"),
                        credit_applied_for: String(p.credit_applied_for || "0"),
                        product_attributes: parseProductAttributes(p.product_attributes || {}),
                        product_details: p.product_details || null,
                        stock: p.product_details?.stock || 0,
                    }));
                }

                setInitialData(mappedData);

            } else {
                toast.error(res.data.message || "Failed to fetch CAF details");
                router.push("/loan/caf");
            }
        } catch (error) {
            console.error("Fetch CAF details failed", error);
            toast.error("An error occurred while fetching details");
            router.push("/loan/caf");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCAFDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Loading CAF details for editing...</p>
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500">CAF application not found.</p>
            </div>
        );
    }

    return <CAFForm mode="edit" initialData={initialData} loanApplicationId={id!} preselectedProductId={initialData?.productCode} />;
}
