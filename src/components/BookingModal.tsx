'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, EventType, TimingCategory, DayOverview, MealType, MealSection } from '@/types';
import {
  generateId, computeBooking, createEmptyBooking, createEmptyMealMenus,
  createEmptyMealSection, validatePhone, formatCurrency,
} from '@/lib/utils';
import { loadVenues, saveVenue } from '@/lib/storage';
import {
  X, Save, ChevronDown, Plus, Trash2, CalendarPlus,
  BedDouble, Waves, Wrench, UtensilsCrossed, ChevronRight,
} from 'lucide-react';

interface Props {
  booking: Booking | null;
  onSave: (booking: Booking) => void;
  onClose: () => void;
}

const PAYMENT_MODES: Booking['paymentMode'][] = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];
const TIMING_CATEGORIES: TimingCategory[] = ['Morning', 'Afternoon', 'Evening', 'Others'];
const EVENT_TYPES: EventType[] = ['Single Day', 'Multi-Day'];
const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'];

// Categories available in every meal section
const MEAL_CATEGORIES: Record<MealType, string[]> = {
  'Breakfast': ['Starters', 'Main Course', 'Others'],
  'Lunch':     ['Starters', 'Main Course', 'Roti', 'Chinese', 'Sweet and Ice Cream', 'Salad', 'Others'],
  'High Tea':  ['Starters', 'Others'],
  'Dinner':    ['Starters', 'Main Course', 'Roti', 'Chinese', 'Sweet and Ice Cream', 'Salad', 'Others'],
};

// Single-day menu categories
const MENU_CATEGORIES = [
  'Welcome Drinks', 'Starters', 'Main Course', 'Roti', 'Chinese',
  'Sweet and Ice Cream', 'Salad', 'Others',
];

const STANDARD_DISHES: Record<string, string[]> = {
  'Welcome Drinks':     ['Fresh Lime Soda', 'Aam Panna', 'Virgin Mojito'],
  'Starters':          ['Paneer Tikka', 'Hara Bhara Kebab', 'Veg Manchurian Dry'],
  'Main Course':       ['Dal Makhani', 'Mix Veg', 'Paneer Butter Masala', 'Veg Biryani'],
  'Roti':              ['Butter Naan', 'Tandoori Roti', 'Missi Roti'],
  'Chinese':           ['Hakka Noodles', 'Veg Fried Rice', 'Chilli Paneer'],
  'Sweet and Ice Cream': ['Gulab Jamun', 'Rasmalai', 'Vanilla Ice Cream'],
  'Salad':             ['Green Salad', 'Russian Salad'],
  'Others':            [],
};

