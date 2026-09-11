import api from "./api/axios";
import type { ApiKeyItem, IntegrationApp } from "../types/integration";

export const getIntegrations = async (): Promise<IntegrationApp[]> => {
  const response = await api.get<IntegrationApp[]>("/api/integrations");
  return response.data;
};

export const updateIntegration = async (
  appId: string,
  data: { is_connected: boolean; account_email?: string; config?: any }
): Promise<any> => {
  const response = await api.put(`/api/integrations/${appId}`, data);
  return response.data;
};

export const getApiKeys = async (): Promise<ApiKeyItem[]> => {
  const response = await api.get<ApiKeyItem[]>("/api/api-keys");
  return response.data;
};

export const createApiKey = async (data: {
  name: string;
  environment: "production" | "development";
}): Promise<ApiKeyItem> => {
  const response = await api.post<ApiKeyItem>("/api/api-keys", data);
  return response.data;
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
  await api.delete(`/api/api-keys/${keyId}`);
};
