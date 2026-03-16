'use client';

import { FilterType, SortDirection, SortField } from '@/types';
import { Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filter: FilterType;
  onFilter: (f: FilterType) => void;
  sortField: SortField;
  sortDir: SortDirection;
  onSort: (f: SortField) => void;
}

const FILTERS: FilterType[] = ['All', 'Upcoming', 'This Month', 'Payment Pending'];

export default function SearchFilter({
  search,
  onSearch,
  filter,
  onFilter,
  sortField,
  sortDir,
  onSort,
}: Props) {
  const sortOptions: { label: string; value: SortField }[] = [
    { label: 'Client Name', value: 'clientName' },
    { label: 'Event Date', value: 'eventDate' },
    { label: 'Total Value', value: 'totalEventValue' },
    { label: 'Balance', value: 'balanceAmount' },
  ];

  return (
    <div className="search-filter-bar">
      <div className="search-input-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search by client name or phone…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-group">
        <Filter size={14} className="filter-icon" />
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={`filter-btn ${filter === f ? 'filter-btn-active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="sort-group">
        <span className="sort-label">Sort:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSort(opt.value)}
            className={`sort-btn ${sortField === opt.value ? 'sort-btn-active' : ''}`}
          >
            {opt.label}
            {sortField === opt.value && (
              sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
