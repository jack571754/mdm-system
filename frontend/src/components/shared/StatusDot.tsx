import React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "muted";

/** 语义色映射：状态文案 -> 语义色调（集中维护，避免各页面散落硬编码） */
export const STATUS_TONE_MAP: Record<string, StatusTone> = {
  正常: "success",
  在售: "success",
  已启用: "success",
  生效中: "success",
  停售: "warning",
  已过期: "warning",
  预警: "warning",
  待处理: "warning",
  待生效: "info",
  淘汰: "muted",
  已禁用: "muted",
  已停用: "muted",
  异常: "error",
  失败: "error",
};

const TONE_DOT_CLASS: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-primary",
  muted: "bg-muted-foreground/40",
};

const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-primary",
  muted: "text-muted-foreground",
};

interface StatusDotProps {
  /** 直接指定色调；不传时按 STATUS_TONE_MAP 语义解析 */
  tone?: StatusTone;
  /** 状态文案，同时用于语义解析 */
  children?: string;
  className?: string;
}

/**
 * 状态点 + 文字：替代传统 Filled Badge，低视觉噪音
 */
export const StatusDot: React.FC<StatusDotProps> = ({ tone, children, className }) => {
  const resolved = tone ?? (children ? STATUS_TONE_MAP[children] ?? "muted" : "muted");
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-normal", TONE_TEXT_CLASS[resolved], className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT_CLASS[resolved])} />
      {children}
    </span>
  );
};
