import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          <span>正在加载主数据平台...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route
          path="products"
          element={
            <PlaceholderPage
              title="货品主数据管理 (Product Domain)"
              sprint="Sprint 3"
              description="货品21列业务档案全字段查询、TanStack Table 50条分页、单表Excel导入向导与行级错误清单导出。"
              features={[
                "GET /api/v1/products 多维条件组合筛选与模糊搜索",
                "单条货品详情与全生命周期变更留痕时间轴",
                "表单防呆录入与同品牌名称相似度疑似重复提示",
                "Excel 导入模板生成、预览校验与“非空覆盖、空值保留”保护"
              ]}
            />
          }
        />

        <Route
          path="mechanisms"
          element={
            <PlaceholderPage
              title="促销机制方案管理 (Mechanism Domain)"
              sprint="Sprint 4"
              description="促销机制主表与商品明细子表联动管理，支持单表扁平结构 Excel 导入与引用完整性校验。"
              features={[
                "单表扁平结构 Excel 导入引擎：多行自动聚合为主机制与多条明细",
                "机制规则码自动派发：M-{品牌缩写}-{年月YYYYMM}-{4位流水}",
                "机制生效状态根据起止日期与系统时间动态计算（未开始/生效中/已过期/已停用）",
                "明细商品编码引用校验：强制校验商品编码在产品库中是否存在且启用"
              ]}
            />
          }
        />

        <Route
          path="change-logs"
          element={
            <PlaceholderPage
              title="全局变更审计留痕 (Audit Trail)"
              sprint="Sprint 2 / 3"
              description="同事务落库的字段级审计日志检索中心，完整记录四通道数据变迁与对账证据。"
              features={[
                "WritePipeline 同事务记录字段级 old_value -> new_value",
                "多维查询：按对象类型(产品/机制)、编码、操作人、通道、时间范围筛选",
                "审计数据保留 ≥ 1年，支持审计日志全量 Excel 导出"
              ]}
            />
          }
        />

        <Route
          path="sync"
          element={
            <AdminRoute>
              <PlaceholderPage
                title="数仓同步调度中枢 (Sync Hub)"
                sprint="Sprint 5"
                description="定时/手动触发数仓只读拉取与全量增量比对，管理上游下线与待确认删除流转。"
                features={[
                  "APScheduler 进程内定时调度引擎与只读数仓连接器",
                  "动态字段映射 field_mapping 配置与增量比对 Diff",
                  "待确认删除看板：上游连续3次缺失记录人工复核与批量下线",
                  "一键手动触发与单源并发互斥锁控制"
                ]}
              />
            </AdminRoute>
          }
        />

        <Route
          path="quality"
          element={
            <PlaceholderPage
              title="数据质量与治理中心 (Data Quality)"
              sprint="Sprint 5"
              description="自动化巡检三大问题数据：关键缺失项、疑似重复记录、待确认删除数据集中治理。"
              features={[
                "缺失关键项清单（缺少规格、零售价、单位等一键导出线下排查）",
                "疑似重复记录清单（同品牌下名称相似度过高集中核验）",
                "待确认删除清单批量审批与归档"
              ]}
            />
          }
        />

        <Route
          path="settings"
          element={
            <AdminRoute>
              <PlaceholderPage
                title="系统基础设置 (System Settings)"
                sprint="Sprint 1 / 2"
                description="枚举字典集中管理、用户与角色授权 (RBAC) 以及多渠道权威源优先级配置。"
                features={[
                  "enum_config 枚举字典动态配置（正品/小样、商品状态、销售阶段等）",
                  "User 用户账号与角色分配（admin / operator / api）",
                  "权威源优先级顺序拖拽配置（数仓同步 > API > Excel > 手工）"
                ]}
              />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
