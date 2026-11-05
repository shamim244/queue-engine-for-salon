/**
 * Unified Repository Layer (Modular Aggregator)
 * Domain-specific implementations are located in ./repositories/
 */
export {
  repository,
  organizationRepo,
  salonRepo,
  stylistRepo,
  serviceRepo,
  queueRepo,
  analyticsRepo,
  defaultPlatformSettings,
  defaultAuditLogs,
  memoryStore,
  salonCache,
  CACHE_TTL_MS,
  invalidateSalonCache,
  seedDemoData,
  syncDemoToMySql,
  toMySqlDatetime,
  toIsoStringSafe,
} from './repositories/index';
