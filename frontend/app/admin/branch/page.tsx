"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import DeleteBranchModal from "./components/DeleteBranchModal";
import EditBranchModal from "./components/EditBranchModal";
import CreateBranchModal from "./components/CreateBranchModal";

type Branch = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const [openCreate, setOpenCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  useEffect(() => {
    fetchBranches(page);
  }, [page]);

  async function fetchBranches(pageNumber = 1) {
    const res = await axiosInstance.get(
      `/branches?page=${pageNumber}&per_page=${perPage}&search=${search}`
    );

    const response = res.data.data;

    setBranches(response.data);
    setPage(response.current_page);
    setTotalPages(response.last_page);
    setTotal(response.total);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
    fetchBranches(1);
  }

  return (
    <section className="min-h-screen bg-blue-50/40 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">
              Branches
            </h1>
            <p className="text-blue-700 text-sm">
              Manage all branches
            </p>
          </div>

          <div className="flex gap-3">
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search branches"
              className="border px-3 py-2 rounded-md text-sm"
            />

            <button
              onClick={() => setOpenCreate(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition"
            >
              + Add Branch
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left">#</th>
                  <th className="px-6 py-4 text-left">Code</th>
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">Phone</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      No branches available
                    </td>
                  </tr>
                ) : (
                  branches.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {(page - 1) * perPage + idx + 1}
                      </td>

                      <td className="px-6 py-4">{b.code}</td>

                      <td className="px-6 py-4 font-semibold">
                        {b.name}
                      </td>

                      <td className="px-6 py-4">{b.phone}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            b.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {b.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditBranch(b)}
                            className="px-3 py-1 text-xs border rounded"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => setDeleteBranch(b)}
                            className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded"
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
          <p className="text-sm text-blue-800">
            Showing {(page - 1) * perPage + 1}–
            {Math.min(page * perPage, total)} of {total}
          </p>

          <div className="flex gap-2 items-center">
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
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
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
                <CreateBranchModal
                    open={openCreate}
                    onOpenChange={setOpenCreate}
                    onCreated={fetchBranches}
                />
            )}

            {editBranch && (
                <EditBranchModal
                    branch={editBranch}
                    open={!!editBranch}
                    onOpenChange={() => setEditBranch(null)}
                    onUpdated={fetchBranches}
                />
            )}

            {deleteBranch && (
                <DeleteBranchModal
                    branch={deleteBranch}
                    open={!!deleteBranch}
                    onOpenChange={() => setDeleteBranch(null)}
                    onDeleted={fetchBranches}
                />
            )}
        </section>
    );
}