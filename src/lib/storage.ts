import { Booking } from '@/types';
import { supabase } from '@/lib/supabase';

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

export async function loadBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .is('trashedAt', null)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
    
    return (data || []).map(b => ({
      ...b,
      additionalServices: Array.isArray(b.additionalServices) ? b.additionalServices : [],
      roomCost: typeof b.roomCost === 'number' ? b.roomCost : 0,
      daysOverview: Array.isArray(b.daysOverview) ? b.daysOverview : [],
      dayMeals: Array.isArray(b.dayMeals) ? b.dayMeals : [],
      menuItems: typeof b.menuItems === 'object' && b.menuItems !== null ? b.menuItems : {},
      mealMenus: typeof b.mealMenus === 'object' && b.mealMenus !== null ? b.mealMenus : {},
      multiDayPricing: typeof b.multiDayPricing === 'object' && b.multiDayPricing !== null ? b.multiDayPricing : {},
      invoiceType: b.invoiceType || 'Admin',
      invoiceDescription: typeof b.invoiceDescription === 'string' ? b.invoiceDescription : '',
    })) as Booking[];
  } catch (err) {
    console.error('Exception loading bookings:', err);
    return [];
  }
}

export async function addBooking(booking: Booking): Promise<Booking[]> {
  try {
    const { error } = await supabase.from('bookings').insert([booking]);
    if (error) console.error('Error adding booking:', error);
  } catch (err) {
    console.error('Exception adding booking:', err);
  }
  return loadBookings();
}

export async function updateBooking(updated: Booking): Promise<Booking[]> {
  try {
    const { error } = await supabase.from('bookings').update(updated).eq('id', updated.id);
    if (error) console.error('Error updating booking:', error);
  } catch (err) {
    console.error('Exception updating booking:', err);
  }
  return loadBookings();
}

export async function deleteBooking(id: string): Promise<Booking[]> {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) console.error('Error deleting booking:', error);
  } catch (err) {
    console.error('Exception deleting booking:', err);
  }
  return loadBookings();
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
