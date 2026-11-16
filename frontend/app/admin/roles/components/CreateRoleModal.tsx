"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import toast from "react-hot-toast";

export default function CreateRoleModal({ onClose, onCreated }: any) {

  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(false);

  const [modules, setModules] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const actions = ["create", "read", "update", "delete"];

  /* ============================
     FETCH MODULES
  ============================ */
  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await axiosInstance.get(`${ProjectApiList.api_getAllModules}`);
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
      // const hasCamVerification = modulesData.some((m: any) => m.key === "loan_cam_verification");
      // if (!hasCamVerification) {
      //   modulesData.push({ module_name: "Loan CAM Verification", key: "loan_cam_verification" });
      // }

      const hasLoanProducts = modulesData.some((m: any) => m.key === "loan_products");
      if (!hasLoanProducts) {
        modulesData.push({ module_name: "Loan Products", key: "loan_products" });
      }

      setModules(modulesData);

      const mapped = modulesData.map((m: any) => ({
        module: m.module_name,
        key: m.key,
        create: false,
        read: false,
        update: false,
        delete: false,
      }));

      setPermissions(mapped);
    } catch {
      toast.error("Failed to load modules");
    }
  };

  /* ============================
     TOGGLE PERMISSION
  ============================ */
  const togglePermission = (row: number, action: string) => {
    const updated = [...permissions];
    updated[row][action] = !updated[row][action];
    setPermissions(updated);
  };

  /* ============================
     SELECT ALL
  ============================ */
  const toggleSelectAll = () => {
    const newValue = !selectAll;

    setSelectAll(newValue);

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

  /* ============================
     BUILD PERMISSION ARRAY
  ============================ */
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

  /* ============================
     SUBMIT
  ============================ */
  const handleSubmit = async () => {

    if (!roleName.trim()) {
      toast.error("Role name required");
      return;
    }

    const finalPermissions = buildPermissionArray();

    if (finalPermissions.length === 0) {
      toast.error("Select at least one permission");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    setLoading(true);

    try {

      const payload: any = {
        name: roleName,
        description: roleName,
        permission: finalPermissions,
      };

      // only attach branch_id if the user has one (cms_admin has branch, super_admin does not)
      if (user.branch) payload.branch_id = user.branch;

      await axiosInstance.post(ProjectApiList.CREATE_ROLE, payload);

      toast.success("Role created successfully");

      onCreated?.();
      onClose();

    } catch (error: any) {

      toast.error(
        error?.response?.data?.message || "Failed to create role"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 md:px-3">
      <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-xl shadow-2xl border h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 md:p-6 border-b">

          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Create Role
          </h2>

          <input
            type="text"
            className="w-full px-3 py-2 border rounded mb-4"
            placeholder="Role Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
            />
            <span>Select All</span>
          </div>

        </div>

        {/* Table */}
        <div className="border rounded overflow-y-auto overflow-x-auto">

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

              {permissions.map((perm, index) => (
                <tr key={perm.key} className="border-b">

                  <td className="p-2">{perm.module}</td>

                  {actions.map((action) => (
                    <td key={action} className="text-center p-2">
                      <input
                        type="checkbox"
                        checked={perm[action]}
                        onChange={() =>
                          togglePermission(index, action)
                        }
                      />
                    </td>
                  ))}

                </tr>
              ))}

            </tbody>

          </table>

        </div>

        {/* Footer */}
        <div className="border-t p-4 md:p-6 flex flex-col md:flex-row justify-end gap-3">

          <button
            onClick={onClose}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-700 text-white px-4 py-2 rounded"
          >
            {loading ? "Creating..." : "Create Role"}
          </button>

        </div>

      </div>
    </div>
  );
}


// const modules = [
//     { name: "Loan - Manage Roles", key: "manage_roles" },
//     { name: "Loan - Dashboard", key: "dashboard" },
//     { name: "Loan - Interest Master", key: "intrest_master" },
//     { name: "Loan - Fee Master", key: "fee_master" },
//     { name: "Loan - Agents", key: "agents" },
//     { name: "Loan - Customers", key: "customers" },
//     { name: "Loan - Loan Applications", key: "loan_applications" },
//     { name: "Loan - All Admin Applications", key: "all_admin_applications" },
//     { name: "Loan - Disbursements", key: "disbursements" },
//     { name: "Loan - Loans", key: "loans" },
//     { name: "Loan - EMI Payments", key: "emi_payments" },
//   ];