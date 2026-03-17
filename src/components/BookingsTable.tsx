'use client';

import { Booking } from '@/types';
import { formatCurrency, formatDate, getDateUrgency } from '@/lib/utils';
import {
  Edit2, Trash2, Phone, MapPin, Users, Clock,
  CalendarDays, Eye, ScrollText, Receipt,
  CheckCircle2, RotateCcw, XCircle, Circle,
} from 'lucide-react';

interface Props {
  bookings: Booking[];
  onEdit: (b: Booking) => void;
  onTrash: (id: string) => void;
  onMarkDone: (id: string) => void;
  onMarkActive: (id: string) => void;      // revert Done → Active
  onRestore: (id: string) => void;         // restore from Trash → Active
  onPermanentDelete: (id: string) => void;
  onAdd: () => void;
  onViewMenu: (b: Booking) => void;
  onExportKitchen: (b: Booking) => void;
  onExportInvoice: (b: Booking) => void;
}

function DateCell({ dateStr }: { dateStr: string }) {
  const urgency = getDateUrgency(dateStr);
  return (
    <div className={`date-cell ${urgency}`}>
      <CalendarDays size={13} />
      {formatDate(dateStr)}
      {urgency === 'date-urgent' && <span className="urgency-pill urgent">Soon!</span>}
      {urgency === 'date-soon'   && <span className="urgency-pill soon">7d</span>}
    </div>
  );
}

// Inline Active ↔ Done toggle shown in the Status column
function EventStatusToggle({
  status, id, onMarkDone, onMarkActive,
}: { status: Booking['status']; id: string; onMarkDone:(id:string)=>void; onMarkActive:(id:string)=>void; }) {
  if (status === 'Done') {
    return (
      <button className="status-toggle status-toggle-done" title="Mark as Active"
        onClick={e => { e.stopPropagation(); onMarkActive(id); }}>
        <CheckCircle2 size={13} /> Done
      </button>
    );
  }
  return (
    <button className="status-toggle status-toggle-active" title="Mark as Done"
      onClick={e => { e.stopPropagation(); onMarkDone(id); }}>
      <Circle size={13} /> Active
    </button>
  );
}

