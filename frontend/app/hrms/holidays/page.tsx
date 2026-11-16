"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from "../api/hrmsApi";

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
  recurring: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    description: "",
    recurring: false
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await getHolidays();
      if (res.data.status === "success") {
        setHolidays(res.data.data || []);
      }
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleOpenModal = (holiday: Holiday | null = null) => {
    if (holiday) {
      setSelectedHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        description: holiday.description || "",
        recurring: holiday.recurring
      });
    } else {
      setSelectedHoliday(null);
      setFormData({ name: "", date: "", description: "", recurring: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // Get scoping properties from logged-in user if available
      const userStr = localStorage.getItem("user");
      let branch_id = null;
      let cms_admin = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        branch_id = user.branch || user.branch_id || null;
        cms_admin = user.cms_admin || null;
      }

      const payload = { ...formData, branch_id, cms_admin };

      if (selectedHoliday) {
        await updateHoliday(selectedHoliday.id, payload);
        toast.success("Holiday updated successfully");
      } else {
        await createHoliday(payload);
        toast.success("Holiday added successfully");
      }
      fetchHolidays();
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Operation failed";
      toast.error(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await deleteHoliday(itemToDelete);
      toast.success("Holiday deleted");
      fetchHolidays();
      setIsConfirmOpen(false);
    } catch {
      toast.error("Delete failed");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Public Holidays
          </h1>
          <p className="text-slate-500 mt-1">Manage company-wide holiday events and observances.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 shadow-lg gap-2">
          <Plus className="h-4 w-4" /> 
          Add Holiday
        </Button>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Holiday Calendar
          </CardTitle>
          <CardDescription>Overview of all scheduled holidays and observances</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Holiday Name</TableHead>
                  <TableHead className="font-semibold">Event Date</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-slate-500">Loading holidays...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No holidays scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-semibold">{h.name}</TableCell>
                        <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                        <TableCell>{h.description || "-"}</TableCell>
                        <TableCell>{h.recurring ? "Recurring" : "One-time"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenModal(h)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-red-600" onClick={() => confirmDelete(h.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHoliday ? "Edit holiday" : "New holiday"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="h-name">Holiday Name</Label>
              <Input
                id="h-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-date">Event Date</Label>
              <Input
                id="h-date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-description">Occasion Remark</Label>
              <Input
                id="h-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="h-recurring"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <Label htmlFor="h-recurring">Recurring every year</Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-blue-600 text-white">
                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedHoliday ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Holiday"
        message="Are you sure you want to remove this holiday?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
