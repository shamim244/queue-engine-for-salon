import { organizationRepo } from './organization.repo';
import { salonRepo } from './salon.repo';
import { stylistRepo } from './stylist.repo';
import { serviceRepo } from './service.repo';
import { queueRepo } from './queue.repo';
import { analyticsRepo } from './analytics.repo';
import { planRepo, invalidatePlanCache } from './plan.repo';
import { appointmentRepo } from './appointment.repo';
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
  updateOrganizationPlan: (orgId: string, planId: string) =>
    organizationRepo.updateOrganizationPlan(orgId, planId),

  // Subscription Plans
  getAllPlans: (options?: Parameters<typeof planRepo.getAllPlans>[0]) => planRepo.getAllPlans(options),
  getPlanById: (id: string) => planRepo.getPlanById(id),
  getPlanBySlug: (slug: string) => planRepo.getPlanBySlug(slug),
  createPlan: (payload: Parameters<typeof planRepo.createPlan>[0]) => planRepo.createPlan(payload),
  updatePlan: (id: string, updates: Parameters<typeof planRepo.updatePlan>[1]) => planRepo.updatePlan(id, updates),
  archivePlan: (id: string) => planRepo.archivePlan(id),
  invalidatePlanCache: () => planRepo.invalidatePlanCache(),

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
  getStylistServiceDurations: (stylistId: string) =>
    stylistRepo.getStylistServiceDurations(stylistId),
  saveStylistServiceDurations: (salonId: string, stylistId: string, overrides: Record<string, number | null>) =>
    stylistRepo.saveStylistServiceDurations(salonId, stylistId, overrides),
  getStaffLeaves: (salonId: string, options?: Parameters<typeof stylistRepo.getStaffLeaves>[1]) =>
    stylistRepo.getStaffLeaves(salonId, options),
  createStaffLeave: (params: Parameters<typeof stylistRepo.createStaffLeave>[0]) =>
    stylistRepo.createStaffLeave(params),
  updateStaffLeaveStatus: (leaveId: string, status: Parameters<typeof stylistRepo.updateStaffLeaveStatus>[1]) =>
    stylistRepo.updateStaffLeaveStatus(leaveId, status),
  isStylistOnLeave: (stylistId: string, dateStr?: string) =>
    stylistRepo.isStylistOnLeave(stylistId, dateStr),
  getStylistStrandedTickets: (salonId: string, stylistId: string) =>
    stylistRepo.getStylistStrandedTickets(salonId, stylistId),
  handleStaffAbsenceRecovery: (params: Parameters<typeof stylistRepo.handleStaffAbsenceRecovery>[0]) =>
    stylistRepo.handleStaffAbsenceRecovery(params),

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
  updateTicketStylist: (ticketId: string, stylistId: string | null) =>
    queueRepo.updateTicketStylist(ticketId, stylistId),
  updateTicketServices: (
    ticketId: string,
    params: Parameters<typeof queueRepo.updateTicketServices>[1]
  ) => queueRepo.updateTicketServices(ticketId, params),
  updateTicketNotes: (
    ticketId: string,
    params: Parameters<typeof queueRepo.updateTicketNotes>[1]
  ) => queueRepo.updateTicketNotes(ticketId, params),
  updateTicketWaitTime: (ticketId: string, estimatedMinutes: number) =>
    queueRepo.updateTicketWaitTime(ticketId, estimatedMinutes),
  updateTicketWaitTimesBatch: (updates: Parameters<typeof queueRepo.updateTicketWaitTimesBatch>[0]) =>
    queueRepo.updateTicketWaitTimesBatch(updates),

  // Analytics & Admin
  getSalonMetrics: (salonId: string) => analyticsRepo.getSalonMetrics(salonId),
  getStaffDailyReport: (
    salonId: string,
    stylistId?: string,
    timeframe: string = 'day',
    options?: { date?: string; startDate?: string; endDate?: string }
  ) => analyticsRepo.getStaffDailyReport(salonId, stylistId, timeframe, options),
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

  // Appointments
  createAppointment: (params: Parameters<typeof appointmentRepo.createAppointment>[0]) =>
    appointmentRepo.createAppointment(params),
  getAppointmentById: (id: string) => appointmentRepo.getAppointmentById(id),
  getAppointments: (filter?: Parameters<typeof appointmentRepo.getAppointments>[0]) =>
    appointmentRepo.getAppointments(filter),
  updateAppointment: (id: string, updates: Parameters<typeof appointmentRepo.updateAppointment>[1]) =>
    appointmentRepo.updateAppointment(id, updates),
  isSlotAvailable: (
    salonId: string,
    scheduledDate: string,
    slotStartTime: string,
    slotEndTime: string,
    stylistId?: string | null,
    excludeAppointmentId?: string
  ) =>
    appointmentRepo.isSlotAvailable(salonId, scheduledDate, slotStartTime, slotEndTime, stylistId, excludeAppointmentId),
  rescheduleAppointment: (
    appointmentId: string,
    newDate: string,
    newSlotStartTime: string,
    newSlotEndTime: string,
    newStylistId?: string | null
  ) =>
    appointmentRepo.rescheduleAppointment(appointmentId, newDate, newSlotStartTime, newSlotEndTime, newStylistId),

  // Payouts & Settlement
  createPayoutRecord: (payout: Parameters<typeof appointmentRepo.createPayoutRecord>[0]) =>
    appointmentRepo.createPayoutRecord(payout),
  getPayoutRecords: (filter?: Parameters<typeof appointmentRepo.getPayoutRecords>[0]) =>
    appointmentRepo.getPayoutRecords(filter),
  getPayoutById: (id: string) => appointmentRepo.getPayoutById(id),
  updatePayoutStatus: (
    id: string,
    status: Parameters<typeof appointmentRepo.updatePayoutStatus>[1],
    referenceId?: string,
    settledAt?: string
  ) => appointmentRepo.updatePayoutStatus(id, status, referenceId, settledAt),
  getCompletedAppointmentsForPeriod: (salonId: string, startDate: string, endDate: string) =>
    appointmentRepo.getCompletedAppointmentsForPeriod(salonId, startDate, endDate),
  getSalonAppointmentPolicy: (salonId: string) => appointmentRepo.getSalonAppointmentPolicy(salonId),
  updateSalonAppointmentPolicy: (salonId: string, policy: Parameters<typeof appointmentRepo.updateSalonAppointmentPolicy>[1]) =>
    appointmentRepo.updateSalonAppointmentPolicy(salonId, policy),
};

export {
  organizationRepo,
  salonRepo,
  stylistRepo,
  serviceRepo,
  queueRepo,
  analyticsRepo,
  planRepo,
  appointmentRepo,
  invalidatePlanCache,
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
