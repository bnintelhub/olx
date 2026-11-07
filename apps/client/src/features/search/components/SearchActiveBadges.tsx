import React from 'react';
import { X } from 'lucide-react';

export interface ActiveFilterItem {
  key: string;
  label: string;
  value: string;
}

interface SearchActiveBadgesProps {
  activeFilters: ActiveFilterItem[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

export const SearchActiveBadges: React.FC<SearchActiveBadgesProps> = ({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}) => {
  if (activeFilters.length === 0) return null;

  return (
    <div className="bg-white px-4 py-2.5 rounded-xl border border-[#E5EAED] flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-gray-500 mr-1">Active:</span>
      {activeFilters.map((flt) => (
        <span
          key={flt.key}
          className="inline-flex items-center gap-1.5 bg-[#F0F4F6] text-[#002f34] text-xs font-bold px-2.5 py-1 rounded-full border border-[#D8DFE2]"
        >
          <span className="text-gray-500 font-normal">{flt.label}:</span>
          <span>{flt.value}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(flt.key)}
            className="hover:text-red-500 rounded-full p-0.5 cursor-pointer"
            title={`Remove ${flt.label} filter`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-bold text-teal-800 hover:underline ml-auto cursor-pointer"
      >
        Clear All
      </button>
    </div>
  );
};

