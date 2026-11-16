"use client";

import { useEffect, useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

interface Investor {
  id: number;
  first_name: string;
  last_name: string;
  current_address: string;
  mobile: string;
}

interface InvestorFormProps {
  investors: Investor[];
  initialData?: any;
  mode?: "create" | "edit";
}

const InvestorForm: React.FC<InvestorFormProps> = ({ investors, initialData, mode = "create" }) => {
  const router = useRouter();
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    investor_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    rate: "10",
    yearly: "",
    maturity: "",
    lockin: "",
  });

  // Load initial data for edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        investor_id: initialData.investor_id || initialData.investor?.id || "",
        amount: initialData.amount || "",
        date: initialData.date || "",
        rate: initialData.rate || "10",
        yearly: initialData.yearly || "",
        maturity: initialData.maturity || "",
        lockin: initialData.lockin || "",
      });
      if (initialData.investor || (initialData.investor_id && investors.length > 0)) {
        const invId = initialData.investor_id || initialData.investor?.id;
        const inv = investors.find(i => i.id === Number(invId));
        setSelectedInvestor(inv || null);
      }
    }
  }, [initialData, investors]);

  // Calculate fields
  useEffect(() => {
    if (!formData.amount || !formData.rate) {
      setFormData((f) => ({ ...f, yearly: "", maturity: "" }));
      return;
    }
    const amt = parseFloat(formData.amount);
    const rate = parseFloat(formData.rate);

    if (isNaN(amt) || isNaN(rate) || amt < 0) return;

    const yearly = Math.round((amt * rate) / 100);
    // Maturity value after 3 years, simple interest
    const maturity = Math.round(amt + yearly * 3);

    setFormData((f) => ({
      ...f,
      yearly: yearly.toString(),
      maturity: maturity.toString(),
    }));
  }, [formData.amount, formData.rate]);

  // Lock-in date calculation (3 years from selected date)
  useEffect(() => {
    if (!formData.date) return;
    const d = new Date(formData.date);
    d.setFullYear(d.getFullYear() + 3);
    setFormData((f) => ({ ...f, lockin: d.toISOString().slice(0, 10) }));
  }, [formData.date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "investor_id") {
      const investor = investors.find((i) => i.id === Number(value));
      setSelectedInvestor(investor || null);
    }

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.investor_id) newErrors.investor_id = "Investor is required";
    if (!formData.amount) newErrors.amount = "Amount is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.rate) newErrors.rate = "Target percentage is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      if (mode === "edit" && initialData?.unique_id) {
        response = await axiosInstance.put(`${ProjectApiList.UPDATE_INVESTOR_INVESTMENT}/${initialData.unique_id}`, formData);
      } else {
        response = await axiosInstance.post(ProjectApiList.CREATE_INVESTOR_INVESTMENT, formData);
      }
      
      if (response.status === 200 || response.status === 201) {
        toast.success(mode === "edit" ? "Investment updated successfully" : "Investment added successfully");
        router.push("/loan/investor-panel");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(mode === "edit" ? "Failed to update investment" : "Failed to save investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-md p-1">
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Investor Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Select Investor</span>
              <span className="text-red-500">*</span>
            </label>
            <select
              name="investor_id"
              value={formData.investor_id}
              onChange={handleChange}
              className={`w-full h-11 border rounded-lg px-4 py-2 transition-all duration-200 outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-gray-50/30 ${
                errors.investor_id ? "border-red-500" : "border-gray-200 shadow-sm"
              }`}
            >
              <option value="">Select an Investor</option>
              {investors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.first_name} {i.last_name}
                </option>
              ))}
            </select>
            {errors.investor_id && <p className="text-xs text-red-500 mt-1">{errors.investor_id}</p>}

            {/* Selected Investor Details */}
            {selectedInvestor && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-blue-800">
                    <span className="font-semibold block mb-0.5">Primary Address</span>
                    {selectedInvestor.current_address}
                  </div>
                </div>
                <div className="flex items-start space-x-3 pt-2 border-t border-blue-100/50">
                  <div className="mt-1 flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-blue-800">
                    <span className="font-semibold block mb-0.5">Contact Method</span>
                    {selectedInvestor.mobile}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Investment Amount</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                ₹
              </span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className={`w-full h-11 border rounded-lg pl-8 pr-4 py-2 transition-all duration-200 outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-gray-50/30 ${
                  errors.amount ? "border-red-500" : "border-gray-200 shadow-sm"
                }`}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Investment Date</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`w-full h-11 border rounded-lg px-4 py-2 transition-all duration-200 outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-gray-50/30 ${
                errors.date ? "border-red-500" : "border-gray-200 shadow-sm"
              }`}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Target Percentage */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Target ROI (%)</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <input
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                placeholder="10"
                className={`w-full h-11 border rounded-lg px-4 py-2 transition-all duration-200 outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-gray-50/30 ${
                  errors.rate ? "border-red-500" : "border-gray-200 shadow-sm"
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors uppercase font-semibold text-[10px]">
                Percent
              </span>
            </div>
            {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
          </div>

          {/* Yearly Return (Read Only) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Yearly Return</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input
                type="text"
                value={formData.yearly}
                readOnly
                className="w-full h-11 border border-gray-100 rounded-lg pl-8 pr-4 py-2 bg-gray-100/50 text-gray-600 font-medium cursor-not-allowed shadow-inner"
              />
            </div>
            <p className="text-[10px] text-gray-400 italic">Auto-calculated: Amount * ROI</p>
          </div>

          {/* Maturity Value (Read Only) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Maturity Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input
                type="text"
                value={formData.maturity}
                readOnly
                className="w-full h-11 border border-gray-100 rounded-lg pl-8 pr-4 py-2 bg-gray-100/50 text-gray-600 font-medium cursor-not-allowed shadow-inner"
              />
            </div>
            <p className="text-[10px] text-gray-400 italic">Projected 3-year simple maturity</p>
          </div>

          {/* Lock-in Date (Read Only) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Lock-in Period End</label>
            <div className="relative">
              <input
                type="text"
                value={formData.lockin}
                readOnly
                className="w-full h-11 border border-gray-100 rounded-lg px-4 py-2 bg-gray-100/50 text-gray-600 font-medium cursor-not-allowed shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 uppercase font-semibold text-[10px]">
                3 Years
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-8 border-t border-gray-100 flex items-center justify-between sm:justify-end sm:space-x-4">
          <button
            type="button"
            onClick={() => router.push("/loan/investor-panel")}
            className="flex items-center px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
          >
            <svg
              className="mr-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center px-10 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-200 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? (
              <>
                <div className="mr-2 w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              mode === "edit" ? "Update Investment" : "Complete Investment"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvestorForm;
