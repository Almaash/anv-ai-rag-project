"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ReloadLink from "@/components/ReloadLink";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  LayoutDashboard, Percent, BadgeIndianRupee, Users, FileText,
  Wallet, Landmark, CheckCircle, ChevronDown, ChevronRight,
  Banknote, Calendar, UserCheck, CreditCard, BarChart3, User,
  Settings, Bell, ShieldCheck, GitBranch, Layers, Package, Calculator, TrendingUp, BookOpen, type LucideIcon,
} from "lucide-react";

type NavItem = {
  name: string;
  href?: string;
  icon?: LucideIcon;
  permission?: string;   // every item may have a permission key
  children?: any[]; // allow nested children of varying shapes
};

/* ─── helpers ─────────────────────────────────────────────── */
function getPermissions(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const p = JSON.parse(localStorage.getItem("permissions") || "[]");
    return new Set(Array.isArray(p) ? p : []);
  } catch { return new Set(); }
}

/* ─── all nav items ───────────────────────────────────────── */
const allNavItems: NavItem[] = [
  // Admin
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "read_admin_dashboard" },
  { name: "Subscription", href: "/admin/subscription", icon: CreditCard, permission: "read_admin_subscription" },
  { name: "Modules", href: "/admin/modules", icon: Layers, permission: "read_admin_modules" },
  { name: "Deleted customers", href: "/admin/deleted-customers", icon: User, permission: "read_admin_modules" },
  { name: "Branch Cities", href: "/admin/branch-cities", icon: GitBranch, permission: "read_admin_branch_cities" },
  { name: "Branches", href: "/admin/branch", icon: GitBranch, permission: "read_admin_branch" },
  { name: "Manage Roles", href: "/admin/roles", icon: ShieldCheck, permission: "read_admin_roles" },
  { name: "Manage Users", href: "/admin/users", icon: Users, permission: "read_admin_users" },
  { name: "Field Executive", href: "/admin/field-executive", icon: UserCheck, permission: "read_admin_field_executive" },


  // Loan Customer
  { name: "Dashboard", href: "/loan/customer-dashboard", icon: LayoutDashboard, permission: "read_customer_dashboard" },
  { name: "Customer Profile", href: "/loan/customer-profile", icon: User, permission: "read_customer_profile" },
  { name: "Customer Applications", href: "/loan/customer-applications", icon: FileText, permission: "read_customer_applications" },

  // Loan
  { name: "Dashboard", href: "/loan/dashboard", icon: LayoutDashboard, permission: "read_loan_dashboard" },
  { name: "Interest Master", href: "/loan/intrestMaster", icon: Percent, permission: "read_loan_intrest_master" },
  { name: "Fee Master", href: "/loan/feeMaster", icon: BadgeIndianRupee, permission: "read_loan_fee_master" },
  { name: "Investor Type Master", href: "/loan/investor-type", icon: Users, permission: "read_loan_investor_type_master" },
  { name: "Field Executives", href: "/loan/agents", icon: Users, permission: "read_loan_field_executives" },
  { name: "Customers", href: "/loan/customers", icon: Users, permission: "read_loan_customers" },
  { name: "Customer Dropouts", href: "/loan/customers-dropout", icon: Users, permission: "read_loan_customers_dropout" },
  { name: "Customer Verification", href: "/loan/customerVerification", icon: CheckCircle, permission: "read_loan_customer_verification" },
  { name: "CAF Details", href: "/loan/caf", icon: FileText, permission: "read_loan_caf_details" },
  { name: "CAF Verification", href: "/loan/cafVerification", icon: FileText, permission: "read_loan_caf_verification" },
  { name: "PD Information", href: "/loan/pd", icon: FileText, permission: "read_loan_pd_information" },
  { name: "CAM", href: "/loan/cam", icon: FileText, permission: "read_loan_cam" },
  { name: "CAM Verification", href: "/loan/cam/camVerificationListing", icon: CheckCircle, permission: "read_loan_cam_verification" },
  { name: "Products", href: "/loan/products", icon: Package, permission: "read_loan_products" },
  { name: "Deletion Requests", href: "/loan/deletionRequests", icon: Package, permission: "read_loan_deletion_request" },

  {
    name: "Disbursement", icon: Wallet, permission: "read_loan_disbursement", children: [
      { name: "Disbursement Panel", href: "/loan/disbursement/panel" },
      { name: "Final Disbursement", href: "/loan/disbursement/final" },
      { name: "Payment Inventory", href: "/loan/disbursement/payment-inventory" },
    ]
  },
  { name: "Start Loans", href: "/loan/loans/allLoans", icon: Landmark, permission: "read_loan_start_loan" },
  {
    name: "Reports", icon: BarChart3, permission: "read_loan_reports", children: [
      // { name: "Reports Home", href: "/loan/reports" },
      { name: "Customer Report", href: "/loan/reports/customer" },
      { name: "Customer History Report", href: "/loan/reports/customer-history-report" },
      { name: "CAF Report", href: "/loan/reports/caf" },
      { name: "PD Report", href: "/loan/reports/pd" },
      { name: "CAM Report", href: "/loan/reports/cam" },
      { name: "Disbursement Report", href: "/loan/reports/disbursement" },
      { name: "Loan Report", href: "/loan/reports/loans" },
      { name: "EMI Report", href: "/loan/reports/emis" },
      { name: "EMI Collection Report", href: "/loan/reports/emis-collection" },
    ]
  },
  { name: "Product Inquiries", href: "/loan/loans/inquiries", icon: Bell, permission: "read_loan_product_inquiries" },
  { name: "EMI Payments", href: "/loan/emiPayments", icon: Landmark, permission: "read_loan_emi_payments" },
  {
    name: "Agreement Docs", icon: FileText, permission: "read_loan_agreement_docs", children: [
      // { name: "Credit Agreement (Hypo)", href: "/loan/credit-agreement" },
      { name: "Credit Agreement (Facil)", href: "/loan/facilitator-agreement" },
      { name: "DPN & Declaration", href: "/loan/dpn" },
      { name: "Product Finance Agreement (single)", href: "/loan/Product-finanace-single-product" },
      { name: "Product Finance Agreement (multiple)", href: "/loan/Product-finanace-mul-product" },
      { name: "Hypothecated Purchase Agreement", href: "/loan/hypothecated-purchase-agreement" },
    ]
  },
  // Investor 
  { name: "Investor Dashboard", href: "/loan/investor-panel/dashboard", icon: LayoutDashboard, permission: "read_loan_investor_dashboard" },

  { name: "Investor Money Pool Master", href: "/loan/investor-money-pool", icon: LayoutDashboard, permission: "read_loan_investor_pool_master" },

  { name: "Investor Type Master", href: "/loan/investor-type", icon: LayoutDashboard, permission: "read_loan_investor_pool_type_master" },

  { name: "Investor Details", href: "/loan/investor-basic-info", icon: LayoutDashboard, permission: "read_loan_investor_basic_info" },

  { name: "Investor Panel", href: "/loan/investor-panel", icon: LayoutDashboard, permission: "read_loan_investors" },

  { name: "Redemption Requests", href: "/loan/investor-panel/weekly-redemptions", icon: LayoutDashboard, permission: "read_loan_investor_redemption_requests" },

  { name: "Investment Calculator", href: "/loan/investor-Investment-calculator", icon: LayoutDashboard, permission: "read_investor_investment_calculator" },


  // HRMS Admin
  { name: "Dashboard", href: "/hrms/dashboard", icon: LayoutDashboard, permission: "read_hrms_dashboard" },
  {
    name: "Master Setup", icon: Settings, permission: "read_hrms_master_setup", children: [
      { name: "Departments", href: "/hrms/departments" },
      { name: "Designations", href: "/hrms/designations" },
      { name: "Public Holidays", href: "/hrms/holidays" },
      { name: "Leave Types", href: "/hrms/leaves/types" },
    ]
  },
  {
    name: "Staff Management", icon: Users, permission: "read_hrms_staff_management", children: [
      { name: "Employees List", href: "/hrms/employees" },
      { name: "Add New Staff", href: "/hrms/employees/create" },
      { name: "Attendance Log", href: "/hrms/attendance" },
      { name: "Attendance Report", href: "/hrms/attendance/report" },
    ]
  },
  {
    name: "Leave Management", icon: Calendar, permission: "read_hrms_leave_management", children: [
      { name: "Leave Requests", href: "/hrms/leaves" },
      { name: "Apply Leave", href: "/hrms/leaves/request" },
    ]
  },
  {
    name: "Payroll & Salary", icon: Banknote, permission: "read_hrms_payroll", children: [
      { name: "Process Payouts", href: "/hrms/payroll" },
      { name: "Salary Structures", href: "/hrms/salaries/structures" },
      { name: "Payroll Reports", href: "/hrms/payroll/reports" },
    ]
  },
  // HRMS Employee
  { name: "Dashboard", href: "/hrms/dashboard", icon: LayoutDashboard, permission: "read_hrms_employee_dashboard" },
  { name: "My Profile", href: "/hrms/profile", icon: User, permission: "read_hrms_my_profile" },
  { name: "My Attendance", href: "/hrms/attendance", icon: UserCheck, permission: "read_hrms_my_attendance" },
  { name: "My Leaves", href: "/hrms/leaves/request", icon: Calendar, permission: "read_hrms_my_leaves" },
  { name: "My Salary & Slips", href: "/hrms/my-payroll", icon: Banknote, permission: "read_hrms_my_salary" },

  // Finance & Accountant
  { name: "Finance Dashboard", href: "/finance/dashboard", icon: Calculator, permission: "read_finance_dashboard" },
  {
    name: "Transactions", icon: TrendingUp, permission: "read_finance_transactions", children: [
      { name: "All Transactions", href: "/finance/transactions" },
      { name: "Add Transaction", href: "/finance/transactions/add" },
    ]
  },
  {
    name: "Cash Book", icon: BookOpen, permission: "read_finance_cash_book", children: [
      { name: "Today Summary", href: "/finance/cash-book/today" },
      { name: "Cash Book Entries", href: "/finance/cash-book" },
      { name: "Add Entry", href: "/finance/cash-book/add" },
    ]
  },

  // Inventory
  { name: "Dashboard", href: "/inventory/dashboard", icon: LayoutDashboard, permission: "read_inventory_dashboard" },
  {
    name: "Master Data", icon: Wallet, permission: "read_inventory_master", children: [
      { name: "Vendor Master", href: "/inventory/master/vendor" },
      { name: "Unit Master", href: "/inventory/master/unit" },
      { name: "Category Master", href: "/inventory/master/category" },
      { name: "Brand Master", href: "/inventory/master/brand" },
      { name: "Attribute Master", href: "/inventory/master/attribute" },
      { name: "Product Master", href: "/inventory/master/product" },
      // { name: "Loan Product API", href: "/inventory/master/loan-product-catalog" },
      // { name: "Loan Product Orders", href: "/inventory/master/loan-product-orders" },
    ]
  },
  {
    name: "Purchase Products", icon: Bell, permission: "read_inventory_purchase", children: [
      { name: "Add Product", href: "/inventory/products/add" },
      { name: "Product List", href: "/inventory/products/list" },
    ]
  },
  {
    name: "Sell Products", icon: Bell, permission: "read_inventory_sell", children: [
      { name: "Sell Product", href: "/inventory/orders/add" },
      { name: "Order List", href: "/inventory/orders/list" },
      { name: "Loan Product Orders", href: "/inventory/loan-product-orders/list" },
    ]
  },
  {
    name: "Advance Booking", icon: Bell, permission: "read_inventory_sell", children: [
      { name: "Advance Booking", href: "/inventory/advance-booking/add" },
      { name: "Advance Booking List", href: "/inventory/advance-booking/list" },
    ]
  },
  {
    name: "Reports", icon: BarChart3, permission: "read_inventory_reports", children: [
      { name: "Vendor Purchases", href: "/inventory/reports/vendor-purchases" },
      { name: "Sales Analysis", href: "/inventory/reports/sales-analysis" },
      { name: "Stock Inventory", href: "/inventory/reports/stock-inventory" },
    ]
  },
];

