import React, { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  Database,
  LayoutDashboard,
  Package,
  Gift,
  History,
  RefreshCw,
  ShieldCheck,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: "系统概览", path: "/dashboard", icon: LayoutDashboard },
  { name: "货品主数据", path: "/products", icon: Package },
  { name: "促销机制", path: "/mechanisms", icon: Gift },
  { name: "变更审计", path: "/change-logs", icon: History },
  { name: "同步中枢", path: "/sync", icon: RefreshCw, adminOnly: true },
  { name: "数据治理", path: "/quality", icon: ShieldCheck },
  { name: "基础配置", path: "/settings", icon: Settings, adminOnly: true },
];

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const currentNav = navItems.find((item) =>
    location.pathname.startsWith(item.path)
  ) || navItems[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide text-white">主数据管理平台</div>
            <div className="text-[11px] text-blue-400 font-mono tracking-wider">ONE-SOURCE MDM</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            核心功能域
          </div>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto text-blue-200" />}
              </Link>
            );
          })}
        </nav>

        {/* Environment & Version Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500">运行环境</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              Dev (SQLite)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">系统版本</span>
            <span className="font-mono text-slate-400 text-[11px]">v1.0.0 (P0)</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="hidden sm:inline">主数据中心</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-medium text-slate-900">{currentNav?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Open API link */}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Swagger 文档</span>
            </a>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-xs">
                {user?.username.slice(0, 2).toUpperCase() || <UserIcon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-slate-800">{user?.username}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {user?.role === "admin" ? "系统管理员" : "业务运营"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="退出登录"
                className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-64 h-full bg-slate-900 text-slate-100 p-4 space-y-2 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-12 flex items-center gap-3 border-b border-slate-800 pb-3">
                <Database className="w-6 h-6 text-blue-500" />
                <span className="font-semibold text-white">主数据管理平台</span>
              </div>
              <nav className="flex-1 space-y-1 pt-3">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
