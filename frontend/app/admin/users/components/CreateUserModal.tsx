"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Role = {
  id: number;
  name: string;
  role_key: string;
  department: string; // ✅ ADD THIS
};

type Department = {
  id: number;
  name: string;
  dept_id: string;
};

type Branch = {
  id: number;
  name: string;
  code: string;
};

type FormValues = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
};

export default function CreateUserModal({ open, onOpenChange, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };

  const loggedInUser = getLoggedInUser();
  const isSuperAdmin = loggedInUser?.role === "super_admin";
  const isCmsAdmin = loggedInUser?.role === "cms_admin";

  // ✅ Fetch Roles + Departments
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        setLoadingDropdowns(true);

        const loginUser = getLoggedInUser();

        const [roleRes, deptRes, branchRes] = await Promise.all([
          axiosInstance.get(ProjectApiList.GET_ALL_ROLES, {
            params: {
              branch_id: loginUser?.branch, // ✅ filter by branch
            },
          }),
          axiosInstance.get("/departments"),
          axiosInstance.get("/branches"),
        ]);

        const rolesData = roleRes.data.data.roles || [];
        const deptData = deptRes.data.data.departments || [];
        const branchData = branchRes.data.data.data || [];

        setRoles(rolesData);
        setDepartments(deptData);
        setBranches(branchData);

        const user = getLoggedInUser();

        if (user?.role === "super_admin") {
          setSelectedDepartment("cms");

          reset({
            ...getValues(),
            department: "cms",
            role: "cms_admin",
          });
        }

        /* ✅ AUTO SET BRANCH FOR CMS ADMIN */
        if (user?.role === "cms_admin") {
          reset({
            ...getValues(),
            branch: user.branch, // auto select branch
          });
        }

      } catch {
        toast.error("Failed to load roles/departments");
      } finally {
        setLoadingDropdowns(false);
      }
    };

    if (open) fetchDropdowns();
  }, [open]);

  const onSubmit = async (data: FormValues) => {
    try {
      const user = getLoggedInUser();

      const { confirm_password, ...payload } = data;

      if (!user) {
        toast.error("User not found");
        return;
      }

      await axiosInstance.post(ProjectApiList.register, {
        ...data,
        created_by: user.user_id, // ✅ NEW FIELD
      });

      toast.success("User created successfully");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || "Something went wrong";

      if (message.toLowerCase().includes("email")) {
        setError("email", {
          type: "server",
          message: message,
        });
      }

      toast.error(message);
    }
  };

  const password = watch("password");
  const confirmPassword = watch("confirm_password");
  const isMatch = confirmPassword && password === confirmPassword;



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-800">
            Create New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Full Name
              </label>
              <input
                {...register("name", { required: "Name is required" })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Email
              </label>
              <input
                type="email"
                {...register("email", { required: "Email is required" })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 ${errors.email ? "border-red-500" : ""
                  }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: "Password is required" })}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-green-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Confirm Password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirm_password", {
                    required: "Please confirm password",
                  })}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-green-500"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 🔥 LIVE MATCH STATUS */}
              {confirmPassword && (
                <p
                  className={`text-xs mt-1 ${isMatch ? "text-green-600" : "text-red-500"
                    }`}
                >
                  {isMatch ? "Passwords match ✅" : "Passwords do not match ❌"}
                </p>
              )}

              {/* Existing error */}
              {errors.confirm_password && (
                <p className="text-xs text-red-500">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Phone
              </label>
              <input
                {...register("phone", { required: "Phone is required" })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Department */}
            {/* <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Department
              </label>
              <select
                {...register("department")}
                disabled={loadingDropdowns || isSuperAdmin}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 
  ${loadingDropdowns || getLoggedInUser()?.role === "super_admin"
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-white"
                  }`}

                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedDepartment(value);

                  // Reset role when department changes
                  reset({
                    ...getValues(),
                    department: value,
                    role: "",
                  });
                }}
              // className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div> */}





            {/* Branch */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Branch
              </label>
              <select
                {...register("branch", { required: "Branch is required" })}
                defaultValue={loggedInUser?.branch} disabled={loadingDropdowns || isCmsAdmin}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500
    ${isCmsAdmin ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
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

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Role
              </label>
              <select
                {...register("role", { required: "Role is required" })}
                disabled={isSuperAdmin}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500
  ${getLoggedInUser()?.role === "super_admin"
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-white"
                  }`}
              >
                <option value="">Select Role</option>

                {roles
                  .filter((r) => r.name.toLowerCase() !== "field executive") // ✅ exclude
                  .map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-700 text-white">
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}