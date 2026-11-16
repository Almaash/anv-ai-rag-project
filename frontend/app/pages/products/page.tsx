"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Package,
  Search,
  ShieldCheck,
  Truck,
  RotateCcw,
} from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

type ProductAttribute = {
  attribute_id: number;
  attribute_name: string;
  values: string[];
};

type VariantOption = {
  attribute_summary: string;
  available_stock: number;
  variant_price?: number;
  purchase_price?: number;
  gst_percent?: number;
};

type Product = {
  product_unique_id: string;
  product_name: string;
  category_name?: string;
  brand_name?: string;
  description?: string | null;
  product_images?: string[] | string | null;
  selling_price: number;
  stock?: number;
  branch?: string;
  branch_id?: string;
  cms_admin_id?: string;
  attributes?: ProductAttribute[];
  variant_options?: VariantOption[];
};

const productDetailsCache = new Map<string, Product>();
const productDetailsInFlight = new Map<string, Promise<Product | null>>();

const fetchProductById = async (productId: string): Promise<Product | null> => {
  if (!productId) return null;

  const cached = productDetailsCache.get(productId);
  if (cached) return cached;

  const inFlight = productDetailsInFlight.get(productId);
  if (inFlight) return inFlight;

  const request = axiosInstance
    .get(`${ProjectApiList.LOAN_PRODUCT_ORDER_CATALOG}/${productId}`)
    .then((res) => {
      const product =
        res.data?.success && res.data?.data ? (res.data.data as Product) : null;
      if (product?.product_unique_id) {
        productDetailsCache.set(product.product_unique_id, product);
      }
      return product;
    })
    .finally(() => {
      productDetailsInFlight.delete(productId);
    });

  productDetailsInFlight.set(productId, request);
  return request;
};

type Branch = {
  id: number;
  name?: string;
  code?: string;
  branch_name?: string;
};

