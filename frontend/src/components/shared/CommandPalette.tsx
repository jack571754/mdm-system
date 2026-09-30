import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Package,
  Gift,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  FileCode,
  LogOut,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

interface CommandItem {
  id: string;
  title: string;
  category: "导航" | "动作" | "外部";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Keyboard shortcut listener: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const items: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "系统概览与指标总览",
      category: "导航",
      icon: LayoutDashboard,
      action: () => {
        navigate("/dashboard");
        onOpenChange(false);
      },
    },
    {
      id: "nav-products",
      title: "货品主数据工作台 (21列全生命周期档案)",
      category: "导航",
      icon: Package,
      action: () => {
        navigate("/products");
        onOpenChange(false);
      },
      badge: "核心",
    },
    {
      id: "nav-mechanisms",
      title: "促销机制域管理 (主子表明细与生效状态)",
      category: "导航",
      icon: Gift,
      action: () => {
        navigate("/mechanisms");
        onOpenChange(false);
      },
      badge: "Sprint 4",
    },
    {
      id: "nav-sync",
      title: "数仓同步调度与待确认删除流转",
      category: "导航",
      icon: RefreshCw,
      action: () => {
        navigate("/sync");
        onOpenChange(false);
      },
    },
    {
      id: "nav-governance",
      title: "数据治理与质量监控中心",
      category: "导航",
      icon: ShieldCheck,
      action: () => {
        navigate("/governance");
        onOpenChange(false);
      },
    },
    {
      id: "action-docs",
      title: "查看 FastAPI Swagger 交互式文档",
      category: "外部",
      icon: FileCode,
      action: () => {
        window.open("http://localhost:8090/docs", "_blank");
        onOpenChange(false);
      },
    },
    {
      id: "action-logout",
      title: "退出登录当前账号",
      category: "动作",
      icon: LogOut,
      action: () => {
        logout();
        navigate("/login");
        onOpenChange(false);
      },
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border border-border shadow-2xl rounded-xl">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-card">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入模块名称、动作或按 Esc 退出..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              未找到匹配的命令或页面
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors hover:bg-accent group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1 rounded-md bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-foreground">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{item.category}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              使用 <kbd className="px-1 rounded bg-muted border border-border font-mono">↑</kbd> <kbd className="px-1 rounded bg-muted border border-border font-mono">↓</kbd> 浏览
            </span>
            <span>
              <kbd className="px-1 rounded bg-muted border border-border font-mono">↵</kbd> 跳转
            </span>
          </div>
          <span>当前身份：{user?.role === "admin" ? "系统管理员" : "业务运营"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
