"use client";

import {
  Trash,
  Eye,
  Edit,
  FilePlus,
  CheckCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function UsersTable({
  users = [],
  loading = false,
  page,
  perPage,
  total,
  from,
  to,
  lastPage,
  onPageChange,
  onDelete,
  onDeletionRequest,
  onRefresh,
  mode = "customers",
  verificationTab = "pending",
  roleTab,
}: any) {
  const router = useRouter();
  const pathname = usePathname();

  const isEnrollmentMode = mode === "enrollments";
  const isCustomerListingMode = mode === "customer_listing";
  const isDeletionRequestedMode =
    mode === "deletion_requested";
  const isCustomerDropoutPage =
    pathname.replace(/\/$/, "") === "/loan/customers-dropout";

  /*
  |--------------------------------------------------------------------------
  | HEADERS
  |--------------------------------------------------------------------------
  */

  const enrollmentHeaders = [
    "S.No",
    "Customer ID",
    "Enrollment No",
    "Customer Name",
    "Mobile",
    "Enrollment Date",
    "Status",
    "Actions",
  ];

  /* NORMAL /loan/customers/ PAGE */
  const customerHeaders = [
    "S.No",
    "Customer ID",
    "Enrollment #",
    "Full Name",
    "Contact",
    "Area (Pincode)",
    "Created By",
    "Status",
    "Actions",
  ];

  /* ONLY FOR /loan/customers-dropout/ */
  const customerListingHeaders = [
    "S.No",
    "Customer ID",
    "Full Name",
    "Contact",
    ...(isCustomerDropoutPage
      ? ["Loan End Date", "Loan Status"]
      : ["Area (Pincode)", "Created By"]),
    "Actions",
  ];

  const deletionRequestedHeaders = [
    "S.No",
    "Customer ID",
    "Full Name",
    "Contact",
    "Area (Pincode)",
    "Request Date",
    "Actions",
  ];

  /*
  |--------------------------------------------------------------------------
  | SELECT CORRECT HEADERS
  |--------------------------------------------------------------------------
  */

  const headers = isDeletionRequestedMode
    ? deletionRequestedHeaders
    : isEnrollmentMode
      ? enrollmentHeaders
      : isCustomerListingMode
        ? customerListingHeaders
        : customerHeaders;

  const colSpan = headers.length;

  /*
  |--------------------------------------------------------------------------
  | USER ROLE
  |--------------------------------------------------------------------------
  */

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const isFieldExecutive =
    currentUser?.role?.toLowerCase() === "field executive" ||
    currentUser?.role === "Field Executive";

  const isBSE =
    currentUser?.role?.toLowerCase() ===
    "branch support executive";

  /*
  |--------------------------------------------------------------------------
  | LOAN STATUS
  |--------------------------------------------------------------------------
  */

  const getLoanStatus = (
    loanEndDate?: string | null
  ) => {
    if (!loanEndDate) {
      return {
        label: "No End Date",
        isPassed: false,
        className:
          "text-gray-500 bg-gray-100 border-gray-200",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(
      `${loanEndDate}T00:00:00`
    );

    endDate.setHours(0, 0, 0, 0);

    const diffTime =
      endDate.getTime() - today.getTime();

    const diffDays = Math.ceil(
      diffTime / (1000 * 60 * 60 * 24)
    );

    /*
     * Future
     */
    if (diffDays > 0) {
      return {
        label: `${diffDays} days remaining`,
        isPassed: false,
        className:
          "text-green-700 bg-green-100 border-green-200",
      };
    }

    /*
     * Passed
     */
    if (diffDays < 0) {
      return {
        label: `${Math.abs(diffDays)} days passed`,
        isPassed: true,
        className:
          "text-red-700 bg-red-100 border-red-200",
      };
    }

    /*
     * Today
     */
    return {
      label: "Ends today",
      isPassed: false,
      className:
        "text-orange-700 bg-orange-100 border-orange-200",
    };
  };

  /*
  |--------------------------------------------------------------------------
  | TABLE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-700">

          {/* ============================================================
              TABLE HEADER
          ============================================================ */}

          <thead>
            <tr className="bg-gray-50 text-gray-900 text-left border-b border-gray-100">
              {headers.map((h: string) => (
                <th
                  key={h}
                  className="px-4 py-4 font-bold tracking-tight whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">

            {/* ============================================================
                LOADING
            ============================================================ */}

            {loading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-20 text-center text-gray-400 font-medium"
                >
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-2 align-middle" />

                  {isEnrollmentMode
                    ? "Fetching enrollment records..."
                    : isDeletionRequestedMode
                      ? "Fetching deletion requests..."
                      : "Fetching customer records..."}
                </td>
              </tr>

            ) : users.length === 0 ? (

              /* ============================================================
                  EMPTY
              ============================================================ */

              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-20 text-center text-gray-400 font-medium"
                >
                  {isEnrollmentMode
                    ? "No enrollment records found."
                    : isDeletionRequestedMode
                      ? "No deletion requests found."
                      : "No customer profiles match your search."}
                </td>
              </tr>

            ) : isDeletionRequestedMode ? (

              /* ============================================================
                  DELETION REQUESTED
              ============================================================ */

              users.map(
                (customer: any, index: number) => {
                  const serialNo =
                    (page - 1) *
                      (perPage || 10) +
                    index +
                    1;

                  const fullName = [
                    customer.first_name,
                    customer.middle_name,
                    customer.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "—";

                  return (
                    <tr
                      key={`${customer.customer_unique_id}-${customer.id}`}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* S.No */}
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {serialNo}
                      </td>

                      {/* Customer ID */}
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-200">
                          {customer.customer_unique_id}
                        </span>
                      </td>

                      {/* Full Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">
                          {fullName}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 text-gray-600">
                        {customer.contact_number_1 ||
                          "—"}
                      </td>

                      {/* Area */}
                      <td className="px-4 py-3 font-medium italic text-gray-600">
                        {customer.service_area_pin ||
                          "—"}
                      </td>

                      {/* Request Date */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(
                          customer.deletion_request_date ??
                            customer.created_at
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={() =>
                              router.push(
                                `/loan/customers/customerDetails?id=${customer.customer_unique_id}`
                              )
                            }
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )

            ) : isEnrollmentMode ? (

              /* ============================================================
                  ENROLLMENT
              ============================================================ */

              users.map(
                (enrollment: any, index: number) => {
                  const serialNo =
                    (page - 1) *
                      (perPage || 10) +
                    index +
                    1;

                  const cust =
                    enrollment.customer ?? {};

                  const fullName = [
                    cust.first_name,
                    cust.middle_name,
                    cust.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "—";

                  return (
                    <tr
                      key={`${enrollment.source_type}-${enrollment.customer_unique_id}-${enrollment.enrollment_number}`}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* S.No */}
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {serialNo}
                      </td>

                      {/* Customer ID */}
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-200">
                          {
                            enrollment.customer_unique_id
                          }
                        </span>
                      </td>

                      {/* Enrollment */}
                      <td className="px-4 py-3">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[11px] font-bold border border-indigo-200">
                          {
                            enrollment.enrollment_number
                          }
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">
                          {fullName}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 text-gray-600">
                        {cust.contact_number_1 ||
                          "—"}
                      </td>

                      {/* Enrollment Date */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(
                          enrollment.enrollment_date ??
                            enrollment.created_at
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-black uppercase tracking-wider ${
                            enrollment.verification_status ===
                            "verified"
                              ? "text-green-600"
                              : enrollment.verification_status ===
                                  "rejected"
                                ? "text-red-600"
                                : "text-orange-500"
                          }`}
                        >
                          {
                            enrollment.verification_status ??
                              "pending"
                          }
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {verificationTab ===
                          "pending" &&
                        roleTab ===
                          "branch_support_executive" &&
                        isBSE ? (
                          <div className="flex gap-1.5 items-center">

                            <button
                              onClick={() =>
                                router.push(
                                  `/loan/customers/customerDetails?id=${enrollment.customer_unique_id}&enrollment_number=${enrollment.enrollment_number}`
                                )
                              }
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() =>
                                router.push(
                                  `/loan/customers/customerDetails?id=${enrollment.customer_unique_id}&enrollment_number=${enrollment.enrollment_number}`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={13} />
                              Verify
                            </button>

                            <button
                              onClick={() =>
                                onDelete(enrollment)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-colors"
                              title="Delete"
                            >
                              <Trash size={14} />
                              <span>
                                Delete
                              </span>
                            </button>

                          </div>
                        ) : verificationTab ===
                          "reverted" ? (

                          <div className="flex items-center gap-1.5">

                            <button
                              onClick={() =>
                                router.push(
                                  `/loan/customers/customerDetails?id=${enrollment.customer_unique_id}&enrollment_number=${enrollment.enrollment_number}`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                            >
                              <Eye size={13} />
                              View
                            </button>

                            <button
                              onClick={() =>
                                onDelete(enrollment)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-colors"
                              title="Delete"
                            >
                              <Trash size={14} />
                              <span>
                                Delete
                              </span>
                            </button>

                          </div>

                        ) : (

                          <div className="flex items-center gap-1.5">

                            <button
                              onClick={() =>
                                router.push(
                                  `/loan/customers/customerDetails?id=${enrollment.customer_unique_id}&enrollment_number=${enrollment.enrollment_number}`
                                )
                              }
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() =>
                                onDelete(enrollment)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-colors"
                              title="Delete"
                            >
                              <Trash size={14} />
                              <span>
                                Delete
                              </span>
                            </button>

                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }
              )

            ) : isCustomerListingMode ? (

                  /* ============================================================
                  CUSTOMER DROPOUT / CUSTOMER LISTING
              ============================================================ */

              users.map(
                (user: any, index: number) => {
                  const serialNo =
                    (page - 1) *
                      (perPage || 10) +
                    index +
                    1;

                  const loans = Array.isArray(
                    user.loans
                  )
                    ? user.loans
                    : [];
                  const hasPassedLoan = loans.some(
                    (loan: any) =>
                      getLoanStatus(loan.loan_end_date).isPassed
                  );

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      {/* S.No */}
                      <td className="px-4 py-4 font-bold text-gray-400">
                        {serialNo}
                      </td>

                      {/* Customer ID */}
                      <td className="px-4 py-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-200">
                          {
                            user.customer_unique_id
                          }
                        </span>
                      </td>

                      {/* Full Name */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">
                          {user.first_name}{" "}
                          {user.last_name || ""}
                        </div>

                        <div className="text-[11px] text-gray-400 font-medium">
                          Created:{" "}
                          {formatDate(
                            user.created_at
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-700">
                          {
                            user.contact_number_1
                          }
                        </div>

                        <div className="text-[11px] text-gray-400 lowercase">
                          {user.email}
                        </div>
                      </td>

                      {!isCustomerDropoutPage && (
                        <>
                          {/* Area */}
                          <td className="px-4 py-4 font-medium italic text-gray-600">
                            {user.service_area_pin || "—"}
                          </td>

                          {/* Created By */}
                          <td className="px-4 py-4 text-gray-600 text-sm">
                            {user.agent_unique_id || "—"}
                          </td>
                        </>
                      )}

                      {isCustomerDropoutPage && (
                        <>
                          {/* Loan End Date */}
                          <td className="px-4 py-4 text-gray-600 text-sm">
                            {loans.length > 0 ? (
                              <div className="space-y-2">
                                {loans.map(
                                  (
                                    loan: any,
                                    loanIndex: number
                                  ) => (
                                    <div
                                      key={`${loan.loan_number}-${loanIndex}`}
                                      className="whitespace-nowrap"
                                    >
                                      <div className="font-semibold text-gray-800">
                                        {formatDate(loan.loan_end_date)}
                                      </div>
                                      <div className="text-[10px] text-gray-400">
                                        {loan.loan_number || "Loan"}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Loan Status */}
                          <td className="px-4 py-4 text-sm">
                            {loans.length > 0 ? (
                              <div className="space-y-2">
                                {loans.map(
                                  (
                                    loan: any,
                                    loanIndex: number
                                  ) => {
                                    const loanStatus = getLoanStatus(
                                      loan.loan_end_date
                                    );

                                    return (
                                      <div
                                        key={`${loan.loan_number}-status-${loanIndex}`}
                                      >
                                        <span
                                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border ${loanStatus.className}`}
                                        >
                                          {loanStatus.label}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* ====================================================
                          ACTIONS
                      ==================================================== */}

                      <td className="px-4 py-4">
                        <div className="flex gap-1.5 items-center">

                          <button
                            onClick={() =>
                              router.push(
                                `/loan/customers/customerDetails?id=${user.customer_unique_id}&enrollment_number=${user.enrollment?.enrollment_number}`
                              )
                            }
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>

                          {(!isCustomerDropoutPage || hasPassedLoan) && (
                            <button
                              onClick={() =>
                                onDeletionRequest?.(
                                  user
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-amber-300 rounded bg-white text-orange-600 font-medium hover:bg-amber-50 hover:border-amber-400 transition-colors"
                              title="Request Deletion"
                            >
                              Delete Customer Request
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                }
              )

            ) : (

              /* ============================================================
                  NORMAL CUSTOMERS

                  /loan/customers/

                  Includes Area and Created By, but no loan columns
              ============================================================ */

              users.map(
                (user: any, index: number) => {
                  const serialNo =
                    (page - 1) *
                      (perPage || 10) +
                    index +
                    1;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >

                      {/* S.No */}
                      <td className="px-4 py-4 font-bold text-gray-400">
                        {serialNo}
                      </td>

                      {/* Customer ID */}
                      <td className="px-4 py-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-200">
                          {
                            user.customer_unique_id
                          }
                        </span>
                      </td>

                      {/* Enrollment */}
                      <td className="px-4 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-bold border">
                          {
                            user.enrollment_number
                          }
                        </span>
                      </td>

                      {/* Full Name */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">
                          {user.first_name}{" "}
                          {user.last_name || ""}
                        </div>

                        <div className="text-[11px] text-gray-400 font-medium">
                          Created:{" "}
                          {formatDate(
                            user.created_at
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-700">
                          {
                            user.contact_number_1
                          }
                        </div>

                        <div className="text-[11px] text-gray-400 lowercase">
                          {user.email}
                        </div>
                      </td>

                      {/* Area */}
                      <td className="px-4 py-4 font-medium italic text-gray-600">
                        {user.service_area_pin ||
                          "—"}
                      </td>

                      {/* Created By */}
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {user.agent_unique_id ||
                          "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`font-medium ${
                            user.status ===
                            "active"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5 items-center">

                          {/* VIEW */}
                          <button
                            onClick={() =>
                              router.push(
                                `/loan/customers/customerDetails?id=${user.customer_unique_id}&enrollment_number=${user.enrollment?.enrollment_number}`
                              )
                            }
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>

                          {/* FIELD EXECUTIVE DELETE */}
                          {isFieldExecutive && (
                            <button
                              onClick={() =>
                                onDelete(user)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-colors"
                              title="Delete Account"
                            >
                              <Trash size={14} />
                              <span>
                                Delete
                              </span>
                            </button>
                          )}

                          {/* NON FIELD EXECUTIVE */}
                          {!isFieldExecutive && (
                            <>
                              {/* EDIT */}
                              <button
                                onClick={() =>
                                  router.push(
                                    `/loan/customers/editCustomer?id=${user.customer_unique_id}`
                                  )
                                }
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Edit Profile"
                              >
                                <Edit size={16} />
                              </button>

                              {/* REQUEST */}
                              <button
                                onClick={() =>
                                  onDeletionRequest?.(
                                    user
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-amber-300 rounded bg-white text-orange-600 font-medium hover:bg-amber-50 hover:border-amber-400 transition-colors"
                                title="Request Deletion"
                              >
                                Request
                              </button>

                              {/* NEW CAF */}
                              {user.verification_status ===
                                "verified" && (
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/loan/caf/createCAF?customer_unique_id=${user.customer_unique_id}`
                                    )
                                  }
                                  className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                  title="New CAF"
                                >
                                  <FilePlus
                                    size={16}
                                  />
                                </button>
                              )}
                            </>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                }
              )
            )}

          </tbody>
        </table>
      </div>

      {/* ================================================================
          PAGINATION
      ================================================================ */}

      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 py-3 bg-gray-50">

          <p className="text-sm text-gray-600">
            Showing <b>{from}</b> – <b>{to}</b>{" "}
            of <b>{total}</b>{" "}
            {isEnrollmentMode
              ? "enrollments"
              : "customers"}
          </p>

          <div className="flex items-center gap-4">

            <span className="text-sm text-gray-600">
              Page <b>{page}</b> of{" "}
              <b>{lastPage}</b>
            </span>

            <div className="flex gap-2">

              <button
                disabled={page === 1}
                onClick={() =>
                  onPageChange(page - 1)
                }
                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                disabled={page === lastPage}
                onClick={() =>
                  onPageChange(page + 1)
                }
                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}