import { config } from '../config';

export interface DispatchedNotification {
  id: string;
  salonId: string;
  ticketId: string;
  recipientPhone: string;
  recipientName: string;
  type: 'TICKET_CONFIRMATION' | '10_MIN_WARNING' | 'CHAIR_READY' | 'SOFT_BUMP_ALERT';
  channel: 'WHATSAPP' | 'SMS';
  message: string;
  sentAt: string;
  deliveryStatus: 'DELIVERED' | 'MOCKED';
}

const recentNotifications: DispatchedNotification[] = [];

export const notificationService = {
  async sendWhatsApp(params: {
    salonId: string;
    salonName: string;
    ticketId: string;
    recipientPhone: string;
    recipientName: string;
    type: 'TICKET_CONFIRMATION' | '10_MIN_WARNING' | 'CHAIR_READY' | 'SOFT_BUMP_ALERT';
    ticketNumber: number;
    estimatedWaitMinutes?: number;
    stylistName?: string;
  }): Promise<DispatchedNotification> {
    let messageText = '';

    switch (params.type) {
      case 'TICKET_CONFIRMATION':
        messageText = `💈 *${params.salonName}*\n\nNamaste ${params.recipientName}! Your Queue Ticket is *#${params.ticketNumber}*.\n⏳ Estimated wait: *${params.estimatedWaitMinutes || 15} mins*.\n\nYou can grab tea or relax nearby. We will alert you on WhatsApp when you are next!`;
        break;

      case '10_MIN_WARNING':
        messageText = `⚠️ *${params.salonName}*\n\nHeads up ${params.recipientName}! You are *#2 in line* (~10 mins left).\nPlease head back towards the shop now so your chair is ready!`;
        break;

      case 'CHAIR_READY':
        messageText = `🎉 *CHAIR READY - ${params.salonName}*\n\n${params.recipientName}, your chair is ready with *${params.stylistName || 'your barber'}*!\nPlease step in within 3 minutes. See you inside! ✂️`;
        break;

      case 'SOFT_BUMP_ALERT':
        messageText = `⏳ *Notice from ${params.salonName}*\n\n${params.recipientName}, we called your ticket #${params.ticketNumber}, but couldn't find you. We held your place and placed you next in line. Please let the barber know when you arrive!`;
        break;
    }

    const record: DispatchedNotification = {
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      salonId: params.salonId,
      ticketId: params.ticketId,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      type: params.type,
      channel: 'WHATSAPP',
      message: messageText,
      sentAt: new Date().toISOString(),
      deliveryStatus: config.whatsapp.mockMode ? 'MOCKED' : 'DELIVERED',
    };

    recentNotifications.unshift(record);
    if (recentNotifications.length > 50) recentNotifications.pop();

    if (config.whatsapp.mockMode) {
      console.log(`\n======================================================`);
      console.log(`[WHATSAPP DISPATCH] To: ${params.recipientPhone} (${params.recipientName})`);
      console.log(`Type: ${params.type}`);
      console.log(`Message:\n${messageText}`);
      console.log(`======================================================\n`);
    } else {
      // In production: Meta Cloud API / Twilio WhatsApp API
      // await fetch(`https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`, ...)
    }

    return record;
  },

  getRecentNotifications(salonId?: string) {
    if (salonId) {
      return recentNotifications.filter((n) => n.salonId === salonId);
    }
    return recentNotifications;
  },
};
