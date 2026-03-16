'use client';

import { FinancialSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Wallet, AlertCircle } from 'lucide-react';

interface Props {
  summary: FinancialSummary;
}

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'Total Expected Revenue',
      value: summary.totalExpectedRevenue,
      icon: TrendingUp,
      color: 'card-revenue',
      desc: 'From confirmed events',
    },
    {
      label: 'Total Advance Received',
      value: summary.totalAdvanceReceived,
      icon: Wallet,
      color: 'card-advance',
      desc: 'Across all active bookings',
    },
    {
      label: 'Outstanding Balance',
      value: summary.totalOutstandingBalance,
      icon: AlertCircle,
      color: 'card-balance',
      desc: 'Pending collection',
    },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`summary-card ${card.color}`}>
            <div className="summary-card-inner">
              <div className="summary-card-text">
                <p className="summary-label">{card.label}</p>
                <p className="summary-value">{formatCurrency(card.value)}</p>
                <p className="summary-desc">{card.desc}</p>
              </div>
              <div className="summary-icon-wrap">
                <Icon size={28} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
