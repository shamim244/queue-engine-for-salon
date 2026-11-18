import { isMySqlConnected, getDb } from '../mysql';
import type { PlatformSettings, AuditLog, MaintenanceMode } from '../../engine/types';
import { memoryStore, toIsoStringSafe } from './store';
import { websocketHub } from '../../websocket/hub';
import { queueRepo } from './queue.repo';
import { salonRepo } from './salon.repo';
import { organizationRepo } from './organization.repo';

export const analyticsRepo = {
  async getSalonMetrics(salonId: string) {
    const activeTickets = await queueRepo.getActiveTickets(salonId);
    let totalServedToday = 0;
    let totalRevenueToday = 0;

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as served, COALESCE(SUM(payment_amount), 0) as revenue
         FROM queue_tickets
         WHERE salon_id = ? AND status = 'COMPLETED' AND DATE(completed_time) = CURRENT_DATE()`,
        [salonId]
      );
      if (rows.length > 0) {
        totalServedToday = Number(rows[0].served);
        totalRevenueToday = Number(rows[0].revenue);
      }
    } else {
      const completed = Array.from(memoryStore.tickets.values()).filter(
        (t) => t.salonId === salonId && t.status === 'COMPLETED'
      );
      totalServedToday = completed.length;
      totalRevenueToday = completed.reduce((sum, t) => sum + (t.paymentAmount || t.totalPrice), 0);
    }

    const avgWaitTime = activeTickets.length > 0
      ? Math.round(activeTickets.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) / activeTickets.length)
      : 0;

    return {
      salonId,
      activeQueueCount: activeTickets.length,
      totalServedToday,
      totalRevenueToday,
      avgWaitTime,
    };
  },

  async getStaffDailyReport(
    salonId: string,
    stylistId?: string,
    timeframe: string = 'day',
    options?: { date?: string; startDate?: string; endDate?: string }
  ) {
    let completedTickets: any[] = [];
    let totalServedToday = 0;
    let totalRevenueToday = 0;
    let cashRevenue = 0;
    let onlineRevenue = 0;
    let avgActualMinutes = 0;
    const servicesCountMap: Record<string, number> = {};
    const dailyTrendsMap: Record<string, { date: string; served: number; revenue: number; cash: number; online: number }> = {};

    const targetDate = options?.date;

    if (isMySqlConnected) {
      const db = getDb();
      let dateFilter = `DATE(completed_time) = CURRENT_DATE()`;
      const queryDateParams: any[] = [];

      if (targetDate) {
        dateFilter = `DATE(completed_time) = ?`;
        queryDateParams.push(targetDate);
      } else if (options?.startDate && options?.endDate) {
        dateFilter = `DATE(completed_time) BETWEEN ? AND ?`;
        queryDateParams.push(options.startDate, options.endDate);
      } else if (timeframe === 'week') {
        dateFilter = `completed_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
      } else if (timeframe === 'month') {
        dateFilter = `completed_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
      }

      let sql = `SELECT * FROM queue_tickets 
                 WHERE salon_id = ? AND status = 'COMPLETED' AND ${dateFilter}`;
      const params: any[] = [salonId, ...queryDateParams];
      if (stylistId) {
        sql += ` AND stylist_id = ?`;
        params.push(stylistId);
      }
      sql += ` ORDER BY completed_time DESC`;
      const [rows]: any = await db.query(sql, params);

      completedTickets = rows.map((r: any) => ({
        id: r.id,
        salonId: r.salon_id,
        stylistId: r.stylist_id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        serviceId: r.service_id,
        serviceName: r.service_name,
        totalPrice: Number(r.total_price),
        totalDurationMinutes: Number(r.total_duration_minutes),
        status: r.status,
        checkInTime: toIsoStringSafe(r.check_in_time) || new Date().toISOString(),
        startedTime: toIsoStringSafe(r.started_time),
        completedTime: toIsoStringSafe(r.completed_time),
        paymentStatus: r.payment_status,
        paymentAmount: r.payment_amount ? Number(r.payment_amount) : Number(r.total_price),
      }));
    } else {
      const now = Date.now();
      const cutoffMs = timeframe === 'month' ? 30 * 86400000 : timeframe === 'week' ? 7 * 86400000 : 86400000;
      completedTickets = Array.from(memoryStore.tickets.values()).filter((t) => {
        if (t.status !== 'COMPLETED' || t.salonId !== salonId) return false;
        if (stylistId && t.stylistId !== stylistId) return false;
        if (!t.completedTime) return false;
        const compDate = t.completedTime.split('T')[0];
        if (targetDate) {
          return compDate === targetDate;
        }
        if (timeframe === 'day') {
          const today = new Date().toISOString().split('T')[0];
          return compDate === today;
        }
        const compTime = new Date(t.completedTime).getTime();
        return (now - compTime) <= cutoffMs;
      });
    }

    totalServedToday = completedTickets.length;
    for (const t of completedTickets) {
      const amount = Number(t.paymentAmount || t.totalPrice || 0);
      totalRevenueToday += amount;
      if (t.paymentStatus === 'CASH_PAID') {
        cashRevenue += amount;
      } else {
        onlineRevenue += amount;
      }

      // Daily Trends Aggregation
      const dateKey = t.completedTime ? t.completedTime.split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dailyTrendsMap[dateKey]) {
        dailyTrendsMap[dateKey] = { date: dateKey, served: 0, revenue: 0, cash: 0, online: 0 };
      }
      dailyTrendsMap[dateKey].served += 1;
      dailyTrendsMap[dateKey].revenue += amount;
      if (t.paymentStatus === 'CASH_PAID') {
        dailyTrendsMap[dateKey].cash += amount;
      } else {
        dailyTrendsMap[dateKey].online += amount;
      }
    }

    let totalDurationSum = 0;
    let durationCount = 0;
    for (const t of completedTickets) {
      servicesCountMap[t.serviceName] = (servicesCountMap[t.serviceName] || 0) + 1;
      if (t.startedTime && t.completedTime) {
        const start = new Date(t.startedTime).getTime();
        const end = new Date(t.completedTime).getTime();
        const diffMins = Math.round((end - start) / 60000);
        if (diffMins > 0 && diffMins < 180) {
          totalDurationSum += diffMins;
          durationCount++;
        }
      }
    }

    avgActualMinutes = durationCount > 0 ? Math.round(totalDurationSum / durationCount) : 20;

    const dailyTrends = Object.values(dailyTrendsMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      salonId,
      stylistId,
      timeframe,
      selectedDate: targetDate || (timeframe === 'day' ? new Date().toISOString().split('T')[0] : undefined),
      totalServedToday,
      totalRevenueToday,
      cashRevenue,
      onlineRevenue,
      avgActualMinutes,
      servicesCountMap,
      dailyTrends,
      completedTickets: completedTickets.slice(0, 50),
    };
  },

  async getPlatformMetrics() {
    const salons = await salonRepo.getAllSalons();
    const orgs = await organizationRepo.getAllOrganizations();
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    let totalActiveTickets = 0;
    let totalServedAllTime = 0;
    let totalRevenueAllTime = 0;

    for (const s of salons) {
      const active = await queueRepo.getActiveTickets(s.id);
      totalActiveTickets += active.length;
    }

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as served, COALESCE(SUM(payment_amount), 0) as revenue
         FROM queue_tickets WHERE status = 'COMPLETED'`
      );
      if (rows.length > 0) {
        totalServedAllTime = Number(rows[0].served);
        totalRevenueAllTime = Number(rows[0].revenue);
      }
    }

    return {
      totalSalons: salons.length,
      totalActiveTickets,
      totalServedAllTime,
      totalRevenueAllTime,
      salons: salons.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          organizationId: s.organizationId,
          tier: org?.tier || 'STARTER',
          operatingMode: s.operatingMode,
          phone: s.phone,
          stylistCount: s.stylists.length,
          serviceCount: s.services.length,
        };
      }),
    };
  },

  async getTotalTicketsToday(): Promise<number> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as count FROM queue_tickets WHERE DATE(check_in_time) = CURRENT_DATE()`
      );
      return Number(rows[0]?.count || 0);
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const tickets = Array.from(memoryStore.tickets.values());
    const count = tickets.filter((t) => t.checkInTime && t.checkInTime.slice(0, 10) === todayStr).length;
    return count;
  },

  async getAdminStats() {
    const salons = await salonRepo.getAllSalons();
    const totalSalons = salons.length;
    let totalStylists = 0;
    for (const s of salons) {
      totalStylists += (s.stylists ? s.stylists.length : 0);
    }
    const totalTicketsToday = await this.getTotalTicketsToday();
    const socketClientsCount = websocketHub.getClientCount();
    const uptimeSeconds = Math.floor(process.uptime());
    const systemHealth = memoryStore.maintenanceMode.active ? 'MAINTENANCE' : 'HEALTHY';

    return {
      totalSalons,
      totalStylists,
      totalTicketsToday,
      socketClientsCount,
      uptimeSeconds,
      systemHealth,
    };
  },

  getPlatformSettings(): PlatformSettings {
    return JSON.parse(JSON.stringify(memoryStore.settings));
  },

  updatePlatformSettings(updates: Partial<PlatformSettings>, actor: string = 'superadmin'): PlatformSettings {
    if (updates.general) {
      memoryStore.settings.general = { ...memoryStore.settings.general, ...updates.general };
    }
    if (updates.appearance) {
      memoryStore.settings.appearance = { ...memoryStore.settings.appearance, ...updates.appearance };
    }
    if (updates.engine) {
      memoryStore.settings.engine = { ...memoryStore.settings.engine, ...updates.engine };
    }
    if (updates.gateway) {
      memoryStore.settings.gateway = { ...memoryStore.settings.gateway, ...updates.gateway };
    }
    if (updates.b2bReferral) {
      memoryStore.settings.b2bReferral = {
        ...(memoryStore.settings.b2bReferral || { commissionPercent: 30, refereeDiscountPercent: 20, enabled: true }),
        ...updates.b2bReferral,
      };
    }
    this.addAuditLog(
      'SETTINGS_UPDATED',
      actor,
      `Platform settings updated: ${Object.keys(updates).join(', ')}`,
      'CONFIG'
    );
    return JSON.parse(JSON.stringify(memoryStore.settings));
  },

  getAuditLogs(): AuditLog[] {
    return [...memoryStore.auditLogs];
  },

  addAuditLog(action: string, actor: string, details: string, category: string = 'SYSTEM'): AuditLog {
    const entry: AuditLog = {
      id: 'audit-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      category,
    };
    memoryStore.auditLogs.unshift(entry);
    if (memoryStore.auditLogs.length > 200) {
      memoryStore.auditLogs.pop();
    }
    return entry;
  },

  getMaintenanceMode(): MaintenanceMode {
    return { ...memoryStore.maintenanceMode };
  },

  toggleMaintenanceMode(active: boolean, message?: string, actor: string = 'superadmin'): MaintenanceMode {
    memoryStore.maintenanceMode = {
      active,
      message: message || (active ? 'Emergency maintenance lockdown' : 'All systems normal'),
      activatedAt: active ? new Date().toISOString() : null,
    };
    this.addAuditLog(
      active ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
      actor,
      `Maintenance mode set to ${active ? 'ACTIVE' : 'INACTIVE'}. Notice: "${memoryStore.maintenanceMode.message}"`,
      'SECURITY'
    );
    return { ...memoryStore.maintenanceMode };
  },
};
