import { authApi } from "./auth.api";
import { salonsApi } from "./salons.api";
import { queueApi } from "./queue.api";
import { adminApi } from "./admin.api";
import {
  getApiBaseUrl,
  getWsBaseUrl,
  API_BASE_URL,
  WS_BASE_URL,
  getAuthToken,
  setAuthToken,
  request,
  apiClient,
} from "./client";

export const api = {
  auth: authApi,
  salons: salonsApi,
  queue: queueApi,
  admin: adminApi,
};

export {
  authApi,
  salonsApi,
  queueApi,
  adminApi,
  getApiBaseUrl,
  getWsBaseUrl,
  API_BASE_URL,
  WS_BASE_URL,
  getAuthToken,
  setAuthToken,
  request,
  apiClient,
};

export type * from "./types";
export default api;