/* ─── resolve nav purely from permissions ─────────────────── */
function resolveNav(permissions: Set<string>, userType: string): NavItem[] {
  if (userType === 'employee') {
    return allNavItems.filter(
      (item) => permissions.has(item.permission) &&
        ['read_hrms_employee_dashboard', 'read_hrms_my_profile', 'read_hrms_my_attendance', 'read_hrms_my_leaves', 'read_hrms_my_salary'].includes(item.permission)
    );
  }
  if (userType === 'finance' || userType === 'accountant') {
    return allNavItems.filter((item) => item.permission.startsWith('read_finance'));
  }

  // Check if user has ANY finance permission
  const hasFinanceAccess = Array.from(permissions).some(p => p.startsWith('read_finance'));

  return allNavItems.filter((item) => {
    // If they have access to dashboard or transactions, also show cash book
    if (hasFinanceAccess && item.permission.startsWith('read_finance')) return true;
    return permissions.has(item.permission);
  });
}

/* ─── component ──────────────────────────────────────────────── */
type Props = { isOpen: boolean; setIsOpen: (v: boolean) => void; isCollapsed: boolean };

export default function AppSidebar({ isOpen, setIsOpen, isCollapsed }: Props) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [sectionLabel, setSectionLabel] = useState("Panel");

  useEffect(() => {
    const load = () => {
      const permissions = getPermissions();
      const userType = localStorage.getItem('user_type') || '';
      const items = resolveNav(permissions, userType);

      // Determine role (some setups store role separately)
      // const role = (localStorage.getItem('role') || '').toLowerCase();

      // console.log("role-------------->:", role);

      // Group nav items by module so each module becomes its own top-level dropdown
      let finalItems: NavItem[] = items;
      {
        const moduleMap = [
          { key: 'admin', label: 'Admin', icon: LayoutDashboard, match: (it: NavItem) => it.permission.startsWith('read_admin') || (it.href || '').startsWith('/admin') },
          { key: 'loan', label: 'Loan', icon: Wallet, match: (it: NavItem) => it.permission.startsWith('read_loan') || (it.href || '').startsWith('/loan') },
          { key: 'investor', label: 'Investor', icon: Users, match: (it: NavItem) => it.permission.includes('investor') || (it.href || '').includes('/investor') },
          { key: 'hrms', label: 'HRMS', icon: Settings, match: (it: NavItem) => it.permission.startsWith('read_hrms') || (it.href || '').startsWith('/hrms') },
          { key: 'inventory', label: 'Inventory', icon: Wallet, match: (it: NavItem) => it.permission.startsWith('read_inventory') || (it.href || '').startsWith('/inventory') },
          { key: 'finance', label: 'Finance', icon: Calculator, match: (it: NavItem) => it.permission.startsWith('read_finance') || (it.href || '').startsWith('/finance') },
        ];

        const groups: NavItem[] = [];
        const used = new Set<NavItem>();

        // Determine module key deterministically from href or permission
        const getModuleKey = (it: NavItem) => {
          const href = (it.href || "").toLowerCase();
          const perm = (it.permission || "").toLowerCase();
          if (href.startsWith('/admin') || perm.startsWith('read_admin')) return 'admin';
          if (href.startsWith('/loan') || perm.startsWith('read_loan')) return 'loan';
          if (href.includes('/investor') || perm.includes('investor')) return 'investor';
          if (href.startsWith('/hrms') || perm.startsWith('read_hrms')) return 'hrms';
          if (href.startsWith('/inventory') || perm.startsWith('read_inventory')) return 'inventory';
          if (href.startsWith('/finance') || perm.startsWith('read_finance')) return 'finance';
          return null;
        };

        moduleMap.forEach((m) => {
          const matches = items.filter((it) => getModuleKey(it) === m.key);
          if (matches.length) {
            const children: any[] = [];
            matches.forEach((it) => {
              // Preserve nested items with their own children (so nested dropdowns work)
              if (it.children && it.children.length) {
                children.push({ name: it.name, children: it.children });
              } else if (it.href) {
                children.push({ name: it.name, href: it.href });
              }
              used.add(it);
            });

            groups.push({ name: m.label, icon: m.icon, permission: `group_${m.key}`, children });
          }
        });

        const leftovers = items.filter((it) => !Array.from(used).includes(it));
        // Use grouped view if any groups were created, otherwise keep original items
        finalItems = groups.length ? [...groups, ...leftovers] : items;
      }



      // Determine role safely
      const userData = JSON.parse(
        localStorage.getItem("user") ||
        localStorage.getItem("userData") ||
        "{}"
      );

      const role = (
        localStorage.getItem("role") ||
        userData?.role ||
        ""
      ).toLowerCase();

      console.log("role-------------->:", role);
      console.log("userData-------------->:", userData);


      // console.log("role-------------->:", role);
      const label = role === 'super_admin' ? 'Super Admin'
        : role === 'cms_admin' ? 'CMS Admin'
          : userType === 'employee' ? 'Employee'
            : userType === 'finance' ? 'Finance'
              : finalItems[0]?.permission.startsWith("read_admin") ? (permissions.has("read_admin_subscription") ? "Super Admin" : "CMS Admin")
                : finalItems[0]?.permission.startsWith("read_loan") ? "Loan"
                  : finalItems[0]?.permission.startsWith("read_hrms") ? "HRMS"
                    : finalItems[0]?.permission.startsWith("read_inventory") ? "Inventory"
                      : finalItems[0]?.permission.startsWith("read_finance") ? "Finance"
                        : "Anavran Panel";

      setNavItems(finalItems);
      setSectionLabel(label);
    };

    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [pathname]);

  // manage open state keys for nested dropdowns
  useEffect(() => {
    // Helper to check active path recursively
    const hasActiveChild = (item: any): boolean => {
      if (!item) return false;
      if (item.href && (pathname === item.href || pathname.startsWith(item.href + "/"))) return true;
      if (!item.children) return false;
      return item.children.some((c: any) => hasActiveChild(c));
    };

    // If any item has an active child, open its ancestor chain
    const newOpen = new Set<string>();
    const traverse = (items: any[], prefix = "") => {
      items.forEach((it) => {
        const key = prefix ? `${prefix}/${it.name}` : it.name;
        if (hasActiveChild(it)) {
          newOpen.add(key);
        }
        if (it.children) traverse(it.children, key);
      });
    };

    traverse(navItems);

    // If nothing active, open the first module with children by default
    if (newOpen.size === 0 && navItems.length > 0) {
      const firstWithChildren = navItems.find((i) => i.children && i.children.length > 0);
      if (firstWithChildren) newOpen.add(firstWithChildren.name);
    }

    setOpenKeys(newOpen);
  }, [navItems, pathname]);

  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
    localStorage.clear();
    window.location.href = "/auth/signin";
  };

  return (
    <>
      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" />
      )}

      <aside
        className={cn(
          "fixed inset-0 h-screen bg-[#0232B5] text-white flex flex-col shadow-xl z-50 transform transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-64 md:translate-x-0 md:inset-auto md:top-0 md:left-0"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "border-b border-white/20 flex items-center",
          isCollapsed ? "justify-center px-2 py-5" : "justify-center p-5"
        )}>
          <span className={cn("text-xl font-bold text-center tracking-wide", isCollapsed && "hidden")}>
            {sectionLabel}
          </span>
          {isCollapsed && <LayoutDashboard size={22} />}
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-3 overflow-y-auto px-2 sidebar-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;

            const renderChildren = (children: any[], parentKey = "") => {
              return children.map((sub: any) => {
                const key = parentKey ? `${parentKey}/${sub.name}` : sub.name;
                const hasChildren = !!(sub.children && sub.children.length > 0);
                const isExpanded = openKeys.has(key);
                const isActive = pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/")) || (hasChildren && sub.children.some((c: any) => pathname.startsWith(c.href || "")));

                if (hasChildren) {
                  return (
                    <div key={key}>
                      <button
                        onClick={() => {
                          setOpenKeys((prev) => {
                            const next = new Set(prev);

                            if (next.has(key)) {
                              next.delete(key);
                            } else {
                              next.add(key);
                            }

                            return next;
                          });
                        }}
                        className={cn(
                          "flex items-center justify-between w-full gap-3 rounded-sm px-3 py-3 text-sm transition-all",
                          isCollapsed && "md:justify-center md:px-2",
                          isActive ? "bg-white text-blue-700 font-medium" : "text-blue-100 hover:bg-blue-600/70 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(isCollapsed && "hidden")}>{sub.name}</span>
                        </div>
                        {!isCollapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                      </button>

                      <div className={cn(
                        "overflow-hidden transition-all duration-300 ml-4 mt-1 flex flex-col gap-1 border-l border-blue-400/30 pl-2",
                        isCollapsed && "hidden",
                        isExpanded ? "max-h-[2000px]" : "max-h-0"
                      )}>
                        {renderChildren(sub.children, key)}
                      </div>
                    </div>
                  );
                }

                // simple link
                const isSubActive = pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/"));
                return (
                  <ReloadLink
                    key={sub.href ?? key}
                    href={sub.href ?? "#"}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex w-full items-center rounded-sm px-3 py-2.5 text-sm leading-5 transition-all whitespace-normal break-words",
                      isSubActive ? "text-white font-medium bg-blue-600/50" : "text-blue-100/80 hover:text-white hover:bg-blue-600/30"
                    )}
                  >
                    {sub.name}
                  </ReloadLink>
                );
              });
            };

            if (item.children) {
              const key = item.name;
              const isExpanded = openKeys.has(key);
              const isChildActive = (() => {
                const hasActive = (it: any): boolean => {
                  if (it.href && (pathname === it.href || pathname.startsWith(it.href + "/"))) return true;
                  if (!it.children) return false;
                  return it.children.some((c: any) => hasActive(c));
                };
                return hasActive(item);
              })();

              return (
                <div key={item.name}>
                  <button
                    onClick={() => {
                      setOpenKeys((prev) => {
                        const next = new Set(prev);

                        if (next.has(key)) {
                          next.delete(key);
                        } else {
                          next.add(key);
                        }

                        return next;
                      });
                    }}
                    className={cn(
                      "flex items-center justify-between w-full gap-3 rounded-sm px-3 py-3 text-sm transition-all",
                      isCollapsed && "md:justify-center md:px-2",
                      isChildActive ? "bg-white text-blue-700 font-medium" : "text-blue-100 hover:bg-blue-600/70 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span className={cn(isCollapsed && "hidden")}>{item.name}</span>
                    </div>
                    {!isCollapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ml-4 mt-1 flex flex-col gap-1 border-l border-blue-400/30 pl-2",
                    isCollapsed && "hidden",
                    isExpanded ? "max-h-[2000px]" : "max-h-0"
                  )}>
                    {renderChildren(item.children, key)}
                  </div>
                </div>
              );
            }

            const isActive = item.href === "/loan/investor-panel"
              ? pathname === item.href
              : pathname === item.href || (item.href && pathname.startsWith(item.href + "/"));

            return (
              <ReloadLink
                key={`${item.permission}-${item.href ?? item.name}`}
                href={item.href!}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-3 text-sm transition-all",
                  isCollapsed && "md:justify-center md:px-2",
                  isActive
                    ? "bg-white text-blue-700 font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-600/70 hover:text-white"
                )}
              >
                <Icon size={18} />
                <span className={cn(isCollapsed && "hidden")}>{item.name}</span>
              </ReloadLink>
            );
          })}
        </nav>

        {/* Logout */}
        {/* <button
          onClick={() => setShowConfirm(true)}
          className="m-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-sm font-medium transition"
        >
          {isCollapsed ? "↩" : "Logout"}
        </button> */}
      </aside>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
