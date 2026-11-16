"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";

type Props = {
  userId: number;
  open: () => void;
  onOpenChange: () => void;
  onSuccess: () => void;
};

type Role = {
  id: number;
  name: string;
  role_key: string;
};

type Department = {
  id: number;
  name: string;
  department_key: string;
};

type Branch = {
  id: number;
  name: string;
  code: string;
};

type FormValues = {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
};
export default function EditUserModal({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: any) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [isFieldExecutiveUser, setIsFieldExecutiveUser] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [branches, setBranches] = useState<Branch[]>([]);


  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const loggedInUser = getLoggedInUser();
  const isSuperAdmin = loggedInUser?.role === "super_admin";

  // ✅ Fetch Roles + Departments
  const fetchDropdowns = async () => {
    try {
      setLoadingDropdowns(true);

      const loginUser = getLoggedInUser();

      const [roleRes, deptRes, branchRes] = await Promise.all([
        axiosInstance.get("/roles", {
          params: {
            branch_id: loginUser?.branch, // ✅ SAME AS CREATE
          },
        }),
        axiosInstance.get("/departments"),
        axiosInstance.get("/branches"),
      ]);

      setRoles(roleRes.data.data.roles || []);
      setDepartments(deptRes.data.data.departments || []);
      setBranches(branchRes.data.data.data || []);
    } catch {
      toast.error("Failed to load roles/departments");
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // ✅ Fetch Single User
  const fetchUser = async () => {
    try {
      setLoadingUser(true);
      const res = await axiosInstance.get(`/users/${userId}`);
      const user = res.data.data.user;

      setIsFieldExecutiveUser(user.role === "Field Executive"); // ✅ ADD THIS

      reset({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        branch: user.branch,
      });
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchDropdowns();
      fetchUser();
    }
  }, [open, userId]);

  // ✅ Update User
  const onSubmit = async (data: FormValues) => {
    try {
      await axiosInstance.post(`/users/${userId}`, data);
      toast.success("User updated successfully");
      onOpenChange();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  const isCmsAdmin = loggedInUser?.role === "cms_admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-800">
            Edit User
          </DialogTitle>
        </DialogHeader>

        {loadingUser ? (
          <div className="py-10 text-center text-gray-500">
            Loading user details...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Full Name
                </label>
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Phone Number
                </label>
                <input
                  {...register("phone", { required: "Phone number is required" })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role (Dynamic) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Role
                </label>
                <select
                  {...register("role", { required: "Role is required" })}
                  disabled={isSuperAdmin}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
    ${isSuperAdmin
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-white"}
  `}
                >
                  <option value="">Select Role</option>

                  {roles
                    .filter(
                      (r) =>
                        r.name !== "Field Executive" || isFieldExecutiveUser
                    ) // ✅ Changed role_key to name
                    .map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                </select>
                {errors.role && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* Department (Dynamic) */}
              {/* <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Department
                </label>
                <select
                  {...register("department", { required: "Department is required" })}
                  disabled={isSuperAdmin}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500
    ${isSuperAdmin ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}
  `}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.department_key}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.department.message}
                  </p>
                )}
              </div> */}

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Branch
                </label>
                <select
                  {...register("branch", { required: "Branch is required" })}
                  disabled={isSuperAdmin || isCmsAdmin}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
    ${(isSuperAdmin || isCmsAdmin)
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-white"}
  `}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <DialogFooter className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onOpenChange}>
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}