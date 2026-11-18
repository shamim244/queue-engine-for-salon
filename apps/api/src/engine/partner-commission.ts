export type PartnerCommissionModel = 'RECURRING_PERCENT' | 'FLAT_BOUNTY' | 'HYBRID';

export interface PartnerCommissionParams {
  commissionModel: PartnerCommissionModel;
  grossPlanAmount: number;
  discountAmount?: number;
  commissionPercent?: number;
  bountyAmount?: number;
  expiresAt?: Date | string | null;
  isPaused?: boolean;
}

export interface PartnerCommissionResult {
  netPaidAmount: number;
  commissionAmount: number;
  isEligible: boolean;
  rejectionReason?: string;
}

/**
 * Net-Revenue Commission Math Engine
 * Strictly enforces that commissions are calculated on the Net Paid Amount:
 * Commission = (Plan Price - Discount) * Partner %
 * Free trials (100% discount, Net <= 0) yield ₹0.00 commission.
 */
export function calculatePartnerCommission(params: PartnerCommissionParams): PartnerCommissionResult {
  const {
    commissionModel,
    grossPlanAmount,
    discountAmount = 0,
    commissionPercent = 0,
    bountyAmount = 0,
    expiresAt,
    isPaused,
  } = params;

  const netPaidAmount = Math.max(0, Number((grossPlanAmount - discountAmount).toFixed(2)));

  if (isPaused) {
    return {
      netPaidAmount,
      commissionAmount: 0,
      isEligible: false,
      rejectionReason: 'PARTNER_PAUSED',
    };
  }

  if (expiresAt) {
    const expiry = new Date(expiresAt);
    if (Date.now() > expiry.getTime()) {
      return {
        netPaidAmount,
        commissionAmount: 0,
        isEligible: false,
        rejectionReason: 'DURATION_EXPIRED',
      };
    }
  }

  let commissionAmount = 0;

  if (commissionModel === 'FLAT_BOUNTY') {
    commissionAmount = Number(bountyAmount.toFixed(2));
  } else if (commissionModel === 'RECURRING_PERCENT') {
    if (netPaidAmount > 0 && commissionPercent > 0) {
      commissionAmount = Number((netPaidAmount * (commissionPercent / 100)).toFixed(2));
    }
  } else if (commissionModel === 'HYBRID') {
    const recurring = (netPaidAmount > 0 && commissionPercent > 0)
      ? Number((netPaidAmount * (commissionPercent / 100)).toFixed(2))
      : 0;
    commissionAmount = Number((recurring + bountyAmount).toFixed(2));
  }

  const isEligible = commissionAmount > 0;

  return {
    netPaidAmount,
    commissionAmount,
    isEligible,
  };
}
