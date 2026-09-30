import React from "react";
import { ArrowRight } from "lucide-react";

interface ChangeLog {
  id: number;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  operator: string;
  channel: string;
  created_at: string;
}

interface ChangeLogTimelineProps {
  logs: ChangeLog[];
  loading: boolean;
}

/**
 * 变更留痕时间轴：字段级 old -> new 对比，供各详情弹窗复用
 */
export const ChangeLogTimeline: React.FC<ChangeLogTimelineProps> = ({ logs, loading }) => {
  if (loading) {
    return <div className="py-8 text-center text-xs text-muted-foreground">正在获取变更记录…</div>;
  }
  if (logs.length === 0) {
    return <div className="py-8 text-center text-xs text-muted-foreground">暂无历史变更记录</div>;
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {logs.map((log) => (
        <li key={log.id} className="relative">
          <span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full border-2 border-background bg-primary" />
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
            <span>操作人 {log.operator}</span>
            <span className="rounded border border-border bg-muted px-1.5 py-px text-[10px]">
              {log.channel}
            </span>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
            {log.field_name === "_created" ? (
              <span className="font-medium text-success">{log.new_value}</span>
            ) : (
              <div>
                <span className="font-medium text-foreground">{log.field_name}</span> 发生变更
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="rounded bg-destructive/10 px-1 text-destructive line-through">
                    {log.old_value || "空"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="rounded bg-success/10 px-1 font-medium text-success">
                    {log.new_value || "空"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
