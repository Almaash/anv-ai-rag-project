"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Edit2 } from "lucide-react";

/* ================= HELPERS ================= */

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}/${path}`;
};

const InfoItem = ({ label, value }: any) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 break-all">
      {value || "—"}
    </p>
  </div>
);

const DocumentImage = ({ label, image }: any) => {
  const url = getImageUrl(image);

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <p className="text-xs text-gray-500">{label}</p>

      {url ? (
        <a href={url} target="_blank">
          <img
            src={url}
            alt={label}
            className="h-36 w-full object-cover rounded-md hover:opacity-90 cursor-pointer"
          />
        </a>
      ) : (
        <div className="h-36 flex items-center justify-center bg-gray-100 text-xs text-gray-400 rounded-md">
          No Image
        </div>
      )}
    </div>
  );
};

/* ================= PAGE ================= */

export default function AgentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgent = async () => {
    if (!id) return;

    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.api_getAgentById}/${id}`
      );

      if (res.data.success) {
        setAgent(res.data.data);
      }
    } catch (err) {
      console.error("Fetch agent failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgent();
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!agent)
    return (
      <div className="py-20 text-center text-gray-500">
        Agent not found
      </div>
    );

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-sm text-gray-500">
            {agent.agent_unique_id}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              router.push(`/loan/agents/editAgent?id=${agent.agent_unique_id}`)
            }
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Edit2 size={14} /> Edit Agent
          </button>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* PHOTO + BASIC INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PHOTO */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-semibold mb-3">Agent Photo</p>

          {agent.photo ? (
            <img
              src={getImageUrl(agent.photo) || ""}
              className="w-full h-60 object-cover rounded-lg"
            />
          ) : (
            <div className="h-60 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
              No Photo
            </div>
          )}
        </div>

        {/* BASIC INFO */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-semibold mb-4">Basic Information</p>

          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Email" value={agent.email} />
            <InfoItem label="Phone" value={agent.phone_no} />
            <InfoItem label="Gender" value={agent.gender} />
            <InfoItem label="Location" value={agent.location} />
            <InfoItem label="Address" value={agent.address} />
            <InfoItem
              label="Created At"
              value={formatDate(agent.created_at)}
            />

            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span
                className={`px-2 py-1 text-xs rounded-full ${agent.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                  }`}
              >
                {agent.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTS */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-sm font-semibold mb-4">Uploaded Documents</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DocumentImage label="Aadhaar Card Front" image={agent.adhaar_image} />

          {/* ADD THIS */}
          <DocumentImage
            label="Aadhaar Card Back"
            image={agent.aadhaar_image_back}
          />

          <DocumentImage label="PAN Card" image={agent.pan_image} />

          <DocumentImage label="Voter ID Front" image={agent.voter_id_image} />

          {/* ADD THIS */}
          <DocumentImage
            label="Voter ID Back"
            image={agent.voter_id_image_back}
          />

          <DocumentImage
            label="Driving License"
            image={agent.driving_license_image}
          />

          <DocumentImage
            label="Passbook"
            image={agent.passbook_image}
          />

          <DocumentImage
            label="Police Verification"
            image={agent.police_verification_image}
          />
        </div>
      </div>
    </div>
  );
}