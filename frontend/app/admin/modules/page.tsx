"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

import CreateModuleModal from "./components/CreateModuleModal";
import EditModuleModal from "./components/EditModuleModal";
import DeleteModuleModal from "./components/DeleteModuleModal";

type Module = {
  id: string;
  module_name: string;
  key: string;
  branch_id: number;
  is_active: boolean;
};

export default function ModulesPage() {

  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [openCreate, setOpenCreate] = useState(false);
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [deleteModule, setDeleteModule] = useState<Module | null>(null);

  useEffect(() => {
    fetchModules();
  }, [page, entries]);

  async function fetchModules() {
    try {

      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await axiosInstance.get(
        `${ProjectApiList.api_getModules}?branch_id=${user?.branch}&per_page=${entries}&page=${page}`
      );

      const modulesData = res?.data?.data?.modules?.data || [];
      const totalData = res?.data?.data?.modules?.total || 0;
      const lastPage = res?.data?.data?.modules?.last_page || 1;

      setModules(modulesData);
      setTotal(totalData);
      setTotalPages(lastPage);

    } catch (error) {
      console.error("Failed to fetch modules");
    }
  }

  return (
    <section className="min-h-screen bg-blue-50/40 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Modules</h1>
            <p className="text-blue-700 text-sm">Manage system modules</p>
          </div>

          <div className="flex gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules"
              className="border px-3 py-2 rounded-md text-sm"
            />

            <button
              onClick={() => setOpenCreate(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition"
            >
              + Add Module
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">#</th>
                  <th className="px-6 py-4 text-left font-medium">Module Name</th>
                  <th className="px-6 py-4 text-left font-medium">Short Name</th>
                  <th className="px-6 py-4 text-left font-medium">Status</th>
                  <th className="px-6 py-4 text-center font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {modules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500">
                      No modules available
                    </td>
                  </tr>
                ) : (
                  modules.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-gray-50">

                      <td className="px-6 py-4 text-gray-500">
                        {(page - 1) * entries + idx + 1}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        {m.module_name}
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded bg-gray-100">
                          {m.key}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            m.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() => setEditModule(m)}
                            className="px-3 py-1 border rounded text-xs"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => setDeleteModule(m)}
                            className="px-3 py-1 border border-red-300 text-red-600 rounded text-xs"
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

          <p className="text-blue-800 text-sm">
              Showing {(page - 1) * entries + 1}–
            {Math.min(page * entries, total)} of {total}
          </p>

          <div className="flex gap-2 items-center">

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
        <CreateModuleModal
          open={openCreate}
          onOpenChange={setOpenCreate}
          onCreated={fetchModules}
        />
      )}

      {editModule && (
        <EditModuleModal
          module={editModule}
          open={!!editModule}
          onOpenChange={() => setEditModule(null)}
          onUpdated={fetchModules}
        />
      )}

      {deleteModule && (
        <DeleteModuleModal
          module={deleteModule}
          open={!!deleteModule}
          onOpenChange={() => setDeleteModule(null)}
          onDeleted={fetchModules}
        />
      )}

    </section>
  );
}