"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

type Enrollment = {
  id: number;
  enrollment_number: string;
  customer_unique_id: string;
  enrollment_date: string;
  enrolled_by: string;
  branch_id: string;
  cms_admin_id: string | null;
  status: string;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  rejection_reason: string | null;
  reverted_by: string | null;
  reverted_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

type Customer = {
  id: number;
  is_deleted: number;
  is_delete_requested: boolean;
  admin_user_id: string | null;
  customer_unique_id: string;
  enrollment_number: string;
  enrollment_date: string;
  agent_unique_id: string;
  name: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string;
  email: string;
  phone_no: string | null;
  contact_number_1: string;
  contact_number_2: string;
  user_id: string;
  branch_id: string;
  cms_admin_id: string;
  role: string;
  status: string;
  verification_status: string;
  date_of_birth: string | null;
  father_name: string | null;
  service_area_pin: string | null;
  permanent_address: string | null;
  correspondence_address: string | null;
  occupation: string | null;
  residence_type: string | null;
  customer_photo: string | null;
  created_at: string;
  updated_at: string;
  sourcing_type: string | null;
  referral_id: string | null;
  enrollments: Enrollment[];
  enrollment: Enrollment | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");

  const [entries, setEntries] = useState(10);

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);

  /*
   * Customer selected for restore confirmation.
   */
  const [restoreCustomerData, setRestoreCustomerData] =
    useState<Customer | null>(null);

  /*
   * Customer currently being restored.
   */
  const [restoringId, setRestoringId] = useState<string | null>(
    null
  );

  /*
   * Fetch customers whenever:
   *
   * - page changes
   * - entries changes
   * - search changes
   *
   * Pagination is handled by the API.
   */
  useEffect(() => {
    fetchCustomers();
  }, [page, entries, search]);

  /*
   * ============================
   * GET DELETED CUSTOMERS
   * ============================
   *
   * Example:
   *
   * /api/get-all-deleted-loan-customer
   * ?search=rahul
   * &per_page=5
   * &page=1
   */
  async function fetchCustomers() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      /*
       * Search
       */
      if (search.trim()) {
        params.append("search", search.trim());
      }

      /*
       * Backend pagination
       */
      params.append("per_page", String(entries));
      params.append("page", String(page));

      const res = await axiosInstance.get(
        `${ProjectApiList.api_getDeletedCustomers}?${params.toString()}`
      );

      const responseData = res?.data;

      console.log(
        "Deleted Customers Response:",
        responseData
      );

      /*
       * Expected API response:
       *
       * {
       *   data: [...],
       *   pagination: {
       *     current_page: 1,
       *     per_page: 10,
       *     total: 11,
       *     last_page: 2,
       *     from: 1,
       *     to: 10
       *   }
       * }
       */

      const customersData: Customer[] =
        Array.isArray(responseData?.data)
          ? responseData.data
          : [];

      /*
       * IMPORTANT:
       *
       * Pagination is at:
       *
       * responseData.pagination
       *
       * NOT:
       *
       * responseData.data.pagination
       */
      const pagination = responseData?.pagination;

      setCustomers(customersData);

      setTotal(Number(pagination?.total || 0));

      setTotalPages(
        Number(pagination?.last_page || 1)
      );
    } catch (error) {
      console.error(
        "Failed to fetch deleted customers:",
        error
      );

      setCustomers([]);

      setTotal(0);

      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================
   * RESTORE CUSTOMER
   * ============================
   *
   * API:
   *
   * POST
   * /api/restore-deleted-loan-customer/{customer_unique_id}
   *
   * Example:
   *
   * POST
   * /api/restore-deleted-loan-customer/0240000002
   */
  async function restoreCustomer() {
    /*
     * Nothing selected.
     */
    if (!restoreCustomerData) {
      return;
    }

    try {
      setRestoringId(
        restoreCustomerData.customer_unique_id
      );

      await axiosInstance.post(
        `${ProjectApiList.api_restoreDeletedLoanCustomer}/${restoreCustomerData.customer_unique_id}`
      );

      /*
       * Close confirmation modal.
       */
      setRestoreCustomerData(null);

      /*
       * Refresh current page from API.
       *
       * This keeps pagination/search API-side.
       */
      await fetchCustomers();
    } catch (error) {
      console.error(
        "Failed to restore customer:",
        error
      );
    } finally {
      setRestoringId(null);
    }
  }

  /*
   * ============================
   * CUSTOMER NAME
   * ============================
   */
  function getCustomerName(
    customer: Customer
  ) {
    if (customer.name) {
      return customer.name;
    }

    return [
      customer.first_name,
      customer.middle_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }

  /*
   * ============================
   * CONTACT NUMBER
   * ============================
   */
  function getContactNumber(
    customer: Customer
  ) {
    return (
      customer.contact_number_1 ||
      customer.contact_number_2 ||
      customer.phone_no ||
      "-"
    );
  }

  /*
   * ============================
   * FORMAT DATE
   * ============================
   */
  function formatDate(
    date: string | null | undefined
  ) {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <section className="min-h-screen w-full min-w-0 overflow-x-hidden bg-blue-50/40 py-6 px-3 sm:px-5 lg:px-7">

      <div className="w-full max-w-7xl mx-auto space-y-5 min-w-0">

        {/* ================= HEADER ================= */}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

          <div>
            <h1 className="text-2xl font-bold text-blue-800">
              Deleted Customers
            </h1>

            <p className="text-blue-700 text-sm">
              Manage deleted customers
            </p>
          </div>

          {/* ================= SEARCH ================= */}

          <input
            type="text"
            value={search}
            onChange={(e) => {
              /*
               * Whenever search changes,
               * start API pagination from page 1.
               */
              setPage(1);

              setSearch(e.target.value);
            }}
            placeholder="Search customers..."
            className="w-full sm:w-64 lg:w-72 border border-gray-300 bg-white px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

        {/* ================= TABLE ================= */}

        <div className="w-full min-w-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="w-full overflow-x-auto">

            <table className="w-full table-fixed text-sm">

              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[26%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>

              <thead className="bg-gray-50 text-gray-700">

                <tr>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">
                    #
                  </th>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">
                    Customer
                  </th>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">
                    Customer ID
                  </th>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">

                    <span className="hidden lg:inline">
                      Enrollment No.
                    </span>

                    <span className="lg:hidden">
                      Enrollment
                    </span>

                  </th>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">
                    Contact
                  </th>

                  <th className="px-3 sm:px-4 py-4 text-left font-medium">
                    Enrollment Date
                  </th>

                  <th className="px-3 sm:px-4 py-4 text-center font-medium">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {/* ================= LOADING ================= */}

                {loading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="py-16 text-center text-gray-500"
                    >
                      Loading customers...
                    </td>

                  </tr>

                ) : customers.length === 0 ? (

                  /* ================= EMPTY ================= */

                  <tr>

                    <td
                      colSpan={7}
                      className="py-16 text-center text-gray-500"
                    >
                      {search
                        ? "No customers found"
                        : "No customers available"}
                    </td>

                  </tr>

                ) : (

                  /* ================= CUSTOMERS ================= */

                  customers.map(
                    (customer, idx) => (

                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50 transition"
                      >

                        {/* Number */}

                        <td className="px-3 sm:px-4 py-4 text-gray-500">
                          {(page - 1) *
                            entries +
                            idx +
                            1}
                        </td>

                        {/* Customer */}

                        <td className="px-3 sm:px-4 py-4">

                          <div className="min-w-0">

                            <p className="font-semibold text-gray-900 break-words leading-5">
                              {getCustomerName(
                                customer
                              )}
                            </p>

                            <p className="text-xs text-gray-500 mt-1 break-all">
                              {customer.email ||
                                "-"}
                            </p>

                          </div>

                        </td>

                        {/* Customer ID */}

                        <td className="px-3 sm:px-4 py-4">

                          <span className="inline-block max-w-full truncate px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 font-medium">
                            {
                              customer.customer_unique_id
                            }
                          </span>

                        </td>

                        {/* Enrollment */}

                        <td className="px-3 sm:px-4 py-4 text-gray-700">

                          <span className="block truncate">
                            {
                              customer.enrollment_number ||
                              "-"
                            }
                          </span>

                        </td>

                        {/* Contact */}

                        <td className="px-3 sm:px-4 py-4 text-gray-700">

                          <span className="block truncate">
                            {getContactNumber(
                              customer
                            )}
                          </span>

                        </td>

                        {/* Date */}

                        <td className="px-3 sm:px-4 py-4 text-gray-700 whitespace-nowrap">

                          {formatDate(
                            customer.enrollment_date
                          )}

                        </td>

                        {/* Restore */}

                        <td className="px-2 sm:px-4 py-4 text-center">

                          <button
                            type="button"
                            onClick={() =>
                              setRestoreCustomerData(
                                customer
                              )
                            }
                            disabled={
                              loading ||
                              restoringId !==
                                null
                            }
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-green-300 text-green-600 rounded text-xs hover:bg-green-50 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Restore
                          </button>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ================= PAGINATION ================= */}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">

          {/* Showing */}

          <p className="text-blue-800 text-sm">

            Showing{" "}

            {total === 0
              ? 0
              : (page - 1) *
                  entries +
                1}

            –

            {Math.min(
              page * entries,
              total
            )}{" "}

            of {total}

          </p>

          <div className="flex gap-2 items-center">

            {/* Per Page */}

            <select
              value={entries}
              onChange={(e) => {

                /*
                 * Change backend per_page.
                 *
                 * Reset API page to 1.
                 */

                setEntries(
                  Number(
                    e.target.value
                  )
                );

                setPage(1);

              }}
              className="border border-gray-300 bg-white px-2 py-2 rounded-md text-sm outline-none"
            >

              <option value={5}>
                5
              </option>

              <option value={10}>
                10
              </option>

              <option value={25}>
                25
              </option>

              <option value={50}>
                50
              </option>

            </select>

            {/* Previous */}

            <button
              type="button"
              onClick={() => {

                if (page > 1) {
                  setPage(page - 1);
                }

              }}
              disabled={
                page <= 1 ||
                loading
              }
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Prev
            </button>

            {/* Current Page */}

            <span className="text-sm text-gray-700 min-w-[90px] text-center">
              Page {page} / {totalPages}
            </span>

            {/* Next */}

            <button
              type="button"
              onClick={() => {

                if (
                  page <
                  totalPages
                ) {
                  setPage(page + 1);
                }

              }}
              disabled={
                page >=
                  totalPages ||
                loading
              }
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          RESTORE CONFIRMATION MODAL
          ===================================================== */}

      {restoreCustomerData && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => {

            /*
             * Don't close while API is running.
             */
            if (restoringId === null) {
              setRestoreCustomerData(null);
            }

          }}
        >

          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}

            <div className="px-6 py-5 border-b border-gray-100">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">

                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>

                </div>

                <div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Restore Customer
                  </h2>

                  <p className="text-sm text-gray-500">
                    Confirm customer restoration
                  </p>

                </div>

              </div>

            </div>

            {/* Modal Body */}

            <div className="px-6 py-6">

              <p className="text-sm text-gray-700">
                Are you sure you want to restore this
                customer?
              </p>

              {/* Customer Information */}

              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">

                <p className="font-semibold text-gray-900 break-words">
                  {getCustomerName(
                    restoreCustomerData
                  )}
                </p>

                <div className="mt-2 space-y-1">

                  <p className="text-xs text-gray-500">
                    Customer ID:{" "}
                    <span className="font-medium text-gray-700">
                      {
                        restoreCustomerData.customer_unique_id
                      }
                    </span>
                  </p>

                  <p className="text-xs text-gray-500">
                    Enrollment No:{" "}
                    <span className="font-medium text-gray-700">
                      {
                        restoreCustomerData.enrollment_number ||
                        "-"
                      }
                    </span>
                  </p>

                  <p className="text-xs text-gray-500">
                    Contact:{" "}
                    <span className="font-medium text-gray-700">
                      {getContactNumber(
                        restoreCustomerData
                      )}
                    </span>
                  </p>

                </div>

              </div>

              {/* Warning */}

              <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">

                <p className="text-xs text-yellow-700">
                  This customer will be removed from
                  the deleted customers list after
                  restoration.
                </p>

              </div>

            </div>

            {/* Modal Footer */}

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">

              {/* Cancel */}

              <button
                type="button"
                onClick={() => {

                  if (
                    restoringId ===
                    null
                  ) {
                    setRestoreCustomerData(
                      null
                    );
                  }

                }}
                disabled={
                  restoringId !== null
                }
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              {/* Confirm Restore */}

              <button
                type="button"
                onClick={restoreCustomer}
                disabled={
                  restoringId !== null
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {restoringId ===
                restoreCustomerData.customer_unique_id
                  ? "Restoring..."
                  : "Confirm Restore"}

              </button>

            </div>

          </div>

        </div>

      )}

    </section>
  );
}