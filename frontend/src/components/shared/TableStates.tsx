import React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateCellProps {
  colSpan: number;
  className?: string;
}

/**
 * 表格加载态：轻量、克制，不做大面积动画
 */
export const TableLoadingState: React.FC<StateCellProps> = ({ colSpan, className }) => (
  <tr>
    <td colSpan={colSpan} className={cn("py-14 text-center text-[13px] text-muted-foreground", className)}>
      <div className="flex items-center justify-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/60" aria-hidden />
        <span>正在加载数据…</span>
      </div>
    </td>
  </tr>
);

interface EmptyStateProps extends StateCellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * 表格空态：说明现状 + 指引下一步动作
 */
export const TableEmptyState: React.FC<EmptyStateProps> = ({ colSpan, title, description, action, className }) => (
  <tr>
    <td colSpan={colSpan} className={cn("py-14 text-center", className)}>
      <div className="mx-auto flex max-w-xs flex-col items-center gap-1.5">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </td>
  </tr>
);
