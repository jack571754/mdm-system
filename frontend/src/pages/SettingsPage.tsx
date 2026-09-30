import React, { useState, useEffect } from "react";
import {
  Settings,
  Users,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Shield,
  Key,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  EnumConfig,
  UserAdmin,
  AppConfigItem,
  getEnumConfigsApi,
  createEnumConfigApi,
  updateEnumConfigApi,
  deleteEnumConfigApi,
  getUsersAdminApi,
  createUserAdminApi,
  updateUserAdminApi,
  getAppConfigsApi,
  updateAppConfigApi,
} from "../api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageContainer } from "../components/shared/PageContainer";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"enums" | "users" | "priority">("enums");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Enums state
  const [enums, setEnums] = useState<EnumConfig[]>([]);
  const [enumDomain, setEnumDomain] = useState<string>("");
  const [isAddEnumOpen, setIsAddEnumOpen] = useState(false);
  const [newEnum, setNewEnum] = useState({
    domain: "product",
    field_name: "base_unit",
    value: "",
    sort_order: 10,
  });

  // Users state
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "operator",
  });

  // Authority Priority state
  const [priorities, setPriorities] = useState<string[]>([
    "数仓同步",
    "API推送",
    "Excel导入",
    "手工维护",
  ]);
  const [savingPriority, setSavingPriority] = useState(false);

  const loadEnums = async () => {
    try {
      const res: any = await getEnumConfigsApi(enumDomain || undefined);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setEnums(list);
    } catch (err) {
      console.error("加载枚举字典失败:", err);
      setEnums([]);
    }
  };

  const loadUsers = async () => {
    try {
      const res: any = await getUsersAdminApi();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setUsers(list);
    } catch (err) {
      console.error("加载用户列表失败:", err);
      setUsers([]);
    }
  };

  const loadConfigs = async () => {
    try {
      const res: any = await getAppConfigsApi();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const pCfg = list.find((c: any) => c?.key === "source_priority");
      if (pCfg && Array.isArray(pCfg.value)) {
        setPriorities(pCfg.value);
      }
    } catch (err) {
      console.error("加载系统配置失败:", err);
    }
  };


  useEffect(() => {
    if (activeTab === "enums") loadEnums();
    if (activeTab === "users") loadUsers();
    if (activeTab === "priority") loadConfigs();
  }, [activeTab, enumDomain]);

  // Enum handlers
  const handleAddEnum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnum.value.trim()) return;
    try {
      await createEnumConfigApi(newEnum);
      setFeedback({ type: "success", text: `成功添加枚举项: ${newEnum.value}` });
      setIsAddEnumOpen(false);
      setNewEnum({ domain: "product", field_name: "base_unit", value: "", sort_order: 10 });
      loadEnums();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.response?.data?.message || "添加枚举项失败" });
    }
  };

  const handleToggleEnum = async (item: EnumConfig) => {
    try {
      await updateEnumConfigApi(item.id, { is_enabled: !item.is_enabled });
      loadEnums();
    } catch (err) {
      console.error("更新枚举状态失败:", err);
    }
  };

  const handleDeleteEnum = async (id: number) => {
    if (!confirm("确定删除该枚举字典项？")) return;
    try {
      await deleteEnumConfigApi(id);
      setFeedback({ type: "success", text: "已删除枚举字典项" });
      loadEnums();
    } catch (err) {
      console.error("删除枚举失败:", err);
    }
  };

  // User handlers
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    try {
      await createUserAdminApi(newUser);
      setFeedback({ type: "success", text: `成功创建账号: ${newUser.username}` });
      setIsAddUserOpen(false);
      setNewUser({ username: "", password: "", role: "operator" });
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.response?.data?.message || "创建用户失败" });
    }
  };

  const handleToggleUserStatus = async (user: UserAdmin) => {
    try {
      await updateUserAdminApi(user.id, { is_enabled: !user.is_enabled });
      setFeedback({ type: "success", text: `已更新账号 [${user.username}] 状态` });
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.response?.data?.message || "更新用户状态失败" });
    }
  };

  // Priority handlers
  const movePriority = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= priorities.length) return;
    const copy = [...priorities];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setPriorities(copy);
  };

  const handleSavePriority = async () => {
    setSavingPriority(true);
    try {
      await updateAppConfigApi("source_priority", priorities, "全系统权威源写入合并优先级顺序");
      setFeedback({ type: "success", text: "权威源写入优先级配置已成功更新并生效" });
    } catch (err) {
      setFeedback({ type: "error", text: "保存配置失败" });
    } finally {
      setSavingPriority(false);
    }
  };

  return (
    <PageContainer
      title="系统基础设置 (System Settings)"
      description="枚举字典集中管理、用户账号与角色权限矩阵配置，以及权威源写入合并优先级设定。"
    >
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-5">
          <button
            onClick={() => setActiveTab("enums")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "enums" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            枚举字典配置
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "users" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            用户与权限管理 (RBAC)
          </button>
          <button
            onClick={() => setActiveTab("priority")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "priority" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            权威源优先级配置
          </button>
        </div>

        {/* Tab 1: Enum Configs */}
        {activeTab === "enums" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">领域过滤:</span>
                <select
                  value={enumDomain}
                  onChange={(e) => setEnumDomain(e.target.value)}
                  className="h-8 text-xs border border-slate-200 rounded px-2 bg-white"
                >
                  <option value="">全部领域</option>
                  <option value="product">货品领域 (product)</option>
                  <option value="mechanism">机制领域 (mechanism)</option>
                  <option value="mechanism_item">明细领域 (mechanism_item)</option>
                </select>
              </div>
              <Button size="sm" onClick={() => setIsAddEnumOpen(true)} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-3.5 h-3.5" />
                新增枚举项
              </Button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>领域</TableHead>
                    <TableHead>绑定字段 (Field Name)</TableHead>
                    <TableHead>枚举值 (Value)</TableHead>
                    <TableHead>排序序号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(enums || []).map((item) => (
                    <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">

                      <TableCell>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.domain}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-800">{item.field_name}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{item.value}</TableCell>
                      <TableCell className="font-mono text-slate-500">{item.sort_order}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleEnum(item)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            item.is_enabled
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {item.is_enabled ? "启用" : "已禁用"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEnum(item.id)}
                          className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500">
                支持管理平台操作员、数据管理员以及下游供数系统专用的 API Key 账号。
              </span>
              <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-3.5 h-3.5" />
                新增系统账号
              </Button>
            </div>

            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>用户 ID</TableHead>
                    <TableHead>登录用户名</TableHead>
                    <TableHead>角色矩阵身份</TableHead>
                    <TableHead>账号状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users || []).map((u) => (
                    <TableRow key={u.id} className="text-xs hover:bg-slate-50/80">

                      <TableCell className="font-mono text-slate-400">#{u.id}</TableCell>
                      <TableCell className="font-bold text-slate-900">{u.username}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.role === "admin"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : u.role === "operator"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {u.role === "admin"
                            ? "数据管理员 (admin)"
                            : u.role === "operator"
                            ? "业务运营 (operator)"
                            : "开放API对接 (api)"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.is_enabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {u.is_enabled ? "正常有效" : "已禁用"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(u)}
                          className="h-7 text-xs"
                        >
                          {u.is_enabled ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <UserX className="w-3 h-3" /> 禁用
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> 启用
                            </span>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab 3: Authority Priority */}
        {activeTab === "priority" && (
          <div className="max-w-xl mx-auto py-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800 block mb-1">权威源写入合并策略说明：</span>
              当多个数据渠道同时存在对同一货品/机制的更新时，排在最上方的渠道拥有绝对覆盖权；低优先级通道写入将被自动跳过并留痕。
              另外支持<span className="text-blue-600 font-semibold">「手工维护保护」</span>与
              <span className="text-blue-600 font-semibold">「非空保护」</span>（上游空值不冲刷已有值）。
            </div>

            <div className="space-y-3">
              {(priorities || []).map((item, idx) => (
                <div

                  key={item}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900">{item}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {idx === 0
                          ? "(最高优先级权威基准)"
                          : idx === priorities.length - 1
                          ? "(最低优先级补充)"
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => movePriority(idx, -1)}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={idx === priorities.length - 1}
                      onClick={() => movePriority(idx, 1)}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSavePriority}
                disabled={savingPriority}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingPriority ? "正在保存..." : "保存并应用权威源配置"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Enum Dialog */}
      <Dialog open={isAddEnumOpen} onOpenChange={setIsAddEnumOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增枚举字典项</DialogTitle>
            <DialogDescription>为指定业务字段添加合法的枚举取值约束。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEnum} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">所属数据领域</label>
              <select
                value={newEnum.domain}
                onChange={(e) => setNewEnum({ ...newEnum, domain: e.target.value })}
                className="w-full h-8 text-xs border border-slate-200 rounded px-2 bg-white"
              >
                <option value="product">货品领域 (product)</option>
                <option value="mechanism">机制领域 (mechanism)</option>
                <option value="mechanism_item">明细领域 (mechanism_item)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">绑定字段标识</label>
              <Input
                value={newEnum.field_name}
                onChange={(e) => setNewEnum({ ...newEnum, field_name: e.target.value })}
                placeholder="例如: base_unit / sample_type / kit_type"
                className="h-8 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">枚举文本取值</label>
              <Input
                value={newEnum.value}
                onChange={(e) => setNewEnum({ ...newEnum, value: e.target.value })}
                placeholder="例如: 体验装 / S促 / 盒"
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">排序权重 (数字越小越靠前)</label>
              <Input
                type="number"
                value={newEnum.sort_order}
                onChange={(e) => setNewEnum({ ...newEnum, sort_order: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddEnumOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                确认新增
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建系统账号</DialogTitle>
            <DialogDescription>创建新的管理员、运营或下游对接 API 账号。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">用户名</label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="英文字母/数字..."
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">初始密码</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="至少6位密码..."
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">角色权限</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full h-8 text-xs border border-slate-200 rounded px-2 bg-white"
              >
                <option value="operator">业务运营 (operator) - 负责产品与机制日常维护</option>
                <option value="admin">数据管理员 (admin) - 全系统管理与同步审批权限</option>
                <option value="api">开放接口账号 (api) - 专供下游系统只读调用 Open API</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                确认创建
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
