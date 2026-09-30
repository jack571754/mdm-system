import { apiClient } from "./client";
import { ApiResponse } from "./auth";

export interface EnumConfig {
  id: number;
  domain: string;
  field_name: string;
  value: string;
  sort_order: number;
  is_enabled: boolean;
}

export interface UserAdmin {
  id: number;
  username: string;
  role: "admin" | "operator" | "api";
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppConfigItem {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

// Enums
export const getEnumConfigsApi = async (domain?: string, fieldName?: string): Promise<ApiResponse<EnumConfig[]>> => {
  return apiClient.get("/admin/enums", {
    params: { domain, field_name: fieldName },
  });
};

export const createEnumConfigApi = async (payload: { domain: string; field_name: string; value: string; sort_order?: number; is_enabled?: boolean }): Promise<ApiResponse<EnumConfig>> => {
  return apiClient.post("/admin/enums", payload);
};

export const updateEnumConfigApi = async (id: number, payload: { value?: string; sort_order?: number; is_enabled?: boolean }): Promise<ApiResponse<EnumConfig>> => {
  return apiClient.put(`/admin/enums/${id}`, payload);
};

export const deleteEnumConfigApi = async (id: number): Promise<ApiResponse<{ id: number }>> => {
  return apiClient.delete(`/admin/enums/${id}`);
};

// Users
export const getUsersAdminApi = async (): Promise<ApiResponse<UserAdmin[]>> => {
  return apiClient.get("/admin/users");
};

export const createUserAdminApi = async (payload: { username: string; password: string; role: string; is_enabled?: boolean }): Promise<ApiResponse<UserAdmin>> => {
  return apiClient.post("/admin/users", payload);
};

export const updateUserAdminApi = async (id: number, payload: { password?: string; role?: string; is_enabled?: boolean }): Promise<ApiResponse<UserAdmin>> => {
  return apiClient.put(`/admin/users/${id}`, payload);
};

// Configs
export const getAppConfigsApi = async (): Promise<ApiResponse<AppConfigItem[]>> => {
  return apiClient.get("/admin/configs");
};

export const updateAppConfigApi = async (key: string, value: any, description?: string): Promise<ApiResponse<AppConfigItem>> => {
  return apiClient.put(`/admin/configs/${key}`, {
    value,
    description,
  });
};
