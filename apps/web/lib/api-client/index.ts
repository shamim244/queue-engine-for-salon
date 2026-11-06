import { authApi } from "./auth.api";
import { salonsApi } from "./salons.api";
import { queueApi } from "./queue.api";
import { adminApi } from "./admin.api";

export const api = {
  auth: authApi,
  salons: salonsApi,
  queue: queueApi,
  admin: adminApi,
};

export * from "./types";
export * from "./client";
export { authApi, salonsApi, queueApi, adminApi };
