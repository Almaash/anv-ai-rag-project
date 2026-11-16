import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

export const getFinanceDashboard = () =>
  axiosInstance.get(ProjectApiList.FINANCE_DASHBOARD);

export const getTransactions = (params?: Record<string, any>) =>
  axiosInstance.get(ProjectApiList.FINANCE_TRANSACTIONS, { params });

export const getTransactionById = (id: string | number) =>
  axiosInstance.get(`${ProjectApiList.FINANCE_TRANSACTIONS}/${id}`);

export const createTransaction = (data: FormData) =>
  axiosInstance.post(ProjectApiList.FINANCE_TRANSACTIONS, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateTransaction = (id: string | number, data: FormData) =>
  axiosInstance.post(`${ProjectApiList.FINANCE_TRANSACTIONS}/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteTransaction = (id: string | number) =>
  axiosInstance.delete(`${ProjectApiList.FINANCE_TRANSACTIONS}/${id}`);

export const downloadAttachment = (id: string | number) =>
  axiosInstance.get(`${ProjectApiList.FINANCE_TRANSACTIONS}/${id}/download`, {
    responseType: "blob",
  });

// Cash Book
export const getCashBookToday = (params?: Record<string, any>) =>
  axiosInstance.get(ProjectApiList.FINANCE_CASH_BOOK_TODAY, { params });

export const getCashBookEntries = (params?: Record<string, any>) =>
  axiosInstance.get(ProjectApiList.FINANCE_CASH_BOOK, { params });

export const getCashBookEntryById = (id: string | number) =>
  axiosInstance.get(`${ProjectApiList.FINANCE_CASH_BOOK}/${id}`);

export const createCashBookEntry = (data: Record<string, any>) =>
  axiosInstance.post(ProjectApiList.FINANCE_CASH_BOOK, data);

export const updateCashBookEntry = (id: string | number, data: Record<string, any>) =>
  axiosInstance.post(`${ProjectApiList.FINANCE_CASH_BOOK}/${id}`, data);

export const deleteCashBookEntry = (id: string | number) =>
  axiosInstance.delete(`${ProjectApiList.FINANCE_CASH_BOOK}/${id}`);

