"use client";

import React, { useEffect, useState } from "react";
import CreateUserModal from "./components/CreateUserModal";
import EditUserModal from "./components/EditUserModal";
import DeleteUserModal from "./components/DeleteUserModal";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import ChangePasswordModal from "./components/ChangePasswordModal";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");

  const [rolesList, setRolesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  /* ---------------- FETCH ROLES ---------------- */
  const fetchRoles = async () => {
    try {

      const params =
        currentUser?.role === "cms_admin"
          ? { branch_id: currentUser.branch }
          : {};

      const res = await axiosInstance.get(
        ProjectApiList.GET_ALL_ROLES,
        { params }
      );

      setRolesList(res.data.data.roles || []);

    } catch (err) {
      console.error("Failed to fetch roles");
    }
  };

  /* ---------------- FETCH DEPARTMENTS ---------------- */
  const fetchDepartments = async () => {
    try {
      const res = await axiosInstance.get(
        ProjectApiList.api_getDepartments
      );
      setDepartmentsList(res.data.data.departments || []);
    } catch (err) {
      console.error("Failed to fetch departments");
    }
  };

  // console.log("Current User:", currentUser?.role);

  /* ---------------- FETCH USERS ---------------- */
  const fetchUsers = async (pageNumber = page) => {
    try {
      setLoading(true);

      const params = {
        search: search || undefined,
        role:
          currentUser?.role === "super_admin"
            ? "cms_admin"
            : role || undefined,

        department: department || undefined,

        // ✅ branch filter for cms_admin
        branch:
          currentUser?.role === "cms_admin"
            ? currentUser.branch
            : undefined,

        per_page: entries,
        page: pageNumber,
      };

      const res = await axiosInstance.get(
        ProjectApiList.api_getUsers,
        { params }
      );

      const responseData = res.data.data.users;

      const usersList = responseData.data || [];

      const filteredUsers =
        currentUser?.role === "super_admin"
          ? usersList
          : usersList.filter((u: any) => u.role !== "cms_admin");

      setUsers(filteredUsers);
      setTotalPages(responseData.last_page || 1);
      setPage(responseData.current_page || 1);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // console.log("Users List:", users);

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    if (!currentUser) return;

    fetchUsers(1);
    setPage(1);
  }, [currentUser, search, role, department, entries]);

  useEffect(() => {
    if (!currentUser) return;

    fetchUsers(page);
  }, [page, currentUser]);


  useEffect(() => {
    if (!currentUser) return;

    fetchRoles();
    fetchDepartments();
  }, [currentUser]);

  /* ---------------- UI ---------------- */
  return (
    <section className="min-h-screen bg-blue-50/40 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and filter system users
            </p>
          </div>

          <button
            onClick={() => setOpenCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
          >
            + Add User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-4 justify-between">

          <div className="flex flex-wrap gap-4 items-center">

            {/* Search */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Search</label>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Name, Email, Phone..."
                className="border px-3 py-2 rounded-md text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Role */}
            {currentUser?.role !== "super_admin" && (
              <>
                {/* Role */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setPage(1);
                    }}
                    className="border px-3 py-2 rounded-md text-sm min-w-[160px] focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">All Roles</option>
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                {/* <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setPage(1);
                    }}
                    className="border px-3 py-2 rounded-md text-sm min-w-[180px] focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">All Departments</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div> */}
              </>
            )}

          </div>

          {/* Entries */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select
              value={entries}
              onChange={(e) => {
                setEntries(Number(e.target.value));
                setPage(1);
              }}
              className="border px-2 py-2 rounded-md text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="p-3 border">#</th>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Phone</th>
                <th className="p-3 border">Role</th>
                {/* <th className="p-3 border">Department</th> */}
                <th className="p-3 border">Branch</th>
                <th className="p-3 border text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-3 border">
                      {(page - 1) * entries + idx + 1}
                    </td>
                    <td className="p-3 border">{u.name}</td>
                    <td className="p-3 border">{u.email}</td>
                    <td className="p-3 border">{u.phone}</td>
                    <td className="p-3 border">{u.role}</td>
                    {/* <td className="p-3 border">{u.department}</td> */}
                    <td className="p-3 border">
                      {u?.branch_details?.name || "-"}
                    </td>
                    <td className="p-3 border text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setEditUserId(u.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => setPasswordUser(u)}
                          className="text-green-600 hover:underline"
                        >
                          Password
                        </button>

                        {u.role?.toLowerCase() !== "field executive" && (
                          <button
                            onClick={() => setDeleteUser(u)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p >= page - 2 && p <= page + 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded-md text-sm border transition ${p === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-100"
                      }`}
                  >
                    {p}
                  </button>
                ))}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {openCreate && (
        <CreateUserModal
          open={openCreate}
          onOpenChange={setOpenCreate}
          onSuccess={fetchUsers}
        />
      )}

      {editUserId && (
        <EditUserModal
          userId={editUserId}
          open={!!editUserId}
          onOpenChange={() => setEditUserId(null)}
          onSuccess={fetchUsers}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={() => setDeleteUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      {passwordUser && (
        <ChangePasswordModal
          userId={passwordUser.id}
          open={!!passwordUser}
          onOpenChange={() =>
            setPasswordUser(null)
          }
          onSuccess={fetchUsers}
        />
      )}
    </section>
  );
}