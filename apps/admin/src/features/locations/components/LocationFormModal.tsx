import React, { useState, useEffect, useMemo } from 'react';
import { LocationItem, LocationType } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { MapPin, Globe, Building2, Map, Navigation } from 'lucide-react';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  location?: LocationItem | null;
  parentLocation?: LocationItem | null;
  allLocations: LocationItem[];
  isLoading?: boolean;
}

const TYPE_CONFIG: Record<LocationType, { label: string; icon: any; parentType: LocationType | null }> = {
  country: { label: 'Country', icon: Globe, parentType: null },
  state: { label: 'State', icon: Map, parentType: 'country' },
  city: { label: 'City', icon: Building2, parentType: 'state' },
  locality: { label: 'Locality', icon: MapPin, parentType: 'city' },
  area: { label: 'Area', icon: Navigation, parentType: 'locality' },
};

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  location,
  parentLocation,
  allLocations,
  isLoading,
}) => {
  const isEditing = Boolean(location);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<LocationType>('city');
  const [parentId, setParentId] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Flatten tree to find candidate parents
  const flatLocations = useMemo(() => {
    const list: LocationItem[] = [];
    const traverse = (items: LocationItem[]) => {
      items.forEach((item) => {
        list.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(allLocations);
    return list;
  }, [allLocations]);

  // Candidates filtered by required parent type
  const candidateParents = useMemo(() => {
    const requiredParentType = TYPE_CONFIG[type]?.parentType;
    if (!requiredParentType) return [];
    return flatLocations.filter((loc) => {
      if (loc.id === location?.id) return false; // cannot be own parent
      return loc.type.toLowerCase() === requiredParentType;
    });
  }, [flatLocations, type, location]);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setSlug(location.slug);
      setType((location.type.toLowerCase() as LocationType) || 'city');
      setParentId(location.parentId || '');
      setLatitude(location.latitude !== undefined && location.latitude !== null ? String(location.latitude) : '');
      setLongitude(location.longitude !== undefined && location.longitude !== null ? String(location.longitude) : '');
      setPincode(location.pincode || '');
      setIsActive(location.isActive);
    } else {
      setName('');
      setSlug('');
      setPincode('');
      setLatitude('');
      setLongitude('');
      setIsActive(true);

      if (parentLocation) {
        // Pre-select child type based on parent
        const parentType = parentLocation.type.toLowerCase();
        let targetType: LocationType = 'locality';
        if (parentType === 'country') targetType = 'state';
        else if (parentType === 'state') targetType = 'city';
        else if (parentType === 'city') targetType = 'locality';
        else if (parentType === 'locality') targetType = 'area';

        setType(targetType);
        setParentId(parentLocation.id);
      } else {
        setType('city');
        setParentId('');
      }
    }
    setFormError(null);
  }, [location, parentLocation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter a location name');
      return;
    }

    const expectedParentType = TYPE_CONFIG[type].parentType;
    if (expectedParentType && !parentId) {
      setFormError(`A ${TYPE_CONFIG[type].label} must have a valid ${TYPE_CONFIG[expectedParentType].label} selected as parent`);
      return;
    }

    const parsedLat = latitude.trim() !== '' ? parseFloat(latitude) : null;
    const parsedLng = longitude.trim() !== '' ? parseFloat(longitude) : null;

    if (parsedLat !== null && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
      setFormError('Latitude must be a valid number between -90 and 90');
      return;
    }

    if (parsedLng !== null && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
      setFormError('Longitude must be a valid number between -180 and 180');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        parentId: type === 'country' ? null : parentId || null,
        latitude: parsedLat,
        longitude: parsedLng,
        pincode: pincode.trim() || null,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.message || 'Operation failed');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card text-card-foreground border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span>{isEditing ? `Edit Location: ${location?.name}` : 'Add New Location'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {formError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium">
              {formError}
            </div>
          )}

          {/* Location Type Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">Location Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['country', 'state', 'city', 'locality', 'area'] as LocationType[]).map((t) => {
                const config = TYPE_CONFIG[t];
                const Icon = config.icon;
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      setType(t);
                      setParentId('');
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    } ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="capitalize text-[11px]">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parent Location Selector */}
          {TYPE_CONFIG[type].parentType && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold block">
                Parent {TYPE_CONFIG[TYPE_CONFIG[type].parentType!].label} <span className="text-destructive">*</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Select Parent {TYPE_CONFIG[TYPE_CONFIG[type].parentType!].label} --</option>
                {candidateParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Name */}
          <div className="space-y-1.5">
            <label htmlFor="loc-name" className="text-xs font-semibold block">
              Location Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="loc-name"
              placeholder="e.g. Kankarbagh or Patna"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Slug & Pincode in Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="loc-slug" className="text-xs font-semibold block">
                Slug (Optional)
              </label>
              <Input
                id="loc-slug"
                placeholder="auto-generated from name"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="loc-pincode" className="text-xs font-semibold block">
                Pincode (Optional)
              </label>
              <Input
                id="loc-pincode"
                placeholder="e.g. 800020"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>
          </div>

          {/* Geo Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="loc-lat" className="text-xs font-semibold block">
                Latitude Center (Optional)
              </label>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                placeholder="e.g. 25.5941"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="loc-lng" className="text-xs font-semibold block">
                Longitude Center (Optional)
              </label>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                placeholder="e.g. 85.1376"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="loc-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="loc-active" className="text-xs font-medium cursor-pointer">
              Active (Visible in marketplace search and selectable by sellers)
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="bg-primary text-primary-foreground font-semibold">
              {isLoading ? 'Saving...' : isEditing ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
