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
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/shared/CommandPalette";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "概览",
    items: [{ name: "系统概览", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "主数据",
    items: [
      { name: "货品主数据", path: "/products", icon: Package },
      { name: "促销机制", path: "/mechanisms", icon: Gift },
    ],
  },
  {
    label: "数据治理",
    items: [
      { name: "数据质量", path: "/quality", icon: ShieldCheck },
      { name: "变更审计", path: "/change-logs", icon: History },
      { name: "同步中枢", path: "/sync", icon: RefreshCw, adminOnly: true },
    ],
  },
  {
    label: "系统",
    items: [{ name: "基础配置", path: "/settings", icon: Settings, adminOnly: true }],
  },
];

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebarNav = (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3">
      {navGroups.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="mb-3 last:mb-0">
            {!collapsed && (
              <div className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground/80">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const sidebarBrand = (collapsed: boolean) => (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-border px-4",
        collapsed && "justify-center px-0"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Database className="h-3.5 w-3.5" />
      </div>
      {!collapsed && (
        <div className="ml-2.5 flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
            主数据管理平台
          </span>
          <span className="text-[10px] text-muted-foreground">MDM WORKBENCH</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden shrink-0 select-none flex-col border-r border-border bg-card transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {sidebarBrand(collapsed)}
        {sidebarNav}
        <div
          className={cn(
            "shrink-0 border-t border-border py-2",
            collapsed ? "px-1.5" : "px-2.5"
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
            className={cn(
              "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>收起侧栏</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="打开菜单"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-[13px]" aria-label="面包屑">
              <span className="hidden text-muted-foreground sm:inline">主数据中心</span>
              <span className="hidden text-muted-foreground/50 sm:inline">/</span>
              <span className="font-medium text-foreground">
                {navGroups
                  .flatMap((g) => g.items)
                  .find((item) => isActive(item.path))?.name ?? "系统概览"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-background text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors cursor-pointer"
              title="全局快捷搜索与跳转 (Ctrl+K / ⌘K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-[12px]">快速搜索或跳转...</span>
              <kbd className="ml-2 inline-flex h-4 items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground lg:inline-flex"
            >
              <a href="http://localhost:8090/docs" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>API 文档</span>
              </a>
            </Button>

            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                aria-hidden
              >
                {user?.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden text-left text-xs leading-tight sm:block">
                <div className="font-medium text-foreground">{user?.username}</div>
                <div className="text-[11px] text-muted-foreground">
                  {user?.role === "admin" ? "系统管理员" : "业务运营"}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="退出登录"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="flex h-full w-60 flex-col bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarBrand(false)}
              <div onClick={() => setMobileMenuOpen(false)} className="flex min-h-0 flex-1 flex-col">
                {sidebarNav}
              </div>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
};
