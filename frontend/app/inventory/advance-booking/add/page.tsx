"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, User, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

type VariantBatch = {
  purchase_item_id: string;
  attribute_summary: string;
  available_stock: number;
  tax_percent?: number;
  selling_price?: number;
};

type ProductSearchOption = {
  key: string;
  id: string;
  name: string;
  sku_code?: string;
  selling_price?: number;
  variant_batches: VariantBatch[];
  purchase_item_id: string | null;
  attribute_summary: string;
  current_stock: number;
  is_batch_option: boolean;
};

type OrderItemRow = {
  id: number;
  product_id: string | null;
  purchase_item_id: string | null;
  product_name: string;
  attribute_summary: string;
  quantity: number;
  price: number;
  sku: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  tax_type: "percentage" | "fixed";
  tax_value: number;
  default_tax_value: number;
  current_stock?: number;
  variant_batches?: VariantBatch[];
};

type StoredUserData = {
  [key: string]: unknown;
  branch_details?: { code?: string | null } | null;
  branch?: string | null;
  branch_id?: string | number | null;
  cms_admin?: string | number | null;
  id?: string | number | null;
};

const getStoredUserData = (): StoredUserData => {
  const parseStorageValue = (key: string): StoredUserData => {
    try {
      const value = localStorage.getItem(key);
      const parsed: unknown = value ? JSON.parse(value) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as StoredUserData
        : {};
    } catch (error) {
      console.error(`Failed to parse ${key}`, error);
      return {};
    }
  };

  const user = parseStorageValue("user");
  const userData = parseStorageValue("userData");

  return {
    ...userData,
    ...user,
    branch_details: user.branch_details ?? userData.branch_details,
    branch: user.branch ?? userData.branch,
    branch_id: user.branch_id ?? userData.branch_id,
    cms_admin: user.cms_admin ?? userData.cms_admin,
  };
};

