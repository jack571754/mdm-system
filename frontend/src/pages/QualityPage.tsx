import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CopyCheck,
  Trash2,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import {
  QualityOverview,
  MissingFieldItem,
  DuplicateCandidateItem,
  getQualityOverviewApi,
  getMissingRecordsApi,
  getDuplicateCandidatesApi,
  exportMissingRecordsUrl,
  exportPendingDeletesUrl,
} from "../api/quality";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer } from "../components/shared/PageContainer";
import { StatusDot } from "../components/shared/StatusDot";
import { DataTablePagination } from "../components/shared/DataTablePagination";

export const QualityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"missing" | "duplicates" | "pending">("missing");
  const [overview, setOverview] = useState<QualityOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // Missing tab state
  const [missingItems, setMissingItems] = useState<MissingFieldItem[]>([]);
  const [missingTotal, setMissingTotal] = useState(0);
  const [missingPage, setMissingPage] = useState(1);
  const [missingDomain, setMissingDomain] = useState<string>("");

  // Duplicates tab state
  const [duplicates, setDuplicates] = useState<DuplicateCandidateItem[]>([]);
  const [dupThreshold, setDupThreshold] = useState<number>(0.85);

  const loadOverview = async () => {
    try {
      const res = await getQualityOverviewApi();
      setOverview(res?.data || null);
    } catch (err) {
      console.error("加载质量总览失败:", err);
    }
  };

  const loadMissing = async () => {
    setLoading(true);
    try {
      const res = await getMissingRecordsApi(
        missingDomain || undefined,
        missingPage,
        20
      );
      setMissingItems(Array.isArray(res?.data?.items) ? res.data.items : []);
      setMissingTotal(res?.data?.total || 0);
    } catch (err) {
      console.error("加载缺失数据失败:", err);
      setMissingItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const res = await getDuplicateCandidatesApi(undefined, dupThreshold);
      setDuplicates(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("加载疑似重复记录失败:", err);
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "missing") {
      loadMissing();
    } else if (activeTab === "duplicates") {
      loadDuplicates();
    }
  }, [activeTab, missingPage, missingDomain, dupThreshold]);

  const scoreColor =
    (overview?.health_score || 0) >= 90
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : (overview?.health_score || 0) >= 75
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <PageContainer
      title="数据质量与治理中心 (Data Quality)"
      description="多维自动化巡检核心主数据健康度，集中排查关键字段缺失、疑似重复记录与上游失联待删除数据。"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOverview();
            if (activeTab === "missing") loadMissing();
            if (activeTab === "duplicates") loadDuplicates();
          }}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新巡检结果
        </Button>
      }
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">主数据健康度评分</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {overview?.health_score ?? "--"}
              <span className="text-sm font-semibold text-slate-400"> / 100</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              总纳管档案: {(overview?.total_products || 0) + (overview?.total_mechanisms || 0)} 条
            </div>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-bold text-lg ${scoreColor}`}
          >
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>

        {/* Missing Fields Count */}
        <div
          onClick={() => setActiveTab("missing")}
          className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer transition-all ${
            activeTab === "missing" ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>关键属性缺失项</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{overview?.missing_fields_count ?? 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">缺规格/价格/单位</div>
        </div>

        {/* Duplicate Candidates Count */}
        <div
          onClick={() => setActiveTab("duplicates")}
          className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer transition-all ${
            activeTab === "duplicates" ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>疑似重复记录组</span>
            <CopyCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{overview?.duplicates_count ?? 0}</div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">同品牌相似度 ≥ 85%</div>
        </div>

        {/* Pending Deletes Count */}
        <div
          onClick={() => setActiveTab("pending")}
          className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer transition-all ${
            activeTab === "pending" ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>待确认删除保护</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{overview?.pending_deletes_count ?? 0}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">连续 3 次数仓失联</div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("missing")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "missing" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              关键属性缺失清单 ({overview?.missing_fields_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "duplicates" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              疑似重复记录核验 ({overview?.duplicates_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              待删除治理流转 ({overview?.pending_deletes_count ?? 0})
            </button>
          </div>

          <div>
            {activeTab === "missing" && (
              <a href={exportMissingRecordsUrl()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  导出缺失排查清单 (Excel)
                </Button>
              </a>
            )}
            {activeTab === "pending" && (
              <a href={exportPendingDeletesUrl()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-rose-700 border-rose-200">
                  <Download className="w-3.5 h-3.5" />
                  导出待确认删除清单 (Excel)
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Tab 1: Missing Fields List */}
        {activeTab === "missing" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">数据领域筛选:</span>
              <select
                value={missingDomain}
                onChange={(e) => {
                  setMissingDomain(e.target.value);
                  setMissingPage(1);
                }}
                className="h-8 text-xs border border-slate-200 rounded px-2 bg-white"
              >
                <option value="">全部领域</option>
                <option value="product">货品档案 (Product)</option>
                <option value="mechanism">机制档案 (Mechanism)</option>
              </select>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>领域</TableHead>
                    <TableHead>唯一编码</TableHead>
                    <TableHead>档案名称</TableHead>
                    <TableHead>所属品牌</TableHead>
                    <TableHead>缺失关键属性项</TableHead>
                    <TableHead>数据渠道</TableHead>
                    <TableHead>待维护标记</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        没有发现关键属性缺失的档案
                      </TableCell>
                    </TableRow>
                  ) : (
                    missingItems.map((item, idx) => (
                      <TableRow key={`${item.code}-${idx}`} className="text-xs hover:bg-slate-50/80">
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {item.domain}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-slate-800">{item.code}</TableCell>
                        <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                        <TableCell className="text-slate-600">{item.brand || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.missing_fields.map((f, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-medium"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">{item.data_source}</TableCell>
                        <TableCell>
                          {item.needs_maintenance === "是" ? (
                            <span className="text-amber-600 font-semibold text-[11px]">需补录</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">否</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination
              page={missingPage}
              size={20}
              total={missingTotal}
              onPageChange={setMissingPage}
              className="mt-3"
            />
          </div>
        )}

        {/* Tab 2: Duplicates Candidates */}
        {activeTab === "duplicates" && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-lg text-xs">
              <div className="text-slate-600 flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>相似度算法: 基于品牌分组，对货品名称与规格进行 Levenshtein 编辑距离与序列模糊比对。</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">检测阈值:</span>
                <select
                  value={dupThreshold}
                  onChange={(e) => setDupThreshold(parseFloat(e.target.value))}
                  className="h-7 text-xs border border-slate-200 rounded px-2 bg-white font-medium"
                >
                  <option value={0.75}>75% (较宽松)</option>
                  <option value={0.85}>85% (标准推荐)</option>
                  <option value={0.9}>90% (高严格)</option>
                </select>
              </div>
            </div>

            {duplicates.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-slate-700 font-medium">未发现相似度高于 {(dupThreshold * 100).toFixed(0)}% 的疑似重复记录</p>
                <p className="text-slate-400 mt-1">货品命名与规格命名规范良好。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {duplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100">
                          {dup.brand}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">疑似重复对照组 #{idx + 1}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                        相似度 {(dup.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Record A */}
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono font-medium text-slate-700">{dup.code_a}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px]">
                            {dup.status_a}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{dup.name_a}</div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span>规格: {dup.spec_a || "-"}</span>
                          <span>零售价: {dup.price_a ? `¥${dup.price_a}` : "-"}</span>
                        </div>
                      </div>

                      {/* Record B */}
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono font-medium text-slate-700">{dup.code_b}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px]">
                            {dup.status_b}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{dup.name_b}</div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span>规格: {dup.spec_b || "-"}</span>
                          <span>零售价: {dup.price_b ? `¥${dup.price_b}` : "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pending Deletes Information */}
        {activeTab === "pending" && (
          <div className="py-8 text-center text-xs text-slate-500">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-800 text-sm">待确认删除数据已集中交由数仓同步中心审批</p>
            <p className="text-slate-400 mt-1 max-w-md mx-auto">
              可在「数仓同步中枢」中查看完整失联待确认删除清单，并支持管理员一键批量下线或忽略保留。
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a href="/sync">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  前往数仓同步中枢审批
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </a>
              <a href={exportPendingDeletesUrl()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  直接导出待确认删除表
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
