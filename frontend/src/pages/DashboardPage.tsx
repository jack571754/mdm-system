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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-xl shadow-blue-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            系统核心服务正常运行中
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            欢迎回来，{user?.username}！
          </h2>
          <p className="text-blue-100/80 text-sm max-w-xl">
            主数据管理平台当前处于 <strong className="text-white font-semibold">Sprint 1 运行态</strong>。核心鉴权体系已就绪，一数一源中枢连接稳健。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/products"
            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-blue-50 text-xs font-semibold shadow-lg shadow-black/10 transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>浏览货品档案</span>
          </Link>
          {isAdmin && (
            <Link
              to="/sync"
              className="px-4 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold border border-blue-400/30 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>同步调度中心</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-medium">货品主数据总数</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">8,492</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              +12 今日新增
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">在售正品 7,810 ｜ 小样 682</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-medium">促销机制方案</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">348</span>
            <span className="text-xs font-medium text-blue-600">124 组生效中</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">单表扁平结构 ｜ 组合明细校验</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-medium">今日变更留痕</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">54</span>
            <span className="text-xs font-medium text-slate-500">次审计记录</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">同事务 Diff 写入，可追溯可核对</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-medium">待确认删除预警</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">3</span>
            <span className="text-xs font-medium text-amber-600">待审批下线</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">数仓连续3次缺失，绝不自动硬删</p>
        </div>
      </div>

      {/* Two Column Layout: Implementation Milestones & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Milestone Tracker (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">P0 研发实施推进进度</h3>
              <p className="text-xs text-slate-500 mt-0.5">根据批准的《实施推进计划》进行各 Sprint 阶段跟踪</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Sprint 1 进行中
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 1: 基础设施、工程骨架与认证鉴权
                </div>
                <div className="text-slate-600 mt-0.5">
                  FastAPI + SQLite/Postgres 双模引擎、JWT 认证、RBAC 依赖拦截、Vite React 18 前端骨架已跑通（6/6 测试通过）。
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/60 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Sprint 2 (下一个目标): 核心写入管道 WritePipeline 与审计留痕
                </div>
                <div className="text-slate-600 mt-0.5">
                  TDD 编写多维校验器、权威源合并（非空保护、字段锁定）、同事务 Diff 变更审计、机制冗余级联刷新。
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 opacity-75">
              <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs">
                <div className="font-medium text-slate-800">
                  Sprint 3 ~ 4: 产品域与机制域端到端业务闭环
                </div>
                <div className="text-slate-500 mt-0.5">
                  TanStack Table 50条分页、单表扁平 Excel 导入向导、主子表联动录入、机制编码自动派发。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations & Architecture (1 col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">快捷开发入口</h3>
            <div className="space-y-2.5">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
