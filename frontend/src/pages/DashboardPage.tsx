import React from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Gift,
  History,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageHeader, PageContainer } from "@/components/shared/PageContainer";
import { StatusDot } from "@/components/shared/StatusDot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string;
  note: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning";
}

const STATS: StatItem[] = [
  {
    label: "货品主数据",
    value: "8,492",
    note: (
      <>
        <span className="text-success">今日新增 12</span> · 正品 7,810 / 小样 682
      </>
    ),
    icon: Package,
  },
  {
    label: "促销机制方案",
    value: "348",
    note: <><span className="text-primary">124 组生效中</span> · 单表聚合校验</>,
    icon: Gift,
  },
  {
    label: "今日变更留痕",
    value: "54",
    note: <>同事务 Diff 写入，完整可溯</>,
    icon: History,
  },
  {
    label: "待确认删除预警",
    value: "3",
    note: <><span className="text-warning">待复核下线</span> · 数仓连续 3 次缺失保护</>,
    icon: AlertTriangle,
    tone: "warning",
  },
];

const SPRINTS = [
  {
    title: "Sprint 1：基础设施、工程骨架与认证鉴权",
    desc: "FastAPI + SQLite/Postgres 双模引擎、JWT 认证、RBAC 依赖拦截、前端骨架全通。",
    done: true,
  },
  {
    title: "Sprint 2：核心写入管道 WritePipeline 与审计留痕",
    desc: "权威源优先级合并（非空保护、字段锁定）、同事务 Diff 变更审计、机制冗余级联刷新。",
    done: true,
  },
  {
    title: "Sprint 3：货品域端到端业务闭环与组件体系升级",
    desc: "数据工作台表格、21 列全字段详情、Excel 导入三步向导与行级校验。",
    done: true,
  },
  {
    title: "Sprint 4（当前目标）：促销机制域单表扁平结构与聚合导入",
    desc: "机制主子表模型、单表聚合解析流水线、自动编码派发、状态机计算与管理工作台。",
    done: false,
  },
];

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="系统概览"
        subtitle={`欢迎回来，${user?.username}。主数据中枢多通道管道运行正常，权威档案全生命周期可溯。`}
        actions={
          <>
            <Button size="sm" asChild>
              <Link to="/products">
                <Package className="h-3.5 w-3.5" />
                <span>货品工作台</span>
              </Link>
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/sync">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>同步调度</span>
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* 数据摘要条：单面分区，不做大 KPI 卡片 */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-4 lg:divide-x lg:divide-border">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={cn(
                "px-5 py-4",
                i < 2 && "border-b border-border lg:border-b-0",
                i % 2 === 0 && "border-r border-border lg:border-r-0"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{s.label}</span>
              </div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {s.value}
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground" title={typeof s.note === "string" ? s.note : undefined}>
                {s.note}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column: Sprint 推进 + 快捷入口 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sprint 推进 */}
        <div className="rounded-lg border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">研发实施推进</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">按批准的《实施推进计划》跟踪各 Sprint 阶段交付</p>
            </div>
            <StatusDot tone="success">Sprint 4 进行中</StatusDot>
          </div>
          <div className="space-y-3 px-5 py-4">
            {SPRINTS.map((s) => (
              <div key={s.title} className="flex items-start gap-2.5">
                {s.done ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 text-xs">
                  <div className="font-medium text-foreground">{s.title}</div>
                  <div className="mt-0.5 leading-relaxed text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-foreground">快捷入口</h2>
          </div>
          <div className="space-y-1 px-3 py-3">
            <QuickLink
              to="/products"
              icon={<Package className="h-3.5 w-3.5" />}
              label="货品主数据工作台"
              desc="新建、编辑与批量导入货品档案"
            />
            <QuickLink
              to="/mechanisms"
              icon={<Gift className="h-3.5 w-3.5" />}
              label="促销机制工作台"
              desc="方案维护与单表扁平导入"
            />
            <QuickLink
              to="/change-logs"
              icon={<History className="h-3.5 w-3.5" />}
              label="变更审计"
              desc="字段级数据变更留痕检索"
            />
            <a
              href="http://localhost:8090/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground">API 交互文档</div>
                  <div className="truncate text-muted-foreground">Swagger OpenAPI 在线调试</div>
                </div>
              </div>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            </a>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              权威源优先级写入保护
            </span>
            <span className="font-mono text-[11px]">Active</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

const QuickLink: React.FC<{ to: string; icon: React.ReactNode; label: string; desc: string }> = ({
  to,
  icon,
  label,
  desc,
}) => (
  <Link
    to={to}
    className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="truncate text-muted-foreground">{desc}</div>
      </div>
    </div>
    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
  </Link>
);
