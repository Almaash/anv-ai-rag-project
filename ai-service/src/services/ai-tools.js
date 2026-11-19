
const commonListParameters = {
    type: "object",
    properties: {
        from_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        to_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        branch_id: {
            type: "string",
            description: "Exact branch code returned by getBranches. Use an empty string if not specified."
        },
        search: {
            type: "string",
            description: "Search keyword. Use an empty string if not specified."
        },
        page: {
            type: "integer",
            description: "Page number. Use 1 if not specified."
        },
        per_page: {
            type: "integer",
            description: "Records per page. Maximum 100. Use 25 if not specified."
        }
    },
    required: [
        "from_date",
        "to_date",
        "branch_id",
        "search",
        "page",
        "per_page"
    ],
    additionalProperties: false
};

const commonLoanReportParameters = {
    type: "object",
    properties: {
        branch_id: { type: "string", description: "Exact branch code. Use an empty string if not specified." },
        cms_admin_id: { type: "string", description: "Exact CMS admin ID. Use an empty string if not specified." },
        user_id: { type: "string", description: "Exact employee user ID. Use an empty string if not specified." },
        search: { type: "string", description: "Search by report record, customer or agent. Use an empty string if not specified." },
        status: { type: "string", description: "Report-specific status. Use an empty string if not specified." },
        verification_status: { type: "string", description: "Verification status. Use an empty string if not specified." },
        frequency: { type: "string", enum: ["", "weekly", "biweekly", "monthly"] },
        due_start_date: { type: "string", description: "EMI due date start in YYYY-MM-DD format." },
        due_end_date: { type: "string", description: "EMI due date end in YYYY-MM-DD format." },
        installment_no: { type: "integer", description: "Exact EMI installment number." },
        customer_unique_id: { type: "string", description: "Exact loan customer unique ID." },
        agent_unique_id: { type: "string", description: "Exact loan agent unique ID." },
        from_date: { type: "string", description: "Start date in YYYY-MM-DD format." },
        to_date: { type: "string", description: "End date in YYYY-MM-DD format." },
        page: { type: "integer", description: "Page number. Use 1 if not specified." },
        per_page: { type: "integer", description: "Records per page. Maximum 100. Use 25 if not specified." }
    },
    required: ["branch_id", "search", "page", "per_page"],
    additionalProperties: false
};

const customerParameters = {
    type: "object",
    properties: {
        branch_id: {
            type: "string",
            description: "Exact branch code returned by getBranches. Use an empty string if not specified."
        },
        search: {
            type: "string",
            description: "Customer name, customer ID or phone number. Use an empty string if not specified."
        },
        page: {
            type: "integer",
            description: "Page number. Use 1 if not specified."
        },
        per_page: {
            type: "integer",
            description: "Records per page. Maximum 100. Use 25 if not specified."
        }
    },
    required: ["branch_id", "search", "page", "per_page"],
    additionalProperties: false
};

const bookingParameters = {
    type: "object",
    properties: {
        from_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        to_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        branch_id: {
            type: "string",
            description: "Exact branch code. Use an empty string if not specified."
        },
        search: {
            type: "string",
            description: "Booking number, customer name or phone. Use an empty string if not specified."
        },
        status: {
            type: "string",
            description: "Booking status such as pending, completed or cancelled. Use an empty string if not specified."
        },
        page: {
            type: "integer",
            description: "Page number. Use 1 if not specified."
        },
        per_page: {
            type: "integer",
            description: "Records per page. Maximum 100. Use 25 if not specified."
        }
    },
    required: [
        "from_date",
        "to_date",
        "branch_id",
        "search",
        "status",
        "page",
        "per_page"
    ],
    additionalProperties: false
};

const branchParameters = {
    type: "object",
    properties: {
        search: {
            type: "string",
            description: "Branch name or branch code. Use an empty string to retrieve all accessible branches."
        },
        branch_id: {
            type: "string",
            description: "Branch code filter. Use an empty string if not specified."
        },
        page: {
            type: "integer",
            description: "Page number. Use 1 if not specified."
        },
        per_page: {
            type: "integer",
            description: "Records per page. Maximum 100. Use 25 if not specified."
        }
    },
    required: ["search", "branch_id", "page", "per_page"],
    additionalProperties: false
};

const branchSummaryParameters = {
    type: "object",
    properties: {
        from_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        to_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format. Use an empty string if not specified."
        },
        branch_id: {
            type: "string",
            description: "Exact branch code. Use an empty string for all accessible branches."
        },
        search: {
            type: "string",
            description: "Unused by this endpoint. Always pass an empty string."
        },
        page: {
            type: "integer",
            description: "Unused by this endpoint. Pass 1."
        },
        per_page: {
            type: "integer",
            description: "Unused by this endpoint. Pass 25."
        }
    },
    required: [
        "from_date",
        "to_date",
        "branch_id",
        "search",
        "page",
        "per_page"
    ],
    additionalProperties: false
};

const investmentDetailParameters = {
    type: "object",
    properties: {
        unique_id: {
            type: "string",
            description: "Exact investment unique_id."
        }
    },
    required: ["unique_id"],
    additionalProperties: false
};

