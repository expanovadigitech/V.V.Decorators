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
//  KITCHEN MENU / STAFF VIEW PDF  —  No prices, only logistics
// ════════════════════════════════════════════════════════════════════════════
export function generateKitchenPDF(booking: Booking) {
  const doc = new jsPDF();

  // ── Branded header bar ────────────────────────────────────────────────────
  doc.setFillColor(...[0, 31, 63] as [number, number, number]);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text('KITCHEN MENU / STAFF SHEET', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('V.V. DECORATORS — Internal Logistics', 14, 18);

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
  doc.text('TIMING', 60, 47);
  doc.text('GUEST COUNT', 100, 47);
  doc.text('FACILITIES', 135, 47);
  doc.text('STAFF NOTE', 170, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 35, 60);

  // Row 2 values
  const phoneStr = booking.primaryPhone + (booking.alternativePhone ? ` / ${booking.alternativePhone}` : '');
  doc.text(phoneStr, 14, 52);
  doc.text(getTimingLabel(booking), 60, 52);
  doc.text(String(booking.guestCount || '—'), 100, 52);
  
  const facilityStr = `${booking.roomsRequired || 0} Rooms${booking.swimmingPool ? ' + Pool' : ''}`;
  doc.text(facilityStr, 135, 52);
  doc.text('Handle with Care', 180, 52);

  let currentY = 60;

  // ── Days Overview & Notes ─────────────────────────────────────────────────
  if (booking.eventType === 'Multi-Day' && booking.daysOverview && booking.daysOverview.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 31, 63);
    doc.text('Event Overview:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    const ov = doc.splitTextToSize(booking.daysOverview.map(d => `Day ${d.day}: ${d.label}`).join('  |  '), 180);
    doc.text(ov, 30, currentY);
    currentY += ov.length * 4 + 3;
  }

  if (booking.notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 110, 130);
    const noteLines = doc.splitTextToSize(`Special Instructions: ${booking.notes}`, 180);
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

  // Helper: render a responsive dish tile grid.
  // Filters out empty categories and chunks them into rows of 3.
  function renderDishGrid(menuItems: Record<string, string[]>, categories: string[], startY: number): number {
    let y = startY;
    
    // 1. Filter only categories that have at least one dish
    const activeCats = categories.filter(cat => (menuItems[cat] || []).length > 0);
    if (activeCats.length === 0) return y;

    // 2. Separate Veg and Non-Veg categories for strict separation if they exist
    const vegCats = activeCats.filter(cat => cat.toUpperCase().includes('(VEG)') || ['WELCOME DRINKS', 'SNACKS', 'CHAAT', 'SWEETS', 'DESSERTS', 'SALAD', 'MUKHWAS', 'WATER', 'PACKAGES'].includes(cat.toUpperCase()));
    const nonVegCats = activeCats.filter(cat => !vegCats.includes(cat));

    function chunkAndRender(cats: string[], sectionTitle?: string): void {
      if (cats.length === 0) return;
      
      // Add section sub-header if needed
      if (sectionTitle) {
        if (y + 10 > 286) { doc.addPage(); y = 14; }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text(sectionTitle, MARGIN, y + 5);
        y += 8;
      }

      // Chunk into rows of 3
      const rows: string[][] = [];
      for (let i = 0; i < cats.length; i += 3) {
        rows.push(cats.slice(i, i + 3));
      }

      rows.forEach(rowCats => {
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
        });
        y += tileH + ROW_GAP;
      });
    }

    // Render Vegetarian section
    if (vegCats.length > 0) {
      chunkAndRender(vegCats, activeCats.length > vegCats.length ? 'VEGETARIAN SELECTIONS' : undefined);
    }
    
    // Render Non-Vegetarian section
    if (nonVegCats.length > 0) {
      if (y > startY + 10) y += 4; // Add space between sections
      chunkAndRender(nonVegCats, 'NON-VEGETARIAN SELECTIONS');
    }

    return y;
  }

  // ── MULTI-DAY: Render by meal type ──────────────────────────────────────────
  if (booking.eventType === 'Multi-Day' && booking.dayMeals) {
    booking.dayMeals.forEach((dayMeal) => {
      // Day header
      if (currentY + 12 > 286) { doc.addPage(); currentY = 14; }
      doc.setFillColor(10, 50, 100);
      doc.roundedRect(MARGIN, currentY, USABLE_W, 9, 2, 2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      const dayTitle = `DAY ${dayMeal.day} ${dayMeal.date ? `(${dayMeal.date})` : ''} - ${dayMeal.venue || 'No Venue Specified'}`;
      doc.text(dayTitle.toUpperCase(), MARGIN + 4, currentY + 6);
      currentY += 12;

      const meals = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'] as const;
      meals.forEach(meal => {
        const entry = dayMeal.meals[meal];
        if (!entry || entry.dishes.length === 0) return;

        // Meal sub-header
        if (currentY + 10 > 286) { doc.addPage(); currentY = 14; }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 120, 60);
        
        const baseQty = entry.guestCount || 0;
        const extraQty = entry.extraPlatesCount || 0;
        const totalQty = baseQty + extraQty;
        
        // Use a more readable format for the chefs
        const qtyLabel = `QTY: ${totalQty}`;
        const venueLabel = entry.venue ? `[${entry.venue.toUpperCase()}]` : '';
        const detailLabel = `(${baseQty} Base + ${extraQty} Extra)`;
        
        doc.text(`${meal.toUpperCase()}  —  ${qtyLabel} ${detailLabel}   ${venueLabel}`, MARGIN, currentY + 4);
        currentY += 6;

        // Grid renderer
        const mealDishes = entry.dishes.reduce((acc, d) => {
          acc['Menu'] = acc['Menu'] || [];
          acc['Menu'].push(d);
          return acc;
        }, {} as Record<string, string[]>);
        
        currentY = renderDishGrid(mealDishes, ['Menu'], currentY);
        currentY += 2;
        });
    });
  } else {
    // ── SINGLE-DAY: auto-grouped and filtered tile grid ────────────────────
    const menuItems = booking.menuItems || {};
    const ALL_CATS = [
      'Welcome Drinks', 'Snacks', 'Starters (Veg)', 'Starters (Non-Veg)', 
      'Chinese Starter (Non-Veg)', 'Main Course (Veg)', 'Main Course (Mutton)', 
      'Main Course (Chicken)', 'Main Course (Rice)', 'Non-Veg Rice', 'Chinese Rice', 
      'Noodles (Veg)', 'Noodles (Non-Veg)', 'Roti / Bread', 'Chaat', 'Sweets', 
      'Desserts', 'Salad', 'Mukhwas', 'Water', 'Packages', 'Others'
    ];
    currentY = renderDishGrid(menuItems, ALL_CATS, currentY);
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  doc.text('V.V. Decorators — Kitchen Menu / Production Sheet', 14, 290);
  doc.save(`Kitchen_Menu_${booking.clientName.replace(/\s+/g, '_')}.pdf`);
}


