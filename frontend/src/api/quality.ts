import { apiClient } from "./client";
import { ApiResponse } from "./auth";

export interface QualityOverview {
  total_products: number;
  total_mechanisms: number;
  missing_fields_count: number;
  duplicates_count: number;
  pending_deletes_count: number;
  health_score: number;
}

export interface MissingFieldItem {
  domain: string;
  code: string;
  name: string;
  brand?: string;
  missing_fields: string[];
  data_source: string;
  needs_maintenance: string;
}

export interface DuplicateCandidateItem {
  brand: string;
  code_a: string;
  name_a: string;
  spec_a?: string;
  price_a?: number;
  status_a: string;
  code_b: string;
  name_b: string;
  spec_b?: string;
  price_b?: number;
  status_b: string;
  similarity_score: number;
}

export const getQualityOverviewApi = async (): Promise<ApiResponse<QualityOverview>> => {
  return apiClient.get("/quality/overview");
};

export const getMissingRecordsApi = async (
  domain?: string,
  page: number = 1,
  size: number = 50
): Promise<ApiResponse<{ items: MissingFieldItem[]; total: number; page: number; size: number }>> => {
  return apiClient.get("/quality/missing", {
    params: { domain, page, size },
  });
};

export const exportMissingRecordsUrl = () => {
  return `${apiClient.defaults.baseURL}/quality/missing/export`;
};

export const getDuplicateCandidatesApi = async (
  brand?: string,
  threshold: number = 0.85
): Promise<ApiResponse<DuplicateCandidateItem[]>> => {
  return apiClient.get("/quality/duplicates", {
    params: { brand, threshold },
  });
};

export const exportPendingDeletesUrl = () => {
  return `${apiClient.defaults.baseURL}/quality/pending-deletes/export`;
};
