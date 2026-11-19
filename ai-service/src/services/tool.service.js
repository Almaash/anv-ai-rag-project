
import { callLaravelApi } from "./laravel.service.js";

const toolRoutes = {
  getBranches: "/ai/branches",
  getDashboard: "/ai/dashboard",
  getBranchSummary: "/ai/branch-summary",

  getInvestments: "/ai/investments",
  getSales: "/ai/sales",
  getPurchases: "/ai/purchases",
  getBookings: "/ai/bookings",
  getCustomers: "/ai/customers",
  getPayments: "/ai/payments",

  getLoanCustomers: "/ai/loan/customers",
  getLoanCaf: "/ai/loan/caf",
  getLoanPd: "/ai/loan/pd",
  getLoanCam: "/ai/loan/cam",
  getLoanDisbursements: "/ai/loan/disbursements",
  getLoanLoans: "/ai/loan/loans",
  getLoanEmis: "/ai/loan/emis",
  getLoanEmiCollections: "/ai/loan/emi-collections",
  getLoanAgents: "/ai/loan/agents",
};

const detailRoutes = {
  getInvestmentDetail: {
    path: "/ai/investments",
    parameter: "unique_id",
  },
  getSaleDetail: {
    path: "/ai/sales",
    parameter: "invoice_no",
  },
  getPurchaseDetail: {
    path: "/ai/purchases",
    parameter: "identifier",
  },
  getCustomerDetail: {
    path: "/ai/customers",
    parameter: "customer_unique_id",
  },
  getLoanCustomerDetail: {
    path: "/ai/loan/customers",
    parameter: "customer_unique_id",
  },
  getLoanCustomerHistory: {
    path: "/ai/loan/customers",
    parameter: "customer_unique_id",
    suffix: "/history",
  },
  getLoanCafDetail: {
    path: "/ai/loan/caf",
    parameter: "caf_id",
  },
  getLoanPdDetail: {
    path: "/ai/loan/pd",
    parameter: "pd_id",
  },
  getLoanCamDetail: {
    path: "/ai/loan/cam",
    parameter: "cam_id",
  },
  getLoanDisbursementDetail: {
    path: "/ai/loan/disbursements",
    parameter: "disbursement_id",
  },
  getLoanDetail: {
    path: "/ai/loan/loans",
    parameter: "loan_id",
  },
  getLoanEmiSchedule: {
    path: "/ai/loan/loans",
    parameter: "loan_id",
    suffix: "/emi-schedule",
  },
  getLoanEmiPayment: {
    path: "/ai/loan/emis",
    parameter: "emi_id",
    suffix: "/payment",
  },
};

const cleanArgs = (args = {}) => {
  return Object.fromEntries(
    Object.entries(args).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== ""
    )
  );
};

export const executeTool = async (toolName, args = {}) => {
  try {
    console.log(`Executing AI tool: ${toolName}`, args);

    let endpoint;
    let params = {};

    // Handle individual record detail APIs
    const detailConfig = detailRoutes[toolName];

    if (detailConfig) {
      const identifier = args[detailConfig.parameter];

      if (!identifier || !String(identifier).trim()) {
        throw new Error(
          `Missing required parameter: ${detailConfig.parameter}`
        );
      }

      endpoint = `${detailConfig.path}/${encodeURIComponent(
        String(identifier).trim()
      )}${detailConfig.suffix || ""}`;
    } else {
      // Handle list and summary APIs
      endpoint = toolRoutes[toolName];

      if (!endpoint) {
        throw new Error(`Unknown AI tool: ${toolName}`);
      }

      params = cleanArgs(args);
    }

    const response = await callLaravelApi(endpoint, params);

    if (response?.success === false) {
      throw new Error(
        response.message || `Laravel API failed: ${toolName}`
      );
    }

    console.log(`AI tool completed: ${toolName}`);

    return response;
  } catch (error) {
    console.error(`AI Tool Error (${toolName}):`, error.message);
    throw error;
  }
};
