import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  AlertCircle,
  FileSpreadsheet,
  X,
  Lock,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Product,
  getProductsApi,
  createProductApi,
  updateProductApi,
  batchUpdateProductStatusApi,
  getProductChangesApi,
  previewProductImportApi,
  confirmProductImportApi,
  ChangeLogItem,
  ImportPreviewResult,
  ProductQueryParams,
} from "../api/products";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [saleStage, setSaleStage] = useState("");
  const [source, setSource] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<string>("all");

  // Selection
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Modals
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "timeline">("info");
  const [changeLogs, setChangeLogs] = useState<ChangeLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Create / Edit Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<Partial<Product>>({
    code: "",
    name: "",
    brand: "珀莱雅",
    spec: "",
    base_unit: "瓶",
    short_name: "",
    product_category: "护肤",
    category_sub: "精华",
    retail_price: 0,
    nickname: "",
    version: "",
    series: "",
    sample_type: "正品",
    status: "正常",
    carton_spec: "",
    sale_stage: "在售",
    needs_maintenance: "否",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Load Products
  const loadData = async () => {
    setLoading(true);
    try {
      const params: ProductQueryParams = {
        page,
        size,
        keyword: keyword.trim() || undefined,
        brand: brand || undefined,
        product_category: category || undefined,
        status: status || undefined,
        sale_stage: saleStage || undefined,
        data_source: source || undefined,
        is_enabled: enabledFilter === "all" ? undefined : enabledFilter === "enabled",
      };
      const res = await getProductsApi(params);
      setProducts(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("加载货品列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, size, brand, category, status, saleStage, source, enabledFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setKeyword("");
    setBrand("");
    setCategory("");
    setStatus("");
    setSaleStage("");
    setSource("");
    setEnabledFilter("all");
    setPage(1);
  };

  // Toggle single status
  const handleToggleStatus = async (product: Product) => {
    try {
      await batchUpdateProductStatusApi([product.code], !product.is_enabled);
      loadData();
    } catch (err: any) {
      alert(err.message || "切换状态失败");
    }
  };

  // Batch Toggle
  const handleBatchStatus = async (enabled: boolean) => {
    if (selectedCodes.length === 0) return;
    try {
      await batchUpdateProductStatusApi(selectedCodes, enabled);
      setSelectedCodes([]);
      loadData();
    } catch (err: any) {
      alert(err.message || "批量更新失败");
    }
  };

  // Detail Modal Open
  const handleOpenDetail = async (p: Product) => {
    setDetailProduct(p);
    setActiveDetailTab("info");
    setLoadingLogs(true);
    try {
      const res = await getProductChangesApi(p.code);
      setChangeLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData({
      code: "",
      name: "",
      brand: "珀莱雅",
      spec: "",
      base_unit: "瓶",
      short_name: "",
      product_category: "护肤",
      category_sub: "精华",
      retail_price: undefined,
      nickname: "",
      version: "",
      series: "",
      sample_type: "正品",
      status: "正常",
      carton_spec: "",
      sale_stage: "在售",
      needs_maintenance: "否",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (p: Product) => {
    setFormMode("edit");
    setFormData({ ...p });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name?.trim()) {
      setFormError("货品名称必填且不能为空");
      return;
    }
    if (formMode === "create" && !formData.code?.trim()) {
      setFormError("货品编号必填且不能为空");
      return;
    }

    setFormSubmitting(true);
    try {
      if (formMode === "create") {
        await createProductApi(formData);
      } else {
        await updateProductApi(formData.code!, formData);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "保存失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Import Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    setImportMessage(null);
    try {
      const res = await previewProductImportApi(file);
      setPreviewResult(res.data);
    } catch (err: any) {
      setImportMessage(`解析失败: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || previewResult.valid_records.length === 0) return;
    setImportLoading(true);
    try {
      const res = await confirmProductImportApi(previewResult.valid_records, true);
      setImportMessage(
        `导入完成：成功写入 ${res.data.inserted} 条，更新 ${res.data.updated} 条，跳过 ${res.data.skipped} 条。`
      );
      loadData();
      setTimeout(() => {
        setIsImportOpen(false);
        setImportFile(null);
        setPreviewResult(null);
        setImportMessage(null);
      }, 2000);
    } catch (err: any) {
      setImportMessage(`导入执行失败: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Checkbox select all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCodes(products.map((p) => p.code));
    } else {
      setSelectedCodes([]);
    }
  };

  const handleSelectRow = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Package className="w-5 h-5 text-blue-600" />
            <span>货品主数据工作台</span>
            <Badge variant="secondary" className="font-normal text-slate-600 bg-slate-100 border border-slate-200">
              共 {total} 条权威档案
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            一数一源 ｜ 覆盖21列原始字段 ｜ 多通道写入留痕 ｜ 权威源保护
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/30"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>新建货品</span>
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
            <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>批量导入</span>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a
              href="http://localhost:8090/api/v1/products/export"
              download
            >
              <Download className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>导出 Excel</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索货品编号、货品名称、简称、昵称..."
                className="pl-9 h-9 bg-slate-50 border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/40"
              />
            </div>
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4">
              查询
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent"
            >
              重置
            </Button>
          </form>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1 text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>筛选：</span>
            </div>

            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="">全部品牌</option>
              <option value="珀莱雅">珀莱雅</option>
              <option value="彩棠">彩棠</option>
              <option value="Off&Relax">Off&Relax</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="">全部类目</option>
              <option value="护肤">护肤</option>
              <option value="彩妆">彩妆</option>
              <option value="洗护">洗护</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="">商品状态</option>
              <option value="正常">正常</option>
              <option value="停售">停售</option>
              <option value="淘汰">淘汰</option>
            </select>

            <select
              value={saleStage}
              onChange={(e) => setSaleStage(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="">销售阶段</option>
              <option value="在售">在售</option>
              <option value="新品">新品</option>
              <option value="预售">预售</option>
              <option value="清尾">清尾</option>
            </select>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="">来源渠道</option>
              <option value="数仓同步">数仓同步</option>
              <option value="Excel导入">Excel导入</option>
              <option value="手工维护">手工维护</option>
            </select>

            <select
              value={enabledFilter}
              onChange={(e) => setEnabledFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">启停状态: 全部</option>
              <option value="enabled">仅已启用</option>
              <option value="disabled">仅已禁用</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Batch Operations Bar */}
      {selectedCodes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            已选择 <strong className="text-blue-700">{selectedCodes.length}</strong> 条货品
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleBatchStatus(true)}
                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                批量启用
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBatchStatus(false)}
                className="h-7 px-2.5 text-xs"
              >
                批量禁用
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <Card className="border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCodes.length > 0 && selectedCodes.length === products.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead>货品编号</TableHead>
                <TableHead>货品名称 / 品牌</TableHead>
                <TableHead>类目 / 分类</TableHead>
                <TableHead>规格 / 单位</TableHead>
                <TableHead className="text-right">零售价</TableHead>
                <TableHead className="text-center">商品状态</TableHead>
                <TableHead className="text-center">销售阶段</TableHead>
                <TableHead className="text-center">来源渠道</TableHead>
                <TableHead className="text-center">启用</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>正在检索货品主数据...</span>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>未查询到匹配的货品档案</span>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isChecked = selectedCodes.includes(p.code);
                  return (
                    <TableRow
                      key={p.code}
                      className={!p.is_enabled ? "bg-slate-50/50 opacity-65" : undefined}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(p.code)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </TableCell>

                      <TableCell className="font-mono font-medium text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5"
                        >
                          {p.code}
                          {p.is_locked && (
                            <span title="手工锁定保护中"><Lock className="w-3 h-3 text-amber-500" /></span>
                          )}
                        </button>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.sample_type === "小样" && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              小样
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-slate-600">{p.brand}</span>
                          {p.nickname && <span>· 昵称: {p.nickname}</span>}
                        </div>
                      </TableCell>

                      <TableCell className="text-slate-600 whitespace-nowrap">
                        <div>{p.product_category || "—"}</div>
                        <div className="text-[11px] text-slate-400">{p.category_sub || ""}</div>
                      </TableCell>

                      <TableCell className="text-slate-600 whitespace-nowrap">
                        <div>{p.spec || "—"}</div>
                        <div className="text-[11px] text-slate-400">{p.base_unit || ""}</div>
                      </TableCell>

                      <TableCell className="text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {p.retail_price !== null && p.retail_price !== undefined
                          ? `¥${Number(p.retail_price).toFixed(2)}`
                          : "—"}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={
                            p.status === "正常"
                              ? "success"
                              : p.status === "停售"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[11px]"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${
                            p.sale_stage === "新品"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : p.sale_stage === "在售"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {p.sale_stage || "在售"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] ${
                            p.data_source === "数仓同步"
                              ? "bg-indigo-50 text-indigo-700"
                              : p.data_source === "Excel导入"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {p.data_source}
                        </span>
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          title={p.is_enabled ? "点击禁用" : "点击启用"}
                          className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer inline-block ${
                            p.is_enabled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                              p.is_enabled ? "left-4.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDetail(p)}
                            title="查看详情"
                            className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(p)}
                            title="编辑"
                            className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            显示第 {(page - 1) * size + 1} 至 {Math.min(page * size, total)} 条，共{" "}
            <strong className="text-slate-700">{total}</strong> 条记录
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono text-slate-700 px-2 font-medium">
              第 {page} 页 / 共 {Math.ceil(total / size) || 1} 页
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page * size >= total}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 w-7 bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* DETAIL MODAL WITH AUDIT TIMELINE */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {detailProduct.name}
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-normal">
                      {detailProduct.code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    品牌：{detailProduct.brand} ｜ 来源：{detailProduct.data_source} ｜ 最近更新：
                    {new Date(detailProduct.source_updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDetailProduct(null)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white text-xs font-medium">
              <button
                onClick={() => setActiveDetailTab("info")}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeDetailTab === "info"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>全量档案详情 (21列)</span>
              </button>
              <button
                onClick={() => setActiveDetailTab("timeline")}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeDetailTab === "timeline"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="w-4 h-4" />
                <span>变更留痕时间轴 ({changeLogs.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeDetailTab === "info" ? (
                <div className="space-y-5 text-xs">
                  {/* Section 1 */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-700">
                      <span>基础标识与品类属性</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400">货品编号：</span>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">{detailProduct.code}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">货品名称：</span>
                        <div className="font-medium text-slate-900 mt-0.5">{detailProduct.name}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">品牌：</span>
                        <div className="font-medium text-slate-900 mt-0.5">{detailProduct.brand}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">货品简称：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.short_name || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">产品昵称：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.nickname || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">产品类目(主口径)：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.product_category || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">产品分类：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.category_sub || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">系列：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.series || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">版本：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.version || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-700">
                      <span>规格包装与价格属性</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400">型号规格/净含量：</span>
                        <div className="font-medium text-slate-900 mt-0.5">{detailProduct.spec || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">基本单位：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.base_unit || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">箱规：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.carton_spec || "—"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">官方零售价：</span>
                        <div className="font-mono text-base font-bold text-blue-700 mt-0.5">
                          {detailProduct.retail_price ? `¥${Number(detailProduct.retail_price).toFixed(2)}` : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">正品/小样：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.sample_type || "正品"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">销售阶段：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.sale_stage || "在售"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">商品生命周期状态：</span>
                        <div className="text-slate-800 mt-0.5 font-medium">{detailProduct.status}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">需要运营维护：</span>
                        <div className="text-slate-800 mt-0.5">{detailProduct.needs_maintenance}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">旧口径类目 (待废弃)：</span>
                        <div className="text-slate-400 mt-0.5">{detailProduct.category_old || "无"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-700">
                      <span>系统治理与审计状态</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400">最近数据来源：</span>
                        <div className="font-medium text-slate-900 mt-0.5">{detailProduct.data_source}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">启用状态：</span>
                        <div className="mt-0.5">
                          {detailProduct.is_enabled ? (
                            <span className="text-emerald-700 font-semibold">● 正常启用中</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">● 已禁用</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">手工锁定保护 (is_locked)：</span>
                        <div className="mt-0.5">
                          {detailProduct.is_locked ? "已锁定(防冲销)" : "未锁定"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ChangeLog Timeline Tab */
                <div className="space-y-4">
                  {loadingLogs ? (
                    <div className="py-8 text-center text-slate-400">正在获取变更记录...</div>
                  ) : changeLogs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">暂无历史变更留痕</div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-blue-200 space-y-6">
                      {changeLogs.map((log) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
                          <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                            <span>· 操作人: <strong className="text-slate-700">{log.operator}</strong></span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">{log.channel}</span>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            {log.field_name === "_created" ? (
                              <div className="text-emerald-700 font-medium">{log.new_value}</div>
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-800">{log.field_name}</span> 发生变更：
                                <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
                                  <span className="line-through text-rose-500 bg-rose-50 px-1 rounded">
                                    {log.old_value || "空"}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-bold">
                                    {log.new_value || "空"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailProduct(null)}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>{formMode === "create" ? "新建货品主数据" : `编辑货品档案 (${formData.code})`}</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFormOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    货品编号 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={formMode === "edit"}
                    value={formData.code || ""}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="如 PRO-PER-009"
                    className="h-9 bg-slate-50 border-slate-200 text-xs disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    所属品牌 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.brand || ""}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="如 珀莱雅 / 彩棠"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  货品完整名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入完整标准商品名称"
                  className="h-9 bg-slate-50 border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">型号规格/净含量</label>
                  <Input
                    type="text"
                    value={formData.spec || ""}
                    onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                    placeholder="如 30ml / 50g"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">基本单位</label>
                  <Input
                    type="text"
                    value={formData.base_unit || ""}
                    onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                    placeholder="如 瓶/盒/支/套"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">官方零售价 (元)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.retail_price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retail_price: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">产品类目</label>
                  <Input
                    type="text"
                    value={formData.product_category || ""}
                    onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                    placeholder="如 护肤 / 彩妆"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">产品分类</label>
                  <Input
                    type="text"
                    value={formData.category_sub || ""}
                    onChange={(e) => setFormData({ ...formData, category_sub: e.target.value })}
                    placeholder="如 精华 / 面霜"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">运营简称</label>
                  <Input
                    type="text"
                    value={formData.short_name || ""}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    placeholder="简写名称"
                    className="h-9 bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">商品状态</label>
                  <select
                    value={formData.status || "正常"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="正常">正常</option>
                    <option value="停售">停售</option>
                    <option value="淘汰">淘汰</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">销售阶段</label>
                  <select
                    value={formData.sale_stage || "在售"}
                    onChange={(e) => setFormData({ ...formData, sale_stage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="在售">在售</option>
                    <option value="新品">新品</option>
                    <option value="预售">预售</option>
                    <option value="清尾">清尾</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">正品/小样</label>
                  <select
                    value={formData.sample_type || "正品"}
                    onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="正品">正品</option>
                    <option value="小样">小样</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="lockField"
                  checked={formData.is_locked || false}
                  onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="lockField" className="text-slate-700 font-medium cursor-pointer">
                  开启手工锁定保护 (锁定后数仓自动同步不会冲掉本次修改)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {formSubmitting ? "正在保存..." : "确认保存"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>批量导入货品数据 (三步向导)</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImportOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Step 1 */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-900">第 1 步：下载标准导入模板</div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    模板内置下拉枚举字典与示例行，规范填写防出错
                  </div>
                </div>
                <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <a
                    href="http://localhost:8090/api/v1/products/template"
                    download
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>下载模板.xlsx</span>
                  </a>
                </Button>
              </div>

              {/* Step 2 */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-medium text-slate-700 mb-1">
                  第 2 步：选择或拖拽 Excel 文件 (.xlsx) 上传
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="mt-2 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Parsing Progress / Messages */}
              {importLoading && (
                <div className="text-center py-4 text-blue-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在执行行级校验与数据解析...</span>
                </div>
              )}

              {importMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                  {importMessage}
                </div>
              )}

              {/* Step 3: Preview Result & Error Manifest */}
              {previewResult && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg">
                    <span className="font-semibold text-slate-800">校验结果概览：</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700 font-medium">
                        ✓ 合法记录: {previewResult.valid_count} 条
                      </span>
                      {previewResult.error_count > 0 && (
                        <span className="text-rose-600 font-medium">
                          ✗ 异常错误: {previewResult.error_count} 行
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Errors table */}
                  {previewResult.errors.length > 0 && (
                    <div className="border border-rose-200 rounded-lg overflow-hidden">
                      <div className="bg-rose-50 px-3 py-1.5 font-semibold text-rose-800 text-[11px]">
                        行级错误报告清单：
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-rose-100 text-[11px]">
                        {previewResult.errors.map((err, i) => (
                          <div key={i} className="p-2 flex items-center justify-between text-rose-700">
                            <div>
                              <strong className="font-mono">第 {err.row} 行</strong> [编码: {err.code}]
                            </div>
                            <div className="text-rose-600 font-medium">{err.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImportOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={previewResult.valid_count === 0 || importLoading}
                      onClick={handleConfirmImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      确认导入合法数据 ({previewResult.valid_count} 条)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
