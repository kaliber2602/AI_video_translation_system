import api from "./api/axios";
import type {
  UserSettingsPatch,
  UserSettingsResponse,
  UserSettingsUpdate,
} from "../types/settings";

export const getUserSettings = async (): Promise<UserSettingsResponse> => {
  const response = await api.get<UserSettingsResponse>("/api/settings");
  return response.data;
};

export const updateUserSettings = async (
  data: UserSettingsUpdate
): Promise<UserSettingsResponse> => {
  const response = await api.put<UserSettingsResponse>("/api/settings", data);
  return response.data;
};

export const patchUserSettings = async (
  data: UserSettingsPatch
): Promise<UserSettingsResponse> => {
  const response = await api.patch<UserSettingsResponse>("/api/settings", data);
  return response.data;
};

export const resetUserSettings = async (): Promise<UserSettingsResponse> => {
  const response = await api.post<UserSettingsResponse>("/api/settings/reset");
  return response.data;
};
