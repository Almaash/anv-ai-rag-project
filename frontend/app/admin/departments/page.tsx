"use client";

import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import EditDepartmentModal from "./components/EditDepartmentModal";
import DeleteDepartmentModal from "./components/DeleteDepartmentModal";
import CreateDepartmentModal from "./components/CreateDepartmentModal";
import ProjectApiList from "@/app/api/ProjectApiList";

type Department = {
  id: number;
  dept_id: string;
  name: string;
  description: string;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);

  const [openCreate, setOpenCreate] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [deleteDepartment, setDeleteDepartment] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    const res = await axiosInstance.get(ProjectApiList.api_getDepartments);
    setDepartments(res.data.data.departments);
  }

  const filtered = useMemo(() => {
    return departments.filter((d) =>
      `${d.name} ${d.description}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [departments, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / entries));

  const paginated = useMemo(() => {
    const start = (page - 1) * entries;
    return filtered.slice(start, start + entries);
  }, [filtered, page, entries]);

  return (
    <section className="min-h-screen bg-green-50/40 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-800">Departments</h1>
            <p className="text-green-700 text-sm">Manage all departments</p>
          </div>

          <div className="flex gap-3">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search departments"
              className="border px-3 py-2 rounded-md text-sm"
            />

            <button
              onClick={() => setOpenCreate(true)}
              className="bg-green-700 text-white px-4 py-2 rounded-md text-sm"
            >
              + Add Department
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Header */}
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">#</th>
                  <th className="px-6 py-4 text-left font-medium">Dept ID</th>
                  <th className="px-6 py-4 text-left font-medium">Name</th>
                  <th className="px-6 py-4 text-left font-medium">Description</th>
                  <th className="px-6 py-4 text-center font-medium">Actions</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                          📁
                        </div>
                        <p className="text-sm">No departments available</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((d, idx) => (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-gray-500">
                        {(page - 1) * entries + idx + 1}
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-700 font-medium">
                          {d.dept_id}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {d.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600 max-w-[350px] truncate">
                        {d.description || "-"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() => setEditDepartment(d)}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-100 transition"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => setDeleteDepartment(d)}
                            className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition"
                          >
                            Delete
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
        {/* Pagination */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-green-800">
            Showing {(page - 1) * entries + 1}–
            {Math.min(page * entries, total)} of {total}
          </p>

          <div className="flex gap-2 items-center">
            <select
              value={entries}
              onChange={(e) => { setEntries(Number(e.target.value)); setPage(1); }}
              className="border px-2 py-2 rounded-md text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>

            <span className="text-sm">
              Page {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {openCreate && (
        <CreateDepartmentModal
          open={openCreate}
          onOpenChange={setOpenCreate}
          onCreated={fetchDepartments}
        />
      )}

      {editDepartment && (
        <EditDepartmentModal
          department={editDepartment}
          open={!!editDepartment}
          onOpenChange={() => setEditDepartment(null)}
          onUpdated={fetchDepartments}
        />
      )}

      {deleteDepartment && (
        <DeleteDepartmentModal
          department={deleteDepartment}
          open={!!deleteDepartment}
          onOpenChange={() => setDeleteDepartment(null)}
          onDeleted={fetchDepartments}
        />
      )}
    </section>
  );
}