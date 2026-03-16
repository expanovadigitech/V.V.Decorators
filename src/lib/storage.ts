import { Booking } from '@/types';

const STORAGE_KEY = 'vvd_crm_bookings';
const VENUES_KEY = 'vvd_crm_venues';

export const DEFAULT_VENUES = [
  'The Grand Ballroom',
  'Rose Garden Pavilion',
  'Sunset Terrace',
  'Heritage Hall',
  'Crystal Palace',
  'The Lakeside Lawn',
  'Royal Banquet Hall',
  'Garden of Eden Resort',
];

// ─── Bookings ────────────────────────────────────────────────────────────────

export function loadBookings(): Booking[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    // Migrate old string additionalServices to empty array
    return parsed.map(b => ({
      ...b,
      additionalServices: Array.isArray(b.additionalServices) ? b.additionalServices : [],
      roomCost: typeof b.roomCost === 'number' ? b.roomCost : 0,
    })) as Booking[];
  } catch {
    return [];
  }
}

export function saveBookings(bookings: Booking[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function addBooking(booking: Booking): Booking[] {
  const bookings = loadBookings();
  const updated = [booking, ...bookings];
  saveBookings(updated);
  return updated;
}

export function updateBooking(updated: Booking): Booking[] {
  const bookings = loadBookings();
  const list = bookings.map((b) => (b.id === updated.id ? updated : b));
  saveBookings(list);
  return list;
}

export function deleteBooking(id: string): Booking[] {
  const bookings = loadBookings();
  const list = bookings.filter((b) => b.id !== id);
  saveBookings(list);
  return list;
}

// ─── Venues ──────────────────────────────────────────────────────────────────

export function loadVenues(): string[] {
  if (typeof window === 'undefined') return DEFAULT_VENUES;
  try {
    const raw = localStorage.getItem(VENUES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : DEFAULT_VENUES;
  } catch {
    return DEFAULT_VENUES;
  }
}

export function saveVenue(venue: string): string[] {
  const venues = loadVenues();
  if (!venues.includes(venue)) {
    const updated = [...venues, venue];
    localStorage.setItem(VENUES_KEY, JSON.stringify(updated));
    return updated;
  }
  return venues;
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export function exportToCSV(bookings: Booking[]): void {
  const headers = [
    'Client Name',
    'Event Date',
    'Venue',
    'Primary Phone',
    'Alternative Phone',
    'Start Time',
    'End Time',
    'Guest Count',
    'Per Plate Cost',
    'Total Event Value',
    'Advance Paid',
    'Payment Mode',
    'Cheque Number',
    'Balance Amount',
    'Status',
    'Menu Items',
    'Notes',
  ];

  const rows = bookings.map((b) => [
    `"${b.clientName}"`,
    b.eventDate,
    `"${b.venue}"`,
    b.primaryPhone,
    b.alternativePhone,
    b.startTime,
    b.endTime,
    b.guestCount,
    b.perPlateCost,
    b.totalEventValue,
    b.advancePaid,
    b.paymentMode,
    b.chequeNumber ? `"${b.chequeNumber}"` : '',
    b.balanceAmount,
    b.status,
    `"${Object.values(b.menuItems || {}).flat().filter(Boolean).join('; ')}"`,
    `"${b.notes.replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VVD_Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
