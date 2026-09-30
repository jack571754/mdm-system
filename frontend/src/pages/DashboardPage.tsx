import React from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Gift,
  History,
  AlertTriangle,
  Upload,
  Plus,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-xl shadow-blue-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            统一主数据中枢服务在线
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            欢迎回来，{user?.username}！
          </h2>
          <p className="text-blue-100/80 text-sm max-w-xl">
            主数据管理平台已完成 <strong className="text-white font-semibold">Sprint 1~3 货品域与写入管道</strong> 闭环。一数一源中枢连接稳健，shadcn/ui 设计规范全线驱动。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-blue-50 font-semibold shadow-md">
            <Link to="/products">
              <Package className="w-4 h-4 text-blue-600 mr-1" />
              <span>货品主数据工作台</span>
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" className="bg-blue-600/40 border-blue-400/40 text-white hover:bg-blue-600/70">
              <Link to="/sync">
                <RefreshCw className="w-4 h-4 mr-1" />
                <span>同步调度中心</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid using shadcn/ui Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500">货品主数据总数</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">8,492</span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                +12 今日新增
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">在售正品 7,810 ｜ 小样 682</p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500">促销机制方案</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Gift className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">348</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-blue-700 bg-blue-50 border-blue-200">
                124 组生效中
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">单表扁平结构 ｜ 组合明细校验</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500">今日变更留痕</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">54</span>
              <span className="text-xs font-medium text-slate-500">次审计记录</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">同事务 Diff 写入，可追溯可核对</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="hover:shadow-md transition-shadow border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500">待确认删除预警</CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">3</span>
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                待审批下线
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">数仓连续3次缺失，绝不自动硬删</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Implementation Milestones & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Milestone Tracker (2 cols) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                P0 研发实施推进进度
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                根据批准的《实施推进计划》进行各 Sprint 阶段跟踪与验证
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Sprint 3 已就绪
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 1: 基础设施、工程骨架与认证鉴权 [已完成]
                </div>
                <div className="text-slate-600 mt-0.5">
                  FastAPI + SQLite/Postgres 双模引擎、JWT 认证、RBAC 依赖拦截、前端骨架全通。
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 2: 核心写入管道 WritePipeline 与审计留痕 [已完成]
                </div>
                <div className="text-slate-600 mt-0.5">
                  权威源优先级合并（非空保护、字段锁定）、同事务 Diff 变更审计、机制冗余级联刷新（16/16 单元测试通过）。
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 3: 货品域端到端业务闭环与 shadcn/ui 组件升级 [已完成]
                </div>
                <div className="text-slate-600 mt-0.5">
                  TanStack 风格表格、21列全字段抽屉、Excel 导入3步向导与行级校验、基于 shadcn/ui 原语全栈改造。
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/60 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 4 (当前目标): 促销机制域单表扁平结构与聚合导入
                </div>
                <div className="text-slate-600 mt-0.5">
                  机制主子表模型、单表聚合解析流水线、自动编码派发（PROMO-YYYYMM-XXXX）、状态机计算与管理工作台。
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations & Architecture (1 col) */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">快捷操作入口</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <a
                href="http://localhost:8090/docs"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs text-slate-800 group"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Swagger API 交互文档</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </a>

              <Link
                to="/products"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs text-slate-800 group"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">货品管理工作台</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </Link>

              <Link
                to="/mechanisms"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs text-slate-800 group"
              >
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">促销机制导入向导</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

