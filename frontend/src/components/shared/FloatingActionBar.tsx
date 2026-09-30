import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * 悬浮批量操作胶囊 (Linear / Supabase 范式)
 * 当勾选表格多项时，居中浮现在屏幕底部，不抢占顶栏空间
 */
export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  selectedCount,
  onClear,
  children,
  className,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-40 -translate-x-1/2",
        "flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-2xl backdrop-blur-md",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        className
      )}
      role="toolbar"
      aria-label="批量操作栏"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
          {selectedCount}
        </span>
        <span>项已选</span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1.5">{children}</div>

      <div className="h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-6 w-6 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        title="取消全选"
        aria-label="取消选择"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
