"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import CAMForm from "../components/CAMForm";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditCAMPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCAMData();
    }
  }, [id]);

  const fetchCAMData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${ProjectApiList.api_getCAMById}/${id}`);
      if (res.data.success) {
        setInitialData(res.data.data);
      } else {
        toast.error("CAM record not found");
      }
    } catch (error) {
      console.error("Error fetching CAM data:", error);
      toast.error("Failed to load CAM details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-500">Loading CAM details...</span>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="p-6 text-center text-red-500">
        CAM record not found.
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <CAMForm mode="edit" initialData={initialData} />
    </div>
  );
}
