"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import PDForm, { PDFormData } from "../components/PDForm";
import { Loader2 } from "lucide-react";

export default function EditPDPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <EditPDContent />
        </Suspense>
    );
}

function EditPDContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");

    const [pdData, setPdData] = useState<PDFormData | null>(null);
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"verified" | "pending">("pending");

    useEffect(() => {
        const fetchPD = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const response = await axiosInstance.get(`${ProjectApiList.api_getPDById}/${id}`);
                
                if (response.data.success) {
                    const data = response.data.data;
                    
                    // Parse PD information if it's a string
                    let info = data.pd_information;
                    if (typeof info === 'string') {
                        try {
                            info = JSON.parse(info);
                        } catch (e) {
                            console.error("Failed to parse pd_information", e);
                        }
                    }

                    // Format data for PDForm
                    const initialFormData: PDFormData = {
                        memberRows: [{
                            memberName: data.member_name || "",
                            custId: data.customer_unique_id || "",
                            productCode: data.product_code || "",
                            creditAmount: data.credit_amount || "",
                        }],
                        businessType: info?.business_type || "shopBased",
                        businessNature: info?.business_nature || "",
                        entitled: info?.entitled || "proprietor",
                        businessAddress: info?.business_address || "",
                        businessOwnership: info?.business_ownership || "owned",
                        businessVintage: info?.business_vintage || "",
                        businessPhotoName: data.business_verification_photo || "",
                        businessProofName: "", // Adjust if you have this field
                        obligationRows: Array.isArray(data.obligation_details) ? data.obligation_details : [],
                        houseVerificationPhotoName: data.house_verification_photo || "",
                        businessVerificationPhotoName: data.business_verification_photo || "",
                        pdAnswers: {
                            geoLocation: info?.geo_location || "",
                            notRentedHouse: info?.not_rented_house || "",
                            bnplOwnUse: info?.bnpl_own_use || "",
                            productDescription: info?.product_description || "",
                            hypothecationAgreement: info?.hypothecation_agreement || "",
                            creditFacilitatorAgreement: info?.credit_facilitator_agreement || "",
                            repaymentsPolicy: info?.repayments_policy || "",
                            processingFee: info?.processing_fee || "",
                            serviceFees: info?.service_fees || "",
                            referralScheme: info?.referral_scheme || "",
                        }
                    };

                    setPdData(initialFormData);
                    // Try to fetch CAF/customer details for the loan application and pass to PDForm
                    if (data.loan_application_id) {
                        try {
                            const cafRes = await axiosInstance.get(
                                `${ProjectApiList.api_getCAFById}/${data.loan_application_id}`
                            );

                            if (cafRes.data && (cafRes.data.success || cafRes.data.status)) {
                                setCustomerInfo(cafRes.data.data);
                            } else {
                                setCustomerInfo(data);
                            }
                        } catch (err) {
                            console.error("Error fetching CAF for PD edit:", err);
                            setCustomerInfo(data);
                        }
                    } else {
                        setCustomerInfo(data);
                    }
                    setStatus(data.pd_verification_status === "verified" ? "verified" : "pending");
                } else {
                    toast.error("Failed to fetch PD data");
                }
            } catch (error) {
                console.error("Error fetching PD:", error);
                toast.error("Error loading PD information");
            } finally {
                setLoading(false);
            }
        };

        fetchPD();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-500">Loading PD details...</span>
            </div>
        );
    }

    if (!pdData) {
        return (
            <div className="p-10 text-center text-red-500">
                PD record not found.
            </div>
        );
    }

    return (
        <PDForm 
            mode="edit" 
            initialData={pdData} 
            pdId={id || ""} 
            selectedCustomerInfo={customerInfo}
            status={status}
        />
    );
}
