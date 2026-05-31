import { NavLink, useNavigate } from "react-router-dom";
import {
  CaretDown,
  ChartBar,
  ChefHat,
  GearSix,
  ListChecks,
  SlidersHorizontal,
  SignOut,
  SquaresFour,
  UserCircle,
  UsersThree,
  ForkKnife,
  List,
} from "@phosphor-icons/react";
import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { ROLES } from "../utils/permissions";

const menuItems = [
  { path: "/admin/dashboard", label: "Tổng quan", icon: SquaresFour },
  { path: "/admin/menu", label: "Thực đơn", icon: ForkKnife },
  { path: "/admin/warehouse", label: "Kho hàng", icon: ChefHat },
  { path: "/admin/reports", label: "Báo cáo", icon: ChartBar },
  { path: "/admin/settings", label: "Cài đặt", icon: GearSix },
  { path: "/admin/staff", label: "Nhân sự", icon: UsersThree },
  { path: "/admin/tables", label: "Bàn", icon: UsersThree },
  { path: "/admin/customers", label: "Khách hàng", icon: UsersThree },
];

const kitchenItems = [
  { path: "/kitchen/orders", label: "Order bếp", icon: ListChecks },
  { path: "/kitchen/menu", label: "Thực đơn", icon: ForkKnife },
  { path: "/kitchen/warehouse", label: "Kho hàng", icon: ChefHat },
];

const staffItems = [
  { path: "/staff/tables", label: "Order món", icon: ForkKnife }, 
  { path: "/staff/sales", label: "Quản lý bán hàng", icon: ListChecks },
  { path: "/staff/customers", label: "Khách hàng", icon: UsersThree }
];

const roleMenuItems = {
  [ROLES.ADMIN]: menuItems,
  [ROLES.STAFF]: staffItems,
  [ROLES.KITCHEN]: kitchenItems,
};

const roleLabels = {
  [ROLES.ADMIN]: "Quản trị viên",
  [ROLES.STAFF]: "Phục vụ",
  [ROLES.KITCHEN]: "Bếp",
};



export default function Sidebar({ isCollapsed, onToggle }) {
  const navigate = useNavigate();
  const { user, roleId } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const displayName = user.full_name || "Admin";
  const visibleItems = roleMenuItems[roleId] || menuItems;
  const roleLabel = roleLabels[roleId] || "Nhân sự";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className={`sticky top-0 flex h-screen ${isCollapsed ? "w-[72px]" : "w-[228px]"} shrink-0 flex-col border-r border-slate-200/80 bg-[#f9faf4] transition-all duration-300 overflow-hidden`}>
      {/* Slide Toggle Header */}
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-4 py-3 border-b border-slate-200/40 shrink-0`}>
        {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">WOW RESTAURANT</span>}
        <button 
          type="button" 
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors focus:outline-none"
          title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          <List size={18} weight="bold" />
        </button>
      </div>

      {/* Account Info */}
      <div className="relative border-b border-slate-200/80 p-3 shrink-0">
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          className={`flex w-full items-center ${isCollapsed ? "justify-center" : "gap-2.5"} rounded-2xl border border-slate-200 bg-white ${isCollapsed ? "p-1.5" : "px-2.5 py-2.5"} text-left shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold">
            {displayName ? (
              <span className="text-sm font-semibold">{displayName.charAt(0).toUpperCase()}</span>
            ) : (
              <UserCircle size={22} weight="duotone" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-slate-900">{displayName}</p>
                <p className="text-xs font-semibold text-slate-400">
                  {roleLabel}
                </p>
              </div>
              <CaretDown
                size={14}
                className={`text-slate-400 transition-transform shrink-0 ${accountOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {accountOpen && (
          <div
            role="menu"
            className={`absolute ${isCollapsed ? "left-14 w-36" : "left-3 right-3"} top-[64px] z-20 rounded-xl border border-slate-200 bg-white p-1 shadow-xl`}
          >
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-red-500 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <SignOut size={16} />
              {!isCollapsed && "Đăng xuất"}
            </button>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className={`flex-1 space-y-1 ${isCollapsed ? "p-1.5" : "p-3"} overflow-y-auto`}>
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setAccountOpen(false)}
              className={({ isActive }) =>
                `flex min-h-10 items-center ${isCollapsed ? "justify-center" : "gap-2.5"} rounded-xl ${isCollapsed ? "px-1.5" : "px-3"} text-[13px] transition-colors ${
                  isActive
                    ? "bg-emerald-700 font-black text-white shadow-[0_12px_24px_rgba(4,120,87,0.18)]"
                    : "font-bold text-slate-500 hover:bg-white hover:text-slate-950"
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} weight="duotone" className="shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

      </nav>
    </aside>
  );
}
