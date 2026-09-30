import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Play,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Trash2,
  Lock,
} from "lucide-react";
import {
  SyncSource,
  SyncRun,
  PendingDeleteRecord,
  getSyncSourcesApi,
  triggerSyncSourceRunApi,
  getSyncRunsHistoryApi,
  getPendingDeletesApi,
  confirmPendingDeleteApi,
} from "../api/sync";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageContainer } from "../components/shared/PageContainer";
import { StatusDot } from "../components/shared/StatusDot";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { FloatingActionBar } from "../components/shared/FloatingActionBar";

export const SyncPage: React.FC = () => {
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<PendingDeleteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningSourceId, setRunningSourceId] = useState<number | null>(null);

  // Selection for pending deletes
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: "confirm_offline" | "keep";
    title: string;
    description: string;
  }>({
    isOpen: false,
    action: "confirm_offline",
    title: "",
    description: "",
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [srcRes, runRes, delRes] = await Promise.all([
        getSyncSourcesApi(),
        getSyncRunsHistoryApi(undefined, 20),
        getPendingDeletesApi(),
      ]);
      setSources(Array.isArray(srcRes?.data) ? srcRes.data : []);
      setRuns(Array.isArray(runRes?.data) ? runRes.data : []);
      setPendingDeletes(Array.isArray(delRes?.data) ? delRes.data : []);
    } catch (err: any) {
      console.error("加载同步中心数据失败:", err);
      setSources([]);
      setRuns([]);
      setPendingDeletes([]);
      setFeedbackMsg({ type: "error", text: "加载同步源及待处理数据失败" });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadAllData();
  }, []);

  const handleTriggerSync = async (sourceId: number) => {
    setRunningSourceId(sourceId);
    setFeedbackMsg(null);
    try {
      const res = await triggerSyncSourceRunApi(sourceId);
      const run = res.data;
      setFeedbackMsg({
        type: "success",
        text: `同步成功！新增 ${run.inserted} 条，更新 ${run.updated} 条，跳过 ${run.skipped} 条，待确认删除 ${run.pending_deleted} 条。`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.response?.data?.message || err?.message || "同步执行异常",
      });
    } finally {
      setRunningSourceId(null);
    }
  };

  const handleBatchConfirm = (action: "confirm_offline" | "keep") => {
    if (selectedCodes.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      action,
      title: action === "confirm_offline" ? "确认批量下线主数据" : "确认忽略并恢复保留",
      description:
        action === "confirm_offline"
          ? `已选择 ${selectedCodes.length} 条待确认删除数据。确认后将设置为停用状态 (is_enabled=False)，并在变更审计日志中全量留痕。`
          : `已选择 ${selectedCodes.length} 条数据。确认后将清除待确认删除标记，恢复为正常在库状态。`,
    });
  };

  const executeConfirmAction = async () => {
    setConfirmLoading(true);
    try {
      await confirmPendingDeleteApi(confirmDialog.action, "product", selectedCodes);
      setFeedbackMsg({
        type: "success",
        text: confirmDialog.action === "confirm_offline" ? "已成功批量确认下线" : "已成功恢复保留",
      });
      setSelectedCodes([]);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      loadAllData();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.response?.data?.message || "批量处理失败",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCodes(pendingDeletes.map((x) => x.code));
    } else {
      setSelectedCodes([]);
    }
  };

  const toggleSelectRow = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedCodes((prev) => [...prev, code]);
    } else {
      setSelectedCodes((prev) => prev.filter((c) => c !== code));
    }
  };

  return (
    <PageContainer
      title="数仓同步中枢 (Sync Hub)"
      description="直连企业核心数仓 ODS 数据底表，支持定时调度与即时手动触发，全自动比对权威源写入管道并托管待确认删除数据。"
      actions={
        <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新状态
        </Button>
      }
    >
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Sync Sources Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          数据源连接与调度监控
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const isRunning = runningSourceId === src.id;
            const lastRun = src.latest_run;
            return (
              <div
                key={src.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        {src.domain === "product" ? "货品主档案" : "机制主档案"}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{src.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Cron: {src.cron_expr}
                      </span>
                      <span>失联容忍阈值: {src.miss_threshold} 次</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleTriggerSync(src.id)}
                    disabled={isRunning}
                    className="gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>同步处理中...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>立即执行同步</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Latest Run Snapshot */}
                <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600 mb-2">
                    <span className="font-medium text-slate-700">最近同步表现</span>
                    {lastRun ? (
                      <div className="flex items-center gap-1.5">
                        <StatusDot
                          tone={
                            lastRun.status === "success"
                              ? "success"
                              : lastRun.status === "warning"
                              ? "warning"
                              : "error"
                          }
                        >
                          {lastRun.status === "success" ? "成功" : lastRun.status}
                        </StatusDot>
                      </div>
                    ) : (

                      <span className="text-slate-400">尚未执行</span>
                    )}
                  </div>

                  {lastRun ? (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white py-1.5 px-2 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-400">新增入库</div>
                        <div className="text-sm font-bold text-emerald-600">+{lastRun.inserted}</div>
                      </div>
                      <div className="bg-white py-1.5 px-2 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-400">权威合并</div>
                        <div className="text-sm font-bold text-blue-600">~{lastRun.updated}</div>
                      </div>
                      <div className="bg-white py-1.5 px-2 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-400">无变化跳过</div>
                        <div className="text-sm font-bold text-slate-500">{lastRun.skipped}</div>
                      </div>
                      <div className="bg-white py-1.5 px-2 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-400">待删除保护</div>
                        <div className="text-sm font-bold text-amber-600">
                          {lastRun.pending_deleted > 0 ? `!${lastRun.pending_deleted}` : 0}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center py-2">点击右上方按钮可立即发起首次同步拉取</div>
                  )}

                  {lastRun?.finished_at && (
                    <div className="text-[11px] text-slate-400 mt-2 text-right">
                      完成时间: {new Date(lastRun.finished_at).toLocaleString("zh-CN")} ｜ 操作者:{" "}
                      {lastRun.operator}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Deletes Approval Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                待确认删除审批看板 ({pendingDeletes.length} 项)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              当上游数仓连续多次同步均未拉取到已录入主数据时，系统触发防误删保护机制，需管理员人工核实审批。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCodes.length === 0}
              onClick={() => handleBatchConfirm("keep")}
              className="gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              忽略并保留
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCodes.length === 0}
              onClick={() => handleBatchConfirm("confirm_offline")}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              确认下线禁用
            </Button>
          </div>
        </div>

        {pendingDeletes.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-slate-600 font-medium">当前无待确认删除的风险数据</p>
            <p className="text-slate-400 mt-0.5">所有数仓权威主数据同步健康，无连续失联记录。</p>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedCodes.length > 0 && selectedCodes.length === pendingDeletes.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>领域</TableHead>
                  <TableHead>唯一编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>所属品牌</TableHead>
                  <TableHead>数据来源</TableHead>
                  <TableHead>失联原因说明</TableHead>
                  <TableHead>字段保护</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeletes.map((item) => (
                  <TableRow key={item.code} className="hover:bg-slate-50/80">
                    <TableCell>
                      <Checkbox
                        checked={selectedCodes.includes(item.code)}
                        onCheckedChange={(checked) => toggleSelectRow(item.code, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.domain === "product" ? "货品" : "机制"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-medium text-slate-800 text-xs">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 text-xs">{item.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{item.brand || "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{item.data_source}</TableCell>
                    <TableCell>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        连续 3 次数仓同步未拉取到
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.is_locked ? (
                        <span className="flex items-center gap-1 text-[11px] text-purple-700">
                          <Lock className="w-3 h-3" /> 已锁定
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">未锁定</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sync Execution History */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          历史同步执行日志 (最近 20 次)
        </h3>

        <div className="border border-slate-100 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>执行编号</TableHead>
                <TableHead>触发源</TableHead>
                <TableHead>执行状态</TableHead>
                <TableHead>触发人/通道</TableHead>
                <TableHead>新增</TableHead>
                <TableHead>更新</TableHead>
                <TableHead>跳过</TableHead>
                <TableHead>待删除</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>耗时</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const duration =
                  r.finished_at && r.started_at
                    ? `${(
                        (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) /
                        1000
                      ).toFixed(1)}s`
                    : "-";
                return (
                  <TableRow key={r.id} className="text-xs hover:bg-slate-50/80">
                    <TableCell className="font-mono text-slate-500">#{r.id}</TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {r.domain === "product" ? "产品底表" : "机制底表"} (源 #{r.source_id})
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "warning"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {r.status === "success" ? "成功" : r.status === "warning" ? "告警" : "失败"}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">{r.operator}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">+{r.inserted}</TableCell>
                    <TableCell className="font-semibold text-blue-600">~{r.updated}</TableCell>
                    <TableCell className="text-slate-500">{r.skipped}</TableCell>
                    <TableCell className="text-amber-600 font-semibold">{r.pending_deleted}</TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(r.started_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono">{duration}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedCodes.length}
        onClear={() => setSelectedCodes([])}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBatchConfirm("keep")}
          className="text-xs bg-white text-emerald-700"
        >
          忽略并保留
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleBatchConfirm("confirm_offline")}
          className="text-xs"
        >
          确认批量下线
        </Button>
      </FloatingActionBar>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="确认执行"
        tone={confirmDialog.action === "confirm_offline" ? "danger" : "default"}
        loading={confirmLoading}
        onConfirm={executeConfirmAction}
      />
    </PageContainer>
  );
};

