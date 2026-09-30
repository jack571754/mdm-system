import { apiClient } from "./client";

export interface User {
  id: number;
  username: string;
  role: "admin" | "operator" | "api";
  is_enabled: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginParams {
  username: string;
  password: string;
}

export async function loginApi(params: LoginParams): Promise<ApiResponse<TokenResponse>> {
  return apiClient.post("/auth/login", params);
}

export async function getMeApi(): Promise<ApiResponse<User>> {
  return apiClient.get("/auth/me");
}
