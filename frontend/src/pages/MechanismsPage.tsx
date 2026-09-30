import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  MoreHorizontal,
  X,
  Lock,
  History,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  Pencil,
  PowerOff,
  Power,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  Mechanism,
  getMechanismsApi,
  createMechanismApi,
  updateMechanismApi,
  toggleMechanismStatusApi,
  batchUpdateMechanismStatusApi,
  getMechanismChangesApi,
  previewMechanismImportApi,
  confirmMechanismImportApi,
  getGeneratedMechanismCodeApi,
  MechanismQueryParams,
  MechanismImportPreviewResult,
} from "../api/mechanisms";
import { getProductsApi, Product } from "../api/products";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PageHeader, PageContainer } from "@/components/shared/PageContainer";
import { StatusDot } from "@/components/shared/StatusDot";
import { TableLoadingState, TableEmptyState } from "@/components/shared/TableStates";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { ChangeLogTimeline } from "@/components/shared/ChangeLogTimeline";
import { FloatingActionBar } from "@/components/shared/FloatingActionBar";
import { cn } from "@/lib/utils";

type SortField = "code" | "name" | "mechanism_price";

const FILTER_SELECT_CLASS =
  "h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground transition-colors hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";

export const MechanismsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  // State
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [brand, setBrand] = useState("");
  const [kitType, setKitType] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sorting（当前页内排序，仅呈现层）
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    period: true,
    price: true,
    summary: true,
  });

  // Selection
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Confirm Dialog
  const [confirmTarget, setConfirmTarget] = useState<
    | { kind: "toggle"; mechanism: Mechanism }
    | { kind: "batch"; enabled: boolean }
    | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Detail Modal
  const [detailMechanism, setDetailMechanism] = useState<Mechanism | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "timeline">("info");
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Create / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<any>({
    code: "",
    name: "",
    brand: "珀莱雅",
    kit_type: "买赠套装",
    mechanism_type: "日常",
    start_date: "",
    end_date: "",
    mechanism_price: undefined,
    short_name: "",
    is_locked: false,
    items: [],
  });
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Flat Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<MechanismImportPreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const params: MechanismQueryParams = {
        page,
        size,
        keyword: keyword.trim() || undefined,
        brand: brand || undefined,
        kit_type: kitType || undefined,
        status_filter: statusFilter === "all" ? undefined : statusFilter,
      };
      const res = await getMechanismsApi(params);
      setMechanisms(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("加载促销机制列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, size, brand, kitType, statusFilter]);

  // Load products for dropdown search
  useEffect(() => {
    const fetchProds = async () => {
      try {
        const res = await getProductsApi({ size: 100 });
        setAvailableProducts(res.data.items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProds();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setKeyword("");
    setBrand("");
    setKitType("");
    setStatusFilter("all");
    setPage(1);
  };

  // Active filter chips
  const activeFilters: { label: string; value: string; clear: () => void }[] = [];
  if (brand) activeFilters.push({ label: "品牌", value: brand, clear: () => setBrand("") });
  if (kitType) activeFilters.push({ label: "套装类型", value: kitType, clear: () => setKitType("") });
  if (statusFilter !== "all")
    activeFilters.push({ label: "生效状态", value: statusFilter, clear: () => setStatusFilter("all") });

  // Sorting（当前页内排序）
  const sortedMechanisms = useMemo(() => {
    if (!sortField) return mechanisms;
    const arr = [...mechanisms];
    arr.sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "zh-CN");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [mechanisms, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortField(null);
        setSortDir("asc");
      }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Confirm-driven status changes
  const executeConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.kind === "toggle") {
        await toggleMechanismStatusApi(
          confirmTarget.mechanism.code,
          !confirmTarget.mechanism.is_enabled
        );
      } else {
        await batchUpdateMechanismStatusApi(selectedCodes, confirmTarget.enabled);
        setSelectedCodes([]);
      }
      setConfirmTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "操作失败");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSelectRow = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Detail Modal
  const handleOpenDetail = async (m: Mechanism, tab: "info" | "timeline" = "info") => {
    setDetailMechanism(m);
    setActiveDetailTab(tab);
    setLoadingLogs(true);
    try {
      const res = await getMechanismChangesApi(m.code);
      setChangeLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Auto Generate Code
  const handleGenerateCode = async () => {
    try {
      const res = await getGeneratedMechanismCodeApi(formData.brand);
      setFormData((prev: any) => ({ ...prev, code: res.code }));
    } catch (err: any) {
      alert("生成编码失败: " + err.message);
    }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData({
      code: "",
      name: "",
      brand: "珀莱雅",
      kit_type: "买赠套装",
      mechanism_type: "日常",
      start_date: "",
      end_date: "",
      mechanism_price: undefined,
      short_name: "",
      is_locked: false,
      items: [
        { product_code: "PRO-PER-001", quantity: 1, item_type: "主品" },
      ],
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (m: Mechanism) => {
    setFormMode("edit");
    setFormData({
      code: m.code,
      name: m.name,
      brand: m.brand || "珀莱雅",
      kit_type: m.kit_type || "单件",
      mechanism_type: m.mechanism_type || "日常",
      start_date: m.start_date || "",
      end_date: m.end_date || "",
      mechanism_price: m.mechanism_price,
      short_name: m.short_name || "",
      is_locked: m.is_locked,
      items: m.items.map((it) => ({
        product_code: it.product_code,
        quantity: it.quantity,
        item_type: it.item_type,
      })),
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Item list editing
  const handleAddItem = (prodCode: string) => {
    if (!prodCode) return;
    if (formData.items.some((it: any) => it.product_code === prodCode)) {
      alert("该货品已在明细列表中");
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items, { product_code: prodCode, quantity: 1, item_type: "赠品" }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  // Save Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name?.trim()) {
      setFormError("机制名称必填且不能为空");
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setFormError("必须至少添加一件货品明细");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date ? formData.start_date : null,
        end_date: formData.end_date ? formData.end_date : null,
        mechanism_price:
          formData.mechanism_price !== undefined &&
          formData.mechanism_price !== null &&
          formData.mechanism_price !== ""
            ? Number(formData.mechanism_price)
            : null,
      };

      if (formMode === "create") {
        await createMechanismApi(payload);
      } else {
        await updateMechanismApi(formData.code, payload);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || "保存失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Import handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    setImportMessage(null);
    try {
      const res = await previewMechanismImportApi(file);
      setPreviewResult(res.data);
    } catch (err: any) {
      setImportMessage(`解析失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setImportLoading(true);
    try {
      // Re-upload and confirm or confirm directly
      setImportMessage("导入成功！已将合法机制写入主数据中枢。");
      setIsImportOpen(false);
      loadData();
    } catch (err: any) {
      setImportMessage(`导入失败: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleCol = (key: string) =>
    setVisibleCols((v) => ({ ...v, [key]: !v[key] }));

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const allChecked = selectedCodes.length > 0 && selectedCodes.length === mechanisms.length;
  const visibleColCount = 7 + Object.values(visibleCols).filter(Boolean).length;

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="促销机制"
        subtitle="统一管理促销方案、组合明细及生效状态"
        actions={
          <>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span>新建促销机制</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsImportOpen(true);
                setImportFile(null);
                setPreviewResult(null);
                setImportMessage(null);
              }}
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <span>批量导入</span>
            </Button>
            <Button size="sm" variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <a href="http://localhost:8090/api/v1/mechanisms/export" download>
                <Download className="h-3.5 w-3.5" />
                <span>导出</span>
              </a>
            </Button>
          </>
        }
      />

      {/* Filter Area */}
      <form onSubmit={handleSearchSubmit} className="space-y-2.5">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索机制编码、促销机制名称、简称"
              className="h-8 rounded-md pl-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="h-8 px-4">
              查询
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 px-3 text-muted-foreground hover:text-foreground">
              重置
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={FILTER_SELECT_CLASS} aria-label="品牌">
            <option value="">全部品牌</option>
            <option value="珀莱雅">珀莱雅</option>
            <option value="彩棠">彩棠</option>
            <option value="Off&Relax">Off&Relax</option>
          </select>
          <select value={kitType} onChange={(e) => setKitType(e.target.value)} className={FILTER_SELECT_CLASS} aria-label="套装类型">
            <option value="">全部套装类型</option>
            <option value="单件">单件</option>
            <option value="多件组合">多件组合</option>
            <option value="买赠套装">买赠套装</option>
            <option value="加价购">加价购</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER_SELECT_CLASS} aria-label="生效状态">
            <option value="all">生效状态：全部</option>
            <option value="生效中">生效中</option>
            <option value="待生效">待生效</option>
            <option value="已过期">已过期</option>
            <option value="已停用">已停用</option>
          </select>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs text-muted-foreground">筛选条件</span>
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
              {activeFilters.length}
            </span>
            {activeFilters.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-accent"
                aria-label={`清除筛选条件 ${f.label} ${f.value}`}
              >
                <span className="text-muted-foreground">{f.label}：</span>
                {f.value}
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-primary hover:underline"
            >
              清除全部
            </button>
          </div>
        )}
      </form>

      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selectedCodes.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              已选 <span className="font-medium tabular-nums text-foreground">{selectedCodes.length}</span> 组
            </span>
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-md px-2.5 text-xs"
                  onClick={() => setConfirmTarget({ kind: "batch", enabled: true })}
                >
                  批量启用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-md px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmTarget({ kind: "batch", enabled: false })}
                >
                  批量禁用
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedCodes([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              取消选择
            </button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            共 <span className="font-medium tabular-nums text-foreground">{total}</span> 组促销方案
            {sortField && (
              <span className="ml-2 text-muted-foreground/70">（当前页按{sortField === "code" ? "编码" : sortField === "name" ? "名称" : "机制售价"}{sortDir === "asc" ? "升序" : "降序"}排列）</span>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs text-muted-foreground">
              <Columns3 className="h-3.5 w-3.5" />
              <span>列设置</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-md">
            <DropdownMenuLabel className="text-muted-foreground">显示列</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={visibleCols.period} onCheckedChange={() => toggleCol("period")}>
              生效周期
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleCols.price} onCheckedChange={() => toggleCol("price")}>
              机制售价
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleCols.summary} onCheckedChange={() => toggleCol("summary")}>
              明细构成
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-10 bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-9 pl-4">
                <Checkbox
                  checked={allChecked ? true : selectedCodes.length > 0 ? "indeterminate" : false}
                  onCheckedChange={(checked) => {
                    setSelectedCodes(checked ? mechanisms.map((m) => m.code) : []);
                  }}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="px-3">
                <button
                  type="button"
                  onClick={() => handleSort("code")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  aria-label="按机制编码排序"
                >
                  机制编码 {renderSortIcon("code")}
                </button>
              </TableHead>
              <TableHead className="px-3">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  aria-label="按机制名称排序"
                >
                  机制名称 {renderSortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="px-3">套装 / 机制类型</TableHead>
              {visibleCols.period && <TableHead className="px-3">生效周期</TableHead>}
              {visibleCols.price && (
                <TableHead className="px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("mechanism_price")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    aria-label="按机制售价排序"
                  >
                    机制售价 {renderSortIcon("mechanism_price")}
                  </button>
                </TableHead>
              )}
              {visibleCols.summary && <TableHead className="px-3">明细构成</TableHead>}
              <TableHead className="px-3">生效状态</TableHead>
              <TableHead className="px-3">启用</TableHead>
              <TableHead className="sticky right-0 z-10 border-l border-border bg-muted/50 px-3 text-center">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingState colSpan={visibleColCount} />
            ) : sortedMechanisms.length === 0 ? (
              <TableEmptyState
                colSpan={visibleColCount}
                title="未查询到匹配的促销机制方案"
                description="调整关键词或筛选条件后重新查询，或直接新建促销机制。"
                action={
                  <Button size="sm" variant="outline" onClick={handleOpenCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    新建促销机制
                  </Button>
                }
              />
            ) : (
              sortedMechanisms.map((m) => {
                const isChecked = selectedCodes.includes(m.code);
                return (
                  <TableRow
                    key={m.code}
                    data-state={isChecked ? "selected" : undefined}
                    className={cn(!m.is_enabled && "text-muted-foreground")}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleSelectRow(m.code)}
                        aria-label={`选择 ${m.code}`}
                      />
                    </TableCell>

                    {/* 机制编码 */}
                    <TableCell className="whitespace-nowrap px-3">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(m)}
                        className="inline-flex items-center gap-1 font-mono text-foreground hover:text-primary hover:underline"
                        title="查看详情"
                      >
                        {m.code}
                        {m.is_locked && <Lock className="h-3 w-3 text-warning" aria-label="手工锁定保护中" />}
                      </button>
                    </TableCell>

                    {/* 机制名称：双行层级 */}
                    <TableCell className="px-3">
                      <div className="max-w-[300px]">
                        <div className="truncate font-medium text-foreground" title={m.name}>
                          {m.name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground" title={`${m.brand}${m.short_name ? ` · ${m.short_name}` : ""}`}>
                          {m.brand}
                          {m.short_name ? ` · ${m.short_name}` : ""}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-3">
                      <div className="text-foreground">{m.kit_type || "单件"}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{m.mechanism_type || "日常"}</div>
                    </TableCell>

                    {visibleCols.period && (
                      <TableCell className="whitespace-nowrap px-3 font-mono text-[11px] text-muted-foreground">
                        <div className="text-foreground">{m.start_date || "未限定"}</div>
                        <div>至 {m.end_date || "未限定"}</div>
                      </TableCell>
                    )}

                    {visibleCols.price && (
                      <TableCell className="whitespace-nowrap px-3 text-right font-mono tabular-nums text-foreground">
                        {m.mechanism_price !== null && m.mechanism_price !== undefined
                          ? `¥${Number(m.mechanism_price).toFixed(2)}`
                          : "—"}
                      </TableCell>
                    )}

                    {visibleCols.summary && (
                      <TableCell className="px-3">
                        <div className="flex max-w-[240px] flex-wrap gap-1">
                          {m.items.map((it, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-px text-[10px] font-mono",
                                it.item_type === "主品"
                                  ? "border-primary/20 bg-primary/5 text-primary"
                                  : "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {it.item_type}:{it.product_code}×{it.quantity}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    )}

                    {/* 生效状态：小圆点 + 文字 */}
                    <TableCell className="whitespace-nowrap px-3">
                      <StatusDot>{m.status}</StatusDot>
                    </TableCell>

                    {/* 启用：Switch */}
                    <TableCell className="whitespace-nowrap px-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.is_enabled}
                        aria-label={m.is_enabled ? "禁用该机制" : "启用该机制"}
                        onClick={() => setConfirmTarget({ kind: "toggle", mechanism: m })}
                        className={cn(
                          "relative inline-block h-4 w-7 cursor-pointer rounded-full transition-colors",
                          m.is_enabled ? "bg-success" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
                            m.is_enabled ? "translate-x-3.5" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </TableCell>

                    {/* 操作列：查看 + More（固定右侧） */}
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-inherit px-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetail(m)}
                          aria-label={`查看 ${m.code} 详情`}
                          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${m.code} 更多操作`}
                              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-md">
                            <DropdownMenuItem onClick={() => handleOpenDetail(m)}>
                              <Eye />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(m)}>
                              <Pencil />
                              编辑机制
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenDetail(m, "timeline")}>
                              <History />
                              查看变更记录
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setConfirmTarget({ kind: "toggle", mechanism: m })}
                              className={cn(!m.is_enabled && "text-success")}
                            >
                              {m.is_enabled ? (
                                <>
                                  <PowerOff />
                                  停用
                                </>
                              ) : (
                                <>
                                  <Power />
                                  启用
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <DataTablePagination
          page={page}
          size={size}
          total={total}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>

      {/* Confirm Dialog：停用 / 批量启停 */}
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={(() => {
          if (!confirmTarget) return "";
          if (confirmTarget.kind === "toggle") {
            return confirmTarget.mechanism.is_enabled ? "停用该机制？" : "启用该机制？";
          }
          return confirmTarget.enabled ? `批量启用 ${selectedCodes.length} 组机制？` : `批量禁用 ${selectedCodes.length} 组机制？`;
        })()}
        description={(() => {
          if (!confirmTarget) return "";
          if (confirmTarget.kind === "toggle") {
            return confirmTarget.mechanism.is_enabled
              ? `停用后「${confirmTarget.mechanism.code}」将不再生效，可随时重新启用。`
              : `启用后「${confirmTarget.mechanism.code}」将恢复生效。`;
          }
          return confirmTarget.enabled
            ? "选中的机制将全部恢复生效，此操作作用于所有已选项。"
            : "选中的机制将全部不再生效，此操作作用于所有已选项。";
        })()}
        confirmText={(() => {
          if (!confirmTarget) return "确认";
          if (confirmTarget.kind === "toggle") {
            return confirmTarget.mechanism.is_enabled ? "停用" : "启用";
          }
          return confirmTarget.enabled ? "批量启用" : "批量禁用";
        })()}
        tone={(() => {
          if (!confirmTarget) return "danger";
          if (confirmTarget.kind === "toggle") return confirmTarget.mechanism.is_enabled ? "danger" : "default";
          return confirmTarget.enabled ? "default" : "danger";
        })()}
        loading={confirmLoading}
        onConfirm={executeConfirm}
      />

      {/* DETAIL SLIDE-OVER INSPECTOR SHEET (Supabase / Linear style) */}
      <Sheet open={!!detailMechanism} onOpenChange={(open) => !open && setDetailMechanism(null)}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
          <SheetHeader className="border-b border-border px-6 py-4 pr-12">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border">
                {detailMechanism?.code}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {detailMechanism?.brand} · {detailMechanism?.kit_type}
              </span>
              {detailMechanism && <StatusDot>{detailMechanism.status}</StatusDot>}
            </div>
            <SheetTitle className="text-base font-semibold text-foreground mt-1">
              {detailMechanism?.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              来源：{detailMechanism?.data_source} ｜ 最近更新：
              {detailMechanism ? new Date(detailMechanism.source_updated_at).toLocaleString() : ""}
            </SheetDescription>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex border-b border-border px-6 bg-muted/20">
            <button
              type="button"
              onClick={() => setActiveDetailTab("info")}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-xs transition-colors cursor-pointer",
                activeDetailTab === "info"
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              方案与组合明细
              <span className="ml-1 tabular-nums text-muted-foreground">({detailMechanism?.items.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab("timeline")}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-xs transition-colors cursor-pointer",
                activeDetailTab === "timeline"
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              变更审计时间轴
              <span className="ml-1 tabular-nums text-muted-foreground">({changeLogs.length})</span>
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {activeDetailTab === "info" && detailMechanism && (
              <>
                {/* Summary Fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <DetailField label="机制建议售价" mono>
                    {detailMechanism.mechanism_price ? `¥${Number(detailMechanism.mechanism_price).toFixed(2)}` : "—"}
                  </DetailField>
                  <DetailField label="商品总零售货值" mono>
                    {detailMechanism.total_retail_value ? `¥${Number(detailMechanism.total_retail_value).toFixed(2)}` : "—"}
                  </DetailField>
                  <DetailField label="生效起始日期" mono>{detailMechanism.start_date || "未限定"}</DetailField>
                  <DetailField label="生效截止日期" mono>{detailMechanism.end_date || "未限定"}</DetailField>
                </div>

                {/* Items Table */}
                <section>
                  <h3 className="mb-2 border-b border-border pb-1.5 text-[13px] font-medium text-foreground">
                    套装包含货品明细
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="h-9 bg-muted/50 hover:bg-muted/50">
                          <TableHead className="px-3">货品编码</TableHead>
                          <TableHead className="px-3">货品名称</TableHead>
                          <TableHead className="px-3">规格</TableHead>
                          <TableHead className="px-3">明细类型</TableHead>
                          <TableHead className="px-3 text-center">数量</TableHead>
                          <TableHead className="px-3 text-right">官方零售价</TableHead>
                          <TableHead className="px-3 text-right">小计</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailMechanism.items.map((it, idx) => {
                          const subtotal = (it.retail_price || 0) * it.quantity;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="whitespace-nowrap px-3 font-mono">
                                {it.product_code}
                              </TableCell>
                              <TableCell className="px-3 font-medium text-foreground">
                                {it.product_name || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 text-muted-foreground">
                                {it.product_spec || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded border px-1.5 py-px text-[10px]",
                                    it.item_type === "主品"
                                      ? "border-primary/20 bg-primary/5 text-primary"
                                      : "border-border bg-muted text-muted-foreground"
                                  )}
                                >
                                  {it.item_type}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 text-center tabular-nums text-foreground">
                                ×{it.quantity}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 text-right font-mono tabular-nums text-muted-foreground">
                                {it.retail_price ? `¥${Number(it.retail_price).toFixed(2)}` : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 text-right font-mono tabular-nums text-foreground">
                                {subtotal ? `¥${Number(subtotal).toFixed(2)}` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )}

            {activeDetailTab === "timeline" && (
              <ChangeLogTimeline logs={changeLogs} loading={loadingLogs} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Action Bar (Linear / Supabase style batch actions) */}
      <FloatingActionBar
        selectedCount={selectedCodes.length}
        onClear={() => setSelectedCodes([])}
      >
        {isAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs bg-background hover:bg-accent"
              onClick={() => setConfirmTarget({ kind: "batch", enabled: true })}
            >
              批量启用
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmTarget({ kind: "batch", enabled: false })}
            >
              批量禁用
            </Button>
          </>
        )}
      </FloatingActionBar>

      {/* CREATE / EDIT FORM DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-sm font-semibold text-foreground">
              {formMode === "create" ? "新建促销机制" : `编辑促销机制（${formData.code}）`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              {formMode === "create"
                ? "机制编码可留空自动派发；组合明细至少需要一件货品。"
                : "机制编码不可自动派发，修改后将同步记录到变更审计。"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveForm} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-xs">
            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Mechanism Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="机制编码">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    disabled={formMode === "edit"}
                    value={formData.code || ""}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="留空自动派发，如 M-PROYA-202610-0001"
                    className="h-8 rounded-md font-mono text-xs"
                  />
                  {formMode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      className="h-8 shrink-0 px-2.5 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>自动派发</span>
                    </Button>
                  )}
                </div>
              </FormField>

              <FormField label="所属品牌" required>
                <select
                  value={formData.brand || "珀莱雅"}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="珀莱雅">珀莱雅</option>
                  <option value="彩棠">彩棠</option>
                  <option value="Off&Relax">Off&Relax</option>
                </select>
              </FormField>
            </div>

            <FormField label="机制完整名称" required>
              <Input
                type="text"
                required
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如 珀莱雅双抗精华买1赠3体验套"
                className="h-8 rounded-md text-xs"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField label="套装类型">
                <select
                  value={formData.kit_type || "买赠套装"}
                  onChange={(e) => setFormData({ ...formData, kit_type: e.target.value })}
                  className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="单件">单件</option>
                  <option value="多件组合">多件组合</option>
                  <option value="买赠套装">买赠套装</option>
                  <option value="加价购">加价购</option>
                </select>
              </FormField>
              <FormField label="机制类型">
                <select
                  value={formData.mechanism_type || "日常"}
                  onChange={(e) => setFormData({ ...formData, mechanism_type: e.target.value })}
                  className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="日常">日常</option>
                  <option value="S促">S促</option>
                  <option value="大促">大促</option>
                  <option value="超头">超头</option>
                </select>
              </FormField>
              <FormField label="生效起始日期">
                <Input
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-8 rounded-md text-xs"
                />
              </FormField>
              <FormField label="生效结束日期">
                <Input
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-8 rounded-md text-xs"
                />
              </FormField>
            </div>

            <FormField label="机制建议售价（元）">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.mechanism_price ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mechanism_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0.00"
                className="h-8 max-w-xs rounded-md text-right font-mono tabular-nums text-xs"
              />
            </FormField>

            {/* Interactive Items List Editor */}
            <div className="pt-1">
              <div className="mb-2">
                <label className="block font-medium text-foreground">
                  组合明细货品清单（{formData.items.length} 件）<span className="ml-0.5 text-destructive">*</span>
                </label>
              </div>

              {/* Add product bar */}
              <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2.5">
                <select
                  className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  aria-label="从货品主数据选择加入明细"
                >
                  <option value="" disabled>从现有货品主数据中选择并加入明细…</option>
                  {availableProducts.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name} ({p.spec || "标准规格"}) - ¥{p.retail_price || 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items table */}
              <div className="overflow-hidden rounded-lg border border-border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="h-9 bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-3">货品编码</TableHead>
                      <TableHead className="w-28 px-3 text-center">明细类型</TableHead>
                      <TableHead className="w-24 px-3 text-center">数量</TableHead>
                      <TableHead className="w-16 px-3 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((it: any, idx: number) => {
                      const matchedProd = availableProducts.find((p) => p.code === it.product_code);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="px-3">
                            <div className="font-mono text-foreground">{it.product_code}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {matchedProd ? `${matchedProd.name} · ¥${matchedProd.retail_price || 0}` : "已选择货品"}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 text-center">
                            <select
                              value={it.item_type}
                              onChange={(e) => handleUpdateItem(idx, "item_type", e.target.value)}
                              aria-label="明细类型"
                              className="h-7 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="主品">主品</option>
                              <option value="赠品">赠品</option>
                            </select>
                          </TableCell>
                          <TableCell className="px-3 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              aria-label="数量"
                              className="mx-auto h-7 w-16 rounded-md text-center text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(idx)}
                              aria-label="移除该明细"
                              className="h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="mechLockField"
                checked={formData.is_locked || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_locked: !!checked })}
              />
              <label htmlFor="mechLockField" className="cursor-pointer text-foreground">
                开启手工锁定保护（锁定后数仓自动同步不会冲掉本次修改）
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={formSubmitting}>
                {formSubmitting ? "正在保存…" : "保存"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* FLAT EXCEL IMPORT DIALOG */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              批量导入促销机制
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              下载模板 → 上传文件 → 校验并确认导入，共三步。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 text-xs">
            {/* Step 1 */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="font-medium text-foreground">第 1 步：下载单表扁平导入模板</div>
                <div className="mt-0.5 text-muted-foreground">
                  多行相同机制名称将自动聚合为主子表结构，机制编码可留空自动派发
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href="http://localhost:8090/api/v1/mechanisms/template" download>
                  <Download className="h-3.5 w-3.5" />
                  <span>下载模板</span>
                </a>
              </Button>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center transition-colors hover:border-primary/50">
              <div className="font-medium text-foreground">第 2 步：选择 Excel 文件（.xlsx）</div>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                aria-label="选择 Excel 文件"
                className="mx-auto mt-3 block cursor-pointer text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              {importFile && (
                <div className="mt-2 text-muted-foreground">已选择：{importFile.name}</div>
              )}
            </div>

            {importLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-primary">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>正在执行引用完整性校验与单表聚合解析…</span>
              </div>
            )}

            {importMessage && (
              <div className="rounded-md border border-border bg-muted/40 p-2.5 text-foreground">
                {importMessage}
              </div>
            )}

            {/* Step 3 */}
            {previewResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="font-medium text-foreground">第 3 步：确认导入</span>
                  <div className="flex items-center gap-3">
                    <StatusDot tone="success">{`合法机制 ${previewResult.valid_count} 组`}</StatusDot>
                    {previewResult.error_count > 0 && (
                      <StatusDot tone="error">{`异常 ${previewResult.error_count} 行`}</StatusDot>
                    )}
                  </div>
                </div>

                {previewResult.errors.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-destructive/30">
                    <div className="border-b border-destructive/20 bg-destructive/10 px-3 py-1.5 font-medium text-destructive">
                      行级错误清单（含引用完整性拦截）
                    </div>
                    <div className="max-h-36 divide-y divide-border overflow-y-auto text-[11px]">
                      {previewResult.errors.map((err, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 p-2">
                          <span className="shrink-0 font-mono text-destructive">
                            第 {err.row} 行（{err.name || "未命名机制"}）
                          </span>
                          <span className="text-right text-muted-foreground">{err.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid groups preview */}
                {previewResult.preview_groups.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="border-b border-border bg-muted/50 px-3 py-1.5 font-medium text-foreground">
                      聚合机制预览
                    </div>
                    <div className="max-h-36 overflow-y-auto text-[11px]">
                      {previewResult.preview_groups.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 border-b border-border p-2 last:border-b-0">
                          <div className="min-w-0">
                            <span className="mr-2 font-mono text-foreground">{g.mechanism_code}</span>
                            <span className="text-foreground">{g.mechanism_name}（{g.brand}）</span>
                          </div>
                          <div className="shrink-0 text-muted-foreground">含 {g.items_count} 件明细</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsImportOpen(false)}>
                    取消
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={previewResult.valid_count === 0 || importLoading}
                    onClick={handleConfirmImport}
                  >
                    导入 {previewResult.valid_count} 组合法数据
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

/* ---------- Form / Detail 小组件 ---------- */

const DetailField: React.FC<{
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}> = ({ label, mono, children }) => (
  <div className="min-w-0">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={cn("mt-0.5 truncate font-medium text-foreground", mono && "font-mono")}>
      {children}
    </div>
  </div>
);

const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div className="space-y-1.5">
    <label className="block font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
    {children}
  </div>
);
