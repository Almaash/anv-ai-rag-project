"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import AgentsTable from "./components/AgentsTable";
import DeleteAgentModal from "./components/DeleteAgentModal";
// import AgentsTable from "./components/AgentsTable";
// import DeleteAgentModal from "./components/DeleteAgentModal";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState<any>({
    current_page: 1,
    per_page: 5,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  const [openDelete, setOpenDelete] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  /* ================= FETCH ================= */

//   const fetchAgents = async () => {
//   try {
//     setLoading(true);

//     const res = await axiosInstance.get(
//       ProjectApiList.api_getAllAgents,
//       {
//         params: {
//           search,
//           per_page: pagination.per_page,
//           page,
//         },
//       }
//     );

//     if (res.data.success) {
//       // 👇 FIX HERE
//       setAgents(res.data.data.data);
//       setPagination({
//         current_page: res.data.data.current_page,
//         last_page: res.data.data.last_page,
//         per_page: res.data.data.per_page,
//         total: res.data.data.total,
//         from: res.data.data.from,
//         to: res.data.data.to,
//       });
//     }
//   } catch (error) {
//     console.error("Fetch agents failed", error);
//   } finally {
//     setLoading(false);
//   }
// };

const getLoggedInUser = () => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

const fetchAgents = async () => {
  try {
    setLoading(true);

    const user = getLoggedInUser();
    if (!user) return;

    const res = await axiosInstance.get(
      ProjectApiList.api_getAllAgents,
      {
        params: {
          search,
          status: "", // you can later connect to dropdown
          per_page: pagination.per_page,
          page,
          // user_id: user.user_id,
          branch_id: user.branch,
          cms_admin_id: user.user_id,
        },
      }
    );

    if (res.data.success) {
      const apiData = res.data.data;

      setAgents(apiData.data);

      setPagination({
        current_page: apiData.current_page,
        per_page: apiData.per_page,
        total: apiData.total,
        last_page: Math.ceil(apiData.total / apiData.per_page),
      });
    }
  } catch (error) {
    console.error("Fetch agents failed", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAgents();
  }, [search, page]);

  /* ================= DELETE ================= */

  const handleDelete = (agent: any) => {
    setSelectedAgent(agent);
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedAgent) return;

    try {
      setLoading(true);

      const res = await axiosInstance.post(
        `${ProjectApiList.api_deleteAgent}/${selectedAgent.id}`
      );

      if (res.data.success) {
        await fetchAgents();
        setOpenDelete(false);
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Field Executives Management</h1>

        <Link href="/admin/field-executive/createAgent">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            + Create Field Executive
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {pagination?.total} agents found
          </p>

          <input
            type="text"
            placeholder="Search agent..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-72 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <AgentsTable
          agents={agents}
          loading={loading}
          page={pagination?.current_page}
          lastPage={pagination?.last_page}
          from={pagination?.from}
          to={pagination?.to}
          total={pagination?.total}
          perPage={pagination?.per_page}
          onPageChange={setPage}
          onDelete={handleDelete}
        />
      </div>

      {openDelete && (
        <DeleteAgentModal
          agent={selectedAgent}
          loading={loading}
          onClose={() => setOpenDelete(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}