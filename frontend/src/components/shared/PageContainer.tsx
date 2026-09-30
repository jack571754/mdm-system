import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * 页头：标题 20px / 副标题 13px，右侧主操作区，无 Card 包裹
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, description, actions }) => {
  const sub = subtitle || description;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

export interface PageContainerProps {
  title?: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * 页面容器：统一页面级内边距与内容宽度（20~24px，避免大留白）
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  description,
  actions,
  className,
  children,
}) => {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] space-y-4 p-4 md:p-6", className)}>
      {title && <PageHeader title={title} subtitle={subtitle} description={description} actions={actions} />}
      {children}
    </div>
  );
};