export default function BookingModal({ booking, onSave, onClose }: Props) {
  const [activeTab, setActiveTab]           = useState<'details' | 'facilities' | 'menu'>('details');
  const [venues, setVenues]                 = useState<string[]>([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [customDish, setCustomDish]         = useState('');
  const [customDishCategory, setCustomDishCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [menuSearch, setMenuSearch]                 = useState('');

  // Active accordion for multi-day meal planner
  const [openMeal, setOpenMeal]             = useState<MealType | null>('Breakfast');
  // Category for custom dish in meal section
  const [mealCustomDishCategory, setMealCustomDishCategory] = useState<Record<string, string>>({});
  const [mealCustomDish, setMealCustomDish] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Booking>(() => {
    const empty = createEmptyBooking();
    if (booking) {
      return {
        ...empty,
        ...booking,
        menuItems:   booking.menuItems  || empty.menuItems,
        mealMenus:   booking.mealMenus  || createEmptyMealMenus(),
        eventType:   booking.eventType  || 'Single Day',
        timingCategory: booking.timingCategory || 'Morning',
        daysOverview:   booking.daysOverview   || [],
        roomsRequired:  booking.roomsRequired  || 0,
        swimmingPool:   booking.swimmingPool   || false,
        additionalServices: booking.additionalServices || '',
        id:             booking.id,
        createdAt:      booking.createdAt,
        updatedAt:      booking.updatedAt,
        totalEventValue: booking.totalEventValue,
        balanceAmount:   booking.balanceAmount,
        // migrate old status values to Active
        status: (booking.status === 'Trashed' ? 'Trashed' : booking.status === 'Done' ? 'Done' : 'Active'),
      } as Booking;
    }
    return {
      ...empty,
      id:         generateId(),
      totalEventValue: 0,
      balanceAmount:   0,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    } as Booking;
  });

  useEffect(() => { setVenues(loadVenues()); }, []);

  const updateFinancials = useCallback((updated: Booking) =>
    computeBooking({ ...updated, updatedAt: new Date().toISOString() }), []);

  function setField<K extends keyof Booking>(key: K, value: Booking[K]) {
    setForm(prev => updateFinancials({ ...prev, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  }

  // ── Days Overview ──────────────────────────────────────────────────────────
  function addDayOverview() {
    const current = form.daysOverview || [];
    setField('daysOverview', [...current, { day: current.length + 1, label: '' }]);
  }
  function updateDayOverview(i: number, label: string) {
    const updated = [...(form.daysOverview || [])];
    updated[i] = { ...updated[i], label };
    setField('daysOverview', updated);
  }
  function removeDayOverview(i: number) {
    const updated = (form.daysOverview || [])
      .filter((_, idx) => idx !== i)
      .map((d, idx) => ({ ...d, day: idx + 1 }));
    setField('daysOverview', updated);
  }

  // ── Single-Day menu helpers ────────────────────────────────────────────────
  function toggleDish(category: string, dish: string) {
    const cats = { ...form.menuItems };
    const list = cats[category] || [];
    cats[category] = list.includes(dish) ? list.filter(d => d !== dish) : [...list, dish];
    setField('menuItems', cats);
  }
  function handleAddCustomDish() {
    if (!customDish.trim()) return;
    const cats = { ...form.menuItems };
    const list = cats[customDishCategory] || [];
    if (!list.includes(customDish.trim())) cats[customDishCategory] = [...list, customDish.trim()];
    setField('menuItems', cats);
    setCustomDish('');
  }

  // ── Additional Services ────────────────────────────────────────────────────
  function addAdditionalService() {
    const list = [...(form.additionalServices || [])];
    list.push({ id: generateId(), name: '', cost: 0 });
    setField('additionalServices', list);
  }
  function updateAdditionalService(id: string, key: 'name' | 'cost', value: string | number) {
    const list = [...(form.additionalServices || [])];
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], [key]: value as any };
      setField('additionalServices', list);
    }
  }
  function removeAdditionalService(id: string) {
    const list = (form.additionalServices || []).filter(s => s.id !== id);
    setField('additionalServices', list);
  }

  // ── Multi-Day Meal helpers ─────────────────────────────────────────────────
  function getMealMenus(): Record<string, MealSection> {
    return form.mealMenus || createEmptyMealMenus();
  }
  function setMealGuestCount(meal: string, count: number) {
    const menus = { ...getMealMenus() };
    menus[meal] = { ...menus[meal], guestCount: count };
    setField('mealMenus', menus);
  }
  function toggleMealDish(meal: string, category: string, dish: string) {
    const menus = { ...getMealMenus() };
    const section = { ...(menus[meal] || createEmptyMealSection()) };
    const list = section.dishes[category] || [];
    section.dishes = {
      ...section.dishes,
      [category]: list.includes(dish) ? list.filter(d => d !== dish) : [...list, dish],
    };
    menus[meal] = section;
    setField('mealMenus', menus);
  }
  function addMealCustomDish(meal: string) {
    const dish = (mealCustomDish[meal] || '').trim();
    const cat  = mealCustomDishCategory[meal] || 'Others';
    if (!dish) return;
    const menus   = { ...getMealMenus() };
    const section = { ...(menus[meal] || createEmptyMealSection()) };
    const list    = section.dishes[cat] || [];
    if (!list.includes(dish)) section.dishes = { ...section.dishes, [cat]: [...list, dish] };
    menus[meal] = section;
    setField('mealMenus', menus);
    setMealCustomDish(prev => ({ ...prev, [meal]: '' }));
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.clientName.trim()) e.clientName = 'Client name is required';
    if (!form.eventDate)         e.eventDate  = 'Event date is required';
    if (form.eventType === 'Multi-Day' && !form.eventEndDate) e.eventEndDate = 'End date required';
    if (!form.venue.trim())      e.venue      = 'Venue is required';
    if (!validatePhone(form.primaryPhone))   e.primaryPhone    = 'Enter a valid 10-digit phone';
    if (form.alternativePhone && !validatePhone(form.alternativePhone)) e.alternativePhone = 'Invalid phone';
    if (form.guestCount  < 0)    e.guestCount  = 'Must be 0 or more';
    if (form.perPlateCost < 0)   e.perPlateCost = 'Must be 0 or more';
    if (form.advancePaid  < 0)   e.advancePaid  = 'Must be 0 or more';
    if (form.paymentMode === 'Cheque' && !form.chequeNumber?.trim()) e.chequeNumber = 'Cheque number required';
    if (form.timingCategory === 'Others' && !form.customTiming?.trim()) e.customTiming = 'Please specify timing';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) { setActiveTab('details'); return; }
    const final = computeBooking({ ...form, updatedAt: new Date().toISOString() });
    if (final.paymentMode !== 'Cheque') delete final.chequeNumber;
    if (final.eventType === 'Single Day') { final.eventEndDate = undefined; final.daysOverview = []; }
    if (final.timingCategory !== 'Others') final.customTiming = '';
    if (form.venue && !venues.includes(form.venue)) saveVenue(form.venue);
    onSave(final);
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const isMultiDay = form.eventType === 'Multi-Day';

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal-container">

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{booking ? 'Edit Booking' : 'New Booking'}</h2>
            <p className="modal-subtitle">
              {booking ? `Updating: ${booking.clientName}` : 'Fill in the event details below'}
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`tab-btn ${activeTab === 'details' ? 'active-tab' : ''}`} onClick={() => setActiveTab('details')}>Event Details</button>
          <button className={`tab-btn ${activeTab === 'facilities' ? 'active-tab' : ''}`} onClick={() => setActiveTab('facilities')}>Facilities</button>
          <button className={`tab-btn ${activeTab === 'menu' ? 'active-tab' : ''}`} onClick={() => setActiveTab('menu')}>
            {isMultiDay ? 'Meal Planner' : 'Event Menu'}
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* ═══════ DETAILS TAB ═══════ */}
          {activeTab === 'details' && (
            <div className="form-grid">

              {/* Client Name */}
              <div className="field-group full-width">
                <label className="field-label">Client Name *</label>
                <input type="text" value={form.clientName} onChange={e => setField('clientName', e.target.value)}
                  placeholder="e.g. Rahul & Priya Sharma" className={`field-input ${errors.clientName ? 'input-error' : ''}`} />
                {errors.clientName && <span className="error-msg">{errors.clientName}</span>}
              </div>

              {/* Event Type */}
              <div className="field-group full-width">
                <label className="field-label">Event Type</label>
                <div className="event-type-toggle">
                  {EVENT_TYPES.map(et => (
                    <button key={et} type="button"
                      className={`event-type-btn ${form.eventType === et ? 'event-type-active' : ''}`}
                      onClick={() => setField('eventType', et)}>
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single Day Date */}
              {!isMultiDay && (
                <div className="field-group">
                  <label className="field-label">Event Date *</label>
                  <input type="date" value={form.eventDate} onChange={e => setField('eventDate', e.target.value)}
                    className={`field-input ${errors.eventDate ? 'input-error' : ''}`} />
                  {errors.eventDate && <span className="error-msg">{errors.eventDate}</span>}
                </div>
              )}

              {/* Multi-Day Dates + Days Overview */}
              {isMultiDay && (
                <>
                  <div className="field-group">
                    <label className="field-label">Start Date *</label>
                    <input type="date" value={form.eventDate} onChange={e => setField('eventDate', e.target.value)}
                      className={`field-input ${errors.eventDate ? 'input-error' : ''}`} />
                    {errors.eventDate && <span className="error-msg">{errors.eventDate}</span>}
                  </div>
                  <div className="field-group">
                    <label className="field-label">End Date *</label>
                    <input type="date" value={form.eventEndDate || ''} onChange={e => setField('eventEndDate', e.target.value)}
                      min={form.eventDate} className={`field-input ${errors.eventEndDate ? 'input-error' : ''}`} />
                    {errors.eventEndDate && <span className="error-msg">{errors.eventEndDate}</span>}
                  </div>

                  <div className="field-group full-width">
                    <div className="days-overview-header">
                      <label className="field-label" style={{ marginBottom: 0 }}>
                        <CalendarPlus size={14} style={{ display: 'inline', marginRight: 6 }} />Days Overview
                      </label>
                      <button type="button" className="btn-secondary btn-sm" onClick={addDayOverview}>
                        <Plus size={13} /> Add Day
                      </button>
                    </div>
                    {(form.daysOverview || []).length === 0 && (
                      <p className="days-overview-hint">Click "Add Day" to note what happens each day (e.g. Day 1: Haldi).</p>
                    )}
                    <div className="days-overview-list">
                      {(form.daysOverview || []).map((d, i) => (
                        <div key={i} className="day-overview-row">
                          <span className="day-label-badge">Day {d.day}</span>
                          <input type="text" value={d.label} onChange={e => updateDayOverview(i, e.target.value)}
                            placeholder="e.g. Haldi, Mehndi, Wedding…" className="field-input day-label-input" />
                          <button type="button" className="action-btn delete-btn" onClick={() => removeDayOverview(i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Venue */}
              <div className="field-group full-width venue-field-wrap">
                <label className="field-label">Venue *</label>
                <div className="venue-input-group">
                  <input type="text" value={form.venue} onChange={e => setField('venue', e.target.value)}
                    placeholder="Type venue name or pick from list"
                    className={`field-input ${errors.venue ? 'input-error' : ''}`} />
                  <button type="button" className="venue-dropdown-btn" onClick={() => setShowVenueDropdown(v => !v)}>
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showVenueDropdown && (
                  <div className="venue-dropdown">
                    {venues.map(v => (
                      <button key={v} type="button" className="venue-option"
                        onClick={() => { setField('venue', v); setShowVenueDropdown(false); }}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {errors.venue && <span className="error-msg">{errors.venue}</span>}
              </div>

              {/* Phones */}
              <div className="field-group">
                <label className="field-label">Primary Phone *</label>
                <input type="tel" value={form.primaryPhone}
                  onChange={e => setField('primaryPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number" className={`field-input ${errors.primaryPhone ? 'input-error' : ''}`} />
                {errors.primaryPhone && <span className="error-msg">{errors.primaryPhone}</span>}
              </div>
              <div className="field-group">
                <label className="field-label">Alternative Phone</label>
                <input type="tel" value={form.alternativePhone}
                  onChange={e => setField('alternativePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number (optional)" className={`field-input ${errors.alternativePhone ? 'input-error' : ''}`} />
                {errors.alternativePhone && <span className="error-msg">{errors.alternativePhone}</span>}
              </div>

              {/* Timing */}
              <div className="field-group">
                <label className="field-label">Timing</label>
                <select value={form.timingCategory} onChange={e => setField('timingCategory', e.target.value as TimingCategory)} className="field-input">
                  {TIMING_CATEGORIES.map(tc => <option key={tc} value={tc}>{tc}</option>)}
                </select>
              </div>

              {/* Multi-Day: Start/End time for logistics */}
              {isMultiDay && form.timingCategory !== 'Others' && (
                <>
                  <div className="field-group">
                    <label className="field-label">Start Time</label>
                    <input type="time" value={form.startTime} onChange={e => setField('startTime', e.target.value)} className="field-input" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">End Time</label>
                    <input type="time" value={form.endTime} onChange={e => setField('endTime', e.target.value)} className="field-input" />
                  </div>
                </>
              )}

              {/* Custom timing */}
              {form.timingCategory === 'Others' && (
                <div className="field-group full-width">
                  <label className="field-label">Specify Timing *</label>
                  <input type="text" value={form.customTiming || ''} onChange={e => setField('customTiming', e.target.value)}
                    placeholder="e.g. 11 PM to 4 AM" className={`field-input ${errors.customTiming ? 'input-error' : ''}`} />
                  {errors.customTiming && <span className="error-msg">{errors.customTiming}</span>}
                </div>
              )}

              {/* Guest Count */}
              <div className="field-group">
                <label className="field-label">{isMultiDay ? 'Overall / Dinner Guests' : 'Total Guests'}</label>
                <input type="number" min={0} value={form.guestCount || ''} onChange={e => setField('guestCount', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 250" className={`field-input ${errors.guestCount ? 'input-error' : ''}`} />
                {errors.guestCount && <span className="error-msg">{errors.guestCount}</span>}
              </div>

              {/* Per Plate Cost */}
              <div className="field-group">
                <label className="field-label">Per Plate Cost (₹)</label>
                <input type="number" min={0} value={form.perPlateCost || ''} onChange={e => setField('perPlateCost', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 850" className={`field-input ${errors.perPlateCost ? 'input-error' : ''}`} />
                {errors.perPlateCost && <span className="error-msg">{errors.perPlateCost}</span>}
              </div>

              {/* Total Event Value */}
              <div className="field-group computed-field">
                <label className="field-label">Total Event Value</label>
                <div className="computed-display">{formatCurrency(form.totalEventValue)}</div>
                <span className="computed-hint">Guests × Per Plate</span>
              </div>

              {/* Advance Paid */}
              <div className="field-group">
                <label className="field-label">Advance Paid (₹)</label>
                <input type="number" min={0} value={form.advancePaid || ''} onChange={e => setField('advancePaid', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 50000" className={`field-input ${errors.advancePaid ? 'input-error' : ''}`} />
                {errors.advancePaid && <span className="error-msg">{errors.advancePaid}</span>}
              </div>

              {/* Payment Mode */}
              <div className="field-group">
                <label className="field-label">Payment Mode</label>
                <select value={form.paymentMode} onChange={e => setField('paymentMode', e.target.value as any)} className="field-input">
                  {PAYMENT_MODES.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>

              {form.paymentMode === 'Cheque' && (
                <div className="field-group">
                  <label className="field-label">Cheque Number *</label>
                  <input type="text" value={form.chequeNumber || ''} onChange={e => setField('chequeNumber', e.target.value)}
                    placeholder="e.g. 123456" className={`field-input ${errors.chequeNumber ? 'input-error' : ''}`} />
                  {errors.chequeNumber && <span className="error-msg">{errors.chequeNumber}</span>}
                </div>
              )}

              {/* Balance */}
              <div className={`field-group computed-field ${form.paymentMode !== 'Cheque' ? 'full-width' : ''}`}>
                <label className="field-label">Balance Amount</label>
                <div className={`computed-display ${form.balanceAmount > 0 ? 'balance-due' : 'balance-clear'}`}>
                  {formatCurrency(form.balanceAmount)}
                </div>
                <span className="computed-hint">Total − Advance</span>
              </div>

              {/* Notes */}
              <div className="field-group full-width">
                <label className="field-label">Notes / Special Requests</label>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)}
                  placeholder="Flower preferences, stage theme, lighting specifics, dietary requirements…"
                  rows={4} className="field-input field-textarea" />
              </div>
            </div>
          )}

          {/* ═══════ FACILITIES TAB ═══════ */}
          {activeTab === 'facilities' && (
            <div className="form-grid">
              <div className="field-group full-width">
                <div className="facilities-section-header">
                  <span className="facilities-icon"><BedDouble size={18} /></span>
                  <h3 className="facilities-section-title">Accommodation & Facilities</h3>
                </div>
                <p className="facilities-hint">Specify the accommodation and additional services required for this event.</p>
              </div>
              <div className="field-group">
                <label className="field-label"><BedDouble size={14} style={{ display: 'inline', marginRight: 5 }} />Rooms Required</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" min={0} value={form.roomsRequired || ''} onChange={e => setField('roomsRequired', parseInt(e.target.value) || 0)}
                    placeholder="Count" className="field-input" style={{ width: '40%' }} />
                  <input type="number" min={0} value={form.roomCost || ''} onChange={e => setField('roomCost', parseInt(e.target.value) || 0)}
                    placeholder="Rate (₹)" className="field-input" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="field-group">
                <label className="field-label"><Waves size={14} style={{ display: 'inline', marginRight: 5 }} />Pool Access</label>
                <div className="pool-toggle-group">
                  <button type="button" className={`pool-toggle-btn ${form.swimmingPool ? 'pool-active' : ''}`} onClick={() => setField('swimmingPool', true)}>Yes</button>
                  <button type="button" className={`pool-toggle-btn ${!form.swimmingPool ? 'pool-active' : ''}`} onClick={() => setField('swimmingPool', false)}>No</button>
                </div>
              </div>
              <div className="field-group full-width">
                <div className="facilities-section-header" style={{ marginTop: '0.5rem' }}>
                  <span className="facilities-icon"><Wrench size={18} /></span>
                  <h3 className="facilities-section-title">Additional Services</h3>
                </div>
                {(form.additionalServices || []).map((service) => (
                  <div key={service.id} className="custom-dish-input-wrap mb-2">
                    <input type="text" placeholder="Service Name (e.g. Generator)" value={service.name}
                      onChange={e => updateAdditionalService(service.id, 'name', e.target.value)} className="field-input" style={{ flex: 2 }} />
                    <input type="number" placeholder="Cost (₹)" value={service.cost || ''}
                      onChange={e => updateAdditionalService(service.id, 'cost', parseInt(e.target.value) || 0)} className="field-input" style={{ flex: 1 }} />
                    <button type="button" onClick={() => removeAdditionalService(service.id)} className="btn-secondary" style={{ color: 'var(--status-cancelled)', padding: '0.4rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addAdditionalService} className="btn-secondary" style={{ width: 'max-content' }}>
                  <Plus size={16} /> Add Service
                </button>
              </div>
            </div>
          )}

          {/* ═══════ MENU / MEAL PLANNER TAB ═══════ */}
          {activeTab === 'menu' && (
            <>
              <div className="field-group full-width" style={{ marginBottom: '1rem' }}>
                <input type="text" placeholder="Search dishes..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} className="field-input search-input" />
              </div>

              {/* ── Single Day: standard category checklist ── */}
              {!isMultiDay && (
                <div className="menu-tab-content">
                  {MENU_CATEGORIES.map(category => {
                    const filteredDishes = (STANDARD_DISHES[category] || []).filter(d => d.toLowerCase().includes(menuSearch.toLowerCase()));
                    const customDishes = (form.menuItems[category] || []).filter(d => !(STANDARD_DISHES[category] || []).includes(d)).filter(d => d.toLowerCase().includes(menuSearch.toLowerCase()));

                    if (filteredDishes.length === 0 && customDishes.length === 0 && menuSearch) return null;

                    return (
                    <div key={category} className="menu-category-section mb-6">
                      <h3 className="menu-section-title">{category}</h3>
                      <div className="dishes-grid">
                        {filteredDishes.map(dish => (
                          <label key={dish} className="dish-checkbox">
                            <input type="checkbox" checked={(form.menuItems[category] || []).includes(dish)} onChange={() => toggleDish(category, dish)} />
                            <span>{dish}</span>
                          </label>
                        ))}
                        {customDishes.map(dish => (
                          <div key={dish} className="custom-dish-item dish-checkbox" style={{ padding: '0.4rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer' }}>
                              <input type="checkbox" checked onChange={() => toggleDish(category, dish)} />
                              <span>{dish}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}
                  <div className="custom-dish-adder mt-6">
                    <h3 className="menu-section-title">Add Custom Dish</h3>
                    <div className="custom-dish-input-wrap">
                      <select value={customDishCategory} onChange={e => setCustomDishCategory(e.target.value)} className="field-input m-category-select" style={{ flex: 1 }}>
                        {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="text" value={customDish} onChange={e => setCustomDish(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomDish())}
                        placeholder="Type a custom dish name…" className="field-input" style={{ flex: 2 }} />
                      <button type="button" onClick={handleAddCustomDish} className="btn-secondary">
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Multi-Day: Meal Planner accordion ── */}
              {isMultiDay && (
                <div className="meal-planner">
                  <div className="meal-planner-header">
                    <UtensilsCrossed size={16} />
                    <span>Buffet Meal Planner</span>
                    <span className="meal-planner-hint">Set menu & guest count per meal session</span>
                  </div>

                  {MEAL_TYPES.map(meal => {
                    const section  = (form.mealMenus || {})[meal] || createEmptyMealSection();
                    const cats     = MEAL_CATEGORIES[meal] || [];
                    const isOpen   = openMeal === meal;
                    const mealCat  = mealCustomDishCategory[meal] || cats[0] || 'Others';
                    const mealDish = mealCustomDish[meal] || '';

                    // Count selected dishes across all categories
                    const totalDishes = cats.reduce((n, c) => n + (section.dishes[c] || []).length, 0);

                    return (
                      <div key={meal} className={`meal-accordion ${isOpen ? 'meal-open' : ''}`}>
                        <button type="button" className="meal-accordion-header" onClick={() => setOpenMeal(isOpen ? null : meal)}>
                          <div className="meal-header-left">
                            <ChevronRight size={15} className={`meal-chevron ${isOpen ? 'meal-chevron-open' : ''}`} />
                            <span className="meal-title">{meal}</span>
                            {totalDishes > 0 && <span className="meal-dish-count">{totalDishes} dish{totalDishes !== 1 ? 'es' : ''}</span>}
                          </div>
                          <div className="meal-guest-input" onClick={e => e.stopPropagation()}>
                            <label>Guests:</label>
                            <input type="number" min={0} value={section.guestCount || ''} onChange={e => setMealGuestCount(meal, parseInt(e.target.value) || 0)}
                              placeholder="0" className="field-input meal-guest-field" />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="meal-accordion-body">
                            {cats.map(cat => {
                              const filteredDishes = (STANDARD_DISHES[cat] || []).filter(d => d.toLowerCase().includes(menuSearch.toLowerCase()));
                              const customDishes = (section.dishes[cat] || []).filter(d => !(STANDARD_DISHES[cat] || []).includes(d)).filter(d => d.toLowerCase().includes(menuSearch.toLowerCase()));

                              if (filteredDishes.length === 0 && customDishes.length === 0 && menuSearch) return null;

                              return (
                              <div key={cat} className="meal-category-block">
                                <h4 className="meal-cat-title">{cat}</h4>
                                <div className="dishes-grid">
                                  {filteredDishes.map(dish => (
                                    <label key={dish} className="dish-checkbox">
                                      <input type="checkbox" checked={(section.dishes[cat] || []).includes(dish)} onChange={() => toggleMealDish(meal, cat, dish)} />
                                      <span>{dish}</span>
                                    </label>
                                  ))}
                                  {/* Custom dishes in this category */}
                                  {customDishes.map(dish => (
                                    <label key={dish} className="dish-checkbox">
                                      <input type="checkbox" checked onChange={() => toggleMealDish(meal, cat, dish)} />
                                      <span>{dish}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )})}

                            {/* Custom dish adder for meal */}
                            <div className="meal-custom-dish-row">
                              <select value={mealCat} onChange={e => setMealCustomDishCategory(p => ({ ...p, [meal]: e.target.value }))} className="field-input" style={{ flex: 1, minWidth: 0 }}>
                                {cats.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input type="text" value={mealDish} onChange={e => setMealCustomDish(p => ({ ...p, [meal]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMealCustomDish(meal))}
                                placeholder="Custom dish…" className="field-input" style={{ flex: 2, minWidth: 0 }} />
                              <button type="button" onClick={() => addMealCustomDish(meal)} className="btn-secondary btn-sm">
                                <Plus size={14} /> Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={16} />
            {booking ? 'Save Changes' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
