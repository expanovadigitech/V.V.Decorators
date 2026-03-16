import { Booking, BookingStatus, FilterType, MealSection, MealType } from '@/types';
import { format, isThisMonth, isFuture, parseISO, startOfDay, differenceInHours } from 'date-fns';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function computeBooking(
  partial: Omit<Booking, 'totalEventValue' | 'balanceAmount'>
): Booking {
  const baseValue = (partial.guestCount || 0) * (partial.perPlateCost || 0);
  const roomValue = (partial.roomsRequired || 0) * (partial.roomCost || 0);
  const addValue  = (partial.additionalServices || []).reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const totalEventValue = baseValue + roomValue + addValue;
  const balanceAmount = totalEventValue - (partial.advancePaid || 0);
  return { ...partial, totalEventValue, balanceAmount } as Booking;
}

// Default meal section template for Multi-Day meal planner
export function createEmptyMealSection(): MealSection {
  return {
    guestCount: 0,
    dishes: {
      'Starters': [],
      'Main Course': [],
      'Roti': [],
      'Chinese': [],
      'Sweet and Ice Cream': [],
      'Salad': [],
      'Others': [],
    },
  };
}

// Default meal menus for Multi-Day
export function createEmptyMealMenus(): Record<string, MealSection> {
  const meals: MealType[] = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'];
  const result: Record<string, MealSection> = {};
  meals.forEach(m => { result[m] = createEmptyMealSection(); });
  return result;
}

export function createEmptyBooking(): Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'totalEventValue' | 'balanceAmount'> {
  return {
    clientName: '',
    eventType: 'Single Day',
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    eventEndDate: '',
    daysOverview: [],
    timingCategory: 'Morning',
    startTime: '10:00',
    endTime: '22:00',
    customTiming: '',
    venue: '',
    primaryPhone: '',
    alternativePhone: '',
    guestCount: 0,
    perPlateCost: 0,
    advancePaid: 0,
    paymentMode: 'Cash',
    status: 'Active',
    menuItems: {
      'Welcome Drinks': [],
      'Starters': [],
      'Main Course': [],
      'Roti': [],
      'Chinese': [],
      'Sweet and Ice Cream': [],
      'Salad': [],
      'Others': [],
    },
    mealMenus: createEmptyMealMenus(),
    notes: '',
    roomsRequired: 0,
    roomCost: 0,
    swimmingPool: false,
    additionalServices: [],
  };
}

export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function validatePhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

export function filterBookings(
  bookings: Booking[],
  filter: FilterType,
  search: string
): Booking[] {
  const today = startOfDay(new Date());

  let result = bookings;

  if (filter === 'Upcoming') {
    result = result.filter((b) => isFuture(parseISO(b.eventDate)) || parseISO(b.eventDate) >= today);
  } else if (filter === 'This Month') {
    result = result.filter((b) => isThisMonth(parseISO(b.eventDate)));
  } else if (filter === 'Payment Pending') {
    result = result.filter((b) => b.balanceAmount > 0 && b.status !== 'Trashed');
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (b) =>
        b.clientName.toLowerCase().includes(q) ||
        b.primaryPhone.includes(q) ||
        b.alternativePhone.includes(q)
    );
  }

  return result;
}

export function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'Active':  return 'status-confirmed';   // green pill
    case 'Done':    return 'status-completed';   // muted/grey pill
    case 'Trashed': return 'status-cancelled';   // red pill
    default:        return 'status-confirmed';
  }
}

/**
 * Returns urgency class for event date:
 *   'date-urgent'  → within 48 hours (red/bold)
 *   'date-soon'    → within 7 days (orange)
 *   ''             → otherwise normal
 */
export function getDateUrgency(dateStr: string): '' | 'date-urgent' | 'date-soon' {
  try {
    const now = new Date();
    const eventDate = parseISO(dateStr);
    const hoursUntil = differenceInHours(eventDate, now);
    if (hoursUntil >= 0 && hoursUntil <= 48) return 'date-urgent';
    if (hoursUntil > 48 && hoursUntil <= 168) return 'date-soon';
    return '';
  } catch {
    return '';
  }
}
