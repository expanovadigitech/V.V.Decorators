// ── Core enums ────────────────────────────────────────────────────────────────
// Status simplified: only Active, Done and Trashed (no Lead/Confirmed/Cancelled)
export type BookingStatus  = 'Active' | 'Done' | 'Trashed';
export type EventType      = 'Single Day' | 'Multi-Day';
export type TimingCategory = 'Morning' | 'Afternoon' | 'Evening' | 'Others';

// Meal types for Multi-Day buffet planner
export type MealType = 'Breakfast' | 'Lunch' | 'High Tea' | 'Dinner';

export interface MealSection {
  guestCount: number;
  venue?: string;                            // per-meal venue
  dishes: Record<string, string[]>;          // same categories as single-day menu
}

export interface DayOverview {
  day: number;    // Day 1, Day 2, etc.
  label: string;  // e.g. "Haldi", "Wedding"
}

export interface Booking {
  id: string;
  clientName: string;

  // ── Event Scheduling ─────────────────────────────────────────────────────
  eventType: EventType;
  eventDate: string;             // ISO date string (primary / start date)
  eventEndDate?: string;         // ISO date string (end date for multi-day)
  daysOverview?: DayOverview[];  // per-day sub-event labels (multi-day only)

  // ── Timing ───────────────────────────────────────────────────────────────
  timingCategory: TimingCategory;
  startTime: string;
  endTime: string;
  customTiming?: string;         // free-text when timingCategory === 'Others'

  // ── Venue & Guests ────────────────────────────────────────────────────────
  venue: string;
  primaryPhone: string;
  alternativePhone: string;
  guestCount: number;            // overall / dinner guest count

  // ── Financials ────────────────────────────────────────────────────────────
  perPlateCost: number;
  totalEventValue: number;       // computed: guestCount * perPlateCost
  advancePaid: number;
  paymentMode: 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer';
  chequeNumber?: string;
  balanceAmount: number;         // computed: totalEventValue - advancePaid

  // ── Status & Menu ─────────────────────────────────────────────────────────
  status: BookingStatus;
  menuItems: Record<string, string[]>;        // Single-Day categorised menu
  mealMenus?: Record<string, MealSection>;    // Multi-Day meal sections
  notes: string;
  overrideTotalAmount?: number;              // Manual override for total amount

  // ── Facilities ────────────────────────────────────────────────────────────
  roomsRequired: number;
  roomCost?: number;             // per room cost or total room cost? User asked for "Room Cost" field next to rooms, mathematically it should probably be per room or just a flat total? Let's treat it as total or per room. I will call it roomCost and multiply by roomsRequired in utils.
  swimmingPool: boolean;
  // Migrated from string -> array
  additionalServices: Array<{ id: string; name: string; cost: number }>;

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
  trashedAt?: string;
}

export interface FinancialSummary {
  totalExpectedRevenue: number;
  totalAdvanceReceived: number;
  totalOutstandingBalance: number;
}

export type FilterType    = 'All' | 'Upcoming' | 'This Month' | 'Payment Pending';
export type SortField     = keyof Pick<Booking, 'clientName' | 'eventDate' | 'totalEventValue' | 'balanceAmount'>;
export type SortDirection = 'asc' | 'desc';
