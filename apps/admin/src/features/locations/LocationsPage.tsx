import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  FolderTree,
  Table as TableIcon,
  RefreshCw,
  AlertTriangle,
  Globe,
  Building2,
  Navigation,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LocationItem, LocationType } from './types';
import {
  useLocationsTreeQuery,
  useLocationsSearchQuery,
  useLocationsMutation,
} from './hook/useLocations';
import { LocationTreeItem } from './components/LocationTreeItem';
import { LocationFormModal } from './components/LocationFormModal';

export const LocationsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [parentForNewChild, setParentForNewChild] = useState<LocationItem | null>(null);

  // Queries
  const { data: tree = [], isLoading: isTreeLoading, refetch: refetchTree } = useLocationsTreeQuery();
  const { data: searchData, isLoading: isSearchLoading, refetch: refetchSearch } = useLocationsSearchQuery({
    q: searchQuery,
    type: selectedType || undefined,
    status: selectedStatus || undefined,
    page,
    limit: 25,
  });

  const { createLocation, updateLocation, updateStatus, deleteLocation } = useLocationsMutation();

  // Compute summary metrics from tree
  const metrics = useMemo(() => {
    let countries = 0;
    let states = 0;
    let cities = 0;
    let localities = 0;
    let total = 0;

    const traverse = (items: LocationItem[]) => {
      items.forEach((item) => {
        total++;
        const t = (item.type || '').toLowerCase();
        if (t === 'country') countries++;
        else if (t === 'state') states++;
        else if (t === 'city') cities++;
        else if (t === 'locality' || t === 'area') localities++;

        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(tree);
    return { total, countries, states, cities, localities };
  }, [tree]);

  // Modal Handlers
  const handleOpenCreateRoot = () => {
    setEditingLocation(null);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleOpenAddChild = (parent: LocationItem) => {
    setEditingLocation(null);
    setParentForNewChild(parent);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (location: LocationItem) => {
    setEditingLocation(location);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateStatus.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = (location: LocationItem) => {
    const hasChildren = (location.children && location.children.length > 0) || (location._count?.children || 0) > 0;
    const hasAds = (location._count?.ads || 0) > 0;

    if (hasChildren) {
      alert(`Cannot delete "${location.name}" because it contains child locations. Move or delete children first.`);
      return;
    }
    if (hasAds) {
      alert(`Cannot delete "${location.name}" because active marketplace listings are assigned to it. Deactivate it instead.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${location.name}"? This action cannot be undone.`)) {
      deleteLocation.mutate(location.id);
    }
  };

  const handleFormSubmit = async (payload: any) => {
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, payload });
    } else {
      await createLocation.mutateAsync(payload);
    }
  };

  // Filtered tree for quick text searching in Tree mode
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase().trim();

    const filterNode = (node: LocationItem): LocationItem | null => {
      const nameMatches = node.name.toLowerCase().includes(q) || node.slug.toLowerCase().includes(q);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((c): c is LocationItem => Boolean(c));

      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return tree.map(filterNode).filter((n): n is LocationItem => Boolean(n));
  }, [tree, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span>Locations</span>
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {metrics.total} Registered
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Production-ready hierarchical location management system for India marketplace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTree();
              refetchSearch();
            }}
            className="gap-1.5"
            title="Refresh locations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button onClick={handleOpenCreateRoot} size="sm" className="bg-primary text-primary-foreground gap-1.5 font-semibold">
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </Button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">Countries</div>
            <div className="text-xl font-bold mt-0.5">{metrics.countries}</div>
          </div>
          <Globe className="w-6 h-6 text-indigo-500/70" />
        </div>
        <div className="p-3.5 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">States</div>
            <div className="text-xl font-bold mt-0.5">{metrics.states}</div>
          </div>
          <Navigation className="w-6 h-6 text-blue-500/70" />
        </div>
        <div className="p-3.5 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">Cities</div>
            <div className="text-xl font-bold mt-0.5">{metrics.cities}</div>
          </div>
          <Building2 className="w-6 h-6 text-emerald-500/70" />
        </div>
        <div className="p-3.5 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">Localities & Areas</div>
            <div className="text-xl font-bold mt-0.5">{metrics.localities}</div>
          </div>
          <MapPin className="w-6 h-6 text-amber-500/70" />
        </div>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search city, locality, state, or PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-2xs"
          >
            <option value="">All Types</option>
            <option value="country">Country</option>
            <option value="state">State</option>
            <option value="city">City</option>
            <option value="locality">Locality</option>
            <option value="area">Area</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'tree' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tree View"
            >
              <FolderTree size={14} />
              <span className="hidden md:inline">Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {viewMode === 'tree' ? (
          /* Hierarchy Tree View */
          <div className="p-4 sm:p-6 min-h-[360px]">
            {isTreeLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading location hierarchy...</span>
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-sm font-semibold">No matching locations found</div>
                <div className="text-xs text-muted-foreground">Try clearing your search query or add a new location</div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTree.map((root) => (
                  <LocationTreeItem
                    key={root.id}
                    location={root}
                    onAddChild={handleOpenAddChild}
                    onEdit={handleOpenEdit}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Hierarchy Path</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Ads Count</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isSearchLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading locations...
                    </td>
                  </tr>
                ) : !searchData?.items || searchData.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No locations found
                    </td>
                  </tr>
                ) : (
                  searchData.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{item.slug}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted border border-border">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {item.pathList && item.pathList.length > 0 ? (
                          <span className="font-medium text-foreground/80">{item.pathList.join(' > ')}</span>
                        ) : (
                          item.parent?.name || '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {item._count?.ads ?? 0}
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(item.id, item.isActive)}
                          className={`h-7 px-2 text-xs ${item.isActive ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Location Modal */}
      <LocationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLocation(null);
          setParentForNewChild(null);
        }}
        onSubmit={handleFormSubmit}
        location={editingLocation}
        parentLocation={parentForNewChild}
        allLocations={tree}
        isLoading={createLocation.isPending || updateLocation.isPending}
      />
    </div>
  );
};

