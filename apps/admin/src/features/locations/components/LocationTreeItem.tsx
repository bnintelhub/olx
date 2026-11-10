import React, { useState } from 'react';
import { LocationItem, LocationType } from '../types';
import {
  ChevronRight,
  ChevronDown,
  Globe,
  Map,
  Building2,
  MapPin,
  Navigation,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface LocationTreeItemProps {
  location: LocationItem;
  onAddChild: (parent: LocationItem) => void;
  onEdit: (location: LocationItem) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (location: LocationItem) => void;
  depth?: number;
}

const TYPE_BADGES: Record<string, { label: string; className: string; icon: any }> = {
  country: { label: 'Country', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Globe },
  state: { label: 'State', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Map },
  city: { label: 'City', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Building2 },
  locality: { label: 'Locality', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: MapPin },
  area: { label: 'Area', className: 'bg-purple-50 text-purple-700 border-purple-200', icon: Navigation },
};

export const LocationTreeItem: React.FC<LocationTreeItemProps> = ({
  location,
  onAddChild,
  onEdit,
  onToggleStatus,
  onDelete,
  depth = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Default expand country and states
  const hasChildren = location.children && location.children.length > 0;
  const typeKey = (location.type || '').toLowerCase();
  const badgeConfig = TYPE_BADGES[typeKey] || TYPE_BADGES.city;
  const Icon = badgeConfig.icon;
  const canHaveChildren = typeKey !== 'area';

  return (
    <div className="flex flex-col select-none">
      <div
        className={`group flex items-center justify-between py-2 px-3 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/40 transition-colors ${
          !location.isActive ? 'opacity-65 bg-muted/20' : ''
        }`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Left: Expand toggle, Icon, Name, Type */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <div className="p-1.5 rounded-lg bg-background border border-border/70 text-foreground/80 shrink-0">
            <Icon size={14} />
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-sm text-foreground truncate">{location.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">({location.slug})</span>

            {/* Type badge */}
            <span
              className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeConfig.className}`}
            >
              {badgeConfig.label}
            </span>

            {/* Active / Inactive Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                location.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {location.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
              <span>{location.isActive ? 'Active' : 'Inactive'}</span>
            </span>

            {/* Counters */}
            {location._count?.ads ? (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {location._count.ads} ads
              </span>
            ) : null}

            {location.pincode && (
              <span className="text-[10px] text-muted-foreground font-mono">PIN: {location.pincode}</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {canHaveChildren && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(location)}
              className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
              title="Add child location"
            >
              <Plus size={13} />
              <span className="hidden sm:inline text-[11px]">Add child</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(location)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Edit location"
          >
            <Edit2 size={13} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(location.id, location.isActive)}
            className={`h-7 px-2 text-[11px] font-medium ${
              location.isActive
                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            title={location.isActive ? 'Deactivate location' : 'Activate location'}
          >
            {location.isActive ? 'Deactivate' : 'Activate'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(location)}
            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
            title="Delete location"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Render Subtree */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-border/40">
          {location.children!.map((child) => (
            <LocationTreeItem
              key={child.id}
              location={child}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

