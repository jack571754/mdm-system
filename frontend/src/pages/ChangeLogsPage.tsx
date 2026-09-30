import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowRight,
  User,
  Radio,
  Layers,
  Calendar,
} from "lucide-react";
import { ChangeLogItem, getChangeLogsApi, exportChangeLogsUrl } from "../api/changeLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer } from "../components/shared/PageContainer";
import { DataTablePagination } from "../components/shared/DataTablePagination";

export const ChangeLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ChangeLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  // Filters
  const [objectType, setObjectType] = useState<string>("");
  const [objectCode, setObjectCode] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [channel, setChannel] = useState<string>("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getChangeLogsApi({
        page,
        size: pageSize,
        object_type: objectType || undefined,
        object_code: objectCode.trim() || undefined,
        operator: operator.trim() || undefined,
        channel: channel || undefined,
      });
      setLogs(Array.isArray(res?.data?.items) ? res.data.items : []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      console.error("加载审计日志失败:", err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadLogs();
  }, [page, objectType, channel]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleReset = () => {
    setObjectType("");
    setObjectCode("");
    setOperator("");
    setChannel("");
    setPage(1);
  };

  const exportUrl = exportChangeLogsUrl({
    object_type: objectType || undefined,
    object_code: objectCode.trim() || undefined,
    operator: operator.trim() || undefined,
    channel: channel || undefined,
  });

  return (
    <PageContainer
      title="全局变更审计留痕 (Audit Trail)"
      description="WritePipeline 同事务落库的字段级审计日志检索中心，完整记录四通道数据变迁轨迹与对账留痕证据。"
      actions={
        <div className="flex items-center gap-2">
          <a href={exportUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              导出当前审计日志
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      }
    >
      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Object Type */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">对象类型</label>
            <select
              value={objectType}
              onChange={(e) => {
                setObjectType(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
            >
              <option value="">全部对象 (Product/Mechanism)</option>
              <option value="product">货品档案 (product)</option>
              <option value="mechanism">机制档案 (mechanism)</option>
              <option value="mechanism_item">机制明细 (mechanism_item)</option>
            </select>
          </div>

          {/* Object Code */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">业务唯一编码</label>
            <Input
              value={objectCode}
              onChange={(e) => setObjectCode(e.target.value)}
              placeholder="搜索货品/机制编码..."
              className="h-8 text-xs"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">变更写入渠道</label>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
            >
              <option value="">全部渠道</option>
              <option value="数仓同步">数仓同步</option>
              <option value="手工维护">手工维护</option>
              <option value="Excel导入">Excel导入</option>
              <option value="API推送">API推送</option>
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">操作人 / 批处理标识</label>
            <Input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="操作人账号..."
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="text-xs">
            重置筛选
          </Button>
          <Button type="submit" size="sm" className="gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800">
            <Search className="w-3.5 h-3.5" />
            检索日志
          </Button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-700">
            共检索到 <span className="text-blue-600 font-bold">{total}</span> 条不可篡改审计记录
          </div>
        </div>

        <div className="border border-slate-100 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>日志编号</TableHead>
                <TableHead>对象类型</TableHead>
                <TableHead>业务主键编码</TableHead>
                <TableHead>变更字段</TableHead>
                <TableHead>变动差异轨迹 (Old → New)</TableHead>
                <TableHead>写入渠道</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>留痕时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    未找到符合条件的变更审计记录
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isCreated = log.field_name === "_created";
                  const isCascade = log.field_name === "cascade_refresh";

                  return (
                    <TableRow key={log.id} className="text-xs hover:bg-slate-50/80">
                      <TableCell className="font-mono text-slate-400 text-[11px]">#{log.id}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.object_type === "product"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : log.object_type === "mechanism"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}
                        >
                          {log.object_type === "product"
                            ? "货品"
                            : log.object_type === "mechanism"
                            ? "机制"
                            : "机制明细"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-900">
                        {log.object_code}
                        {log.sub_key && (
                          <span className="text-[10px] text-slate-400 block font-normal">品: {log.sub_key}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {isCreated ? "新建入库" : isCascade ? "级联刷新" : log.field_name}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {isCreated ? (
                          <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                            {log.new_value}
                          </span>
                        ) : isCascade ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {log.new_value}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-rose-600 line-through bg-rose-50 px-1.5 py-0.2 rounded font-mono text-[11px]">
                              {log.old_value !== null && log.old_value !== "" ? log.old_value : "<空>"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded font-mono text-[11px]">
                              {log.new_value !== null && log.new_value !== "" ? log.new_value : "<空>"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.channel}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 text-[11px]">{log.operator}</TableCell>
                      <TableCell className="text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("zh-CN")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          page={page}
          size={pageSize}
          total={total}
          onPageChange={setPage}
          className="mt-4"
        />
      </div>
    </PageContainer>
  );
};
