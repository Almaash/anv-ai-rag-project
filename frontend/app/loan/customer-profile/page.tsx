"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { CheckCircle, Clock, XCircle, User } from "lucide-react";

const statusMap: any = {
    branch_support_executive: {
        label: "Branch Support Executive",
        className: "bg-blue-50 text-blue-700 border border-blue-200",
        icon: <User size={14} />,
    },
    field_executive: {
        label: "Field Executive",
        className: "bg-purple-50 text-purple-700 border border-purple-200",
        icon: <User size={14} />,
    },
    verified: {
        label: "Verified",
        className: "bg-green-50 text-green-700 border border-green-200",
        icon: <CheckCircle size={14} />,
    },
    pending: {
        label: "Pending",
        className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
        icon: <Clock size={14} />,
    },
    rejected: {
        label: "Rejected",
        className: "bg-red-50 text-red-700 border border-red-200",
        icon: <XCircle size={14} />,
    },
};

const formatText = (text: string) =>
    text
        ?.replace(/_/g, " ")
        ?.replace(/\b\w/g, (c) => c.toUpperCase());

const StatusChip = ({ text }: any) => {
    const config = statusMap[text] || {
        label: formatText(text) || "Unknown",
        className: "bg-gray-100 text-gray-600 border",
        icon: null,
    };

    return (
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${config.className}`}
        >
            {config.icon}
            {config.label}
        </div>
    );
};

const BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

export default function CustomerProfilePage() {
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const getUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const fetchCustomer = async () => {
        try {
            setLoading(true);
            const id = getUser()?.customer_unique_id;
            if (!id) return;

            const res = await axiosInstance.get(
                `${ProjectApiList.api_getLonaCustomerById}/${id}`
            );

            if (res.data.success) setCustomer(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomer();
    }, []);

    if (loading) return <Loader />;
    if (!customer) return <div className="p-6">No data found</div>;

    const assets = customer.assets ? JSON.parse(customer.assets) : {};
    const getImage = (p?: string) => (p ? `${BASE_URL}/${p}` : null);

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">

            {/* 🔥 NEW PREMIUM HEADER */}
            <div className="bg-white rounded-3xl shadow-md border p-6 flex flex-col lg:flex-row lg:items-center gap-6">

                {/* LEFT - PROFILE */}
                <div className="flex items-center gap-5">

                    {/* IMAGE */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                            {customer.customer_photo ? (
                                <img
                                    src={getImage(customer.customer_photo)!}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setPreview(getImage(customer.customer_photo))}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                                    No Photo
                                </div>
                            )}
                        </div>

                        {/* STATUS DOT */}
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>

                    {/* NAME + ID */}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
                            {customer.first_name} {customer.last_name}
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            {customer.customer_unique_id}
                        </p>

                        <div className="flex gap-2 mt-3">
                            <StatusChip text={customer.status} />
                            <StatusChip text={customer.verification_status} />
                        </div>
                    </div>
                </div>

                {/* RIGHT - INFO CARDS */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">

                    <InfoCard label="Enrollment" value={customer.enrollment_number} />
                    <InfoCard label="DOB" value={customer.date_of_birth} />
                    <InfoCard label="Phone" value={customer.contact_number_1} />
                    <InfoCard label="Branch" value={customer.branch_id} />

                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-6">

                    <Card title="Personal Info">
                        <Grid>
                            <Item label="Gender" value={customer.gender} />
                            <Item label="Father" value={customer.father_name} />
                            <Item label="Religion" value={customer.religion} />
                            <Item label="Caste" value={customer.caste} />
                        </Grid>
                    </Card>

                    <Card title="Address">
                        <Item label="Permanent" value={customer.permanent_address} />
                        <Item label="Correspondence" value={customer.correspondence_address} />
                    </Card>

                    <Card title="Nominee">
                        <Grid>
                            <Item label="Name" value={customer.nominee_name} />
                            <Item label="Relation" value={customer.nominee_relationship} />
                        </Grid>
                    </Card>

                    <Card title="Occupation">
                        <Grid>
                            <Item label="Type" value={customer.occupation} />
                            <Item label="Employee" value={customer.salaried_type} />
                        </Grid>
                    </Card>

                </div>

                <div className="space-y-6">

                    <Card title="Assets">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(assets).map(([k, v]: any) =>
                                v && (
                                    <span
                                        key={k}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                    >
                                        {k}
                                    </span>
                                )
                            )}
                        </div>
                    </Card>

                    <Card title="Person Disability">
                        <Grid>
                            <Item
                                label="Is Disabled"
                                value={
                                    customer.is_disabled === true
                                        ? "Yes"
                                        : customer.is_disabled === false
                                            ? "No"
                                            : "-"
                                }
                            />
                            <Item
                                label="Disability Type"
                                value={customer.is_disabled ? customer.disability_type : "-"}
                            />
                        </Grid>
                    </Card>

                    <Card title="KYC Documents">
                        <div className="grid grid-cols-2 gap-3">
                            <Doc label="Aadhaar" img={getImage(customer.adhaar_image)} setPreview={setPreview} />
                            <Doc label="PAN" img={getImage(customer.pan_image)} setPreview={setPreview} />
                            <Doc label="Voter" img={getImage(customer.voter_id_image)} setPreview={setPreview} />
                            <Doc label="DL" img={getImage(customer.driving_license_image)} setPreview={setPreview} />
                        </div>
                    </Card>

                </div>

            </div>

            {/* IMAGE MODAL */}
            {preview && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                    onClick={() => setPreview(null)}
                >
                    <img src={preview} className="max-h-[90%] rounded-xl shadow-lg" />
                </div>
            )}

        </div>
    );
}

/* COMPONENTS */

const Card = ({ title, children }: any) => (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
        {children}
    </div>
);

const Grid = ({ children }: any) => (
    <div className="grid grid-cols-2 gap-4">{children}</div>
);

const Item = ({ label, value }: any) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-base font-medium text-gray-800">{value || "-"}</p>
    </div>
);

// const StatusChip = ({ text }: any) => (
//     <span className="px-3 py-1 text-sm rounded-full bg-white/20">
//         {text}
//     </span>
// );

const QuickItem = ({ label, value }: any) => (
    <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">{value || "-"}</p>
    </div>
);

const Doc = ({ label, img, setPreview }: any) => (
    <div
        className="border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition"
        onClick={() => img && setPreview(img)}
    >
        <div className="p-2 text-xs text-gray-500">{label}</div>
        {img ? (
            <img src={img} className="h-24 w-full object-cover" />
        ) : (
            <div className="h-24 flex items-center justify-center text-xs bg-gray-100">
                No Image
            </div>
        )}
    </div>
);

const Loader = () => (
    <div className="flex justify-center items-center h-[300px]">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
);

const InfoCard = ({ label, value }: any) => (
    <div className="bg-gray-50 border rounded-xl p-3">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">
            {value || "-"}
        </p>
    </div>
);