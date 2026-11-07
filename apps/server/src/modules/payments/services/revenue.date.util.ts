export interface DateRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
}

export function parsePeriodDates(period: string, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const to = customTo ? new Date(customTo) : new Date(now);
  let from = new Date(now);

  switch (period.toLowerCase()) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'yesterday': {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      break;
    }
    case '7d':
    case '7 days':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'last_month':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      to.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      break;
    case '3m':
    case '3 months':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
    case '6 months':
      from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
    case '1 year':
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'custom':
      if (customFrom) from = new Date(customFrom);
      break;
    case '30d':
    case '30 days':
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const durationMs = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - durationMs);
  const days = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

  return { from, to, prevFrom, prevTo, days };
}

export function calcPercentageChange(current: number, previous: number): { change: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' } {
  if (previous === 0) {
    return { change: current > 0 ? 100 : 0, trend: current > 0 ? 'UP' : 'NEUTRAL' };
  }
  const change = Number((((current - previous) / previous) * 100).toFixed(1));
  return {
    change,
    trend: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'NEUTRAL',
  };
}
