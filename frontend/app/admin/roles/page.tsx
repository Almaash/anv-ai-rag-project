"use client";

import { useEffect, useState } from "react";
import CreateRoleModal from "./components/CreateRoleModal";
import EditRoleModal from "./components/EditRoleModal";
import DeleteRoleModal from "./components/DeleteRoleModal";


import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";



import { Plus, Edit, Trash2 } from "lucide-react";
import PageSkeleton from "@/components/common/PageSkeleton";

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState<any>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };


  const fetchRoles = async () => {
    try {
      setLoading(true);

      const params: any = {};

      if (currentUser?.role === "cms_admin") {
        params.branch_id = currentUser.branch;
      }

      const res = await axiosInstance.get(ProjectApiList.GET_ALL_ROLES, { params });

      let rolesData = res.data.data.roles || [];

      // ✅ Filter for super_admin
      if (currentUser?.role === "super_admin") {
        rolesData = rolesData.filter(
          (role: any) =>
            role.name === "super_admin" || role.name === "cms_admin" || role.name === "customer"|| role.name === "employee"
        );
      }

      setRoles(rolesData);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchRoles();
  }, [currentUser]);


  if (loading) return <PageSkeleton rows={4} />;

  return (
    <div className="p-6 md:p-10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Manage Roles
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {roles.length} roles available
          </p>
        </div>

        <button
          onClick={() => setOpenCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition"
        >
          +          Add Role
        </button>

      </div>

      {/* Clean Modern Table */}
      <div className="bg-white rounded-2xl shadow-sm">

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">

            {/* Header */}
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-4 text-left font-medium">#</th>
                <th className="px-6 py-4 text-left font-medium">Role Name</th>
                <th className="px-6 py-4 text-left font-medium">Description</th>
                <th className="px-6 py-4 text-left font-medium">Created</th>
                <th className="px-6 py-4 text-left font-medium">Updated</th>
                <th className="px-6 py-4 text-center font-medium">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-3xl">🛡️</div>
                      <p className="text-sm">No roles found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((role: any, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 hover:bg-gray-50/60 transition"
                  >
                    <td className="px-6 py-5 text-gray-400">
                      {i + 1}
                    </td>

                    <td className="px-6 py-5 font-medium text-gray-900">
                      {role.name}
                    </td>

                    <td className="px-6 py-5 text-gray-500 max-w-[350px] truncate">
                      {role.description || "—"}
                    </td>

                    <td className="px-6 py-5 text-gray-500">
                      {formatDateTime(role.created_at)}
                    </td>

                    <td className="px-6 py-5 text-gray-500">
                      {formatDateTime(role.updated_at)}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-4">

                        <button
                          onClick={() => setOpenEditModal(role)}
                          className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-100 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setOpenDeleteModal(role)}
                          className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* Modals */}
      {openCreateModal && (
        <CreateRoleModal
          onClose={() => setOpenCreateModal(false)}
          onCreated={fetchRoles}
        />
      )}

      {openEditModal && (
        <EditRoleModal
          role={openEditModal}
          onClose={() => setOpenEditModal(null)}
          onUpdated={fetchRoles}
        />
      )}

      {openDeleteModal && (
        <DeleteRoleModal
          role={openDeleteModal}
          onClose={() => setOpenDeleteModal(null)}
          onDeleted={fetchRoles}
        />
      )}
    </div>
  );
}