type ParsedVariant = {
  attrs: Record<string, string>;
  variant: VariantOption;
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#199A95]"></div></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProductId = searchParams.get("id");
  const isDetailsMode = Boolean(selectedProductId);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductDetails, setSelectedProductDetails] =
    useState<Product | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fetchedProductIdRef = useRef<string | null>(null);

  const getFullImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${IMAGE_BASE_URL.replace(/\/$/, "")}${cleanPath}`;
  };

  const getProductImages = (product: Product): string[] => {
    if (!product?.product_images) return [];
    if (Array.isArray(product.product_images)) return product.product_images;
    if (typeof product.product_images === "string") {
      try {
        const parsed = JSON.parse(product.product_images);
        return Array.isArray(parsed) ? parsed : [product.product_images];
      } catch {
        return [product.product_images];
      }
    }
    return [];
  };

  useEffect(() => {
    const fetchBranches = async () => {
      if (isDetailsMode) {
        setBranches([]);
        return;
      }

      try {
        const res = await axiosInstance.get(ProjectApiList.GET_PUBLIC_BRANCHES);
        const rows = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data?.data)
            ? res.data.data.data
            : Array.isArray(res.data?.data)
              ? res.data.data
              : [];
        setBranches(rows);
      } catch {
        setBranches([]);
      }
    };

    fetchBranches();
  }, [isDetailsMode]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (isDetailsMode) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const endpoint =
          selectedBranchId !== "all"
            ? `${ProjectApiList.LOAN_READY_PRODUCT_CATALOG}?branch_id=${selectedBranchId}`
            : ProjectApiList.LOAN_READY_PRODUCT_CATALOG;

        const res = await axiosInstance.get(endpoint);
        if (res.data?.success) {
          setProducts(res.data?.data?.products || []);
          return;
        }

        if (Array.isArray(res.data?.data)) {
          setProducts(res.data.data);
          return;
        }

        setProducts([]);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isDetailsMode, selectedBranchId]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category_name).filter(Boolean));
    return ["All", ...Array.from(cats)] as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = (p.product_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category_name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.product_unique_id === selectedProductId),
    [products, selectedProductId],
  );

  const activeProduct = selectedProductDetails || selectedProduct || null;

  const selectedBranchCode = useMemo(() => {
    if (selectedBranchId === "all") return "";
    const branch = branches.find(
      (b) => String(b.id) === String(selectedBranchId),
    );
    return branch?.code || "";
  }, [branches, selectedBranchId]);

  const parsedVariants = useMemo(() => {
    if (!activeProduct?.variant_options?.length) return [] as ParsedVariant[];

    return activeProduct.variant_options.map((variant) => {
      const attrs: Record<string, string> = {};
      const parts = String(variant.attribute_summary || "").split(" | ");
      parts.forEach((part) => {
        const [name, value] = part.split(":").map((s) => s?.trim());
        if (name && value && name.toLowerCase() !== "default") {
          attrs[name] = value;
        }
      });
      return { attrs, variant };
    });
  }, [activeProduct]);

  useEffect(() => {
    if (!parsedVariants.length || !activeProduct?.attributes?.length) return;

    // find lowest price variant
    const lowest = [...parsedVariants].sort((a, b) => {
      const priceA =
        a.variant.variant_price ||
        a.variant.purchase_price ||
        activeProduct.selling_price ||
        0;

      const priceB =
        b.variant.variant_price ||
        b.variant.purchase_price ||
        activeProduct.selling_price ||
        0;

      return priceA - priceB;
    })[0];

    if (lowest) {
      setSelectedVariants(lowest.attrs);
    }
  }, [parsedVariants, activeProduct]);

  const selectedVariantData = useMemo(() => {
    if (!activeProduct?.attributes?.length) return null;
    const totalAttrs = activeProduct.attributes.length;
    const selectedCount =
      Object.values(selectedVariants).filter(Boolean).length;
    if (selectedCount < totalAttrs) return null;

    return (
      parsedVariants.find(({ attrs }) =>
        Object.entries(selectedVariants).every(
          ([key, value]) =>
            (attrs[key] || "").toUpperCase() === String(value).toUpperCase(),
        ),
      ) || null
    );
  }, [activeProduct, selectedVariants, parsedVariants]);

  useEffect(() => {
    setSelectedVariants({});
    setSelectedProductDetails(null);
    if (!selectedProductId) {
      fetchedProductIdRef.current = null;
    }
  }, [selectedProductId]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!selectedProductId) return;
      if (fetchedProductIdRef.current === selectedProductId) return;

      try {
        setLoading(true);
        const product = await fetchProductById(selectedProductId);
        if (product) {
          setSelectedProductDetails(product);
          fetchedProductIdRef.current = selectedProductId;
        } else {
          setSelectedProductDetails(null);
        }
      } catch {
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [selectedProductId]);

  const currentPrice = useMemo(() => {
    if (!activeProduct) return 0;
    const variantSell = Number(
      selectedVariantData?.variant?.variant_price ?? 0,
    );
    if (variantSell > 0) return Math.round(variantSell);
    const productSell = Number(activeProduct.selling_price ?? 0);
    if (productSell > 0) return Math.round(productSell);
    const variantBuy = Number(
      selectedVariantData?.variant?.purchase_price ?? 0,
    );
    if (variantBuy > 0) return Math.round(variantBuy);
    return Math.round(Number(activeProduct.selling_price || 0));
  }, [activeProduct, selectedVariantData]);

  const selectedVariantOutOfStock = useMemo(() => {
    if (!selectedVariantData) return false;
    return Number(selectedVariantData.variant?.available_stock || 0) <= 0;
  }, [selectedVariantData]);

  const formattedDescription = useMemo(() => {
    if (!activeProduct?.description) return [];
    return activeProduct.description
      .split(/[.\n;]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 4);
  }, [activeProduct]);

  const additionalDetails = useMemo(() => {
    if (!activeProduct) return [] as Array<{ label: string; value: string }>;

    const details = [
      { label: "Category", value: activeProduct.category_name || "N/A" },
      { label: "Brand", value: activeProduct.brand_name || "N/A" },
      // { label: "Product ID", value: activeProduct.product_unique_id || "N/A" },
      // {
      //   label: "Branch",
      //   value:
      //     activeProduct.branch ||
      //     activeProduct.branch_id ||
      //     (selectedBranchId === "all"
      //       ? "All Branches"
      //       : selectedBranchCode || "N/A"),
      // },
    ];

    return details.filter((item) => String(item.value).trim().length > 0);
  }, [activeProduct, selectedBranchCode, selectedBranchId]);

  const handleProductClick = (uniqueId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", uniqueId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const closeDetails = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleVariantSelect = (attrName: string, value: string) => {
    setSelectedVariants((prev) => {
      // if already selected → unselect
      if (prev[attrName] === value) {
        const updated = { ...prev };
        delete updated[attrName];
        return updated;
      }

      // else select
      return { ...prev, [attrName]: value };
    });
  };

  const getShortDescription = (desc?: string | null) => {
    if (!desc) return "";

    return desc
      .split(/[.\n|]/) // split by dot / newline / ||
      .map((d) => d.trim())
      .filter(Boolean)[0] // take first meaningful line
      ?.slice(0, 80); // limit length
  };

  const openContactModal = () => {
    setSubmitStatus(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    if (!customerData.name || !customerData.phone) {
      setSubmitStatus({
        type: "error",
        message: "Name and phone are required.",
      });
      return;
    }

    if (activeProduct.attributes?.length && !selectedVariantData) {
      setSubmitStatus({
        type: "error",
        message: "Please select all variant options first.",
      });
      return;
    }

    if (selectedVariantOutOfStock) {
      setSubmitStatus({
        type: "error",
        message: "Selected variant is out of stock.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitStatus(null);

      const storedCmsAdminId =
        localStorage.getItem("cms_admin_id") ||
        localStorage.getItem("cms_admin") ||
        "0";
      const branchIdForSave =
        activeProduct.branch ||
        activeProduct.branch_id ||
        selectedBranchCode ||
        "";
      const selectedVariantSell = Number(
        selectedVariantData?.variant?.variant_price ?? 0,
      );
      const selectedVariantBuy = Number(
        selectedVariantData?.variant?.purchase_price ?? 0,
      );
      const productSell = Number(activeProduct.selling_price ?? 0);
      const effectiveSellingPrice =
        selectedVariantSell > 0
          ? selectedVariantSell
          : productSell > 0
            ? productSell
            : selectedVariantBuy;

      const priceForSave = effectiveSellingPrice;
      const sellingPriceForSave = effectiveSellingPrice;
      const buyingPriceForSave = Number(
        selectedVariantData?.variant?.purchase_price ?? 0,
      );
      const selectedVariantLabel =
        selectedVariantData?.variant?.attribute_summary || null;

      await axiosInstance.post(ProjectApiList.PRODUCT_INQUIRY, {
        customer_name: customerData.name,
        customer_phone: customerData.phone,
        customer_email: customerData.email || null,
        product_id: activeProduct.product_unique_id,
        branch_id: branchIdForSave,
        cms_admin_id: activeProduct.cms_admin_id || storedCmsAdminId,
        price: priceForSave,
        selling_price: sellingPriceForSave,
        buying_price: buyingPriceForSave,
        selected_variant: selectedVariantLabel,
        attributes: selectedVariantData?.attrs || selectedVariants || null,
      });

      setSubmitStatus({
        type: "success",
        message: "Inquiry submitted successfully.",
      });
      toast.success("Inquiry submitted successfully");
      setCustomerData({ name: "", phone: "", email: "" });
    } catch {
      setSubmitStatus({ type: "error", message: "Failed to submit inquiry." });
      toast.error("Failed to submit inquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getListingPrice = (p: Product) => {
    if (p.variant_options?.length) {
      const prices = p.variant_options
        .map((v) => Number(v.variant_price || v.purchase_price || 0))
        .filter((price) => price > 0);

      if (prices.length) {
        return Math.min(...prices);
      }
    }

    return Number(p.selling_price || 0);
  };

  return (
    <>
      <Header />
      <div className="p-4 md:p-6 bg-white min-h-full">
        <div className="max-w-7xl mx-auto">
          {!isDetailsMode && (
            <div className="bg-white border-b py-2 px-1 md:px-2 sticky top-0 z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] text-slate-500">
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                  <span>Loan Products</span>
                  <span className="text-slate-300">&gt;</span>
                  <span className="text-[#00A9A5] font-medium">All Categories</span>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400">Branch:</span>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-[11px] font-bold text-slate-600"
                    >
                      <option value="all">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name || b.branch_name || b.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1 md:flex-none">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={12}
                    />
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="py-4">
            {activeProduct ? (
              <div className="pb-10">
                <button
                  onClick={closeDetails}
                  className="flex items-center gap-1 text-slate-400 hover:text-[#00A9A5] text-[12px] mb-4"
                >
                  <ArrowRight className="rotate-180" size={14} /> Back to Search
                </button>

                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="w-full lg:w-[58%]">
                    <div className="hidden lg:grid grid-cols-2 gap-2.5">
                      {getProductImages(activeProduct).map((img, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] overflow-hidden bg-slate-50"
                        >
                          <img
                            src={getFullImageUrl(img)}
                            alt={activeProduct.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-2 -mx-4 px-4">
                      {getProductImages(activeProduct).map((img, i) => (
                        <div
                          key={i}
                          className="min-w-[85vw] snap-center aspect-[3/4] bg-slate-50 overflow-hidden rounded-lg"
                        >
                          <img
                            src={getFullImageUrl(img)}
                            alt={activeProduct.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full lg:w-[42%] lg:sticky lg:top-[100px] h-fit">
                    <div className="mb-2">
                      <span className="text-[12px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#199A95]/10 text-[#199A95]">
                        {activeProduct.brand_name || "Premium Brand"}
                      </span>
                    </div>

                    <h1 className="text-2xl lg:text-3xl font-medium text-slate-800 mb-1 leading-tight">
                      {activeProduct.product_name}
                    </h1>
                    <p className="text-lg text-slate-400 mb-2 font-medium">
                      {activeProduct.category_name}
                    </p>

                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        Rs. {currentPrice.toLocaleString()}
                      </span>
                    </div>

                    {activeProduct.attributes &&
                      activeProduct.attributes.length > 0 && (
                        <div className="space-y-4 mb-5">
                          {activeProduct.attributes.map((attr) => (
                            <div key={attr.attribute_id}>
                              <p className="text-[11px] font-bold uppercase text-slate-400 mb-2 tracking-wider">
                                {attr.attribute_name}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {attr.values.map((val) => {
                                  const isSelected =
                                    (selectedVariants[attr.attribute_name] ||
                                      "") === val;
                                  return (
                                    <button
                                      key={val}
                                      onClick={() =>
                                        handleVariantSelect(
                                          attr.attribute_name,
                                          val,
                                        )
                                      }
                                      className={`h-10 px-4 rounded-full border text-[13px] font-semibold transition-all ${isSelected
                                        ? "border-[#199A95] bg-[#199A95] text-white shadow-sm"
                                        : "border-slate-200 text-slate-600 hover:border-[#199A95]/50"
                                        }`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {selectedVariantData ? (
                            <div className={`rounded-xl px-4 py-3 space-y-1.5 border ${selectedVariantOutOfStock ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Only Price */}
                                <span className={`text-[13px] font-semibold ${selectedVariantOutOfStock ? "text-red-700" : "text-emerald-700"}`}>
                                  Price: ₹{" "}
                                  {Number(
                                    (selectedVariantData.variant
                                      .variant_price ?? 0) > 0
                                      ? selectedVariantData.variant
                                        .variant_price
                                      : (activeProduct?.selling_price ?? 0) > 0
                                        ? activeProduct?.selling_price
                                        : (selectedVariantData.variant
                                          .purchase_price ?? 0),
                                  ).toLocaleString()}
                                </span>

                                <span className="text-slate-400 text-[11px]">
                                  |
                                </span>

                                {/* Stock */}
                                <span className={`text-[12px] font-semibold ${selectedVariantOutOfStock ? "text-red-600" : "text-emerald-700"}`}>
                                  {selectedVariantOutOfStock
                                    ? "Out of stock"
                                    : `${selectedVariantData.variant.available_stock} in stock`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12px] text-red-600 font-medium">
                              No matching variant found
                            </div>
                          )}

                          {parsedVariants.length > 0 ? (
                            <div className="mb-3 space-y-2">
                              {/* Simple Heading */}
                              <p className="text-[12px] font-semibold text-slate-600">
                                Available Variants
                              </p>

                              {parsedVariants.map(({ attrs, variant }, i) => {
                                const price =
                                  (variant.variant_price ?? 0) > 0
                                    ? variant.variant_price
                                    : (activeProduct?.selling_price ?? 0) > 0
                                      ? activeProduct?.selling_price
                                      : (variant.purchase_price ?? 0);
                                const isOut = Number(variant.available_stock || 0) <= 0;

                                return (
                                  <div
                                    key={`${variant.attribute_summary}-${i}`}
                                    className={`flex items-center justify-between border rounded-md px-3 py-2 ${isOut ? "bg-red-50 border-red-100" : "bg-white"}`}
                                  >
                                    {/* LEFT: Attributes */}
                                    <div>
                                      <div className={`text-[13px] ${isOut ? "text-red-700" : "text-slate-700"}`}>
                                        {Object.entries(attrs)
                                          .map(([, v]) => `${v}`)
                                          .join(" / ") || "Default"}
                                      </div>
                                      <div className={`text-[11px] font-semibold ${isOut ? "text-red-500" : "text-emerald-600"}`}>
                                        {isOut ? "Out of stock" : `${Number(variant.available_stock || 0)} in stock`}
                                      </div>
                                    </div>

                                    {/* RIGHT: Only Price */}
                                    <div className="text-[13px] font-semibold text-red-600">
                                      ₹ {Number(price).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mb-3 text-[12px] text-red-500 font-medium">
                              No matching variants found
                            </div>
                          )}

                          {!selectedVariantData &&
                            Object.values(selectedVariants).filter(Boolean)
                              .length > 0 ? (
                            <p className="text-[11px] text-amber-500 font-semibold">
                              Please select all options to continue
                            </p>
                          ) : !selectedVariantData ? (
                            <p className="text-[11px] text-slate-400">
                              Select options above to see price
                            </p>
                          ) : null}
                        </div>
                      )}

                    <div className="flex gap-4 mb-8">
                      <button
                        onClick={() => {
                          if (
                            activeProduct.attributes?.length &&
                            !selectedVariantData
                          ) {
                            toast.error(
                              "Please select all variant options first",
                            );
                            return;
                          }
                          if (selectedVariantOutOfStock) {
                            toast.error("Selected variant is out of stock");
                            return;
                          }
                          openContactModal();
                        }}
                        disabled={
                          !!(
                            (activeProduct.attributes?.length && !selectedVariantData) ||
                            selectedVariantOutOfStock
                          )
                        }
                        className="flex-1 py-4 bg-[#199A95] hover:bg-[#147C78] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold uppercase tracking-wider shadow-lg shadow-[#199A95]/20 transition-all"
                      >
                        Contact Field Executive
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-2 py-2 border-b border-slate-50">
                        <Truck size={16} className="text-[#199A95]" /> Fast
                        Delivery
                      </div>
                      <div className="flex items-center gap-2 py-2 border-b border-slate-50">
                        <ShieldCheck size={16} className="text-[#199A95]" />{" "}
                        Genuine Product
                      </div>
                      <div className="flex items-center gap-2 py-2 border-b border-slate-50">
                        <RotateCcw size={16} className="text-[#199A95]" /> 7 Day
                        Replacement
                      </div>
                      <div className="flex items-center gap-2 py-2 border-b border-slate-50">
                        <CheckCircle2 size={16} className="text-[#199A95]" />{" "}
                        Easy EMI Options
                      </div>
                    </div>

                    <div className="mt-10 border-t border-slate-100">
                      <h3 className="text-[14px] font-bold uppercase text-slate-800 mb-5 tracking-widest">
                        Product Details and Specs
                      </h3>

                      <div className="space-y-3">
                        {formattedDescription.length > 0 ? (
                          formattedDescription.map((line, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 text-[14px] text-slate-600 leading-relaxed"
                            >
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#199A95] shrink-0" />
                              <span>{line}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[14px] text-slate-500 italic">
                            No detailed specification available for this item.
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                        {additionalDetails.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-start justify-between gap-4 text-[13px]"
                          >
                            <span className="text-slate-400 font-semibold uppercase tracking-wide">
                              {item.label}
                            </span>
                            <span className="text-slate-700 font-medium text-right">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-8">
                <aside className="hidden lg:block w-48 shrink-0">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
                    Filter
                  </h3>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`block w-full text-left px-3 py-2 text-[13px] rounded ${selectedCategory === cat
                        ? "text-[#00A9A5] bg-slate-50 font-medium"
                        : "text-slate-500"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </aside>

                <div className="flex-1">
                  {loading ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="animate-spin text-[#00A9A5]" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
                      <p className="text-lg font-semibold text-slate-700">No products found</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Try changing branch, category, or search filters.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.product_unique_id}
                          onClick={() => handleProductClick(p.product_unique_id)}
                          className="group bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                          {/* IMAGE */}
                          <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                            {getProductImages(p)[0] ? (
                              <img
                                src={getFullImageUrl(getProductImages(p)[0])}
                                alt={p.product_name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="text-slate-300" />
                              </div>
                            )}

                            {/* PRICE BADGE */}
                            <div className="absolute bottom-3 left-3 bg-black/80 text-white text-[12px] px-3 py-1 rounded-full font-semibold">
                              ₹ {getListingPrice(p).toLocaleString()}
                            </div>
                          </div>

                          {/* CONTENT */}
                          <div className="p-4 flex flex-col gap-2">
                            {/* TITLE */}
                            <h4 className="font-semibold text-[14px] text-slate-800 line-clamp-2 leading-snug">
                              {p.product_name}
                            </h4>

                            {/* CATEGORY */}
                            <p className="text-[11px] text-[#199A95] font-medium">
                              {p.category_name}
                            </p>

                            {/* DESCRIPTION */}
                            <p className="text-[12px] text-slate-500 line-clamp-2 min-h-[34px]">
                              {getShortDescription(p.description) || "No description available"}
                            </p>

                            {/* VARIANTS */}
                            {p.variant_options && p.variant_options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.variant_options.slice(0, 3).map((v, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#199A95]/10 text-[#199A95] font-medium"
                                  >
                                    {v.attribute_summary
                                      .split(" | ")
                                      .map((s) => s.split(":")[1]?.trim())
                                      .filter(Boolean)
                                      .join(" / ")}
                                  </span>
                                ))}
                                {p.variant_options.length > 3 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                    +{p.variant_options.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* FOOTER */}
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-[13px] font-bold text-slate-900">
                                ₹ {getListingPrice(p).toLocaleString()}
                              </span>

                              {p.variant_options && p.variant_options.length > 1 && (
                                <span className="text-[10px] text-slate-400">
                                  {p.variant_options.length} options
                                </span>
                              )}
                            </div>

                            {/* BUTTON */}
                            <button className="mt-3 w-full py-2 text-[11px] font-bold uppercase rounded-lg bg-gradient-to-r from-[#199A95] to-[#147C78] text-white tracking-wide hover:opacity-90 transition">
                              View Details →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="bg-[#199A95] p-6 text-white relative">
                <h3 className="text-xl font-bold">Contact Field Executive</h3>
                <p className="text-[#E0F2F1] text-xs mt-1">
                  Fill in details to receive a call back.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
                >
                  <ArrowRight className="rotate-180" size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
                {submitStatus && (
                  <div
                    className={`p-4 rounded-lg text-sm flex items-center gap-3 ${submitStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-red-50 text-red-700 border border-red-100"
                      }`}
                  >
                    {submitStatus.type === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Info size={18} />
                    )}
                    {submitStatus.message}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      placeholder="Enter your name"
                      className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[#199A95] text-[14px]"
                      value={customerData.name}
                      onChange={(e) =>
                        setCustomerData({
                          ...customerData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      disabled={isSubmitting}
                      placeholder="Enter 10 digit number"
                      className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[#199A95] text-[14px]"
                      value={customerData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10)
                          setCustomerData({ ...customerData, phone: val });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      disabled={isSubmitting}
                      placeholder="Enter email id"
                      className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[#199A95] text-[14px]"
                      value={customerData.email}
                      onChange={(e) =>
                        setCustomerData({
                          ...customerData,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#199A95] hover:bg-[#147C78] disabled:bg-[#199A95]/60 text-white rounded-xl font-bold uppercase tracking-wider"
                  >
                    {isSubmitting ? (
                      <Loader2 size={20} className="animate-spin mx-auto" />
                    ) : (
                      "Submit Inquiry"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
