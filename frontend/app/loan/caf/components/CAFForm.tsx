"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Loader2 } from "lucide-react";

type FrequencyOption = "monthly" | "weekly" | "biweekly";
type CreditMode = "product" | "cash" | "";
type TenureOption =
    | "12 Month"
    | "18 Month"
    | "1 Week"
    | "1 Bi-week"
    | `${number} Week`
    | `${number} Bi-week`;
type ApplicantType = "qualifying" | "nonQualifying";
type BusinessMode = "shopBased" | "homeBased";
type BusinessOwnership = "owned" | "rented";
type EntitledOption = "proprietor" | "partnership";
type IncomeSourceKey =
    | "business"
    | "agriculture"
    | "wages"
    | "rental"
    | "pension"
    | "bankDeposits";

type ExpenseKey =
    | "houseRent"
    | "food"
    | "electricity"
    | "education"
    | "telephone"
    | "festival"
    | "health";

type PartnerDetail = {
    name: string;
    phone: string;
    address: string;
};

type ObligationRow = {
    companyName: string;
    creditType: string;
    creditAmount: string;
    emiAmount: string;
    repaymentMode: string;
    installmentAmount: string;
};

export type CAFFormData = {
    creditMode: CreditMode;
    creditAppliedFor: string;
    productName: string;
    productCode: string;
    frequency: FrequencyOption;
    tenureOption: TenureOption;
    applicantType: ApplicantType;
    applicantIncome: string;
    otherSourcesIncome: string;
    spouseIncome: string;
    nomineeIncome: string;
    incomeSources: Record<IncomeSourceKey, boolean>;
    incomeProofName: string;
    familyDependents: string;
    expenses: Record<ExpenseKey, { monthly: string; yearly: string }>;
    travelExpense: string;
    otherObligations: string;
    obligationRows: ObligationRow[];
    productAttributes?: Record<string, string>;
    productDetails?: any;
    productQuantity?: string;
    selectedVariantStock?: number;
    businessType: BusinessMode;
    businessNature: string;
    entitled: EntitledOption;
    businessAddress: string;
    businessOwnership: BusinessOwnership;
    businessVintage: string;
    businessPhotoName: string;
    businessProofName: string;
    partners?: PartnerDetail[];
    reference1Name: string;
    reference1Contact: string;
    reference1Address: string;
    reference2Name: string;
    reference2Contact: string;
    reference2Address: string;
    bankFirstName: string;
    bankMiddleName: string;
    bankLastName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    passbookImageName: string;
    repaymentDay?: string;
    incomeProofUrl?: string | null;
    businessPhotoUrl?: string | null;
    businessProofUrl?: string | null;
    down_payment: string;
    discount: string;
};

type ProductAttributeDefinition = {
    attribute_id: string | number;
    attribute_name: string;
    values?: string[];
};

type StockDetail = {
    attribute_summary?: string;
    quantity?: number;
    selling_price?: number;
    [key: string]: any;
};

type NormalizedVariantCombo = {
    attributes: Record<string, string>;
    quantity: number;
    selling_price: number;
    raw: StockDetail;
};

const enableVariantDebugLogs = false;

const debugVariant = (...args: any[]) => {
    if (enableVariantDebugLogs) {
        console.debug("[VariantDebug]", ...args);
    }
};

const normalizeAttributeName = (name: string): string => {
    if (name === undefined || name === null) return "";
    return name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/['"`“”‘’]/g, "")
        .replace(/[\/|,&;+]/g, " ")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const normalizeAttributeValue = (value: string): string => {
    if (value === undefined || value === null) return "";
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/['"`“”‘’]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const getAttributeAliasSet = (name: string): string[] => {
    const normalized = normalizeAttributeName(name);
    const parts = name
        .toString()
        .split(/[/|,&;+]+/g)
        .map((part) => normalizeAttributeName(part))
        .filter(Boolean);

    return Array.from(new Set([normalized, ...parts]));
};

const areAttributeKeysEquivalent = (left: string, right: string): boolean => {
    const leftAliases = getAttributeAliasSet(left);
    const rightAliases = getAttributeAliasSet(right);

    return leftAliases.some((alias) => rightAliases.includes(alias));
};

const findComboKeyByAttributeName = (
    comboAttrs: Record<string, string>,
    attrName: string
): string | undefined => {
    return Object.keys(comboAttrs).find((comboKey) => areAttributeKeysEquivalent(comboKey, attrName));
};

const comboMatchesAttributes = (
    combo: NormalizedVariantCombo,
    attrs: Record<string, string>
): boolean => {
    const normalizedAttrs = Object.entries(attrs)
        .filter(([, value]) => value)
        .map(([key, value]) => ({ key: normalizeAttributeName(key), value: normalizeAttributeValue(value) }));

    return normalizedAttrs.every(({ key, value }) => {
        const comboKey = findComboKeyByAttributeName(combo.attributes, key);
        return comboKey ? combo.attributes[comboKey] === value : false;
    });
};

const getValidCombinations = (stockDetails: StockDetail[]): NormalizedVariantCombo[] => {
    const combos: NormalizedVariantCombo[] = stockDetails.map((sd) => {
        const attributes: Record<string, string> = {};

        if (sd.attribute_summary) {
            sd.attribute_summary.split("|").forEach((pair: string) => {
                const [rawKey, ...rawValueParts] = pair.split(":");
                const rawValue = rawValueParts.join(":").trim();
                const key = normalizeAttributeName(rawKey || "");
                const value = normalizeAttributeValue(rawValue);

                if (key) {
                    attributes[key] = value;
                }
            });
        } else {
            Object.entries(sd).forEach(([rawKey, rawValue]) => {
                if (["quantity", "selling_price", "stock", "variant_selling_price", "attribute_summary"].includes(rawKey)) {
                    return;
                }

                const key = normalizeAttributeName(rawKey);
                const value = normalizeAttributeValue(String(rawValue));

                if (key) {
                    attributes[key] = value;
                }
            });
        }

        return {
            attributes,
            quantity: Number(sd.quantity ?? 0),
            selling_price: Number(sd.selling_price ?? 0),
            raw: sd,
        };
    });

    debugVariant("generated combinations", combos);
    return combos;
};

const findMatchingCombo = (
    validCombos: NormalizedVariantCombo[],
    attrs: Record<string, string>
): NormalizedVariantCombo | undefined => {
    const filteredAttrs = Object.entries(attrs)
        .filter(([, value]) => value)
        .reduce<Record<string, string>>((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});

    debugVariant("finding matching combo", filteredAttrs, validCombos);
    return validCombos.find((combo) => comboMatchesAttributes(combo, filteredAttrs));
};

const isOptionAvailable = (
    attrName: string,
    value: string,
    selectedAttrs: Record<string, string>,
    validCombos: NormalizedVariantCombo[]
) => {
    const candidate = {
        key: normalizeAttributeName(attrName),
        value: normalizeAttributeValue(value),
    };

    const normalizedSelectedAttrs = Object.entries(selectedAttrs)
        .filter(([, val]) => val)
        .map(([key, val]) => ({ key: normalizeAttributeName(key), value: normalizeAttributeValue(val) }));

    const combinedAttrs = normalizedSelectedAttrs
        .filter(({ key }) => key !== candidate.key)
        .concat(candidate);

    debugVariant("isOptionAvailable", attrName, value, selectedAttrs, combinedAttrs, validCombos);

    return validCombos.some((combo) =>
        combo.quantity > 0 &&
        combinedAttrs.every(({ key, value: normalizedValue }) => {
            const comboKey = findComboKeyByAttributeName(combo.attributes, key);
            return comboKey ? combo.attributes[comboKey] === normalizedValue : false;
        })
    );
};

const getSelectedVariantStock = (
    stockDetails: StockDetail[],
    selectedAttrs: Record<string, string>
): number => {
    const validCombos = getValidCombinations(stockDetails);
    const match = findMatchingCombo(validCombos, selectedAttrs);
    debugVariant("selected variant stock lookup", selectedAttrs, match);
    return match?.quantity ?? 0;
};

const getSelectedVariantPrice = (
    stockDetails: StockDetail[],
    selectedAttrs: Record<string, string>
): number => {
    const validCombos = getValidCombinations(stockDetails);
    const match = findMatchingCombo(validCombos, selectedAttrs);
    return match?.selling_price ?? 0;
};

const normalizeAttributeSelection = (attrs: Record<string, string>) =>
    Object.entries(attrs).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value) {
            acc[key] = value;
        }
        return acc;
    }, {});

const areAllVariantAttributesSelected = (
    attributeDefinitions: any[] = [],
    productAttributes: Record<string, string> = {}
): boolean => {
    if (!Array.isArray(attributeDefinitions) || attributeDefinitions.length === 0) {
        return true;
    }

    return attributeDefinitions.every(
        (attr: any) => Boolean(productAttributes?.[attr.attribute_name])
    );
};

const hasVariantDefinitions = (product: any): boolean =>
    Array.isArray(product?.attribute_definitions) && product.attribute_definitions.length > 0;

const hasProductDetailsVariantDefinitions = (product: any): boolean =>
    Array.isArray(product?.product_details?.attribute_definitions) &&
    product.product_details.attribute_definitions.length > 0;

const isSelectedVariantAvailable = (product: any): boolean => {
    const attributeDefinitions = hasProductDetailsVariantDefinitions(product)
        ? product.product_details.attribute_definitions
        : [];
    if (!attributeDefinitions.length) {
        return true;
    }

    const selectedAttrs = product.product_attributes || {};
    if (!areAllVariantAttributesSelected(attributeDefinitions, selectedAttrs)) {
        return false;
    }

    return getSelectedVariantStock(product.product_details?.stock_details || [], selectedAttrs) > 0;
};

const businessNameOptions = [
    "Kirana/ Grossery Shop",
    "Handloom shop",
    "Mill (Flour/ Oil/ Grain)",
    "Stationary shop",
    "Agri seeds & furtilizer shop",
    "General Store",
    "Animal feed items shop",
    "Immitation and Jewellry shop",
    "Aquarium shop",
    "Utensil shop",
    "RO water Plant/ supply",
    "Gas refilling shop",
    "Electronic shop",
    "Electrical shop",
    "Bettle shop",
    "Home appliances shop",
    "Furniture shop",
    "Battery shop",
    "Mobile & acceseries shop",
    "Mobile repairing shop",
    "Electronics repairing shop",
    "Readymade garments shop",
    "Clothes/ Hosiery shop",
    "Fruit shop",
    "Vegetable shop",
    "Tea & snacks shop",
    "Hotel & resturant",
    "Saloon & spa",
    "Gym outlet",
    "Fast food shop",
    "Bike / Car repair (Garage)",
    "E –Rickshaw repair shop",
    "E- Bike/ Rickshaw sale/ service",
    "Tent house/ Decoration",
    "DJ with Decoration",
    "Meat shop",
    "Farm house (Chicken/ Goat/ Fish etc....)",
    "Fancy store",
    "Cyber cafe",
    "Photo studio/ Xerox / Videography",
    "Event Management",
    "Puja items shop",
    "Books (Devotinal/ General) shop",
    "Travel agency",
    "Welding shop",
    "Steel gate grill/ almirah manufacturing",
    "Computer sale/ service",
    "Balcksmith shop",
    "Pots maker/ Creamist",
    "Tiles & Marble shop",
    "Hardware & sanitation shop",
    "Centring / Home construction",
    "Toys & Gift shop",
    "Plastic chair & table (Plastic Furniture)",
    "Crockery items shop",
    "Sudha Dairy milk centre",
    "Beauty parlour",
    "Sports items shop",
    "Shoe shop",
    "Watch shop",
    "Bag & luggage shop",
    "Tailor shop",
    "Eye glasses/ lances shop",
    "Other",
];

const incomeSourceLabels: Record<IncomeSourceKey, string> = {
    business: "Business",
    agriculture: "Agriculture",
    wages: "Wages",
    rental: "Rental",
    pension: "Pension",
    bankDeposits: "Bank Deposits",
};

const expenseLabels: Record<ExpenseKey, string> = {
    houseRent: "House Rent",
    food: "Food",
    electricity: "Electricity",
    education: "Education",
    telephone: "Telephone",
    festival: "Festival",
    health: "Health",
};

const defaultObligationRow = (): ObligationRow => ({
    companyName: "",
    creditType: "",
    creditAmount: "",
    emiAmount: "",
    repaymentMode: "monthly",
    installmentAmount: "",
});

const getObligationMultiplier = (repaymentMode: string) => {
    switch (repaymentMode) {
        case "weekly":
            return 4;
        case "biweekly":
            return 2;
        default:
            return 1;
    }
};

const calculateInstallmentAmount = (emiAmount: string, repaymentMode: string) =>
    String(Math.max(0, toNumber(emiAmount) * getObligationMultiplier(repaymentMode)));

