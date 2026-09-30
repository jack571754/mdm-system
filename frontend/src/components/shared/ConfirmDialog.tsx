import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  /** danger 时确认按钮使用 destructive 色 */
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * 确认弹窗：用于停用、批量操作等不可轻易撤销的动作
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  tone = "default",
  loading = false,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg p-5">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-sm font-semibold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "正在执行…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
