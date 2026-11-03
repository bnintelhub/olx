import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminFilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  onClear?: () => void;
  children?: React.ReactNode;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  query,
  onQueryChange,
  placeholder = 'Search records...',
  onClear,
  children,
}) => (
  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-xs backdrop-blur-md dark:border-[#24334A] dark:bg-[#101D30] sm:flex-row sm:items-center">
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#9BAAC0]" />
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-[#24334A] dark:bg-[#15243A] dark:text-[#F4F7FB] dark:placeholder:text-[#9BAAC0]/70 dark:focus:border-[#FFC439]"
      />
      {query && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-[#9BAAC0] dark:hover:text-[#F4F7FB]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);
