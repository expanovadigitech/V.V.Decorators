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
import { Plus, Download, Flower2, Moon, Sun } from 'lucide-react';
import { generateChefPDF, generateInvoicePDF } from '@/lib/pdf';

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

  // Load from localStorage/Supabase on mount
  useEffect(() => {
    loadBookings().then(setBookings);
    const savedTheme = localStorage.getItem('vvd_theme');
    if (savedTheme === 'dark') setTheme('dark');
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
    setBookings(await updateBooking({ ...b, status: 'Active', trashedAt: undefined, updatedAt: new Date().toISOString() }));
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

    // Save updated totals back to the booking record if requested
    if (params.saveToRecord && params.includeAdditional) {
      const updatedBooking: Booking = {
        ...b,
        totalEventValue: params.grandTotal,
        balanceAmount: params.finalBalance,
      };
      const updated = await updateBooking(updatedBooking);
      setBookings(updated);
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
            onExportChef={(b) => { generateChefPDF(b); pushToast(`✓ Admin & Kitchen PDF for ${b.clientName}`); }}
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
          <div className="confirm-dialog view-menu-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Event Menu: {viewMenuBooking.clientName}</h3>
            {(!viewMenuBooking.menuItems || Object.keys(viewMenuBooking.menuItems).length === 0) ? (
              <p className="confirm-desc">No menu items selected.</p>
            ) : (
              <div className="quick-menu-list">
                {Object.entries(viewMenuBooking.menuItems).map(([category, dishes]) => {
                  if (!dishes || dishes.length === 0) return null;
                  return (
                    <div key={category} className="quick-menu-category">
                      <h4 className="quick-category-title" style={{ fontSize: '0.9rem', color: 'var(--gold-dark)', marginBottom: '0.4rem', marginTop: '0.8rem' }}>{category.toUpperCase()}</h4>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.2rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        {Array.isArray(dishes) ? dishes.map((dish, i) => <li key={i}>{String(dish)}</li>) : <li>{String(dishes)}</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="confirm-actions mt-4">
              <button onClick={() => setViewMenuBooking(null)} className="btn-secondary">
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