export default function BookingsTable({
  bookings, onEdit, onTrash, onMarkDone, onMarkActive, onRestore, onPermanentDelete,
  onAdd, onViewMenu, onExportKitchen, onExportInvoice,
}: Props) {

  const active  = bookings.filter(b => b.status !== 'Trashed');
  const trashed = bookings.filter(b => b.status === 'Trashed');

  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><CalendarDays size={64} /></div>
        <h3 className="empty-title">No Events Found</h3>
        <p className="empty-desc">Start building your event calendar by adding your first booking.</p>
        <button onClick={onAdd} className="btn-primary">+ Add New Booking</button>
      </div>
    );
  }

  function renderActionBtns(b: Booking) {
    if (b.status === 'Trashed') {
      return (
        <div className="action-btns" onClick={e => e.stopPropagation()}>
          <button onClick={() => onRestore(b.id)} className="action-btn restore-btn" title="Restore">
            <RotateCcw size={14} />
          </button>
          <button onClick={() => onPermanentDelete(b.id)} className="action-btn delete-btn" title="Permanently Delete">
            <XCircle size={14} />
          </button>
        </div>
      );
    }
    return (
      <div className="action-btns" onClick={e => e.stopPropagation()}>
        <button onClick={() => onViewMenu(b)} className="action-btn menu-btn" title="View Menu">
          <Eye size={14} />
        </button>
        <button onClick={() => onExportKitchen(b)} className="action-btn menu-btn" title="Kitchen Menu (Staff)">
          <ScrollText size={14} />
        </button>
        <button onClick={() => onExportInvoice(b)} className="action-btn menu-btn" title="Detailed Invoice (Admin)">
          <Receipt size={14} />
        </button>
        <button onClick={() => onEdit(b)} className="action-btn edit-btn" title="Edit">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onTrash(b.id)} className="action-btn delete-btn" title="Move to Trash">
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table ─────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Event Date</th>
              <th>Venue</th>
              <th>Guests</th>
              <th>Total Value</th>
              <th>Advance</th>
              <th>Balance</th>
              <th>Event Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {active.map(b => (
              <tr key={b.id} className={`table-row ${b.status === 'Done' ? 'row-completed' : ''}`} onClick={() => onEdit(b)}>
                <td>
                  <div className="client-cell">
                    <span className="client-name">{b.clientName}</span>
                    <span className="client-phone"><Phone size={11} /> {b.primaryPhone}</span>
                  </div>
                </td>
                <td><DateCell dateStr={b.eventDate} /></td>
                <td><div className="venue-cell"><MapPin size={13} /> {b.venue || '—'}</div></td>
                <td><div className="guests-cell"><Users size={13} /> {b.guestCount}</div></td>
                <td className="amount-cell">{formatCurrency(b.totalEventValue)}</td>
                <td className="amount-cell advance">{formatCurrency(b.advancePaid)}</td>
                <td className={`amount-cell ${b.balanceAmount > 0 ? 'balance-due' : 'balance-clear'}`}>
                  {formatCurrency(b.balanceAmount)}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <EventStatusToggle status={b.status} id={b.id} onMarkDone={onMarkDone} onMarkActive={onMarkActive} />
                </td>
                <td>{renderActionBtns(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────────── */}
      <div className="mobile-cards">
        {active.map(b => (
          <div key={b.id} className={`mobile-card ${b.status === 'Done' ? 'card-completed' : ''}`} onClick={() => onEdit(b)}>
            <div className="mobile-card-header">
              <div>
                <p className="mobile-client-name">{b.clientName}</p>
                <p className="mobile-meta"><Phone size={11} /> {b.primaryPhone}</p>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <EventStatusToggle status={b.status} id={b.id} onMarkDone={onMarkDone} onMarkActive={onMarkActive} />
              </div>
            </div>
            <div className="mobile-card-body">
              <div className="mobile-detail">
                <DateCell dateStr={b.eventDate} />
                &nbsp;&nbsp;
                {b.timingCategory === 'Others'
                  ? <><Clock size={13} /> {b.customTiming || b.timingCategory}</>
                  : <><Clock size={13} /> {b.timingCategory}</>}
              </div>
              <div className="mobile-detail"><MapPin size={13} /> {b.venue || '—'}</div>
              <div className="mobile-detail">
                <Users size={13} /> {b.guestCount} guests &nbsp;|&nbsp; ₹{b.perPlateCost.toLocaleString('en-IN')}/plate
              </div>
            </div>
            <div className="mobile-card-footer">
              <div className="mobile-financials">
                <span>Total: <strong>{formatCurrency(b.totalEventValue)}</strong></span>
                <span>Advance: <strong>{formatCurrency(b.advancePaid)}</strong></span>
                <span className={b.balanceAmount > 0 ? 'balance-due' : 'balance-clear'}>
                  Balance: <strong>{formatCurrency(b.balanceAmount)}</strong>
                </span>
              </div>
              <div className="mobile-actions" onClick={e => e.stopPropagation()}>
                {renderActionBtns(b)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Trash Section ─────────────────────────────────────────────── */}
      {trashed.length > 0 && (
        <div className="trash-section">
          <div className="trash-section-header">
            <Trash2 size={15} />
            <span>Trash ({trashed.length})</span>
            <span className="trash-hint">Items here will not appear in reports. Restore or permanently delete.</span>
          </div>
          <div className="table-wrapper">
            <table className="bookings-table trash-table">
              <thead>
                <tr><th>Client</th><th>Event Date</th><th>Venue</th><th>Total Value</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {trashed.map(b => (
                  <tr key={b.id} className="table-row row-trashed">
                    <td>
                      <div className="client-cell">
                        <span className="client-name">{b.clientName}</span>
                        <span className="client-phone"><Phone size={11} /> {b.primaryPhone}</span>
                      </div>
                    </td>
                    <td><DateCell dateStr={b.eventDate} /></td>
                    <td><div className="venue-cell"><MapPin size={13} /> {b.venue || '—'}</div></td>
                    <td className="amount-cell">{formatCurrency(b.totalEventValue)}</td>
                    <td>{renderActionBtns(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {trashed.map(b => (
              <div key={b.id} className="mobile-card card-trashed" onClick={e => e.stopPropagation()}>
                <div className="mobile-card-header">
                  <div>
                    <p className="mobile-client-name">{b.clientName}</p>
                    <p className="mobile-meta"><Phone size={11} /> {b.primaryPhone}</p>
                  </div>
                  <span className="status-badge status-cancelled">Trashed</span>
                </div>
                <div className="mobile-card-footer">
                  <div className="mobile-financials">
                    <span>{formatDate(b.eventDate)}</span>
                    <span>{b.venue}</span>
                  </div>
                  <div className="mobile-actions" onClick={e => e.stopPropagation()}>
                    {renderActionBtns(b)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
