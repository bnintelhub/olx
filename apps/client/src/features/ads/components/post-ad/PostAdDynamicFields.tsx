import React from 'react';
import { Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface AttributeItem {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
  options?: string[];
  isRequired: boolean;
  isFilterable: boolean;
  unit?: string;
}

interface PostAdDynamicFieldsProps {
  categoryAttributes: AttributeItem[];
  attributeValues: Record<string, any>;
  onAttributeChange: (key: string, value: any) => void;
  isLoading: boolean;
}

export const PostAdDynamicFields: React.FC<PostAdDynamicFieldsProps> = ({
  categoryAttributes,
  attributeValues,
  onAttributeChange,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="py-4 text-center text-xs text-gray-400 animate-pulse">
        Loading category specifications...
      </div>
    );
  }

  if (categoryAttributes.length === 0) return null;

  return (
    <div className="space-y-4 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#002f34]">
        <Tag className="w-4 h-4 text-teal-700" />
        <span>Category Specifications</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categoryAttributes.map((attr) => {
          const val = attributeValues[attr.key];

          // 1. SELECT
          if (attr.type === 'SELECT') {
            return (
              <div key={attr.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>
                    {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                  </span>
                  {attr.unit && <span className="text-gray-400 text-[10px]">({attr.unit})</span>}
                </label>
                <select
                  value={val || ''}
                  onChange={(e) => onAttributeChange(attr.key, e.target.value)}
                  className="w-full h-9 text-xs border border-gray-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-700"
                >
                  <option value="">Select {attr.name}</option>
                  {(attr.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          // 2. BOOLEAN
          if (attr.type === 'BOOLEAN') {
            return (
              <div key={attr.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                <span className="text-xs font-semibold text-gray-700">
                  {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                </span>
                <button
                  type="button"
                  onClick={() => onAttributeChange(attr.key, !val)}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    val ? 'bg-[#002f34]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      val ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          }

          // 3. NUMBER
          if (attr.type === 'NUMBER') {
            return (
              <div key={attr.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>
                    {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                  </span>
                  {attr.unit && <span className="text-gray-400 text-[10px]">({attr.unit})</span>}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Enter ${attr.name}`}
                    value={val || ''}
                    onChange={(e) => onAttributeChange(attr.key, e.target.value)}
                    className="h-9 text-xs rounded-xl pr-12"
                  />
                  {attr.unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">
                      {attr.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // 4. Fallback TEXT
          return (
            <div key={attr.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>
                  {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                </span>
              </label>
              <Input
                type="text"
                placeholder={`Enter ${attr.name}`}
                value={val || ''}
                onChange={(e) => onAttributeChange(attr.key, e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

