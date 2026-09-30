import { apiClient } from "./client";
import { ApiResponse } from "./auth";

export interface ChangeLogItem {
  id: number;
  object_type: string;
  object_code: string;
  sub_key?: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  operator: string;
  channel: string;
  created_at: string;
}

export interface ChangeLogQueryParams {
  page?: number;
  size?: number;
  object_type?: string;
  object_code?: string;
  operator?: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
}

export const getChangeLogsApi = async (
  params: ChangeLogQueryParams
): Promise<ApiResponse<{ items: ChangeLogItem[]; total: number; page: number; size: number }>> => {
  return apiClient.get("/change-logs", { params });
};

export const exportChangeLogsUrl = (params: ChangeLogQueryParams) => {
  const query = new URLSearchParams();
  if (params.object_type) query.append("object_type", params.object_type);
  if (params.object_code) query.append("object_code", params.object_code);
  if (params.operator) query.append("operator", params.operator);
  if (params.channel) query.append("channel", params.channel);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  return `${apiClient.defaults.baseURL}/change-logs/export?${query.toString()}`;
};
