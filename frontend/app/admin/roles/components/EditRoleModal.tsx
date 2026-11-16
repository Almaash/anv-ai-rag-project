"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";

export default function EditRoleModal({ role, onClose, onUpdated }: any) {

  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState("");

  const [modules, setModules] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  const actions = ["create", "read", "update", "delete"];

  /* ==========================
     FETCH MODULES
  ========================== */

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : null;

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await axiosInstance.get(ProjectApiList.api_getAllModules);
      const modulesData = res?.data?.data?.modules || [];

      // Inject admin modules for super_admin / cms_admin
      const isAdmin = user?.role === "super_admin" || user?.role === "cms_admin";
      if (isAdmin) {
        const adminModules = [
          // { module_name: "Admin Dashboard",    key: "admin_dashboard" },
          // { module_name: "Subscription",       key: "admin_subscription" },
          // { module_name: "Branches",           key: "admin_branch" },
          // { module_name: "Modules",            key: "admin_modules" },
          // { module_name: "Manage Roles",       key: "admin_roles" },
          // { module_name: "Manage Users",       key: "admin_users" },
          // { module_name: "Field Executive",    key: "admin_field_executive" },
        ];
        adminModules.forEach((am) => {
          if (!modulesData.some((m: any) => m.key === am.key)) {
            modulesData.unshift(am);
          }
        });
      }

      // Add static CAM Verification module if not already in the list
      const hasCamVerification = modulesData.some((m: any) => m.key === "loan_cam_verification");
      if (!hasCamVerification) {
        modulesData.push({ module_name: "Loan CAM Verification", key: "loan_cam_verification" });
      }

      const hasLoanProducts = modulesData.some((m: any) => m.key === "loan_products");
      if (!hasLoanProducts) {
        modulesData.push({ module_name: "Loan Products", key: "loan_products" });
      }

      setModules(modulesData);
      mapPermissions(modulesData);
    } catch {
      toast.error("Failed to load modules");
    }
  };

  /* ==========================
     MAP ROLE PERMISSIONS
  ========================== */

  const mapPermissions = (modulesData: any[]) => {

    if (!role) return;

    setRoleName(role?.name || "");

    const rolePermissions: string[] =
      role.permission || role.permissions || [];

    const mapped = modulesData.map((m: any) => ({
      module: m.module_name,
      key: m.key,

      create: rolePermissions.includes(`create_${m.key}`),
      read: rolePermissions.includes(`read_${m.key}`),
      update: rolePermissions.includes(`update_${m.key}`),
      delete: rolePermissions.includes(`delete_${m.key}`),
    }));

    setPermissions(mapped);
  };

  useEffect(() => {
    if (modules.length && role) {
      mapPermissions(modules);
    }
  }, [modules, role]);

  /* ==========================
     TOGGLE PERMISSION
  ========================== */

  const togglePermission = (index: number, action: string) => {

    const updated = [...permissions];

    updated[index][action] = !updated[index][action];

    setPermissions(updated);

  };

  /* ==========================
     SELECT ALL
  ========================== */

  const allSelected =
    permissions.length > 0 &&
    permissions.every(
      (p) => p.create && p.read && p.update && p.delete
    );

  const toggleSelectAll = () => {

    const newValue = !allSelected;

    setPermissions(
      permissions.map((p) => ({
        ...p,
        create: newValue,
        read: newValue,
        update: newValue,
        delete: newValue,
      }))
    );

  };

  /* ==========================
     BUILD PERMISSION ARRAY
  ========================== */

  const buildPermissionArray = () => {

    const result: string[] = [];

    permissions.forEach((p) => {

      if (p.create) result.push(`create_${p.key}`);
      if (p.read) result.push(`read_${p.key}`);
      if (p.update) result.push(`update_${p.key}`);
      if (p.delete) result.push(`delete_${p.key}`);

    });

    return result;

  };

  /* ==========================
     SUBMIT
  ========================== */

  const handleSubmit = async () => {

    if (!roleName.trim()) {
      toast.error("Role name required");
      return;
    }

    setLoading(true);

    try {

      const finalPermissions = buildPermissionArray();

      await axiosInstance.post(
        `${ProjectApiList.UPDATE_ROLE}/${role.role_id}`,
        {
          name: roleName,
          description: roleName,
          permission: finalPermissions,
        }
      );

      toast.success("Role updated successfully");

      onUpdated?.();
      onClose();

    } catch (error: any) {

      toast.error(
        error?.response?.data?.message || "Failed to update role"
      );

    } finally {

      setLoading(false);

    }

  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 md:px-3">

      <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-xl shadow-xl border h-[90vh] flex flex-col">

        {/* HEADER */}

        <div className="p-4 md:p-6 border-b">

          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Edit Role
          </h2>

          <input
            type="text"
            className={`w-full border p-2 rounded mb-4 ${currentUser?.role === "super_admin"
                ? "bg-gray-100 cursor-not-allowed"
                : ""
              }`}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            disabled={currentUser?.role === "super_admin"}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <span>Select All</span>
          </div>

        </div>

        {/* TABLE */}

        <div className="border rounded max-h-96 md:max-h-[500px] overflow-y-auto overflow-x-auto">

          <table className="w-full min-w-[500px] text-xs md:text-sm">

            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2">Module</th>
                <th className="p-2">Create</th>
                <th className="p-2">Read</th>
                <th className="p-2">Update</th>
                <th className="p-2">Delete</th>
              </tr>
            </thead>

            <tbody>

              {permissions.map((perm, i) => (

                <tr key={perm.key} className="border-b">

                  <td className="p-2">{perm.module}</td>

                  {actions.map((action) => (

                    <td key={action} className="text-center p-2">

                      <input
                        type="checkbox"
                        checked={perm[action]}
                        onChange={() =>
                          togglePermission(i, action)
                        }
                      />

                    </td>

                  ))}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {/* FOOTER */}

        <div className="border-t p-4 md:p-6 flex flex-col md:flex-row justify-end gap-3">

          <button
            onClick={onClose}
            className="border px-4 py-2 rounded w-full md:w-auto"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-700 text-white px-4 py-2 rounded w-full md:w-auto"
          >
            {loading ? "Updating..." : "Update Role"}
          </button>

        </div>

      </div>

    </div>
  );
}