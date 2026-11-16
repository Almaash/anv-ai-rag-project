"use client";

import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type FinalRowData = {
    dateOfPdDone: string;
    memberName: string;
    custId: string;
    loanId: string;
    product: string;
    productType: string;
    loanAmount: string;
    status: string;
    dateOfBooking: string;
    downPayment?: number;
    chequeNumber?: string;
    bankName?: string;
    accountNumber?: string;
};

const uploadLabels = ["CHA", "CFA", "DPN", "Vernacular"] as const;
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function FinalDisbursementRoleBMPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [rowData, setRowData] = useState<FinalRowData>({
        dateOfPdDone: "",
        memberName: "",
        custId: "",
        loanId: "",
        product: "",
        productType: "",
        loanAmount: "",
        status: "",
        dateOfBooking: "",
    });
    const [initializedDisbursemnts, setInitializedDisbursements] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [language] = useState("DPN");
    const [disbursementVideo, setDisbursementVideo] = useState<File | null>(null);
    const [disbursementPreview, setDisbursementPreview] = useState<string>("");
    const [uploadFiles, setUploadFiles] = useState<Record<(typeof uploadLabels)[number], File | null>>({
        CHA: null,
        CFA: null,
        DPN: null,
        Vernacular: null,
    });
    const [uploadPreviews, setUploadPreviews] = useState<Record<(typeof uploadLabels)[number], string>>({
        CHA: "",
        CFA: "",
        DPN: "",
        Vernacular: "",
    });
    const [saved, setSaved] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const inputClass =
        "w-full min-w-[140px] rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600";

    const validateImageSize = (file: File | undefined) => {
        if (!file) return true;

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            toast.error("Image size must be less than or equal to 2 MB.");
            return false;
        }

        return true;
    };

    const fetchInitializedDisbursements = async () => {
        const getLoggedInUser = () => {
            if (typeof window === "undefined") return null;
            const user = localStorage.getItem("user");
            return user ? JSON.parse(user) : null;
        };

        try {
            setLoading(true);
            const user = getLoggedInUser();
            if (!user) return;

            const response = await axiosInstance.get(ProjectApiList.GET_ALL_DISBURSEMENTS_WITH_DATES, {
                params: { branch_id: user.branch_id },
            });

            if (response.data.success) {
                // Adjusting based on common API collection structure
                const data = response.data.data.data || response.data.data;
                setInitializedDisbursements(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching initialized disbursements:", error);
            toast.error("Failed to load initialized data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitializedDisbursements();
    }, []);

    const fetchDisbursementById = async (disbId: string) => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`${ProjectApiList.api_getDisbursementById}/${disbId}`);
            if (res.data.success && res.data.data) {
                handleSelectDisbursement(res.data.data);
            } else {
                toast.error("Disbursement details not found");
            }
        } catch (error) {
            console.error("Error fetching disbursement by id:", error);
            toast.error("Failed to load disbursement details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            // Check if it's already in the initialized list
            const found = initializedDisbursemnts.find(d => String(d.disbursement_id) === id || String(d.loan_application_id) === id);
            if (found) {
                handleSelectDisbursement(found);
            } else {
                // Fetch from API if not found in current list
                fetchDisbursementById(id);
            }
        }
    }, [id, initializedDisbursemnts]);

    const handleSelectDisbursement = (disb: any) => {
        // If data is from our new simplified show() API, it might already be mapped to these keys
        if (disb.custId && disb.loanId) {
            setRowData({
                dateOfPdDone: disb.dateOfPdDone || "",
                memberName: disb.memberName || "",
                custId: disb.custId,
                loanId: disb.loanId,
                product:
                    disb.product ||
                    disb.raw_data?.loan_application?.products
                        ?.map((p: any) => p.product_name)
                        .join(", ") ||
                    "N/A",
                productType: disb.productType || "N/A",
                loanAmount: disb.loanAmount || "0",
                status: disb.status || "Pending",
                dateOfBooking: disb.dateOfBooking || "",
            });
            setCustomerSearch(disb.memberName || "");
        } else {
            // Otherwise, it's a raw LoanDisbursement object from the initialized list
            const customer = disb.customer;
            const loanApp = disb.loan_application;
            const fullName = customer ? `${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`.trim() : (disb.customer_unique_id || "N/A");

            setRowData({
                dateOfPdDone:
                    disb.pd_information?.updated_at
                        ? new Date(disb.pd_information.updated_at).toLocaleDateString()
                        : disb.created_at
                            ? new Date(disb.created_at).toLocaleDateString()
                            : "N/A",

                memberName: fullName,
                custId: disb.customer_unique_id || "N/A",
                loanId: disb.loan_application_id || "N/A",

                product:
                    loanApp?.products
                        ?.map((p: any) => p.product_name)
                        .join(", ") || "N/A",

                productType: loanApp?.credit_mode || disb.product_type || "N/A",
                loanAmount: loanApp?.credit_applied_for || disb.loan_amount || "0",
                status: disb.disbursement_status || "Pending",
                dateOfBooking: disb.booking_date || "",
            });
            setCustomerSearch(fullName);
        }

        setShowDropdown(false);
        setSaved(false);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredDisbursements = useMemo(() => {
        if (!customerSearch) return initializedDisbursemnts;
        return initializedDisbursemnts.filter((d) => {
            const customer = d.customer;
            const fullName = customer ? `${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`.trim() : "";
            const customerId = d.customer_unique_id || "";
            const appId = d.loan_application_id || "";
            const camId = d.cam_unique_id || "";

            return (
                fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                customerId.toLowerCase().includes(customerSearch.toLowerCase()) ||
                appId.toLowerCase().includes(customerSearch.toLowerCase()) ||
                camId.toLowerCase().includes(customerSearch.toLowerCase())
            );
        });
    }, [customerSearch, initializedDisbursemnts]);

    const renderReadOnlyField = (label: string, value: string) => (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {label}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
        </div>
    );

    const validateBeforeAction = () => {
        const requiredValues = [
            rowData.dateOfPdDone,
            rowData.memberName,
            rowData.custId,
            rowData.loanId,
            rowData.product,
            rowData.productType,
            rowData.loanAmount,
            rowData.status,
            rowData.dateOfBooking,
        ];

        if (requiredValues.some((value) => !value.trim())) {
            toast.error("Please fill all single row details.");
            return false;
        }

        /*
        if (!disbursementVideo) {
            toast.error("Please upload disbursement video.");
            return false;
        }
        */

        const missingDocument = uploadLabels.find((label) => !uploadFiles[label]);
        if (missingDocument) {
            toast.error(`Please upload ${missingDocument} document.`);
            return false;
        }

        return true;
    };

    const updateRowField = (field: keyof FinalRowData, value: string) => {
        setRowData((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        const getLoggedInUser = () => {
            if (typeof window === "undefined") return null;
            const user = localStorage.getItem("user");
            return user ? JSON.parse(user) : null;
        };

        if (!validateBeforeAction()) {
            return;
        }

        try {
            setLoading(true);
            const user = getLoggedInUser();
            const formData = new FormData();

            // Core IDs and Info
            formData.append("loan_application_id", rowData.loanId);
            formData.append("customer_unique_id", rowData.custId);
            formData.append("booking_date", rowData.dateOfBooking);
            formData.append("disbursement_status", rowData.status);
            formData.append("branch_id", user?.branch_id || user?.branch || "");
            formData.append("cms_admin_id", user?.cms_admin_id || user?.cms_admin || "");

            // Document Uploads
            if (uploadFiles.CHA) formData.append("dfa_document", uploadFiles.CHA);
            if (uploadFiles.CFA) formData.append("cfa_document", uploadFiles.CFA);
            if (uploadFiles.DPN) formData.append("dpn_document", uploadFiles.DPN);
            if (uploadFiles.Vernacular) formData.append("vernacular_document", uploadFiles.Vernacular);

            if (disbursementVideo) {
                formData.append("disbursement_video", disbursementVideo);
            }

            const res = await axiosInstance.post(ProjectApiList.api_saveFinalDisbursement, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data.success) {
                setSaved(true);
                toast.success("Final disbursement data saved successfully!");
                router.push("/loan/disbursement/final/");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState<"facilitator" | "dpn" | "single" | "multiple" | "hypothecated">("facilitator");
    const creditRef = useRef<HTMLDivElement>(null);
    const facilitatorRef = useRef<HTMLDivElement>(null);
    const dpnRef = useRef<HTMLDivElement>(null);
    const singleRef = useRef<HTMLDivElement>(null);
    const multipleRef = useRef<HTMLDivElement>(null);
    const hypothecatedRef = useRef<HTMLDivElement>(null);

    const tabRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
        credit: creditRef,
        facilitator: facilitatorRef,
        dpn: dpnRef,
        single: singleRef,
        multiple: multipleRef,
        hypothecated: hypothecatedRef,
    };

    const tabLabels: Record<string, string> = {
        credit: "Credit Agreement",
        facilitator: "Facilitator Agreement",
        dpn: "DPN",
        single: "Single Product Finance",
        multiple: "Multiple Product Finance",
        hypothecated: "Hypothecated Purchase",
    };

    const handleOpenPreview = () => {
        setIsPreviewOpen(true);
    };

    const sanitizeFileNamePart = (value: string) =>
        value
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const cloneWithInlineStyles = (source: HTMLElement): HTMLElement => {
        const clone = source.cloneNode(true) as HTMLElement;
        const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
        const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
        const styleProps = [
            "display", "position", "top", "right", "bottom", "left", "z-index",
            "width", "height", "min-width", "min-height", "max-width", "max-height",
            "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
            "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
            "box-sizing", "overflow", "overflow-x", "overflow-y",
            "font-family", "font-size", "font-weight", "font-style", "line-height",
            "letter-spacing", "word-spacing", "text-align", "text-transform", "text-decoration",
            "text-decoration-color", "white-space", "vertical-align", "color",
            "background", "background-color", "opacity",
            "border", "border-top", "border-right", "border-bottom", "border-left",
            "border-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
            "border-style", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
            "border-width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
            "border-radius", "outline", "outline-color", "outline-style", "outline-width",
            "box-shadow", "text-shadow",
            "flex", "flex-basis", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink",
            "align-items", "align-content", "align-self", "justify-content", "gap", "row-gap", "column-gap",
            "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "place-items",
            "transform", "transform-origin",
            "list-style", "list-style-type", "list-style-position",
        ] as const;

        sourceElements.forEach((src, index) => {
            const dest = cloneElements[index];
            if (!dest) return;
            const computed = window.getComputedStyle(src);

            styleProps.forEach((prop) => {
                const value = computed.getPropertyValue(prop);
                if (value) dest.style.setProperty(prop, value);
            });

            dest.style.color = "#000000";
            if (dest.textContent?.trim() === "Revenue" || dest.textContent?.trim() === "Stamp") {
                dest.style.display = "block";
            }
            const childSpans = Array.from(dest.children).filter(
                (child): child is HTMLSpanElement => child.tagName === "SPAN"
            );
            if (
                childSpans.length >= 2 &&
                childSpans[0].textContent?.trim() === "Revenue" &&
                childSpans[childSpans.length - 1].textContent?.trim() === "Stamp"
            ) {
                dest.style.border = "1.5px solid #000";
                dest.style.width = "96px";
                dest.style.height = "96px";
                dest.style.display = "flex";
                dest.style.flexDirection = "column";
                dest.style.alignItems = "center";
                dest.style.justifyContent = "center";
                dest.style.fontSize = "12px";
            }
        });

        clone.style.display = "block";
        clone.style.visibility = "visible";
        clone.style.opacity = "1";
        clone.style.background = "#ffffff";
        return clone;
    };

    const handlePrintDocuments = (mode: "active" | "all") => {
        const selected = mode === "all" ? ["credit", "facilitator", "dpn", "single", "multiple", "hypothecated"] : [activeTab];
        const sourceElements = selected
            .map((key) => tabRefs[key]?.current)
            .filter((el): el is HTMLDivElement => !!el);

        if (!sourceElements.length) {
            toast.error("Content not ready.");
            return;
        }

        const printWindow = window.open("", "_blank", "width=1200,height=900");
        if (!printWindow) {
            toast.error("Popup blocked. Please allow popups to print.");
            return;
        }

        printWindow.document.open();
        printWindow.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>${sanitizeFileNamePart(mode === "all" ? "All Agreements" : tabLabels[activeTab])}</title>
                <style>
                  @page { size: A4; margin: 12mm; }
                  body { margin: 0; padding: 0; background: #fff; color: #000; }
                  .print-page { page-break-after: always; background: #fff; }
                  .print-page:last-child { page-break-after: auto; }
                  .page-break { page-break-before: always; }
                  .ah, .agreement-heading { text-align: center !important; display: block !important; width: 100% !important; }
                  .stamp-box { border: 1.5px solid #000 !important; width: 90px !important; height: 100px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; }
                  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                  th, td { border: 1px solid black; padding: 6px; }
                  .heading { text-align: center; font-weight: bold; text-decoration: underline; font-size: 18px; margin-bottom: 10px; }
                </style>
              </head>
              <body id="print-root"></body>
            </html>
        `);
        printWindow.document.close();

        const root = printWindow.document.getElementById("print-root");
        if (!root) {
            printWindow.close();
            toast.error("Could not prepare print view.");
            return;
        }

        sourceElements.forEach((src) => {
            const wrapper = printWindow.document.createElement("div");
            wrapper.className = "print-page";
            const cloned = cloneWithInlineStyles(src);
            wrapper.appendChild(cloned);
            root.appendChild(wrapper);
        });

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 300);
    };

    const isDisbursementSelected = !!rowData.loanId;

    const isAllDocumentsUploaded = uploadLabels.every(
        (label) => uploadFiles[label]
    );

    const agreementPreviewData = {
        memberName: rowData.memberName || "",
        dateOfBooking: rowData.dateOfBooking || "",
        product: rowData.product || "",
        loanAmount: rowData.loanAmount || "",
        custId: rowData.custId || "",
        loanId: rowData.loanId || "",
    };

    // optional: include video also if needed
    // const isAllDocumentsUploaded = uploadLabels.every(
    //     (label) => uploadFiles[label]
    // ) && disbursementVideo;

    const isBookingExpired = useMemo(() => {
        if (!rowData.dateOfBooking) return false;

        const today = new Date();
        const bookingDate = new Date(rowData.dateOfBooking);

        // remove time for accurate comparison
        today.setHours(0, 0, 0, 0);
        bookingDate.setHours(0, 0, 0, 0);

        return bookingDate < today;
    }, [rowData.dateOfBooking]);

    return (
        <div className="mx-auto w-full max-w-[1400px] space-y-6 overflow-x-hidden p-4 md:p-6 relative">
            {/* Page Loader */}
            {loading && (
                <div className="absolute inset-x-4 inset-y-4 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-2xl md:inset-x-6 md:inset-y-6">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Loading...</p>
                </div>
            )}
            <Toaster richColors position="top-right" />
            <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                    Final Disbursement (Role BM)
                </h1>
            </div>

            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-6 max-w-md">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Select Initialized Disbursement
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        <input
                            type="text"
                            placeholder="Search by Name, Application ID or Customer ID..."
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                        {showDropdown && filteredDisbursements.length > 0 && (
                            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                                {filteredDisbursements.map((d) => {
                                    const customer = d.customer;
                                    const fullName = customer ? `${customer.first_name || ""} ${customer.middle_name || ""} ${customer.last_name || ""}`.trim() : (d.customer_unique_id || "Unknown");
                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => handleSelectDisbursement(d)}
                                            className="flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-green-50/50"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {fullName}
                                                </span>
                                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 uppercase">
                                                    {d.disbursement_status || "Pending"}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex gap-2 text-[11px] text-gray-500">
                                                <span>ID: <span className="font-medium text-gray-700">{d.loan_application_id}</span></span>
                                                <span>|</span>
                                                <span>Cust: <span className="font-medium text-gray-700">{d.customer_unique_id}</span></span>
                                                {customer?.contact_number_1 && (
                                                    <>
                                                        <span>|</span>
                                                        <span>Mob: <span className="font-medium text-gray-700">{customer.contact_number_1}</span></span>
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {showDropdown && filteredDisbursements.length === 0 && (
                            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-xl">
                                No initialized disbursements found
                            </div>
                        )}
                    </div>
                </div>

                <div className="sm:col-span-2">

                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            href={`/loan/caf/viewDetails/?id=${encodeURIComponent(rowData.loanId)}&type=dis`}
                            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                        >
                            View CAF
                        </Link>
                    </div>
                </div>

                <div className=" border-gray-200 pt-4">
                    <div className="space-y-4 2xl:hidden">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {renderReadOnlyField("Date of PD Done", rowData.dateOfPdDone)}
                                {renderReadOnlyField("Member Name", rowData.memberName)}
                                {renderReadOnlyField("Cust ID", rowData.custId)}
                                {renderReadOnlyField("Cust ID", rowData.loanId)}
                                {/* <div className="sm:col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Loan ID
                                    </p>
                                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm font-medium text-gray-900">{rowData.loanId}</p>
                                        <Link
                                            href={`/loan/cafVerification/viewDetails/?id=${encodeURIComponent(rowData.loanId)}`}
                                            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                                        >
                                            View CAF
                                        </Link>
                                    </div>
                                </div> */}
                                {renderReadOnlyField("Product", rowData.product)}
                                {renderReadOnlyField("Product Type", rowData.productType)}
                                {renderReadOnlyField("Loan Amount", `Rs ${rowData.loanAmount}`)}
                                {renderReadOnlyField("Status", rowData.status)}
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Date of Booking
                                    </label>
                                    <input
                                        type="date"
                                        readOnly
                                        value={rowData.dateOfBooking}
                                        onChange={(e) => updateRowField("dateOfBooking", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden overflow-x-auto 2xl:block">
                        <table className="w-[1100px] border border-gray-300 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {[
                                        "Date of PD Done",
                                        "Member Name",
                                        "Cust ID",
                                        "Loan ID",
                                        "Product",
                                        "Product Type",
                                        "Loan Amount",
                                        "Status",
                                        "Date of Booking",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-300 px-4 py-3">{rowData.dateOfPdDone}</td>
                                    <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">{rowData.memberName}</td>
                                    <td className="border border-gray-300 px-4 py-3">{rowData.custId}</td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span>{rowData.loanId}</span>
                                            <Link
                                                href={`/loan/cafVerification/viewDetails/?id=${encodeURIComponent(rowData.loanId)}`}
                                                className="inline-flex items-center justify-center rounded-md border border-blue-600 px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                                            >
                                                View CAF
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3">{rowData.product}</td>
                                    <td className="border border-gray-300 px-4 py-3">{rowData.productType}</td>
                                    <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900">Rs {rowData.loanAmount}</td>
                                    <td className="border border-gray-300 px-4 py-3">{rowData.status}</td>
                                    <td className="border border-gray-300 px-4 py-3">
                                        <input
                                            type="date"
                                            value={rowData.dateOfBooking}
                                            onChange={(e) =>
                                                updateRowField("dateOfBooking", e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* {isBookingExpired && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-red-700 font-semibold text-sm">
                        ⚠️ Booking date has passed. Please re-book with a new Booking Date.
                    </p>
                </div>
            )} */}

            {/* {isDisbursementSelected && !isBookingExpired && ( */}
            {isDisbursementSelected && (
                <>
                    <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                        <h2 className="text-[1.05rem] font-semibold text-green-700">Action Section</h2>
                        <div className="mt-3 border-t border-gray-200 pt-4 space-y-5">
                            <div>
                                <p className="text-sm text-gray-500">Member Name</p>
                                <p className="mt-1 text-base font-semibold text-gray-900">
                                    {rowData.memberName}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm text-gray-700">
                                        CHA / CFA
                                    </label>
                                    <input value={rowData.productType} readOnly className={inputClass} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-gray-700">
                                        DPN / Vernacular / Loan Card
                                    </label>
                                    <input value={language} readOnly className={inputClass} />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={handleOpenPreview}
                                        className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 md:w-auto"
                                    >
                                        Print / Save PDF
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm text-gray-700">
                                        Disbursement Image <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className={inputClass}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            if (!validateImageSize(file || undefined)) {
                                                e.target.value = "";
                                                setDisbursementVideo(null);
                                                setDisbursementPreview("");
                                                setSaved(false);
                                                return;
                                            }

                                            setDisbursementVideo(file);
                                            setDisbursementPreview(file ? URL.createObjectURL(file) : "");
                                            setSaved(false);
                                        }}
                                    />
                                    {disbursementVideo && (
                                        <p className="mt-1 text-xs text-gray-500">{disbursementVideo.name}</p>
                                    )}
                                    {disbursementPreview && (
                                        <img
                                            src={disbursementPreview}
                                            alt="Disbursement Preview"
                                            className="mt-3 h-32 w-48 rounded-md border object-cover shadow-sm"
                                        />
                                    )}
                                </div>
                                {/* <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-1">
                                    <button
                                        type="button"
                                        onClick={handleOpenPreview}
                                        className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 sm:w-auto"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 sm:w-auto"
                                    >
                                        {saved ? "Saved" : "Not Saved"}
                                    </button>
                                </div> */}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                        <h2 className="text-[1.05rem] font-semibold text-green-700">Documents Upload</h2>
                        <div className="mt-3 border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {uploadLabels.map((label) => (
                                    <div key={label}>
                                        <label className="mb-1 block text-sm text-gray-700">{label} <span className="text-red-500">*</span></label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className={inputClass}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                if (!validateImageSize(file || undefined)) {
                                                    e.target.value = "";
                                                    setUploadFiles((prev) => ({
                                                        ...prev,
                                                        [label]: null,
                                                    }));
                                                    setUploadPreviews((prev) => ({
                                                        ...prev,
                                                        [label]: "",
                                                    }));
                                                    setSaved(false);
                                                    return;
                                                }

                                                setUploadFiles((prev) => ({
                                                    ...prev,
                                                    [label]: file,
                                                }));
                                                setUploadPreviews((prev) => ({
                                                    ...prev,
                                                    [label]: file ? URL.createObjectURL(file) : "",
                                                }));
                                                setSaved(false);
                                            }}
                                        />
                                        {uploadFiles[label] && (
                                            <p className="mt-1 text-xs text-gray-500">{uploadFiles[label].name}</p>
                                        )}
                                        {uploadPreviews[label] && (
                                            <img
                                                src={uploadPreviews[label]}
                                                alt={`${label} preview`}
                                                className="mt-3 h-28 w-full max-w-[220px] rounded-md border object-cover shadow-sm"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm md:p-6">
                        <div className="mt-5 flex justify-end">
                            {!isAllDocumentsUploaded && (
                                <p className="text-xs text-red-500 text-right mt-1 pr-5">
                                    Please upload all required documents to enable submission.
                                </p>
                            )}
                            <button
                                type="button"
                                disabled={loading || !isAllDocumentsUploaded}
                                onClick={() => {
                                    if (!isAllDocumentsUploaded) return;
                                    setShowConfirm(true);
                                }}
                                className={`px-4 py-2 text-sm text-white rounded-md transition-all
        ${loading || !isAllDocumentsUploaded
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                            >
                                {loading ? "Submitting..." : "Submit Final Disbursement"}
                            </button>

                            {/* <button
                                type="button"
                                onClick={handleOpenPreview}
                                className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 sm:w-auto"
                            >
                                Preview
                            </button> */}
                        </div>
                    </section>

                    {/* Confirmation Dialog for Save */}
                    <ConfirmDialog
                        isOpen={showConfirm}
                        onCancel={() => setShowConfirm(false)}
                        onConfirm={() => {
                            setShowConfirm(false);
                            handleSave();
                        }}
                        title="Confirm Save"
                        message="Are you sure you want to save the final disbursement data?"
                    />

                    {/* Agreements Preview Modal */}
                    {isPreviewOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
                            <div className="relative bg-white rounded-xl shadow-2xl flex flex-col" style={{ width: "65vw", height: "92vh" }}>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                                    <h2 className="text-lg font-semibold text-gray-900">Agreement Documents Preview</h2>
                                    <button onClick={() => setIsPreviewOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-200 gap-1 px-6 shrink-0 overflow-x-auto">
                                    {(["facilitator", "dpn", "single", "multiple", "hypothecated"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                                ? "border-blue-600 text-blue-600"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            {tabLabels[tab]}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto px-6 pb-4">

                                    {/* CREDIT AGREEMENT */}
                                    {/* <div className={activeTab === "credit" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={creditRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <style dangerouslySetInnerHTML={{ __html: `.us { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; } .ah { font-weight:700; text-decoration:underline; text-transform:uppercase; text-align:center; } .clean-text { font-weight:400; font-size:0.875rem; line-height:1.6; } .hindi-text { font-family: 'Noto Sans Hindi', sans-serif; line-height: 1.8; } .stamp-box { border:1.5px solid black; width:90px; height:100px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.75rem; }` }} />
                                            <div className="text-center mb-8"><h2 className="text-xl ah">Credit (Hypothecation) Agreement</h2></div>
                                            <div className="space-y-5 clean-text">
                                                <p>I <span className="us">{agreementPreviewData.memberName}</span> am purchasing a (product) <span className="us">{agreementPreviewData.product}</span> as on (Date) <span className="us">{agreementPreviewData.dateOfBooking}</span>.</p>
                                                <p>The Price of the product is Rs <span className="us">{agreementPreviewData.loanAmount}</span>. I paid a sum of amount <span className="us"></span>. As a down payment @ <span className="us"></span>% of the cost of the product. Rest of the amount <span className="us"></span> will be pay as per the credit service provider&apos;s instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).</p>
                                                <div className="grid grid-cols-2 gap-y-4 mt-4">
                                                    <p>Cheque details : Cheque Number <span className="us"></span></p>
                                                    <p className="ml-10">Drawee Bank <span className="us"></span></p>
                                                    <p className="col-span-2 text-right pr-10">A/c Number <span className="us"></span></p>
                                                </div>
                                                <div className="grid grid-cols-2 mt-4">
                                                    <p>Name of the payee <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                    <p>Name of the remitter <span className="us">{agreementPreviewData.memberName}</span></p>
                                                </div>
                                                <div className="mt-6">
                                                    <p className="mb-3">The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
                                                    <ol className="list-decimal pl-8 space-y-1 text-sm italic">
                                                        <li>Purchased product will not be shared with any member or group or with any relatives/Friends till the completion of Credit limit.</li>
                                                        <li>I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
                                                        <li>I will pay all the Installment on stipulated time with in the credit tenure.</li>
                                                        <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
                                                        <li>Product warranty and Guarantee will be provided as per the product&apos;s company norms.</li>
                                                        <li>Product will not be changed once sold.</li>
                                                        <li>Product manufacturing defects will be entertained as per the norms of manufacturer/ company.</li>
                                                        <li>If credit default by me, will be subject to Jurisdiction.</li>
                                                        <li>If any Installment will be stopped by me then service provider will be the right to recover/ forfeited the product financed by him.</li>
                                                        <li>Any dispute will be subject to the Jurisdiction under arbitration act.</li>
                                                    </ol>
                                                </div>
                                                <div className="mt-10 border-t pt-6 space-y-4 hindi-text">
                                                    <h2 className="text-xl ah">ऋण (गिरवी) समझौता</h2>
                                                    <p>मैं <span className="us">{agreementPreviewData.memberName}</span> दिनांक <span className="us">{agreementPreviewData.dateOfBooking}</span> को एक (उत्पाद) <span className="us">{agreementPreviewData.product}</span> खरीद रहा/रही हूँ।</p>
                                                    <p>उत्पाद की कीमत रु <span className="us">{agreementPreviewData.loanAmount}</span> है। मैंने <span className="us"></span> राशि का अग्रिम भुगतान उत्पाद की लागत के <span className="us"></span>% की दर से किया है। शेष राशि <span className="us"></span> का भुगतान क्रेडिट सेवा प्रदाता के निर्देशों के अनुसार किया जाएगा।</p>
                                                    <div className="grid grid-cols-2 gap-y-6 mt-6">
                                                        <p>चेक विवरण: चेक संख्या <span className="us"></span></p>
                                                        <p>आहरित बैंक <span className="us"></span></p>
                                                        <p className="col-span-2 text-right md:pr-10">खाता संख्या <span className="us"></span></p>
                                                    </div>
                                                    <div className="grid grid-cols-2 mt-4">
                                                        <p>प्राप्तकर्ता का नाम <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                        <p>प्रेषक का नाम <span className="us">{agreementPreviewData.memberName}</span></p>
                                                    </div>
                                                    <div className="mt-6">
                                                        <ol className="list-decimal pl-8 space-y-2 text-sm italic">
                                                            <li>खरीदी गई वस्तु को क्रेडिट सीमा पूरी होने तक किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं किया जाएगा।</li>
                                                            <li>मैं भुगतान के उस तरीके से सहमत हूँ जिस पर मैंने क्रेडिट एग्रीमेंट भरते समय हस्ताक्षर किए थे।</li>
                                                            <li>मैं क्रेडिट अवधि के भीतर सभी किस्तें निर्धारित समय पर चुका दूंगा/दूंगी।</li>
                                                            <li>मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
                                                            <li>उत्पाद की वारंटी और गारंटी उत्पाद की कंपनी के मानदंडों के अनुसार प्रदान की जाएगी।</li>
                                                            <li>एक बार बेचे जाने के बाद उत्पाद को बदला नहीं जाएगा।</li>
                                                            <li>उत्पाद निर्माण दोषों को निर्माता/कंपनी के मानदंडों के अनुसार ठीक किया जाएगा।</li>
                                                            <li>मेरे द्वारा क्रेडिट डिफॉल्ट की स्थिति में, मामला संबंधित क्षेत्राधिकार के अधीन होगा।</li>
                                                            <li>यदि मैं कोई किस्त रोक देता/देती हूँ, तो सेवा प्रदाता को वित्तपोषित उत्पाद वापस लेने/जप्त करने का अधिकार होगा।</li>
                                                            <li>कोई भी विवाद मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
                                                        </ol>
                                                    </div>
                                                    <p className="mt-6">मैं <span className="us">{agreementPreviewData.memberName}</span> अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>
                                                    <div className="mt-8">
                                                        <div className="border border-black w-24 h-24 flex flex-col items-center justify-center text-sm mb-3"><span>Revenue</span><span>Stamp</span></div>
                                                        <p className="font-bold text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>Affix Signature/ Thumb impression crossed upon the revenue stamp (राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print Credit Agreement</Button>
                                        </div>
                                    </div> */}

                                    {/* FACILITATOR AGREEMENT */}
                                    <div className={activeTab === "facilitator" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={facilitatorRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <div className="text-center mb-8"><h2 className="text-xl ah">Credit (Facilitator) Agreement</h2></div>
                                            <div className="space-y-5 clean-text">
                                                <p>I <span className="us">{agreementPreviewData.memberName}</span> am availing a (Credit limit) of Rs.<span className="us">{agreementPreviewData.loanAmount}</span> as on (Date)<span className="us">{agreementPreviewData.dateOfBooking}</span>.</p>
                                                <p>A sum of amount <span className="us"></span> is deducted from my credit limit in favor of all the service fee including GST 18% (PF @....% and CLI). I will repay the credit limit with an interest charged @ .....% (per annum) which will be pay as per the credit service provider&apos;s instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).</p>
                                                <div className="grid grid-cols-2 gap-y-4 mt-4">
                                                    <p>Cheque details : Cheque Number <span className="us"></span></p>
                                                    <p className="ml-10">Drawee Bank <span className="us"></span></p>
                                                    <p className="col-span-2 text-right pr-10">A/c Number <span className="us"></span></p>
                                                </div>
                                                <div className="grid grid-cols-2 mt-4">
                                                    <p>Name of the payee <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                    <p>Name of the remitter <span className="us">{agreementPreviewData.memberName}</span></p>
                                                </div>
                                                <div className="mt-6">
                                                    <p className="font-semibold mb-3 underline">The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
                                                    <ol className="list-decimal pl-8 space-y-1 text-sm italic">
                                                        <li>Availed credit limit will not be shared with any member or group or with any relatives/Friends, if shared then the service provider would have rights to recover the outstanding amount through DPN agreement.</li>
                                                        <li>I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
                                                        <li>I will pay all the scheduled Installment on stipulated time with in the credit tenure.</li>
                                                        <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
                                                        <li>Once I avail the credit limit then it will necessary to purchase Credit linked Insurance for unwanted situations (Death circumstances).</li>
                                                        <li>Once I avail the credit limit then it will not cancelled, if want to canceled then the interest for one year will be chargeable.</li>
                                                        <li>The provided Bank details is mine and it is correct according to my knowledge and I am availing the credit limit on this bank details.</li>
                                                        <li>If credit default by me, will be subject to Jurisdiction.</li>
                                                        <li>If any Installment will be stopped by me then service provider will be the right to take legal action against me.</li>
                                                        <li>Any dispute will be subject to the Jurisdiction under arbitration act/ 138 act and as per the applicable law.</li>
                                                    </ol>
                                                </div>
                                                <div className="mt-8 border-t pt-6 hindi-text">
                                                    <h2 className="text-xl ah mb-4">ऋण (सुविधाकर्ता) समझौता</h2>
                                                    <p>मैं <span className="us">{agreementPreviewData.memberName}</span> दिनांक <span className="us">{agreementPreviewData.dateOfBooking}</span> को ₹ <span className="us">{agreementPreviewData.loanAmount}</span> की क्रेडिट सीमा का लाभ उठा रहा/रही हूँ।</p>
                                                    <p>मेरी क्रेडिट सीमा से <span className="us"></span> राशि की कटौती की गई है, जिसमें 18% जीएसटी सहित सभी सेवा शुल्क शामिल हैं। मैं क्रेडिट सीमा का भुगतान ब्याज सहित सेवा प्रदाता के निर्देशों के अनुसार करूंगा/करूंगी।</p>
                                                    <div className="grid grid-cols-2 gap-y-4 mt-6">
                                                        <p>चेक विवरण: चेक संख्या <span className="us"></span></p>
                                                        <p>आहरित बैंक <span className="us"></span></p>
                                                        <p className="col-span-2 text-right md:pr-10">खाता संख्या <span className="us"></span></p>
                                                    </div>
                                                    <div className="grid grid-cols-2 mt-4">
                                                        <p>प्राप्तकर्ता का नाम <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                        <p>प्रेषक का नाम <span className="us">{agreementPreviewData.memberName}</span></p>
                                                    </div>
                                                    <div className="mt-6">
                                                        <ol className="list-decimal pl-8 space-y-2 text-sm italic">
                                                            <li>दी गई क्रेडिट सीमा किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं की जाएगी।</li>
                                                            <li>मैं भुगतान के उस तरीके से सहमत हूँ जिस पर मैंने CAF भरते समय हस्ताक्षर किए थे।</li>
                                                            <li>मैं क्रेडिट अवधि के भीतर सभी निर्धारित किस्तें समय पर चुका दूंगा/दूंगी।</li>
                                                            <li>मैं सभी करों एवं विलंब भुगतान पर जुर्माने के लिए उत्तरदायी हूँ।</li>
                                                            <li>क्रेडिट सीमा का लाभ उठाने के बाद, अप्रत्याशित परिस्थितियों के लिए क्रेडिट लिंक्ड बीमा आवश्यक होगा।</li>
                                                            <li>क्रेडिट सीमा लेने के बाद इसे रद्द नहीं किया जा सकता; रद्द करने पर एक वर्ष का ब्याज लागू होगा।</li>
                                                            <li>प्रदान किए गए बैंक विवरण मेरी जानकारी के अनुसार सही हैं।</li>
                                                            <li>भुगतान में चूक की स्थिति में मामला क्षेत्राधिकार के अधीन होगा।</li>
                                                            <li>यदि मैं कोई किस्त रोक देता/देती हूँ, तो सेवा प्रदाता को कानूनी कार्रवाई करने का अधिकार होगा।</li>
                                                            <li>कोई भी विवाद लागू कानून, मध्यस्थता अधिनियम/138 अधिनियम के अधीन होगा।</li>
                                                        </ol>
                                                    </div>
                                                    <p className="mt-6">मैं <span className="us">{agreementPreviewData.memberName}</span> अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>
                                                    <div className="border border-black w-24 h-24 flex flex-col items-center justify-center text-sm mb-3"><span>Revenue</span><span>Stamp</span></div>
                                                    <p className="font-bold text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>Affix Signature/ Thumb impression crossed upon the revenue stamp (राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print Facilitator Agreement</Button>
                                        </div>
                                    </div>

                                    {/* DPN */}
                                    <div className={activeTab === "dpn" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={dpnRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <div className="text-center mb-8"><h2 className="text-xl ah">DPN (Demand Promissory Note)</h2></div>
                                            <div className="space-y-5 clean-text">
                                                <p>To the demand of this Promissory note holder, I <span className="us">{agreementPreviewData.memberName}</span> (Customer name) W/O, S/O <span className="us"></span> am resides at <span className="us"></span>, Today on date <span className="us">{agreementPreviewData.dateOfBooking}</span>. I avail a credit limit of Rs.<span className="us">{agreementPreviewData.loanAmount}</span> from Anavran Livelihood services Pvt Ltd, I promise to pay this immediately whenever demanded by the service provider, without any objection.</p>
                                                <div className="text-center my-4"><h2 className="text-xl ah hindi-text">मांग वचन पत्र</h2></div>
                                                <p className="hindi-text">इस वचन पत्र धारक की मांग पर, मैं <span className="us">{agreementPreviewData.memberName}</span> (ग्राहक का नाम) पत्नी, पुत्र <span className="us"></span> पता <span className="us"></span> आज दिनांक <span className="us">{agreementPreviewData.dateOfBooking}</span> को अनवरन लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड से <span className="us">{agreementPreviewData.loanAmount}</span> रुपये की क्रेडिट सीमा का लाभ उठाता/लेती हूँ। मैं सेवा प्रदाता द्वारा मांगे जाने पर बिना किसी आपत्ति के इसे तुरंत भुगतान करने का वचन देता/देती हूँ।</p>
                                                <div className="mt-8 grid grid-cols-2">
                                                    <div className="space-y-4">
                                                        <p>Date (दिनांक) <span className="us">{agreementPreviewData.dateOfBooking}</span></p>
                                                        <p>Place (स्थान) <span className="us"></span></p>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-xs mb-2 text-right">Affix Signature/ Thumb impression crossed upon the revenue stamp</p>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs">(राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</span>
                                                            <div className="stamp-box"><span>Revenue</span><div className="h-4"></div><span>Stamp</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border-t-2 border-dashed my-8"></div>
                                                <div className="text-center mb-4"><h2 className="text-xl ah">Vernacular declaration along with thumb impression consent</h2></div>
                                                <div className="flex gap-16">
                                                    <p>Customer ID <span className="us">{agreementPreviewData.custId}</span></p>
                                                    <p>Credit ID <span className="us">{agreementPreviewData.loanId}</span></p>
                                                </div>
                                                <p>I <span className="us">{agreementPreviewData.memberName}</span> agree that all the credit application documents provided by the service provider Anavran Livelihood services Pvt Ltd in which all the mentioned criteria for teaching and explaining and understood in my regional language by the authorized person/employee to me is fully satisfactory.</p>
                                                <p>I am giving my consent for acceptance, support and adherence towards terms and conditions and giving my consent by putting my signature/ thumb impression for the conclusion arise from all the mentioned explanations of all the documents.</p>
                                                <div className="text-center my-4"><h2 className="text-xl ah hindi-text">स्थानीय भाषा में घोषणा और अंगूठे के निशान के साथ सहमति</h2></div>
                                                <div className="hindi-text space-y-4">
                                                    <div className="flex gap-16">
                                                        <p>ग्राहक आईडी <span className="us">{agreementPreviewData.custId}</span></p>
                                                        <p>क्रेडिट आईडी <span className="us">{agreementPreviewData.loanId}</span></p>
                                                    </div>
                                                    <p>मैं <span className="us">{agreementPreviewData.memberName}</span> सहमत हूँ कि सेवा प्रदाता अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड द्वारा प्रदान किए गए सभी क्रेडिट आवेदन दस्तावेज़, जिनमें उल्लिखित सभी मानदंड मेरी क्षेत्रीय भाषा में अधिकृत व्यक्ति/कर्मचारी द्वारा मुझे समझाए और बताए गए हैं, पूरी तरह से संतोषजनक हैं। मैं अपनी इच्छा और सद्भावना से इस प्रक्रिया के लिए अपनी सहमति दे रहा/रही हूँ।</p>
                                                </div>
                                                <div className="mt-8 grid grid-cols-2">
                                                    <div className="space-y-4">
                                                        <p>Date (दिनांक) <span className="us">{agreementPreviewData.dateOfBooking}</span></p>
                                                        <p>Place (स्थान) <span className="us"></span></p>
                                                        <p className="mt-6">Witness (गवाह) <span className="us"></span></p>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-4 mb-8">
                                                            <span className="text-xs">(राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</span>
                                                            <div className="stamp-box"><span>Revenue</span><div className="h-4"></div><span>Stamp</span></div>
                                                        </div>
                                                        <p className="text-sm mt-8">Authorised person/ employee signature <span className="us w-64"></span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print DPN</Button>
                                        </div>
                                    </div>

                                    {/* SINGLE PRODUCT FINANCE */}
                                    <div className={activeTab === "single" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={singleRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <style>{`
                                                .agreement-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                                                .agreement-table th, .agreement-table td { border: 1px solid black; padding: 8px; text-align: left; }
                                                .heading { text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
                                                .us { border-bottom: 1px dotted black; padding: 0 5px; min-width: 50px; display: inline-block; }
                                                .stamp-box { border: 1px solid black; width: 80px; height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 10px; text-transform: uppercase; }
                                                @media print {
                                                    .page-break { page-break-before: always; }
                                                }
                                            `}</style>
                                            <div className="page">
                                                <h2 className="heading">Product finance cum (Hypothecation) Agreement</h2>

                                                <p>I <span className="us">{agreementPreviewData.memberName}</span> am purchasing a (product) <span className="us">{rowData.product}</span> as on (Date) <span className="us">{agreementPreviewData.dateOfBooking}</span>.</p>

                                                <p>The Price of the product is Rs <span className="us">{rowData.loanAmount}</span> in which, I paid a sum of amount <span className="us">{rowData.downPayment || "____"}</span>. As a down payment @ {rowData.loanAmount && rowData.downPayment ? ((rowData.downPayment / rowData.loanAmount) * 100).toFixed(0) : "____"}% of the cost of the product. Rest of the amount <span className="us">{rowData.loanAmount - (rowData.downPayment || 0)}</span> will be pay as per the credit service provider&apos;s instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).</p>

                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <p>Cheque details: Cheque Number <span className="us">{rowData.chequeNumber || "____"}</span></p>
                                                    <p>Drawee Bank <span className="us">{rowData.bankName || "____"}</span></p>
                                                    <p className="col-span-2">A/c Number <span className="us">{rowData.accountNumber || "____"}</span></p>
                                                </div>
                                                <p>Name of the payee <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                <p>Name of the remitter <span className="us">{agreementPreviewData.memberName}</span></p>

                                                <p>The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
                                                <ol className="list-decimal pl-8 space-y-1 text-xs mt-2 italic">
                                                    <li>Purchased product will not be shared with any member or group or with any relatives/Friends till the completion of credit limit.</li>
                                                    <li>I am comfortable for the said mode of repayment which is agreed by me at the time of filling the CAF.</li>
                                                    <li>I will pay all the Installment on stipulated time with in the credit tenure.</li>
                                                    <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
                                                    <li>Product warranty and Guarantee will be provided as per the product&apos;s company norms.</li>
                                                    <li>Product will not be changed once sold.</li>
                                                    <li>Product manufacturing defects will be entertained as per the norms of manufacturer/ company.</li>
                                                    <li>If credit default by me, will be subject to Jurisdiction.</li>
                                                    <li>This hypothecation agreement does mean that the product ownership will be remain in position under service provider (&quot;Anavran Livelihood Services Pvt Ltd&quot;) until the total repayment will be pay from my side.</li>
                                                    <li>If Installment will be stopped by me then service provider will be the right to recover/ forfeited the products financed by him.</li>
                                                    <li>In the condition of any delay payment, I am liable for the late payment fee of Rs 450/- or 5% of the Principle outstanding (Which may higher) for every delay payment.</li>
                                                    <li>In case of death circumstances, if purchaser is not insured then other family members of the purchaser will be liable to pay all the debts (Pending EMIs).</li>
                                                    <li>Any dispute will be subject to the Jurisdiction under arbitration act.</li>
                                                </ol>

                                                <div className="page-break mt-8"></div>
                                                <div className="hindi-text mt-4">
                                                    <h2 className="heading text-lg font-bold underline text-center mb-4">उत्पाद वित्तपोषण सह (गिरवी) समझौता</h2>

                                                    <p>मैं <span className="us">{agreementPreviewData.memberName}</span> दिनांक <span className="us">{agreementPreviewData.dateOfBooking}</span> को (उत्पाद) <span className="us">{rowData.product}</span> खरीद रहा/रही हूँ।</p>

                                                    <p>उत्पाद की कीमत रु. <span className="us">{rowData.loanAmount}</span> है, जिसमें मैंने <span className="us">{rowData.downPayment || "____"}</span> राशि का अग्रिम भुगतान (उत्पाद की लागत का {rowData.loanAmount && rowData.downPayment ? ((rowData.downPayment / rowData.loanAmount) * 100).toFixed(0) : "____"}%) किया है। शेष राशि <span className="us">{rowData.loanAmount - (rowData.downPayment || 0)}</span> ऋण की किस्तों के अनुसार देय होगी, क्योंकि मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के निर्देशों (नियम और विनियम) का पालन करने के लिए बाध्य हूँ। इस संदर्भ में, मैं अपने बैंक खाते का चेक सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पक्ष में सुरक्षा के रूप में दे रहा/रही हूँ।</p>
                                                    <p>चेक विवरण: चेक संख्या <span className="us">{rowData.chequeNumber || "____"}</span> आहरित बैंक <span className="us">{rowData.bankName || "____"}</span> खाता संख्या <span className="us">{rowData.accountNumber || "____"}</span></p>

                                                    <p className="font-bold">सेवा प्रदाता के नियमों और विनियमों को परिभाषा, जो नीचे दी गई है, मैं स्वीकार करता/करती हूँ:</p>
                                                    <ol className="list-decimal pl-8 space-y-1 text-xs italic">
                                                        <li>खरीदे गए उत्पाद क्रेडिट सीमा पूरी होने तक किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं किए जाएंगे।</li>
                                                        <li>मैं भुगतान के तरीके से सहमत हूँ जिस पर मैंने क्रेडिट आवेदन भरते समय सहमति दी थी।</li>
                                                        <li>मैं क्रेडिट अवधि के भीतर सभी किस्तों को निर्धारित समय पर चुकाऊंगा/चुकाऊंगी।</li>
                                                        <li>मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
                                                        <li>उत्पाद की वारंटी और गारंटी कंपनी के मानकों के अनुसार प्रदान की जाएगी।</li>
                                                        <li>एक बार बेचने के बाद उत्पाद को बदला नहीं जाएगा।</li>
                                                        <li>उत्पाद निर्माण दोषों को निर्माता/कंपनी के मानकों के अनुसार ठीक किया जाएगा।</li>
                                                        <li>यदि मैं क्रेडिट डिफॉल्ट करता/करती हूँ, तो मामला संबंधित क्षेत्राधिकार के अधीन होगा।</li>
                                                        <li>इस बंधक समझौते का अर्थ यह है कि उत्पाद का स्वामित्व सेवा प्रदाता (&quot;अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड&quot;) के पास तब तक बना रहेगा जब तक मेरी ओर से कुल भुगतान नहीं हो जाता।</li>
                                                        <li>यदि मैं कोई किस्त भुगतान रोक देता/देती हूँ, तो सेवा प्रदाता को वित्तपोषित उत्पादों को वापस लेने/जब्त करने का अधिकार होगा।</li>
                                                        <li>भुगतान में किसी भी प्रकार की देरी होने पर, प्रत्येक विलंबित भुगतान के लिए मुझे ₹450/- रुपये या बकाया मूलधन का 5% (जो भी अधिक हो) का भुगतान करना होगा।</li>
                                                        <li>मृत्यु की स्थिति में, यदि खरीदार का बीमा नहीं है तो खरीदार के अन्य परिवार के सदस्य सभी ऋणों (बकाया ईएमआई) का भुगतान करने के लिए उत्तरदायी होंगे।</li>
                                                        <li>किसी भी विवाद का निपटान मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
                                                    </ol>
                                                    <p>I <span className="us">{agreementPreviewData.memberName}</span> Obliged with adherence of all above mentioned terms with my own consent.</p>
                                                    <p className="font-bold">मैं <span className="us">{agreementPreviewData.memberName}</span> अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>

                                                    <div className="flex justify-between items-end mt-4">
                                                        <div className="stamp-box"><span>Revenue</span><span>Stamp</span></div>
                                                        <div className="text-right">
                                                            <p>................................................</p>
                                                            <p className="text-xs">Signature/ Thumb impression</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print Single Product Agreement</Button>
                                        </div>
                                    </div>

                                    {/* MULTIPLE PRODUCT FINANCE */}
                                    <div className={activeTab === "multiple" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={multipleRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <style>{`
                                                .agreement-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                                                .agreement-table th, .agreement-table td { border: 1px solid black; padding: 6px; text-align: left; }
                                                .heading { text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
                                                .us { border-bottom: 1px dotted black; padding: 0 5px; min-width: 50px; display: inline-block; }
                                                .stamp-box { border: 1px solid black; width: 80px; height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 10px; text-transform: uppercase; }
                                                @media print {
                                                    .page-break { page-break-before: always; }
                                                }
                                            `}</style>
                                            <div className="page">
                                                <h2 className="heading">Product finance cum (Hypothecation) Agreement (Multiple)</h2>
                                                <p>I <span className="us">{agreementPreviewData.memberName}</span> am purchasing below mentioned multiple products as on (Date) <span className="us">{agreementPreviewData.dateOfBooking}</span>.</p>
                                                <table className="agreement-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Product Name</th>
                                                            <th>Product type (Description)</th>
                                                            <th>Product Value (Price)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="h-6"></td>
                                                            <td className="h-6"></td>
                                                            <td className="h-6"></td>
                                                        </tr>
                                                        {[...Array(4)].map((_, i) => (
                                                            <tr key={i}>
                                                                <td className="h-6"></td>
                                                                <td className="h-6"></td>
                                                                <td className="h-6"></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <p>The total Price of the product is Rs <span className="us">{rowData.loanAmount}</span> in which, I paid a sum of amount <span className="us">{rowData.downPayment || "____"}</span>. As a down payment ({rowData.loanAmount && rowData.downPayment ? ((rowData.downPayment / rowData.loanAmount) * 100).toFixed(0) : "____"}% of the cost of the product. Rest of the amount <span className="us">{rowData.loanAmount - (rowData.downPayment || 0)}</span> will be pay as per the credit service provider&apos;s instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).</p>
                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <p>Cheque details: Cheque Number <span className="us">{rowData.chequeNumber || "____"}</span></p>
                                                    <p>Drawee Bank <span className="us">{rowData.bankName || "____"}</span></p>
                                                    <p className="col-span-2">A/c Number <span className="us">{rowData.accountNumber || "____"}</span></p>
                                                </div>
                                                <p>Name of the payee <span className="us">Anavran Livelihood services Pvt Ltd</span></p>
                                                <p>Name of the remitter <span className="us">{agreementPreviewData.memberName}</span></p>

                                                <p>The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
                                                <ol className="list-decimal pl-8 space-y-1 text-xs mt-2 italic">
                                                    <li>Purchased products will not be shared with any member or group or with any relatives/Friends till the completion of credit limit.</li>
                                                    <li>I am comfortable for the said mode of repayment which is agreed by me at the time of filling the CAF.</li>
                                                    <li>I will pay all the Installment on stipulated time with in the credit tenure.</li>
                                                    <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
                                                    <li>Product warranty and Guarantee will be provided as per the product&apos;s company norms.</li>
                                                    <li>Product will not be changed once sold.</li>
                                                    <li>Product manufacturing defects will be entertained as per the norms of manufacturer/ company.</li>
                                                    <li>If credit default by me, will be subject to Jurisdiction.</li>
                                                    <li>This hypothecation agreement does mean that the product ownership will be remain in position under service provider (&quot;Anavran Livelihood Services Pvt Ltd&quot;) until the total repayment will be pay from my side.</li>
                                                    <li>If Installment will be stopped by me then service provider will be the right to recover/ forfeited the products financed by him.</li>
                                                    <li>In the condition of any delay payment, I am liable for the late payment fee of Rs 450/- or 5% of the Principle outstanding (Which may higher) for every delay payment.</li>
                                                    <li>In case of death circumstances, if purchaser is not insured then other family members of the purchaser will be liable to pay all the debts (Pending EMIs).</li>
                                                    <li>Any dispute will be subject to the Jurisdiction under arbitration act.</li>
                                                </ol>

                                                <div className="page-break mt-8"></div>
                                                <div className="hindi-text mt-4">
                                                    <h2 className="heading text-lg font-bold underline text-center mb-4">उत्पाद वित्तपोषण सह (गिरवी) समझौता (Multiple)</h2>
                                                    <p>मैं <span className="us">{agreementPreviewData.memberName}</span> दिनांक <span className="us">{agreementPreviewData.dateOfBooking}</span> को कई उत्पाद खरीद रहा/रही हूँ।</p>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>उत्पाद का नाम</th>
                                                                <th>उत्पाद का प्रकार (विवरण)</th>
                                                                <th>उत्पाद का मूल्य (कीमत)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="h-6">{rowData.product}</td>
                                                                <td className="h-6">{rowData.productType}</td>
                                                                <td className="h-6">Rs {rowData.loanAmount}</td>
                                                            </tr>
                                                            {[...Array(4)].map((_, i) => (
                                                                <tr key={i}>
                                                                    <td className="h-6"></td>
                                                                    <td className="h-6"></td>
                                                                    <td className="h-6"></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    <p>उत्पाद की कुल मूल्य रु. <span className="us">{rowData.loanAmount}</span> है, जिसमें मैंने <span className="us">{rowData.downPayment || "____"}</span> राशि का अग्रिम भुगतान (उत्पाद की लागत का {rowData.loanAmount && rowData.downPayment ? ((rowData.downPayment / rowData.loanAmount) * 100).toFixed(0) : "____"}%) किया है। शेष राशि <span className="us">{rowData.loanAmount - (rowData.downPayment || 0)}</span> ऋण की किस्तों के अनुसार देय होगी, क्योंकि मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के निर्देशों (नियम और विनियम) का पालन करने के लिए बाध्य हूँ। इस संदर्भ में, मैं अपने बैंक खाते का चेक सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पक्ष में सुरक्षा के रूप में दे रहा/रही हूँ।</p>
                                                    <p>चेक विवरण: चेक संख्या <span className="us">{rowData.chequeNumber || "____"}</span> आहरित बैंक <span className="us">{rowData.bankName || "____"}</span> खाता संख्या <span className="us">{rowData.accountNumber || "____"}</span></p>

                                                    <p className="font-bold">सेवा प्रदाता के नियमों और विनियमों को परिभाषा, जो नीचे दी गई है, मैं स्वीकार करता/करती हूँ:</p>
                                                    <ol className="list-decimal pl-8 space-y-1 text-xs italic">
                                                        <li>खरीदे गए उत्पाद क्रेडिट सीमा पूरी होने तक किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं किए जाएंगे।</li>
                                                        <li>मैं भुगतान के तरीके से सहमत हूँ जिस पर मैंने क्रेडिट आवेदन भरते समय सहमति दी थी।</li>
                                                        <li>मैं क्रेडिट अवधि के भीतर सभी किस्तों को निर्धारित समय पर चुकाऊंगा/चुकाऊंगी।</li>
                                                        <li>मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
                                                        <li>उत्पाद की वारंटी और गारंटी कंपनी के मानकों के अनुसार प्रदान की जाएगी।</li>
                                                        <li>एक बार बेचने के बाद उत्पाद को बदला नहीं जाएगा।</li>
                                                        <li>उत्पाद निर्माण दोषों को निर्माता/कंपनी के मानकों के अनुसार ठीक किया जाएगा।</li>
                                                        <li>यदि मैं क्रेडिट डिफॉल्ट करता/करती हूँ, तो मामला संबंधित क्षेत्राधिकार के अधीन होगा।</li>
                                                        <li>इस बंधक समझौते का अर्थ यह है कि उत्पाद का स्वामित्व सेवा प्रदाता (&quot;अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड&quot;) के पास तब तक बना रहेगा जब तक मेरी ओर से कुल भुगतान नहीं हो जाता।</li>
                                                        <li>यदि मैं कोई किस्त भुगतान रोक देता/देती हूँ, तो सेवा प्रदाता को वित्तपोषित उत्पादों को वापस लेने/जब्त करने का अधिकार होगा।</li>
                                                        <li>भुगतान में किसी भी प्रकार की देरी होने पर, प्रत्येक विलंबित भुगतान के लिए मुझे ₹450/- रुपये या बकाया मूलधन का 5% (जो भी अधिक हो) का भुगतान करना होगा।</li>
                                                        <li>मृत्यु की स्थिति में, यदि खरीदार का बीमा नहीं है तो खरीदार के अन्य परिवार के सदस्य सभी ऋणों (बकाया ईएमआई) का भुगतान करने के लिए उत्तरदायी होंगे।</li>
                                                        <li>किसी भी विवाद का निपटान मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
                                                    </ol>
                                                    <p>I <span className="us">{agreementPreviewData.memberName}</span> Obliged with adherence of all above mentioned terms with my own consent.</p>
                                                    <p className="font-bold">मैं <span className="us">{agreementPreviewData.memberName}</span> अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>

                                                    <div className="flex justify-between items-end mt-6">
                                                        <div className="stamp-box"><span>Revenue</span><span>Stamp</span></div>
                                                        <div className="text-right">
                                                            <p>................................................</p>
                                                            <p className="text-xs">Signature/ Thumb impression</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print Multiple Product Agreement</Button>
                                        </div>
                                    </div>

                                    {/* HYPOTHECATED PURCHASE AGREEMENT */}
                                    <div className={activeTab === "hypothecated" ? "block" : "absolute -left-[9999px] top-0 w-full opacity-0 pointer-events-none overflow-hidden"}>
                                        <div ref={hypothecatedRef} className="bg-white p-10 text-black leading-relaxed text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                                            <style>{`
                                                .hypo-heading { text-align: center; text-decoration: underline; font-weight: bold; margin-bottom: 14px; text-transform: uppercase; font-size: 20px; }
                                                .hypo-subhead { font-weight: 700; margin-top: 14px; margin-bottom: 6px; }
                                                .hypo-line { border-bottom: 1px dotted black; padding: 0 6px; min-width: 80px; display: inline-block; }
                                                .hypo-stamp { border: 1px solid black; width: 80px; height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 10px; text-transform: uppercase; }
                                                .hypo-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                                                .hypo-table td, .hypo-table th { border: 1px solid black; padding: 6px; }
                                                .page-break { page-break-before: always; }
                                            `}</style>

                                            <h2 className="hypo-heading">Hypothicated Purchase Agreement</h2>
                                            <p className="font-bold">This Agreement is made on <span className="hypo-line">{agreementPreviewData.dateOfBooking}</span> date between:</p>
                                            <p className="mt-3 font-bold">Anavran Livelihood Services Pvt Ltd</p>
                                            <p>(Hereinafter referred to as "Company")</p>
                                            <p className="my-2 font-bold">AND</p>
                                            <p><span className="font-bold">Customer Name:</span> <span className="hypo-line">{agreementPreviewData.memberName}</span></p>
                                            <p>(Hereinafter referred to as "Customer")</p>

                                            <div className="hypo-subhead">1. Product Details</div>
                                            <ul className="list-disc pl-7 space-y-1">
                                                <li>Product: {rowData.product || "Electric Scooty"}</li>
                                                <li>Model: <span className="hypo-line"></span></li>
                                                <li>Chassis No: <span className="hypo-line"></span></li>
                                                <li>Engine No: <span className="hypo-line"></span></li>
                                            </ul>

                                            <div className="hypo-subhead">2. Financial Terms</div>
                                            <table className="hypo-table">
                                                <thead>
                                                    <tr><th>Particular</th><th>Amount</th></tr>
                                                </thead>
                                                <tbody>
                                                    <tr><td>Product Price</td><td>Rs {rowData.loanAmount || "____"}</td></tr>
                                                    <tr><td>Down Payment</td><td>Rs {rowData.downPayment || "____"}</td></tr>
                                                    <tr><td>Financed Amount</td><td>Rs {(Number(rowData.loanAmount || 0) - Number(rowData.downPayment || 0)) || "____"}</td></tr>
                                                    <tr><td>Tenure</td><td><span className="hypo-line"></span> Months</td></tr>
                                                    <tr><td>EMI</td><td>Rs <span className="hypo-line"></span></td></tr>
                                                </tbody>
                                            </table>

                                            <div className="hypo-subhead">3. Ownership Clause</div>
                                            <ul className="list-disc pl-7 space-y-1">
                                                <li className="font-semibold">This hypothecation agreement does mean that the product ownership will be remain in position under service provider (&quot;Anavran Livelihood Services Pvt Ltd&quot;) until the total repayment will be pay by the customer.</li>
                                                <li>The ownership will be transferred after completion of full payment (EMIs).</li>
                                                <li>Ownership transfer charges will be bear by the customer once completed all payments (EMIs).</li>
                                            </ul>

                                            <div className="hypo-subhead">4. Payment Terms</div>
                                            <ul className="list-disc pl-7 space-y-1">
                                                <li>I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
                                                <li>I will pay all the Installment on stipulated time with in the credit tenure.</li>
                                                <li>In the condition of any delay payment, I am liable for the late payment fee of Rs 450/- or 5% of the Principle outstanding (Which may higher) for every delay payment.</li>
                                                <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
                                            </ul>

                                            <div className="hypo-subhead">5. Hypothecation Clause</div>
                                            <ul className="list-disc pl-7 space-y-1">
                                                <li>Product will be hypothecated in the favor of company &quot;Anavran Livelihood Services Pvt Ltd&quot;.</li>
                                                <li>In RC Company name will be mentioned.</li>
                                            </ul>

                                            <div className="hypo-subhead">6. Default Clause</div>
                                            <ul className="list-disc pl-7"><li>If Installment will be stopped by me then service provider will be the right to recover/ forfeited the product financed by him.</li></ul>

                                            <div className="hypo-subhead">7. Repossession Clause</div>
                                            <ul className="list-disc pl-7 space-y-1">
                                                <li>In case of default the product (ES) will be repossession by the company without permission of the court.</li>
                                                <li>In this context Customer has no rights for any objection for the above concern.</li>
                                            </ul>

                                            <div className="hypo-subhead">8. Insurance</div>
                                            <ul className="list-disc pl-7 space-y-1"><li>Insurance is mandatory.</li><li>Company as hypothecator.</li></ul>

                                            <div className="hypo-subhead">9. Jurisdiction</div>
                                            <ul className="list-disc pl-7"><li>Any dispute will be subject to the Jurisdiction under arbitration act.</li></ul>

                                            <div className="hypo-subhead">10. Product Warranty</div>
                                            <ul className="list-disc pl-7"><li>Product warranty and Guarantee will be provided as per the product&apos;s company norms.</li></ul>

                                            <div className="page-break"></div>

                                            <div className="hindi-text mt-3" style={{ fontFamily: "'Noto Sans Hindi', sans-serif" }}>
                                                <h2 className="text-center font-bold underline text-xl mb-3">गिरवी खरीद समझौता</h2>
                                                <p>यह समझौता दिनांक <span className="hypo-line">{agreementPreviewData.dateOfBooking}</span> को निम्नलिखित के बीच किया गया है:</p>
                                                <p className="font-bold mt-2">अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड</p>
                                                <p>(इसके बाद &quot;कंपनी&quot; कहा जाएगा)</p>
                                                <p className="my-2 font-bold">और</p>
                                                <p><span className="font-bold">ग्राहक का नाम:</span> <span className="hypo-line">{agreementPreviewData.memberName}</span></p>
                                                <p>(इसके बाद &quot;ग्राहक&quot; कहा जाएगा)</p>

                                                <p className="font-bold mt-4">1. उत्पाद विवरण</p>
                                                <ul className="list-disc pl-7 space-y-1">
                                                    <li>उत्पाद: {rowData.product || "इलेक्ट्रिक स्कूटी"}</li>
                                                    <li>मॉडल: <span className="hypo-line"></span></li>
                                                    <li>चेसिस संख्या: <span className="hypo-line"></span></li>
                                                    <li>इंजन संख्या: <span className="hypo-line"></span></li>
                                                </ul>

                                                <p className="font-bold mt-4">2. वित्तीय शर्तें</p>
                                                <ul className="list-disc pl-7 space-y-1">
                                                    <li>उत्पाद मूल्य: ₹ {rowData.loanAmount || "____"}</li>
                                                    <li>डाउन पेमेंट: ₹ {rowData.downPayment || "____"}</li>
                                                    <li>वित्तपोषीत राशि: ₹ {(Number(rowData.loanAmount || 0) - Number(rowData.downPayment || 0)) || "____"}</li>
                                                    <li>अवधि: <span className="hypo-line"></span> महीने</li>
                                                    <li>ईएमआई: ₹ <span className="hypo-line"></span></li>
                                                </ul>

                                                <p className="font-bold mt-4">3. स्वामित्व खंड</p>
                                                <ul className="list-disc pl-7 space-y-1">
                                                    <li>इस बंधक समझौते का अर्थ यह है कि उत्पाद का स्वामित्व सेवा प्रदाता (&quot;अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड&quot;) के पास तब तक रहेगा जब तक ग्राहक द्वारा कुल भुगतान नहीं कर दिया जाता।</li>
                                                    <li>पूर्ण भुगतान (ईएमआई) पूरा होने के बाद स्वामित्व स्थानांतरित कर दिया जाएगा।</li>
                                                </ul>

                                                <p className="font-bold mt-4">4. भुगतान शर्तें</p>
                                                <ul className="list-disc pl-7 space-y-1">
                                                    <li>मैं भुगतान के उस तरीके से सहमत हूँ जिस पर मैंने सीएएफ भरते समय हस्ताक्षर किए थे।</li>
                                                    <li>मैं क्रेडिट अवधि के भीतर निर्धारित समय पर सभी किस्तें चुकाऊँगा।</li>
                                                    <li>भुगतान में किसी भी प्रकार की देरी होने पर, मुझे प्रत्येक विलंबित भुगतान पर ₹450/- या बकाया मूलधन का 5% (जो भी अधिक हो) विलंब शुल्क देना होगा।</li>
                                                    <li>मुझे सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करना होगा।</li>
                                                </ul>

                                                <div className="page-break"></div>

                                                <p className="mt-3">I <span className="hypo-line">{agreementPreviewData.memberName}</span> Obliged with adherence of all mentioned terms with my own consent.</p>
                                                <p className="mt-2">मैं <span className="hypo-line">{agreementPreviewData.memberName}</span> अपनी सहमति से सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>

                                                <div className="flex items-center gap-6 mt-5">
                                                    <div className="hypo-stamp"><span>Revenue</span><span>Stamp</span></div>
                                                    <p className="text-xs">Affix Signature/ Thumb impression crossed upon the revenue stamp (राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</p>
                                                </div>

                                                <h3 className="text-center font-bold underline mt-6 mb-3">Vernacular declaration along with thumb impression consent</h3>
                                                <p>Customer ID <span className="hypo-line">{agreementPreviewData.custId}</span> Credit ID <span className="hypo-line">{agreementPreviewData.loanId}</span></p>
                                                <p className="mt-2">I <span className="hypo-line">{agreementPreviewData.memberName}</span> agree that all the financial application documents provided by the service provider are explained and understood in my regional language by the authorized person/employee.</p>
                                                <p className="mt-2">मै <span className="hypo-line">{agreementPreviewData.memberName}</span> सहमत हूँ कि सभी वित्तीय आवेदन दस्तावेज़ मुझे मेरी क्षेत्रीय भाषा में समझाए गए हैं और मैं अपनी सहमति दे रहा/रही हूँ।</p>

                                                <div className="grid grid-cols-2 gap-6 mt-6">
                                                    <p>Date (दिनांक) <span className="hypo-line">{agreementPreviewData.dateOfBooking}</span></p>
                                                    <p>Place (स्थान) <span className="hypo-line"></span></p>
                                                    <p>Witness (गवाह) <span className="hypo-line"></span></p>
                                                    <p>Authorised person/ employee signature <span className="hypo-line"></span></p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button onClick={() => handlePrintDocuments("active")} size="sm" className="bg-blue-600 hover:bg-blue-700">Print Hypothecated Agreement</Button>
                                        </div>
                                    </div>

                                </div>

                                <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 shrink-0">
                                    <Button onClick={() => handlePrintDocuments("active")} className="bg-blue-600 hover:bg-blue-700">Print Current</Button>
                                    <Button onClick={() => handlePrintDocuments("all")} className="bg-emerald-600 hover:bg-emerald-700">Print All</Button>
                                    <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={showConfirm}
                title="Confirm Final Submission"
                message={`Are you sure you want to submit disbursement for Loan ID: ${rowData.loanId}?`}
                confirmText="Yes, Submit"
                cancelText="Cancel"
                onConfirm={() => {
                    if (loading) return;
                    setShowConfirm(false);
                    handleSave();
                }}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
}

export default function FinalDisbursementRoleBMPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <FinalDisbursementRoleBMPageContent />
        </Suspense>
    );
}
