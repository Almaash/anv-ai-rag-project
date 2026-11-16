"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Edit2, Trash2, Loader2, Eye, User, Phone, Mail, 
  ArrowRight, ArrowLeft, Check, Upload, Building, CreditCard, Home, Briefcase,
  ChevronDown, ChevronUp, CheckCircle2, Save, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  getDesignations, 
  getHrmsDepartments, 
} from "../../api/hrmsApi";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { cn } from "@/lib/utils";

type Section = 'basic' | 'personal' | 'address' | 'bank' | 'documents';

const sections_config = [
  { id: 'basic' as Section, title: 'Basic Info', icon: Briefcase },
  { id: 'personal' as Section, title: 'Personal Details', icon: User },
  { id: 'address' as Section, title: 'Address', icon: Home },
  { id: 'bank' as Section, title: 'Bank & ID', icon: CreditCard },
  { id: 'documents' as Section, title: 'Documents', icon: FileText },
];

export default function CreateEmployeePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('basic');
  const [completedSections, setCompletedSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Data for form selects
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    basic: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      gender: "male",
      designation_id: "",
      department_id: "",
      joining_date: "",
      employment_type: "Full-time",
      basic_salary: "0",
      paid_leave_days: "0",
      status: "active",
      leave_days: {} as Record<string, string>,
    },
    // Step 2: Personal Details
    personal: {
      middle_name: "",
      father_name: "",
      mother_name: "",
      spouse_name: "",
      nationality: "Indian",
      martial_status: "single",
      marriage_date: "",
      religion: "",
      caste: "",
      blood_group: "",
      identification_mark: "",
      passport_number: "",
      physically_challenged: "no",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relation: ""
    },
    // Step 3: Address
    address: {
      present: {
        house_no: "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        country: "India",
        pincode: ""
      },
      permanent: {
        house_no: "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        country: "India",
        pincode: ""
      },
      sameAsPresent: false
    },
    // Step 4: Bank & ID
    bank: {
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      branch_name: "",
      pan_number: "",
      aadhaar_number: "",
      pf_number: "",
      esi_number: ""
    }
  });

  const [documents, setDocuments] = useState<{ [key: string]: File }>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const loggedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const branch = loggedUser?.branch || '';

      const [desRes, depRes, leaveTypesRes, usersRes] = await Promise.all([
        getDesignations(),
        getHrmsDepartments(),
        axiosInstance.get(ProjectApiList.GET_LEAVE_TYPES),
        branch ? axiosInstance.get(ProjectApiList.api_getUsersByBranch + '/' + branch + '?all=true') : Promise.resolve({ data: { data: [] } })
      ]);

      if (desRes.data.status === "success") setDesignations(desRes.data.data || []);
      if (depRes.data.status === "success") setDepartments(depRes.data.data || []);
      setBranchUsers(usersRes.data?.data || []);
      const lTypes = Array.isArray(leaveTypesRes.data?.data) ? leaveTypesRes.data.data : (Array.isArray(leaveTypesRes.data) ? leaveTypesRes.data : []);
      setLeaveTypes(lTypes);

      // Initialize leave_days with default limits
      const initialLeaves: Record<string, string> = {};
      lTypes.forEach((lt: any) => {
        initialLeaves[lt.id] = (lt.limit_days ?? 0).toString();
      });

      setFormData((prev) => ({
        ...prev,
        basic: {
          ...prev.basic,
          leave_days: initialLeaves
        },
      }));
    } catch (error) {
      console.error("Error fetching form data:", error);
      toast.error("Failed to load dependency data");
    }
  };

  const markAsComplete = (section: Section) => {
    // Validation for current section
    if (section === 'basic') {
      const { first_name, last_name, email, phone, date_of_birth, gender, department_id, designation_id, joining_date } = formData.basic;
      if (!first_name || !last_name || !email || !phone || !date_of_birth || !gender || !department_id || !designation_id || !joining_date) {
        toast.error("Please fill all required basic details");
        return;
      }
    }

    if (!completedSections.includes(section)) {
      setCompletedSections(prev => [...prev, section]);
    }
    
    // Auto-advance
    const sections: Section[] = ['basic', 'personal', 'address', 'bank', 'documents'];
    const currentIndex = sections.indexOf(section);
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
    }
  };

  const handleInputChange = (step: string, field: string, value: any, subfield?: string) => {
    setFormData((prev: any) => {
      if (subfield) {
        return {
          ...prev,
          [step]: {
            ...prev[step],
            [field]: {
              ...prev[step][field],
              [subfield]: value
            }
          }
        };
      }
      return {
        ...prev,
        [step]: {
          ...prev[step],
          [field]: value
        }
      };
    });
  };

  const handleSameAsPresent = (checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        sameAsPresent: checked,
        permanent: checked ? { ...prev.address.present } : prev.address.permanent
      }
    }));
  };

  const handleFileChange = (type: string, file: File | null) => {
    if (file) {
      setDocuments(prev => ({ ...prev, [type]: file }));
    } else {
      setDocuments(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      
      // Append basic info
      Object.entries(formData.basic).forEach(([key, value]) => {
        if (key === 'leave_days') {
          data.append('leave_days', JSON.stringify(value));
        } else {
          data.append(key, value as string);
        }
      });
      data.set('role', 'employee');
      if (selectedUser?.user_id) data.append('user_id', selectedUser.user_id);

      // Append personal info
      Object.entries(formData.personal).forEach(([key, value]) => {
        data.append(key, value);
      });

      // Append bank info
      Object.entries(formData.bank).forEach(([key, value]) => {
        data.append(key, value);
      });
      // Backend column uses `aadhar_number`, keep alias in sync with UI field
      data.append("aadhar_number", formData.bank.aadhaar_number);

      // Append addresses as JSON string
      const addresses = [
        { ...formData.address.present, type: 'present' },
        { 
          ...(formData.address.sameAsPresent ? formData.address.present : formData.address.permanent), 
          type: 'permanent' 
        }
      ];
      data.append('addresses', JSON.stringify(addresses));

      // Append multi-tenancy IDs
      const loggedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      if (loggedUser.cms_admin) data.append('cms_admin', loggedUser.cms_admin);
      if (loggedUser.branch) data.append('branch_id', loggedUser.branch);

      // Append documents
      Object.entries(documents).forEach(([type, file]) => {
        data.append(`documents[${type}]`, file);
      });

      const res = await axiosInstance.post(ProjectApiList.CREATE_EMPLOYEE, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.status === "success") {
        toast.success("Employee onboarding completed successfully");
        router.push("/hrms/employees");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.response?.data?.message || "Failed to onboard employee");
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ id, title, icon: Icon, current }: { id: Section, title: string, icon: any, current: boolean }) => {
    const isComplete = completedSections.includes(id);
    
    return (
      <button
        type="button"
        onClick={() => setActiveSection(id)}
        className={cn(
          "w-full flex items-center justify-between p-5 text-left transition-all duration-300 border-b border-slate-100 outline-none",
          current ? "bg-indigo-50/50" : "hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            isComplete ? "bg-emerald-100 text-emerald-600" : 
            current ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500"
          )}>
            {isComplete ? <CheckCircle2 size={20} /> : <Icon size={20} />}
          </div>
          <div>
            <h3 className={cn("font-semibold", current ? "text-indigo-900" : "text-slate-700")}>
              {title}
            </h3>
            <p className="text-xs text-slate-500">
              {isComplete ? "Completed" : current ? "In Progress" : "Pending"}
            </p>
          </div>
        </div>
        {current ? <ChevronUp className="text-indigo-400" /> : <ChevronDown className="text-slate-400" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">

      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Add New Employee</h1>
              <p className="mt-2 text-slate-600">Unified onboarding workflow for your organization.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/hrms/employees")}
              className="rounded-lg h-10 px-4 border-slate-300 bg-white"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Employees
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Basic Info */}
          <SectionHeader 
            id="basic" 
            title="Basic Details" 
            icon={Briefcase} 
            current={activeSection === 'basic'} 
          />
          <AnimatePresence>
            {activeSection === 'basic' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Branch User</Label>
                    <Select
                      onValueChange={(v) => {
                        const user = branchUsers.find((u: any) => u.user_id === v);
                        setSelectedUser(user || null);
                        if (user) {
                          setFormData((prev: any) => ({
                            ...prev,
                            basic: {
                              ...prev.basic,
                              first_name: user.first_name || user.name?.split(' ')[0] || '',
                              last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
                              email: user.email || '',
                              phone: user.phone || user.contact_number || '',
                            }
                          }));
                        }
                      }}
                      value={selectedUser?.user_id || ""}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Branch User" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        {branchUsers.map((u: any) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.name} — {u.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUser && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold">ID:</span> {selectedUser.user_id}</p>
                        <p><span className="font-semibold">Email:</span> {selectedUser.email}</p>
                        <p><span className="font-semibold">Phone:</span> {selectedUser.phone || '—'}</p>
                        <p><span className="font-semibold">Role:</span> {selectedUser.role}</p>
                        <p><span className="font-semibold">Branch:</span> {selectedUser.branch_details?.name || selectedUser.branch}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">First Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.basic.first_name} 
                      onChange={(e) => handleInputChange('basic', 'first_name', e.target.value)} 
                      placeholder="e.g. Rahul"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Last Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.basic.last_name} 
                      onChange={(e) => handleInputChange('basic', 'last_name', e.target.value)} 
                      placeholder="e.g. Sharma"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Work Email <span className="text-red-500">*</span></Label>
                    <Input 
                      type="email"
                      value={formData.basic.email} 
                      onChange={(e) => handleInputChange('basic', 'email', e.target.value)} 
                      placeholder="rahul@company.com"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.basic.phone} 
                      onChange={(e) => handleInputChange('basic', 'phone', e.target.value)} 
                      placeholder="+91 98XXX XXXXX"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">PAN Number</Label>
                    <Input
                      value={formData.bank.pan_number}
                      onChange={(e) => handleInputChange('bank', 'pan_number', e.target.value)}
                      placeholder="ABCDE1234F"
                      className="rounded-xl h-11 border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Aadhaar Number</Label>
                    <Input
                      value={formData.bank.aadhaar_number}
                      onChange={(e) => handleInputChange('bank', 'aadhaar_number', e.target.value)}
                      placeholder="1234 5678 9012"
                      className="rounded-xl h-11 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={formData.basic.date_of_birth} 
                      onChange={(e) => handleInputChange('basic', 'date_of_birth', e.target.value)} 
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Gender <span className="text-red-500">*</span></Label>
                    <Select 
                      onValueChange={(v) => {
                        handleInputChange('basic', 'gender', v);
                        if (v !== "female") {
                          handleInputChange('basic', 'maternity_leave_days', "0");
                        }
                      }}
                      value={formData.basic.gender}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Department <span className="text-red-500">*</span></Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('basic', 'department_id', v)}
                      value={formData.basic.department_id}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Designation <span className="text-red-500">*</span></Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('basic', 'designation_id', v)}
                      value={formData.basic.designation_id}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Designation" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        {designations.map((des: any) => (
                          <SelectItem key={des.id} value={des.id.toString()}>{des.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Joining Date <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={formData.basic.joining_date} 
                      onChange={(e) => handleInputChange('basic', 'joining_date', e.target.value)} 
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Employment Type <span className="text-red-500">*</span></Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('basic', 'employment_type', v)}
                      value={formData.basic.employment_type}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Basic Salary <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number"
                      value={formData.basic.basic_salary} 
                      onChange={(e) => handleInputChange('basic', 'basic_salary', e.target.value)} 
                      placeholder="e.g. 25000"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Paid Leave Days <span className="text-indigo-500">(Annual)</span></Label>
                    <Input 
                      type="number"
                      value={formData.basic.paid_leave_days} 
                      onChange={(e) => handleInputChange('basic', 'paid_leave_days', e.target.value)} 
                      placeholder="e.g. 12"
                      className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-blue-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Account Status</Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('basic', 'status', v)}
                      value={formData.basic.status}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <h4 className="font-bold text-slate-900 flex items-center">
                      <FileText className="mr-2 text-indigo-500" size={18} />
                      Leave Allocation (Days)
                    </h4>
                    <Separator className="mt-2" />
                  </div>
                  {leaveTypes.map((type) => {
                    // Logic: If the leave type name contains 'maternity' or 'marital', only show it if gender is female
                    const isMaternityType = type.name.toLowerCase().includes('maternity') || type.name.toLowerCase().includes('marital');
                    const isPaidType = type.name.toLowerCase().includes('paid');
                    if (isPaidType) return null;
                    if (isMaternityType && formData.basic.gender !== "female") return null;

                    return (
                      <div key={type.id} className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">{type.name}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.basic.leave_days?.[type.id] || "0"}
                          onChange={(e) => {
                            const newLeaves = { ...formData.basic.leave_days, [type.id]: e.target.value };
                            setFormData((prev: any) => ({
                              ...prev,
                              basic: { ...prev.basic, leave_days: newLeaves }
                            }));
                          }}
                          className="rounded-xl h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder={`e.g. ${type.limit_days}`}
                        />
                      </div>
                    );
                  })}
                  <div className="md:col-span-2 pt-6">
                    <Button 
                      type="button"
                      onClick={() => markAsComplete('basic')}
                      className="w-full md:w-auto px-10 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                    >
                      Save & Continue <ArrowRight size={20} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Personal Details */}
          <SectionHeader 
            id="personal" 
            title="Personal Details" 
            icon={User} 
            current={activeSection === 'personal'} 
          />
          <AnimatePresence>
            {activeSection === 'personal' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Middle Name</Label>
                    <Input 
                      value={formData.personal.middle_name} 
                      onChange={(e) => handleInputChange('personal', 'middle_name', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div> */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Father's Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.personal.father_name} 
                      onChange={(e) => handleInputChange('personal', 'father_name', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Mother's Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.personal.mother_name} 
                      onChange={(e) => handleInputChange('personal', 'mother_name', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Spouse Name</Label>
                    <Input 
                      disabled={formData.personal.martial_status !== 'married'}
                      value={formData.personal.spouse_name} 
                      onChange={(e) => handleInputChange('personal', 'spouse_name', e.target.value)} 
                      className="rounded-xl h-11"
                      placeholder={formData.personal.martial_status !== 'married' ? 'Only if married' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Marital Status</Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('personal', 'martial_status', v)}
                      value={formData.personal.martial_status}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Marriage Date</Label>
                    <Input 
                      type="date"
                      disabled={formData.personal.martial_status !== 'married'}
                      value={formData.personal.marriage_date} 
                      onChange={(e) => handleInputChange('personal', 'marriage_date', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Religion</Label>
                    <Input 
                      value={formData.personal.religion} 
                      onChange={(e) => handleInputChange('personal', 'religion', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Caste</Label>
                    <Input 
                      value={formData.personal.caste} 
                      onChange={(e) => handleInputChange('personal', 'caste', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Blood Group</Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('personal', 'blood_group', v)}
                      value={formData.personal.blood_group}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select Blood Group" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Nationality</Label>
                    <Input 
                      value={formData.personal.nationality} 
                      onChange={(e) => handleInputChange('personal', 'nationality', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Identification Mark</Label>
                    <Input 
                      value={formData.personal.identification_mark} 
                      onChange={(e) => handleInputChange('personal', 'identification_mark', e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Passport Number</Label>
                    <Input 
                      value={formData.personal.passport_number} 
                      onChange={(e) => handleInputChange('personal', 'passport_number', e.target.value)} 
                      className="rounded-xl h-11 uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Physically Challenged</Label>
                    <Select 
                      onValueChange={(v) => handleInputChange('personal', 'physically_challenged', v)}
                      value={formData.personal.physically_challenged}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white">
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 mt-4">
                    <h4 className="font-bold text-slate-900 flex items-center"><Phone className="mr-2 text-indigo-500" size={18} /> Emergency Contact</h4>
                    <Separator className="mt-2"/>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Contact Name</Label>
                    <Input 
                      value={formData.personal.emergency_contact_name} 
                      onChange={(e) => handleInputChange('personal', 'emergency_contact_name', e.target.value)} 
                      className="rounded-xl h-11"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Contact Phone</Label>
                    <Input 
                      value={formData.personal.emergency_contact_phone} 
                      onChange={(e) => handleInputChange('personal', 'emergency_contact_phone', e.target.value)} 
                      className="rounded-xl h-11"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-sm">Relation</Label>
                    <Input 
                      value={formData.personal.emergency_contact_relation} 
                      onChange={(e) => handleInputChange('personal', 'emergency_contact_relation', e.target.value)} 
                      className="rounded-xl h-11"
                      placeholder="e.g. Father, Mother, Spouse"
                    />
                  </div>
                  <div className="md:col-span-2 pt-6">
                    <Button 
                      type="button"
                      onClick={() => markAsComplete('personal')}
                      className="px-10 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg"
                    >
                      Save & Next Section <ArrowRight size={20} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Address */}
          <SectionHeader 
            id="address" 
            title="Address" 
            icon={Home} 
            current={activeSection === 'address'} 
          />
          <AnimatePresence>
            {activeSection === 'address' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 border-l-4 border-indigo-500 pl-4 py-1">
                      <h4 className="font-bold text-slate-900">Present Address</h4>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">House/Flat No</Label>
                      <Input value={formData.address.present.house_no} onChange={(e) => handleInputChange('address', 'present', e.target.value, 'house_no')} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Street/Area</Label>
                      <Input value={formData.address.present.street} onChange={(e) => handleInputChange('address', 'present', e.target.value, 'street')} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">City</Label>
                      <Input value={formData.address.present.city} onChange={(e) => handleInputChange('address', 'present', e.target.value, 'city')} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">State</Label>
                      <Input value={formData.address.present.state} onChange={(e) => handleInputChange('address', 'present', e.target.value, 'state')} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Pincode</Label>
                      <Input value={formData.address.present.pincode} onChange={(e) => handleInputChange('address', 'present', e.target.value, 'pincode')} className="rounded-xl h-11"/>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <input 
                      type="checkbox" 
                      id="sameAsPresent" 
                      className="w-5 h-5 rounded-md accent-indigo-600"
                      checked={formData.address.sameAsPresent}
                      onChange={(e) => handleSameAsPresent(e.target.checked)}
                    />
                    <Label htmlFor="sameAsPresent" className="cursor-pointer font-semibold text-slate-700">Permanent address is same as present</Label>
                  </div>

                  {!formData.address.sameAsPresent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 border-l-4 border-slate-300 pl-4 py-1">
                        <h4 className="font-bold text-slate-900">Permanent Address</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">House/Flat No</Label>
                        <Input value={formData.address.permanent.house_no} onChange={(e) => handleInputChange('address', 'permanent', e.target.value, 'house_no')} className="rounded-xl h-11"/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">Street/Area</Label>
                        <Input value={formData.address.permanent.street} onChange={(e) => handleInputChange('address', 'permanent', e.target.value, 'street')} className="rounded-xl h-11"/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">City</Label>
                        <Input value={formData.address.permanent.city} onChange={(e) => handleInputChange('address', 'permanent', e.target.value, 'city')} className="rounded-xl h-11"/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">State</Label>
                        <Input value={formData.address.permanent.state} onChange={(e) => handleInputChange('address', 'permanent', e.target.value, 'state')} className="rounded-xl h-11"/>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold text-sm">Pincode</Label>
                        <Input value={formData.address.permanent.pincode} onChange={(e) => handleInputChange('address', 'permanent', e.target.value, 'pincode')} className="rounded-xl h-11"/>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button type="button" onClick={() => markAsComplete('address')} className="px-10 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg">
                      Save Address <ArrowRight size={20} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bank & ID */}
          <SectionHeader 
            id="bank" 
            title="Bank & ID" 
            icon={CreditCard} 
            current={activeSection === 'bank'} 
          />
          <AnimatePresence>
            {activeSection === 'bank' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <h4 className="font-bold text-slate-900 flex items-center"><FileText className="mr-2 text-indigo-500" size={20}/> Identification</h4>
                      <Separator className="mt-2"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">PAN Number</Label>
                      <Input placeholder="ABCDE1234F" value={formData.bank.pan_number} onChange={(e) => handleInputChange('bank', 'pan_number', e.target.value)} className="rounded-xl h-11 uppercase"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Aadhaar Number</Label>
                      <Input placeholder="1234 5678 9012" value={formData.bank.aadhaar_number} onChange={(e) => handleInputChange('bank', 'aadhaar_number', e.target.value)} className="rounded-xl h-11"/>
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <h4 className="font-bold text-slate-900 flex items-center"><Building className="mr-2 text-indigo-500" size={20}/> Bank Information</h4>
                      <Separator className="mt-2"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Bank Name</Label>
                      <Input value={formData.bank.bank_name} onChange={(e) => handleInputChange('bank', 'bank_name', e.target.value)} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Account Holder Name</Label>
                      <Input value={formData.bank.account_holder_name} onChange={(e) => handleInputChange('bank', 'account_holder_name', e.target.value)} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Account Number</Label>
                      <Input value={formData.bank.account_number} onChange={(e) => handleInputChange('bank', 'account_number', e.target.value)} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">IFSC Code</Label>
                      <Input value={formData.bank.ifsc_code} onChange={(e) => handleInputChange('bank', 'ifsc_code', e.target.value)} className="rounded-xl h-11 uppercase"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">Branch</Label>
                      <Input value={formData.bank.branch_name} onChange={(e) => handleInputChange('bank', 'branch_name', e.target.value)} className="rounded-xl h-11"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">PF Number</Label>
                      <Input value={formData.bank.pf_number} onChange={(e) => handleInputChange('bank', 'pf_number', e.target.value)} className="rounded-xl h-11" placeholder="Optional"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold text-sm">ESI Number</Label>
                      <Input value={formData.bank.esi_number} onChange={(e) => handleInputChange('bank', 'esi_number', e.target.value)} className="rounded-xl h-11" placeholder="Optional"/>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button type="button" onClick={() => markAsComplete('bank')} className="px-10 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg">
                      Save Banking Details <ArrowRight size={20} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Documents */}
          <SectionHeader 
            id="documents" 
            title="Documents" 
            icon={Upload} 
            current={activeSection === 'documents'} 
          />
          <AnimatePresence>
            {activeSection === 'documents' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { label: "Profile Photo", type: "profile_photo" },
                      { label: "Aadhaar Card", type: "aadhaar_card" },
                      { label: "PAN Card", type: "pan_card" },
                      { label: "Education Certs", type: "education" },
                      { label: "Experience Letter", type: "experience" },
                      { label: "Other Documents", type: "other" },
                    ].map((doc) => (
                      <div key={doc.type} className="group relative bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            documents[doc.type] ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400"
                          )}>
                            {documents[doc.type] ? <CheckCircle2 /> : <Plus />}
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-slate-800">{doc.label}</p>
                            <p className="text-xs text-slate-500 mt-1">{documents[doc.type] ? documents[doc.type].name : "PNG, JPG or PDF up to 5MB"}</p>
                          </div>
                          <Input 
                            type="file" 
                            className="hidden" 
                            id={`file-${doc.type}`}
                            onChange={(e) => handleFileChange(doc.type, e.target.files?.[0] || null)}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-slate-300 group-hover:bg-white"
                            asChild
                          >
                            <label htmlFor={`file-${doc.type}`} className="cursor-pointer">
                              {documents[doc.type] ? "Replace File" : "Choose File"}
                            </label>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-8 border-t border-slate-100">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading} 
                      className="w-full py-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Finalizing Onboarding...
                        </>
                      ) : (
                        <>
                          <Save size={24} /> Complete Registration
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-between px-6">
          <div className="flex gap-2">
            {sections_config.map((s) => (
              <div 
                key={s.id}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  completedSections.includes(s.id) ? "bg-emerald-500 w-10" : 
                  activeSection === s.id ? "bg-indigo-600 w-16" : "bg-slate-200 w-8"
                )}
              />
            ))}
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Step {sections_config.findIndex(s => s.id === activeSection) + 1} of 5
          </p>
        </div>
      </div>
    </div>
  );
}