export default function AddOrderPage() {
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageLoading, setPageLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"draft" | "final">("draft");
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Record<number, ProductSearchOption[]>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [cmsAdmin, setCmsAdmin] = useState<string>("");
  const [upiReferenceNo, setUpiReferenceNo] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [existingScreenshotUrl, setExistingScreenshotUrl] = useState<string>("");
  const [savedPaymentStatus, setSavedPaymentStatus] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [itemErrors, setItemErrors] = useState<Record<number, { product_name?: string; quantity?: string; variant?: string }>>({});

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    invoice_date: new Date().toISOString().split('T')[0],
    order_date: new Date().toISOString().split('T')[0],
    tax_type: "percentage",
    tax_value: 0,
    discount_type: "percentage",
    discount_value: 0,
    paid_amount: 0,
    payment_type: "Cash",
    notes: ""
  });

  const createEmptyItemRow = (): OrderItemRow => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    product_id: null,
    purchase_item_id: null,
    product_name: "",
    attribute_summary: "",
    quantity: 1,
    price: 0,
    sku: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    tax_type: "percentage" as "percentage" | "fixed",
    tax_value: 0,
    default_tax_value: 0,
  });

  const [items, setItems] = useState<OrderItemRow[]>([createEmptyItemRow()]);

  const toSafeNumber = (value: any): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const normalizeVariantBatches = (raw: any): VariantBatch[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((v: any) => ({
        purchase_item_id: String(v.purchase_item_id || ""),
        attribute_summary: String(v.attribute_summary || "Default"),
        available_stock: toSafeNumber(v.available_stock),
        tax_percent: v.tax_percent === undefined || v.tax_percent === null ? undefined : toSafeNumber(v.tax_percent),
        selling_price: v.selling_price !== undefined ? toSafeNumber(v.selling_price) : undefined,
      }))
      .filter((v: VariantBatch) => v.purchase_item_id.trim().length > 0);
  };

  const applyVariantSelection = (
    row: OrderItemRow,
    selectedPurchaseItemId: string | null
  ): OrderItemRow => {
    const variantBatches = row.variant_batches || [];
    if (!variantBatches.length) {
      return {
        ...row,
        purchase_item_id: null,
        attribute_summary: "",
      };
    }

    const selectedVariant =
      variantBatches.find((v) => String(v.purchase_item_id) === String(selectedPurchaseItemId)) ||
      variantBatches.find((v) => Number(v.available_stock) > 0) ||
      variantBatches[0];

    if (!selectedVariant) {
      return row;
    }

    const nextTax = selectedVariant.tax_percent;
    const nextPrice = selectedVariant.selling_price;

    return {
      ...row,
      purchase_item_id: selectedVariant.purchase_item_id,
      attribute_summary: selectedVariant.attribute_summary,
      current_stock: selectedVariant.available_stock,
      price: nextPrice !== undefined ? toSafeNumber(nextPrice) : row.price,
      tax_value: nextTax !== undefined ? nextTax : row.tax_value,
      default_tax_value: nextTax !== undefined ? nextTax : row.default_tax_value,
    };
  };

  // --- Strict 10-Digit Phone Validation ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setFormData({ ...formData, customer_phone: value });
      if (fieldErrors.customer_phone) {
        setFieldErrors((prev) => ({ ...prev, customer_phone: "" }));
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveSearchIdx(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const userData = getStoredUserData();
    const resolved = userData.cms_admin || userData.id || "";
    if (resolved) {
      setCmsAdmin(String(resolved));
    }
  }, []);


  const fetchCustomers = async (search = "") => {
    try {
      setCustomerLoading(true);

      const userData = getStoredUserData();

      const branchId =
        userData.branch_details?.code ||
        userData.branch ||
        userData.branch_id ||
        "";

      const cmsAdmin = userData.cms_admin || "";

      const agentUniqueId = userData.agent_unique_id || "";

      const status =
        userData.status ||
        "branch_support_executive";

      const res = await axiosInstance.get(
        ProjectApiList.api_getAllLonaCustomersWithoutPagination,
        {
          params: {
            search,
            per_page: 5,
            page: 1,
            branch_id: branchId,
            cms_admin_id: cmsAdmin,
            status,
            is_delete_requested: false,
            agent_unique_id: agentUniqueId,
          },
        }
      );

      if (res.data.success) {
        setCustomers(res.data.data || []);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error("Failed to fetch customers", error);
      setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(customerSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);


  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);

    setCustomerSearch(
      `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
    );

    setShowCustomerDropdown(false);

    setFormData(prev => ({
      ...prev,
      customer_name:
        `${customer.first_name ?? ""} ${customer.middle_name ?? ""} ${customer.last_name ?? ""}`.trim(),

      customer_phone:
        customer.contact_number_1 ||
        customer.phone_no ||
        "",

      customer_address:
        customer.correspondence_address ||
        customer.permanent_address ||
        "",
    }));
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const removeSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");

    setFormData((prev) => ({
      ...prev,
      customer_name: "",
      customer_phone: "",
      customer_address: "",
    }));

    setShowCustomerDropdown(false);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axiosInstance.get(ProjectApiList.GET_AVAILABLE_PRODUCTS);
        if (res.data.success) {
          setProducts(res.data.data || []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to load products", err);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!products.length) return;
    setItems((prev) =>
      prev.map((row) => {
        if (!row.product_id) return row;
        const product = products.find((p: any) => String(p.id) === String(row.product_id));
        if (!product) return row;

        const variantBatches = normalizeVariantBatches(product.variant_batches);
        const mapped: OrderItemRow = {
          ...row,
          sku: row.sku || product.sku_code || "",
          price: row.price || Number(product.selling_price) || 0,
          default_tax_value: row.default_tax_value || Number(product.tax?.rate ?? product.gst_percent ?? 0) || 0,
          tax_value: row.tax_value || Number(product.tax?.rate ?? product.gst_percent ?? 0) || 0,
          current_stock: toSafeNumber(product.current_stock),
          variant_batches: variantBatches,
        };

        if (!variantBatches.length) return mapped;
        return applyVariantSelection(mapped, row.purchase_item_id ?? null);
      })
    );
  }, [products]);

  // ?? Edit Mode: Fetch invoice data when id param is present
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setIsEditMode(true);
      fetchInvoiceData(id);
    }
  }, [searchParams]);

  const fetchInvoiceData = async (id: string) => {
    try {
      setPageLoading(true);
      const res = await axiosInstance.get(`${ProjectApiList.GET_ADVANCE_BOOKINGS}/${id}`);
      if (res.data.status === 'success' || res.data.success) {
        const invoice = res.data.data;

        // Populate form data
        setFormData({
          customer_name: invoice.customer_name || "",
          customer_phone: invoice.customer_phone || "",
          customer_address: invoice.customer_address || "",
          invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
          order_date: invoice.order_date || new Date().toISOString().split('T')[0],
          tax_type: invoice.tax_type || "percentage",
          tax_value: invoice.tax_value || 0,
          discount_type: invoice.discount_type || "percentage",
          discount_value: invoice.discount_value || 0,
          paid_amount: invoice.paid_amount || 0,
          payment_type: invoice.payment_method || "Cash",
          notes: invoice.notes || ""
        });
        setUpiReferenceNo(invoice.upi_reference_no || "");
        setSavedPaymentStatus(invoice.payment_status || "");
        // Load existing screenshot URL for preview
        if (invoice.payment_screenshot) {
          const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace("/api", "");
          setExistingScreenshotUrl(`${base}/storage/${invoice.payment_screenshot}`);
        }

        // Populate items (support multiple possible API keys)
        const invoiceItems = Array.isArray(invoice.items)
          ? invoice.items
          : Array.isArray(invoice.invoice_items)
            ? invoice.invoice_items
            : [];

        if (invoiceItems.length > 0) {
          setItems(invoiceItems.map((item: any, idx: number) => ({
            id: item.id || Date.now() + idx,
            product_id: item.product_id ?? null,
            purchase_item_id: item.purchase_item_id ?? null,
            product_name: item.product_name || item.product?.name || "",
            attribute_summary: item.attribute_summary || "",
            quantity: item.quantity === null || item.quantity === undefined ? 1 : toSafeNumber(item.quantity),
            price: toSafeNumber(item.price),
            sku: item.sku || item.product?.sku_code || "",
            discount_type: item.discount_type || "percentage",
            discount_value: toSafeNumber(item.discount_value),
            tax_type: item.tax_type || "percentage",
            tax_value: toSafeNumber(item.tax_value),
            default_tax_value: toSafeNumber(item.product?.tax?.rate ?? item.product?.gst_percent ?? item.tax_value),
            current_stock: item.current_stock ?? item.stock ?? item.product?.current_stock ?? undefined,
            variant_batches: normalizeVariantBatches(item.product?.variant_batches),
          })));
        } else {
          setItems([createEmptyItemRow()]);
          toast.warning("No product rows found for this invoice. Please add product items before updating.");
        }
      }
    } catch (err) {
      console.error("Failed to load invoice", err);
    } finally {
      setPageLoading(false);
    }
  };

  // --- Search Logic ---
  const handleSearch = (idx: number, query: string) => {
    const newItems = [...items];
    newItems[idx].product_name = query;
    newItems[idx].product_id = null;
    newItems[idx].purchase_item_id = null;
    newItems[idx].attribute_summary = "";
    newItems[idx].variant_batches = [];
    newItems[idx].current_stock = undefined;
    setItems(newItems);
    setActiveSearchIdx(idx);

    const allProducts = Array.isArray(products) ? products : [];
    const term = query.toLowerCase().trim();
    const visibleProducts = !term
      ? allProducts.slice(0, 15)
      : allProducts.filter(
        (p: any) =>
          (p.name || "").toLowerCase().includes(term) ||
          (p.sku_code || "").toLowerCase().includes(term)
      );

    const options: ProductSearchOption[] = [];
    visibleProducts.forEach((product: any) => {
      const batches = normalizeVariantBatches(product.variant_batches);
      if (batches.length > 0) {
        batches.forEach((batch) => {
          options.push({
            key: `${product.id}-${batch.purchase_item_id}`,
            id: String(product.id),
            name: String(product.name || ""),
            sku_code: product.sku_code,
            selling_price: Number(product.selling_price) || 0,
            variant_batches: batches,
            purchase_item_id: batch.purchase_item_id,
            attribute_summary: batch.attribute_summary,
            current_stock: toSafeNumber(batch.available_stock),
            is_batch_option: true,
          });
        });
        return;
      }

      options.push({
        key: `${product.id}-base`,
        id: String(product.id),
        name: String(product.name || ""),
        sku_code: product.sku_code,
        selling_price: Number(product.selling_price) || 0,
        variant_batches: [],
        purchase_item_id: null,
        attribute_summary: "",
        current_stock: toSafeNumber(product.current_stock),
        is_batch_option: false,
      });
    });

    setSearchResults((prev) => ({ ...prev, [idx]: options }));
  };

  const selectProduct = (idx: number, selected: ProductSearchOption) => {
    if (selected.current_stock <= 0) {
      toast.error("Product is out of stock!");
      return;
    }

    const sourceProduct = products.find((p: any) => String(p.id) === String(selected.id));
    const defaultTaxRate = Number(sourceProduct?.tax?.rate ?? sourceProduct?.gst_percent ?? 0) || 0;
    const variantBatches = normalizeVariantBatches(sourceProduct?.variant_batches);
    const selectedPurchaseItemId = selected.purchase_item_id ?? null;
    const selectedBatch = selectedPurchaseItemId
      ? variantBatches.find((v) => v.purchase_item_id === selectedPurchaseItemId)
      : null;

    const newItems = [...items];
    const updatedRow: OrderItemRow = {
      ...newItems[idx],
      product_id: selected.id,
      purchase_item_id: selectedPurchaseItemId,
      product_name: selected.name,
      attribute_summary: selectedBatch?.attribute_summary || selected.attribute_summary || "",
      price: Number(selected.selling_price) || 0,
      sku: selected.sku_code || "",
      discount_type: "percentage",
      discount_value: 0,
      tax_type: "percentage",
      tax_value: defaultTaxRate,
      default_tax_value: defaultTaxRate,
      current_stock: selected.current_stock,
      variant_batches: variantBatches,
    };

    newItems[idx] =
      variantBatches.length > 0
        ? applyVariantSelection(updatedRow, selectedPurchaseItemId)
        : updatedRow;

    setItems(newItems);
    if (itemErrors[idx]?.product_name) {
      setItemErrors((prev) => ({
        ...prev,
        [idx]: { ...prev[idx], product_name: undefined },
      }));
    }
    setActiveSearchIdx(null);
  };

  const handleVariantChange = (idx: number, purchaseItemIdRaw: string) => {
    const purchaseItemId = purchaseItemIdRaw || null;
    const next = [...items];
    next[idx] = applyVariantSelection(next[idx], purchaseItemId);
    setItems(next);
  };

  // Total Item-wise Calculations
  const total_items_subtotal = items.reduce((sum, item) => sum + (toSafeNumber(item.quantity) * toSafeNumber(item.price)), 0);
  const total_items_discount = items.reduce((sum, item) => {
    const item_total = toSafeNumber(item.quantity) * toSafeNumber(item.price);
    return sum + (item.discount_type === "percentage" ? (item_total * toSafeNumber(item.discount_value)) / 100 : toSafeNumber(item.discount_value));
  }, 0);
  const total_items_tax = items.reduce((sum, item) => {
    const item_total = toSafeNumber(item.quantity) * toSafeNumber(item.price);
    const item_disc = item.discount_type === "percentage" ? (item_total * toSafeNumber(item.discount_value)) / 100 : toSafeNumber(item.discount_value);
    return sum + (item.tax_type === "percentage" ? ((item_total - item_disc) * toSafeNumber(item.tax_value)) / 100 : toSafeNumber(item.tax_value));
  }, 0);

  const subtotal = items.reduce((sum, item) => {
    const item_total = toSafeNumber(item.quantity) * toSafeNumber(item.price);
    const item_disc = item.discount_type === "percentage" ? (item_total * toSafeNumber(item.discount_value)) / 100 : toSafeNumber(item.discount_value);
    const item_tax = item.tax_type === "percentage" ? ((item_total - item_disc) * toSafeNumber(item.tax_value)) / 100 : toSafeNumber(item.tax_value);
    return sum + (item_total - item_disc + item_tax);
  }, 0);

  const order_level_discount = (() => {
    const discountValue = toSafeNumber(formData.discount_value);
    if (discountValue <= 0) return 0;
    if (formData.discount_type === "percentage") {
      return Math.min((subtotal * discountValue) / 100, subtotal);
    }
    return Math.min(discountValue, subtotal);
  })();

  const total_discount = total_items_discount + order_level_discount;
  const net_total = Math.max(subtotal - order_level_discount, 0);

  // Auto-fill Payment Received only if not in Edit Mode or if user hasn't typed anything yet
  useEffect(() => {
    if (!isEditMode && net_total > 0) {
      setFormData(prev => ({ ...prev, paid_amount: net_total }));
    }
  }, [net_total, isEditMode]);

  const balance_due = net_total - toSafeNumber(formData.paid_amount);

  const addItem = () => setItems([...items, createEmptyItemRow()]);
  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
      setItemErrors({});
    }
  };

  const validateBeforeSave = () => {
    const newFieldErrors: { [key: string]: string } = {};
    const newItemErrors: Record<number, { product_name?: string; quantity?: string; variant?: string }> = {};

    if (!items.length) {
      toast.error("At least one product item is required");
      return false;
    }

    if (!formData.customer_name.trim()) {
      newFieldErrors.customer_name = "Customer name is required";
    }
    if (formData.customer_phone.length !== 10) {
      newFieldErrors.customer_phone = "10-digit phone number is required";
    }
    if (!formData.customer_address.trim()) {
      newFieldErrors.customer_address = "Billing address is required";
    }

    items.forEach((item, idx) => {
      const rowErrors: { product_name?: string; quantity?: string; variant?: string } = {};
      if (!item.product_id) {
        rowErrors.product_name = "Product is required";
      }
      if ((item.variant_batches?.length || 0) > 0 && !item.purchase_item_id) {
        rowErrors.variant = "Select product variant";
      }
      if (Number(item.quantity) <= 0) {
        rowErrors.quantity = "Quantity must be greater than 0";
      }
      if (rowErrors.product_name || rowErrors.quantity) {
        newItemErrors[idx] = rowErrors;
      }
    });

    setFieldErrors(newFieldErrors);
    setItemErrors(newItemErrors);

    if (Object.keys(newFieldErrors).length > 0 || Object.keys(newItemErrors).length > 0) {
      toast.error("Please fill required fields");
      return false;
    }

    const overStockItem = items.find(
      i => (i as any).current_stock !== undefined && Number(i.quantity) > Number((i as any).current_stock)
    );
    if (overStockItem) {
      const variantLabel = overStockItem.attribute_summary ? ` (${overStockItem.attribute_summary})` : "";
      toast.error(`Not enough stock for ${overStockItem.product_name}${variantLabel}. Available: ${(overStockItem as any).current_stock}`);
      return false;
    }

    return true;
  };

  const requestSave = (shouldPrint = false) => {
    if (!validateBeforeSave()) return;
    setConfirmAction(shouldPrint ? "final" : "draft");
    setShowConfirmModal(true);
  };

  const handleSave = async (shouldPrint = false) => {
    if (!validateBeforeSave()) return;

    try {
      setLoading(true);

      const formDataObj = new FormData();

      // Append basic form data
      formDataObj.append("customer_name", formData.customer_name);
      formDataObj.append("customer_phone", formData.customer_phone);
      formDataObj.append("customer_address", formData.customer_address);
      formDataObj.append("booking_date", formData.invoice_date || "");
      formDataObj.append("order_date", formData.invoice_date);
      formDataObj.append("tax_type", formData.tax_type);
      formDataObj.append("tax_value", formData.tax_value.toString());
      formDataObj.append("discount_type", formData.discount_type);
      formDataObj.append("discount_value", formData.discount_value.toString());
      formDataObj.append("paid_amount", formData.paid_amount.toString());
      formDataObj.append("payment_type", formData.payment_type);
      formDataObj.append("notes", formData.notes);
      if (cmsAdmin) {
        formDataObj.append("cms_admin", cmsAdmin);
      }

      // Add UPI fields always (not just when payment_type === "UPI")
      // so that existing UPI data is preserved on edit
      formDataObj.append("upi_reference_no", upiReferenceNo);
      if (paymentScreenshot) {
        formDataObj.append("payment_screenshot", paymentScreenshot);
      }

      // Append items as JSON or structured fields
      items.forEach((item, index) => {
        formDataObj.append(`items[${index}][product_id]`, (item.product_id || "").toString());
        formDataObj.append(`items[${index}][purchase_item_id]`, (item.purchase_item_id || "").toString());
        formDataObj.append(`items[${index}][product_name]`, item.product_name);
        formDataObj.append(`items[${index}][attribute_summary]`, item.attribute_summary || "");
        formDataObj.append(`items[${index}][quantity]`, item.quantity.toString());
        formDataObj.append(`items[${index}][price]`, item.price.toString());
        formDataObj.append(`items[${index}][discount_type]`, item.discount_type);
        formDataObj.append(`items[${index}][discount_value]`, item.discount_value.toString());
        formDataObj.append(`items[${index}][tax_type]`, item.tax_type);
        formDataObj.append(`items[${index}][tax_value]`, item.tax_value.toString());
      });

      const id = searchParams.get("id");
      const res = isEditMode && id
        ? await axiosInstance.post(`${ProjectApiList.GET_ADVANCE_BOOKINGS}/${id}?_method=PUT`, formDataObj, {
          headers: { "Content-Type": "multipart/form-data" }
        })
        : await axiosInstance.post(ProjectApiList.CREATE_ADVANCE_BOOKING, formDataObj, {
          headers: { "Content-Type": "multipart/form-data" }
        });

      if (res.data.status === 'success' || res.data.success) {
        toast.success(isEditMode ? "Advance Booking Updated Successfully!" : "Advance Booking Saved Successfully!");
        if (shouldPrint) {
          router.push(`/inventory/advance-booking/print?id=${res.data.data.id || id}`);
        } else {
          router.push("/inventory/advance-booking/list");
        }
      }
    } catch (err: any) {
      toast.error(isEditMode ? "Failed to update advance booking" : "Failed to save advance booking");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="h-full bg-[#F9FBFC] font-sans text-slate-900 flex flex-col">
      <div className="sticky top-0 z-30 bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={pageLoading}><ArrowLeft size={18} /></Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-800">{isEditMode ? "Edit Advance Booking" : "Create Advance Booking"}</h1>
            {pageLoading && <Loader2 size={16} className="animate-spin text-blue-600" />}
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400">DATE: {formData.order_date}</div>
      </div>

      <main className="w-full mx-auto px-6 pt-6 pb-4 flex-1 min-h-0">
        {pageLoading ? (
          <div className="h-full flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-xs font-bold uppercase tracking-widest italic animate-pulse">Loading advance booking details...</p>
          </div>
        ) : (
          <div className="h-full pr-2 pt-1 space-y-6">

            <div ref={customerDropdownRef}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Select Customer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Search by name, phone or customer ID
                  </p>
                </div>
              </div>

              <div className="relative">
                <Input
                  value={customerSearch}
                  placeholder="🔍 Search customer..."
                  className="h-11 rounded-xl border-slate-200 pr-10"
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />

                {showCustomerDropdown && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">

                    {customerLoading ? (
                      <div className="flex items-center justify-center py-8 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading customers...
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        No customers found
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {customers.map((customer) => (
                          <button
                            type="button"
                            key={customer.id}
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full text-left p-4 border-b last:border-b-0 hover:bg-blue-50 transition"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-slate-800">
                                  {customer.first_name} {customer.middle_name}{" "}
                                  {customer.last_name}
                                </h4>

                                <p className="text-xs text-slate-500 mt-1">
                                  📞 {customer.contact_number_1 || "N/A"}
                                </p>

                                <p className="text-xs text-slate-500">
                                  🆔 {customer.customer_unique_id}
                                </p>
                              </div>

                              <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                                {customer.verification_status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {selectedCustomer.first_name}{" "}
                        {selectedCustomer.middle_name}{" "}
                        {selectedCustomer.last_name}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Customer Selected for Booking
                      </p>
                    </div>

                    <div className="flex items-center gap-2">

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        {selectedCustomer.verification_status}
                      </span>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeSelectedCustomer}
                        className="text-red-800"
                      >
                        Remove
                      </Button>

                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

                    <div>
                      <p className="text-slate-500 text-xs">Customer ID</p>
                      <p className="font-semibold">
                        {selectedCustomer.customer_unique_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs">Enrollment</p>
                      <p className="font-semibold">
                        {selectedCustomer.enrollment_number}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs">Phone</p>
                      <p className="font-semibold">
                        {selectedCustomer.contact_number_1 || "-"}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-slate-500 text-xs">Address</p>
                      <p className="font-semibold">
                        {selectedCustomer.correspondence_address ||
                          selectedCustomer.permanent_address ||
                          "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs">Email</p>
                      <p className="font-semibold">
                        {selectedCustomer.email || "-"}
                      </p>
                    </div>

                  </div>
                </div>
              )}
            </div>
            {/* CUSTOMER DETAILS - FULL WIDTH */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative text-left">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-2xl" />
              <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-6">
                <User size={14} /> Booking Customer Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className={`text-[11px] font-bold uppercase ${fieldErrors.customer_name ? "text-red-500" : "text-slate-500"}`}>Customer Name <span className="text-red-500">*</span></Label>
                  <Input
                    className={`h-11 border rounded-xl bg-slate-50/50 ${fieldErrors.customer_name ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500 transition-all focus:bg-white"}`}
                    placeholder="Enter Name"
                    value={formData.customer_name}
                    onChange={e => {
                      setFormData({ ...formData, customer_name: e.target.value });
                      if (fieldErrors.customer_name) {
                        setFieldErrors((prev) => ({ ...prev, customer_name: "" }));
                      }
                    }}
                  />
                  {fieldErrors.customer_name && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.customer_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-[11px] font-bold uppercase ${fieldErrors.customer_phone ? "text-red-500" : "text-slate-500"}`}>Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    className={`h-11 border rounded-xl bg-slate-50/50 ${fieldErrors.customer_phone ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500 transition-all focus:bg-white"}`}
                    maxLength={10}
                    placeholder="10 Digit Mobile"
                    value={formData.customer_phone}
                    onChange={handlePhoneChange}
                  />
                  {fieldErrors.customer_phone && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.customer_phone}</p>}
                </div>
                <div className="md:col-span-2 lg:col-span-1 space-y-1.5">
                  <Label className={`text-[11px] font-bold uppercase ${fieldErrors.customer_address ? "text-red-500" : "text-slate-500"}`}>Customer Address <span className="text-red-500">*</span></Label>
                  <textarea
                    className={`min-h-[44px] w-full border rounded-xl bg-slate-50/50 p-2 text-sm ${fieldErrors.customer_address ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500 transition-all focus:bg-white"} outline-none`}
                    placeholder="Full Address"
                    rows={1}
                    value={formData.customer_address}
                    onChange={e => {
                      setFormData({ ...formData, customer_address: e.target.value });
                      if (fieldErrors.customer_address) {
                        setFieldErrors((prev) => ({ ...prev, customer_address: "" }));
                      }
                    }}
                  />
                  {fieldErrors.customer_address && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.customer_address}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className={`text-[11px] font-bold uppercase ${fieldErrors.invoice_date ? "text-red-500" : "text-slate-500"}`}>Booking Date</Label>
                  <Input
                    type="date"
                    className={`h-11 border rounded-xl bg-slate-50/50 ${fieldErrors.invoice_date ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500 transition-all focus:bg-white"}`}
                    value={formData.invoice_date || ""}
                    onChange={e => {
                      setFormData({ ...formData, invoice_date: e.target.value });
                      if (fieldErrors.invoice_date) {
                        setFieldErrors((prev) => ({ ...prev, invoice_date: "" }));
                      }
                    }}
                  />
                  {fieldErrors.invoice_date && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.invoice_date}</p>}
                </div>
              </div>
            </div>

            {/* ORDER ITEMS - FULL WIDTH */}
            <div className={`bg-white rounded-2xl border shadow-sm overflow-visible ${Object.keys(itemErrors).length > 0 ? "border-red-200" : "border-slate-200"}`}>
              <div className="p-5 border-b flex justify-between items-center bg-slate-50/30 rounded-t-2xl">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <PlusCircle size={14} className="text-blue-500" /> Booking Items <span className="text-red-500">*</span>
                </h3>
                <Button onClick={addItem} variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold border rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 uppercase tracking-wider transition-all active:scale-95">
                  <Plus size={14} className="mr-1.5" /> Add Item
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {items.map((item, idx) => {
                  const item_total = toSafeNumber(item.quantity) * toSafeNumber(item.price);
                  const item_disc = item.discount_type === "percentage" ? (item_total * toSafeNumber(item.discount_value)) / 100 : toSafeNumber(item.discount_value);
                  const item_tax = item.tax_type === "percentage" ? ((item_total - item_disc) * toSafeNumber(item.tax_value)) / 100 : toSafeNumber(item.tax_value);
                  const item_net = item_total - item_disc + item_tax;
                  const selectedStock = (item as any).current_stock;

                  return (
                    <div key={item.id} className="border border-slate-100 rounded-2xl p-4 space-y-4 relative bg-slate-50/20 text-left">
                      <div className="space-y-1.5 relative">
                        <Label className={`text-[11px] font-bold uppercase tracking-wide ${itemErrors[idx]?.product_name ? "text-red-500" : "text-slate-500"}`}>Product</Label>
                        <div className="relative">
                          <Input
                            placeholder="Search Product..."
                            className={`h-11 border shadow-sm font-bold uppercase pl-10 rounded-xl text-slate-700 bg-white transition-all w-full ${itemErrors[idx]?.product_name ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"}`}
                            value={item.product_name}
                            onChange={(e) => {
                              handleSearch(idx, e.target.value);
                              if (itemErrors[idx]?.product_name) setItemErrors((prev) => ({ ...prev, [idx]: { ...prev[idx], product_name: undefined } }));
                            }}
                            onFocus={() => { setActiveSearchIdx(idx); handleSearch(idx, item.product_name); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Plus size={16} /></div>
                        </div>
                        {itemErrors[idx]?.product_name && <p className="text-[10px] text-red-500 font-bold">{itemErrors[idx].product_name}</p>}
                        {(item.product_id || item.sku) && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 mt-2 ml-1">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">SKU: {item.sku || "N/A"}</span>
                            {selectedStock !== undefined && <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedStock <= 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>Stock: {selectedStock}</span>}
                          </div>
                        )}
                        {!!item.product_id && (item.variant_batches?.length || 0) > 0 && (
                          <div className="mt-3">
                            <Label className={`text-[10px] font-bold uppercase ${itemErrors[idx]?.variant ? "text-red-500" : "text-slate-500"}`}>
                              Variant / Batch <span className="text-red-500">*</span>
                            </Label>
                            <select
                              value={item.purchase_item_id || ""}
                              onChange={(e) => {
                                handleVariantChange(idx, e.target.value);
                                if (itemErrors[idx]?.variant) {
                                  setItemErrors((prev) => ({ ...prev, [idx]: { ...prev[idx], variant: undefined } }));
                                }
                              }}
                              className={`mt-1 h-10 w-full rounded-xl border bg-white px-3 text-xs font-semibold outline-none ${itemErrors[idx]?.variant ? "border-red-500" : "border-slate-200 focus:border-blue-500"
                                }`}
                            >
                              {(item.variant_batches || []).map((batch) => (
                                <option key={batch.purchase_item_id} value={batch.purchase_item_id} disabled={Number(batch.available_stock) <= 0}>
                                  {batch.attribute_summary} | Stock: {batch.available_stock}{Number(batch.available_stock) <= 0 ? " (OUT OF STOCK)" : ""}
                                </option>
                              ))}
                            </select>
                            {itemErrors[idx]?.variant && (
                              <p className="mt-1 text-[10px] text-red-500 font-bold">{itemErrors[idx].variant}</p>
                            )}
                          </div>
                        )}
                        {activeSearchIdx === idx && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[280px] overflow-y-auto p-1 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="text-[9px] font-black text-slate-400 px-3 py-2 uppercase tracking-widest border-b border-slate-50 mb-1 flex justify-between items-center">
                              <span>Select Item</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-400">{searchResults[idx]?.length || 0} items</span>
                            </div>
                            {searchResults[idx] && searchResults[idx].length > 0 ? searchResults[idx].map((p) => (
                              <button key={p.key} type="button" disabled={p.current_stock <= 0} className={`w-full text-left px-4 py-3 ${p.current_stock <= 0 ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-blue-600 hover:text-white"} text-[11px] font-black rounded-lg transition-all flex flex-col gap-1 group mb-0.5 last:mb-0`} onClick={() => selectProduct(idx, p)}>
                                <div className="flex justify-between items-center w-full"><span className="uppercase truncate pr-4 text-slate-900 group-hover:text-white">{p.name}</span><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] group-hover:bg-blue-500 group-hover:text-white transition-colors flex-shrink-0 font-black">Rs {p.selling_price}</span></div>
                                <div className="flex justify-between items-center w-full text-[9px] font-bold uppercase tracking-tight"><span className="text-slate-400 group-hover:text-blue-100 italic">SKU: {p.sku_code || "N/A"}</span><span className={`${p.current_stock <= 5 ? "text-red-500" : "text-emerald-500"} group-hover:text-white`}>Stock: {p.current_stock}{p.current_stock <= 0 && " (OUT OF STOCK)"}</span></div>
                                {p.is_batch_option ? (
                                  <div className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-blue-100">
                                    Batch: {p.attribute_summary || "Default"}
                                  </div>
                                ) : (
                                  <div className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-blue-100">
                                    Batches: {Array.isArray(p.variant_batches) ? p.variant_batches.length : 0}
                                  </div>
                                )}
                              </button>
                            )) : <div className="p-8 text-center text-slate-400 font-bold text-[10px] uppercase">No matching products</div>}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">Qty</Label>
                          <Input type="text" inputMode="numeric" className={`h-11 text-center font-bold border rounded-xl bg-white ${itemErrors[idx]?.quantity ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500"}`} value={item.quantity === 0 ? "" : item.quantity} placeholder="0" onChange={e => { const val = e.target.value === "" ? 0 : Number(e.target.value.replace(/\D/g, "")); const n = [...items]; n[idx].quantity = val; setItems(n); if (itemErrors[idx]?.quantity) setItemErrors((prev) => ({ ...prev, [idx]: { ...prev[idx], quantity: undefined } })); }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">Price (₹)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.001"
                            min="0"
                            className="h-11 text-center font-bold border border-slate-200 rounded-xl bg-white focus:border-blue-500"
                            value={item.price === 0 ? "" : item.price}
                            placeholder="0.000"
                            onChange={(e) => {
                              const value = e.target.value;

                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                const n = [...items];
                                n[idx].price = value === "" ? 0 : Number(value);
                                setItems(n);
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">Discount</Label>
                          <div className="h-11 flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200"><select className="text-[10px] border-none focus:ring-0 h-9 font-black bg-transparent w-10 px-1 cursor-pointer appearance-none text-slate-500" value={item.discount_type} onChange={e => { const n = [...items]; n[idx].discount_type = e.target.value as "percentage" | "fixed"; setItems(n); }}><option value="percentage">%</option><option value="fixed">₹</option></select><Input type="text" inputMode="numeric" className="h-9 text-center font-black text-slate-800 w-full px-1 border-none bg-slate-50 rounded-lg focus:ring-0" value={item.discount_value === 0 ? "" : item.discount_value} placeholder="0" onChange={e => { const val = e.target.value === "" ? 0 : Number(e.target.value.replace(/\D/g, "")); const n = [...items]; n[idx].discount_value = val; setItems(n); }} /></div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">GST/Tax</Label>
                          <div className="h-11 flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                            <select
                              className="text-[10px] border-none focus:ring-0 h-9 font-black bg-transparent w-10 px-1 cursor-pointer appearance-none text-slate-500"
                              value={item.tax_type}
                              onChange={e => {
                                const n = [...items];
                                n[idx].tax_type = e.target.value as "percentage" | "fixed";
                                setItems(n);
                              }}
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-9 text-center font-black text-slate-800 w-full px-1 border-none bg-slate-50 rounded-lg focus:ring-0"
                              value={item.tax_value === 0 ? "" : item.tax_value}
                              placeholder="0"
                              onChange={e => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value.replace(/\D/g, ""));
                                const n = [...items];
                                n[idx].tax_value = val;
                                setItems(n);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">Net Amount</Label>
                          <div className="h-11 px-3 rounded-xl border border-slate-200 flex items-center justify-end font-black text-slate-800 bg-slate-50">₹ {item_net.toLocaleString()}</div>
                        </div>
                        <div className="space-y-1 text-center">
                          <Label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Remove</Label>
                          <button type="button" onClick={() => removeItem(item.id)} className="h-10 w-10 mx-auto flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      {itemErrors[idx]?.quantity && <p className="text-[10px] text-red-500 font-bold">{itemErrors[idx].quantity}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PAYMENT SUMMARY - REDESIGNED */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-8 text-left">
              {/* 1. CALCULATIONS SUMMARY (TOP) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-emerald-100 p-1.5 rounded-lg"><PlusCircle size={14} className="text-emerald-600" /></div> Booking Summary
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Items Subtotal</p>
                    <p className="text-sm font-bold text-slate-800">₹ {total_items_subtotal.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Total GST</p>
                    <p className="text-sm font-bold text-slate-800">₹ {total_items_tax.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-blue-50/30 p-3 shadow-sm border-blue-100">
                    <p className="text-[9px] uppercase font-bold text-blue-500 mb-1">Gross Total</p>
                    <p className="text-sm font-bold text-slate-900">₹ {subtotal.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-red-50/30 p-3 shadow-sm border-red-100">
                    <p className="text-[9px] uppercase font-bold text-red-500 mb-1">Discount (-)</p>
                    <p className="text-sm font-bold text-red-600">₹ {total_discount.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-500 p-3 shadow-md shadow-emerald-100">
                    <p className="text-[9px] uppercase font-black text-emerald-50 mb-1">Payment Received</p>
                    <p className="text-sm font-black text-white">₹ {toSafeNumber(formData.paid_amount).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl border p-3 shadow-md ${balance_due > 0 ? 'border-amber-200 bg-amber-50 shadow-amber-100' : 'border-emerald-200 bg-emerald-50 shadow-emerald-100'}`}>
                    <p className={`text-[9px] uppercase font-bold mb-1 ${balance_due > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Remaining Balance</p>
                    <p className={`text-sm font-black ${balance_due > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>₹ {balance_due.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 2. PAYMENT CONFIGURATION (MIDDLE) */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-blue-100 p-1.5 rounded-lg"><PlusCircle size={14} className="text-blue-600" /></div> Booking Payment Details
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Booking Discount</Label>
                    <div className="flex gap-2">
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" })}
                        className="h-11 w-24 border border-slate-200 rounded-xl px-3 bg-white text-xs font-semibold outline-none focus:border-blue-500"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        value={formData.discount_value === 0 ? "" : formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                        placeholder="0"
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Payment Received</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">₹</span>
                      <Input
                        type="number"
                        min={0}
                        max={net_total}
                        value={formData.paid_amount || ""}
                        disabled={isEditMode && savedPaymentStatus === 'Paid'}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > net_total) {
                            toast.error(`Paid amount cannot exceed net total (₹${net_total.toLocaleString("en-IN")})`);
                            setFormData({ ...formData, paid_amount: net_total });
                            return;
                          }
                          setFormData({ ...formData, paid_amount: Number(e.target.value) });
                        }}
                        placeholder="0.00"
                        className={`h-11 rounded-xl border-slate-200 pl-7 font-bold text-emerald-700 bg-emerald-50/20 ${isEditMode && savedPaymentStatus === 'Paid' ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Payment Method</Label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                      className="h-11 w-full border border-slate-200 rounded-xl px-3 bg-white text-xs font-semibold outline-none focus:border-blue-500 hover:border-slate-400 transition-all font-bold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Bank</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  {formData.payment_type === "UPI" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">UPI Ref Number</Label>
                        <Input
                          type="text"
                          value={upiReferenceNo}
                          onChange={(e) => setUpiReferenceNo(e.target.value)}
                          placeholder="Enter Reference No"
                          className="h-11 rounded-xl border-slate-200 bg-blue-50/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-500">Payment Screenshot</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              setPaymentScreenshot(e.target.files?.[0] || null);
                              setExistingScreenshotUrl("");
                            }}
                            className="h-11 rounded-xl border-slate-200 bg-white pt-2.5 text-xs text-slate-500"
                          />
                          {/* New file preview */}
                          {paymentScreenshot && (
                            <a href={URL.createObjectURL(paymentScreenshot)} target="_blank" rel="noopener noreferrer"
                              className="h-11 w-11 rounded-xl border border-blue-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                              <img src={URL.createObjectURL(paymentScreenshot)} alt="Preview" className="h-full w-full object-cover" />
                            </a>
                          )}
                          {/* Existing screenshot preview (edit mode) */}
                          {!paymentScreenshot && existingScreenshotUrl && (
                            <a href={existingScreenshotUrl} target="_blank" rel="noopener noreferrer"
                              className="h-11 w-11 rounded-xl border border-slate-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center" title="View existing screenshot">
                              <img src={existingScreenshotUrl} alt="Existing" className="h-full w-full object-cover" />
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Booking Notes / Reference</Label>
                  <textarea
                    rows={2}
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional booking note, reference or remarks"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 3. ACTIONS BAR (BOTTOM) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                {/* <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/inventory/orders/list")}
                  className="px-5 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                >
                  History
                </button>
              </div> */}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => requestSave(false)}
                    disabled={loading}
                    className="h-11 bg-black hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 px-8"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : isEditMode ? "Update" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => requestSave(true)}
                    disabled={loading}
                    className="h-11 bg-[#0e4fe8] hover:bg-[#0751fe] text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 px-8"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : isEditMode ? "Update & Print Booking" : "Save & Print Booking"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={confirmAction === "final" ? "Generate Booking Confirmation?" : "Save Advance Booking?"}
        message={
          confirmAction === "final"
            ? "Are you sure you want to finalize this advance booking? This will lock the current values for print."
            : "Are you sure you want to save this advance booking as a draft?"
        }
        confirmText={loading ? "Saving..." : "Yes, Save Booking"}
        onConfirm={() => handleSave(confirmAction === "final")}
        loading={loading}
      />
    </div>
  );
}


