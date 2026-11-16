"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axiosInstance";
import { CheckCircle, Clock, XCircle } from "lucide-react";

export default function CustomerApplicationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const id = getUser()?.customer_unique_id;
      if (!id) return;

      const res = await axiosInstance.get(`/customer-processes/${id}`);

      if (res.data.success) {
        setCustomer(res.data.customer);
        setData(res.data.applications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="w-full overflow-x-hidden p-6 space-y-6">

      {/* HEADER */}
      <div className="bg-white rounded-3xl shadow-md border p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {customer?.customer_unique_id}
          </h1>
          <p className="text-sm text-gray-500">
            Customer Applications Flow
          </p>
        </div>
      </div>

      {/* LOADING */}
      {loading && <Loader />}

      {/* EMPTY */}
      {!loading && data.length === 0 && (
        <p className="text-center text-gray-500">
          No applications found
        </p>
      )}

      {/* FLOW */}
      <div className="space-y-6">
        {data.map((app: any, index: number) => (
          <div
            key={index}
            className="bg-white border rounded-2xl shadow-sm p-6 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              Application: {app.loan_application_id}
            </h2>

            {/* ✅ FIXED FLOW */}
            <div className="w-full overflow-x-auto">
              <div className="flex gap-4 items-stretch w-max pr-4">

                <StepCard
                  title="CAF"
                  id={app.loan_application_id}
                  status={app.is_verified ? "Verified" : "Pending"}
                  date={app.caf_created_at}
                />

                <Arrow />

                {app.pd ? (
                  <>
                    <StepCard
                      title="PD"
                      id={app.pd.pd_application_id}
                      status={
                        app.pd.pd_status === "approved"
                          ? "Approved"
                          : "Pending"
                      }
                      extra={`Verification: ${formatText(
                        app.pd.verification_status
                      )}`}
                      date={app.pd.pd_created_at}
                    />
                    <Arrow />
                  </>
                ) : (
                  <EmptyStep title="PD" />
                )}

                {app.cam ? (
                  <>
                    <StepCard
                      title="CAM"
                      id={app.cam.cam_unique_id}
                      status={
                        app.cam.is_verified ? "Verified" : "Pending"
                      }
                      extra={`Decision: ${formatText(
                        app.cam.credit_decision
                      )}`}
                      date={app.cam.cam_created_at}
                    />
                    <Arrow />
                  </>
                ) : (
                  <EmptyStep title="CAM" />
                )}

                {app.disbursements?.length > 0 ? (
                  <div className="flex gap-4 flex-shrink-0">
                    {app.disbursements.map((d: any, i: number) => (
                      <StepCard
                        key={i}
                        title="DISBURSEMENT"
                        id={d.disbursement_id}
                        status={
                          d.is_disbursed === 1
                            ? "Disbursed"
                            : "Pending"
                        }
                        extra={`Booking: ${formatDate(
                          d.booking_date
                        )}`}
                        date={d.date_of_disbursement}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyStep title="DISBURSEMENT" />
                )}

              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

/* STEP CARD */
const StepCard = ({ title, id, status, date, extra }: any) => {
  const router = useRouter();

  const routeMap: Record<string, string> = {
    CAF: "/loan/caf/viewDetails",
    PD: "/loan/pd/viewPD",
    CAM: "/loan/cam/viewCAM",
    DISBURSEMENT: "/loan/disbursement/panel/view",
  };

  const handleClick = () => {
    const base = routeMap[title];
    if (base && id) router.push(`${base}/?id=${id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="w-[190px] flex-shrink-0 bg-gray-50 border rounded-xl p-4 hover:shadow-md transition cursor-pointer"
    >
      <p className="text-xs text-gray-400 mb-1">{title}</p>

      <p className="font-semibold text-gray-800 text-sm">{id}</p>

      <StatusBadge status={status} />

      <p className="text-xs text-gray-500 mt-2">
        {formatDate(date)}
      </p>

      {extra && (
        <p className="text-xs text-gray-500 mt-1">{extra}</p>
      )}
    </div>
  );
};

/* STATUS BADGE */
const StatusBadge = ({ status }: any) => {
  const normalized = status?.toLowerCase();

  const statusMap: any = {
    verified: {
      style: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle size={12} />,
    },
    approved: {
      style: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle size={12} />,
    },
    disbursed: {
      style: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle size={12} />,
    },
    pending: {
      style: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      icon: <Clock size={12} />,
    },
    rejected: {
      style: "bg-red-100 text-red-700 border border-red-200",
      icon: <XCircle size={12} />,
    },
  };

  const config =
    statusMap[normalized] || {
      style: "bg-gray-100 text-gray-600 border border-gray-200",
      icon: null,
    };

  return (
    <span
      className={`inline-flex items-center gap-1 mt-2 px-3 py-1 text-xs font-medium rounded-full ${config.style}`}
    >
      {config.icon}
      {formatText(status)}
    </span>
  );
};

/* EMPTY STEP */
const EmptyStep = ({ title }: any) => (
  <div className="w-[220px] flex-shrink-0 border-2 border-dashed rounded-xl p-4 flex items-center justify-center text-gray-400 text-sm">
    {title} Pending
  </div>
);

/* ARROW */
const Arrow = () => (
  <div className="hidden lg:flex items-center text-gray-300 text-xl px-2 flex-shrink-0">
    →
  </div>
);

/* DATE */
const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN");
};

/* TEXT */
const formatText = (text: string) => {
  if (!text) return "-";
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* LOADER */
const Loader = () => (
  <div className="flex justify-center items-center h-[200px]">
    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
  </div>
);