// ════════════════════════════════════════════════════════════════════════════
//  CLIENT INVOICE PDF  —  Full breakdown with add-ons, discount, grand total
// ════════════════════════════════════════════════════════════════════════════
export function generateInvoicePDF(booking: Booking, params: InvoiceBillingParams) {
  const doc = new jsPDF();
  const isMultiDay = booking.eventType === 'Multi-Day';

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
  doc.rect(0, 30, 210, 28, 'F');

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
  doc.text(`Date:    ${getDateLine(booking)}`, 110, 44);
  doc.text(`Timing:  ${getTimingLabel(booking)}`, 110, 48);
  doc.text(`Guest Count: ${booking.guestCount}${isMultiDay ? ' (Peak)' : ''}`, 110, 52);
  doc.text(`Rooms:   ${booking.roomsRequired || 0}   Venue: ${booking.venue || '—'}`, 110, 56);

  let Y = 62;

  // ── Itemised bill table ────────────────────────────────────────────────────
  type TableBody = (string | number)[][];
  const body: TableBody = [];

  // Primary service row(s)
  if (isMultiDay) {
    (booking.dayMeals || []).forEach(day => {
      const meals = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'] as const;
      meals.forEach(m => {
        const entry = day.meals[m];
        if (!entry) return;
        const base = entry.guestCount || 0;
        const extra = entry.extraPlatesCount || 0;
        const rate = entry.pricePerPlate || 0;
        
        // Separate line items as requested for better billing clarity
        if (base > 0 && rate > 0) {
          body.push([
            day.date || `Day ${day.day}`,
            `${m} (Guest Count)`,
            entry.venue || '—',
            String(base),
            fmt(rate),
            fmt(base * rate),
          ]);
        }
        
        if (extra > 0 && rate > 0) {
          body.push([
            '—', // Repeat date or use spacer
            `${m} (Extra Plates)`,
            '—',
            String(extra),
            fmt(rate),
            fmt(extra * rate),
          ]);
        }
      });
    });

    if (booking.multiDayExtraCharges && booking.multiDayExtraCharges > 0) {
      body.push([
        '—',
        'Extra Charges',
        'Miscellaneous',
        '—',
        '—',
        fmt(booking.multiDayExtraCharges),
      ]);
    }

    // Rooms row (6 columns)
    if ((booking.roomsRequired ?? 0) > 0) {
      const roomTotal = (booking.roomsRequired ?? 0) * (booking.roomCost ?? 0);
      body.push([
        '—',
        `Accommodation`,
        `${booking.roomsRequired} rooms`,
        String(booking.roomsRequired),
        booking.roomCost ? fmt(booking.roomCost) : '—',
        roomTotal > 0 ? fmt(roomTotal) : 'Included',
      ]);
    }

    // Additional services (6 columns)
    if (booking.additionalServices && booking.additionalServices.length > 0) {
      booking.additionalServices.filter(s => s.name).forEach(s => {
        body.push(['—', s.name, 'Service', '—', '—', s.cost > 0 ? fmt(s.cost) : 'Included']);
      });
    }

    // Add-ons (6 columns)
    if (params.includeAdditional) {
      if (params.extraPlates > 0) {
        body.push([
          '—',
          'Additional Plates',
          'Extra',
          String(params.extraPlates),
          fmt(booking.perPlateCost || 0),
          fmt(params.extraPlatesValue),
        ]);
      }
      if (params.miscCharges) {
        params.miscCharges.forEach(charge => {
          if (charge.amount > 0) {
            body.push(['—', charge.desc || 'MISC', 'Charge', '—', '—', fmt(charge.amount)]);
          }
        });
      }
    }

  } else {
    // SINGLE DAY: 4 columns [Description, Unit Rate, Qty, Amount]
    body.push([
      'Catering & Decor Services',
      fmt(booking.perPlateCost),
      String(booking.guestCount),
      fmt(booking.perPlateCost * booking.guestCount),
    ]);

    // Rooms row
    if ((booking.roomsRequired ?? 0) > 0) {
      const roomTotal = (booking.roomsRequired ?? 0) * (booking.roomCost ?? 0);
      body.push([
        `Room Accommodation (${booking.roomsRequired} rooms)`,
        booking.roomCost ? fmt(booking.roomCost) : '—',
        String(booking.roomsRequired),
        roomTotal > 0 ? fmt(roomTotal) : 'Included',
      ]);
    }

    // Additional services
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
            body.push([charge.desc || 'Miscellaneous Charge', '—', '—', fmt(charge.amount)]);
          }
        });
      }
    }
  }

  const tableHead = isMultiDay 
    ? [['Date', 'Meal', 'Venue', 'Guest Count', 'Rate', 'Subtotal']]
    : [['Description', 'Unit Rate', 'Qty', 'Amount']];

  const columnStyles: any = isMultiDay 
    ? {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 25 }, // Meal
        2: { cellWidth: 60 }, // Venue
        3: { halign: 'center', cellWidth: 22 }, // Guest Count
        4: { halign: 'right', cellWidth: 23 },  // Rate
        5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }, // Subtotal
      }
    : {
        0: { cellWidth: 85 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
      };

  autoTable(doc, {
    startY: Y,
    head: tableHead,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: [212, 175, 55],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [20, 35, 60] },
    columnStyles,
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
  if (booking.eventType === 'Multi-Day' && (booking.dayMeals || []).length > 0) {
    
    doc.setDrawColor(220, 228, 240);
    doc.setLineWidth(0.5);
    doc.line(14, Y, 196, Y);
    Y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY_RGB);
    doc.text('MEAL SCHEDULE & ITINERARY', 14, Y);
    Y += 5;

    const mealRows: string[][] = [];
    const meals = ['Breakfast', 'Lunch', 'High Tea', 'Dinner'] as const;

    booking.dayMeals!.forEach(dayMeal => {
      // Add day header row
      const dayHeaderStr = `Day ${dayMeal.day}${dayMeal.date ? ` - ${dayMeal.date}` : ''} (${dayMeal.venue || 'No overall venue'})`;
      mealRows.push([{ content: dayHeaderStr, colSpan: 3, styles: { fillColor: [240, 245, 250], fontStyle: 'bold', textColor: NAVY_RGB } }] as any);

      meals.forEach(m => {
        const entry = dayMeal.meals[m];
        if (entry.dishes.length > 0 || entry.venue) {
          mealRows.push([
            m,
            entry.venue || '—',
            entry.dishes.length > 0 ? entry.dishes.join(', ') : '—',
          ]);
        }
      });
    });

    if (mealRows.length > 0) {
      autoTable(doc, {
        startY: Y,
        head: [['Meal', 'Venue', 'Dishes']],
        body: mealRows,
        theme: 'grid',
        headStyles: { fillColor: [10, 50, 100], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [20, 35, 60] },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 40 },
          2: { cellWidth: 116 },
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
