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

  // Active accordion for day card
  const [openDayIdx, setOpenDayIdx] = useState<number | null>(0);
  
  // Custom dish text input state keyed by `${dayIdx}-${mealType}`
  const [customDishInputs, setCustomDishInputs] = useState<Record<string, string>>({});

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

  // ── Multi-Day Meal helpers (Day First) ─────────────────────────────────────
  function handleAddDayMeal() {
    const arr = [...(form.dayMeals || [])];
    arr.push({
      day: arr.length + 1,
      date: '',
      venue: '',
      meals: {
        'Breakfast': { venue: '', dishes: [] },
        'Lunch': { venue: '', dishes: [] },
        'High Tea': { venue: '', dishes: [] },
        'Dinner': { venue: '', dishes: [] }
      }
    });
    setField('dayMeals', arr);
  }

  function handleRemoveDayMeal(idx: number) {
    const arr = (form.dayMeals || []).filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 }));
    setField('dayMeals', arr);
  }

  function updateDayMealField(idx: number, field: any, value: any) {
    const arr = [...(form.dayMeals || [])];
    arr[idx] = { ...arr[idx], [field]: value };
    setField('dayMeals', arr);
  }

  function updateMealEntry(dayIdx: number, mealType: MealType, field: any, value: any) {
    const arr = [...(form.dayMeals || [])];
    const meals = { ...arr[dayIdx].meals };
    meals[mealType] = { ...meals[mealType], [field]: value };
    arr[dayIdx] = { ...arr[dayIdx], meals };
    setField('dayMeals', arr);
  }

  function addDishToMeal(dayIdx: number, mealType: MealType) {
    const key = `${dayIdx}-${mealType}`;
    const dish = (customDishInputs[key] || '').trim();
    if (!dish) return;

    const arr = [...(form.dayMeals || [])];
    const entry = arr[dayIdx].meals[mealType];
    if (!entry.dishes.includes(dish)) {
      updateMealEntry(dayIdx, mealType, 'dishes', [...entry.dishes, dish]);
    }
    setCustomDishInputs(prev => ({ ...prev, [key]: '' }));
  }

  function removeDishFromMeal(dayIdx: number, mealType: MealType, dishToRemove: string) {
    const arr = [...(form.dayMeals || [])];
    const entry = arr[dayIdx].meals[mealType];
    updateMealEntry(dayIdx, mealType, 'dishes', entry.dishes.filter(d => d !== dishToRemove));
  }

  // ── Validate (flexible — only block obvious errors) ──────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    // Only validate negatives and conditional fields
    if (form.guestCount  < 0)   e.guestCount  = 'Must be 0 or more';
    if (form.perPlateCost < 0)  e.perPlateCost = 'Must be 0 or more';
    if (form.advancePaid  < 0)  e.advancePaid  = 'Must be 0 or more';
    if (form.paymentMode === 'Cheque' && !form.chequeNumber?.trim()) e.chequeNumber = 'Cheque number required';
    if (form.timingCategory === 'Others' && !form.customTiming?.trim()) e.customTiming = 'Please specify timing';
    if (form.eventType === 'Multi-Day' && form.eventDate && form.eventEndDate && form.eventEndDate < form.eventDate) {
      e.eventEndDate = 'End date cannot be before start date';
    }
    if (form.primaryPhone && !/^\d{10}$/.test(form.primaryPhone)) e.primaryPhone = 'Enter a valid 10-digit phone';
    if (form.alternativePhone && !/^\d{10}$/.test(form.alternativePhone)) e.alternativePhone = 'Invalid phone';
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

              {/* Total Event Value — editable override */}
              <div className="field-group computed-field">
                <label className="field-label">Total Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.overrideTotalAmount != null ? form.overrideTotalAmount : (form.totalEventValue || '')}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setForm(prev => {
                      const updated = { ...prev, overrideTotalAmount: val };
                      return computeBooking({ ...updated, updatedAt: new Date().toISOString() });
                    });
                  }}
                  placeholder="Auto-calculated or enter manually"
                  className="field-input"
                />
                <span className="computed-hint">
                  {form.guestCount && form.perPlateCost
                    ? `${form.guestCount} guests × ₹${form.perPlateCost} = auto`
                    : 'Enter manually if no per-plate pricing'}
                </span>
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

              {/* ── Multi-Day: Day-wise Meal Planner ── */}
              {isMultiDay && (
                <div className="meal-planner">
                  <div className="meal-planner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <UtensilsCrossed size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      <span style={{ fontWeight: 600 }}>Multi-Day Itinerary</span>
                      <p className="meal-planner-hint" style={{ marginTop: '2px' }}>Configure dates, venues, and meals per day</p>
                    </div>
                    <button type="button" className="btn-secondary btn-sm" onClick={handleAddDayMeal}>
                      <Plus size={14} /> Add Day
                    </button>
                  </div>

                  {(form.dayMeals || []).map((dayMeal, dayIdx) => {
                    const isOpen = openDayIdx === dayIdx;
                    return (
                      <div key={dayIdx} className={`meal-accordion ${isOpen ? 'meal-open' : ''}`} style={{ marginBottom: '1rem' }}>
                        
                        <div className="meal-accordion-header" onClick={() => setOpenDayIdx(isOpen ? null : dayIdx)} style={{ display: 'flex', gap: '1rem', cursor: 'pointer' }}>
                          <div className="meal-header-left" style={{ flex: 1 }}>
                            <ChevronRight size={15} className={`meal-chevron ${isOpen ? 'meal-chevron-open' : ''}`} />
                            <span className="meal-title">Day {dayMeal.day}</span>
                            {dayMeal.date && <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dayMeal.date}</span>}
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveDayMeal(dayIdx); }} className="action-btn delete-btn">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {isOpen && (
                          <div className="meal-accordion-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
                            
                            {/* Day Header Inputs */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="field-label">Date</label>
                                <input type="date" value={dayMeal.date || ''} onChange={e => updateDayMealField(dayIdx, 'date', e.target.value)} className="field-input" />
                              </div>
                              <div className="field-group" style={{ flex: 2, marginBottom: 0 }}>
                                <label className="field-label">Overall Venue for Day {dayMeal.day}</label>
                                <input type="text" value={dayMeal.venue || ''} onChange={e => updateDayMealField(dayIdx, 'venue', e.target.value)} placeholder="e.g. Lawn + Banquet" className="field-input" />
                              </div>
                            </div>

                            <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />

                            {/* 4 Meals Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                              {MEAL_TYPES.map(meal => {
                                const entry = dayMeal.meals[meal];
                                const cats = MEAL_CATEGORIES[meal] || [];

                                return (
                                  <div key={meal} className="day-meal-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    
                                    <h4 className="meal-cat-title" style={{ color: 'var(--gold)', fontSize: '1.05rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{meal}</h4>
                                    
                                    <div className="field-group full-width" style={{ marginBottom: '1rem' }}>
                                      <label className="field-label" style={{ marginBottom: '0.35rem' }}>Venue for {meal}</label>
                                      <input type="text" value={entry.venue || ''} onChange={e => updateMealEntry(dayIdx, meal, 'venue', e.target.value)} placeholder={`e.g. Poolside Hall`} className="field-input" style={{ background: 'var(--surface-light)' }} />
                                    </div>

                                    {/* Dish Selection */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                      {cats.map(cat => {
                                        const stdDishes = STANDARD_DISHES[cat] || [];
                                        const filteredStd = stdDishes.filter(d => d.toLowerCase().includes(menuSearch.toLowerCase()));
                                        if (filteredStd.length === 0 && menuSearch) return null;

                                        return (
                                          <div key={cat} className="meal-category-block">
                                            <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{cat}</h5>
                                            <div className="dishes-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                                              {filteredStd.map(dish => (
                                                <label key={dish} className="dish-checkbox">
                                                  <input type="checkbox" checked={entry.dishes.includes(dish)} 
                                                    onChange={(e) => {
                                                      if (e.target.checked) updateMealEntry(dayIdx, meal, 'dishes', [...entry.dishes, dish]);
                                                      else removeDishFromMeal(dayIdx, meal, dish);
                                                    }} 
                                                  />
                                                  <span style={{ fontSize: '0.85rem' }}>{dish}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Custom Dishes Added */}
                                      {entry.dishes.filter(d => !Object.values(STANDARD_DISHES).flat().includes(d)).length > 0 && (
                                        <div className="meal-category-block mt-2">
                                          <h5 style={{ fontSize: '0.8rem', color: 'var(--gold-dark)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Custom Additions</h5>
                                          <div className="dishes-grid">
                                            {entry.dishes.filter(d => !Object.values(STANDARD_DISHES).flat().includes(d)).map(dish => (
                                              <label key={dish} className="dish-checkbox" style={{ background: 'rgba(212,175,55,0.05)', borderRadius: '4px', padding: '4px' }}>
                                                <input type="checkbox" checked onChange={() => removeDishFromMeal(dayIdx, meal, dish)} />
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{dish}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Add Custom Dish Input */}
                                      <div className="meal-custom-dish-row mt-2" style={{ maxWidth: '400px' }}>
                                        <input type="text" 
                                          value={customDishInputs[`${dayIdx}-${meal}`] || ''} 
                                          onChange={e => setCustomDishInputs(p => ({ ...p, [`${dayIdx}-${meal}`]: e.target.value }))}
                                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDishToMeal(dayIdx, meal))}
                                          placeholder="Type custom dish..." className="field-input m-category-select" style={{ fontSize: '0.85rem', padding: '0.5rem' }} />
                                        <button type="button" onClick={() => addDishToMeal(dayIdx, meal)} className="btn-secondary btn-sm" style={{ padding: '0 0.8rem' }}>
                                          <Plus size={14} /> Add
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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
