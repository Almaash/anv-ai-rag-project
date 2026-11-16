"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, Clock, CheckCircle, XCircle, AlertCircle, Edit, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ViewPDPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");

    const [data, setData] = useState<any>(null);
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const getRole = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user)?.role : null;
    };
    const isCustomer = getRole() === "customer";

    const fetchPD = async () => {
        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `${ProjectApiList.api_getPDById}/${id}`
            );

            if (response.data.success) {
                // Handle both single object and array responses
                const pdData = Array.isArray(response.data.data)
                    ? response.data.data.find((item: any) => item.pd_application_id === id || item.id == id)
                    : response.data.data;

                if (pdData) {
                    // Parse pd_information if it's a string
                    if (typeof pdData.pd_information === 'string') {
                        try {
                            pdData.pd_information = JSON.parse(pdData.pd_information);
                        } catch (e) {
                            console.error("Failed to parse pd_information", e);
                        }
                    }
                    setData(pdData);
                    // Fetch CAF/customer details using loan application id
                    if (pdData.loan_application_id) {
                        try {
                            const cafRes = await axiosInstance.get(
                                `${ProjectApiList.api_getCAFById}/${pdData.loan_application_id}`
                            );

                            if (cafRes.data && (cafRes.data.success || cafRes.data.status)) {
                                setCustomer(cafRes.data.data);
                            }
                        } catch (err) {
                            console.error("Error fetching CAF for PD view:", err);
                        }
                    }
                } else {
                    setData(null);
                }
            } else {
                toast.error(response.data.message || "Failed to load PD details");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching PD details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchPD();
    }, [id]);

    const formatDate = (date?: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleString("en-IN");
    };

    const creditMode = String(customer?.credit_mode || data?.credit_mode || "").toLowerCase();
    const shouldShowBusinessSection = creditMode !== "product";
    const shouldShowObligationSection = creditMode === "product";
    const pdInfo = data?.pd_information && typeof data.pd_information === "object"
        ? data.pd_information
        : {};

    const hasBusinessData =
        pdInfo?.business_type ||
        pdInfo?.business_nature ||
        pdInfo?.entitled ||
        pdInfo?.business_address ||
        pdInfo?.business_ownership ||
        pdInfo?.business_vintage ||
        pdInfo?.business_photo_name ||
        pdInfo?.business_proof_name ||
        data?.business_photo_name ||
        data?.business_proof_name;

    const statusMeta: any = {
        verified: {
            icon: CheckCircle,
            color: "text-green-600 bg-green-100",
        },
        rejected: {
            icon: XCircle,
            color: "text-red-600 bg-red-100",
        },
        pending: {
            icon: Clock,
            color: "text-yellow-600 bg-yellow-100",
        },
        default: {
            icon: AlertCircle,
            color: "text-gray-600 bg-gray-100",
        },
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading PD details...</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-red-500">PD record not found</div>;
    }

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">PD Details</h1>
                    <p className="text-sm text-gray-500">Personal Discussion Information</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isCustomer && data?.is_cam_created === false && (
                        <button
                            onClick={() => router.push(`/loan/pd/edit/?id=${id}`)}
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                            <Edit className="h-4 w-4" />
                            Edit PD
                        </button>
                    )}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* LEFT SIDE */}
                <div className="lg:col-span-2 space-y-6">

                    {/* BASIC INFO */}
                    <div className="grid md:grid-cols-3 gap-4 bg-white border p-5 rounded-xl">
                        <Info label="PD Application ID" value={data.pd_application_id} />
                        <Info label="Loan Application ID" value={data.loan_application_id} />
                        <Info label="Customer ID" value={data.customer_unique_id} />
                        <Info label="Status" value={data.status} />
                        <Info label="PD Verification Status" value={data.pd_verification_status || data.verification_status} />
                        <Info label="Created Date" value={formatDate(data.created_at)} />
                    </div>

                    {/* VERIFICATION PHOTOS */}
                    <div className="bg-white border p-5 rounded-xl space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Verification Photos</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Photo
                                label="House Verification Photo"
                                src={data.house_verification_photo}
                            />

                            <Photo
                                label="Business Verification Photo"
                                src={data.business_verification_photo}
                            />
                        </div>
                    </div>

                    {/* BUSINESS INFORMATION */}
                    {shouldShowBusinessSection && hasBusinessData && (
                        <div className="bg-white border p-5 rounded-xl space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Business Information</h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Info label="Business Type" value={pdInfo.business_type || "-"} />
                                <Info label="Business Nature" value={pdInfo.business_nature || "-"} />
                                <Info label="Entitled" value={pdInfo.entitled || "-"} />
                                <Info label="Business Address" value={pdInfo.business_address || "-"} />
                                <Info label="Ownership" value={pdInfo.business_ownership || "-"} />
                                <Info label="Business Vintage" value={pdInfo.business_vintage ? `${pdInfo.business_vintage} Years` : "-"} />

                                <Photo
                                    label="Business Photo"
                                    src={pdInfo.business_photo_name || data.business_photo_name}
                                />
                                <Photo
                                    label="Business Proof"
                                    src={pdInfo.business_proof_name || data.business_proof_name}
                                />
                            </div>
                        </div>
                    )}

                    {/* PD INFORMATION */}
                    <div className="bg-white border p-5 rounded-xl space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">PD Information</h2>

                        <div className="grid md:grid-cols-2 gap-4">
                            {data.pd_information && typeof data.pd_information === 'object' ? (
                                Object.entries(data.pd_information).map(([key, value]) => {
                                    // Skip obligation_rows as it's an array/object and should be handled separately
                                    if (key === 'obligation_rows' || typeof value === 'object') return null;

                                    return (
                                        <Info
                                            key={key}
                                            label={key.replace(/_/g, " ").toUpperCase()}
                                            value={value as string}
                                        />
                                    );
                                })
                            ) : (
                                <p className="text-sm text-gray-500 italic">No additional PD information available</p>
                            )}
                        </div>
                    </div>

                    {/* OBLIGATION DETAILS TABLE */}
                    {shouldShowObligationSection && data.obligation_details && Array.isArray(data.obligation_details) && data.obligation_details.length > 0 && (
                        <div className="bg-white border p-5 rounded-xl space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Obligation Details</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-200 text-sm">
                                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="border border-gray-200 px-4 py-2 text-left">Company Name</th>
                                            <th className="border border-gray-200 px-4 py-2 text-left">Credit Type</th>
                                            <th className="border border-gray-200 px-4 py-2 text-right">Credit Amount</th>
                                            <th className="border border-gray-200 px-4 py-2 text-right">EMI Amount</th>
                                            <th className="border border-gray-200 px-4 py-2 text-left">Repayment Mode</th>
                                            <th className="border border-gray-200 px-4 py-2 text-right">Installment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data.obligation_details.map((row: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="border border-gray-200 px-4 py-2">{row.companyName || "-"}</td>
                                                <td className="border border-gray-200 px-4 py-2">{row.creditType || "-"}</td>
                                                <td className="border border-gray-200 px-4 py-2 text-right">{row.creditAmount || "0"}</td>
                                                <td className="border border-gray-200 px-4 py-2 text-right">{row.emiAmount || "0"}</td>
                                                <td className="border border-gray-200 px-4 py-2 uppercase text-[10px] font-medium">{row.repaymentMode || "-"}</td>
                                                <td className="border border-gray-200 px-4 py-2 text-right font-semibold">{row.installmentAmount || "0"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* RIGHT SIDE TIMELINE */}
                <div>

                    <Card className="shadow-none border-gray-200">
                        <CardHeader className="bg-gray-50 py-3 px-4 border-b flex flex-row items-center gap-2">
                            <History className="h-4 w-4 text-gray-600" />
                            <CardTitle className="text-sm font-bold text-gray-800">
                                Application Timeline
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-4">
                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-0.5 before:bg-gray-100">

                                {/* Initial Submission */}
                                <div className="relative flex items-start">
                                    <div className="absolute left-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 z-10">
                                        <Clock size={12} />
                                    </div>

                                    <div className="ml-8">
                                        <h4 className="text-xs font-bold text-gray-900 border-b border-gray-50 w-fit pb-0.5">
                                            Application Submitted
                                        </h4>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {formatDate(data.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* STATUS HISTORY */}
                                {data.status_history?.map((history: any, index: number) => {
                                    const hMeta =
                                        statusMeta[history.status?.toLowerCase()] ||
                                        statusMeta.default;

                                    const HIcon = hMeta.icon;

                                    return (
                                        <div key={index} className="relative flex items-start">

                                            <div
                                                className={cn(
                                                    "absolute left-0 flex h-5 w-5 items-center justify-center rounded-full z-10",
                                                    hMeta.color.split(" ")[1],
                                                    hMeta.color.split(" ")[0]
                                                )}
                                            >
                                                <HIcon size={12} />
                                            </div>

                                            <div className="ml-8">
                                                <h4 className="text-xs font-bold text-gray-900 border-b border-gray-50 w-fit pb-0.5 capitalize">
                                                    {history.status.replace(/_/g, " ")}
                                                </h4>

                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {formatDate(history.timestamp || history.created_at)}
                                                </p>

                                                {history.reason && (
                                                    <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 p-2 rounded border border-gray-100">
                                                        "{history.reason}"
                                                    </p>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </div>
    );
}

/* INFO CARD */
function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium">{value || "-"}</p>
        </div>
    );
}

/* PHOTO COMPONENT */
function Photo({ label, src }: { label: string; src: string }) {
    const imageBaseUrl = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "")) || "http://127.0.0.1:8000";

    // Clean up path - remove public/ if it exists at the start
    let cleanSrc = src;
    if (src && typeof src === 'string') {
        cleanSrc = src.startsWith('public/') ? src.substring(7) : src;
    }

    // If src is already a full URL, use it. Otherwise, append base URL.
    const imageUrl = cleanSrc?.startsWith("http")
        ? cleanSrc
        : `${imageBaseUrl}/${cleanSrc}`;

    return (
        <div>
            <p className="text-sm text-gray-600 mb-2">{label}</p>

            {src ? (
                <img
                    src={imageUrl}
                    alt={label}
                    className="w-full h-auto aspect-video object-cover rounded-md border"
                    onError={(e) => {
                        console.error(`Failed to load image: ${imageUrl}`);
                    }}
                />
            ) : (
                <p className="text-gray-400 text-sm">No Image</p>
            )}
        </div>
    );
}