export const createDefaultCAFData = (): CAFFormData => ({
    creditMode: "",
    creditAppliedFor: "",
    down_payment: "",
    discount: "",
    productName: "",
    productCode: "",
    frequency: "monthly",
    tenureOption: "12 Month",
    applicantType: "qualifying",
    applicantIncome: "",
    otherSourcesIncome: "",
    spouseIncome: "",
    nomineeIncome: "",
    incomeSources: {
        business: false,
        agriculture: false,
        wages: false,
        rental: false,
        pension: false,
        bankDeposits: false,
    },
    incomeProofName: "",
    familyDependents: "",
    expenses: {
        houseRent: { monthly: "", yearly: "" },
        food: { monthly: "", yearly: "" },
        electricity: { monthly: "", yearly: "" },
        education: { monthly: "", yearly: "" },
        telephone: { monthly: "", yearly: "" },
        festival: { monthly: "", yearly: "" },
        health: { monthly: "", yearly: "" },
    },
    travelExpense: "",
    otherObligations: "",
    obligationRows: [defaultObligationRow(), defaultObligationRow()],
    productAttributes: {},
    productDetails: null,
    productQuantity: "",
    selectedVariantStock: 0,
    businessType: "shopBased",
    businessNature: "",
    entitled: "proprietor",
    businessAddress: "",
    businessOwnership: "owned",
    businessVintage: "",
    businessPhotoName: "",
    businessProofName: "",
    partners: [],
    reference1Name: "",
    reference1Contact: "",
    reference1Address: "",
    reference2Name: "",
    reference2Contact: "",
    reference2Address: "",
    bankFirstName: "",
    bankMiddleName: "",
    bankLastName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    passbookImageName: "",
    repaymentDay: "",
});

export const createSampleCAFData = (): CAFFormData => ({
    ...createDefaultCAFData(),
    creditMode: "product",
    creditAppliedFor: "45000",
    productName: "Working Capital Advance",
    productCode: "CAF-101",
    frequency: "monthly",
    tenureOption: "18 Month",
    applicantType: "qualifying",
    applicantIncome: "180000",
    otherSourcesIncome: "24000",
    spouseIncome: "120000",
    nomineeIncome: "60000",
    incomeSources: {
        business: true,
        agriculture: true,
        wages: false,
        rental: false,
        pension: false,
        bankDeposits: true,
    },
    incomeProofName: "income-proof.pdf",
    familyDependents: "4",
    expenses: {
        houseRent: { monthly: "5000", yearly: "60000" },
        food: { monthly: "9000", yearly: "108000" },
        electricity: { monthly: "1800", yearly: "21600" },
        education: { monthly: "2500", yearly: "30000" },
        telephone: { monthly: "600", yearly: "7200" },
        festival: { monthly: "1200", yearly: "14400" },
        health: { monthly: "1500", yearly: "18000" },
    },
    travelExpense: "2000",
    otherObligations: "1500",
    obligationRows: [
        {
            companyName: "ABC Finance",
            creditType: "Business Loan",
            creditAmount: "85000",
            emiAmount: "4200",
            repaymentMode: "Monthly",
            installmentAmount: "4200",
        },
        {
            companyName: "Village Credit",
            creditType: "Equipment Loan",
            creditAmount: "45000",
            emiAmount: "900",
            repaymentMode: "Biweekly",
            installmentAmount: "1800",
        },
    ],
    businessType: "shopBased",
    businessNature: "Retail grocery and household supplies",
    entitled: "proprietor",
    businessAddress: "Ward No. 8, Main Road, Near Community Hall",
    businessOwnership: "rented",
    businessVintage: "6",
    businessPhotoName: "shop-front.jpg",
    businessProofName: "shop-license.pdf",
    partners: [
        {
            name: "Rahul Kumar",
            phone: "9876543210",
            address: "Main Street, Sector 12"
        }
    ],
    bankFirstName: "Anita",
    bankMiddleName: "Kumari",
    bankLastName: "Verma",
    bankName: "State Bank of India",
    accountNumber: "123456789012",
    ifscCode: "SBIN0001234",
    passbookImageName: "passbook.jpg",
});

const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeNonNegativeNumber = (value: string) =>
    value.replace(/-/g, "");

const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const normalizeEmptyToNull = (value: unknown): unknown => {
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        return trimmedValue === "" ? null : trimmedValue;
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeEmptyToNull(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                normalizeEmptyToNull(nestedValue),
            ])
        );
    }

    return value ?? null;
};

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

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border border-gray-300 rounded-lg p-5 bg-white">
            <h2 className="text-md font-semibold text-green-700">{title}</h2>
            <hr className="my-2 border-gray-300" />
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function ReadonlyValue({ value }: { value: string }) {
    return (
        <div className="min-h-[42px] rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
            {value || "-"}
        </div>
    );
}

type CAFFormProps = {
    mode?: "create" | "view" | "edit";
    initialData?: CAFFormData;
    loanApplicationId?: string;
    preselectedProductId?: string | null;
};

