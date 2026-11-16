"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, MapPin } from "lucide-react";

type BranchCity = {
  id: number;
  city_name: string;
  city_code: string;
  city_number: string;
  branch_code: string;
  state: string | null;
  is_active: boolean;
};

const emptyForm = { city_name: "", city_code: "", city_number: "", state: "", is_active: true };

export default function BranchCitiesPage() {
  const [cities, setCities] = useState<BranchCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, per_page: 15 });

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchCities = async (p = 1) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `${ProjectApiList.api_getBranchCities}?page=${p}&per_page=15&search=${search}`
      );
      if (res.data.success) {
        setCities(res.data.data);
        setMeta(res.data.meta);
        setPage(p);
      }
    } catch {
      toast.error("Failed to load branch cities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCities(1); }, [search]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (city: BranchCity) => {
    setEditId(city.id);
    setForm({
      city_name: city.city_name,
      city_code: city.city_code,
      city_number: city.city_number,
      state: city.state || "",
      is_active: city.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.city_name || !form.city_code || !form.city_number) {
      toast.error("City name, code and number are required");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await axiosInstance.post(`${ProjectApiList.api_updateBranchCity}/${editId}`, form);
        toast.success("Branch city updated");
      } else {
        await axiosInstance.post(ProjectApiList.api_createBranchCity, form);
        toast.success("Branch city created");
      }
      setShowModal(false);
      fetchCities(page);
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach((e: any) => toast.error(e));
      else toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`${ProjectApiList.api_deleteBranchCity}/${deleteId}`);
      toast.success("Branch city deleted");
      setDeleteId(null);
      fetchCities(page);
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Preview auto-generated branch_code
  const previewCode = form.city_code && form.city_number
    ? `${form.city_code.toUpperCase()}-${form.city_number}`
    : "—";

  return (
    <section className="min-h-screen bg-blue-50/40 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
              <MapPin size={22} /> Branch Cities
            </h1>
            <p className="text-blue-700 text-sm">Manage city codes and numbers for disbursement ID generation</p>
          </div>
          <div className="flex gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city, code..."
              className="border px-3 py-2 rounded-md text-sm w-56"
            />
            <button
              onClick={openCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add City
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
                  <th className="px-6 py-4 text-left">City Name</th>
                  <th className="px-6 py-4 text-left">City Code</th>
                  <th className="px-6 py-4 text-left">City Number</th>
                  <th className="px-6 py-4 text-left">Branch Code</th>
                  <th className="px-6 py-4 text-left">State</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
                ) : cities.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400">No branch cities found</td></tr>
                ) : cities.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{(page - 1) * meta.per_page + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold">{c.city_name}</td>
                    <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono text-xs">{c.city_code}</span></td>
                    <td className="px-6 py-4 font-mono">{c.city_number}</td>
                    <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-xs font-bold">{c.branch_code}</span></td>
                    <td className="px-6 py-4">{c.state || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEdit(c)} className="px-3 py-1 text-xs border rounded flex items-center gap-1 hover:bg-gray-50">
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded flex items-center gap-1 hover:bg-red-50">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center text-sm">
          <p className="text-blue-800">Total: {meta.total} cities</p>
          <div className="flex gap-2 items-center">
            <button onClick={() => fetchCities(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span>Page {page} / {meta.last_page}</span>
            <button onClick={() => fetchCities(page + 1)} disabled={page === meta.last_page} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editId ? "Edit Branch City" : "Add Branch City"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">City Name <span className="text-red-500">*</span></label>
                <input value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Hazaribagh" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">City Code <span className="text-red-500">*</span></label>
                  <input value={form.city_code} 
                    onChange={(e) => setForm({ ...form, city_code: e.target.value.toUpperCase().slice(0, 3) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="e.g. HZB" maxLength={3} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">City Number <span className="text-red-500">*</span></label>
                  <input value={form.city_number} 
                    onChange={(e) => setForm({ ...form, city_number: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="e.g. 44" maxLength={2} />
                </div>
              </div>
              {/* Auto-generated branch code preview */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <p className="text-xs text-indigo-600 font-medium">Auto-generated Branch Code</p>
                <p className="text-lg font-bold text-indigo-800 font-mono mt-0.5">{previewCode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
                <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Jharkhand" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 accent-blue-600" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Delete Branch City?</h3>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
