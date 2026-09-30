import { apiClient } from "./client";
import { ApiResponse } from "./auth";

export interface SyncRun {
  id: number;
  domain: string;
  source_id: number;
  started_at: string;
  finished_at?: string;
  status: "running" | "success" | "warning" | "failed";
  operator: string;
  inserted: number;
  updated: number;
  skipped: number;
  pending_deleted: number;
  failed: number;
  error_summary?: string;
}

export interface SyncSource {
  id: number;
  domain: string;
  name: string;
  db_url?: string;
  fetch_sql: string;
  field_mapping: Record<string, string>;
  cron_expr: string;
  is_enabled: boolean;
  miss_threshold: number;
  created_at: string;
  updated_at: string;
  latest_run?: SyncRun;
}

export interface PendingDeleteRecord {
  code: string;
  name: string;
  domain: string;
  brand?: string;
  data_source: string;
  source_updated_at?: string;
  miss_count: number;
  is_locked: boolean;
}

export const getSyncSourcesApi = async (): Promise<ApiResponse<SyncSource[]>> => {
  return apiClient.get("/sync/sources");
};

export const triggerSyncSourceRunApi = async (id: number): Promise<ApiResponse<SyncRun>> => {
  return apiClient.post(`/sync/sources/${id}/run`);
};

export const getSyncRunsHistoryApi = async (sourceId?: number, limit: number = 50): Promise<ApiResponse<SyncRun[]>> => {
  return apiClient.get("/sync/runs", {
    params: { source_id: sourceId, limit },
  });
};

export const getPendingDeletesApi = async (domain?: string): Promise<ApiResponse<PendingDeleteRecord[]>> => {
  return apiClient.get("/sync/pending-deletes", {
    params: { domain },
  });
};

export const confirmPendingDeleteApi = async (
  action: "confirm_offline" | "keep",
  domain: string,
  codes: string[]
): Promise<ApiResponse<{ processed: number }>> => {
  return apiClient.post("/sync/pending-deletes/confirm", {
    action,
    domain,
    codes,
  });
};
