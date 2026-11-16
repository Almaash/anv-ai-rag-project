"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLeaveRequest, getEmployees, getLeaveTypes } from "../../api/hrmsApi";
import SimpleConfirmDialog from "@/components/common/SimpleConfirmDialog";

export default function RequestLeavePage() {
  const DEFAULT_MAX_DAYS_PER_REQUEST = 6;
  const [userType, setUserType] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type_id: "",
    leave_category: "",
    start_date: "",
    end_date: "",
    reason: ""
  });

  useEffect(() => {
    const type = localStorage.getItem("user_type");
    setUserType(type);
    fetchData(type);
  }, []);

  const fetchData = async (type: string | null) => {
    try {
      setLoading(true);
      const isEmployee = type === "employee";
      
      const [empRes, typeRes] = await Promise.all([
        getEmployees({ all: true }),
        getLeaveTypes()
      ]);
      
      const empData = empRes.data.data || empRes.data || [];
      const typesData = typeRes.data.data || typeRes.data || [];
      
      setEmployees(empData);
      setLeaveTypes(typesData);
      
      if (isEmployee) {
        // For employee login, the backend usually returns just their record in getEmployees() 
        // or we can find them if it returns more. Our backend scopes this naturally.
        if (empData.length > 0) {
          const emp = empData[0]; // Scoped to self in backend for employees
          setSelectedEmployee(emp);
          setFormData(prev => ({ 
            ...prev, 
            employee_id: emp.id.toString(),
            leave_type_id: typesData[0]?.id?.toString() || ""
          }));
        }
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userType !== 'employee';

  const handleEmployeeChange = (employeeId: string) => {
    const emp = employees.find(e => e.id === parseInt(employeeId));
    setSelectedEmployee(emp);
    setFormData(prev => ({ ...prev, employee_id: employeeId, leave_category: "", start_date: "", end_date: "" }));
    setSelectedCategory("");
  };

  const getCategoryFromLeaveTypeName = (name: string) => {
    const normalized = (name || "").toLowerCase();
    if (normalized.includes("sick")) return "sick";
    if (normalized.includes("casual")) return "casual";
    if (normalized.includes("maternity") || normalized.includes("marital")) return "maternity";
    return "paid";
  };

  const getRemainingDaysByCategory = (category: string) => {
    if (!selectedEmployee) return 0;

    if (category === "sick") return Number(selectedEmployee.sick_leave_days ?? 0);
    if (category === "casual") return Number(selectedEmployee.casual_leave_days ?? 0);
    if (category === "maternity") return Number(selectedEmployee.maternity_leave_days ?? 0);
    if (category === "paid") return Number(selectedEmployee.paid_leave_days ?? 0);
    return 0;
  };

  const getRemainingDays = (category: string) => {
    if (!selectedEmployee) return 0;
    
    // Check if it's a dynamic leave type ID
    if (!isNaN(parseInt(category))) {
      const balance = selectedEmployee.leave_balances?.find((b: any) => b.leave_type_id === parseInt(category));
      if (balance) return balance.remaining;

      const type = leaveTypes.find(t => t.id === parseInt(category));
      if (!type) return 0;

      const mappedCategory = getCategoryFromLeaveTypeName(type.name);
      const categoryFieldMap: Record<string, string> = {
        sick: "sick_leave_days",
        casual: "casual_leave_days",
        maternity: "maternity_leave_days",
        paid: "paid_leave_days",
      };
      const mappedField = categoryFieldMap[mappedCategory];
      const hasEmployeeField = mappedField
        ? selectedEmployee[mappedField] !== undefined && selectedEmployee[mappedField] !== null
        : false;
      if (hasEmployeeField) return Number(selectedEmployee[mappedField] ?? 0);

      // Fallback: if employee-specific leave data is missing, use leave type limit_days
      return Number(type.limit_days || 0);
    }

    return getRemainingDaysByCategory(category);
  };

  const getPerRequestLimitDays = (category: string) => {
    if (!category || isNaN(parseInt(category))) return DEFAULT_MAX_DAYS_PER_REQUEST;
    const type = leaveTypes.find(t => t.id === parseInt(category));
    if (!type) return DEFAULT_MAX_DAYS_PER_REQUEST;
    const limit = Number(type.limit_days);
    return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_MAX_DAYS_PER_REQUEST;
  };

  const isPaidLeaveType = (category: string) => {
    if (!category || isNaN(parseInt(category))) return false;
    const type = leaveTypes.find(t => t.id === parseInt(category));
    if (!type) return false;
    return getCategoryFromLeaveTypeName(type.name) === "paid";
  };

  const canRequestWithoutBalance = (category: string) => {
    return isAdmin && isPaidLeaveType(category);
  };

  const getMaxBookableDays = () => {
    if (!selectedCategory) return 0;
    const remaining = getRemainingDays(selectedCategory);
    const perRequestLimit = getPerRequestLimitDays(selectedCategory);
    if (remaining <= 0 && canRequestWithoutBalance(selectedCategory)) {
      return perRequestLimit;
    }
    return Math.max(0, Math.min(remaining, perRequestLimit));
  };

  const handleCategorySelect = (category: string, leaveTypeId?: number) => {
    setSelectedCategory(category);
    setFormData(prev => ({ 
      ...prev, 
      leave_category: category, 
      leave_type_id: leaveTypeId ? leaveTypeId.toString() : prev.leave_type_id,
      start_date: "", 
      end_date: "" 
    }));
  };

  const handleStartDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, start_date: date, end_date: "" }));
  };

  const getMaxEndDate = () => {
    if (!formData.start_date || !selectedCategory) return "";
    
    const maxBookableDays = getMaxBookableDays();
    if (maxBookableDays === 0) return formData.start_date;
    
    const startDate = new Date(formData.start_date);
    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + maxBookableDays - 1);
    
    return maxDate.toISOString().split('T')[0];
  };

  const validateRequest = () => {
    if (!selectedCategory) {
      toast.error("Please select a leave category");
      return false;
    }

    const remaining = getRemainingDays(selectedCategory);
    if (remaining === 0 && !canRequestWithoutBalance(selectedCategory)) {
      toast.error(`No ${selectedCategory} leave days remaining`);
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error("Please select leave dates");
      return false;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const requestedDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (requestedDays <= 0) {
      toast.error("Invalid date range selected");
      return false;
    }
    const maxBookableDays = getMaxBookableDays();
    if (requestedDays > maxBookableDays) {
      toast.error(`You can request a maximum of ${maxBookableDays} day(s) at a time for this leave type`);
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequest()) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setIsConfirmOpen(false);
    setSubmitting(true);
    const toastId = toast.loading("Applying leave request...");
    try {
      const selectedTypeObj = leaveTypes.find(lt => lt.id.toString() === selectedCategory);
      
      const finalCategory = selectedTypeObj
        ? getCategoryFromLeaveTypeName(selectedTypeObj.name)
        : "paid";

      await createLeaveRequest({
        ...formData,
        leave_type_id: formData.leave_type_id || (leaveTypes[0]?.id || 1),
        leave_category: finalCategory
      });
      toast.success("Leave request submitted successfully", { id: toastId });
      setFormData({
        employee_id: !isAdmin ? formData.employee_id : "",
        leave_type_id: formData.leave_type_id,
        leave_category: "",
        start_date: "",
        end_date: "",
        reason: ""
      });
      setSelectedCategory("");
      if (isAdmin) setSelectedEmployee(null);
    } catch (err) {
      toast.error("Failed to submit leave request", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = leaveTypes.map(lt => ({
    value: lt.id.toString(),
    label: lt.name,
    originalCategory: getCategoryFromLeaveTypeName(lt.name)
  }));

  const normalizeGender = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const employeeGender = normalizeGender(
    selectedEmployee?.gender ??
    selectedEmployee?.sex ??
    selectedEmployee?.personal_detail?.gender ??
    selectedEmployee?.user?.gender
  );
  const femaleValues = new Set(["female", "f", "woman", "lady", "girl", "2"]);
  const maleValues = new Set(["male", "mail", "m", "man", "boy", "1"]);
  const isFemaleEmployee = femaleValues.has(employeeGender) || employeeGender.startsWith("female");
  const isMaleEmployee = maleValues.has(employeeGender) || employeeGender.startsWith("male");
  const shouldShowMaternity = isFemaleEmployee && !isMaleEmployee;
  const filteredCategories = categories.filter(
    (cat) => cat.originalCategory !== "maternity" || shouldShowMaternity
  );

  useEffect(() => {
    if (!selectedCategory) return;
    const selectedType = leaveTypes.find(lt => lt.id.toString() === selectedCategory);
    if (!selectedType) return;
    const selectedCategoryType = getCategoryFromLeaveTypeName(selectedType.name);
    if (!shouldShowMaternity && selectedCategoryType === "maternity") {
      setSelectedCategory("");
      setFormData(prev => ({
        ...prev,
        leave_type_id: "",
        leave_category: "",
        start_date: "",
        end_date: ""
      }));
    }
  }, [shouldShowMaternity, leaveTypes, selectedCategory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Request Leave</h1>
        <p className="text-muted-foreground">Submit a new leave application</p>
      </div>

      {selectedEmployee && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {filteredCategories.map(cat => {
            const remaining = getRemainingDays(cat.value);
            return (
              <Card key={cat.value} className={`cursor-pointer transition-all ${selectedCategory === cat.value ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-1 px-3 pt-3">
                  <CardTitle className="text-xs md:text-sm font-medium leading-tight">{cat.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-xl md:text-2xl font-bold leading-none">{remaining}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">days remaining</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave Request Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Select Employee</Label>
                <select
                  className="w-full border rounded-md p-2 h-10"
                  value={formData.employee_id}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  required
                >
                  <option value="">Choose Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_id} - {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedEmployee && (
              <>
                <div className="space-y-2">
                  <Label>Select Leave Category</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredCategories.map(cat => {
                      const remaining = getRemainingDays(cat.value);
                      const isSelected = selectedCategory === cat.value;
                      const canSelect = remaining > 0 || canRequestWithoutBalance(cat.value);
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => canSelect && handleCategorySelect(cat.value, parseInt(cat.value))}
                          disabled={!canSelect}
                          className={`p-2.5 md:p-3 rounded-lg border-2 text-center transition-all ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : canSelect
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className="font-semibold text-xs md:text-sm leading-tight">{cat.label}</div>
                          <div className="text-lg md:text-xl font-bold mt-1 leading-none">{remaining}</div>
                          <div className="text-[11px] text-muted-foreground">days left</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCategory && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To Date</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          min={formData.start_date || new Date().toISOString().split('T')[0]}
                          max={getMaxEndDate()}
                          disabled={!formData.start_date}
                          required
                        />
                        {formData.start_date && (
                          <p className="text-xs text-muted-foreground">
                            Max: {getMaxEndDate()} ({getMaxBookableDays()} day(s) allowed this request, {getRemainingDays(selectedCategory)} total available)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <textarea
                        className="w-full border rounded-md p-2 min-h-[100px]"
                        placeholder="Enter reason for leave..."
                        value={formData.reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({
                            employee_id: isAdmin ? "" : formData.employee_id,
                            leave_type_id: "",
                            leave_category: "",
                            start_date: "",
                            end_date: "",
                            reason: ""
                          });
                          setSelectedCategory("");
                          if (isAdmin) setSelectedEmployee(null);
                        }}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Submit Request
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>

      <SimpleConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Confirm Leave Request"
        message="Do you want to apply this leave request now?"
        confirmText="Apply Request"
        cancelText="Cancel"
        onConfirm={confirmSubmit}
        loading={submitting}
      />
    </div>
  );
}
