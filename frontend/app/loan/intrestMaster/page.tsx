"use client";

import { useEffect, useState } from "react";
import { Edit, Trash } from "lucide-react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

/* ============================
   TYPES
============================ */
type InterestRate = {
  id: number;
  loan_type: string;
  interest_rate: number;
  cms_admin_id?: string; // ✅ optional
  created_at: string;
  updated_at: string;
};

export default function InterestMasterPage() {
  const [rates, setRates] = useState<InterestRate[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [selected, setSelected] = useState<InterestRate | null>(null);

  const [loanType, setLoanType] = useState("");
  const [interestRate, setInterestRate] = useState<number | "">("");


  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  /* ============================
     GET ALL
  ============================ */
const fetchRates = async () => {
  try {
    setLoading(true);

    const user = getLoggedInUser();
    if (!user) return;

    const res = await axiosInstance.get(
      ProjectApiList.api_getInterestRates,
      {
        params: {
          user_id: user.user_id,
          branch_id: user.branch,
          // cms_admin_id: user.cms_admin, 
        },
      }
    );

    if (res.data.success) {
      setRates(res.data.data);
    }
  } catch (err) {
    console.error("Fetch failed", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRates();
  }, []);

  /* ============================
     CREATE
  ============================ */
const handleCreate = async () => {
  if (!loanType || !interestRate) return;

  const user = getLoggedInUser();
  if (!user) return;

  try {
    const res = await axiosInstance.post(
      ProjectApiList.api_createInterestRates,
      {
        loan_type: loanType,
        interest_rate: Number(interestRate),
        user_id: user.user_id,
        branch_id: user.branch,
        cms_admin_id: user.cms_admin, // ✅ ADD THIS
      }
    );

    if (res.data.success) {
      fetchRates();
      setOpenCreate(false);
      setLoanType("");
      setInterestRate("");
    }
  } catch (err) {
    console.error("Create failed", err);
  }
};

  /* ============================
     GET BY ID (for edit)
  ============================ */
  const handleEditOpen = async (id: number) => {
    try {
      const res = await axiosInstance.get(
        `${ProjectApiList.api_getInterestRatesById}/${id}`
      );

      if (res.data.success) {
        const data = res.data.data;
        setSelected(data);
        setLoanType(data.loan_type);
        setInterestRate(data.interest_rate);
        setOpenEdit(true);
      }
    } catch (err) {
      console.error("Fetch by id failed", err);
    }
  };

  /* ============================
     UPDATE
  ============================ */
const handleUpdate = async () => {
  if (!selected) return;

  const user = getLoggedInUser();
  if (!user) return;

  try {
    const res = await axiosInstance.post(
      `${ProjectApiList.api_updateInterestRatesById}/${selected.id}`,
      {
        loan_type: loanType,
        interest_rate: Number(interestRate),
        user_id: user.user_id,  // ✅ FIXED
        branch_id: user.branch,
        cms_admin_id: user.cms_admin, // ✅ ADD THIS
      }
    );

    if (res.data.success) {
      fetchRates();
      setOpenEdit(false);
      setSelected(null);
    }
  } catch (err) {
    console.error("Update failed", err);
  }
};

  /* ============================
     DELETE
  ============================ */
  const handleDelete = async () => {
    if (!selected) return;

    try {
      const res = await axiosInstance.post(
        `${ProjectApiList.api_deleteInterestRates}/${selected.id}`
      );

      if (res.data.success) {
        fetchRates();
        setOpenDelete(false);
        setSelected(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Interest Master
          </h1>
          <p className="text-gray-500">
            {rates.length} interest rates found
          </p>
        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          + Add Interest Rate
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        {loading ? (
          <div className="text-center py-6 text-gray-500">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-700">
                  {[
                    "S No.",
                    "Loan Type",
                    "Interest Rate (%)",
                    "Created",
                    "Updated",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      No data found
                    </td>
                  </tr>
                ) : (
                  rates.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {r.loan_type}
                      </td>
                      <td className="px-4 py-3">
                        {r.interest_rate}%
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(r.updated_at)}
                      </td>

                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => handleEditOpen(r.id)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded-md"
                        >
                          <Edit size={14} className="text-blue-600" />
                        </button>

                        <button
                          onClick={() => {
                            setSelected(r);
                            setOpenDelete(true);
                          }}
                          className="p-1.5 bg-red-100 hover:bg-red-200 rounded-md"
                        >
                          <Trash size={14} className="text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(openCreate || openEdit) && (
        <Modal
          title={openCreate ? "Add Interest Rate" : "Edit Interest Rate"}
          onClose={() => {
            setOpenCreate(false);
            setOpenEdit(false);
          }}
          onSubmit={openCreate ? handleCreate : handleUpdate}
          loanType={loanType}
          interestRate={interestRate}
          setLoanType={setLoanType}
          setInterestRate={setInterestRate}
        />
      )}

      {openDelete && selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[999]">
          <div className="bg-white w-[420px] rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold">
              Delete Interest Rate
            </h2>

            <p className="mt-2 text-sm">
              Delete <b>{selected.loan_type}</b>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpenDelete(false)}
                className="px-3 py-1.5 text-sm border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================
   MODAL
============================ */
function Modal({
  title,
  onClose,
  onSubmit,
  loanType,
  interestRate,
  setLoanType,
  setInterestRate,
}: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[999]">
      <div className="bg-white w-[420px] rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {title}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm">Loan Type</label>
            <input
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="w-full border rounded-md px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="text-sm">Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) =>
                setInterestRate(Number(e.target.value))
              }
              className="w-full border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded-md"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}