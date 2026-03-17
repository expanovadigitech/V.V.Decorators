import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking } from '@/types';
import { formatDate } from './utils';
import type { InvoiceBillingParams } from '@/components/InvoiceModal';

// ── Currency formatter ────────────────────────────────────────────────────────
// jsPDF's built-in Helvetica doesn't render the ₹ glyph; we use "Rs." in PDFs
// and show ₹ in the UI (handled by formatCurrency in utils.ts).
function fmt(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTimingLabel(booking: Booking): string {
  if (booking.timingCategory === 'Others' && booking.customTiming) {
    return booking.customTiming;
  }
  if (booking.eventType === 'Single Day') {
    return booking.timingCategory;
  }
  return `${booking.timingCategory} | ${booking.startTime} - ${booking.endTime}`;
}

function getDateLine(booking: Booking): string {
  if (booking.eventType === 'Multi-Day' && booking.eventEndDate) {
    return `${formatDate(booking.eventDate)} to ${formatDate(booking.eventEndDate)}`;
  }
  return formatDate(booking.eventDate);
}

// ════════════════════════════════════════════════════════════════════════════
//  CHEF / KITCHEN ORDER PDF  —  Compact 3-column grid layout
// ════════════════════════════════════════════════════════════════════════════
export function generateChefPDF(booking: Booking) {
  const doc = new jsPDF();

  // ── Branded header bar ────────────────────────────────────────────────────
  doc.setFillColor(0, 31, 63);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text('ADMIN & KITCHEN ORDER', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('V.V. DECORATORS — Production Sheet', 14, 18);

  // Guest count badge (top-right)
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.text(`${booking.guestCount} Guests`, 196, 11, { align: 'right' });

  // Invoice-style date top-right
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 225);
  doc.text(`Printed: ${new Date().toLocaleDateString('en-IN')}`, 196, 18, { align: 'right' });

  // ── Event info strip (2 rows × 3 cols) ───────────────────────────────────
  doc.setFillColor(242, 246, 251);
  doc.rect(0, 28, 210, 26, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 31, 63);

  // Row 1 labels
  doc.text('CLIENT', 14, 35);
  doc.text('VENUE', 80, 35);
  doc.text('DATE', 155, 35);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 35, 60);

  // Row 1 values
  doc.text(booking.clientName, 14, 40);
  doc.text(booking.venue || '—', 80, 40);
  doc.text(getDateLine(booking), 155, 40);

  // Row 2 labels
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 31, 63);
  doc.text('CONTACT', 14, 47);
  doc.text('TIMING', 80, 47);

  // Accommodation label — only if rooms or pool
  const hasAccommodation = (booking.roomsRequired ?? 0) > 0 || booking.swimmingPool;
  if (hasAccommodation) {
    doc.text('ACCOMMODATION', 155, 47);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 35, 60);

  // Row 2 values
  const phoneStr = booking.primaryPhone + (booking.alternativePhone ? ` / ${booking.alternativePhone}` : '');
  doc.text(phoneStr, 14, 52);
  doc.text(getTimingLabel(booking), 80, 52);
  if (hasAccommodation) {
    const roomStr = (booking.roomsRequired ?? 0) > 0 ? `${booking.roomsRequired} Rooms` : '';
    const poolStr = booking.swimmingPool ? 'Pool: Yes' : '';
    doc.text([roomStr, poolStr].filter(Boolean).join('  |  '), 155, 52);
  }

  let currentY = 60;

  // ── Additional Services ─────────────────────────────────────────────────
  if (booking.additionalServices && booking.additionalServices.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 31, 63);
    doc.text('Services:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    const servStr = doc.splitTextToSize(booking.additionalServices.map(s => s.name).filter(Boolean).join('  |  '), 180);
    doc.text(servStr, 30, currentY);
    currentY += servStr.length * 4 + 3;
  }

  // ── Days Overview & Notes ─────────────────────────────────────────────────
  if (booking.eventType === 'Multi-Day' && booking.daysOverview && booking.daysOverview.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 31, 63);
    doc.text('Days:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    const ov = doc.splitTextToSize(booking.daysOverview.map(d => `Day ${d.day}: ${d.label}`).join('  |  '), 180);
    doc.text(ov, 30, currentY);
    currentY += ov.length * 4 + 3;
  }

  if (booking.notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 110, 130);
    const noteLines = doc.splitTextToSize(`Notes: ${booking.notes}`, 180);
    doc.text(noteLines, 14, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += noteLines.length * 4 + 3;
  }

  currentY += 2;

  const PAGE_W   = 210;
  const MARGIN   = 14;
  const USABLE_W = PAGE_W - MARGIN * 2;
  const COL_GAP  = 3;
  const ROW_GAP  = 4;
  const PAD      = 3;
  const LINE_H   = 5;
  const HDR_H    = 7;

  const NAVY:   [number, number, number] = [0, 31, 63];
  const GOLD:   [number, number, number] = [212, 175, 55];
  const LIGHT:  [number, number, number] = [248, 250, 252];
  const STRIPE: [number, number, number] = [238, 244, 251];
  const TEXT:   [number, number, number] = [20, 35, 60];
  const MUTED:  [number, number, number] = [160, 170, 185];

  // Helper: render a 3-column dish tile grid for a given menuItems map
  function renderDishGrid(menuItems: Record<string, string[]>, gridRows: string[][], startY: number): number {
    let y = startY;
    gridRows.forEach(rowCats => {
      const numCols  = rowCats.length;
      const colWidth = (USABLE_W - COL_GAP * (numCols - 1)) / numCols;
      let maxDishes  = 0;
      rowCats.forEach(cat => {
        const d = (menuItems[cat] || []).length;
        if (d > maxDishes) maxDishes = d;
      });
      const bodyH = Math.max(maxDishes, 1) * LINE_H + PAD * 2;
      const tileH = HDR_H + bodyH;
      if (y + tileH > 286) { doc.addPage(); y = 14; }

      rowCats.forEach((cat, colIdx) => {
        const x      = MARGIN + colIdx * (colWidth + COL_GAP);
        const dishes = menuItems[cat] || [];

        doc.setDrawColor(200, 212, 225);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, y, colWidth, tileH, 2, 2, 'S');

        doc.setFillColor(...NAVY);
        doc.roundedRect(x, y, colWidth, HDR_H + 2, 2, 2, 'F');
        doc.rect(x, y + HDR_H - 1, colWidth, 3, 'F');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GOLD);
        const catLabel = doc.splitTextToSize(cat.toUpperCase(), colWidth - 4)[0];
        doc.text(catLabel, x + colWidth / 2, y + HDR_H - 1.5, { align: 'center' });

        doc.setFillColor(...LIGHT);
        doc.rect(x, y + HDR_H, colWidth, bodyH, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        if (dishes.length === 0) {
          doc.setTextColor(...MUTED);
          doc.text('—', x + colWidth / 2, y + HDR_H + bodyH / 2, { align: 'center', baseline: 'middle' });
        } else {
          dishes.forEach((dish, i) => {
            const dy = y + HDR_H + PAD + i * LINE_H + LINE_H / 2;
            if (i % 2 === 1) {
              doc.setFillColor(...STRIPE);
              doc.rect(x + 0.5, dy - LINE_H / 2, colWidth - 1, LINE_H, 'F');
            }
            doc.setTextColor(...GOLD);
            doc.text('•', x + PAD, dy, { baseline: 'middle' });
            doc.setTextColor(...TEXT);
            const label = doc.splitTextToSize(String(dish), colWidth - PAD * 2 - 3)[0];
            doc.text(label, x + PAD + 4, dy, { baseline: 'middle' });
          });
        }
      });
      y += tileH + ROW_GAP;
    });
    return y;
  }

  // ── MULTI-DAY: Render by meal type ──────────────────────────────────────────
  if (booking.eventType === 'Multi-Day' && booking.mealMenus) {
    const MEALS: Array<{ name: string; cats: string[] }> = [
      { name: 'Breakfast', cats: ['Starters', 'Main Course', 'Others'] },
      { name: 'Lunch',     cats: ['Starters', 'Main Course', 'Roti', 'Chinese', 'Sweet and Ice Cream', 'Salad', 'Others'] },
      { name: 'High Tea',  cats: ['Starters', 'Others'] },
      { name: 'Dinner',    cats: ['Starters', 'Main Course', 'Roti', 'Chinese', 'Sweet and Ice Cream', 'Salad', 'Others'] },
    ];
    const MEAL_GRID: Record<string, string[][]> = {
      'Breakfast': [['Starters', 'Main Course', 'Others']],
      'Lunch':     [['Starters', 'Main Course', 'Roti'], ['Chinese', 'Sweet and Ice Cream', 'Salad'], [/* Others full row */]],
      'High Tea':  [['Starters', 'Others']],
      'Dinner':    [['Starters', 'Main Course', 'Roti'], ['Chinese', 'Sweet and Ice Cream', 'Salad']],
    };

    MEALS.forEach(({ name }) => {
      const section     = (booking.mealMenus!)[name];
      const mealDishes  = section?.dishes || {};
      const guestCount  = section?.guestCount || 0;

      // Skip fully empty meal sections
      const totalDishes = Object.values(mealDishes).reduce((n, arr) => n + arr.length, 0);
      if (totalDishes === 0 && guestCount === 0) return;

      // Meal header bar
      if (currentY + 12 > 286) { doc.addPage(); currentY = 14; }
      doc.setFillColor(10, 50, 100);
      doc.roundedRect(MARGIN, currentY, USABLE_W, 9, 2, 2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      doc.text(name.toUpperCase(), MARGIN + 4, currentY + 6);
      if (guestCount > 0) {
        doc.setTextColor(200, 220, 255);
        doc.setFontSize(7.5);
        doc.text(`${guestCount} guests`, MARGIN + USABLE_W - 4, currentY + 6, { align: 'right' });
      }
      currentY += 12;

      // Build grid rows for this meal (max 3 columns)
      const cats = Object.entries(mealDishes).filter(([, d]) => d.length > 0).map(([c]) => c);
      if (cats.length === 0) { currentY += 2; return; }

      const gridRows: string[][] = [];
      for (let i = 0; i < cats.length; i += 3) gridRows.push(cats.slice(i, i + 3));
      currentY = renderDishGrid(mealDishes, gridRows, currentY);
      currentY += 4;
    });

  } else {
    // ── SINGLE-DAY: original 3-column tile grid ──────────────────────────────
    const menuItems = booking.menuItems || {};
    const GRID_ROWS: string[][] = [
      ['Welcome Drinks', 'Starters', 'Chinese'],
      ['Main Course', 'Roti'],
      ['Sweet and Ice Cream', 'Salad', 'Others'],
    ];
    currentY = renderDishGrid(menuItems, GRID_ROWS, currentY);
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  doc.text('V.V. Decorators — Admin & Kitchen Production Sheet', 14, 290);
  doc.text(`Printed: ${new Date().toLocaleDateString('en-IN')}`, 196, 290, { align: 'right' });

  doc.save(`Admin_Kitchen_Order_${booking.clientName.replace(/\s+/g, '_')}.pdf`);
}


// ════════════════════════════════════════════════════════════════════════════
//  CLIENT INVOICE PDF  —  Full breakdown with add-ons, discount, grand total
// ════════════════════════════════════════════════════════════════════════════
export function generateInvoicePDF(booking: Booking, params: InvoiceBillingParams) {
  const doc = new jsPDF();

  const NAVY_RGB: [number, number, number] = [0, 31, 63];
  const GOLD_RGB: [number, number, number] = [212, 175, 55];

  // ── Header banner ─────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY_RGB);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD_RGB);
  doc.text('OFFICIAL INVOICE', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('V.V. DECORATORS — Premium Event & Catering Services', 14, 21);

  // Invoice number + date (right side)
  const invoiceNum = `VVD-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(8);
  doc.setTextColor(212, 175, 55);
  doc.text(`Invoice #${invoiceNum}`, 196, 13, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 196, 21, { align: 'right' });

  // ── Client info strip ─────────────────────────────────────────────────────
  doc.setFillColor(242, 246, 251);
  doc.rect(0, 30, 210, 22, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY_RGB);
  doc.text('BILLED TO', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 35, 60);
  doc.text(booking.clientName, 14, 44);
  doc.text(`Ph: ${booking.primaryPhone}${booking.alternativePhone ? ' / ' + booking.alternativePhone : ''}`, 14, 49);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY_RGB);
  doc.text('EVENT DETAILS', 110, 38);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 35, 60);
  doc.text(`Date: ${getDateLine(booking)}`, 110, 44);
  doc.text(`Timing: ${getTimingLabel(booking)}   Venue: ${booking.venue}`, 110, 49);

  let Y = 58;

  // ── Itemised bill table ────────────────────────────────────────────────────
  type TableBody = (string | number)[][];
  const body: TableBody = [];

  // Primary service row
  body.push([
    'Catering & Decor Services',
    fmt(booking.perPlateCost),
    String(booking.guestCount),
    fmt(booking.totalEventValue),
  ]);

  // Rooms row
  if ((booking.roomsRequired ?? 0) > 0) {
    const roomTotal = (booking.roomsRequired ?? 0) * (booking.roomCost ?? 0);
    body.push([
      `Room Accommodation (${booking.roomsRequired} room${(booking.roomsRequired ?? 0) > 1 ? 's' : ''})`,
      booking.roomCost ? fmt(booking.roomCost) : '—',
      String(booking.roomsRequired),
      roomTotal > 0 ? fmt(roomTotal) : 'Included',
    ]);
  }

  // Additional services rows
  if (booking.additionalServices && booking.additionalServices.length > 0) {
    booking.additionalServices.filter(s => s.name).forEach(s => {
      body.push([s.name, '—', '—', s.cost > 0 ? fmt(s.cost) : 'Included']);
    });
  }

  // Add-on rows
  if (params.includeAdditional) {
    if (params.extraPlates > 0) {
      body.push([
        'Additional Plates',
        fmt(booking.perPlateCost),
        String(params.extraPlates),
        fmt(params.extraPlatesValue),
      ]);
    }
    if (params.miscCharges && params.miscCharges.length > 0) {
      params.miscCharges.forEach(charge => {
        if (charge.amount > 0) {
          body.push([
            charge.desc || 'Miscellaneous Charge',
            '—',
            '—',
            fmt(charge.amount),
          ]);
        }
      });
    }
  }

  autoTable(doc, {
    startY: Y,
    head: [['Description', 'Unit Rate', 'Qty', 'Amount']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: [212, 175, 55],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [20, 35, 60] },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { halign: 'right', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  Y = (doc as any).lastAutoTable.finalY;

  // ── Totals summary table ───────────────────────────────────────────────────
  const totalsBody: (string | { content: string; styles?: object })[][] = [];

  if (params.includeAdditional && (params.extraPlates > 0 || (params.miscCharges && params.miscCharges.some(c => c.amount > 0)))) {
    totalsBody.push([
      { content: 'Subtotal', styles: { fontStyle: 'bold' } },
      { content: fmt(params.subtotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);
  }

  if (params.includeAdditional && params.discount > 0) {
    totalsBody.push([
      { content: 'Discount', styles: { textColor: [180, 50, 50] } },
      { content: `- ${fmt(params.discount)}`, styles: { halign: 'right', textColor: [180, 50, 50] } },
    ]);
  }

  totalsBody.push([
    { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fontSize: 11, fillColor: NAVY_RGB, textColor: GOLD_RGB } },
    { content: fmt(params.grandTotal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, fillColor: NAVY_RGB, textColor: GOLD_RGB } },
  ]);

  totalsBody.push([
    { content: `Advance Paid (${booking.paymentMode}${booking.chequeNumber ? ' #' + booking.chequeNumber : ''})`, styles: { textColor: [20, 120, 60] } },
    { content: fmt(booking.advancePaid), styles: { halign: 'right', textColor: [20, 120, 60] } },
  ]);

  totalsBody.push([
    { content: 'BALANCE DUE', styles: { fontStyle: 'bold', fontSize: 10, textColor: params.finalBalance > 0 ? [160, 30, 30] : [20, 120, 60] } },
    { content: fmt(params.finalBalance), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, textColor: params.finalBalance > 0 ? [160, 30, 30] : [20, 120, 60] } },
  ]);

  autoTable(doc, {
    startY: Y,
    body: totalsBody as any,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  Y = (doc as any).lastAutoTable.finalY + 8;

  // ── Meal Schedule (Multi-Day) ────────────────────────────────────────────
  if (booking.eventType === 'Multi-Day' && booking.mealMenus) {
    const MEALS = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'];
    const activeMeals = MEALS.filter(m => {
      const sec = (booking.mealMenus!)[m];
      if (!sec) return false;
      const dishCount = Object.values(sec.dishes).reduce((n, arr) => n + arr.length, 0);
      return dishCount > 0 || (sec.guestCount ?? 0) > 0 || !!sec.venue;
    });

    if (activeMeals.length > 0) {
      doc.setDrawColor(220, 228, 240);
      doc.setLineWidth(0.5);
      doc.line(14, Y, 196, Y);
      Y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY_RGB);
      doc.text('MEAL SCHEDULE', 14, Y);
      Y += 5;

      const mealRows: string[][] = [];
      activeMeals.forEach(m => {
        const sec = (booking.mealMenus!)[m]!;
        const dishList = Object.entries(sec.dishes)
          .filter(([, d]) => d.length > 0)
          .map(([, d]) => d.join(', '))
          .join(' | ');
        mealRows.push([
          m,
          sec.venue || '—',
          sec.guestCount ? String(sec.guestCount) : '—',
          dishList || '—',
        ]);
      });

      autoTable(doc, {
        startY: Y,
        head: [['Meal', 'Venue', 'Guests', 'Dishes']],
        body: mealRows,
        theme: 'grid',
        headStyles: { fillColor: [10, 50, 100], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [20, 35, 60] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 38 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 104 },
        },
        margin: { left: 14, right: 14 },
      });
      Y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ── Notes / Custom Description ─────────────────────────────────────────────
  if (params.customDescription && params.customDescription.trim()) {
    // Section divider
    doc.setDrawColor(220, 228, 240);
    doc.setLineWidth(0.5);
    doc.line(14, Y, 196, Y);
    Y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY_RGB);
    doc.text('NOTES & TERMS', 14, Y);
    Y += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 90);
    const descLines = doc.splitTextToSize(params.customDescription.trim(), 182);
    doc.text(descLines, 14, Y);
    Y += descLines.length * 5 + 4;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(160, 170, 185);
  doc.text('V.V. Decorators — Thank you for your business.', 14, 290);
  doc.text(invoiceNum, 196, 290, { align: 'right' });

  doc.save(`Invoice_${booking.clientName.replace(/\s+/g, '_')}_${invoiceNum}.pdf`);
}