export default function CAFForm({
    mode = "create",
    initialData,
    loanApplicationId,
    preselectedProductId,
}: CAFFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedCustomerUniqueId = searchParams.get("customer_unique_id");
    const preselectedEnrollmentNumber = searchParams.get("enrollment_number");
    const preselectedEnrollmentId = searchParams.get("enrollment_id"); // legacy — DB id fallback
    const isEdit = mode === "edit";
    const isCreate = mode === "create";
    const readOnly = mode === "view";
    const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [formData, setFormData] = useState<CAFFormData>(
        initialData ?? createDefaultCAFData()
    );

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

    const [files, setFiles] = useState<{
        incomeProof: File | null;
        businessPhoto: File | null;
        businessProof: File | null;
        passbookImage: File | null;
    }>({
        incomeProof: null,
        businessPhoto: null,
        businessProof: null,
        passbookImage: null,
    });

    const [incomeProofPreview, setIncomeProofPreview] = useState<string | null>(
        (initialData as any)?.incomeProofUrl || null
    );
    const [businessPhotoPreview, setBusinessPhotoPreview] = useState<string | null>(
        (initialData as any)?.businessPhotoUrl || null
    );
    const [businessProofPreview, setBusinessProofPreview] = useState<string | null>(
        (initialData as any)?.businessProofUrl || null
    );

    const dropdownRef = useRef<HTMLDivElement>(null);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        const user = localStorage.getItem("user");
        const parsedUser = user ? JSON.parse(user) : null;
        return parsedUser?.role?.toLowerCase() === "field executive"
            ? parsedUser?.agent_unique_id || ""
            : "";
    });
    const [selectedCustomer, setSelectedCustomer] = useState<any>(
        initialData ? (initialData as any).customerObject : null
    );
    const [selectedCustomerId, setSelectedCustomerId] = useState(
        initialData ? (initialData as any).customerObject?.id || "" : ""
    );

    console.log("CAFForm: selectedCustomer:", selectedCustomer);

    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Resolved enrollment_number for the re-enrollment flow
    const [resolvedEnrollmentNumber, setResolvedEnrollmentNumber] = useState<string | null>(
        preselectedEnrollmentNumber || null
    );

    // If only enrollment_id (DB int) was passed, fetch enrollment_number from the enrollments list
    useEffect(() => {
        if (resolvedEnrollmentNumber || !preselectedEnrollmentId || !preselectedCustomerUniqueId) return;
        axiosInstance
            .get(`${ProjectApiList.api_createEnrollment}/${preselectedCustomerUniqueId}`)
            .then((res) => {
                if (res.data.success) {
                    const match = (res.data.data as any[]).find(
                        (e) => String(e.id) === String(preselectedEnrollmentId)
                    );
                    if (match) setResolvedEnrollmentNumber(match.enrollment_number);
                }
            })
            .catch(() => { });
    }, [preselectedEnrollmentId, preselectedCustomerUniqueId]);

    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    const fetchCatalogProducts = async () => {
        try {
            const user = getLoggedInUser();

            if (!user) return;

            const cmsAdminId =
                user.role === "CMS Admin" ||
                    user.role === "cms_admin"
                    ? user.user_id
                    : user.cms_admin;

            const res = await axiosInstance.get(
                ProjectApiList.LOAN_READY_PRODUCT_CATALOG,
                {
                    params: {
                        branch_id: user.branch,
                        cms_admin_id: cmsAdminId,
                    },
                }
            );

            if (res.data.success) {
                const products = res.data.data.products || [];
                setCatalogProducts(products);

                // In edit mode, selectedProductsInit handles population — skip auto-select
                if (
                    mode === "edit" &&
                    (initialData as any)?.selectedProductsInit?.length > 0
                ) {
                    setCatalogProducts(products);
                    return;
                }

                const selectId =
                    preselectedProductId ?? (formData?.productCode || "");

                if (selectId) {
                    const p = products.find(
                        (prod: any) =>
                            prod.product_unique_id === selectId ||
                            String(prod.product_id) === String(selectId)
                    );

                    if (p) {
                        setFormData((prev) => ({
                            ...prev,
                            creditMode: "product",
                            productName: p.product_name,
                            productCode: p.product_unique_id,
                            productDetails: p,
                            productQuantity: prev.productQuantity || "1",
                            productAttributes: prev.productAttributes || {},
                            selectedVariantStock: p.stock || 0,
                        }));

                        setSelectedProducts((prevSel) => {
                            if (
                                prevSel &&
                                prevSel.length > 0 &&
                                (prevSel[0].product_code === p.product_unique_id ||
                                    prevSel[0].product_code === p.product_id)
                            ) {
                                return prevSel;
                            }

                            return [
                                {
                                    product_name: p.product_name,
                                    product_code: p.product_unique_id,
                                    product_quantity:
                                        (formData as any)?.productQuantity || "1",
                                    credit_applied_for:
                                        (formData as any)?.creditAppliedFor ||
                                        String(p.selling_price || ""),
                                    product_attributes:
                                        (formData as any)?.productAttributes || {},
                                    product_details: p,
                                    stock: p.stock || 0,
                                },
                            ];
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching catalog products:", err);
        }
    };
    useEffect(() => {
        // Fetch catalog products for both create and edit modes so
        // product listing is available when editing a CAF.
        if (mode === "create" || mode === "edit") {
            fetchCatalogProducts();
        }
    }, [mode, preselectedProductId]);

    useEffect(() => {
        fetchAgents();
    }, []);

    // If component receives initialData (edit mode), populate selectedProducts from it
    useEffect(() => {
        if (mode === "edit" && initialData) {
            const customerAgentId = (initialData as any)?.customerObject?.agent_unique_id;
            if (customerAgentId) {
                setSelectedAgent(customerAgentId);
            }
            // Prefer the full products array passed from edit page
            const productsInit = (initialData as any).selectedProductsInit;
            if (productsInit && productsInit.length > 0) {
                const hydratedProducts = productsInit.map((sp: any) => {
                    const parsedAttributes = parseProductAttributes(sp.product_attributes || {});
                    const catalogProduct = catalogProducts.find(
                        (prod: any) =>
                            prod.product_unique_id === sp.product_code ||
                            String(prod.product_id) === String(sp.product_code)
                    );

                    const productDetails = catalogProduct || sp.product_details || null;
                    const quantity = parseInt(String(sp.product_quantity)) || 1;
                    const variantPrice =
                        sp.variant_selling_price ||
                        (quantity > 0 ? parseFloat(String(sp.credit_applied_for)) / quantity : 0) ||
                        parseFloat(String(productDetails?.selling_price || 0));

                    return {
                        ...sp,
                        product_attributes: parsedAttributes,
                        product_details: productDetails,
                        stock: productDetails?.stock || 0,
                        available_stock:
                            productDetails?.attribute_definitions?.length
                                ? productDetails?.stock_details?.[0]?.quantity || 0
                                : productDetails?.stock || 0,
                        variant_selling_price: variantPrice,
                    };
                });

                setSelectedProducts(hydratedProducts);
                const dp = String(initialData.down_payment || "");
                const discount = String(initialData.discount || "");
                setFormData((prev) => ({
                    ...prev,
                    creditAppliedFor: getNetCreditAppliedFor(hydratedProducts, dp, discount),
                }));
                return;
            }

            // Fallback: single product from legacy fields
            const pd = (initialData as any).productDetails || null;
            const code = (initialData as any).productCode || (pd && pd.product_unique_id) || "";
            if (!code) return;

            if (selectedProducts.length > 0 && selectedProducts[0].product_code) return;

            const fallbackProducts = [{
                product_name: (initialData as any).productName || (pd && pd.product_name) || "",
                product_code: code,
                product_quantity: (initialData as any).productQuantity || "1",
                credit_applied_for: (initialData as any).creditAppliedFor || "",
                product_attributes: parseProductAttributes((initialData as any).productAttributes || {}),
                product_details: pd,
                stock: (pd && pd.stock) || 0,
            }];

            setSelectedProducts(fallbackProducts);
            const dp = String(initialData.down_payment || "");
            const discount = String(initialData.discount || "");
            setFormData((prev) => ({
                ...prev,
                creditAppliedFor: getNetCreditAppliedFor(fallbackProducts, dp, discount),
            }));
        }
    }, [initialData, mode, catalogProducts]);

    const inputClass =
        "bg-gray-50 rounded-md px-3 py-2 text-sm w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600";
    const tableCellInputClass = `${inputClass} ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`;
    const radioClass = "h-4 w-4 text-blue-600 focus:ring-blue-600";

    const fieldErrorClass = (field: string, baseClass = inputClass) =>
        fieldErrors[field]
            ? `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`
            : baseClass;

    const setFieldRef = (field: string, node: HTMLElement | null) => {
        if (node) {
            fieldRefs.current[field] = node;
        }
    };

    const clearFieldError = (field: string) => {
        if (!fieldErrors[field]) return;
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const focusFirstError = (errors: Record<string, string>) => {
        const firstField = Object.keys(errors)[0];
        if (!firstField) return;

        const node = fieldRefs.current[firstField];
        if (node) {
            node.scrollIntoView({ behavior: "smooth", block: "center" });
            if (typeof (node as HTMLElement).focus === "function") {
                (node as HTMLElement).focus();
            }
        }
    };
    const effectiveFrequency: FrequencyOption = formData.frequency;
    const effectiveTenureOption: TenureOption = formData.tenureOption;


    const fetchUsers = async (searchValue = "", agentUniqueId: string = selectedAgent) => {
        try {
            setLoading(true);

            const user = getLoggedInUser();
            if (!user) return;

            const isCmsAdmin =
                user.role === "CMS Admin" ||
                user.role === "cms_admin";

            const params: any = {
                search: searchValue,
                verification_status: "verified",
                branch_id: user.branch,
                cms_admin_id: isCmsAdmin ? user.user_id : user.cms_admin,
            };

            if (agentUniqueId) {
                const selectedAgentObj = agents.find(
                    (agent) => agent.agent_unique_id === agentUniqueId
                );
                if (selectedAgentObj?.user_id) {
                    params.enrolled_by = selectedAgentObj.user_id;
                }
            }

            const res = await axiosInstance.get(
                ProjectApiList.api_getEligibleCustomersForCAF,
                {
                    params,
                }
            );

            if (res.data.success) {
                setCustomers(res.data.data || []);
            }
        } catch (error) {
            console.error("Fetch users failed", error);
        } finally {
            setLoading(false);
        }
    };
    // Auto-select customer when opened via ?customer_unique_id= query param
    useEffect(() => {
        if (!preselectedCustomerUniqueId || mode !== "create") return;

        const autoSelect = async () => {
            try {
                const user = getLoggedInUser();
                if (!user) return;

                const res = await axiosInstance.get(
                    ProjectApiList.api_getEligibleCustomersForCAF,
                    {
                        params: {
                            search: preselectedCustomerUniqueId,
                            verification_status: "verified",
                            branch_id: user.branch,
                            cms_admin_id: user.cms_admin,
                        },
                    }
                );

                if (res.data.success) {
                    const match = (res.data.data as any[]).find(
                        (c) => c.customer_unique_id === preselectedCustomerUniqueId
                    );

                    if (match) {
                        setSelectedCustomer(match);
                        setSelectedCustomerId(match.id);
                        if (match.agent_unique_id) {
                            setSelectedAgent(match.agent_unique_id);
                        }
                        updateField("bankFirstName", match.first_name || "");
                        updateField("bankLastName", match.last_name || "");
                    }
                }
            } catch (err) {
                console.error("Failed to auto-select customer:", err);
            }
        };

        autoSelect();
    }, [preselectedCustomerUniqueId, mode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const totalIncome = useMemo(
        () =>
            (toNumber(formData.applicantIncome) +
                toNumber(formData.otherSourcesIncome)) * 12,
        [formData.applicantIncome, formData.otherSourcesIncome]
    );

    const totalMonthlyExpenses = useMemo(
        () =>
            Object.values(formData.expenses).reduce(
                (sum, item) => sum + toNumber(item.monthly),
                0
            ) +
            toNumber(formData.travelExpense) +
            toNumber(formData.otherObligations),
        [formData.expenses, formData.otherObligations, formData.travelExpense]
    );

    const totalYearlyExpenses = useMemo(
        () =>
            Object.values(formData.expenses).reduce(
                (sum, item) => sum + toNumber(item.yearly),
                0
            ) +
            toNumber(formData.travelExpense) * 12 +
            toNumber(formData.otherObligations) * 12,
        [formData.expenses, formData.otherObligations, formData.travelExpense]
    );

    const totalObligationAmount = useMemo(
        () => formData.obligationRows.reduce((sum, row) => sum + toNumber(row.creditAmount), 0),
        [formData.obligationRows]
    );

    const totalEmiAmount = useMemo(
        () => formData.obligationRows.reduce((sum, row) => sum + toNumber(row.emiAmount), 0),
        [formData.obligationRows]
    );

    const totalInstallmentAmount = useMemo(
        () =>
            formData.obligationRows.reduce(
                (sum, row) => sum + toNumber(row.installmentAmount),
                0
            ),
        [formData.obligationRows]
    );

    const netSurplus = useMemo(() => {

        const A = totalIncome;

        const B = totalYearlyExpenses + (totalInstallmentAmount * 12);

        return (A - B) / 12;

    }, [totalIncome, totalYearlyExpenses, totalInstallmentAmount]);

    // Initialize selectedProducts when creditMode switches to product
    useEffect(() => {
        if (formData.creditMode === "product" && selectedProducts.length === 0) {
            setSelectedProducts([{ product_name: "", product_code: "", product_quantity: "1", credit_applied_for: "", product_attributes: {}, product_details: null, stock: 0 }]);
        }
    }, [formData.creditMode]);

    const getProductLineTotal = (product: any) => {
        const isVariantProduct = hasProductDetailsVariantDefinitions(product);
        const sellingPrice = parseFloat(
            String(
                product.variant_selling_price ??
                    (isVariantProduct ? 0 : product.product_details?.selling_price) ??
                    0
            )
        ) || 0;
        const qty = parseInt(String(product.product_quantity)) || 1;
        if (sellingPrice > 0) {
            return sellingPrice * qty;
        }
        return parseFloat(String(product.credit_applied_for)) || 0;
    };

    const getProductTotal = (products: any[]) => {
        return products.reduce((sum, product) => sum + getProductLineTotal(product), 0);
    };

    const hasIncompleteVariantSelection = (products: any[]) => {
        return products.some((product) => {
            const attrs = product.product_details?.attribute_definitions || [];
            return (
                attrs.length > 0 &&
                !areAllVariantAttributesSelected(attrs, product.product_attributes || {})
            );
        });
    };

    const getNetCreditAppliedFor = (products: any[], downPayment: string, discount: string) => {
        if (hasIncompleteVariantSelection(products)) {
            return "";
        }

        const total = getProductTotal(products);
        const deduction = toNumber(String(downPayment)) + toNumber(String(discount));
        return String(Math.max(0, total - deduction));
    };

    const updateField = <K extends keyof CAFFormData>(field: K, value: CAFFormData[K]) => {
        clearFieldError(String(field));
        const numericFields: (keyof CAFFormData)[] = [
            "creditAppliedFor",
            "down_payment",
            "applicantIncome",
            "otherSourcesIncome",
            "familyDependents",
            "travelExpense",
            "otherObligations",
            "businessVintage",
        ];

        const nextValue =
            typeof value === "string" && numericFields.includes(field)
                ? sanitizeNonNegativeNumber(value)
                : value;

        setFormData((prev) => {
            const nextState = { ...prev, [field]: nextValue };

            // Auto-select ApplicantType based on Annual Income
            if (field === "applicantIncome" || field === "otherSourcesIncome") {
                const totalAnnualIncome = (toNumber(String(nextState.applicantIncome)) + toNumber(String(nextState.otherSourcesIncome))) * 12;

                if (totalAnnualIncome > 300000) {
                    nextState.applicantType = "nonQualifying";
                } else {
                    nextState.applicantType = "qualifying";
                }
            }

            if (field === "down_payment" || field === "discount") {
                if (nextState.creditMode === "product") {
                    nextState.creditAppliedFor = getNetCreditAppliedFor(selectedProducts, String(nextState.down_payment), String(nextState.discount));
                } else {
                    const totalProductSum = toNumber(String(nextState.creditAppliedFor)) + toNumber(String(prev.down_payment)) + toNumber(String(prev.discount));
                    const deduction = toNumber(String(nextState.down_payment)) + toNumber(String(nextState.discount));
                    const netCredit = Math.max(0, totalProductSum - deduction);
                    nextState.creditAppliedFor = String(netCredit);
                }
            }

            if (field === "creditAppliedFor" && nextState.creditMode === "product") {
                // If user manually changes Credit Applied For in product mode, 
                // we might want to adjust DP? Usually DP is the variable.
                // For now, let's just let it be.
            }

            return nextState;
        });
    };

    const handleFrequencyChange = (value: FrequencyOption) => {
        setFormData((prev) => ({
            ...prev,
            frequency: value,
            tenureOption:
                value === "weekly"
                    ? "1 Week"
                    : value === "biweekly"
                        ? "1 Bi-week"
                        : prev.tenureOption === "1 Week" ||
                            prev.tenureOption === "1 Bi-week"
                            ? "12 Month"
                            : prev.tenureOption,
        }));
    };

    const updateExpense = (key: ExpenseKey, field: "monthly" | "yearly", value: string) => {
        const sanitizedValue = sanitizeNonNegativeNumber(value);

        setFormData((prev) => ({
            ...prev,
            expenses: {
                ...prev.expenses,
                [key]: {
                    ...prev.expenses[key],
                    [field]: sanitizedValue,
                    ...(field === "monthly"
                        ? {
                            yearly:
                                sanitizedValue === ""
                                    ? ""
                                    : String(toNumber(sanitizedValue) * 12),
                        }
                        : {}),
                },
            },
        }));
    };

    const toggleIncomeSource = (key: IncomeSourceKey) => {
        clearFieldError("incomeSources");
        setFormData((prev) => ({
            ...prev,
            incomeSources: {
                ...prev.incomeSources,
                [key]: !prev.incomeSources[key],
            },
        }));
    };

    const updateObligationRow = (index: number, field: keyof ObligationRow, value: string) => {
        clearFieldError("obligationRows");
        const sanitizedValue =
            field === "creditAmount" || field === "emiAmount" || field === "installmentAmount"
                ? sanitizeNonNegativeNumber(value)
                : value;

        setFormData((prev) => ({
            ...prev,
            obligationRows: prev.obligationRows.map((row, rowIndex) => {
                if (rowIndex !== index) return row;

                const nextRow = { ...row, [field]: sanitizedValue };
                if (field === "emiAmount" || field === "repaymentMode") {
                    const emiAmount =
                        field === "emiAmount" ? sanitizedValue : row.emiAmount;
                    const repaymentMode =
                        field === "repaymentMode" ? sanitizedValue : row.repaymentMode || "monthly";

                    nextRow.installmentAmount = calculateInstallmentAmount(
                        emiAmount,
                        repaymentMode
                    );
                }

                return nextRow;
            }),
        }));
    };

    const addObligationRow = () => {
        clearFieldError("obligationRows");
        setFormData((prev) => ({
            ...prev,
            obligationRows: [...prev.obligationRows, defaultObligationRow()],
        }));
    };

    const addPartnerRow = () => {
        clearFieldError("partners");
        setFormData((prev) => ({
            ...prev,
            partners: [...(prev.partners || []), { name: "", phone: "", address: "" }],
        }));
    };

    const removePartnerRow = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            partners: (prev.partners || []).filter((_, i) => i !== index),
        }));
    };

    const updatePartnerField = (index: number, field: keyof PartnerDetail, value: string) => {
        clearFieldError("partners");
        setFormData((prev) => {
            const newPartners = [...(prev.partners || [])];
            newPartners[index] = { ...newPartners[index], [field]: value };
            return { ...prev, partners: newPartners };
        });
    };

    const removeObligationRow = (index: number) => {
        setPendingRemoveIndex(index);
    };

    const confirmRemoveObligationRow = () => {
        if (pendingRemoveIndex === null) return;

        setFormData((prev) => ({
            ...prev,
            obligationRows:
                prev.obligationRows.length > 1
                    ? prev.obligationRows.filter(
                        (_, rowIndex) => rowIndex !== pendingRemoveIndex
                    )
                    : prev.obligationRows,
        }));
        setPendingRemoveIndex(null);
    };

    const handleFileChange = (
        field: "incomeProof" | "businessPhoto" | "businessProof" | "passbookImage",
        file: File | null,
        label: string,
        input?: HTMLInputElement | null
    ) => {
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(`${label} must be 2MB or smaller.`);
                if (input) {
                    input.value = "";
                }
                return;
            }

            const formField =
                field === "incomeProof"
                    ? "incomeProofName"
                    : field === "businessPhoto"
                        ? "businessPhotoName"
                        : field === "businessProof"
                            ? "businessProofName"
                            : "passbookImageName";

            clearFieldError(formField);
            setFiles((prev) => ({ ...prev, [field]: file }));
            updateField(formField as keyof CAFFormData, file.name as any);
        }
    };

    useEffect(() => {
        // show preview for uploaded file or existing URL from initialData
        if (files.incomeProof) {
            const url = URL.createObjectURL(files.incomeProof);
            setIncomeProofPreview(url);
            return () => URL.revokeObjectURL(url);
        }

        // fallback to initialData URL (when editing)
        if ((initialData as any)?.incomeProofUrl) {
            setIncomeProofPreview((initialData as any).incomeProofUrl);
        }
    }, [files.incomeProof, initialData]);

    useEffect(() => {
        if (files.businessPhoto) {
            const url = URL.createObjectURL(files.businessPhoto);
            setBusinessPhotoPreview(url);
            return () => URL.revokeObjectURL(url);
        }

        if ((initialData as any)?.businessPhotoUrl) {
            setBusinessPhotoPreview((initialData as any).businessPhotoUrl);
        }
    }, [files.businessPhoto, initialData]);

    useEffect(() => {
        if (files.businessProof) {
            const url = URL.createObjectURL(files.businessProof);
            setBusinessProofPreview(url);
            return () => URL.revokeObjectURL(url);
        }

        if ((initialData as any)?.businessProofUrl) {
            setBusinessProofPreview((initialData as any).businessProofUrl);
        }
    }, [files.businessProof, initialData]);

    const getLoggedInUser = () => {
        if (typeof window === "undefined") return null;
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    };

    const user = getLoggedInUser();
    const isFieldExecutive = user?.role?.toLowerCase() === "field executive";

    const fetchAgents = async () => {
        try {
            const user = getLoggedInUser();
            if (!user) return;

            const role = (user.role || "").toLowerCase();

            const cmsAdminId =
                role === "cms_admin" || role === "super_admin"
                    ? user.user_id
                    : user.cms_admin;

            const res = await axiosInstance.get(ProjectApiList.api_getAllAgents, {
                params: {
                    branch_id: user.branch,
                    cms_admin_id: cmsAdminId,
                },
            });

            if (res.data.success) {
                setAgents(res.data.data?.data || res.data.data || []);
            }
        } catch (error) {
            console.error("Fetch agents failed", error);
        }
    };

    const validateCAFSubmission = () => {
        const errors: Record<string, string> = {};

        if (!selectedCustomer?.customer_unique_id) {
            errors.customer = "Please select a customer before submitting.";
        }

        if (!formData.creditMode.trim()) {
            errors.creditMode = "Please select Product or Cash before submitting.";
        }

        if (formData.creditMode !== "product") {
            if (!formData.creditAppliedFor.trim()) {
                errors.creditAppliedFor = "Please enter Credit Applied amount before submitting.";
            } else if (!/^\d+(\.\d+)?$/.test(formData.creditAppliedFor.trim())) {
                errors.creditAppliedFor = "Credit Applied amount must contain numbers only.";
            } else if (toNumber(formData.creditAppliedFor) >= 50000) {
                errors.creditAppliedFor = "Credit Applied amount must be less than ₹50,000. CAF cannot be created.";
            }
        }

        if (!formData.frequency.trim()) {
            errors.frequency = "Please select frequency before submitting.";
        }

        if (!formData.tenureOption.trim()) {
            errors.tenureOption = "Please select tenure before submitting.";
        }

        if (formData.creditMode === "product") {
            if (selectedProducts.length === 0 || !selectedProducts.some((sp: any) => sp.product_code)) {
                errors.productName = "Please select at least one product before submitting.";
            } else {
                selectedProducts.forEach((sp: any, i: number) => {
                    if (!sp.product_code) {
                        errors.productName = `Product #${i + 1}: Please select a product.`;
                    } else if (!sp.product_quantity || parseInt(sp.product_quantity) < 1) {
                        errors.productName = `Product #${i + 1}: Please enter a valid quantity.`;
                    } else if (sp.available_stock > 0 && parseInt(sp.product_quantity) > sp.available_stock) {
                        errors.productName = `Product #${i + 1}: Quantity exceeds available stock (${sp.available_stock}).`;
                    }
                });
            }
        }

        if (!formData.applicantIncome.trim()) {
            errors.applicantIncome = "Please enter Applicant / Spouse / Nominee Income before submitting.";
        } else if (!/^\d+(\.\d+)?$/.test(formData.applicantIncome.trim())) {
            errors.applicantIncome = "Applicant / Spouse / Nominee Income must contain numbers only.";
        }

        if (
            formData.otherSourcesIncome.trim() &&
            !/^\d+(\.\d+)?$/.test(formData.otherSourcesIncome.trim())
        ) {
            errors.otherSourcesIncome = "Other Sources Income must contain numbers only.";
        }

        if (
            formData.discount.trim() &&
            !/^\d+(\.\d+)?$/.test(formData.discount.trim())
        ) {
            errors.discount = "Discount must contain numbers only.";
        }

        if (!formData.familyDependents.trim()) {
            errors.familyDependents = "Please enter Number of Family Members Dependent before submitting.";
        } else if (!/^\d+$/.test(formData.familyDependents.trim())) {
            errors.familyDependents = "Number of Family Members Dependent must contain numbers only.";
        }

        if (!Object.values(formData.incomeSources).some(Boolean)) {
            errors.incomeSources = "Please select at least one income source before submitting.";
        }

        if (formData.creditMode !== "product") {
            if (!formData.businessNature.trim()) {
                errors.businessNature = "Please enter Business Nature before submitting.";
            }
            if (!formData.businessAddress.trim()) {
                errors.businessAddress = "Please enter Business Address before submitting.";
            }
            if (!formData.businessVintage.trim()) {
                errors.businessVintage = "Please enter Business Vintage before submitting.";
            } else if (!/^\d+$/.test(formData.businessVintage.trim())) {
                errors.businessVintage = "Business Vintage must contain numbers only.";
            }
            if (!isEdit && !formData.businessPhotoName.trim()) {
                errors.businessPhotoName = "Please choose Business Photo before submitting.";
            }
            if (!isEdit && !formData.businessProofName.trim()) {
                errors.businessProofName = "Please choose Business Proof before submitting.";
            }
        }

        if (formData.entitled === "partnership") {
            const partners = formData.partners || [];
            if (partners.length === 0) {
                errors.partners = "Please add at least one partner for Partnership business.";
            }
            const incompletePartner = partners.find((p) => !p.name.trim() || !p.phone.trim() || !p.address.trim());
            if (incompletePartner) {
                errors.partners = "Please complete all fields for each partner (Name, Phone, Address).";
            }
        }

        if (!formData.obligationRows.some((row) => Object.values(row).some((value) => value.trim()))) {
            errors.obligationRows = "Please fill at least one Other Obligation Details row before submitting.";
        }

        if (formData.creditMode !== "product") {
            if (!formData.bankFirstName.trim()) {
                errors.bankFirstName = "Please enter Bank First Name before submitting.";
            }
            if (!formData.bankLastName.trim()) {
                errors.bankLastName = "Please enter Bank Last Name before submitting.";
            }
            if (!formData.bankName.trim()) {
                errors.bankName = "Please enter Bank Name before submitting.";
            }
            if (!formData.accountNumber.trim()) {
                errors.accountNumber = "Please enter Account Number before submitting.";
            }
            if (!formData.ifscCode.trim()) {
                errors.ifscCode = "Please enter IFSC Code before submitting.";
            }
        }

        return errors;
    };

    const buildCAFSubmissionPayload = () => {
        const user = getLoggedInUser();

        return normalizeEmptyToNull({
            user_id: user?.user_id ?? null,
            branch_id: user?.branch ?? null,
            cms_admin_id: user?.cms_admin ?? null,

            customer_id: selectedCustomerId,

            formData,
            computed: {
                effectiveFrequency,
                effectiveTenureOption,
                totalIncome,
                totalMonthlyExpenses,
                totalYearlyExpenses,
                totalObligationAmount,
                totalInstallmentAmount,
                netSurplus,
            },
        });
    };

    const handleSubmit = async () => {
        if (loading) return;


        setFieldErrors({});

        try {
            setLoading(true);
            const user = getLoggedInUser();

            const appendJson = (formData: FormData, key: string, value: any) => {
                formData.append(key, JSON.stringify(value));
            };

            const data = new FormData();

            // Context from logged in user
            data.append("cms_admin_id", user?.cms_admin || "");
            data.append("branch_id", user?.branch || "");
            data.append("agent_unique_id", selectedAgent || user?.agent_unique_id || "");

            // Basic Info
            data.append("customer_unique_id", selectedCustomer?.customer_unique_id || "");
            if (resolvedEnrollmentNumber) {
                data.append("enrollment_number", resolvedEnrollmentNumber);
            }
            data.append("credit_mode", formData.creditMode);
            data.append("credit_applied_for", formData.creditAppliedFor);
            data.append("down_payment", formData.down_payment);
            data.append("discount", formData.discount);
            data.append("product_name", formData.productName);
            data.append("product_code", formData.productCode);
            data.append("frequency", effectiveFrequency);
            data.append("tenure_option", effectiveTenureOption);
            data.append("repayment_day", formData.repaymentDay || "");

            // Household Income
            data.append("applicant_type", formData.applicantType);
            data.append("applicant_income", formData.applicantIncome);
            // Convert boolean map to list of keys for backend or just stringify the whole thing
            data.append("income_sources", JSON.stringify(formData.incomeSources));
            data.append("other_sources_income", formData.otherSourcesIncome);
            data.append("family_dependents", formData.familyDependents);
            data.append("total_income_yearly", String(totalIncome));

            // Expenses
            data.append("expense_details", JSON.stringify(formData.expenses));
            data.append("travel_expense_monthly", formData.travelExpense);
            data.append("other_obligations_monthly", formData.otherObligations);
            data.append("total_monthly_expenses", String(totalMonthlyExpenses));
            data.append("total_yearly_expenses", String(totalYearlyExpenses));

            // Obligations
            data.append("obligation_rows", JSON.stringify(formData.obligationRows));
            data.append("total_obligation_amount", String(totalObligationAmount));
            data.append("total_installment_amount", String(totalInstallmentAmount));

            // Products array (multi-product support)
            if (formData.creditMode === "product" && selectedProducts.length > 0) {
                const productsPayload = selectedProducts
                    .filter((sp: any) => sp.product_code)
                    .map((sp: any) => ({
                        product_name: sp.product_name,
                        product_code: sp.product_code,
                        product_quantity: sp.product_quantity || "1",
                        credit_applied_for: sp.credit_applied_for || "0",
                        product_attributes: sp.product_attributes || {},
                        product_details: sp.product_details ? {
                            product_id: sp.product_details.product_id,
                            product_name: sp.product_details.product_name,
                            product_unique_id: sp.product_details.product_unique_id,
                            product_sku_code: sp.product_details.product_sku_code,
                            category: sp.product_details.category?.name,
                            brand: sp.product_details.brand?.name,
                            selling_price: sp.product_details.selling_price,
                            gst_percent: sp.product_details.gst_percent,
                            unit: sp.product_details.unit?.short_name,
                        } : null,
                    }));

                // Append products as form-array fields so PHP/Laravel recognizes them as arrays
                productsPayload.forEach((prod: any, idx: number) => {
                    data.append(`products[${idx}][product_name]`, prod.product_name || "");
                    data.append(`products[${idx}][product_code]`, prod.product_code || "");
                    data.append(`products[${idx}][product_quantity]`, String(prod.product_quantity || "1"));
                    data.append(`products[${idx}][credit_applied_for]`, String(prod.credit_applied_for || "0"));
                    data.append(`products[${idx}][product_attributes]`, JSON.stringify(prod.product_attributes || {}));

                    if (prod.product_details) {
                        Object.entries(prod.product_details).forEach(([k, v]) => {
                            data.append(`products[${idx}][product_details][${k}]`, v == null ? "" : String(v));
                        });
                    }
                });

                // Also set first product fields for backend backward compat
                if (productsPayload.length > 0) {
                    data.append("product_name", productsPayload[0].product_name || "");
                    data.append("product_code", productsPayload[0].product_code || "");
                    data.append("product_quantity", productsPayload[0].product_quantity || "1");
                    data.append("product_attributes", JSON.stringify(productsPayload[0].product_attributes));
                    if (productsPayload[0].product_details) {
                        data.append("product_details", JSON.stringify(productsPayload[0].product_details));
                    }
                }
            }

            // Net Surplus
            data.append("net_surplus", String(netSurplus));

            // Business Details
            data.append("business_type", formData.creditMode === "product" ? "" : formData.businessType);
            data.append("business_nature", formData.creditMode === "product" ? "" : formData.businessNature);
            data.append("entitled", formData.creditMode === "product" ? "" : formData.entitled);
            data.append("business_address", formData.creditMode === "product" ? "" : formData.businessAddress);
            data.append("business_ownership", formData.creditMode === "product" ? "" : formData.businessOwnership);
            data.append("business_vintage", formData.creditMode === "product" ? "" : formData.businessVintage);
            data.append("partners", JSON.stringify(formData.creditMode === "product" ? [] : (formData.partners || [])));
            data.append("reference1_name", formData.creditMode === "product" ? "" : formData.reference1Name);
            data.append("reference1_contact", formData.creditMode === "product" ? "" : formData.reference1Contact);
            data.append("reference1_address", formData.creditMode === "product" ? "" : formData.reference1Address);
            data.append("reference2_name", formData.creditMode === "product" ? "" : formData.reference2Name);
            data.append("reference2_contact", formData.creditMode === "product" ? "" : formData.reference2Contact);
            data.append("reference2_address", formData.creditMode === "product" ? "" : formData.reference2Address);

            // Bank Details
            data.append("bank_first_name", formData.creditMode === "product" ? "" : formData.bankFirstName);
            data.append("bank_middle_name", formData.creditMode === "product" ? "" : formData.bankMiddleName);
            data.append("bank_last_name", formData.creditMode === "product" ? "" : formData.bankLastName);
            data.append("bank_name", formData.creditMode === "product" ? "" : formData.bankName);
            data.append("account_number", formData.creditMode === "product" ? "" : formData.accountNumber);
            data.append("ifsc_code", formData.creditMode === "product" ? "" : formData.ifscCode);

            // Files
            if (files.incomeProof) data.append("income_proof", files.incomeProof);
            if (formData.creditMode !== "product") {
                if (files.businessPhoto) data.append("business_photo", files.businessPhoto);
                if (files.businessProof) data.append("business_proof", files.businessProof);
                if (files.passbookImage) data.append("passbook_image", files.passbookImage);
            }

            // console.log(mode === "edit" ? "Updating CAF..." : "Submitting CAF...");

            const url = mode === "edit"
                ? `${ProjectApiList.api_updateCAF}/${loanApplicationId}`
                : ProjectApiList.api_createCAF;
            console.log("resolvedEnrollmentNumber", resolvedEnrollmentNumber);

            for (const pair of data.entries()) {
                console.log(pair[0], pair[1]);
            }
            const res = await axiosInstance.post(url, data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data.success) {
                toast.success(mode === "edit" ? "CAF updated successfully!" : "CAF submitted successfully!");
                router.push("/loan/caf/");
            } else {
                toast.error(res.data.message || (mode === "edit" ? "Failed to update CAF" : "Failed to submit CAF"));
            }
        } catch (error: any) {
            console.error("CAF error:", error);
            const apiError = error.response?.data;

            if (apiError?.errors) {
                // Loop all validation errors
                Object.values(apiError.errors).forEach((errArr: any) => {
                    if (Array.isArray(errArr)) {
                        errArr.forEach((msg: string) => toast.error(msg));
                    }
                });
            } else {
                const msg = apiError?.message || "An error occurred during submission.";
                toast.error(msg);
            }
        } finally {
            setLoading(false);
            setShowSubmitConfirm(false);
        }
    };

    const requestSubmitConfirmation = () => {
        const error = validateCAFSubmissionStepWise();

        if (error) {
            setFieldErrors({
                [error.field]: error.message,
            });

            focusFirstError({
                [error.field]: error.message,
            });

            toast.error(error.message);
            return;
        }

        setFieldErrors({});
        setShowSubmitConfirm(true);
    };

    const renderTextField = (
        field: keyof CAFFormData,
        label: string,
        placeholder = label,
        required = false
    ) => (
        <div>
            <label className="text-sm text-gray-700 mb-1 block">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {readOnly ? (
                <ReadonlyValue value={String(formData[field] || "")} />
            ) : (
                <input
                    value={String(formData[field] || "")}
                    onChange={(e) => updateField(field, e.target.value as never)}
                    ref={(el) => setFieldRef(String(field), el)}
                    className={fieldErrorClass(String(field))}
                    placeholder={placeholder}
                />
            )}
            {fieldErrors[String(field)] && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors[String(field)]}</p>
            )}
        </div>
    );


    const generateSchedule = () => {
        if (!formData.repaymentDay) return [];

        const start = getNextDateFromDay(formData.repaymentDay);

        const tenure = parseInt(formData.tenureOption) || 0;

        let gap = 0;
        if (formData.frequency === "weekly") gap = 7;
        if (formData.frequency === "biweekly") gap = 14;

        const dates = [];

        for (let i = 0; i < tenure; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i * gap);
            dates.push(d.toDateString());
        }

        return dates;
    };

    //cOMMENT
    // useEffect(() => {
    //     if (formData.creditMode === "product" && formData.frequency === "monthly") {
    //         setFormData((prev) => ({
    //             ...prev,
    //             frequency: "weekly", // or "biweekly" if you prefer
    //         }));
    //     }
    // }, [formData.creditMode]);


    const validateCAFSubmissionStepWise = () => {

        // Agent
        if (!isFieldExecutive && !selectedAgent) {
            return {
                field: "agent",
                message: "Please select an agent before submitting.",
            };
        }
        // Customer
        if (!selectedCustomer?.customer_unique_id) {
            return {
                field: "customer",
                message: "Please select a customer.",
            };
        }

        // Credit Type
        if (!formData.creditMode) {
            return {
                field: "creditMode",
                message: "Please select Product or Cash.",
            };
        }

        // Credit Applied
        if (formData.creditMode === "cash") {
            if (!formData.creditAppliedFor.trim()) {
                return {
                    field: "creditAppliedFor",
                    message: "Please enter Credit Applied Amount.",
                };
            }

            if (isNaN(Number(formData.creditAppliedFor))) {
                return {
                    field: "creditAppliedFor",
                    message: "Credit Applied Amount must be numeric.",
                };
            }

            if (Number(formData.creditAppliedFor) >= 50000) {
                return {
                    field: "creditAppliedFor",
                    message:
                        "Credit Applied Amount must be less than ₹50,000.",
                };
            }
        }

        // Frequency
        if (!formData.frequency) {
            return {
                field: "frequency",
                message: "Please select repayment frequency.",
            };
        }

        // Tenure
        if (!formData.tenureOption) {
            return {
                field: "tenureOption",
                message: "Please select tenure.",
            };
        }

        // Product Validation
        if (formData.creditMode === "product") {
            if (selectedProducts.length === 0) {
                return {
                    field: "productName",
                    message: "Please select a product.",
                };
            }

            for (const product of selectedProducts) {
                if (!product.product_code) {
                    return {
                        field: "productName",
                        message: "Please select a product.",
                    };
                }

                if (
                    !product.product_quantity ||
                    Number(product.product_quantity) < 1
                ) {
                    return {
                        field: "productName",
                        message: "Please enter valid quantity.",
                    };
                }

                if (
                    product.available_stock > 0 &&
                    Number(product.product_quantity) >
                    product.available_stock
                ) {
                    return {
                        field: "productName",
                        message: `Quantity exceeds available stock (${product.available_stock}).`,
                    };
                }

                if (product.product_details?.attribute_definitions?.length) {
                    const attrsSelected = areAllVariantAttributesSelected(
                        product.product_details.attribute_definitions,
                        product.product_attributes || {}
                    );

                    if (!attrsSelected) {
                        return {
                            field: "productName",
                            message: `Please select all variant attributes for ${product.product_name || "the product"}.`,
                        };
                    }

                    const variantStock = getSelectedVariantStock(
                        product.product_details.stock_details || [],
                        product.product_attributes || {}
                    );

                    if (variantStock <= 0) {
                        return {
                            field: "productName",
                            message: `Selected variant for ${product.product_name || "the product"} is not available.`,
                        };
                    }

                    if (!product.credit_applied_for || Number(product.credit_applied_for) <= 0) {
                        return {
                            field: "productName",
                            message: `Please select a valid variant for ${product.product_name || "the product"}.`,
                        };
                    }
                }
            }
        }

        // Income
        if (!formData.applicantIncome.trim()) {
            return {
                field: "applicantIncome",
                message: "Please enter applicant income.",
            };
        }

        if (isNaN(Number(formData.applicantIncome))) {
            return {
                field: "applicantIncome",
                message: "Applicant income must be numeric.",
            };
        }

        if (
            formData.otherSourcesIncome.trim() &&
            isNaN(Number(formData.otherSourcesIncome))
        ) {
            return {
                field: "otherSourcesIncome",
                message: "Other source income must be numeric.",
            };
        }

        // Income Sources
        if (!Object.values(formData.incomeSources).some(Boolean)) {
            return {
                field: "incomeSources",
                message: "Please select at least one income source.",
            };
        }

        // Family Dependents
        if (!formData.familyDependents.trim()) {
            return {
                field: "familyDependents",
                message: "Please enter dependent family members.",
            };
        }

        if (isNaN(Number(formData.familyDependents))) {
            return {
                field: "familyDependents",
                message: "Family dependents must be numeric.",
            };
        }

        // Business Details
        if (formData.creditMode === "cash") {
            if (!formData.businessNature.trim()) {
                return {
                    field: "businessNature",
                    message: "Please enter business nature.",
                };
            }

            if (!formData.businessAddress.trim()) {
                return {
                    field: "businessAddress",
                    message: "Please enter business address.",
                };
            }

            if (!formData.businessVintage.trim()) {
                return {
                    field: "businessVintage",
                    message: "Please enter business vintage.",
                };
            }

            if (isNaN(Number(formData.businessVintage))) {
                return {
                    field: "businessVintage",
                    message: "Business vintage must be numeric.",
                };
            }

            if (!isEdit && !formData.businessPhotoName.trim()) {
                return {
                    field: "businessPhotoName",
                    message: "Please upload business photo.",
                };
            }

            if (!isEdit && !formData.businessProofName.trim()) {
                return {
                    field: "businessProofName",
                    message: "Please upload business proof.",
                };
            }
        }

        // Partnership Details
        if (formData.entitled === "partnership") {
            if (
                !formData.partners ||
                formData.partners.length === 0
            ) {
                return {
                    field: "partners",
                    message: "Please add at least one partner.",
                };
            }

            const invalidPartner = formData.partners.find(
                (partner) =>
                    !partner.name.trim() ||
                    !partner.phone.trim() ||
                    !partner.address.trim()
            );

            if (invalidPartner) {
                return {
                    field: "partners",
                    message:
                        "Please complete all partner details.",
                };
            }
        }

        // Obligations
        if (
            !formData.obligationRows.some((row) =>
                Object.values(row).some((value) => value.trim())
            )
        ) {
            return {
                field: "obligationRows",
                message: "Please enter obligation details.",
            };
        }

        // Bank Details
        if (formData.creditMode === "cash") {
            if (!formData.bankFirstName.trim()) {
                return {
                    field: "bankFirstName",
                    message: "Please enter first name.",
                };
            }

            if (!formData.bankLastName.trim()) {
                return {
                    field: "bankLastName",
                    message: "Please enter last name.",
                };
            }

            if (!formData.bankName.trim()) {
                return {
                    field: "bankName",
                    message: "Please enter bank name.",
                };
            }

            if (!formData.accountNumber.trim()) {
                return {
                    field: "accountNumber",
                    message: "Please enter account number.",
                };
            }

            if (!formData.ifscCode.trim()) {
                return {
                    field: "ifscCode",
                    message: "Please enter IFSC code.",
                };
            }

            if (
                !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(
                    formData.ifscCode.trim()
                )
            ) {
                return {
                    field: "ifscCode",
                    message: "Invalid IFSC code.",
                };
            }
            // Passbook Image
            if (
                !isEdit &&
                !formData.passbookImageName.trim()
            ) {
                return {
                    field: "passbookImageName",
                    message: "Please upload passbook image.",
                };
            }
        }

        return null;
    };
    const getNextDateFromDay = (dayName: string) => {
        const daysMap: any = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
        };

        const today = new Date();
        const todayDay = today.getDay();

        const targetDay = daysMap[dayName];

        let diff = targetDay - todayDay;

        if (diff <= 0) diff += 7; // next week

        const nextDate = new Date();
        nextDate.setDate(today.getDate() + diff);

        return nextDate;
    };

    useEffect(() => {
        if (formData.frequency === "monthly" && formData.repaymentDay) {
            setFormData((prev) => ({
                ...prev,
                repaymentDay: "",
            }));
        }
    }, [formData.frequency]);


    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        CAF (Credit Application Form)
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Maintain CAF details in the existing loan module UI style.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-md text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div
                ref={dropdownRef}
                className="bg-white p-5 mb-4 rounded-xl border border-gray-200 shadow-sm relative"
            >
                <label className="text-sm font-medium text-gray-700">
                    Select Customer <span className="text-red-500">*</span>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Agent
                        </label>
                        {isFieldExecutive ? (
                            <div className="bg-gray-100 rounded-md px-3 py-2 text-sm border border-gray-300 text-gray-700 flex items-center">
                                {agents.find((a) => a.agent_unique_id === selectedAgent)?.name ||
                                    agents.find((a) => a.agent_unique_id === selectedAgent)?.agent_name ||
                                    "Your Agent"}
                            </div>
                        ) : (
                            <select
                                value={selectedAgent}
                                onChange={(e) => {
                                    const newAgent = e.target.value;
                                    setSelectedAgent(newAgent);
                                    setCustomerSearch("");
                                    setSelectedCustomer(null);
                                    setSelectedCustomerId("");
                                    clearFieldError("customer");
                                    fetchUsers("", newAgent);
                                }}
                                className={`${inputClass} text-sm`}
                            >
                                <option value="">All Agents</option>
                                {agents.map((agent) => (
                                    <option
                                        key={agent.agent_unique_id || agent.id}
                                        value={agent.agent_unique_id}
                                    >
                                        {agent.name || agent.agent_name || "Unknown"} ({agent.agent_unique_id})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Select Customer <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Search customer by name, ID or email..."
                            value={
                                selectedCustomer
                                    ? [
                                        `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
                                        selectedCustomer.enrollment_number &&
                                        `(${selectedCustomer.enrollment_number})`,
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                    : customerSearch
                            }
                            ref={(el) => setFieldRef("customer", el)}
                            readOnly={!!selectedCustomer || !!preselectedCustomerUniqueId}
                            onFocus={() => {
                                if (!selectedCustomer && !preselectedCustomerUniqueId) {
                                    setShowDropdown(true);
                                    fetchUsers("");
                                }
                            }}
                            onChange={(e) => {
                                if (preselectedCustomerUniqueId) return;
                                const value = e.target.value;

                                setCustomerSearch(value);
                                setSelectedCustomer(null);
                                setSelectedCustomerId("");
                                clearFieldError("customer");

                                if (value.trim()) {
                                    setShowDropdown(true);
                                    fetchUsers(value);
                                } else {
                                    setShowDropdown(false);
                                }
                            }}
                            className={fieldErrorClass(
                                "customer",
                                `${inputClass} ${selectedCustomer ? "bg-gray-100 cursor-not-allowed" : ""}`
                            )}
                        />
                    </div>
                </div>
                {fieldErrors.customer && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.customer}</p>
                )}
                {selectedCustomer && !preselectedCustomerUniqueId && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCustomer(null);
                            setSelectedCustomerId("");
                            setCustomerSearch("");
                            clearFieldError("customer");
                        }}
                        className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                        Change Customer
                    </button>
                )}
                {preselectedCustomerUniqueId && selectedCustomer && (
                    <p className="mt-2 text-xs text-purple-600 font-medium">
                        Customer pre-selected from existing customer flow. Customer cannot be changed.
                    </p>
                )}

                {/* Dropdown */}
                {showDropdown && !selectedCustomer && (
                    <div className="absolute z-50 mt-1 w-[98%] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">

                        {loading && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                Loading customers…
                            </div>
                        )}

                        {!loading && customers.length === 0 && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No customers found
                            </div>
                        )}

                        {!loading &&
                            customers.map((c: any) => (
                                <div
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCustomer(c);
                                        setSelectedCustomerId(c.id);
                                        if (c.agent_unique_id) {
                                            setSelectedAgent(c.agent_unique_id);
                                        }
                                        setCustomerSearch("");
                                        setShowDropdown(false);
                                        clearFieldError("customer");
                                        // Auto-fill some fields if needed
                                        updateField("bankFirstName", c.first_name || "");
                                        updateField("bankLastName", c.last_name || "");
                                        setResolvedEnrollmentNumber(c.enrollment_number || null);
                                    }}
                                    className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b last:border-0"
                                >
                                    <div className="font-medium text-gray-800">
                                        {c.first_name} {c.last_name}
                                        ({c.customer_unique_id})
                                        {c.source_type === "re_enrollment" && c.enrollment_number
                                            ? ` - Enrollment No -  ${c.enrollment_number}`
                                            : ""}
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        {c.contact_number_1 || c.email}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {selectedCustomer && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Customer Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

                            <div>
                                <span className="text-gray-500 block">Name</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Customer ID</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.customer_unique_id || selectedCustomer.enrollment_number}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Mobile</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.contact_number_1}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Email</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.email || "-"}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Service Area</span>
                                <span className="font-medium text-gray-800">
                                    {selectedCustomer.service_area_pin || "-"}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block">Status</span>
                                <span className={`font-semibold ${selectedCustomer.status === "active"
                                    ? "text-green-600"
                                    : "text-red-600"
                                    }`}>
                                    {selectedCustomer.status}
                                </span>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <SectionCard title="Credit Type">
                    <div className="max-w-sm">
                        <label className="text-sm text-gray-700 mb-1 block">
                            Select Type <span className="text-red-500">*</span>
                        </label>
                        {readOnly ? (
                            <ReadonlyValue
                                value={
                                    formData.creditMode
                                        ? formData.creditMode === "product"
                                            ? "Product"
                                            : "Cash"
                                        : ""
                                }
                            />
                        ) : (
                            <select
                                value={formData.creditMode}
                                onChange={(e) =>
                                    updateField("creditMode", e.target.value as CreditMode)
                                }
                                ref={(el) => setFieldRef("creditMode", el)}
                                className={fieldErrorClass("creditMode")}
                            >
                                <option value="">Select Product / Cash</option>
                                <option value="product">Product</option>
                                <option value="cash">Cash</option>
                            </select>
                        )}
                        {fieldErrors.creditMode && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.creditMode}</p>
                        )}
                    </div>
                </SectionCard>

                {formData.creditMode && (
                    <>
                        <SectionCard title="Credit Applied Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Credit Applied For {formData.creditMode === "cash" ? <span className="text-red-500">*</span> : null}
                                    </label>
                                    {readOnly || formData.creditMode === "product" ? (
                                        <ReadonlyValue value={formData.creditAppliedFor} />
                                    ) : (
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.creditAppliedFor}
                                            onChange={(e) => {
                                                updateField("creditAppliedFor", e.target.value);
                                            }}
                                            ref={(el) => setFieldRef("creditAppliedFor", el)}
                                            className={fieldErrorClass("creditAppliedFor")}
                                            placeholder="Credit Applied Amount"
                                        />
                                    )}
                                    {fieldErrors.creditAppliedFor && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.creditAppliedFor}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Down Payment
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.down_payment} />
                                    ) : (
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.down_payment}
                                            disabled={formData.creditMode === "cash"}
                                            onChange={(e) => {
                                                updateField("down_payment", e.target.value);
                                            }}
                                            ref={(el) => setFieldRef("down_payment", el)}
                                            className={`${fieldErrorClass("down_payment")} ${formData.creditMode === "cash"
                                                ? "bg-gray-100 cursor-not-allowed"
                                                : ""
                                                }`}
                                            placeholder="Down Payment"
                                        />
                                    )}
                                    {fieldErrors.down_payment && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.down_payment}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Discount
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.discount} />
                                    ) : (
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.discount}
                                            disabled={formData.creditMode === "cash"}
                                            onChange={(e) => {
                                                updateField("discount", e.target.value);
                                            }}
                                            ref={(el) => setFieldRef("discount", el)}
                                            className={`${fieldErrorClass("discount")} ${formData.creditMode === "cash"
                                                ? "bg-gray-100 cursor-not-allowed"
                                                : ""
                                                }`}
                                            placeholder="Discount"
                                        />
                                    )}
                                    {fieldErrors.discount && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.discount}</p>
                                    )}
                                </div>

                                {formData.creditMode === "product" && (
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <div className="space-y-3">
                                            {selectedProducts.map((sp, idx) => {
                                                const hasVariantAttributes = sp.product_details?.attribute_definitions?.length > 0;
                                                const allVariantSelected = hasVariantAttributes
                                                    ? sp.product_details.attribute_definitions.every(
                                                        (attr: any) => Boolean(sp.product_attributes?.[attr.attribute_name])
                                                    )
                                                    : true;
                                                const showProductInfo = !hasVariantAttributes || allVariantSelected;

                                                return (
                                                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-xs text-gray-500 mb-1 block font-medium">Product</label>
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={sp.product_name} />
                                                                ) : (
                                                                    <select
                                                                        value={sp.product_code}
                                                                        onChange={(e) => {
                                                                            const p = catalogProducts.find((prod: any) => prod.product_unique_id === e.target.value);
                                                                            if (!p) return;
                                                                            const hasVariantAttributes = Array.isArray(p.attribute_definitions) && p.attribute_definitions.length > 0;
                                                                            const updated = selectedProducts.map((item: any, i: number) => i === idx ? {
                                                                                ...item,
                                                                                product_name: p.product_name,
                                                                                product_code: p.product_unique_id,
                                                                                product_details: p,
                                                                                product_attributes: {},
                                                                                stock: p.stock || 0,
                                                                                available_stock: hasVariantAttributes ? 0 : (p.stock_details?.[0]?.quantity ?? p.stock ?? 0),
                                                                                product_quantity: "1",
                                                                                credit_applied_for: hasVariantAttributes ? "" : String(p.selling_price || ""),
                                                                            } : item);
                                                                            setSelectedProducts(updated);
                                                                            const dp = String(formData.down_payment);
                                                                            const discount = String(formData.discount);
                                                                            updateField("creditAppliedFor", getNetCreditAppliedFor(updated, dp, discount));
                                                                        }}
                                                                        className={inputClass}
                                                                    >
                                                                        <option value="">Select Product</option>
                                                                        {catalogProducts.map((p: any) => (
                                                                            <option key={p.product_id} value={p.product_unique_id}>
                                                                                {p.product_name} ({p.product_unique_id})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500 mb-1 block font-medium">Quantity</label>
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={sp.product_quantity} />
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={sp.available_stock > 0 ? sp.available_stock : undefined}
                                                                        disabled={!!(sp.product_details && sp.available_stock === 0 && !hasProductDetailsVariantDefinitions(sp))}
                                                                        value={sp.product_quantity}
                                                                        onChange={(e) => {
                                                                            const qty = Math.min(Math.max(1, parseInt(e.target.value) || 1), sp.available_stock > 0 ? sp.available_stock : Infinity);
                                                                            const hasVariantAttributes = (sp.product_details?.attribute_definitions?.length ?? 0) > 0;
                                                                            const variantAttributesSelected = hasVariantAttributes
                                                                                ? areAllVariantAttributesSelected(sp.product_details.attribute_definitions, sp.product_attributes || {})
                                                                                : true;
                                                                            const sellingPrice = sp.variant_selling_price || sp.product_details?.selling_price || 0;
                                                                            const newCreditAmount = variantAttributesSelected
                                                                                ? String(sellingPrice * qty)
                                                                                : "";
                                                                            const updated = selectedProducts.map((item, i) => i === idx ? { ...item, product_quantity: String(qty), credit_applied_for: newCreditAmount } : item);
                                                                            setSelectedProducts(updated);
                                                                            const dp = String(formData.down_payment);
                                                                            const discount = String(formData.discount);
                                                                            updateField("creditAppliedFor", getNetCreditAppliedFor(updated, dp, discount));
                                                                        }}
                                                                        className={inputClass}
                                                                        placeholder="Qty"
                                                                    />
                                                                )}

                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500 mb-1 block font-medium">Credit Amount (₹)</label>
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={sp.credit_applied_for} />
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        value={sp.credit_applied_for}
                                                                        disabled
                                                                        onChange={(e) => {
                                                                            const updated = selectedProducts.map((item: any, i: number) => i === idx ? { ...item, credit_applied_for: e.target.value } : item);
                                                                            setSelectedProducts(updated);
                                                                            const dp = String(formData.down_payment);
                                                                            const discount = String(formData.discount);
                                                                            updateField("creditAppliedFor", getNetCreditAppliedFor(updated, dp, discount));
                                                                        }}
                                                                        className={inputClass}
                                                                        placeholder="Amount"
                                                                    />
                                                                )}
                                                            </div>
                                                            {sp.product_details?.attribute_definitions?.map((attr: any) => {
                                                                const validCombos = getValidCombinations(sp.product_details?.stock_details || []);
                                                                return (
                                                                    <div key={attr.attribute_id}>
                                                                        <label className="text-xs text-gray-500 mb-1 block font-medium">{attr.attribute_name}</label>
                                                                        <select
                                                                            value={sp.product_attributes?.[attr.attribute_name] || ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;

                                                                                const attrDefs =
                                                                                    sp.product_details?.attribute_definitions || [];

                                                                                const currentIndex = attrDefs.findIndex(
                                                                                    (a: any) => a.attribute_name === attr.attribute_name
                                                                                );

                                                                                const newAttrs: Record<string, string> = {
                                                                                    ...(sp.product_attributes || {}),
                                                                                    [attr.attribute_name]: value,
                                                                                };

                                                                                attrDefs.forEach((a: any, index: number) => {
                                                                                    if (index > currentIndex) {
                                                                                        delete newAttrs[a.attribute_name];
                                                                                    }
                                                                                });

                                                                                const stockDetails =
                                                                                    sp.product_details?.stock_details || [];

                                                                                let availableStock = sp.product_details?.stock || 0;
                                                                                let variantPrice = sp.product_details?.selling_price || 0;

                                                                                const allSelected = attrDefs.every(
                                                                                    (a: any) => newAttrs[a.attribute_name]
                                                                                );

                                                                                const updated = selectedProducts.map((item, i) => {
                                                                                    if (i !== idx) return item;

                                                                                    if (allSelected) {
                                                                                        availableStock = getSelectedVariantStock(stockDetails, newAttrs);
                                                                                        variantPrice = getSelectedVariantPrice(stockDetails, newAttrs) || sp.product_details?.selling_price || 0;
                                                                                        const qty = parseInt(String(sp.product_quantity)) || 1;
                                                                                        const newCreditAmount = availableStock > 0 ? String(variantPrice * qty) : "";

                                                                                        return {
                                                                                            ...item,
                                                                                            product_attributes: newAttrs,
                                                                                            available_stock: availableStock,
                                                                                            product_quantity: String(qty),
                                                                                            variant_selling_price: variantPrice,
                                                                                            credit_applied_for: newCreditAmount,
                                                                                        };
                                                                                    }

                                                                                    return {
                                                                                        ...item,
                                                                                        product_attributes: newAttrs,
                                                                                        available_stock: availableStock,
                                                                                        product_quantity: "1",
                                                                                        variant_selling_price: 0,
                                                                                        credit_applied_for: "",
                                                                                    };
                                                                                });

                                                                                setSelectedProducts(updated);
                                                                                updateField("creditAppliedFor", getNetCreditAppliedFor(updated, String(formData.down_payment), String(formData.discount)));
                                                                            }}
                                                                            className={inputClass}
                                                                        >
                                                                            <option value="">Select {attr.attribute_name}</option>
                                                                            {(attr.values || []).map((val: string) => {
                                                                                const available = isOptionAvailable(attr.attribute_name, val, sp.product_attributes || {}, validCombos);
                                                                                return (
                                                                                    <option key={val} value={val} disabled={!available}
                                                                                        style={!available ? { color: "#9ca3af" } : {}}>
                                                                                        {val}{!available ? " (out of stock)" : ""}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>

                                                                    </div>

                                                                );

                                                            })}
                                                            {sp.product_details && showProductInfo && (
                                                                <div className="md:col-span-3 text-xs text-gray-500 flex gap-4 flex-wrap bg-white rounded p-2 border border-gray-100">
                                                                    <span>SKU: <b>{sp.product_details.product_sku_code}</b></span>
                                                                    <span>Price: <b className={`text-green-700`}>{sp.variant_selling_price ?? sp.product_details.selling_price}</b></span>
                                                                    <span>Total Stock: <b className="text-blue-700">{sp.product_details.stock}</b></span>{sp.available_stock !== undefined && <span>Variant Stock: <b className={sp.available_stock > 0 ? "text-green-700" : "text-red-600"}>{sp.available_stock}</b></span>}
                                                                    {sp.product_details.gst_percent > 0 && <span>GST: <b>{sp.product_details.gst_percent}%</b></span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!readOnly && selectedProducts.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = selectedProducts.filter((_: any, i: number) => i !== idx);
                                                                    setSelectedProducts(updated);
                                                                    const dp = String(formData.down_payment);
                                                                    const discount = String(formData.discount);
                                                                    updateField("creditAppliedFor", getNetCreditAppliedFor(updated, dp, discount));
                                                                }}
                                                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded"
                                                            >
                                                                Remove
                                                            </button>

                                                        )}
                                                        <div className="mt-2 text-end">
                                                            <button
                                                                type="button"
                                                                className="px-3 py-1  text-xs bg-blue-500 text-white border-blue-500  rounded hover:bg-blue-600 duration-200"
                                                                onClick={() => {
                                                                    const updated = selectedProducts.map((item, i) =>
                                                                        i === idx
                                                                            ? {
                                                                                  ...item,
                                                                                  product_attributes: {},
                                                                                  available_stock: item.product_details?.stock || 0,
                                                                                  product_quantity: "1",
                                                                                  variant_selling_price: 0,
                                                                                  credit_applied_for: hasProductDetailsVariantDefinitions(item) ? "" : item.credit_applied_for,
                                                                              }
                                                                            : item
                                                                    );
                                                                    setSelectedProducts(updated);
                                                                    const dp = String(formData.down_payment);
                                                                    const discount = String(formData.discount);
                                                                    updateField("creditAppliedFor", getNetCreditAppliedFor(updated, dp, discount));
                                                                }}
                                                            >
                                                                Reset Variant
                                                            </button>
                                                        </div>
                                                    </div>
                                            );
                                        })}
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProducts((prev: any[]) => [...prev, { product_name: "", product_code: "", product_quantity: "1", credit_applied_for: "", product_attributes: {}, product_details: null, stock: 0 }])}
                                                className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    + Add Another Product
                                                </button>
                                            )}

                                            {selectedProducts.length > 0 && (
                                                <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                                                    <span className="text-gray-600 font-medium">Total Credit Applied</span>
                                                    <span className="font-bold text-blue-700 text-base">₹{selectedProducts.reduce((sum: number, p: any) => sum + (parseFloat(p.credit_applied_for) || 0), 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Frequency">
                            <div className="flex flex-wrap gap-6 rounded-md bg-gray-50 px-3 py-3">
                                {[
                                    ["monthly", "Monthly"],
                                    ["weekly", "Weekly"],
                                    ["biweekly", "Biweekly / Fortnightly"],
                                ].map(([value, label]) => (
                                    <label
                                        key={value}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="radio"
                                            className={radioClass}
                                            checked={effectiveFrequency === value}
                                            //OLD
                                            // disabled={
                                            //     readOnly ||
                                            //     (formData.creditMode === "product" && value === "monthly")
                                            // }

                                            //NEW
                                            disabled={readOnly}
                                            onChange={() =>
                                                handleFrequencyChange(value as FrequencyOption)
                                            }
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Repayment Day">
                            <div className="max-w-sm">
                                <label className="text-sm text-gray-700 mb-1 block">
                                    Select Day {formData.frequency === "monthly" ? null : <span className="text-red-500">*</span>}
                                </label>

                                <select
                                    value={formData.repaymentDay || ""}
                                    onChange={(e) =>
                                        updateField("repaymentDay", e.target.value)
                                    }
                                    disabled={formData.frequency === "monthly"}
                                    className={`${inputClass} ${formData.frequency === "monthly"
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                        }`}
                                >
                                    <option value="">Select Day</option>
                                    <option value="monday">Monday</option>
                                    <option value="tuesday">Tuesday</option>
                                    <option value="wednesday">Wednesday</option>
                                    <option value="thursday">Thursday</option>
                                    <option value="friday">Friday</option>
                                    {/* <option value="saturday">Saturday</option> */}
                                    {/* <option value="sunday">Sunday</option> */}
                                </select>
                            </div>
                        </SectionCard>
                        {formData.frequency === "monthly" && (
                            <p className="text-xs text-gray-400 mt-1">
                                Repayment day not required for monthly frequency
                            </p>
                        )}

                        <SectionCard title="Tenure">
                            <div className="rounded-md bg-gray-50 px-3 py-3">
                                {effectiveFrequency === "monthly" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* //OLD */}
                                        {/* {(["12 Month", "18 Month"] as const).map((option) => (
                                            <label
                                                key={option}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="tenureOption"
                                                    className={radioClass}
                                                    checked={effectiveTenureOption === option}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField("tenureOption", option)
                                                    }
                                                />
                                                {option}
                                            </label>
                                        ))} */}

                                        {/* //NEW */}
                                        {([
                                            "6 Month",
                                            "7 Month",
                                            "8 Month",
                                            "9 Month",
                                            "10 Month",
                                            "11 Month",
                                            "12 Month",
                                            "13 Month",
                                            "14 Month",
                                            "15 Month",
                                            "16 Month",
                                            "17 Month",
                                            "18 Month",
                                            "19 Month",
                                            "20 Month",
                                            "21 Month",
                                            "22 Month",
                                            "23 Month",
                                            "24 Month"
                                        ] as const).map((option) => (
                                            <label
                                                key={option}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="tenureOption"
                                                    className={radioClass}
                                                    checked={effectiveTenureOption === option}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField("tenureOption", option)
                                                    }
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="max-w-sm">
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            {effectiveFrequency === "weekly"
                                                ? "Week"
                                                : "Bi-week"}
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={effectiveTenureOption} />
                                        ) : (
                                            <select
                                                value={effectiveTenureOption}
                                                onChange={(e) =>
                                                    updateField(
                                                        "tenureOption",
                                                        e.target.value as TenureOption
                                                    )
                                                }
                                                className={inputClass}
                                            >
                                                {Array.from({ length: 25 }, (_, index) => {
                                                    const count = index + 1;
                                                    const label = `${count
                                                        } ${effectiveFrequency === "weekly" ? "Week" : "Bi-week"}`;

                                                    return (
                                                        <option key={label} value={label}>
                                                            {label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        )}
                                    </div>
                                )}
                                {readOnly && (
                                    <div className="mt-3">
                                        <ReadonlyValue value={effectiveTenureOption} />
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* <SectionCard title="Repayment Schedule">
                            <div className="text-sm space-y-1 max-h-40 overflow-auto">
                                {!formData.repaymentDay ? (
                                    <p className="text-gray-400">Select repayment day</p>
                                ) : (
                                    generateSchedule().map((date, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span>Installment {i + 1}</span>
                                            <span>{date}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </SectionCard> */}

                        <SectionCard title="Household Income">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Applicant Type <span className="text-red-500">*</span>
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                            {[
                                                ["qualifying", "Annual income up to 3 lakh (Qualifying)"],
                                                ["nonQualifying", "Annual income above 3 lakh (Non-qualifying)"],
                                            ].map(([value, label]) => (
                                                <label
                                                    key={value}
                                                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        className={radioClass}
                                                        checked={formData.applicantType === value}
                                                        disabled={readOnly}
                                                        onChange={() =>
                                                            updateField(
                                                                "applicantType",
                                                                value as ApplicantType
                                                            )
                                                        }
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Applicant / Spouse / Nominee Income <span className="text-red-500">*</span>
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.applicantIncome} />
                                        ) : (
                                            <input
                                                type="number"
                                                step="any"
                                                value={formData.applicantIncome}
                                                onChange={(e) =>
                                                    updateField("applicantIncome", e.target.value)
                                                }
                                                ref={(el) => setFieldRef("applicantIncome", el)}
                                                className={fieldErrorClass("applicantIncome")}
                                                placeholder="Applicant / Spouse / Nominee Income"
                                            />
                                        )}
                                        {fieldErrors.applicantIncome && (
                                            <p className="mt-1 text-xs text-red-600">{fieldErrors.applicantIncome}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Income Sources <span className="text-red-500">*</span>
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3">
                                            {readOnly ? (
                                                <ReadonlyValue
                                                    value={(
                                                        ["business", "agriculture", "wages"] as IncomeSourceKey[]
                                                    )
                                                        .filter((key) => formData.incomeSources[key])
                                                        .map((key) => incomeSourceLabels[key])
                                                        .join(", ")}
                                                />
                                            ) : (
                                                <div
                                                    className={`flex flex-wrap gap-4 ${fieldErrors.incomeSources ? "border border-red-500 rounded-md bg-red-50/50 px-3 py-2" : ""}`}
                                                    ref={(el) => setFieldRef("incomeSources", el as HTMLElement)}
                                                    tabIndex={-1}
                                                >
                                                    {(
                                                        ["business", "agriculture", "wages"] as IncomeSourceKey[]
                                                    ).map((key) => (
                                                        <label
                                                            key={key}
                                                            className="flex items-center gap-2 text-sm text-gray-700"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                                checked={formData.incomeSources[key]}
                                                                onChange={() => toggleIncomeSource(key)}
                                                            />
                                                            {incomeSourceLabels[key]}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                            {fieldErrors.incomeSources && (
                                                <p className="mt-1 text-xs text-red-600">{fieldErrors.incomeSources}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm text-gray-700 mb-2 block">
                                            Other Sources
                                        </label>
                                        <div className="rounded-md bg-gray-50 px-3 py-3">
                                            {readOnly ? (
                                                <ReadonlyValue
                                                    value={(
                                                        [
                                                            "rental",
                                                            "pension",
                                                            "bankDeposits",
                                                        ] as IncomeSourceKey[]
                                                    )
                                                        .filter((key) => formData.incomeSources[key])
                                                        .map((key) => incomeSourceLabels[key])
                                                        .join(", ")}
                                                />
                                            ) : (
                                                <div className="flex flex-wrap gap-4">
                                                    {(
                                                        [
                                                            "rental",
                                                            "pension",
                                                            "bankDeposits",
                                                        ] as IncomeSourceKey[]
                                                    ).map((key) => (
                                                        <label
                                                            key={key}
                                                            className="flex items-center gap-2 text-sm text-gray-700"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                                checked={formData.incomeSources[key]}
                                                                onChange={() => toggleIncomeSource(key)}
                                                            />
                                                            {incomeSourceLabels[key]}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Other Sources Income
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.otherSourcesIncome} />
                                        ) : (
                                            <input
                                                type="number"
                                                step="any"
                                                value={formData.otherSourcesIncome}
                                                onChange={(e) =>
                                                    updateField(
                                                        "otherSourcesIncome",
                                                        e.target.value
                                                    )
                                                }
                                                ref={(el) => setFieldRef("otherSourcesIncome", el)}
                                                className={fieldErrorClass("otherSourcesIncome")}
                                                placeholder="Other Sources Income"
                                            />
                                        )}
                                        {fieldErrors.otherSourcesIncome && (
                                            <p className="mt-1 text-xs text-red-600">{fieldErrors.otherSourcesIncome}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Specify With Proof
                                        </label>
                                        {readOnly ? (
                                            <ReadonlyValue value={formData.incomeProofName} />
                                        ) : (
                                            <>
                                                <input
                                                    type="file"
                                                    className={`${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
                                                    onChange={(e) =>
                                                        handleFileChange(
                                                            "incomeProof",
                                                            e.target.files?.[0] || null,
                                                            "Income proof"
                                                        )
                                                    }
                                                />
                                                {incomeProofPreview && (
                                                    <div className="mt-2">
                                                        <img src={incomeProofPreview} alt="Income proof" className="h-28 object-contain rounded border" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {renderTextField(
                                        "familyDependents",
                                        "Number of Family Members Dependent",
                                        "Number of Family Members Dependent",
                                        true
                                    )}
                                    <div>

                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Total Income (Yearly Auto calculation)
                                        </label>
                                        <ReadonlyValue value={String(totalIncome)} />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Expense Details">
                            <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-300 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Expense Details
                                            </th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Monthly
                                            </th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">
                                                Yearly
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Object.keys(expenseLabels) as ExpenseKey[]).map((key) => (
                                            <tr key={key}>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {expenseLabels[key]}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {readOnly ? (
                                                        <ReadonlyValue value={formData.expenses[key].monthly} />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={formData.expenses[key].monthly}
                                                            onChange={(e) =>
                                                                updateExpense(key, "monthly", e.target.value)
                                                            }
                                                            className={tableCellInputClass}
                                                            placeholder="Monthly"
                                                        />
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {readOnly ? (
                                                        <ReadonlyValue value={formData.expenses[key].yearly} />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={formData.expenses[key].yearly}
                                                            onChange={(e) =>
                                                                updateExpense(key, "yearly", e.target.value)
                                                            }
                                                            className={tableCellInputClass}
                                                            placeholder="Yearly"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-2">
                                                Travel Expense
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {readOnly ? (
                                                    <ReadonlyValue value={formData.travelExpense} />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.travelExpense}
                                                        onChange={(e) =>
                                                            updateField("travelExpense", e.target.value)
                                                        }
                                                        className={tableCellInputClass}
                                                        placeholder="Monthly"
                                                    />
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                <ReadonlyValue
                                                    value={
                                                        formData.travelExpense
                                                            ? String(
                                                                toNumber(formData.travelExpense) * 12
                                                            )
                                                            : "Yearly"
                                                    }
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-300 px-4 py-2">
                                                Other Obligations
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {readOnly ? (
                                                    <ReadonlyValue value={formData.otherObligations} />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.otherObligations}
                                                        onChange={(e) =>
                                                            updateField(
                                                                "otherObligations",
                                                                e.target.value
                                                            )
                                                        }
                                                        className={tableCellInputClass}
                                                        placeholder="Monthly"
                                                    />
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                <ReadonlyValue
                                                    value={
                                                        formData.otherObligations
                                                            ? String(
                                                                toNumber(
                                                                    formData.otherObligations
                                                                ) * 12
                                                            )
                                                            : "Yearly"
                                                    }
                                                />
                                            </td>
                                        </tr>
                                        <tr className="bg-gray-50 font-semibold text-gray-800">
                                            <td className="border border-gray-300 px-4 py-2">Total</td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalMonthlyExpenses}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalYearlyExpenses}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>

                        <SectionCard title="Other Obligation Details">
                            {!readOnly && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addObligationRow}
                                        className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Add Row
                                    </button>
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <table
                                    ref={(el) => setFieldRef("obligationRows", el as unknown as HTMLElement)}
                                    tabIndex={-1}
                                    className={`min-w-full border border-gray-300 text-sm ${fieldErrors.obligationRows ? "border-red-500" : ""}`}
                                >
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {[
                                                "Company Name",
                                                "Credit Type",
                                                "Credit Amount",
                                                "EMI Amount",
                                                "Mode of Repayment",
                                                "EMI / EWI / EFI",
                                            ].map((heading) => (
                                                <th
                                                    key={heading}
                                                    className="border border-gray-300 px-4 py-2 text-left"
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                            {!readOnly && (
                                                <th className="border border-gray-300 px-4 py-2 text-left">
                                                    Action
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.obligationRows.map((row, index) => (
                                            <tr key={`obligation-${index}`}>
                                                {(
                                                    [
                                                        "companyName",
                                                        "creditType",
                                                        "creditAmount",
                                                        "emiAmount",
                                                        "repaymentMode",
                                                        "installmentAmount",
                                                    ] as (keyof ObligationRow)[]
                                                ).map((field) => (
                                                    <td
                                                        key={field}
                                                        className="border border-gray-300 px-4 py-2"
                                                    >
                                                        {readOnly ? (
                                                            <ReadonlyValue value={row[field]} />
                                                        ) : field === "repaymentMode" ? (
                                                            <select
                                                                value={row.repaymentMode}
                                                                onChange={(e) =>
                                                                    updateObligationRow(
                                                                        index,
                                                                        "repaymentMode",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={tableCellInputClass}
                                                            >
                                                                <option value="monthly">Monthly</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="biweekly">Biweekly / Fortnightly</option>
                                                            </select>
                                                        ) : field === "installmentAmount" ? (
                                                            <input
                                                                type="number"
                                                                value={row.installmentAmount}
                                                                readOnly
                                                                disabled
                                                                className={`${tableCellInputClass} bg-gray-100 cursor-not-allowed`}
                                                                placeholder="Monthly Equivalent"
                                                            />
                                                        ) : (
                                                            <input
                                                                type={
                                                                    field === "creditAmount" || field === "emiAmount"
                                                                        ? "number"
                                                                        : "text"
                                                                }
                                                                value={row[field]}
                                                                onChange={(e) =>
                                                                    updateObligationRow(
                                                                        index,
                                                                        field,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={tableCellInputClass}
                                                                placeholder={field}
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                                {!readOnly && (
                                                    <td className="border border-gray-300 px-4 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeObligationRow(index)}
                                                            className="px-3 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-semibold text-gray-800">
                                            <td className="border border-gray-300 px-4 py-2" colSpan={2}>
                                                Total
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalObligationAmount}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalEmiAmount}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">-</td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {totalInstallmentAmount}
                                            </td>
                                            {!readOnly && (
                                                <td className="border border-gray-300 px-4 py-2">-</td>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>
                                {fieldErrors.obligationRows && (
                                    <p className="mt-2 text-xs text-red-600">{fieldErrors.obligationRows}</p>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard title="Net Surplus">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Net Surplus (A - B) / 12
                                    </label>
                                    <ReadonlyValue value={netSurplus.toFixed(2)} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                A = Total Household Income (Yearly)
                            </p>

                            <p className="text-xs text-gray-500">
                                B = Total Yearly Expenses + Loan Obligations
                            </p>
                        </SectionCard>

                        {formData.creditMode !== "product" && <SectionCard title="Business Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Business Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["shopBased", "Shop Based"],
                                            ["homeBased", "Home Based"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.businessType === value}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField(
                                                            "businessType",
                                                            value as BusinessMode
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Name <span className="text-red-500">*</span>
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessNature} />
                                    ) : (
                                        <select
                                            value={businessNameOptions.includes(formData.businessNature) ? formData.businessNature : (formData.businessNature ? "Other" : "")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "Other") {
                                                    updateField("businessNature", "");
                                                } else {
                                                    updateField("businessNature", val);
                                                }
                                            }}
                                            ref={(el) => setFieldRef("businessNature", el)}
                                            className={fieldErrorClass("businessNature")}
                                        >
                                            <option value="">Select Business Name</option>
                                            {businessNameOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {fieldErrors.businessNature && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.businessNature}</p>
                                    )}
                                </div>
                                {(!businessNameOptions.includes(formData.businessNature) || formData.businessNature === "Other") && !readOnly && (
                                    <div>
                                        <label className="text-sm text-gray-700 mb-1 block">
                                            Specify Other Business
                                        </label>
                                        <input
                                            value={formData.businessNature}
                                            onChange={(e) => updateField("businessNature", e.target.value)}
                                            ref={(el) => setFieldRef("businessNature", el)}
                                            className={fieldErrorClass("businessNature")}
                                            placeholder="Enter your business name"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Entitled <span className="text-red-500">*</span>
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["proprietor", "Proprietor"],
                                            ["partnership", "Partnership"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.entitled === value}
                                                    disabled={readOnly}
                                                    onChange={() => {
                                                        if (value === "partnership") {
                                                            toast.error("If you select 'Partnership' as the business type, this application will not proceed further.");
                                                            return;
                                                        }
                                                        updateField("entitled", value as EntitledOption)
                                                    }
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {formData.entitled === "partnership" && (
                                    <div className="lg:col-span-3 mt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-semibold text-gray-700">Partner Details</h3>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={addPartnerRow}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                >
                                                    Add Partner
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table
                                                ref={(el) => setFieldRef("partners", el as unknown as HTMLElement)}
                                                tabIndex={-1}
                                                className={`min-w-full border border-gray-300 text-sm ${fieldErrors.partners ? "border-red-500" : ""}`}
                                            >
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="border border-gray-300 px-3 py-2 text-left">Partner Name</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left">Phone No</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left">Address</th>
                                                        {!readOnly && <th className="border border-gray-300 px-3 py-2 text-center text-red-500">Action</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(formData.partners || []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={readOnly ? 3 : 4} className="text-center py-4 text-gray-500">No partners added</td>
                                                        </tr>
                                                    )}
                                                    {(formData.partners || []).map((partner, index) => (
                                                        <tr key={index}>
                                                            <td className="border border-gray-300 p-1">
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={partner.name} />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        className={tableCellInputClass}
                                                                        value={partner.name}
                                                                        placeholder="Name"
                                                                        onChange={(e) => updatePartnerField(index, "name", e.target.value)}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="border border-gray-300 p-1">
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={partner.phone} />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        className={tableCellInputClass}
                                                                        value={partner.phone}
                                                                        placeholder="Phone"
                                                                        onChange={(e) => updatePartnerField(index, "phone", e.target.value)}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="border border-gray-300 p-1">
                                                                {readOnly ? (
                                                                    <ReadonlyValue value={partner.address} />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        className={tableCellInputClass}
                                                                        value={partner.address}
                                                                        placeholder="Address"
                                                                        onChange={(e) => updatePartnerField(index, "address", e.target.value)}
                                                                    />
                                                                )}
                                                            </td>
                                                            {!readOnly && (
                                                                <td className="border border-gray-300 p-1 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removePartnerRow(index)}
                                                                        className="bg-red-500 text-white rounded p-1 hover:bg-red-600"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {fieldErrors.partners && (
                                                <p className="mt-2 text-xs text-red-600">{fieldErrors.partners}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="lg:col-span-2">
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Address <span className="text-red-500">*</span>
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessAddress} />
                                    ) : (
                                        <textarea
                                            value={formData.businessAddress}
                                            onChange={(e) =>
                                                updateField("businessAddress", e.target.value)
                                            }
                                            ref={(el) => setFieldRef("businessAddress", el as HTMLElement)}
                                            className={`${fieldErrorClass("businessAddress")} min-h-24`}
                                            placeholder="Business Address"
                                        />
                                    )}
                                    {fieldErrors.businessAddress && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.businessAddress}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 mb-2 block">
                                        Owned / Rented <span className="text-red-500">*</span>
                                    </label>
                                    <div className="rounded-md bg-gray-50 px-3 py-3 flex flex-wrap gap-4">
                                        {[
                                            ["owned", "Owned"],
                                            ["rented", "Rented"],
                                        ].map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="radio"
                                                    className={radioClass}
                                                    checked={formData.businessOwnership === value}
                                                    disabled={readOnly}
                                                    onChange={() =>
                                                        updateField(
                                                            "businessOwnership",
                                                            value as BusinessOwnership
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {renderTextField("businessVintage", "Business Vintage (Years)", "Business Vintage (Years)", true)}
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Photo <span className="text-red-500">*</span>
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessPhotoName} />
                                    ) : (
                                        <input
                                            type="file"
                                            ref={(el) => setFieldRef("businessPhotoName", el)}
                                            className={fieldErrorClass(
                                                "businessPhotoName",
                                                `${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`
                                            )}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    "businessPhoto",
                                                    e.target.files?.[0] || null,
                                                    "Business photo",
                                                    e.currentTarget
                                                )
                                            }
                                        />
                                    )}
                                    {businessPhotoPreview && (
                                        <div className="mt-2">
                                            <img src={businessPhotoPreview} alt="Business photo" className="h-28 object-contain rounded border" />
                                        </div>
                                    )}
                                    {fieldErrors.businessPhotoName && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.businessPhotoName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Business Proof <span className="text-red-500">*</span>
                                    </label>
                                    {readOnly ? (
                                        <ReadonlyValue value={formData.businessProofName} />
                                    ) : (
                                        <input
                                            type="file"
                                            ref={(el) => setFieldRef("businessProofName", el)}
                                            className={fieldErrorClass(
                                                "businessProofName",
                                                `${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`
                                            )}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    "businessProof",
                                                    e.target.files?.[0] || null,
                                                    "Business proof",
                                                    e.currentTarget
                                                )
                                            }
                                        />
                                    )}
                                    {businessProofPreview && (
                                        <div className="mt-2">
                                            <img src={businessProofPreview} alt="Business proof" className="h-28 object-contain rounded border" />
                                        </div>
                                    )}
                                    {fieldErrors.businessProofName && (
                                        <p className="mt-1 text-xs text-red-600">{fieldErrors.businessProofName}</p>
                                    )}
                                </div>

                                <div className="md:col-span-2 lg:col-span-3 space-y-3">
                                    <h3 className="text-md font-semibold text-green-700">Reference Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 1 Name (Other than blood relatives or any relatives)
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference1Name} />
                                            ) : (
                                                <input
                                                    value={formData.reference1Name}
                                                    onChange={(e) => updateField("reference1Name", e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Enter name"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 1 Contact
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference1Contact} />
                                            ) : (
                                                <input
                                                    value={formData.reference1Contact}
                                                    onChange={(e) => updateField("reference1Contact", sanitizePhone(e.target.value))}
                                                    className={inputClass}
                                                    maxLength={10}
                                                    placeholder="Enter contact"
                                                />
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 1 Address
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference1Address} />
                                            ) : (
                                                <textarea
                                                    value={formData.reference1Address}
                                                    onChange={(e) => updateField("reference1Address", e.target.value)}
                                                    className={`${inputClass} min-h-24`}
                                                    placeholder="Enter address"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 2 Name (Other than blood relatives or any relatives)
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference2Name} />
                                            ) : (
                                                <input
                                                    value={formData.reference2Name}
                                                    onChange={(e) => updateField("reference2Name", e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Enter name"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 2 Contact
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference2Contact} />
                                            ) : (
                                                <input
                                                    value={formData.reference2Contact}
                                                    onChange={(e) => updateField("reference2Contact", sanitizePhone(e.target.value))}
                                                    className={inputClass}
                                                    maxLength={10}
                                                    placeholder="Enter contact"
                                                />
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm text-gray-700 mb-1 block">
                                                Reference 2 Address
                                            </label>
                                            {readOnly ? (
                                                <ReadonlyValue value={formData.reference2Address} />
                                            ) : (
                                                <textarea
                                                    value={formData.reference2Address}
                                                    onChange={(e) => updateField("reference2Address", e.target.value)}
                                                    className={`${inputClass} min-h-24`}
                                                    placeholder="Enter address"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SectionCard>}

                        {formData.creditMode !== "product" && <SectionCard title="Bank A/C Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {renderTextField("bankFirstName", "First Name", "First Name", true)}
                                {renderTextField("bankMiddleName", "Middle Name")}
                                {renderTextField("bankLastName", "Last Name", "Last Name", true)}
                                {renderTextField("bankName", "Bank Name", "Bank Name", true)}
                                {renderTextField("accountNumber", "Account Number", "Account Number", true)}
                                {renderTextField("ifscCode", "IFSC Code", "IFSC Code", true)}
                                <div>
                                    <label className="text-sm text-gray-700 mb-1 block">
                                        Passbook Image <span className="text-red-500">*</span>
                                    </label>

                                    {readOnly ? (
                                        <ReadonlyValue value={formData.passbookImageName} />
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                ref={(el) => setFieldRef("passbookImageName", el)}
                                                className={fieldErrorClass(
                                                    "passbookImageName",
                                                    `${inputClass} bg-white file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`
                                                )}
                                                onChange={(e) =>
                                                    handleFileChange(
                                                        "passbookImage",
                                                        e.target.files?.[0] || null,
                                                        "Passbook image",
                                                        e.currentTarget
                                                    )
                                                }
                                            />

                                            {fieldErrors.passbookImageName && (
                                                <p className="mt-1 text-xs text-red-600">
                                                    {fieldErrors.passbookImageName}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </SectionCard>}

                        {!readOnly && (
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={requestSubmitConfirmation}
                                    className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? "Processing..." : isEdit ? "Update CAF" : "Submit CAF"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showSubmitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Confirm {isEdit ? "Update" : "Submit"}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to {isEdit ? "update" : "submit"} this CAF?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setShowSubmitConfirm(false)}
                                className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? "Submitting..." : "Yes, Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingRemoveIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Confirm Remove
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to remove this obligation row?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPendingRemoveIndex(null)}
                                className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRemoveObligationRow}
                                className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

