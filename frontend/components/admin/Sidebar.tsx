// "use client";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { ChevronUp, ChevronDown } from "lucide-react";
// import { cn } from "@/lib/utils";
// import ConfirmDialog from "@/components/common/ConfirmDialog";
// import ReloadLink from "../ReloadLink";

// export default function Sidebar({ isOpen, setIsOpen }: any) {
//   const pathname = usePathname();
//   const [openDropdown, setOpenDropdown] = useState<string | null>(null);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [user, setUser] = useState<any>(null);

//   useEffect(() => {
//     const storedUser = localStorage.getItem("user");

//     if (storedUser) {
//       setUser(JSON.parse(storedUser));
//     }
//   }, []);

//   const toggleDropdown = (name: string) => {
//     setOpenDropdown(openDropdown === name ? null : name);
//   };

//   const handleLogout = () => {
//     document.cookie.split(";").forEach((cookie) => {
//       const eqPos = cookie.indexOf("=");
//       const name =
//         eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
//       document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
//     });

//     localStorage.clear();
//     window.location.href = "/auth/signin";
//   };

//   /* ===== STATIC MENU ===== */

//   const navLinks = [
//     {
//       name: "Dashboard (S)",
//       href: "/admin/dashboard",
//       roles: ["super_admin","cms_admin"],
//     },
//     {
//       name: "Subscription (S)",
//       href: "/admin/subscription",
//       roles: ["super_admin"],
//     },

//     // {
//     //   name: "Departments",
//     //   href: "/admin/departments",
//     //   roles: ["super_admin"],
//     // },
//     {
//       name: "Branch (S)",
//       href: "/admin/branch",
//       roles: ["super_admin",],
//     },
//     {
//       name: "Modules (S)",
//       href: "/admin/modules",
//       roles: ["super_admin"],
//     },
//     {
//       name: "Manage Role",
//       href: "/admin/roles",
//       roles: [ "cms_admin"],
//     },
//     {
//       name: "Manage Users",
//       href: "/admin/users",
//       roles: ["super_admin", "cms_admin"],
//     },
//     {
//       name: "Manage Field Executive",
//       href: "/admin/field-executive",
//       roles: ["cms_admin"],
//     },
//   ];

//   return (
//     <>
//       {/* Overlay (mobile only) */}
//       {isOpen && (
//         <div
//           onClick={() => setIsOpen(false)}
//           className="fixed inset-0 bg-black/40 z-40 md:hidden"
//         />
//       )}

//       <aside
//         className={cn(
//           "fixed inset-0 h-screen w-64 bg-[#0232B5] text-white flex flex-col shadow-xl z-50 transform transition-transform duration-300",
//           isOpen ? "translate-x-0" : "-translate-x-full",
//           "md:translate-x-0 md:inset-auto md:top-0 md:left-0"
//         )}
//       >
//         <div className="p-5 text-2xl font-bold text-center border-b border-blue-600">
//           Anavran Panel
//         </div>

//         {/* ===== MENU ===== */}
//         <nav className="flex-1 mt-4 overflow-y-auto scrollbar-hide">
//           {navLinks
//             .filter((link) => {
//               if (!user) return false;
//               return link.roles.includes(user.role);
//             })
//             .map((link: any) => {
//               if (!link.items) {
//                 return (
//                   <ReloadLink
//                     key={link.href}
//                     href={link.href}
//                     onClick={() => setIsOpen(false)}
//                     className={cn(
//                       "block px-6 py-3 hover:bg-blue-600 hover:text-white",
//                       pathname === link.href && "bg-blue-600 font-semibold"
//                     )}
//                   >
//                     {link.name}
//                   </ReloadLink>
//                 );
//               }

//               return (
//                 <div key={link.name}>
//                   <button
//                     onClick={() => toggleDropdown(link.name)}
//                     className="w-full flex justify-between px-6 py-3 hover:bg-blue-600 hover:text-white"
//                   >
//                     {link.name}
//                     {openDropdown === link.name ? <ChevronUp /> : <ChevronDown />}
//                   </button>

//                   {openDropdown === link.name && (
//                     <div className="ml-4 border-l border-blue-500 pl-4">
//                       {link.items.map((sub: any) => (
//                         <Link
//                           key={sub.href}
//                           href={sub.href}
//                           onClick={() => setIsOpen(false)}
//                           className={cn(
//                             "block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white",
//                             pathname === sub.href &&
//                             "bg-blue-600 font-semibold"
//                           )}
//                         >
//                           {sub.name}
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//         </nav>

//         {/* ===== LOGOUT ===== */}
//         <button
//           onClick={() => setShowConfirm(true)}
//           className="m-4 py-2.5 bg-blue-600 rounded-md hover:bg-blue-500"
//         >
//           Logout
//         </button>
//       </aside>

//       <ConfirmDialog
//         isOpen={showConfirm}
//         title="Confirm Logout"
//         message="Are you sure?"
//         confirmText="Yes, Logout"
//         cancelText="Cancel"
//         onConfirm={handleLogout}
//         onCancel={() => setShowConfirm(false)}
//       />
//     </>
//   );
// }
