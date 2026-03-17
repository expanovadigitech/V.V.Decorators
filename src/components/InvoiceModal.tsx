'use client';

import { useState, useMemo } from 'react';
import { Booking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { X, FileText, ChevronDown, ChevronUp, AlertCircle, Save, Plus } from 'lucide-react';

export interface InvoiceBillingParams {
  includeAdditional: boolean;
  extraPlates: number;
  miscCharges: Array<{ id: string; desc: string; amount: number }>;
  discount: number;
  customDescription: string;
  saveToRecord: boolean;
  // Computed totals (for PDF and optional record update)
  extraPlatesValue: number;
  subtotal: number;
  grandTotal: number;
  finalBalance: number;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onGenerate: (params: InvoiceBillingParams) => void;
}

const DEFAULT_DESCRIPTION =
  'Thank you for choosing V.V. Decorators for your special event. We look forward to serving you again.';

export default function InvoiceModal({ booking, onClose, onGenerate }: Props) {
  // ── Additional charges toggle ────────────────────────────────────────────────
  const [includeAdditional, setIncludeAdditional] = useState(false);
  const [extraPlates, setExtraPlates]             = useState(0);
  const [miscCharges, setMiscCharges]             = useState<Array<{ id: string; desc: string; amount: number }>>([]);
  const [discount, setDiscount]                   = useState(0);
  const [customDescription, setCustomDescription] = useState(booking.invoiceDescription || DEFAULT_DESCRIPTION);
  const [saveToRecord, setSaveToRecord]           = useState(true); // Default to true now as requested

  const calc = useMemo(() => {
    const base           = booking.totalEventValue;
    const extraPlatesVal = includeAdditional ? (extraPlates || 0) * booking.perPlateCost : 0;
    const miscTotal      = includeAdditional ? miscCharges.reduce((sum, c) => sum + (c.amount || 0), 0) : 0;
    const subtotal       = base + extraPlatesVal + miscTotal;
    const grand          = Math.max(0, subtotal - (discount || 0));
    const balance        = Math.max(0, grand - booking.advancePaid);
    return { base, extraPlatesVal, miscTotal, subtotal, grand, balance };
  }, [booking, includeAdditional, extraPlates, miscCharges, discount]);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleConfirm() {
    onGenerate({
      includeAdditional,
      extraPlates: extraPlates || 0,
      miscCharges,
      discount: discount || 0,
      customDescription,
      saveToRecord,
      extraPlatesValue: calc.extraPlatesVal,
      subtotal: calc.subtotal,
      grandTotal: calc.grand,
      finalBalance: calc.balance,
    });
  }

  const hasChanges = includeAdditional && (extraPlates > 0 || miscCharges.some(c => c.amount > 0) || discount > 0);

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal-container invoice-preflight-modal">

        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="invoice-modal-icon">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="modal-title">Finalize Invoice &amp; Billing Details</h2>
              <p className="modal-subtitle">
                For: <strong style={{ color: 'var(--gold)' }}>{booking.clientName}</strong>
                &nbsp;·&nbsp; Base: {formatCurrency(booking.totalEventValue)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body invoice-preflight-body">

          {/* ── Event Summary Strip ── */}
          <div className="inv-summary-strip">
            <div className="inv-summary-item">
              <span className="inv-summary-label">Guests</span>
              <span className="inv-summary-val">{booking.guestCount}</span>
            </div>
            <div className="inv-summary-divider" />
            <div className="inv-summary-item">
              <span className="inv-summary-label">Per Plate</span>
              <span className="inv-summary-val">{formatCurrency(booking.perPlateCost)}</span>
            </div>
            <div className="inv-summary-divider" />
            <div className="inv-summary-item">
              <span className="inv-summary-label">Base Amount</span>
              <span className="inv-summary-val inv-summary-primary">{formatCurrency(booking.totalEventValue)}</span>
            </div>
            <div className="inv-summary-divider" />
            <div className="inv-summary-item">
              <span className="inv-summary-label">Advance Paid</span>
              <span className="inv-summary-val" style={{ color: 'var(--success)' }}>{formatCurrency(booking.advancePaid)}</span>
            </div>
          </div>

          {/* ── Additional Charges Toggle ── */}
          <div className="inv-section">
            <div className="inv-section-header">
              <div>
                <h3 className="inv-section-title">Include Additional Charges?</h3>
                <p className="inv-section-hint">Extra plates, miscellaneous services, or discounts</p>
              </div>
              <div className="inv-yn-toggle">
                <button
                  type="button"
                  className={`inv-yn-btn ${includeAdditional ? 'inv-yn-active' : ''}`}
                  onClick={() => setIncludeAdditional(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`inv-yn-btn ${!includeAdditional ? 'inv-yn-active' : ''}`}
                  onClick={() => { setIncludeAdditional(false); setExtraPlates(0); setMiscCharges([]); setDiscount(0); }}
                >
                  No
                </button>
              </div>
            </div>

            {/* Dynamic charge fields */}
            {includeAdditional && (
              <div className="inv-charges-grid">

                {/* Extra Plates */}
                <div className="inv-charge-block">
                  <label className="field-label">Extra Plates (Qty)</label>
                  <input
                    type="number"
                    min={0}
                    value={extraPlates || ''}
                    onChange={e => setExtraPlates(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 20"
                    className="field-input"
                  />
                  {extraPlates > 0 && (
                    <span className="inv-auto-calc">
                      {extraPlates} × {formatCurrency(booking.perPlateCost)} = <strong>{formatCurrency(calc.extraPlatesVal)}</strong>
                    </span>
                  )}
                </div>

                {/* Misc Charges */}
                <div className="inv-charge-block" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Misc. Charges</label>
                  {miscCharges.map((charge, idx) => (
                    <div key={charge.id} className="custom-dish-input-wrap mb-2" style={{ display: 'flex', gap: '0.6rem' }}>
                       <input
                          type="text"
                          value={charge.desc}
                          onChange={e => {
                            const list = [...miscCharges];
                            list[idx].desc = e.target.value;
                            setMiscCharges(list);
                          }}
                          placeholder="e.g. Mandap Lighting"
                          className="field-input" style={{ flex: 2 }}
                        />
                        <input
                          type="number"
                          min={0}
                          value={charge.amount || ''}
                          onChange={e => {
                            const list = [...miscCharges];
                            list[idx].amount = parseFloat(e.target.value) || 0;
                            setMiscCharges(list);
                          }}
                          placeholder="Amount (₹)"
                          className="field-input" style={{ flex: 1 }}
                        />
                        <button type="button" onClick={() => setMiscCharges(c => c.filter(x => x.id !== charge.id))} className="btn-secondary" style={{ color: 'var(--status-cancelled)', padding: '0.5rem' }}>
                          <X size={16} />
                        </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setMiscCharges(c => [...c, { id: `${Date.now()}`, desc: '', amount: 0 }])} className="btn-secondary" style={{ width: 'max-content' }}>
                    <Plus size={16} /> Add Misc. Charge
                  </button>
                </div>

                {/* Discount */}
                <div className="inv-charge-block">
                  <label className="field-label">Discount Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={discount || ''}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 2000"
                    className="field-input"
                  />
                </div>

              </div>
            )}
          </div>

          {/* ── Live Grand Total ── */}
          <div className="inv-grand-total-box">
            <div className="inv-total-breakdown">
              <div className="inv-total-row">
                <span>Primary Service ({booking.guestCount} plates × {formatCurrency(booking.perPlateCost)})</span>
                <span>{formatCurrency(calc.base)}</span>
              </div>
              {includeAdditional && extraPlates > 0 && (
                <div className="inv-total-row">
                  <span>Extra Plates ({extraPlates} plates)</span>
                  <span>+ {formatCurrency(calc.extraPlatesVal)}</span>
                </div>
              )}
              {includeAdditional && miscCharges.map(charge => charge.amount > 0 && (
                <div key={charge.id} className="inv-total-row">
                  <span>{charge.desc || 'Miscellaneous Charge'}</span>
                  <span>+ {formatCurrency(charge.amount)}</span>
                </div>
              ))}
              {(includeAdditional && (extraPlates > 0 || calc.miscTotal > 0)) && (
                <div className="inv-total-row inv-subtotal-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calc.subtotal)}</span>
                </div>
              )}
              {includeAdditional && discount > 0 && (
                <div className="inv-total-row inv-discount-row">
                  <span>Discount Applied</span>
                  <span>− {formatCurrency(discount)}</span>
                </div>
              )}
            </div>
            <div className="inv-grand-line">
              <span className="inv-grand-label">Final Grand Total</span>
              <span className="inv-grand-value">{formatCurrency(calc.grand)}</span>
            </div>
            <div className="inv-balance-line">
              <span>Advance Paid: <strong>{formatCurrency(booking.advancePaid)}</strong></span>
              <span className={calc.balance > 0 ? 'inv-balance-due' : 'inv-balance-clear'}>
                Balance Due: <strong>{formatCurrency(calc.balance)}</strong>
              </span>
            </div>
          </div>

          {/* ── Custom Description ── */}
          <div className="inv-section">
            <h3 className="inv-section-title">Custom Invoice Description</h3>
            <p className="inv-section-hint">
              Appears at the bottom of the PDF. Add bank details, terms, or personalized notes.
            </p>
            <textarea
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              rows={4}
              className="field-input field-textarea"
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          {/* ── Save to Record ── */}
          {hasChanges && (
            <label className="inv-save-record-row">
              <input
                type="checkbox"
                checked={saveToRecord}
                onChange={e => setSaveToRecord(e.target.checked)}
                className="inv-save-checkbox"
              />
              <div>
                <span className="inv-save-label">Save these extra charges to the client's permanent record?</span>
                <span className="inv-save-hint">
                  {saveToRecord
                    ? '✓ The Total Amount and Balance on the dashboard will be updated.'
                    : 'Unchecked: Changes apply only to this PDF print.'}
                </span>
              </div>
            </label>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary">
            <FileText size={15} />
            Confirm &amp; Download PDF
          </button>
        </div>

      </div>
    </div>
  );
}
