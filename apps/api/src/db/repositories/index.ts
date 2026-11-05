import { organizationRepo } from './organization.repo';
import { salonRepo } from './salon.repo';
import { stylistRepo } from './stylist.repo';
import { serviceRepo } from './service.repo';
import { queueRepo } from './queue.repo';
import { analyticsRepo } from './analytics.repo';
import {
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
} from './store';
import type { SubscriptionTier, OnboardSalonPayload } from '../../engine/types';

export const repository = {
  // Organizations
  getOrganizationById: (id: string) => organizationRepo.getOrganizationById(id),
  getOrganizationBySlug: (slug: string) => organizationRepo.getOrganizationBySlug(slug),
  getAllOrganizations: () => organizationRepo.getAllOrganizations(),
  createOrganization: (params: Parameters<typeof organizationRepo.createOrganization>[0]) =>
    organizationRepo.createOrganization(params),
  getSalonsByOrganizationId: (orgId: string) =>
    organizationRepo.getSalonsByOrganizationId(orgId, () => salonRepo.getAllSalons()),
  updateOrganizationTier: (orgId: string, tier: SubscriptionTier) =>
    organizationRepo.updateOrganizationTier(orgId, tier),
  checkOrganizationBranchQuota: (orgId: string) =>
    organizationRepo.checkOrganizationBranchQuota(orgId, () => salonRepo.getAllSalons()),
  checkSalonStylistQuota: (salonId: string) =>
    organizationRepo.checkSalonStylistQuota(salonId, () => salonRepo.getAllSalons()),

  // Salons
  invalidateSalonCache,
  getSalonById: (id: string, options?: { skipCache?: boolean }) => salonRepo.getSalonById(id, options),
  getSalonBySlug: (slug: string, options?: { skipCache?: boolean }) => salonRepo.getSalonBySlug(slug, options),
  getAllSalons: () => salonRepo.getAllSalons(),
  createSalon: (params: Parameters<typeof salonRepo.createSalon>[0]) => salonRepo.createSalon(params),
  updateSalonOperatingMode: (salonId: string, mode?: string) => salonRepo.updateSalonOperatingMode(salonId, mode),
  updateSalon: (salonId: string, updates: Parameters<typeof salonRepo.updateSalon>[1]) =>
    salonRepo.updateSalon(salonId, updates),
  deleteSalon: (salonId: string) => salonRepo.deleteSalon(salonId),
  onboardSalon: (payload: OnboardSalonPayload) =>
    salonRepo.onboardSalon(payload, (action, actor, details, cat) => analyticsRepo.addAuditLog(action, actor, details, cat)),

  // Stylists
  addStylist: (salonId: string, params: Parameters<typeof stylistRepo.addStylist>[1]) =>
    stylistRepo.addStylist(salonId, params),
  updateStylistPreference: (stylistId: string, updates: Parameters<typeof stylistRepo.updateStylistPreference>[1]) =>
    stylistRepo.updateStylistPreference(stylistId, updates),

  // Services
  addService: (service: Parameters<typeof serviceRepo.addService>[0]) => serviceRepo.addService(service),
  deleteService: (serviceId: string) => serviceRepo.deleteService(serviceId),

  // Queue & Tickets
  getNextTicketNumber: (salonId: string) => queueRepo.getNextTicketNumber(salonId),
  createTicket: (ticket: Parameters<typeof queueRepo.createTicket>[0]) => queueRepo.createTicket(ticket),
  getActiveTickets: (salonId: string) => queueRepo.getActiveTickets(salonId),
  getTicketById: (ticketId: string) => queueRepo.getTicketById(ticketId),
  getTicketsByCustomer: (phone: string) => queueRepo.getTicketsByCustomer(phone),
  updateTicketStatus: (
    ticketId: string,
    status: Parameters<typeof queueRepo.updateTicketStatus>[1],
    metadata?: Parameters<typeof queueRepo.updateTicketStatus>[2]
  ) => queueRepo.updateTicketStatus(ticketId, status, metadata),
  updateTicketWaitTime: (ticketId: string, estimatedMinutes: number) =>
    queueRepo.updateTicketWaitTime(ticketId, estimatedMinutes),
  updateTicketWaitTimesBatch: (updates: Parameters<typeof queueRepo.updateTicketWaitTimesBatch>[0]) =>
    queueRepo.updateTicketWaitTimesBatch(updates),

  // Analytics & Admin
  getSalonMetrics: (salonId: string) => analyticsRepo.getSalonMetrics(salonId),
  getStaffDailyReport: (salonId: string, stylistId?: string) => analyticsRepo.getStaffDailyReport(salonId, stylistId),
  getPlatformMetrics: () => analyticsRepo.getPlatformMetrics(),
  getTotalTicketsToday: () => analyticsRepo.getTotalTicketsToday(),
  getAdminStats: () => analyticsRepo.getAdminStats(),
  getPlatformSettings: () => analyticsRepo.getPlatformSettings(),
  updatePlatformSettings: (updates: Parameters<typeof analyticsRepo.updatePlatformSettings>[0], actor?: string) =>
    analyticsRepo.updatePlatformSettings(updates, actor),
  getAuditLogs: () => analyticsRepo.getAuditLogs(),
  addAuditLog: (action: string, actor: string, details: string, category?: string) =>
    analyticsRepo.addAuditLog(action, actor, details, category),
  getMaintenanceMode: () => analyticsRepo.getMaintenanceMode(),
  toggleMaintenanceMode: (active: boolean, message?: string, actor?: string) =>
    analyticsRepo.toggleMaintenanceMode(active, message, actor),
};

export {
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
};
