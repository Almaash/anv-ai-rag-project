"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import axiosInstance from "@/app/api/axiosInstance";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import ProjectApiList from "@/app/api/ProjectApiList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type FormValues = {
  branch_city_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
};

type City = {
  id: number;
  city_name: string;
  city_code: string;
  city_number: string;
};

export default function CreateBranchModal({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [cities, setCities] = useState<City[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { is_active: true }
  });

  const selectedCityId = watch("branch_city_id");
  const selectedCity = cities.find(c => c.id === Number(selectedCityId));

  // Auto-fill branch name when city is selected
  useEffect(() => {
    if (selectedCity) {
      setValue("name", selectedCity.city_name);
    } else {
      setValue("name", "");
    }
  }, [selectedCity, setValue]);

  useEffect(() => {
    if (open) {
      axiosInstance.get(`${ProjectApiList.api_getBranchCities}?all=true`)
        .then(res => setCities(res.data.data))
        .catch(() => toast.error("Failed to load cities"));
    }
  }, [open]);

  async function onSubmit(data: FormValues) {
    try {
      await axiosInstance.post("/branches", data);
      toast.success("Branch created successfully");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create branch");
    }
  }

  const codePreview = selectedCity 
    ? `${selectedCity.city_code.toUpperCase()}-${selectedCity.city_number.substring(0, 2)}XX (Sequential)`
    : "Select city to see code";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Create Branch
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 mt-2"
        >
          {/* City Selection */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Select City <span className="text-red-500">*</span>
            </label>
            <select
              {...register("branch_city_id", { required: true })}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none bg-white font-medium"
            >
              <option value="">Choose a location...</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.city_name} — {city.city_code}
                </option>
              ))}
            </select>
          </div>

          {/* Code Preview */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Generated Branch Code</p>
            <p className="text-sm font-mono font-bold text-indigo-800">{codePreview}</p>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: true })}
              readOnly
              placeholder="Auto-filled from city"
              className="w-full border border-gray-200 bg-gray-50 focus:outline-none px-3 py-2 rounded-md text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 italic">This name is automatically matched to the selected city.</p>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              {...register("address")}
              placeholder="Enter address"
              rows={2}
              className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
            />
          </div>

          {/* Phone & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                {...register("phone")}
                placeholder="9876543210"
                className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register("email")}
                placeholder="branch@email.com"
                className="w-full border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-2 rounded-md text-sm outline-none"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-md border">
            <span className="text-sm font-medium text-gray-700">
              Active Status
            </span>
            <input
              type="checkbox"
              {...register("is_active")}
              className="h-4 w-4 accent-blue-600"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Creating..." : "Create Branch"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