const saleDetailParameters = {
    type: "object",
    properties: {
        invoice_no: {
            type: "string",
            description: "Exact sales invoice number."
        }
    },
    required: ["invoice_no"],
    additionalProperties: false
};

const purchaseDetailParameters = {
    type: "object",
    properties: {
        identifier: {
            type: "string",
            description: "Purchase unique_id or invoice_no."
        }
    },
    required: ["identifier"],
    additionalProperties: false
};

const customerDetailParameters = {
    type: "object",
    properties: {
        customer_unique_id: {
            type: "string",
            description: "Exact customer unique ID."
        }
    },
    required: ["customer_unique_id"],
    additionalProperties: false
};

const customerHistoryParameters = {
    type: "object",
    properties: {
        customer_unique_id: {
            type: "string",
            description: "Exact customer unique ID."
        }
    },
    required: ["customer_unique_id"],
    additionalProperties: false
};

// Customer report
const loanCustomerListParameters = {
    type: "object",
    properties: {
        user_id: { type: "string" },
        branch_id: { type: "string" },
        cms_admin_id: { type: "string" },
        search: { type: "string" },
        verification_status: { type: "string" },
        from_date: { type: "string" },
        to_date: { type: "string" },
        page: { type: "integer" },
        per_page: { type: "integer" }
    },
    required: [
        "user_id", "branch_id", "cms_admin_id", "search",
        "verification_status", "from_date", "to_date",
        "page", "per_page"
    ],
    additionalProperties: false
};

// CAF, PD, CAM, disbursement and loan reports
const loanStageReportParameters = {
    type: "object",
    properties: {
        user_id: { type: "string" },
        branch_id: { type: "string" },
        cms_admin_id: { type: "string" },
        search: { type: "string" },
        status: { type: "string" },
        page: { type: "integer" },
        per_page: { type: "integer" }
    },
    required: [
        "user_id", "branch_id", "cms_admin_id",
        "search", "status", "page", "per_page"
    ],
    additionalProperties: false
};

// EMI report
const loanEmiReportParameters = {
    type: "object",
    properties: {
        user_id: { type: "string" },
        branch_id: { type: "string" },
        cms_admin_id: { type: "string" },
        search: { type: "string" },
        status: { type: "string" },
        frequency: { type: "string" },
        due_start_date: { type: "string" },
        due_end_date: { type: "string" },
        page: { type: "integer" },
        per_page: { type: "integer" }
    },
    required: [
        "user_id", "branch_id", "cms_admin_id", "search",
        "status", "frequency", "due_start_date", "due_end_date",
        "page", "per_page"
    ],
    additionalProperties: false
};

// EMI collection report
// installment_no is a string to allow "" when no filter is supplied.
const loanEmiCollectionParameters = {
    type: "object",
    properties: {
        user_id: { type: "string" },
        branch_id: { type: "string" },
        cms_admin_id: { type: "string" },
        search: { type: "string" },
        status: { type: "string" },
        frequency: { type: "string" },
        installment_no: { type: "string" },
        customer_unique_id: { type: "string" },
        agent_unique_id: { type: "string" },
        from_date: { type: "string" },
        to_date: { type: "string" },
        due_start_date: { type: "string" },
        due_end_date: { type: "string" },
        page: { type: "integer" },
        per_page: { type: "integer" }
    },
    required: [
        "user_id", "branch_id", "cms_admin_id", "search",
        "status", "frequency", "installment_no",
        "customer_unique_id", "agent_unique_id",
        "from_date", "to_date", "due_start_date",
        "due_end_date", "page", "per_page"
    ],
    additionalProperties: false
};

// Loan agents
const loanAgentParameters = {
    type: "object",
    properties: {
        user_id: { type: "string" },
        branch_id: { type: "string" },
        cms_admin_id: { type: "string" },
        search: { type: "string" },
        status: { type: "string" },
        page: { type: "integer" },
        per_page: { type: "integer" }
    },
    required: [
        "user_id", "branch_id", "cms_admin_id",
        "search", "status", "page", "per_page"
    ],
    additionalProperties: false
};

