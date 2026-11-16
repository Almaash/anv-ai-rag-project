"use client";

import { useEffect, useState } from "react";
import UsersTable from "./components/UsersTable";
import PromoteUserModal from "./components/PromoteUserModal";
import Link from "next/link";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";
import { toast } from "react-hot-toast";
import DeleteUserModal from "./components/DeleteUserModal";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [roleTab, setRoleTab] = useState<"field_executive" | "branch_support_executive" | "customer_listing" | "deletion_requested">(
    "field_executive"
  );

  const [pagination, setPagination] = useState<any>({
    current_page: 1,
    per_page: 5,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  const [openDelete, setOpenDelete] = useState(false);
  const [openPromote, setOpenPromote] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<"delete" | "deletion_request">("delete");
  const [verificationTab, setVerificationTab] =
    useState<"pending" | "verified">("pending");



  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  };



  const fetchAgents = async () => {
    try {
      const user = getLoggedInUser();
      if (!user) return;

      const role = (user.role || "").toLowerCase();

      if (role === "field executive") return;

      const res = await axiosInstance.get(
        ProjectApiList.api_getAllAgents,
        {
          params: {
            branch_id: user.branch,
            cms_admin_id: role === "cms_admin" ? user.user_id : user.cms_admin,
          },
        }
      );

      if (res.data.success) {
        setAgents(res.data.data.data || []);
      }
    } catch (error) {
      console.error("Fetch agents failed", error);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  /* ==========================
     FETCH USERS
  ========================== */
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const user = getLoggedInUser();
      if (!user) return;

      const role = (user.role || "").toLowerCase();

      const cmsAdminId =
        role === "cms_admin"
          ? user.user_id
          : user.cms_admin;

      const isBseEnrollmentTab = roleTab === "branch_support_executive";
      const isCustomerListing = roleTab === "customer_listing";
      const isDeletionRequested = roleTab === "deletion_requested";

      const endpoint = isBseEnrollmentTab
        ? verificationTab === "pending"
          ? ProjectApiList.api_getPendingEnrollments
          : ProjectApiList.api_getVerifiedEnrollments
        : ProjectApiList.api_getAllLonaCustomers;

      const params: any = {
        search,
        per_page: pagination.per_page,
        page,
        branch_id: user.branch,
        cms_admin_id: cmsAdminId,
      };

      if (isDeletionRequested) {
        // For deletion requested tab - show customers with deletion requests
        params.status = "branch_support_executive";
        params.is_delete_requested = true;
        if (role === "field executive") {
          params.agent_unique_id = user.agent_unique_id;
        } else if (selectedAgent) {
          const selectedAgentObj = agents.find(
            (agent) => agent.agent_unique_id === selectedAgent
          );
          if (selectedAgentObj) params.agent_unique_id = selectedAgentObj.agent_unique_id;
        }
      } else if (isCustomerListing) {
        // Show all customers created by this agent/branch
        params.status = "branch_support_executive";
        params.is_delete_requested = false;
        if (role === "field executive") {
          params.agent_unique_id = user.agent_unique_id;
        } else if (selectedAgent) {
          const selectedAgentObj = agents.find(
            (agent) => agent.agent_unique_id === selectedAgent
          );
          if (selectedAgentObj) params.agent_unique_id = selectedAgentObj.agent_unique_id;
        }
      } else if (isBseEnrollmentTab) {
        // BSE tab: FE sees only their own customers
        if (role === "field executive") {
          params.agent_unique_id = user.agent_unique_id;
        } else if (selectedAgent) {
          const selectedAgentObj = agents.find(
            (agent) => agent.agent_unique_id === selectedAgent
          );
          if (selectedAgentObj) params.agent_unique_id = selectedAgentObj.agent_unique_id;
        }
      } else {
        // field_executive tab filters
        if (role !== "field executive") {
          if (selectedAgent) {
            const selectedAgentObj = agents.find(
              (agent) => agent.agent_unique_id === selectedAgent
            );
            params.enrolled_by = selectedAgentObj?.user_id;
          }
        } else {
          params.enrolled_by = user.user_id;
        }
        params.status = roleTab;
      }

      console.log("Customer Listing Params =>", params);

      const res = await axiosInstance.get(endpoint, {
        params,
      });

      if (res.data.success) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Fetch users failed", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsers();
  }, [
    search,
    page,
    roleTab,
    verificationTab,
    selectedAgent,
  ]);
  /* ==========================
     DELETE / DELETION REQUEST
  ========================== */
  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setActionType("delete");
    setOpenDelete(true);
  };

  const handleDeletionRequest = (user: any) => {
    setSelectedUser(user);
    setActionType("deletion_request");
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);

      if (actionType === "deletion_request") {
        // Submit deletion request
        const res = await axiosInstance.post(
          `${ProjectApiList.api_customerDeletionRequest}/${selectedUser.customer_unique_id || selectedUser.id}`
        );

        if (res.data.success) {
          toast.success(
            res.data.message || "Deletion request submitted successfully"
          );
          setOpenDelete(false);
          setSelectedUser(null);
          fetchUsers();
        } else {
          toast.error(res.data.message || "Failed to submit deletion request");
        }
      } else {
        // Delete customer
        let url: string;

        if (roleTab === "branch_support_executive") {
          // Delete enrollment (cascade: CAF + PD + CAM + Disbursement + Loan + EMIs)
          url = `${ProjectApiList.api_deleteEnrollment}/${selectedUser.enrollment_number}`;
        } else {
          // Delete customer (cascade: all related data)
          url = `${ProjectApiList.api_deleteLoanCustomers}/${selectedUser.id}`;
        }

        const res = await axiosInstance.post(url);

        if (res.data.success) {
          await fetchUsers();
          setOpenDelete(false);
          setSelectedUser(null);
          toast.success(res.data.message || "Deleted successfully");
        } else {
          toast.error(res.data.message || "Failed to delete");
        }
      }
    } catch (error: any) {
      console.error("Delete/Deletion Request failed", error);
      toast.error(error.response?.data?.message || error.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================
     PROMOTE
  ========================== */
  const handlePromote = (user: any) => {
    setSelectedUser(user);
    setOpenPromote(true);
  };

  const confirmPromote = async () => {
    if (!selectedUser) return;

    try {
      setPromoting(true);
      const res = await axiosInstance.post(
        `${ProjectApiList.api_promoteLoanCustomer}/${selectedUser.id}`
      );

      if (res.data.success) {
        toast.success("Promoted to Branch Manager successfully");
        setOpenPromote(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Promotion failed");
    } finally {
      setPromoting(false);
    }
  };


  const loggedInUser = getLoggedInUser();
  const role = (loggedInUser?.role || "").toLowerCase();

  return (
    <div className="p-6 space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 shrink-0">
          Customer Management
        </h1>

        <div className="flex flex-wrap gap-2 sm:gap-3 items-center w-full sm:w-auto">

          {role !== "field executive" && (
            <select
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-xs sm:text-sm w-full sm:w-auto"
            >
              <option value="">All Agents</option>

              {agents.map((agent) => (
                <option
                  key={agent.agent_unique_id}
                  value={agent.agent_unique_id}
                >
                  {agent.name}
                </option>
              ))}
            </select>
          )}

          <Link href="/loan/customers/createCustomer?type=existing" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm whitespace-nowrap">
              + Existing Customer
            </button>
          </Link>

          <Link href="/loan/customers/createCustomer" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm whitespace-nowrap">
              + Create Customer
            </button>
          </Link>

        </div>

      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">

        <button
          onClick={() => {
            setRoleTab("field_executive");
            setPage(1);
          }}
          className={`relative pr-5 py-2 text-sm font-medium transition-colors
      ${roleTab === "field_executive"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Field Executive

          {roleTab === "field_executive" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleTab("branch_support_executive");
            setVerificationTab("pending");
            setPage(1);
          }}
          className={`relative px-5 py-2 text-sm font-medium transition-colors
      ${roleTab === "branch_support_executive"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Branch Support Executive
          {roleTab === "branch_support_executive" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleTab("customer_listing");
            setPage(1);
          }}
          className={`relative px-5 py-2 text-sm font-medium transition-colors
      ${roleTab === "customer_listing"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Customers
          {roleTab === "customer_listing" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleTab("deletion_requested");
            setPage(1);
          }}
          className={`relative px-5 py-2 text-sm font-medium transition-colors
      ${roleTab === "deletion_requested"
              ? "text-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
        >
          Deletion Requested
          {roleTab === "deletion_requested" && (
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 rounded"></span>
          )}
        </button>

      </div>
      {/* Verification Tabs (only for Branch Support Executive) */}
      {roleTab === "branch_support_executive" && (
        <div className="flex gap-4 mt-3 border-b pb-2">

          <button
            onClick={() => {
              setVerificationTab("pending");
              setPage(1);
            }}
            className={`px-4 py-1 rounded-md text-sm font-medium
        ${verificationTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
              }`}
          >
            Pending
          </button>

          <button
            onClick={() => {
              setVerificationTab("verified");
              setPage(1);
            }}
            className={`px-4 py-1 rounded-md text-sm font-medium
        ${verificationTab === "verified"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600"
              }`}
          >
            Verified
          </button>

        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* SEARCH */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {pagination.total} {roleTab === "branch_support_executive" ? "enrollments" : roleTab === "deletion_requested" ? "deletion requests" : "customers"} found
          </p>


          <input
            type="text"
            placeholder={roleTab === "branch_support_executive" ? "Search by Customer ID or Enrollment No..." : roleTab === "customer_listing" ? "Search customer..." : roleTab === "deletion_requested" ? "Search by Customer ID or Name..." : "Search customer..."}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-72 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <UsersTable
          users={users}
          loading={loading}
          page={pagination.current_page}
          lastPage={pagination.last_page}
          from={pagination.from}
          to={pagination.to}
          total={pagination.total}
          perPage={pagination.per_page}
          onPageChange={setPage}
          onDelete={handleDelete}
          onDeletionRequest={handleDeletionRequest}
          onPromote={handlePromote}
          onRefresh={fetchUsers}
          roleTab={roleTab}
          mode={roleTab === "branch_support_executive" ? "enrollments" : roleTab === "customer_listing" ? "customer_listing" : roleTab === "deletion_requested" ? "deletion_requested" : "customers"}
          verificationTab={verificationTab}
        />
      </div>

      {openDelete && (
        <DeleteUserModal
          user={selectedUser}
          roleTab={roleTab}
          actionType={actionType}
          loading={loading}
          onClose={() => {
            setOpenDelete(false);
            setActionType("delete");
          }}
          onConfirm={confirmDelete}
        />
      )}

      {openPromote && (
        <PromoteUserModal
          user={selectedUser}
          loading={promoting}
          onClose={() => setOpenPromote(false)}
          onConfirm={confirmPromote}
        />
      )}
    </div>
  );
}
