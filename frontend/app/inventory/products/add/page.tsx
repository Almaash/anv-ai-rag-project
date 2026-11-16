"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
    Wallet,
  Settings2,
  X,
  FileText,
  PlusCircle,
  CheckCircle2,
  Search,
  ChevronDown,
  User,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

interface MasterData {
  id: number;
  name: string;
  unique_id?: string;
  business_name?: string;
  phone?: string;
  values?: string;
  category_id?: number | null;
}

interface ProductMasterOption {
  id: number;
  name: string;
  unique_id?: string;
  sku_code?: string;
  stock?: string | number;
  category_id?: number | null;
  category?: { id: number; name: string } | null;
}

interface PurchaseItemInput {
  id?: number;
  product_master_id: string;
  product_name?: string;
  quantity: string;
  purchase_price: string;
  selling_price: string;
  tax_enabled: boolean;
  tax_type: "percentage" | "fixed";
  tax_percent: string;
  tax_amount: string;
  attribute_summary: string;
  attachments?: File[];
  existing_attachments?: any[];
}

export default function AddPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const pageIsEditMode = Boolean(editId) || isEditMode;

  const [vendors, setVendors] = useState<MasterData[]>([]);
  const [productMasters, setProductMasters] = useState<ProductMasterOption[]>(
    []
  );
  const [attributes, setAttributes] = useState<MasterData[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [vendorHighlightIndex, setVendorHighlightIndex] = useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const vendorSearchInputRef = React.useRef<HTMLInputElement>(null);
  const productDropdownRef = React.useRef<HTMLDivElement>(null);
  const productSearchInputRef = React.useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productHighlightIndex, setProductHighlightIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitAction, setSubmitAction] = useState<"save" | "print">("save");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVendorDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.business_name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.phone?.includes(vendorSearch)
    );
  }, [vendors, vendorSearch]);

  const selectedVendor = useMemo(() => 
    vendors.find(v => v.id.toString() === selectedVendorId),
  [vendors, selectedVendorId]);

  useEffect(() => {
    if (!isVendorDropdownOpen) return;
    setVendorHighlightIndex(0);
    requestAnimationFrame(() => vendorSearchInputRef.current?.focus());
  }, [isVendorDropdownOpen]);

  useEffect(() => {
    if (!isProductDropdownOpen) return;
    setProductHighlightIndex(0);
    requestAnimationFrame(() => productSearchInputRef.current?.focus());
  }, [isProductDropdownOpen]);

  useEffect(() => {
    if (vendorHighlightIndex > Math.max(filteredVendors.length - 1, 0)) {
      setVendorHighlightIndex(0);
    }
  }, [filteredVendors.length, vendorHighlightIndex]);

  const [purchaseDate, setPurchaseDate] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [alreadyPaidAmount, setAlreadyPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [upiReferenceNo, setUpiReferenceNo] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [existingScreenshotUrl, setExistingScreenshotUrl] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [investments, setInvestments] = useState<any[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);

  const [attributeSelections, setAttributeSelections] = useState<
    Record<string, string[]>
  >({});
  const [currentItem, setCurrentItem] = useState<PurchaseItemInput>({
    product_master_id: "",
    quantity: "",
    purchase_price: "",
    selling_price: "",
    tax_enabled: false,    tax_type: "percentage",    tax_percent: "",
    tax_amount: "",
    attribute_summary: "",
    attachments: [],
  });
  const [items, setItems] = useState<PurchaseItemInput[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const previewObjectUrlRef = useRef<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(true);


  const findProductByMasterValue = useCallback(
    (value?: string | number | null) => {
      const target = String(value ?? "").trim();
      if (!target) return undefined;
      return productMasters.find(
        (p) => String(p.id) === target || String(p.unique_id || "") === target
      );
    },
    [productMasters]
  );

  // Optimized Fetch for Add/Edit
  useEffect(() => {
    const fetchData = async () => {
      setMastersLoading(true);
      try {
        const res = await axiosInstance.get(
          editId
            ? `${ProjectApiList.GET_PURCHASE_MASTER_DATA}/${editId}`
            : ProjectApiList.GET_PURCHASE_MASTER_DATA
        );
        if (res.data.success) {
          const { purchase, vendors, products, attributes } = res.data.data;
          setVendors(vendors || []);
          setProductMasters(products || []);
          setAttributes(attributes || []);

          if (editId && purchase) {
            setIsEditMode(true);
            // vendor_id stored as unique_id — find matching vendor by unique_id or numeric id
            const matchedVendor = (vendors || []).find(
              (v: any) => v.unique_id === purchase.vendor_id || String(v.id) === String(purchase.vendor_id)
            );
            // If vendor not found in list (deleted), still set the raw vendor_id so backend can try to resolve
            setSelectedVendorId(matchedVendor ? matchedVendor.id.toString() : purchase.vendor_id?.toString() || "");
            setPurchaseDate(purchase.purchase_date || "");
            setDiscountType(
              purchase.discount_type === "fixed" ? "fixed" : "percentage"
            );
            setDiscountValue((purchase.discount_value ?? "").toString());
            // Store original paid amount if in edit mode, but initialize form field to 0 for NEW payment
            setAlreadyPaidAmount(Number(purchase.paid_amount || 0));
            setPaidAmount("0");
            setPaymentMethod(purchase.payment_method || "Cash");
            setUpiReferenceNo(purchase.upi_reference_no || "");
            setPaymentNote(purchase.payment_note || "");
            // Auto-select investor if saved
            if (purchase.investor_investment_id) {
              const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
              const branchId = user?.branch || user?.branch_id || undefined;
              axiosInstance.get(ProjectApiList.GET_INVESTOR_INVESTMENTS, { params: { per_page: 200, branch_id: branchId } })
                .then(res => {
                  const allInvestments = res.data?.data || [];
                  setInvestments(allInvestments);
                  const found = allInvestments.find((i: any) => i.unique_id === purchase.investor_investment_id);
                  if (found) setSelectedInvestment(found);
                })
                .catch(() => {});
            } else {
              // No investor — still load branch investments for dropdown
              const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
              const branchId = user?.branch || user?.branch_id || undefined;
              axiosInstance.get(ProjectApiList.GET_INVESTOR_INVESTMENTS, { params: { per_page: 200, branch_id: branchId } })
                .then(res => setInvestments(res.data?.data || []))
                .catch(() => {});
            }
            // Load existing screenshot for preview
            if (purchase.payment_screenshot) {
              setExistingScreenshotUrl(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${purchase.payment_screenshot}`);
            }

            // Map items
            const mappedItems = purchase.items.map((item: any) => ({
              id: item.id,
              product_master_id: item.product_master_id?.toString() || "",
              product_name:
                item.product_master?.name || item.product?.name || item.product_name || "",
              quantity: item.quantity?.toString() || "",
              purchase_price: item.purchase_price?.toString() || "",
              selling_price: item.selling_price?.toString() || "",
              tax_enabled: !!(item.tax_percent || item.tax_amount),
              tax_type: item.tax_percent ? "percentage" : "fixed",
              tax_percent: item.tax_percent?.toString() || "",
              tax_amount: item.tax_amount?.toString() || "",
              attribute_summary: item.attribute_summary || "",
              attachments: [],
              existing_attachments: item.attachments || [],
            }));
            setItems(mappedItems);
          }
        }
      } catch (err) {
        toast.error("Failed to load required data");
      } finally {
        setMastersLoading(false);
      }
    };
    fetchData();
  }, [editId]);

  // Fetch investor investments for dropdown (branch-wise)
  useEffect(() => {
    if (editId) return; // edit mode mein purchase load ke saath fetch hoga
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    const branchId = user?.branch || user?.branch_id || undefined;
    axiosInstance.get(ProjectApiList.GET_INVESTOR_INVESTMENTS, { 
      params: { per_page: 200, branch_id: branchId } 
    })
      .then(res => setInvestments(res.data?.data || []))
      .catch(() => {});
  }, [editId]);

  const toggleAttributeValue = useCallback((attributeId: string, value: string) => {
    setAttributeSelections((prev) => ({
      ...prev,
      [attributeId]: [value], // Single selection only
    }));
  }, []);

  const selectedProduct = useMemo(
    () => findProductByMasterValue(currentItem.product_master_id),
    [findProductByMasterValue, currentItem.product_master_id]
  );

  useEffect(() => {
    if (!currentItem.product_master_id) return;
    const selected = findProductByMasterValue(currentItem.product_master_id);
    if (selected) {
      setProductSearch(selected.name);
    }
  }, [currentItem.product_master_id, findProductByMasterValue]);

  const filteredProductMasters = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return productMasters.slice(0, 20);
    return productMasters
      .filter((p) =>
        p.name.toLowerCase().includes(term) ||
        (p.unique_id || "").toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [productMasters, productSearch]);

  useEffect(() => {
    if (productHighlightIndex > Math.max(filteredProductMasters.length - 1, 0)) {
      setProductHighlightIndex(0);
    }
  }, [filteredProductMasters.length, productHighlightIndex]);

  const handleVendorSelect = useCallback((vendor: MasterData) => {
    setSelectedVendorId(vendor.id.toString());
    setIsVendorDropdownOpen(false);
    setVendorSearch("");
    if (errors.vendor_id) {
      setErrors((prev) => ({ ...prev, vendor_id: "" }));
    }
  }, [errors.vendor_id]);

  const handleProductSelect = useCallback((product: ProductMasterOption) => {
    setCurrentItem((prev) => ({
      ...prev,
      product_master_id: product.id.toString(),
    }));
    setProductSearch(product.name);
    setIsProductDropdownOpen(false);
    if (errors.current_product_master_id) {
      setErrors((prev) => ({ ...prev, current_product_master_id: "" }));
    }
  }, [errors.current_product_master_id]);

  const selectedCategoryId = useMemo(() => 
    selectedProduct?.category_id ?? selectedProduct?.category?.id ?? null,
    [selectedProduct]
  );

  const filteredAttributes = useMemo(() => {
    if (!currentItem.product_master_id) return [];
    if (!selectedCategoryId) return [];
    return attributes.filter((attr) => {
      return String(attr.category_id) === String(selectedCategoryId);
    });
  }, [attributes, currentItem.product_master_id, selectedCategoryId]);

  const buildAttributeSummary = useCallback((): string => {
    const parts: string[] = [];
    filteredAttributes.forEach((attr) => {
      const selected = attributeSelections[attr.id.toString()];
      if (selected && selected.length) {
        parts.push(`${attr.name}: ${selected.join(", ")}`);
      }
    });
    return parts.join(" | ");
  }, [filteredAttributes, attributeSelections]);

  const calculateItemValues = useCallback((item: PurchaseItemInput) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.purchase_price) || 0;
    const subtotal = qty * price;
    const percent = Number(item.tax_percent || 0);
    const fixedAmount = Number(item.tax_amount || 0);

    let gstAmount = 0;
    if (item.tax_enabled) {
      if (item.tax_type === "percentage") {
        gstAmount = (subtotal * percent) / 100;
      } else {
        gstAmount = fixedAmount;
      }
    }

    const derivedPercent = subtotal > 0 ? (gstAmount * 100) / subtotal : 0;
    return {
      qty,
      price,
      subtotal,
      gstAmount,
      gstPercent: item.tax_type === "percentage" ? percent : derivedPercent,
      total: subtotal + gstAmount,
    };
  }, []);

  const orderSummary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const values = calculateItemValues(item);
        acc.subtotal += values.subtotal;
        acc.gst += values.gstAmount;
        acc.total += values.total;
        return acc;
      },
      { subtotal: 0, gst: 0, total: 0 }
    );
  }, [items, calculateItemValues]);

  const paymentSummary = useMemo(() => {
    const gross = orderSummary.total;
    const discountRaw = Number(discountValue || 0);
    const discountAmount =
      discountType === "percentage"
        ? (gross * discountRaw) / 100
        : discountRaw;
    const safeDiscount = Math.max(0, Math.min(discountAmount, gross));
    // Round netPayable to 2 decimal places to avoid floating point precision issues (e.g., 999.00 - 0.00 = 998.9999999999999)
    const netPayable = Number(Math.max(0, gross - safeDiscount).toFixed(2));
    const remainingToPay = Math.max(0, Number((netPayable - alreadyPaidAmount).toFixed(2)));
    const paidNew = Math.max(0, Math.min(Number(paidAmount || 0), remainingToPay));
    const totalPaid = Number((alreadyPaidAmount + paidNew).toFixed(2));
    const due = Math.max(0, Number((netPayable - totalPaid).toFixed(2)));
    return {
      gross,
      discountAmount: safeDiscount,
      netPayable,
      remainingToPay,
      paid: totalPaid,
      paidNew,
      due,
    };
  }, [orderSummary.total, discountType, discountValue, paidAmount, alreadyPaidAmount]);

  const isAdditionalPaymentLocked = pageIsEditMode && paymentSummary.remainingToPay <= 0;

  const addItem = () => {
    const newErrors: { [key: string]: string } = {};

    if (!currentItem.product_master_id) {
      newErrors.current_product_master_id = "Product is required";
    }

    const qtyNum = Number(currentItem.quantity);
    if (!currentItem.quantity || isNaN(qtyNum) || qtyNum <= 0) {
      newErrors.current_quantity = "Quantity must be greater than 0";
    }

    const priceNum = Number(currentItem.purchase_price);
    if (!currentItem.purchase_price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.current_purchase_price = "Buying price is required and must be greater than 0";
    }

    const sellingNum = Number(currentItem.selling_price);
    if (!currentItem.selling_price || isNaN(sellingNum) || sellingNum <= 0) {
      newErrors.current_selling_price = "Selling price is required and must be greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      toast.error("Please fill required fields");
      return;
    }

    // New validation: Check if all attributes for this product's category are selected
    if (filteredAttributes.length > 0) {
      const missingAttributes = filteredAttributes.filter(
        (attr) => !attributeSelections[attr.id.toString()] || attributeSelections[attr.id.toString()].length === 0
      );

      if (missingAttributes.length > 0) {
        const missingNames = missingAttributes.map((a) => a.name).join(", ");
        toast.error(`Please select attributes: ${missingNames}`);
        return;
      }
    }

    const summary = buildAttributeSummary();
    const newItem: PurchaseItemInput = {
      ...currentItem,
      attribute_summary: summary,
    };
    if (editingItemIndex !== null) {
      setItems((prev) =>
        prev.map((item, index) => (index === editingItemIndex ? newItem : item))
      );
      toast.success("Item updated");
    } else {
      setItems((prev) => [...prev, newItem]);
    }
    setCurrentItem({
      product_master_id: "",
      quantity: "",
      purchase_price: "",
      selling_price: "",
      tax_enabled: false,      tax_type: "percentage",      tax_percent: "",
      tax_amount: "",
      attribute_summary: "",
      attachments: [],
    });
    setProductSearch("");
    setIsProductDropdownOpen(false);
    setErrors((prev) => ({
      ...prev,
      current_product_master_id: "",
      current_quantity: "",
      current_purchase_price: "",
      current_selling_price: "",
      items: "",
    }));
    setAttributeSelections({});
    setEditingItemIndex(null);
  };

  const parseAttributeSummary = useCallback(
    (summary?: string): Record<string, string[]> => {
      const parsed: Record<string, string[]> = {};
      if (!summary) return parsed;

      const normalize = (value: string) =>
        value.toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");

      const byName = new Map(
        attributes.map((attr) => [attr.name.trim().toLowerCase(), attr.id.toString()])
      );

      summary
        .split("|")
        .map((part) => part.trim())
        .forEach((part) => {
          const [rawName, rawValues] = part.split(":").map((v) => v?.trim() || "");
          if (!rawName || !rawValues) return;
          const attrId = byName.get(rawName.toLowerCase());
          if (!attrId) return;

          const attr = attributes.find((a) => a.id.toString() === attrId);
          const allowedValues = (attr?.values || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

          const selectedValues = rawValues
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .map((selected) => {
              const exact = allowedValues.find((v) => v === selected);
              if (exact) return exact;
              const normalizedSelected = normalize(selected);
              return (
                allowedValues.find((v) => normalize(v) === normalizedSelected) || selected
              );
            })
            .slice(0, 1);

          parsed[attrId] = selectedValues;
        });

      return parsed;
    },
    [attributes]
  );

  const handleEditItem = useCallback(
    (index: number) => {
      const row = items[index];
      if (!row) return;

      const selectedEditProduct = findProductByMasterValue(row.product_master_id);

      setCurrentItem({
        ...row,
        attachments: row.attachments || [],
        existing_attachments: row.existing_attachments || [],
      });
      setAttributeSelections(parseAttributeSummary(row.attribute_summary));
      setProductSearch(selectedEditProduct?.name || "");
      setIsProductDropdownOpen(false);
      setEditingItemIndex(index);
      setErrors((prev) => ({
        ...prev,
        current_product_master_id: "",
        current_quantity: "",
        current_purchase_price: "",
        current_selling_price: "",
      }));
    },
    [items, parseAttributeSummary, findProductByMasterValue]
  );

  const cancelItemEdit = useCallback(() => {
    setEditingItemIndex(null);
    setCurrentItem({
      product_master_id: "",
      quantity: "",
      purchase_price: "",
      selling_price: "",
      tax_enabled: false,
      tax_type: "percentage",
      tax_percent: "",
      tax_amount: "",
      attribute_summary: "",
      attachments: [],
      existing_attachments: [],
    });
    setAttributeSelections({});
    setProductSearch("");
    setIsProductDropdownOpen(false);
  }, []);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      cancelItemEdit();
    } else if (editingItemIndex !== null && index < editingItemIndex) {
      setEditingItemIndex((prev) => (prev === null ? null : prev - 1));
    }
  };

  const removeAttachment = (index: number) => {
    setCurrentItem((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index),
    }));
  };

  const removeExistingAttachmentFromCurrentItem = (index: number) => {
    setCurrentItem((prev) => ({
      ...prev,
      existing_attachments: prev.existing_attachments?.filter((_, i) => i !== index),
    }));
  };

  const getStorageFileUrl = useCallback((path: string) => {
    return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}`;
  }, []);

  const closePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewSrc("");
    setPreviewTitle("");
    setPreviewIsImage(true);
  }, []);

  const openAttachmentPreview = (file: File) => {
    const isImg = Boolean(file.type?.startsWith("image/"));
    const cachedPreview = (file as any).preview;
    const url = cachedPreview || URL.createObjectURL(file);
    if (!cachedPreview) {
      previewObjectUrlRef.current = url;
    }
    setPreviewSrc(url);
    setPreviewTitle(file.name || "Attachment");
    setPreviewIsImage(isImg);
  };

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const filesWithPreview = files.map((file) => {
      if (file.type.startsWith("image/")) {
        (file as any).preview = URL.createObjectURL(file);
      }
      return file;
    });

    setCurrentItem((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...filesWithPreview],
    }));
    e.target.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent, action: "save" | "print" = "save") => {
    if (e) e.preventDefault();
    const id = searchParams.get("id");
    const newErrors: { [key: string]: string } = {};
    
    if (!selectedVendorId) {
      newErrors.vendor_id = "Vendor is required";
    }
    if (!items.length) {
      newErrors.items = "Add at least one product item";
    }

    setErrors((prev) => ({
      ...prev,
      vendor_id: newErrors.vendor_id || "",
      items: newErrors.items || "",
    }));

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill required fields");
      return;
    }

    if (!showConfirmModal) {
      setSubmitAction(action);
      setShowConfirmModal(true);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      // Send unique_id if available, else send raw selectedVendorId
      const selectedVendorObj = vendors.find((v: any) => String(v.id) === selectedVendorId);
      formData.append("vendor_id", selectedVendorObj?.unique_id || selectedVendorId);
      if (purchaseDate) {
        formData.append("purchase_date", purchaseDate);
      }
      formData.append("discount_type", discountType);
      formData.append("discount_value", discountValue || "0");
      formData.append("paid_amount", paidAmount || "0");
      formData.append("payment_method", paymentMethod || "Cash");
      // Always send UPI fields so they are preserved on edit
      formData.append("upi_reference_no", upiReferenceNo);
      if (paymentScreenshot) {
        formData.append("payment_screenshot", paymentScreenshot);
      }
      if (paymentNote.trim()) {
        formData.append("payment_note", paymentNote.trim());
      }
      if (selectedInvestment) {
        formData.append("investor_investment_id", selectedInvestment.unique_id);
      }

      items.forEach((item, index) => {
        if (item.id) {
          formData.append(`items[${index}][id]`, item.id.toString());
        }
        formData.append(
          `items[${index}][product_master_id]`,
          item.product_master_id
        );
        formData.append(`items[${index}][quantity]`, item.quantity || "0");
        formData.append(
          `items[${index}][purchase_price]`,
          item.purchase_price || "0"
        );
        formData.append(
          `items[${index}][selling_price]`,
          item.selling_price || "0"
        );

        const taxPercentValue =
          item.tax_enabled && item.tax_percent ? item.tax_percent : "";
        const taxAmountValue =
          item.tax_enabled && item.tax_amount ? item.tax_amount : "";

        if (taxPercentValue !== "") {
          formData.append(
            `items[${index}][tax_percent]`,
            taxPercentValue
          );
        }
        if (taxAmountValue !== "") {
          formData.append(`items[${index}][tax_amount]`, taxAmountValue);
        }

        if (item.attribute_summary) {
          formData.append(
            `items[${index}][attribute_summary]`,
            item.attribute_summary
          );
        }

        if (item.existing_attachments && item.existing_attachments.length > 0) {
          item.existing_attachments.forEach((path) => {
            formData.append(`items[${index}][existing_attachments][]`, String(path));
          });
        }

        if (item.attachments && item.attachments.length > 0) {
          item.attachments.forEach((file) => {
            formData.append(`items[${index}][attachments][]`, file);
          });
        }
      });

      const res = id 
        ? await axiosInstance.post(`${ProjectApiList.UPDATE_PURCHASE}/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          })
        : await axiosInstance.post(ProjectApiList.CREATE_PURCHASE, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

      if (res.data.success) {
        toast.success(id ? "Purchase updated successfully" : "Purchase recorded successfully");
        const purchaseInvoiceId = res.data?.purchase_invoice_id;
        if (action === "print" && purchaseInvoiceId) {
          router.push(`/inventory/purchase/invoice?id=${purchaseInvoiceId}`);
        } else {
          router.push("/inventory/products/list");
        }
      }
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        Object.keys(validationErrors).forEach((key) => {
          validationErrors[key].forEach((msg: string) => {
            // Check if it's a file size error
            if (msg.includes("kilobytes")) {
              toast.error(`File attachment is too large. Max size 5MB.`);
            } else {
              toast.error(msg);
            }
          });
        });
      } else {
        toast.error(err.response?.data?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory/products/list" className="h-9 w-9 flex items-center justify-center rounded-md border text-gray-700">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{pageIsEditMode ? "Edit Purchase" : "New Purchase"}</h1>
            <p className="text-sm text-gray-500">Add vendor purchase items and payment details.</p>
          </div>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button onClick={() => handleSubmit(undefined, "save")} disabled={loading} className="h-10 px-4 text-sm bg-gray-900 text-white">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Save"}
          </Button>
          <Button onClick={() => handleSubmit(undefined, "print")} disabled={loading} className="h-10 px-4 text-sm bg-blue-600 text-white">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Save & Print"}
          </Button>
        </div> */}
      </div>

      {mastersLoading ? (
        <div className="bg-white border rounded-xl shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={28} />
          <p className="text-sm text-gray-600">Loading data...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label className={`text-sm font-medium ${errors.vendor_id ? "text-red-600" : "text-gray-700"}`}>
                  Vendor <span className="text-red-500">*</span>
                </Label>

                {/* Searchable Vendor Dropdown (simplified) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                    className={`w-full h-10 rounded-md border px-3 flex items-center justify-between text-sm ${errors.vendor_id ? "border-red-500" : "border-gray-200"}`}
                  >
                    {selectedVendor ? (
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-sm font-medium text-gray-900 truncate w-full flex items-center gap-1.5">
                          <User size={12} className="text-blue-500" />
                          {selectedVendor.business_name || selectedVendor.name}
                        </span>
                        {selectedVendor.business_name && (
                          <span className="text-xs text-gray-500 truncate w-full">Contact: {selectedVendor.name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Select vendor...</span>
                    )}
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${isVendorDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isVendorDropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-gray-200 rounded-md shadow-sm z-40">
                      <div className="p-3 border-b flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          ref={vendorSearchInputRef}
                          type="text"
                          placeholder="Search name or phone"
                          className="bg-transparent border-none outline-none text-sm w-full text-gray-700"
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setVendorHighlightIndex((prev) => Math.min(prev + 1, Math.max(filteredVendors.length - 1, 0)));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setVendorHighlightIndex((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              const active = filteredVendors[vendorHighlightIndex];
                              if (active) handleVendorSelect(active);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setIsVendorDropdownOpen(false);
                            }
                          }}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map((v, idx) => (
                            <button
                              key={v.id}
                              type="button"
                              onMouseEnter={() => setVendorHighlightIndex(idx)}
                              onClick={() => handleVendorSelect(v)}
                              className={`w-full px-4 py-3 flex items-center justify-between text-sm ${selectedVendorId === v.id.toString() ? "bg-blue-50 text-blue-700" : idx === vendorHighlightIndex ? "bg-gray-50" : "hover:bg-gray-50"}`}
                            >
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium truncate w-full">{v.business_name || v.name}</span>
                                {v.business_name && <span className="text-xs text-gray-500">{v.name}</span>}
                              </div>
                              <span className="text-xs text-gray-600">{v.phone || "No phone"}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">No vendors found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.vendor_id && <p className="text-xs text-red-600">{errors.vendor_id}</p>}
              </div>

              <div className="space-y-2 md:self-start">
                <Label className="text-sm font-medium text-gray-700">Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-10 border border-gray-200 rounded-md"
                />
              </div>
            </div>

            {/* Vendor Details */}
            {selectedVendor && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-md border bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVendor.business_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVendor.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-800">{selectedVendor.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vendor ID</p>
                  <p className="text-sm font-mono text-gray-800">#{selectedVendor.id.toString().padStart(4, "0")}</p>
                </div>
              </div>
            )}
          </div>

            {/* Line Items */}
            <div className={`bg-white border rounded-2xl shadow-sm p-6 space-y-6 ${errors.items ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                <PlusCircle size={14} className="text-blue-500" /> Add Items
              </div>

              {/* Item editor */}
              <div className="space-y-6 bg-slate-50/30 p-5 rounded-2xl border border-slate-100">
                {editingItemIndex !== null && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    Editing item #{editingItemIndex + 1} ({selectedProduct?.name || "Selected product"})
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium flex items-center justify-between ${errors.current_product_master_id ? "text-red-600" : "text-gray-700"}`}>
                      <span>Product *</span>
                      {selectedProduct && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {selectedProduct.category?.name || "No Category"}
                        </span>
                      )}
                    </Label>
                    <div className="relative" ref={productDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProductDropdownOpen((prev) => {
                            const next = !prev;
                            if (next) {
                              setProductSearch("");
                            }
                            return next;
                          });
                        }}
                        disabled={mastersLoading}
                        className={`w-full h-10 border rounded-md px-3 bg-white text-sm flex items-center justify-between ${
                          errors.current_product_master_id ? "border-red-500" : "border-gray-200"
                        }`}
                      >
                        {selectedProduct ? (
                          <span className="text-sm font-medium text-gray-900 truncate w-full text-left">
                            {selectedProduct.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Select product...</span>
                        )}
                        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isProductDropdownOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                          <div className="p-3 border-b flex items-center gap-2">
                            <Search size={14} className="text-gray-400" />
                            <input
                              ref={productSearchInputRef}
                              type="text"
                              placeholder="Search by product name..."
                              className="bg-transparent border-none outline-none text-sm w-full text-gray-700"
                              value={productSearch}
                              onChange={(e) => {
                                setProductSearch(e.target.value);
                                if (currentItem.product_master_id) {
                                  setCurrentItem((prev) => ({ ...prev, product_master_id: "" }));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setProductHighlightIndex((prev) =>
                                    Math.min(prev + 1, Math.max(filteredProductMasters.length - 1, 0))
                                  );
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setProductHighlightIndex((prev) => Math.max(prev - 1, 0));
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  const active = filteredProductMasters[productHighlightIndex];
                                  if (active) handleProductSelect(active);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  setIsProductDropdownOpen(false);
                                }
                              }}
                            />
                          </div>

                          <div className="max-h-64 overflow-y-auto">
                            {filteredProductMasters.length === 0 ? (
                              <p className="p-4 text-center text-sm text-gray-500">No product found</p>
                            ) : (
                              filteredProductMasters.map((p, idx) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className={`w-full px-4 py-3 text-left text-sm ${currentItem.product_master_id === p.id.toString() ? 'bg-blue-50 text-blue-700' : idx === productHighlightIndex ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                  onMouseEnter={() => setProductHighlightIndex(idx)}
                                  onClick={() => handleProductSelect(p)}
                                >
                                  <span className="font-medium truncate block">{p.name}</span>
                                  {p.sku_code && <span className="text-xs text-gray-500">{p.sku_code}</span>}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.current_product_master_id && (
                      <p className="text-xs text-red-600">
                        {errors.current_product_master_id}
                      </p>
                    )}

                    {/* Quick Product Detail Badge */}
                    {selectedProduct && (
                      <div className="flex items-center gap-4 mt-2 px-3 py-2 bg-gray-50 border rounded-md">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500">Product ID</span>
                          <span className="text-sm font-medium text-gray-900 leading-tight">{selectedProduct.unique_id || `#${selectedProduct.id}`}</span>
                        </div>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500">Category</span>
                          <span className="text-sm text-gray-800 leading-tight truncate max-w-[120px]">{selectedProduct.category?.name || "N/A"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-[11px] font-bold uppercase ${errors.current_quantity ? "text-red-500" : "text-slate-500"}`}>
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={currentItem.quantity}
                      min={0}
                      onChange={(e) => {
                        setCurrentItem((prev) => ({
                          ...prev,
                          quantity:
                            Number(e.target.value) < 0 ? "" : e.target.value,
                        }));
                        if (errors.current_quantity) {
                          setErrors((prev) => ({ ...prev, current_quantity: "" }));
                        }
                      }}
                      placeholder="0"
                      className={`h-11 rounded-xl bg-white shadow-sm ${errors.current_quantity ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200"}`}
                    />
                    {errors.current_quantity && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        {errors.current_quantity}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-[11px] font-bold uppercase ${errors.current_purchase_price ? "text-red-500" : "text-slate-500"}`}>
                      Buying Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 text-xs font-bold">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={currentItem.purchase_price}
                        min={0}
                        onChange={(e) => {
                          setCurrentItem((prev) => ({
                            ...prev,
                            purchase_price:
                              Number(e.target.value) < 0
                                ? ""
                                : e.target.value,
                          }));
                          if (errors.current_purchase_price) {
                            setErrors((prev) => ({ ...prev, current_purchase_price: "" }));
                          }
                        }}
                        placeholder="0.00"
                        className={`h-11 pl-7 rounded-xl bg-white shadow-sm ${errors.current_purchase_price ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200"}`}
                      />
                    </div>
                    {errors.current_purchase_price && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        {errors.current_purchase_price}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-[11px] font-bold uppercase ${errors.current_selling_price ? "text-red-500" : "text-slate-500"}`}>
                      Selling Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 text-xs font-bold">
                        Rs
                      </span>
                      <Input
                        type="number"
                        value={currentItem.selling_price}
                        min={0}
                        onChange={(e) => {
                          setCurrentItem((prev) => ({
                            ...prev,
                            selling_price:
                              Number(e.target.value) < 0 ? "" : e.target.value,
                          }));
                          if (errors.current_selling_price) {
                            setErrors((prev) => ({ ...prev, current_selling_price: "" }));
                          }
                        }}
                        placeholder="0.00"
                        className={`h-11 pl-9 rounded-xl bg-white shadow-sm ${errors.current_selling_price ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200"}`}
                      />
                    </div>
                    {errors.current_selling_price && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        {errors.current_selling_price}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">
                    Attachments (Images / PDF)
                  </Label>
                  <Input
                    id="attachment-input"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    onClick={() =>
                      document.getElementById("attachment-input")?.click()
                    }
                    className="min-h-[84px] border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center text-xs text-slate-600 cursor-pointer hover:bg-blue-50/40 transition-colors bg-white"
                  >
                    Choose Files
                  </div>

                  {currentItem.attachments &&
                    currentItem.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentItem.attachments.map((file, idx) => {
                          const isImage = file.type.startsWith("image/");
                          const thumbSrc = (file as any).preview || URL.createObjectURL(file);
                          return (
                            <div
                              key={idx}
                              className="group relative h-16 w-16 border border-slate-200 rounded-lg overflow-visible bg-slate-50 cursor-pointer"
                              onClick={() => openAttachmentPreview(file)}
                            >
                              {isImage ? (
                                <img
                                  src={thumbSrc}
                                  alt="preview"
                                  className="h-full w-full object-cover rounded-lg transition-transform group-hover:scale-110"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400 rounded-lg">
                                  <FileText size={20} />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(idx);
                                }}
                                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md border border-white transition-all hover:bg-red-600 hover:scale-105 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white px-1 truncate rounded-b-lg">
                                {file.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {currentItem.existing_attachments &&
                    currentItem.existing_attachments.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">
                          Existing Files
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentItem.existing_attachments.map((path: string, idx) => {
                            const fileUrl = getStorageFileUrl(path);
                            const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(path);
                            return (
                              <div
                                key={`existing-current-${idx}`}
                                className="group relative h-16 w-16 border border-slate-200 rounded-lg overflow-visible bg-slate-50 cursor-pointer"
                                onClick={() => {
                                  setPreviewSrc(fileUrl);
                                  setPreviewTitle(`Existing File ${idx + 1}`);
                                  setPreviewIsImage(isImg);
                                }}
                              >
                                {isImg ? (
                                  <img
                                    src={fileUrl}
                                    alt="existing"
                                    className="h-full w-full object-cover rounded-lg transition-transform group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-slate-400 rounded-lg">
                                    <FileText size={20} />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeExistingAttachmentFromCurrentItem(idx);
                                  }}
                                  className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md border border-white transition-all hover:bg-red-600 hover:scale-105 cursor-pointer"
                                  title="Remove existing file"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Attributes multi-select */}
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-2">
                    <Settings2 size={14} /> Attributes {filteredAttributes.length > 0 && <span className="text-red-500">*</span>}
                  </Label>
                  {currentItem.attribute_summary && editingItemIndex !== null && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                      Previously selected: <span className="font-semibold text-slate-800">{currentItem.attribute_summary}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {!currentItem.product_master_id ? (
                      <div className="text-[10px] font-medium text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center gap-2">
                        <Package size={20} className="text-slate-200" />
                        Select a product first to configure its attributes
                      </div>
                    ) : filteredAttributes.length === 0 ? (
                        <div className="text-[10px] font-medium text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center gap-2">
                          <CheckCircle2 size={20} className="text-slate-200" />
                          No specific attributes found for this product category
                        </div>
                      ) : (
                        filteredAttributes.map((attr) => {
                            const values = attr.values
                              ? attr.values
                                  .split(",")
                                  .map((v) => v.trim())
                                  .filter(Boolean)
                              : [];
                            if (!values.length) return null;
                            const selected =
                              attributeSelections[attr.id.toString()] || [];
                            return (
                              <div
                                key={attr.id}
                                className="space-y-2 border border-slate-100 bg-slate-50/20 rounded-xl p-3 hover:bg-white hover:shadow-sm transition-all"
                              >
                                <div className="text-[11px] font-semibold uppercase text-slate-500">
                                  {attr.name}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {values.map((val) => {
                                    const isActive = selected.includes(val);
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() =>
                                          toggleAttributeValue(
                                            attr.id.toString(),
                                            val
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                                          isActive
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                      )
                    }
                  </div>
                </div>
                {errors.items && (
                  <p className="text-[10px] text-red-500 font-bold -mt-2">
                    {errors.items}
                  </p>
                )}

                {/* GST, attachments & add button */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                     <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-slate-500 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={currentItem.tax_enabled}
                            onChange={(e) =>
                              setCurrentItem((prev) => ({
                                ...prev,
                                tax_enabled: e.target.checked,
                              }))
                            }
                          />
                          GST
                        </div>
                        {currentItem.tax_enabled && (
                          <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setCurrentItem(prev => ({ ...prev, tax_type: "percentage", tax_amount: "" }))}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${currentItem.tax_type === "percentage" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setCurrentItem(prev => ({ ...prev, tax_type: "fixed", tax_percent: "" }))}
                              className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${currentItem.tax_type === "fixed" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
                            >
                              FIXED
                            </button>
                          </div>
                        )}
                      </Label>
                      {currentItem.tax_enabled && (
                        <div>
                          {currentItem.tax_type === "percentage" ? (
                            <div className="space-y-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  value={currentItem.tax_percent}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const price = Number(currentItem.purchase_price || 0);
                                    const qty = Number(currentItem.quantity || 0);
                                    const taxAmt = (price * qty * val) / 100;
                                    setCurrentItem((prev) => ({
                                      ...prev,
                                      tax_percent: e.target.value,
                                      tax_amount: taxAmt > 0 ? taxAmt.toFixed(2) : "",
                                    }));
                                  }}
                                  placeholder="0"
                                  className="h-10 pr-7 border-slate-200 rounded-xl text-xs bg-white font-bold"
                                />
                                <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={currentItem.tax_amount}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const price = Number(currentItem.purchase_price || 0);
                                    const qty = Number(currentItem.quantity || 0);
                                    const taxPerc = (price * qty) > 0 ? (val * 100) / (price * qty) : 0;
                                    setCurrentItem((prev) => ({
                                      ...prev,
                                      tax_amount: e.target.value,
                                      tax_percent: taxPerc > 0 ? taxPerc.toFixed(2) : "",
                                    }));
                                  }}
                                  placeholder="0.00"
                                  className="h-10 pl-7 border-slate-200 rounded-xl text-xs bg-white font-bold"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <div className="flex items-center gap-2">
                        {editingItemIndex !== null && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelItemEdit}
                            className="rounded-xl text-xs font-bold uppercase tracking-widest px-4 h-11"
                          >
                            Cancel Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={addItem}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest px-6 h-11"
                        >
                          {editingItemIndex !== null ? "Update Item" : "Add Item"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items table */}
              {items.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-500 tracking-widest border-b">
                        <th className="py-2 text-left">Product</th>
                        <th className="py-2 text-left">Attributes</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Price</th>
                        <th className="py-2 text-right">Sell</th>
                        <th className="py-2 text-right">GST</th>
                        <th className="py-2 text-right">Files</th>
                        <th className="py-2 text-right">Total</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const product = findProductByMasterValue(item.product_master_id);
                        const values = calculateItemValues(item);
                        const gstLabel =
                          !item.tax_enabled || (!values.gstPercent && !values.gstAmount)
                            ? "-"
                            : `${values.gstPercent ? values.gstPercent.toFixed(2) + "%" : ""}${
                                values.gstPercent && values.gstAmount ? " | " : ""
                              }${values.gstAmount ? "Rs. " + values.gstAmount.toFixed(2) : ""}`;
                        const filesCount = (item.attachments?.length || 0) + (item.existing_attachments?.length || 0);
                        const existingFiles = item.existing_attachments || [];

                        console.log(existingFiles,"--------->")
                        return (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 pr-2">
                              <div className="font-semibold text-slate-800">
                                {product?.name || item.product_name || "-"}
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-slate-500">
                              {item.attribute_summary || "-"}
                            </td>
                            <td className="py-2 pr-2 text-right font-semibold">
                              {values.qty}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              Rs. {values.price.toFixed(2)}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              Rs. {Number(item.selling_price || 0).toFixed(2)}
                            </td>
                            <td className="py-2 pr-2 text-right text-slate-600">
                              {gstLabel}
                            </td>
                            <td className="py-2 pr-2 text-right text-slate-600">
                              {filesCount > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {existingFiles?.map((path: string, fIdx: number) => {
                                    const url = getStorageFileUrl(path);
                                    // console.log(url,"---------->ssss")
                                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(path);
                                    return (
                                      <div key={fIdx} className="relative group h-8 w-8 border rounded overflow-hidden cursor-pointer"
                                        onClick={() => { setPreviewSrc(url); setPreviewTitle(`File ${fIdx+1}`); setPreviewIsImage(isImg); }}>
                                        {isImg ? <img src={url} className="h-full w-full object-cover" alt="" /> : (
                                          <div className="h-full w-full flex items-center justify-center bg-slate-50">
                                            <FileText size={14} className="text-slate-400" />
                                          </div>
                                        )}
                                        <button type="button"
                                          onClick={(e) => { e.stopPropagation();
                                            setItems(prev => prev.map((it, i) => i === idx ? { ...it, existing_attachments: it.existing_attachments?.filter((_, j) => j !== fIdx) } : it));
                                          }}
                                          className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <X size={8} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {item.attachments?.map((file, fIdx) => {
                                    const isImg = file.type.startsWith("image/");
                                    const thumbSrc = (file as any).preview || URL.createObjectURL(file);
                                    return (
                                      <div key={`new-${fIdx}`} className="relative group h-8 w-8 border rounded overflow-hidden cursor-pointer"
                                        onClick={() => { setPreviewSrc(thumbSrc); setPreviewTitle(file.name); setPreviewIsImage(isImg); }}>
                                        {isImg ? <img src={thumbSrc} className="h-full w-full object-cover" alt="" /> : (
                                          <div className="h-full w-full flex items-center justify-center bg-slate-50">
                                            <FileText size={12} className="text-blue-400" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : "-"}
                            </td>
                            <td className="py-2 pr-2 text-right font-semibold">
                              Rs. {values.total.toFixed(2)}
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleEditItem(idx)}
                                  className="h-7 w-7 p-0"
                                  title="Edit item"
                                >
                                  <Pencil size={12} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    removeItem(idx);
                                    if (items.length - 1 > 0 && errors.items) {
                                      setErrors((prev) => ({ ...prev, items: "" }));
                                    }
                                  }}
                                  className="h-7 px-3 text-[10px]"
                                >
                                  Remove
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <Wallet size={14} className="text-blue-500" /> Payment Summary
                </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Subtotal</p>
                    <p className="text-sm font-bold text-slate-800">Rs. {orderSummary.subtotal.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400">GST</p>
                    <p className="text-sm font-bold text-slate-800">Rs. {orderSummary.gst.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Gross</p>
                    <p className="text-sm font-bold text-slate-800">Rs. {paymentSummary.gross.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Discount</p>
                    <p className="text-sm font-bold text-slate-800">Rs. {paymentSummary.discountAmount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Total Paid</p>
                    <p className="text-sm font-bold text-emerald-700">Rs. {paymentSummary.paid.toFixed(2)}</p>
                    {isEditMode && alreadyPaidAmount > 0 && (
                       <p className="text-[9px] text-emerald-500 italic mt-0.5">Incl. prev Rs. {alreadyPaidAmount.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-amber-700">Due</p>
                    <p className="text-sm font-bold text-amber-800">Rs. {paymentSummary.due.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Discount</Label>
                    <div className="flex gap-2">
                      <select
                        value={discountType}
                        onChange={(e) =>
                          setDiscountType(
                            e.target.value === "fixed" ? "fixed" : "percentage"
                          )
                        }
                        className="h-11 w-28 border border-slate-200 rounded-xl px-3 bg-white text-xs font-semibold outline-none"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">
                      {isEditMode ? "Additional Payment" : "Paid Amount"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={paymentSummary.remainingToPay}
                      value={paidAmount}
                      disabled={isAdditionalPaymentLocked}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > paymentSummary.remainingToPay) {
                          toast.error(`Paid amount cannot exceed remaining balance (Rs. ${paymentSummary.remainingToPay.toFixed(2)})`);
                          setPaidAmount(paymentSummary.remainingToPay.toString());
                          return;
                        }
                        // Investor pool validation
                        if (selectedInvestment) {
                          const poolBalance = Number(selectedInvestment.remaining_pool_balance ?? selectedInvestment.amount ?? 0);
                          if (val > poolBalance) {
                            toast.error(`Insufficient investor pool balance. Available: ₹${poolBalance.toLocaleString('en-IN')}`);
                            setPaidAmount(poolBalance.toString());
                            return;
                          }
                        }
                        setPaidAmount(e.target.value);
                      }}
                      placeholder="0"
                      className={`h-11 rounded-xl border-slate-200 ${isAdditionalPaymentLocked ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
                    />
                    {isAdditionalPaymentLocked && (
                      <p className="text-[10px] text-slate-400">Fully paid — no pending balance</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Payment Method</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-11 w-full border border-slate-200 rounded-xl px-3 bg-white text-xs font-semibold outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* Investor dropdown — below payment method */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Investor Pool (Optional)</Label>
                  <select
                    value={selectedInvestment?.unique_id || ""}
                    onChange={(e) => {
                      const found = investments.find((i: any) => i.unique_id === e.target.value);
                      setSelectedInvestment(found || null);
                    }}
                    className="h-11 w-full border border-slate-200 rounded-xl px-3 bg-white text-xs font-semibold outline-none"
                  >
                    <option value="">— None (Cash/Own funds) —</option>
                    {investments.map((inv: any) => {
                      const name = `${inv.investor?.first_name || ""} ${inv.investor?.last_name || ""}`.trim();
                      const balance = Number(inv.remaining_pool_balance ?? inv.amount ?? 0);
                      return (
                        <option key={inv.unique_id} value={inv.unique_id}>
                          {name} ({inv.unique_id}) — Remaining: ₹{balance.toLocaleString("en-IN")}
                        </option>
                      );
                    })}
                  </select>
                  {selectedInvestment && (
                    <div className="flex flex-wrap gap-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs">
                      <span className="text-slate-500">Total Pool: <strong className="text-slate-800">₹{Number(selectedInvestment.amount || 0).toLocaleString("en-IN")}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">Remaining: <strong className="text-green-700">₹{Number(selectedInvestment.remaining_pool_balance ?? selectedInvestment.amount ?? 0).toLocaleString("en-IN")}</strong></span>
                      {Number(paidAmount) > Number(selectedInvestment.remaining_pool_balance ?? selectedInvestment.amount ?? 0) && (
                        <span className="text-red-600 font-bold">⚠ Insufficient pool balance</span>
                      )}
                    </div>
                  )}
                </div>

                {paymentMethod === "UPI" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-blue-600">Reference Number (UPI) *</Label>
                      <Input
                        type="text"
                        value={upiReferenceNo}
                        onChange={(e) => setUpiReferenceNo(e.target.value)}
                        placeholder="Enter transaction reference no."
                        className="h-11 rounded-xl border-blue-200 focus:border-blue-400 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-blue-600">Payment Screenshot</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setPaymentScreenshot(e.target.files?.[0] || null);
                            setExistingScreenshotUrl("");
                          }}
                          className="h-11 rounded-xl border-blue-200 focus:border-blue-400 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {/* New file preview */}
                        {paymentScreenshot && (
                          <div
                            className="h-11 w-11 rounded-lg border border-blue-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              const url = URL.createObjectURL(paymentScreenshot);
                              setPreviewSrc(url);
                              setPreviewTitle("Payment Screenshot");
                              setPreviewIsImage(true);
                            }}
                          >
                            <img src={URL.createObjectURL(paymentScreenshot)} alt="Screenshot" className="h-full w-full object-cover" />
                          </div>
                        )}
                        {/* Existing screenshot (edit mode) */}
                        {!paymentScreenshot && existingScreenshotUrl && (
                          <div
                            className="h-11 w-11 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setPreviewSrc(existingScreenshotUrl);
                              setPreviewTitle("Payment Screenshot");
                              setPreviewIsImage(true);
                            }}
                            title="View existing screenshot"
                          >
                            <img src={existingScreenshotUrl} alt="Existing" className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Payment Note</Label>
                  <textarea
                    rows={2}
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Optional note (reference no, remarks, etc.)"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </div>

              

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {/* <div className="flex gap-2">
                    <button
                      onClick={() => router.push("/inventory/orders/add")}
                      className="px-4 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Generate Invoice
                    </button>
                    <button
                      onClick={() => router.push("/inventory/products/list")}
                      className="px-4 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Purchase History
                    </button>
                  </div> */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSubmit(undefined, "save")}
                      disabled={loading || items.length === 0}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest px-6 h-11"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : "Save"}
                    </Button>
                    <Button
                      onClick={() => handleSubmit(undefined, "print")}
                      disabled={loading || items.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest px-6 h-11"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : "Save & Print"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
      </>
      )}

      {previewSrc && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <button
              type="button"
              onClick={closePreview}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-black text-white flex items-center justify-center shadow-lg"
            >
              <X size={18} />
            </button>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <p className="text-sm font-semibold text-gray-800 truncate">{previewTitle}</p>
              <Button variant="outline" size="sm" onClick={closePreview} className="h-8 px-3 text-xs">
                Close
              </Button>
            </div>
            <div className="bg-gray-50 flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
              {previewIsImage ? (
                <img
                  src={previewSrc}
                  alt={previewTitle}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={previewSrc}
                  title={previewTitle}
                  className="w-full h-[70vh] bg-white rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <SimpleConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Save?"
        message="Are you sure you want to record this purchase? This will update your stock levels."
        confirmText={loading ? "Saving..." : submitAction === "print" ? "Save & Print" : "Save"}
        cancelText="Cancel"
        onConfirm={() => handleSubmit(undefined, submitAction)}
        loading={loading}
      />
    </div>
  );
}