export const aiTools = [
    {
        type: "function",
        function: {
            name: "getBranches",
            description:
                "Retrieve accessible active branches. Returns branch code and name. Always use this tool first when a user mentions a branch by name. Use the returned branch code as branch_id in other tools.",
            parameters: branchParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getDashboard",
            description:
                "Get overall business overview including investment amount, sales, purchases, bookings, payments and outstanding balances. Does not provide customer count.",
            parameters: commonListParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getBranchSummary",
            description:
                "Get branch-wise investment, sales, purchase and booking summaries. Does not provide customer counts.",
            parameters: branchSummaryParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getInvestments",
            description:
                "Get investment records, summary and pagination. Use summary.total_investment_amount, investor_count and active_investment_count for aggregate questions.",
            parameters: commonListParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getInvestmentDetail",
            description: "Get details of one investment using its exact unique ID, including redemption records.",
            parameters: investmentDetailParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getSales",
            description:
                "Get sales invoices, summary and pagination. Use summary.invoice_count for total invoice count, summary.total_sales for total sales, summary.received for received amount and summary.outstanding for outstanding amount.",
            parameters: commonListParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getSaleDetail",
            description: "Get one sales invoice with its items and payment details using the exact invoice number.",
            parameters: saleDetailParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getPurchases",
            description:
                "Get purchase records, summary and pagination. Use summary.purchase_count for total purchases and summary.total_purchases for total purchase amount.",
            parameters: commonListParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getPurchaseDetail",
            description: "Get one purchase and its line items using its unique ID or invoice number.",
            parameters: purchaseDetailParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getBookings",
            description:
                "Get booking records, summary and pagination. Supports date, branch, search and status filters. Use summary.total_bookings for total booking count.",
            parameters: bookingParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getCustomers",
            description:
                "Get CRM customers with pagination. For total customer questions, ALWAYS use data.pagination.total from the API response, not the number of records in data.customers. For a named branch, first call getBranches, find its exact code, and pass that code as branch_id.",
            parameters: customerParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getCustomerDetail",
            description: "Get an individual customer profile, sales, bookings and sales outstanding using the exact customer unique ID.",
            parameters: customerDetailParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getPayments",
            description:
                "Get payment transactions, payment summary and sales outstanding. Use summary.total_received, transaction_count and sales_outstanding for aggregate questions.",
            parameters: commonListParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCustomers",
            description: "Get loan customer reports with registration, verification, pending and rejected summary counts.",
            parameters: {
                type: "object",
                properties: {
                    branch_id: { type: "string", description: "Exact branch code. Use an empty string if not specified." },
                    cms_admin_id: { type: "string", description: "Exact CMS admin ID. Use an empty string if not specified." },
                    user_id: { type: "string", description: "Exact employee user ID. Use an empty string if not specified." },
                    search: { type: "string", description: "Customer ID, name or phone. Use an empty string if not specified." },
                    verification_status: { type: "string", description: "Verification status such as verified, pending or rejected." },
                    status: { type: "string", description: "Customer or enrollment status." },
                    from_date: { type: "string", description: "YYYY-MM-DD start date." },
                    to_date: { type: "string", description: "YYYY-MM-DD end date." },
                    page: { type: "integer" },
                    per_page: { type: "integer" }
                },
                required: ["branch_id", "search", "page", "per_page"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCustomerDetail",
            description: "Get safe loan customer profile details using the exact customer unique ID.",
            parameters: { type: "object", properties: { customer_unique_id: { type: "string" } }, required: ["customer_unique_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCustomerHistory",
            description: "DETAIL/HISTORY TOOL. Requires only customer_unique_id. Never pass branch_id, user_id, cms_admin_id, search, status, dates or pagination.",
            parameters: customerHistoryParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCaf",
            description: "Get CAF application report, status flags and aggregate summary.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCafDetail",
            description: "Get details for one CAF using its exact loan application ID.",
            parameters: { type: "object", properties: { caf_id: { type: "string" } }, required: ["caf_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanPd",
            description: "Get PD verification report with verified, rejected and pending summary counts.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanPdDetail",
            description: "Get details for one PD using its exact PD application ID.",
            parameters: { type: "object", properties: { pd_id: { type: "string" } }, required: ["pd_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCam",
            description: "Get CAM report with approved, rejected, pending and disbursement summary counts.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanCamDetail",
            description: "Get details for one CAM using its exact CAM unique ID.",
            parameters: { type: "object", properties: { cam_id: { type: "string" } }, required: ["cam_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanDisbursements",
            description: "Get disbursement report with count and status summary fields.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanDisbursementDetail",
            description: "Get details for one disbursement using its exact disbursement ID.",
            parameters: { type: "object", properties: { disbursement_id: { type: "string" } }, required: ["disbursement_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanLoans",
            description: "Get loan report records and summary. Supports branch, employee, CMS admin, search and status filters. Do not send EMI-specific filters.",
            parameters: loanStageReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanDetail",
            description: "Get details for one loan using its exact loan number or loan ID.",
            parameters: { type: "object", properties: { loan_id: { type: "string" } }, required: ["loan_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanEmiSchedule",
            description: "Get the EMI schedule for one exact loan ID or loan number.",
            parameters: { type: "object", properties: { loan_id: { type: "string" } }, required: ["loan_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanEmis",
            description: "Get EMI report summaries for paid, pending, overdue and partial EMIs and total scheduled amount.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanEmiPayment",
            description: "Get payment details for one exact EMI schedule ID.",
            parameters: { type: "object", properties: { emi_id: { type: "string" } }, required: ["emi_id"], additionalProperties: false }
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanEmiCollections",
            description: "Get paginated EMI collection records and summary totals, optionally by agent, customer, status, frequency or date.",
            parameters: commonLoanReportParameters
        }
    },
    {
        type: "function",
        function: {
            name: "getLoanAgents",
            description: "Get loan agent records, status, branch and pagination totals.",
            parameters: commonLoanReportParameters
        }
    }
];
