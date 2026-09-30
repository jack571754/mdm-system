import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

/**
 * 表格分页：条数选择 + 页码导航 + 总量统计，数字使用 tabular-nums
 */
export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground sm:flex-row">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          第 <span className="font-medium text-foreground">{from}</span>–
          <span className="font-medium text-foreground">{to}</span> 条，共{" "}
          <span className="font-medium text-foreground">{total}</span> 条
        </span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">每页</span>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              onSizeChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-7 w-[68px] rounded-md px-2 text-xs" aria-label="每页条数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[68px] rounded-md">
              {[20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[72px] px-2 text-center tabular-nums">
          <span className="font-medium text-foreground">{page}</span> / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
