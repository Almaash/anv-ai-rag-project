"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ReloadLink from "../ReloadLink";
import {
  LayoutDashboard,
  Percent,
  BadgeIndianRupee,
  Users,
  FileText,
  ClipboardList,
  Wallet,
  Landmark,
  CreditCard,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
  CheckCircle,
  Package,
} from "lucide-react";

type SidebarSubItem = {
  name: string;
  href: string;
};

type SidebarLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  isDropdown?: boolean;
  subItems?: SidebarSubItem[];
};

type LoanSidebarProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  isCollapsed: boolean;
};

const parseStoredPermissions = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const permissionString = localStorage.getItem("permissions");
    if (!permissionString) return [];

    const parsedPermissions = JSON.parse(permissionString);
    return Array.isArray(parsedPermissions) ? parsedPermissions : [];
  } catch {
    return [];
  }
};

const parseStoredUserRole = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const userString = localStorage.getItem("user") || localStorage.getItem("customer");
    if (!userString) return null;

    const user = JSON.parse(userString) as { role?: string };
    return user.role || "customer";
  } catch {
    return null;
  }
};

export default function LoanSidebar({
  isOpen,
  setIsOpen,
  isCollapsed,
}: LoanSidebarProps) {
  const pathname = usePathname();
  const [showConfirm, setShowConfirm] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const permissions = useMemo(() => parseStoredPermissions(), []);
  const userRole = useMemo(() => parseStoredUserRole(), []);

  /* ============================
     NAVIGATION CONFIG
  ============================ */
  const navLinks: SidebarLink[] = [
    {
      name: "Dashboard",
      href: "/loan/dashboard",
      permission: "read_loan_dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Intrest Master",
      href: "/loan/intrestMaster",
      permission: "read_loan_intrest_master",
      icon: Percent,
    },
    {
      name: "Fee Master",
      href: "/loan/feeMaster",
      permission: "read_loan_fee_master",
      icon: BadgeIndianRupee,
    },
    {
      name: "Field Executives",
      href: "/loan/agents",
      permission: "read_loan_field_executives",
      icon: Users,
    },
    {
      name: "Customers",
      href: "/loan/customers",
      permission: "read_loan_customers",
      icon: Users,
    },
    {
      name: "Customer Verification",
      href: "/loan/customerVerification",
      permission:
        "read_loan_customer_verification",
      icon: Users,
    },
    {
      name: "CAF Details",
      href: "/loan/caf",
      permission: "read_loan_caf_details",
      icon: FileText,
    },
    {
      name: "CAF Verification",
      href: "/loan/cafVerification",
      permission: "read_loan_caf_verification",
      icon: FileText,
    },
    {
      name: "PD Information",
      href: "/loan/pd",
      permission: "read_loan_pd_information",
      icon: FileText,
    },
    {
      name: "CAM",
      href: "/loan/cam",
      permission: "read_loan_cam",
      icon: FileText,
    },
    {
      name: "CAM Verification",
      href: "/loan/cam/camVerificationListing",
      permission: "read_loan_cam_verification",
      icon: CheckCircle,
    },
    {
      name: "Products",
      href: "/loan/products",
      permission: "read_loan_products",
      icon: Package,
    },
    {
      name: "Disbursement",
      href: "#disbursement",
      permission: "read_loan_disbursement",
      icon: Wallet,
      isDropdown: true,
      subItems: [
        {
          name: "Disbursement Panel",
          href: "/loan/disbursement/panel",
        },
        {
          name: "Final Disbursement",
          href: "/loan/disbursement/final",
        },
        {
          name: "Payment Inventory",
          href: "/loan/disbursement/payment-inventory",
        },
      ],
    },
    {
      name: "Start Loans",
      href: "/loan/loans/allLoans",
      permission:
        "read_loan_start_loan",
      icon: Landmark,
    },
    {
      name: "EMI Payments",
      href: "/loan/emiPayments",
      permission: "read_loan_emi_payments",
      icon: Landmark,
    },
    {
      name: "Reports",
      href: "/loan/reports",
      permission: "read_loan_reports",
      icon: FileText,
    },
    {
      name: "Agreement Docs",
      href: "#agreement",
      permission: "read_loan_agreement_docs",
      icon: FileText,
      isDropdown: true,
      subItems: [
        {
          name: "Credit Agreement (Hypo)",
          href: "/loan/credit-agreement",
        },
        {
          name: "Credit Hypoth (Multi Prod)",
          href: "/loan/credit-hypothecation-multiple-product",
        },
        {
          name: "Credit Agreement (Facil)",
          href: "/loan/facilitator-agreement",
        },
        {
          name: "DPN & Declaration",
          href: "/loan/dpn",
        },
      ],
    },
  ];


  const customerLinks: SidebarLink[] = [
    // {
    //   name: "Dashboard",
    //   href: "/loan/dashboard",
    //   icon: LayoutDashboard,
    // },
    // {
    //   name: "Loan Applications",
    //   href: "/loan/loanApplications",
    //   icon: FileText,
    // },
    // {
    //   name: "Apply Loans",
    //   href: "/loan/loans/allLoans",
    //   icon: Landmark,
    // },
    // {
    //   name: "Agreement Docs",
    //   href: "#agreement-cust",
    //   icon: FileText,
    //   isDropdown: true,
    //   subItems: [
    //     {
    //       name: "Credit Agreement (Hypo)",
    //       href: "/loan/credit-agreement",
    //     },
    //     {
    //       name: "Credit Agreement (Facil)",
    //       href: "/loan/facilitator-agreement",
    //     },
    //     {
    //       name: "DPN & Declaration",
    //       href: "/loan/dpn",
    //     },
    //   ],
    // },

  ];
  /* ============================
     FILTER MENU
  ============================ */
  const permissionSet = new Set(permissions);

  const allowedLinks: SidebarLink[] =
    userRole === "customer"
      ? customerLinks
      : navLinks.filter((link) => link.permission && permissionSet.has(link.permission));

  /* ============================
     LOGOUT
  ============================ */
  const handleLogout = () => {
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name =
        eqPos > -1
          ? cookie.substring(0, eqPos).trim()
          : cookie.trim();

      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });

    localStorage.clear();
    window.location.href = "/auth/signin";
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-0 h-screen bg-[#0232B5] text-white flex flex-col shadow-xl z-50 transform transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-64 md:translate-x-0 md:inset-auto md:top-0 md:left-0"
        )}
      >
        <div className={cn(
          "border-b border-[#0232B5] flex items-center",
          isCollapsed ? "justify-center px-2 py-5" : "justify-center p-5"
        )}>
          <div className={cn("text-2xl font-bold text-center", isCollapsed && "hidden")}>
            Loan Panel
          </div>
        </div>

        <nav
          className="flex-1 mt-3 overflow-y-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {allowedLinks.map((link) => {
            if (link.isDropdown && link.subItems) {
              const isChildActive = link.subItems.some((sub) => pathname === sub.href);
              const isCurrentlyOpen = openDropdown === link.name || isChildActive;

              return (
                <div key={link.name}>
                  <button
                    onClick={() =>
                      setOpenDropdown((prev) => (prev === link.name ? null : link.name))
                    }
                    className={cn(
                      "flex items-center justify-between w-full gap-3 rounded-sm px-3 py-3 text-sm transition-all duration-200",
                      isCollapsed && "md:justify-center md:px-2",
                      isChildActive ? "bg-white text-blue-700 font-medium" : "text-blue-100 hover:bg-blue-600/70 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <link.icon size={18} />
                      <span className={cn(isCollapsed && "hidden")}>{link.name}</span>
                    </div>
                    {!isCollapsed && (isCurrentlyOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ml-4 mt-1 flex flex-col gap-1 border-l border-blue-400/30 pl-2",
                    isCollapsed && "hidden",
                    isCurrentlyOpen ? "max-h-60" : "max-h-0"
                  )}>
                    {link.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <ReloadLink
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex w-full items-center rounded-sm px-3 py-2.5 text-sm leading-5 transition-all duration-200 whitespace-normal break-words",
                            isSubActive ? "text-white font-bold bg-blue-600/50" : "text-blue-100/80 hover:text-white hover:bg-blue-600/30"
                          )}
                        >
                          {sub.name}
                        </ReloadLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isActive =
              pathname === link.href ||
              (pathname.startsWith(link.href + "/") &&
                link.href !== "/loan/loanApplications");
            const Icon = link.icon;

            return (
              <ReloadLink
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-3 text-sm transition-all duration-200",
                  isCollapsed && "md:justify-center md:px-2",
                  !isActive &&
                  "text-blue-100 hover:bg-blue-600/70 hover:text-white",

                  isActive &&
                  "bg-white text-blue-700 font-medium shadow-sm"
                )}
              >
                <Icon size={18} />
                <span className={cn(isCollapsed && "hidden")}>{link.name}</span>
              </ReloadLink>
            );
          })}
        </nav>

        {/* <button
          onClick={() => setShowConfirm(true)}
          className="m-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-4 rounded-md hover:text-white transition"
        >
          Logout
        </button> */}
      </aside>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Logout"
        message="Are you sure?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
