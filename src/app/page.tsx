'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Booking, FinancialSummary, FilterType, SortField, SortDirection } from '@/types';
import {
  loadBookings,
  addBooking,
  updateBooking,
  deleteBooking,
  exportToCSV,
} from '@/lib/storage';
import { filterBookings } from '@/lib/utils';
import SummaryCards from '@/components/SummaryCards';
import SearchFilter from '@/components/SearchFilter';
import BookingsTable from '@/components/BookingsTable';
import BookingModal from '@/components/BookingModal';
import InvoiceModal, { InvoiceBillingParams } from '@/components/InvoiceModal';
import Toast, { ToastMessage } from '@/components/Toast';
import { Plus, Download, Flower2, Moon, Sun, X, Minus, ALargeSmall } from 'lucide-react';
import { generateKitchenPDF, generateInvoicePDF } from '@/lib/pdf';

export default function CRMPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [modal, setModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  });
  const [viewMenuBooking, setViewMenuBooking] = useState<Booking | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Invoice Pre-flight Modal ─────────────────────────────────────────────────
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  });

  // ── Theme State ─────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<number>(16);

  // Load from localStorage/Supabase on mount
  useEffect(() => {
    loadBookings().then(setBookings);
    const savedTheme = localStorage.getItem('vvd_theme');
    if (savedTheme === 'dark') setTheme('dark');
    
    const savedFontSize = localStorage.getItem('vvd_font_size');
    if (savedFontSize) setFontSize(Number(savedFontSize));
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('vvd_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('vvd_theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    localStorage.setItem('vvd_font_size', fontSize.toString());
  }, [fontSize]);

  // ─── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  async function handleSave(booking: Booking) {
    const existing = bookings.find((b) => b.id === booking.id);
    if (existing) {
      setBookings(await updateBooking(booking));
      pushToast(`✓ Booking for "${booking.clientName}" updated successfully`);
    } else {
      setBookings(await addBooking(booking));
      pushToast(`✓ New booking for "${booking.clientName}" created`);
    }
    setModal({ open: false, booking: null });
  }

  function handleDeleteRequest(id: string) {
    setConfirmDelete(id);
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    const b = bookings.find((x) => x.id === confirmDelete);
    setBookings(await deleteBooking(confirmDelete));
    pushToast(`Booking for "${b?.clientName}" permanently deleted`, 'error');
    setConfirmDelete(null);
  }

  // ── Mark as Done (Completed) ──────────────────────────────────────────
  async function handleMarkDone(id: string) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    setBookings(await updateBooking({ ...b, status: 'Done', updatedAt: new Date().toISOString() }));
    pushToast(`✓ "${b.clientName}" marked as Done`);
  }

  // ── Soft-delete (Trash) ─────────────────────────────────────────────
  async function handleTrashRequest(id: string) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    const updated = await updateBooking({ ...b, status: 'Trashed', trashedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setBookings(updated);
    pushToast(`"${b.clientName}" moved to Trash`, 'error');
  }

  async function handleRestore(id: string) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    setBookings(await updateBooking({ ...b, status: 'Active', trashedAt: null as any, updatedAt: new Date().toISOString() }));
    pushToast(`✓ "${b.clientName}" restored`);
  }

  // Permanent delete (from Trash)
  const [confirmPermDelete, setConfirmPermDelete] = useState<string | null>(null);

  function handlePermanentDeleteRequest(id: string) {
    setConfirmPermDelete(id);
  }

  async function handlePermanentDeleteConfirm() {
    if (!confirmPermDelete) return;
    const b = bookings.find(x => x.id === confirmPermDelete);
    setBookings(await deleteBooking(confirmPermDelete));
    pushToast(`"${b?.clientName}" permanently deleted`, 'error');
    setConfirmPermDelete(null);
  }

  // ─── Sorting ────────────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // ─── Derived: filtered + sorted bookings ────────────────────────────────────
  // Trashed bookings are excluded from main filter/sort but appended at end
  // so BookingsTable can render the Trash section below active entries.
  const displayedBookings = useMemo(() => {
    const nonTrashed = bookings.filter(b => b.status !== 'Trashed');
    const filtered   = filterBookings(nonTrashed, filter, search);
    const sorted = [...filtered].sort((a, b) => {
      let av: string | number = a[sortField] as string | number;
      let bv: string | number = b[sortField] as string | number;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    // Archive Done events to the bottom of the active list
    const active  = sorted.filter(b => b.status !== 'Done');
    const done    = sorted.filter(b => b.status === 'Done');
    // Trashed entries appended last (rendered in the Trash section by BookingsTable)
    const trashed = bookings.filter(b => b.status === 'Trashed');
    return [...active, ...done, ...trashed];
  }, [bookings, filter, search, sortField, sortDir]);

  // ── Mark Active (revert Done → Active) ─────────────────────────────────────
  async function handleMarkActive(id: string) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    setBookings(await updateBooking({ ...b, status: 'Active', updatedAt: new Date().toISOString() }));
    pushToast(`✓ "${b.clientName}" set back to Active`);
  }

  // ─── Derived: financial summary ─────────────────────────────────────────────
  const summary = useMemo<FinancialSummary>(() => {
    const nonTrashed = bookings.filter(b => b.status !== 'Trashed');
    return {
      totalExpectedRevenue:    nonTrashed.reduce((s, b) => s + b.totalEventValue, 0),
      totalAdvanceReceived:    nonTrashed.reduce((s, b) => s + b.advancePaid, 0),
      totalOutstandingBalance: nonTrashed.reduce((s, b) => s + b.balanceAmount, 0),
    };
  }, [bookings]);

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  function handleExport() {
    exportToCSV(displayedBookings);
    pushToast(`✓ Exported ${displayedBookings.length} booking(s) to CSV`);
  }

  // ─── Invoice Pre-flight modal ─────────────────────────────────────────────
  function handleInvoiceRequest(booking: Booking) {
    setInvoiceModal({ open: true, booking });
  }

  async function handleInvoiceConfirm(params: InvoiceBillingParams) {
    if (!invoiceModal.booking) return;
    const b = invoiceModal.booking;

    generateInvoicePDF(b, params);
    pushToast(`✓ Invoice exported for ${b.clientName}`);

    // Always save the updated custom description (and optionally financial updates)
    let updatedBooking: Booking = { ...b, invoiceDescription: params.customDescription, invoiceType: 'Admin' };

    if (params.saveToRecord && params.includeAdditional) {
      updatedBooking = {
        ...updatedBooking,
        totalEventValue: params.grandTotal,
        balanceAmount: params.finalBalance,
      };
    }

    const updated = await updateBooking(updatedBooking);
    setBookings(updated);
    
    // Only toast about record update if financial values were changed and saved
    if (params.saveToRecord && params.includeAdditional) {
      pushToast(`✓ Booking record updated for ${b.clientName}`);
    }

    setInvoiceModal({ open: false, booking: null });
  }

  return (
    <div className="crm-root">
      {/* ── Header ── */}
      <header className="crm-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Flower2 size={28} />
          </div>
          <div>
            <h1 className="brand-title">V.V. Decorators</h1>
            <p className="brand-subtitle">Event Booking Management</p>
          </div>
        </div>
        <div className="header-actions desktop-actions">
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="btn-icon theme-toggle-btn" title="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <div className="font-size-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--white)', padding: '0.2rem', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)' }}>
            <button 
              onClick={() => setFontSize(s => Math.max(12, s - 1))} 
              className="btn-icon" 
              style={{ width: '30px', height: '30px', border: 'none' }}
              title="Decrease Font Size"
            >
              <Minus size={14} />
            </button>
            <div style={{ padding: '0 0.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ALargeSmall size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{fontSize}px</span>
            </div>
            <button 
              onClick={() => setFontSize(s => Math.min(24, s + 1))} 
              className="btn-icon" 
              style={{ width: '30px', height: '30px', border: 'none' }}
              title="Increase Font Size"
            >
              <Plus size={14} />
            </button>
          </div>
          <button onClick={handleExport} className="btn-outline" disabled={displayedBookings.length === 0}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setModal({ open: true, booking: null })}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="crm-main">
        {/* Financial Summary */}
        <SummaryCards summary={summary} />

        {/* Dashboard Panel */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              Event Bookings
              <span className="booking-count">{displayedBookings.length}</span>
            </h2>
          </div>

          <SearchFilter
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />

          <BookingsTable
            bookings={displayedBookings}
            onEdit={(b) => setModal({ open: true, booking: b })}
            onTrash={handleTrashRequest}
            onMarkDone={handleMarkDone}
            onMarkActive={handleMarkActive}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDeleteRequest}
            onAdd={() => setModal({ open: true, booking: null })}
            onViewMenu={(b) => setViewMenuBooking(b)}
            onExportKitchen={async (b) => { 
              generateKitchenPDF(b); 
              pushToast(`✓ Kitchen Menu exported for ${b.clientName}`);
              const updated = await updateBooking({ ...b, invoiceType: 'Kitchen' });
              setBookings(updated);
            }}
            onExportInvoice={handleInvoiceRequest}
          />
        </div>

        {/* Footer */}
        <footer className="crm-footer">
          <p>V.V. Decorators CRM &mdash; Optimized for Cloudflare Deployment.</p>
        </footer>
      </main>

      {/* ── Booking Modal ── */}
      {modal.open && (
        <BookingModal
          booking={modal.booking}
          onSave={handleSave}
          onClose={() => setModal({ open: false, booking: null })}
        />
      )}

      {/* ── Invoice Pre-flight Modal ── */}
      {invoiceModal.open && invoiceModal.booking && (
        <InvoiceModal
          booking={invoiceModal.booking}
          onClose={() => setInvoiceModal({ open: false, booking: null })}
          onGenerate={handleInvoiceConfirm}
        />
      )}

      {/* ── Trash Confirm Dialog (soft-delete, no longer needed here) ── */}
      {/* Trash is handled inline in BookingsTable without a confirm dialog for UX speed */}

      {/* ── Permanent Delete Confirmation ── */}
      {confirmPermDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmPermDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Permanently Delete?</h3>
            <p className="confirm-desc">
              This <strong>cannot be undone</strong>. The booking for{' '}
              <strong>{bookings.find(b => b.id === confirmPermDelete)?.clientName}</strong> will be
              erased from the database forever.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setConfirmPermDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={handlePermanentDeleteConfirm} className="btn-danger">Yes, Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Menu Dialog ── */}
      {viewMenuBooking && (
        <div className="modal-backdrop" onClick={() => setViewMenuBooking(null)}>
          <div className="confirm-dialog view-menu-dialog" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="confirm-title" style={{ margin: 0 }}>Event Details: {viewMenuBooking.clientName}</h3>
              <button onClick={() => setViewMenuBooking(null)} className="modal-close-btn"><X size={20} /></button>
            </div>

            <div className="quick-menu-tabs-content" style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {viewMenuBooking.eventType === 'Multi-Day' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Primary loop from daysOverview to maintain chronological order */}
                  {(() => {
                    const days = (viewMenuBooking.daysOverview && viewMenuBooking.daysOverview.length > 0)
                      ? viewMenuBooking.daysOverview
                      : (viewMenuBooking.dayMeals || []).map(dm => ({ day: dm.day, label: 'Event Day' }));

                    return days.map((dayOverviewObj, dIdx) => {
                      const dayNumber = dayOverviewObj.day;
                      const dayLabel  = dayOverviewObj.label || 'Event Day';
                      
                      // Try to find pricing data and dish data for this specific day
                      // Fallback to dayMeals if multiDayPricing/mealMenus aren't populated for older records
                      const dayPricingData = (viewMenuBooking.multiDayPricing && Array.isArray(viewMenuBooking.multiDayPricing))
                        ? viewMenuBooking.multiDayPricing.find((dp: any) => dp.day === dayNumber)
                        : null;
                        
                      const mealsSource = (viewMenuBooking.dayMeals && Array.isArray(viewMenuBooking.dayMeals))
                        ? viewMenuBooking.dayMeals.find((dm: any) => dm.day === dayNumber)
                        : null;

                      // If no pricing entry OR meals entry exists for this day, we still show the header but skip the table
                      if (!dayPricingData && !mealsSource) return null;

                      const dateStr = dayPricingData?.date || mealsSource?.date || '';

                      return (
                        <div key={dIdx} className="view-day-section">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '2px solid var(--gold)', paddingBottom: '0.6rem', marginBottom: '1.2rem' }}>
                             <span style={{ background: 'var(--gold)', color: 'var(--surface)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>Day {dayNumber}</span>
                             <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--gold)', fontWeight: '600' }}>{dayLabel}</h4>
                             <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{dateStr}</span>
                          </div>
                          
                          <div className="table-wrapper" style={{ boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                            <table className="bookings-table" style={{ fontSize: '0.85rem', borderCollapse: 'collapse', width: '100%' }}>
                              <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>Meal Type</th>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>Venue</th>
                                  <th style={{ textAlign: 'center', padding: '12px' }}>Base</th>
                                  <th style={{ textAlign: 'center', padding: '12px' }}>Extra</th>
                                  <th style={{ textAlign: 'center', padding: '12px' }}>Total</th>
                                  <th style={{ textAlign: 'left', padding: '12px' }}>Menu / Dishes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(['Breakfast', 'Lunch', 'High Tea', 'Dinner'] as const).map(mType => {
                                  // Gather data from any available source
                                  const menuEntry    = mealsSource?.meals?.[mType];
                                  const pricingEntry = dayPricingData?.meals?.[mType];

                                  const baseQty  = pricingEntry?.base   ?? menuEntry?.guestCount ?? 0;
                                  const extraQty = pricingEntry?.extra  ?? menuEntry?.extraPlatesCount ?? 0;
                                  const totalQty = pricingEntry?.total  ?? (baseQty + extraQty);
                                  const venue    = menuEntry?.venue     || '—';
                                  const dishes   = menuEntry?.dishes    || [];

                                  if (dishes.length === 0 && venue === '—' && totalQty === 0) return null;

                                  return (
                                    <tr key={mType} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                      <td style={{ fontWeight: '600', color: 'var(--gold-dark)', padding: '12px' }}>{mType}</td>
                                      <td style={{ padding: '12px' }}>{venue}</td>
                                      <td style={{ textAlign: 'center', padding: '12px' }}>{baseQty}</td>
                                      <td style={{ textAlign: 'center', padding: '12px', color: extraQty > 0 ? 'var(--gold)' : 'inherit' }}>{extraQty}</td>
                                      <td style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>{totalQty}</td>
                                      <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                          {dishes.length > 0 ? dishes.map((dish, i) => (
                                            <span key={i} style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--text-primary)', border: '1px solid rgba(212,175,55,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                              {dish}
                                            </span>
                                          )) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No menu selected</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="quick-menu-list">
                  {(!viewMenuBooking.menuItems || Object.keys(viewMenuBooking.menuItems).length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                      <p>No menu items have been selected for this single-day event.</p>
                    </div>
                  ) : (
                    Object.entries(viewMenuBooking.menuItems).map(([category, dishes]) => {
                      if (!dishes || dishes.length === 0) return null;
                      return (
                        <div key={category} className="quick-menu-category" style={{ marginBottom: '1.5rem' }}>
                          <h4 className="quick-category-title" style={{ fontSize: '0.95rem', color: 'var(--gold)', marginBottom: '0.6rem', borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {category}
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {Array.isArray(dishes) ? dishes.map((dish, i) => (
                              <span key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                {String(dish)}
                              </span>
                            )) : <span style={{ fontSize: '0.85rem' }}>{String(dishes)}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div className="confirm-actions mt-4">
              <button onClick={() => setViewMenuBooking(null)} className="btn-secondary" style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav ── */}
      <nav className="mobile-bottom-nav">
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="nav-item">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>Theme</span>
        </button>
        <button onClick={() => setFontSize(s => s >= 24 ? 16 : s + 2)} className="nav-item">
          <ALargeSmall size={20} />
          <span>Size</span>
        </button>
        <button onClick={handleExport} className="nav-item" disabled={displayedBookings.length === 0}>
          <Download size={20} />
          <span>Export</span>
        </button>
        <button
          onClick={() => setModal({ open: true, booking: null })}
          className="nav-item nav-item-primary"
        >
          <Plus size={24} />
          <span>New</span>
        </button>
      </nav>

      {/* ── Toasts ── */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
