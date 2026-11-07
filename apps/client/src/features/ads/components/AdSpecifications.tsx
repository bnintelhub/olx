import React from 'react';
import { Layers, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface AttributeValueEntity {
  id?: string;
  value: any;
  attribute?: {
    id?: string;
    name?: string;
    key?: string;
    displayLabel?: string | null;
    type?: string;
    unit?: string | null;
    displayOrder?: number;
  };
}

interface AdSpecificationsProps {
  attributes?: Record<string, any> | null;
  attributeValues?: AttributeValueEntity[] | null;
  categoryName?: string;
}

interface SpecRow {
  key: string;
  label: string;
  value: any;
  unit?: string | null;
  displayOrder: number;
}

// Known special label overrides for standardized marketplace readability
const SPECIAL_LABELS: Record<string, string> = {
  brand_make: 'Brand / Make',
  kms_driven: 'KM Driven',
  km_driven: 'KM Driven',
  year_of_registration: 'Year of Registration',
  fuel_type: 'Fuel Type',
  transmission_type: 'Transmission',
  transmission: 'Transmission',
  no_of_owners: 'Number of Owners',
  owners: 'Number of Owners',
  car_title: 'Car Title',
  bhk_type: 'BHK',
  bathrooms: 'Bathrooms',
  furnishing: 'Furnishing Status',
  super_builtup_area: 'Super Builtup Area',
  carpet_area: 'Carpet Area',
  battery_health: 'Battery Health',
  storage_capacity: 'Storage Capacity',
  ram: 'RAM',
};

// Formats raw database key into user-friendly title case
const formatLabel = (key: string): string => {
  const lower = key.toLowerCase();
  if (SPECIAL_LABELS[lower]) return SPECIAL_LABELS[lower];

  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

export const AdSpecifications: React.FC<AdSpecificationsProps> = ({
  attributes,
  attributeValues,
  categoryName,
}) => {
  // Aggregate specification items from both relation and JSON cache
  const specMap = new Map<string, SpecRow>();

  // 1. Process structured attributeValues relation from database
  if (Array.isArray(attributeValues)) {
    attributeValues.forEach((item, index) => {
      if (!item || item.value === undefined || item.value === null || item.value === '') return;
      const attr = item.attribute;
      const key = attr?.key || `attr_${index}`;
      const label = attr?.displayLabel || attr?.name || formatLabel(key);
      const unit = attr?.unit || null;
      const displayOrder = attr?.displayOrder ?? index;

      specMap.set(key, {
        key,
        label,
        value: item.value,
        unit,
        displayOrder,
      });
    });
  }

  // 2. Process attributesCache dictionary
  if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([key, val], index) => {
      if (val === undefined || val === null || val === '') return;
      if (specMap.has(key)) return;

      specMap.set(key, {
        key,
        label: formatLabel(key),
        value: val,
        unit: null,
        displayOrder: 100 + index,
      });
    });
  }

  const specs = Array.from(specMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);

  // If no specifications are present, hide component cleanly
  if (specs.length === 0) return null;

  // Render individual value according to its data type (boolean, array, number, string)
  const renderValue = (spec: SpecRow) => {
    const val = spec.value;

    // Boolean display
    if (val === true || val === 'true') {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Yes</span>
        </span>
      );
    }
    if (val === false || val === 'false') {
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium text-xs sm:text-sm">
          <XCircle className="w-4 h-4 text-gray-400" />
          <span>No</span>
        </span>
      );
    }

    // Array / Multi-select display
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-400 font-normal">-</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.map((item, i) => (
            <span
              key={i}
              className="inline-block bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-md font-medium"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    // Number with optional unit
    if (typeof val === 'number') {
      const formattedNum = val.toLocaleString('en-IN');
      return (
        <span className="text-gray-900 font-medium text-xs sm:text-sm">
          {formattedNum} {spec.unit ? <span className="text-gray-600 font-normal">{spec.unit}</span> : null}
        </span>
      );
    }

    // Standard string
    const stringVal = String(val).trim();
    if (!stringVal) return <span className="text-gray-400 font-normal">-</span>;

    return (
      <span className="text-gray-900 font-medium text-xs sm:text-sm capitalize">
        {stringVal} {spec.unit ? <span className="text-gray-600 font-normal">{spec.unit}</span> : null}
      </span>
    );
  };

  return (
    <Card className="rounded-2xl border-[#E5EAED] shadow-xs overflow-hidden">
      <CardContent className="p-0">
        {/* Flipkart-Style Section Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-800" />
            <h2 className="text-base sm:text-lg font-bold text-[#002f34]">Specifications</h2>
          </div>
          {categoryName && (
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full">
              {categoryName}
            </span>
          )}
        </div>

        {/* Flipkart-Style Two-Column Specification List */}
        <div className="divide-y divide-gray-100 bg-white">
          {specs.map((spec) => (
            <div
              key={spec.key}
              className="flex items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
            >
              {/* Specification Label */}
              <div className="w-2/5 sm:w-1/3 pr-4 text-xs sm:text-sm text-gray-500 font-normal">
                {spec.label}
              </div>

              {/* Specification Value */}
              <div className="w-3/5 sm:w-2/3">
                {renderValue(spec)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
