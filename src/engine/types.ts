export type SalonOperatingMode = 'RURAL_SOLO' | 'MODERN_MULTI';

export type TicketStatus = 
  | 'WAITING'       // Waiting in virtual queue
  | 'SUMMONED'      // Called to chair (T-10m warning or Ready)
  | 'IN_CHAIR'      // Currently receiving service
  | 'COMPLETED'     // Finished service and paid
  | 'SOFT_BUMPED'   // Not present within 3-min grace, moved to next slot
  | 'CANCELLED'     // Cancelled by client or barber
  | 'NO_SHOW';      // Marked as no-show

export type TicketSource = 'QR_SCAN' | 'BARBER_QUICK_ADD' | 'RECEPTIONIST' | 'REMOTE_WEB';

export type PaymentStatus = 'PENDING' | 'CASH_PAID' | 'ONLINE_PAID';

export interface ServiceAddOn {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface ServiceDefinition {
  id: string;
  salonId: string;
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  isAddOn: boolean;
  icon?: string;
}

export interface Stylist {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  isActive: boolean;
  historicalAvgDurationMinutes: number;
  currentTicketId?: string | null;
}

export interface Salon {
  id: string;
  name: string;
  slug: string;
  phone: string;
  operatingMode: SalonOperatingMode;
  countryCode: string;
  currency: string;
  address?: string;
  upiPaymentId?: string; // Direct UPI QR for Indian / rural salons
  services: ServiceDefinition[];
  stylists: Stylist[];
  createdAt: Date;
}

export interface QueueTicket {
  id: string;
  salonId: string;
  stylistId: string | null;
  ticketNumber: number;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  selectedAddOns: ServiceAddOn[];
  totalPrice: number;
  totalDurationMinutes: number;
  status: TicketStatus;
  source: TicketSource;
  estimatedWaitMinutes: number;
  checkInTime: string;
  summonedTime?: string | null;
  startedTime?: string | null;
  completedTime?: string | null;
  paymentStatus: PaymentStatus;
  paymentAmount?: number | null;
  positionInQueue: number;
}

export interface QueueEventPayload {
  type: 
    | 'TICKET_CREATED' 
    | 'TICKET_SUMMONED' 
    | 'TICKET_SEATED' 
    | 'TICKET_COMPLETED' 
    | 'TICKET_CANCELLED' 
    | 'TICKET_SOFT_BUMPED' 
    | 'QUEUE_RECALCULATED';
  salonId: string;
  ticket: QueueTicket;
  activeQueueCount: number;
  timestamp: string;
}
