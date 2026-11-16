"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Inquiry = {
  id: number;
  inquiry_id: string;
  product_id: string;
  product_name: string;
  price: number;
  selling_price?: number;
  buying_price?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  branch_id?: string;
  selected_variant?: string;
  verified_by_fe?: number;
  attributes?: Record<string, string>;
  created_at?: string;
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function InquiryDetailsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("id") || "";

  const [data, setData] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!data) return;
    try {
      setVerifying(true);
      await axiosInstance.post(
        `${ProjectApiList.VERIFY_PRODUCT_INQUIRY_FE}/${data.inquiry_id}/verify-fe`
      );
      router.push("/loan/loans/inquiries");
    } catch {
      alert("Verification failed");
    } finally {
      setVerifying(false);
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get(
          `${ProjectApiList.GET_PRODUCT_INQUIRY_DETAIL}/${inquiryId}`
        );
        setData(res.data.data);
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [inquiryId]);

  if (loading)
    return <div className="p-8 text-center text-sm text-gray-500">Loading...</div>;

  if (error)
    return <div className="p-8 text-sm text-red-600">{error}</div>;

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-5 space-y-5">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            Inquiry Details
          </h1>
          <p className="text-xs text-gray-500">
            Investigator view
          </p>
        </div>

        <Link
          href="/loan/loans/inquiries"
          className="text-sm border px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          Back
        </Link>
      </div>

      {/* SUMMARY */}
      <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-800">
            {data.product_name}
          </p>
          <p className="text-xs text-gray-500">
            ID: {data.inquiry_id}
          </p>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${data.verified_by_fe
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
            }`}
        >
          {data.verified_by_fe ? "Verified" : "Pending"}
        </span>
      </div>

      {/* CUSTOMER */}
      <Card title="Customer">
        <Info label="Name" value={data.customer_name} />
        <Info label="Phone" value={data.customer_phone} />
        <Info label="Email" value={data.customer_email || "-"} />
      </Card>

      {/* PRODUCT */}
      <Card title="Product">
        <Info label="Product ID" value={data.product_id} />
        <Info label="Variant" value={data.selected_variant || "-"} />

        {/* ATTRIBUTES INSIDE PRODUCT */}
        <div className="md:col-span-2">
          <p className="text-[11px] text-gray-500 mb-1">Attributes</p>

          {data.attributes && Object.keys(data.attributes).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.attributes).map(([k, v]) => (
                <span
                  key={k}
                  className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                >
                  {k}: {v}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">No attributes</span>
          )}
        </div>
      </Card>

      {/* PRICING */}
      <Card title="Pricing">
        <Info label="Base" value={`₹ ${data.price}`} />
        <Info label="Selling" value={`₹ ${data.selling_price || 0}`} />
        <Info label="Buying" value={`₹ ${data.buying_price || 0}`} />
      </Card>

      {/* META */}
      <Card title="Meta">
        <Info label="Branch" value={data.branch_id || "-"} />
        <Info label="Created" value={formatDateTime(data.created_at)} />
      </Card>

      {/* ATTRIBUTES */}
      {/* <Card title="Attributes">
        {data.attributes ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.attributes).map(([k, v]) => (
              <span
                key={k}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border"
              >
                {k}: {v}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">No attributes</span>
        )}
      </Card> */}

      {/* ACTION */}
      {!data.verified_by_fe && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmOpen(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Verify
          </button>
        </div>
      )}

      {/* MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-999">
          <div className="bg-white p-5 rounded-lg w-full max-w-sm">
            <h2 className="text-sm font-semibold text-gray-800">
              Confirm Verification
            </h2>
            <p className="text-xs text-gray-500 mt-2">
              This will mark the inquiry as verified.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmOpen(false)}
                className="text-sm px-3 py-1.5 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS */

function Card({ title, children }: any) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 font-medium break-words">
        {value}
      </p>
    </div>
  );
}