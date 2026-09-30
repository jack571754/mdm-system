import { apiClient } from "./client";
import { ApiResponse } from "./auth";

export interface Product {
  code: string;
  name: string;
  brand: string;
  spec?: string | null;
  base_unit?: string | null;
  short_name?: string | null;
  product_category?: string | null;
  category_sub?: string | null;
  retail_price?: number | null;
  nickname?: string | null;
  version?: string | null;
  series?: string | null;
  category_old?: string | null;
  sample_type?: string | null;
  status: string;
  carton_spec?: string | null;
  sale_stage?: string | null;
  auxiliary?: number | null;
  needs_maintenance: string;
  data_source: string;
  source_updated_at: string;
  is_enabled: boolean;
  pending_delete: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedProducts {
  total: number;
  page: number;
  size: number;
  items: Product[];
}

export interface ProductQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  brand?: string;
  product_category?: string;
  status?: string;
  sale_stage?: string;
  data_source?: string;
  is_enabled?: boolean;
}

export interface ChangeLogItem {
  id: number;
  object_type: string;
  object_code: string;
  sub_key?: string | null;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  operator: string;
  channel: string;
  created_at: string;
}

export interface ImportPreviewResult {
  total_rows: number;
  valid_count: number;
  error_count: number;
  valid_records: any[];
  errors: {
    row: number;
    code: string;
    field: string;
    value: string;
    message: string;
  }[];
}

export async function getProductsApi(params: ProductQueryParams): Promise<ApiResponse<PaginatedProducts>> {
  return apiClient.get("/products", { params });
}

export async function getProductDetailApi(code: string): Promise<ApiResponse<Product>> {
  return apiClient.get(`/products/${encodeURIComponent(code)}`);
}

export async function createProductApi(data: Partial<Product>): Promise<ApiResponse<Product>> {
  return apiClient.post("/products", data);
}

export async function updateProductApi(code: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  return apiClient.put(`/products/${encodeURIComponent(code)}`, data);
}

export async function batchUpdateProductStatusApi(codes: string[], is_enabled: boolean): Promise<ApiResponse<string>> {
  return apiClient.patch("/products/batch-status", { codes, is_enabled });
}

export async function getProductChangesApi(code: string): Promise<ApiResponse<ChangeLogItem[]>> {
  return apiClient.get(`/products/${encodeURIComponent(code)}/changes`);
}

export async function previewProductImportApi(file: File): Promise<ApiResponse<ImportPreviewResult>> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/products/import/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function confirmProductImportApi(records: any[], skip_errors: boolean = true): Promise<ApiResponse<any>> {
  return apiClient.post("/products/import/confirm", records, {
    params: { skip_errors },
  });
}
