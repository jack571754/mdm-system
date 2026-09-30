import axios from "axios";

const API_BASE = "/api/v1/mechanisms";

export interface MechanismItem {
  id?: number;
  mechanism_code?: string;
  product_code: string;
  product_name?: string;
  product_short_name?: string;
  product_spec?: string;
  retail_price?: number;
  quantity: number;
  item_type: string; // 主品 / 赠品
}

export interface Mechanism {
  code: string;
  name: string;
  kit_type?: string;
  mechanism_type?: string;
  start_date?: string;
  end_date?: string;
  mechanism_price?: number;
  short_name?: string;
  brand?: string;
  creator?: string;
  source: string;
  audit_status?: string;
  data_source: string;
  source_updated_at: string;
  is_enabled: boolean;
  pending_delete: boolean;
  is_locked: boolean;
  status: string; // 生效中 / 待生效 / 已过期 / 已停用
  items: MechanismItem[];
  items_count: number;
  total_retail_value?: number;
}

export interface MechanismQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  brand?: string;
  kit_type?: string;
  status_filter?: string;
}

export interface MechanismListResponse {
  items: Mechanism[];
  total: number;
  page: number;
  size: number;
}

export interface MechanismItemCreate {
  product_code: string;
  quantity: number;
  item_type: string;
}

export interface MechanismCreatePayload {
  code?: string;
  name: string;
  brand?: string;
  kit_type?: string;
  mechanism_type?: string;
  start_date?: string;
  end_date?: string;
  mechanism_price?: number;
  short_name?: string;
  is_locked?: boolean;
  items: MechanismItemCreate[];
}

export interface MechanismUpdatePayload {
  name?: string;
  brand?: string;
  kit_type?: string;
  mechanism_type?: string;
  start_date?: string;
  end_date?: string;
  mechanism_price?: number;
  short_name?: string;
  is_locked?: boolean;
  items?: MechanismItemCreate[];
}

export interface ImportRowError {
  row: number;
  code?: string;
  name?: string;
  message: string;
}

export interface ImportPreviewGroup {
  mechanism_code: string;
  mechanism_name: string;
  brand: string;
  kit_type?: string;
  start_date?: string;
  end_date?: string;
  mechanism_price?: number;
  items_count: number;
  is_auto_generated_code: boolean;
}

export interface MechanismImportPreviewResult {
  total_rows: number;
  total_mechanisms: number;
  valid_count: number;
  error_count: number;
  errors: ImportRowError[];
  preview_groups: ImportPreviewGroup[];
}

export interface ChangeLogItem {
  id: number;
  object_type: string;
  object_code: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  operator: string;
  channel: string;
  created_at: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem("mdm_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMechanismsApi(params?: MechanismQueryParams): Promise<{ data: MechanismListResponse }> {
  const res = await axios.get(API_BASE, {
    params,
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getMechanismDetailApi(code: string): Promise<{ data: Mechanism }> {
  const res = await axios.get(`${API_BASE}/${code}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function createMechanismApi(payload: MechanismCreatePayload): Promise<{ data: Mechanism }> {
  const res = await axios.post(API_BASE, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function updateMechanismApi(code: string, payload: MechanismUpdatePayload): Promise<{ data: Mechanism }> {
  const res = await axios.put(`${API_BASE}/${code}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function toggleMechanismStatusApi(code: string, is_enabled: boolean): Promise<any> {
  const res = await axios.patch(
    `${API_BASE}/${code}/status`,
    {},
    {
      params: { is_enabled },
      headers: getAuthHeaders(),
    }
  );
  return res.data;
}

export async function batchUpdateMechanismStatusApi(codes: string[], is_enabled: boolean): Promise<any> {
  const res = await axios.post(
    `${API_BASE}/batch-status`,
    { codes, is_enabled },
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getGeneratedMechanismCodeApi(brand?: string): Promise<{ code: string }> {
  const res = await axios.get(`${API_BASE}/generate-code`, {
    params: { brand },
    headers: getAuthHeaders(),
  });
  return res.data.data || res.data;
}

export async function getMechanismChangesApi(code: string): Promise<{ data: ChangeLogItem[] }> {
  const res = await axios.get(`${API_BASE}/${code}/changes`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function previewMechanismImportApi(file: File): Promise<{ data: MechanismImportPreviewResult }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_BASE}/import/preview`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function confirmMechanismImportApi(file_token: string): Promise<any> {
  const res = await axios.post(
    `${API_BASE}/import/confirm`,
    { file_token },
    { headers: getAuthHeaders() }
  );
  return res.data;
}
