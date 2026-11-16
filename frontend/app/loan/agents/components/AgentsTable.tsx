"use client";

import { Trash, Eye, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AgentsTable({
  agents = [],
  loading,
  page,
  perPage,
  total,
  from,
  to,
  lastPage,
  onPageChange,
  onDelete,
}: any) {
  const router = useRouter();

  return (
    <div className="rounded-xl border overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {[
                "S.No",
                "Name",
                "Email",
                "Phone",
                "Location",
                "Status",
                "Created",
                "Actions",
              ].map((head) => (
                <th key={head} className="px-4 py-3 border-b">
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10">
                  Loading agents...
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10">
                  No agents found
                </td>
              </tr>
            ) : (
              agents?.map((agent: any, index: number) => {
                const serialNo = (page - 1) * perPage + index + 1;

                return (
                  <tr key={agent.id} className="hover:bg-blue-50">
                    <td className="px-4 py-3">{serialNo}</td>
                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                    <td className="px-4 py-3">{agent.email}</td>
                    <td className="px-4 py-3">{agent.phone_no}</td>
                    <td className="px-4 py-3">{agent.location}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          agent.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {agent.created_at?.split("T")[0]}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/loan/agents/agentDetails?id=${agent.id}`
                            )
                          }
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs flex items-center gap-1"
                        >
                          <Eye size={14} /> View
                        </button>

                        <button
                          onClick={() =>
                            router.push(
                              `/loan/agents/editAgent?id=${agent.agent_unique_id}`
                            )
                          }
                          className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs flex items-center gap-1"
                        >
                          <Edit2 size={14} /> Edit
                        </button>

                        <button
                          onClick={() => onDelete(agent)}
                          className="p-1.5 bg-red-100 rounded-md text-red-600"
                        >
                          <Trash size={14} />
                        </button>
                        {/* </button> */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex justify-between items-center p-4 bg-gray-50 text-sm">
          <p>
            Showing <b>{from}</b> – <b>{to}</b> of <b>{total}</b> agents
          </p>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 bg-gray-100 rounded-md"
            >
              Previous
            </button>

            <button
              disabled={page === lastPage}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 bg-gray-100 rounded-md"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}