import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Mic, Inbox, MessageSquare, Truck, Boxes, Warehouse, BarChart3, LogOut, HardHat
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/intake", label: "Voice Intake", icon: Mic },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { to: "/vendors", label: "Vendors", icon: Truck },
  { to: "/purchase-orders", label: "Purchase Orders", icon: Boxes },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-white text-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-gray-200 bg-gray-50/50 flex flex-col" data-testid="app-sidebar">
        <div className="px-5 py-5 border-b border-gray-200 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 grid place-items-center rounded-sm">
            <HardHat className="w-4 h-4 text-[#FF4500]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black tracking-tight text-[15px] leading-none">CONSTRUCT<span className="text-[#FF4500]">.</span>PROCURE</div>
            <div className="label-mono mt-1">AI · PROCUREMENT · OS</div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 stagger">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-sm bg-gray-900 text-white grid place-items-center font-display font-bold text-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-gray-500 truncate">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-300 hover:bg-gray-900 hover:text-white transition-colors rounded-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
