'use client';

import { FilterType, SortDirection, SortField } from '@/types';
import { Search, Filter, ChevronUp, ChevronDown, Calendar, X } from 'lucide-react';
import { useState } from 'react';

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
  const [searchMode, setSearchMode] = useState<'text' | 'date'>('text');

  const sortOptions: { label: string; value: SortField }[] = [
    { label: 'Client Name', value: 'clientName' },
    { label: 'Event Date',  value: 'eventDate' },
    { label: 'Total Value', value: 'totalEventValue' },
    { label: 'Balance',     value: 'balanceAmount' },
  ];

  function handleClear() {
    onSearch('');
  }

  return (
    <div className="search-filter-bar">
      {/* Search row */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

        {/* Mode toggle */}
        <button
          type="button"
          title={searchMode === 'text' ? 'Switch to Date Search' : 'Switch to Text Search'}
          onClick={() => { setSearchMode(m => m === 'text' ? 'date' : 'text'); onSearch(''); }}
          className="btn-icon"
          style={{ flexShrink: 0 }}
        >
          {searchMode === 'text' ? <Calendar size={16} /> : <Search size={16} />}
        </button>

        {/* Input */}
        <div className="search-input-wrap" style={{ flex: 1 }}>
          {searchMode === 'text' ? (
            <>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                id="main-search-text"
                placeholder="Search by client name or phone number…"
                value={search}
                onChange={e => onSearch(e.target.value)}
                className="search-input"
              />
            </>
          ) : (
            <>
              <Calendar size={16} className="search-icon" />
              <input
                type="date"
                id="main-search-date"
                value={search}
                onChange={e => onSearch(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '2.25rem' }}
              />
            </>
          )}
        </div>

        {/* Clear */}
        {search && (
          <button type="button" className="btn-icon" onClick={handleClear} title="Clear search" style={{ flexShrink: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-group">
        <Filter size={14} className="filter-icon" />
        {FILTERS.map(f => (
          <button
            key={f}
            id={`filter-${f.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => onFilter(f)}
            className={`filter-btn ${filter === f ? 'filter-btn-active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="sort-group">
        <span className="sort-label">Sort:</span>
        {sortOptions.map(opt => (
          <button
            key={opt.value}
            id={`sort-${opt.value}`}
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
