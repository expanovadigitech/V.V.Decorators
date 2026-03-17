// ── Core enums ────────────────────────────────────────────────────────────────
export type BookingStatus  = 'Active' | 'Done' | 'Trashed';
export type EventType      = 'Single Day' | 'Multi-Day';
export type TimingCategory = 'Morning' | 'Afternoon' | 'Evening' | 'Others';
export type MealType       = 'Breakfast' | 'Lunch' | 'High Tea' | 'Dinner';

// ── Single meal entry inside a day ───────────────────────────────────────────
export interface MealEntry {
  venue: string;
  dishes: string[]; // flat tag list
  guestCount?: number;
  extraPlatesCount?: number;
  pricePerPlate?: number;
}

// ── A single day in a multi-day event ────────────────────────────────────────
export interface DayMeal {
  day: number;
  date?: string;    // ISO date string for that specific day
  venue?: string;   // overall day venue
  meals: Record<MealType, MealEntry>;
}

// ── Legacy (kept for backwards-compat hydration) ─────────────────────────────
export interface MealSection {
  guestCount: number;
  venue?: string;
  dishes: Record<string, string[]>;
}

export interface DayOverview {
  day: number;
  label: string;
}

export interface Booking {
  id: string;
  clientName: string;

  // ── Event Scheduling ─────────────────────────────────────────────────────
  eventType: EventType;
  eventDate: string;
  eventEndDate?: string;
  daysOverview?: DayOverview[];

  // ── Multi-Day: NEW Day-first structure ────────────────────────────────────
  dayMeals?: DayMeal[];

  // ── Timing ───────────────────────────────────────────────────────────────
  timingCategory: TimingCategory;
  startTime: string;
  endTime: string;
  customTiming?: string;

  // ── Venue & Guests ────────────────────────────────────────────────────────
  venue: string;
  primaryPhone: string;
  alternativePhone: string;
  guestCount: number;

  // ── Financials ────────────────────────────────────────────────────────────
  perPlateCost: number;
  totalEventValue: number;
  overrideTotalAmount?: number;
  multiDayExtraCharges?: number;
  advancePaid: number;
  paymentMode: 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer';
  chequeNumber?: string;
  balanceAmount: number;

  // ── Status & Menu ─────────────────────────────────────────────────────────
  status: BookingStatus;
  menuItems: Record<string, string[]>;
  mealMenus?: Record<string, MealSection>; // legacy, kept for DB compat
  multiDayPricing?: any;                   // detailed pricing breakdown for multi-day
  invoiceType?: 'Admin' | 'Kitchen';       // for tracking last export type if needed
  notes: string;
  invoiceDescription?: string;             // persistent invoice description

  // ── Facilities ────────────────────────────────────────────────────────────
  roomsRequired: number;
  roomCost?: number;
  swimmingPool: boolean;
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
