import {
  api,
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
} from "./api-client";

export {
  api,
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

export type * from "./api-client/types";
export default api;
