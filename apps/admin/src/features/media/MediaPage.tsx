import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Search,
  Eye,
  HardDrive,
  Layers,
  ZoomIn,
  RefreshCw,
  ExternalLink,
  Edit,
  Upload,
  AlertTriangle,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  Server,
  BarChart3,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '../../components/ui/dropdown-menu';
import {
  useMediaOverviewQuery,
  useMediaListQuery,
  useMediaDetailQuery,
} from './hook/useMediaQuery';
import {
  useDeleteMediaMutation,
  useUpdateMediaMetadataMutation,
  useReplaceMediaFileMutation,
  useCleanupOrphansMutation,
} from './hook/useMediaMutation';
import { MediaItem, MediaEntityScope } from './service/media.service';

export function MediaPage() {
  // Query parameters state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedScope, setSelectedScope] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Column selection state (4-5 images in row default for grid, column visibility for table)
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [visibleColumns, setVisibleColumns] = useState({
    preview: true,
    name: true,
    uploader: true,
    size: true,
    scope: true,
    status: true,
    storage: true,
    date: false,
    actions: true,
  });

  // Modals state
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [editMedia, setEditMedia] = useState<MediaItem | null>(null);
  const [deleteConfirmMedia, setDeleteConfirmMedia] = useState<MediaItem | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupHours, setCleanupHours] = useState<number>(0);

  // Edit form state
  const [editOriginalName, setEditOriginalName] = useState('');
  const [editScope, setEditScope] = useState<MediaEntityScope>('UNATTACHED');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  // Queries
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useMediaOverviewQuery();
  const { data: listData, isLoading: isListLoading, isFetching: isListFetching, refetch: refetchList } = useMediaListQuery({
    page,
    limit,
    scope: selectedScope,
    status: selectedStatus,
    search: searchQuery,
  });

  const { data: detailData, isLoading: isDetailLoading } = useMediaDetailQuery(previewMediaId);

  // Mutations
  const deleteMutation = useDeleteMediaMutation();
  const updateMutation = useUpdateMediaMetadataMutation();
  const replaceMutation = useReplaceMediaFileMutation();
  const cleanupMutation = useCleanupOrphansMutation();

  const handleRefresh = () => {
    refetchOverview();
    refetchList();
  };

  const handleOpenEdit = (media: MediaItem) => {
    setEditMedia(media);
    setEditOriginalName(media.originalName);
    setEditScope(media.scope);
    setReplacementFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editMedia) return;

    if (replacementFile) {
      // Replace physical file with automatic old file purge
      await replaceMutation.mutateAsync({
        id: editMedia.id,
        file: replacementFile,
      });
    }

    if (editOriginalName !== editMedia.originalName || editScope !== editMedia.scope) {
      await updateMutation.mutateAsync({
        id: editMedia.id,
        payload: {
          originalName: editOriginalName,
          scope: editScope,
        },
      });
    }

    setEditMedia(null);
    setReplacementFile(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMedia) return;
    await deleteMutation.mutateAsync(deleteConfirmMedia.id);
    setDeleteConfirmMedia(null);
    if (previewMediaId === deleteConfirmMedia.id) {
      setPreviewMediaId(null);
    }
  };

  const handleRunCleanup = async () => {
    await cleanupMutation.mutateAsync(cleanupHours);
    setShowCleanupDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Media & Storage Observability</h2>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              Local Persistent Disk (/data/olx-media)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time storage metrics, inspect uploaded assets, and observe physical disk space allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isListFetching}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isListFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowCleanupDialog(true)}
            className="text-xs h-8 gap-1.5 font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clean Orphaned Files</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Media Files */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Media Files</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {isOverviewLoading ? '...' : overview?.totalFilesFormatted || '0'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {overview?.storageInfrastructure?.syncStatusText || 'Local Persistent Volume Active'}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <ImageIcon className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 2: Storage Consumed */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Storage Consumed</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {isOverviewLoading ? '...' : overview?.storageConsumed.formatted || '0 Bytes'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {overview?.optimizationTier.tier || 'WebP optimized tier'}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <HardDrive className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 3: Storage Engine & Volume */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Storage Engine</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              Local Disk
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Volume: media_data (/data)
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Server className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 4: Orphaned Media */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Unattached Orphans</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {isOverviewLoading ? '...' : overview?.orphanedMedia.count || 0}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
              {overview?.orphanedMedia.cleanupRecommended ? 'Cleanup recommended' : 'Storage healthy'}
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Disk Storage Observability Graphs */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Storage by Scope Bar Chart */}
        <Card className="lg:col-span-7 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Disk Storage Allocation by Category</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical disk footprint across marketplace media types
              </p>
            </div>
            <Badge variant="secondary" className="text-[11px] font-mono">
              Total: {overview?.storageConsumed.formatted || '0 Bytes'}
            </Badge>
          </div>

          <div className="h-[230px] w-full">
            {overview?.diskBreakdown && overview.diskBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.diskBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (val === 0) return '0';
                      if (val >= 1024 * 1024) return `${(val / (1024 * 1024)).toFixed(0)}MB`;
                      if (val >= 1024) return `${(val / 1024).toFixed(0)}KB`;
                      return `${val}B`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-lg shadow-lg text-xs">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span>{d.name}</span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Size: <span className="font-medium text-foreground">{d.formatted}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Files: <span className="font-medium text-foreground">{d.count}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Disk Share: <span className="font-medium text-foreground">{d.percentage}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="bytes" radius={[4, 4, 0, 0]}>
                    {overview.diskBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No storage allocation data recorded
              </div>
            )}
          </div>
        </Card>

        {/* Disk Composition & Tier Efficiency */}
        <Card className="lg:col-span-5 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-purple-600" />
                <span>Storage Share & Efficiency</span>
              </h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                WebP ~65% Saved
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="h-[155px] relative">
                {overview?.diskBreakdown && overview.diskBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overview.diskBreakdown}
                        dataKey="bytes"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {overview.diskBreakdown.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, _name: any, entry: any) => [
                          entry?.payload?.formatted || `${value} bytes`,
                          entry?.payload?.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No data
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                {overview?.diskBreakdown && overview.diskBreakdown.length > 0 ? (
                  overview.diskBreakdown.map((item) => (
                    <div key={item.scope} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-medium text-[11px] text-foreground shrink-0">
                        {item.formatted}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">Awaiting uploads</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-2.5 rounded-lg">
            <div>
              <span className="text-muted-foreground block text-[10px]">Volume Mount:</span>
              <span className="font-mono font-semibold text-foreground">/data/olx-media</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Sharp Optimization:</span>
              <span className="font-semibold text-emerald-600">4 WebP Variants / Image</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs, Search Bar, and Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b pb-3">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Scopes' },
            { id: 'LISTING', label: 'Listing Ads' },
            { id: 'USER', label: 'Avatars' },
            { id: 'CATEGORY', label: 'Categories' },
            { id: 'BANNER', label: 'Banners' },
            { id: 'CHAT', label: 'Chats' },
            { id: 'UNATTACHED', label: 'Unattached' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedScope(cat.id);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedScope === cat.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown, Search, and View Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="PROCESSING">Processing</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search filename, id, user..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* Column Selection Controls */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-1 text-xs border rounded-md px-1.5 py-0.5 bg-muted/20">
              <span className="text-[11px] font-medium text-muted-foreground mr-0.5">Columns:</span>
              <button
                type="button"
                onClick={() => setGridColumns(4)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                  gridColumns === 4
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                4 / row
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(5)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                  gridColumns === 5
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                5 / row
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(3)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer hidden md:inline-block ${
                  gridColumns === 3
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                3 / row
              </button>
            </div>
          )}

          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.preview}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, preview: checked }))}
                >
                  Preview
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, name: checked }))}
                >
                  File Name / ID
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.uploader}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, uploader: checked }))}
                >
                  Uploader
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.size}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, size: checked }))}
                >
                  Size & Res
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.scope}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, scope: checked }))}
                >
                  Scope
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, status: checked }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.storage}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, storage: checked }))}
                >
                  Storage Location
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.date}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, date: checked }))}
                >
                  Upload Date
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.actions}
                  onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, actions: checked }))}
                >
                  Actions
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center border rounded-md p-0.5 bg-muted/30">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-7 w-7"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              className="h-7 w-7"
              onClick={() => setViewMode('table')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isListLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <div className="text-xs text-muted-foreground font-medium">Loading media assets from storage...</div>
        </div>
      ) : !listData || listData.items.length === 0 ? (
        <div className="py-16 text-center border rounded-lg bg-card/40 space-y-2">
          <ImageIcon className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <div className="text-sm font-semibold text-foreground">No media assets found</div>
          <div className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || selectedScope !== 'ALL' || selectedStatus !== 'ALL'
              ? 'Try adjusting your search query or filters.'
              : 'Uploaded files will appear here once users post ad photos.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View: 4-5 images per row configurable */
        <div
          className={
            gridColumns === 5
              ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              : gridColumns === 3
              ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              : 'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }
        >
          {listData.items.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden rounded-xl border bg-card hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden cursor-pointer" onClick={() => setPreviewMediaId(item.id)}>
                {item.status === 'PROCESSING' ? (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 bg-muted/60 text-muted-foreground p-2 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-[10px] font-medium text-foreground">Converting WebP...</span>
                  </div>
                ) : item.status === 'FAILED' ? (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-destructive bg-destructive/5 p-2 text-center">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Failed</span>
                  </div>
                ) : item.thumbnailUrl || item.displayUrl ? (
                  <img
                    src={item.thumbnailUrl || item.displayUrl!}
                    alt={item.originalName}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge
                    variant={item.status === 'READY' ? 'default' : item.status === 'FAILED' ? 'destructive' : 'secondary'}
                    className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                  >
                    {item.status}
                  </Badge>
                </div>

                {/* File size & Resolution Tag */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-sm">
                  <span>{item.fileSizeFormatted}</span>
                  <span>{item.width && item.height ? `${item.width}x${item.height}` : 'WebP'}</span>
                </div>
              </div>

              {/* Information & Action buttons */}
              <div className="p-3 space-y-2">
                <div>
                  <div className="text-xs font-semibold text-foreground truncate" title={item.originalName}>
                    {item.originalName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate" title={item.uploader?.email}>
                    {item.uploader?.email || 'System Upload'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.scope}
                  </Badge>
                  <span>{item.storageLocation}</span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1 gap-1"
                    onClick={() => setPreviewMediaId(item.id)}
                  >
                    <Eye className="h-3 w-3" />
                    <span>View</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Metadata / Replace Image"
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmMedia(item)}
                    title="Delete and Purge Storage"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View with Column Selection (Responsive horizontal scroll container) */
        <div className="border rounded-lg overflow-x-auto bg-card shadow-xs">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
              <tr>
                {visibleColumns.preview && <th className="p-3">Preview</th>}
                {visibleColumns.name && <th className="p-3">File Name / ID</th>}
                {visibleColumns.uploader && <th className="p-3">Uploader</th>}
                {visibleColumns.size && <th className="p-3">Size & Res</th>}
                {visibleColumns.scope && <th className="p-3">Scope</th>}
                {visibleColumns.status && <th className="p-3">Status</th>}
                {visibleColumns.storage && <th className="p-3">Storage</th>}
                {visibleColumns.date && <th className="p-3">Date</th>}
                {visibleColumns.actions && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {listData.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  {visibleColumns.preview && (
                    <td className="p-3">
                      <div
                        className="h-10 w-10 rounded-md overflow-hidden bg-muted cursor-pointer"
                        onClick={() => setPreviewMediaId(item.id)}
                      >
                        {item.status === 'PROCESSING' ? (
                          <div className="h-full w-full flex items-center justify-center bg-muted/60">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        ) : item.status === 'FAILED' ? (
                          <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        ) : item.thumbnailUrl || item.displayUrl ? (
                          <img
                            src={item.thumbnailUrl || item.displayUrl!}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.name && (
                    <td className="p-3">
                      <div className="font-semibold text-foreground truncate max-w-44">{item.originalName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{item.id}</div>
                    </td>
                  )}
                  {visibleColumns.uploader && (
                    <td className="p-3">
                      <div className="text-foreground">{item.uploader?.email || 'N/A'}</div>
                      <div className="text-[10px] text-muted-foreground">{item.uploader?.phoneNumber || ''}</div>
                    </td>
                  )}
                  {visibleColumns.size && (
                    <td className="p-3">
                      <div className="font-medium text-foreground">{item.fileSizeFormatted}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.width && item.height ? `${item.width} x ${item.height}` : 'WebP Auto'}
                      </div>
                    </td>
                  )}
                  {visibleColumns.scope && (
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {item.scope}
                      </Badge>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="p-3">
                      <Badge
                        variant={item.status === 'READY' ? 'default' : item.status === 'FAILED' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {item.status}
                      </Badge>
                    </td>
                  )}
                  {visibleColumns.storage && (
                    <td className="p-3 text-muted-foreground">{item.storageLocation}</td>
                  )}
                  {visibleColumns.date && (
                    <td className="p-3 text-muted-foreground text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewMediaId(item.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEdit(item)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmMedia(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {listData && listData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <div>
            Showing Page <span className="font-semibold text-foreground">{listData.pagination.page}</span> of{' '}
            <span className="font-semibold text-foreground">{listData.pagination.totalPages}</span> ({listData.pagination.totalItems} total items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={!listData.pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={!listData.pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* 1. Preview & Detail Inspection Modal (Side-by-Side Responsive Layout) */}
      <Dialog
        open={Boolean(previewMediaId)}
        onOpenChange={(open) => !open && setPreviewMediaId(null)}
        className="max-w-4xl lg:max-w-5xl w-full max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold text-foreground">Asset Deep Inspection</DialogTitle>
            {detailData && (
              <Badge variant="outline" className="text-xs font-mono bg-muted/40">
                {detailData.storageLocation}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs">
            Inspect optimized WebP multi-tier variants, uploader details, and physical storage metadata.
          </DialogDescription>
        </DialogHeader>

        {isDetailLoading || !detailData ? (
          <div className="py-16 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <div className="text-xs text-muted-foreground mt-2">Loading asset details...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 text-xs">
            {/* Left Side: Image Preview & Variant Links */}
            <div className="flex flex-col gap-3">
              <div className="relative aspect-4/3 w-full bg-black/95 rounded-xl overflow-hidden flex items-center justify-center border border-border/40 shadow-inner">
                {detailData.status === 'PROCESSING' ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <Sparkles className="h-4 w-4 text-primary absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">Processing WebP Variants...</p>
                      <p className="text-[11px] text-muted-foreground max-w-xs">
                        Generating multi-tier WebP variants (Thumbnail, Card, Medium, Large) via Sharp Libvips and syncing to storage.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] animate-pulse bg-primary/10 text-primary border-primary/20">
                      Auto-refreshing live...
                    </Badge>
                  </div>
                ) : detailData.status === 'FAILED' ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-destructive gap-2">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <p className="text-xs font-semibold">Processing Failed</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      {detailData.errorMessage || 'Sharp failed to process image variants. Check dead-letter queue.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <img
                      src={detailData.largeUrl || detailData.displayUrl || detailData.thumbnailUrl || ''}
                      alt={detailData.originalName}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <a
                      href={detailData.largeUrl || detailData.displayUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black/90 text-white px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 transition backdrop-blur-xs font-medium"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      <span>Full Res</span>
                    </a>
                  </>
                )}
              </div>

              {/* Quick Image Specs Banner */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-semibold text-foreground">
                    {detailData.width && detailData.height ? `${detailData.width} × ${detailData.height} px` : 'Auto WebP'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-semibold text-emerald-600">{detailData.fileSizeFormatted}</span>
                </div>
              </div>

              {/* 4-Tier WebP Variants Pill Links */}
              <div className="bg-muted/20 p-3 rounded-lg border space-y-2">
                <div className="text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>WebP Optimization Tiers</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Direct Media Links</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(detailData.variants || {}).map(([key, url]) => (
                    detailData.status === 'PROCESSING' ? (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-muted/40 border text-muted-foreground opacity-60 cursor-not-allowed"
                      >
                        <span className="capitalize font-medium">{key}</span>
                        <span className="text-[10px] italic">generating...</span>
                      </div>
                    ) : (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-background border hover:border-primary text-foreground transition group"
                      >
                        <span className="capitalize font-medium">{key}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition" />
                      </a>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Metadata & Technical Information */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Media Header */}
                <div>
                  <div className="text-[11px] text-muted-foreground font-mono">{detailData.id}</div>
                  <h3 className="text-base font-bold text-foreground break-all">{detailData.originalName}</h3>
                </div>

                {/* Badges Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      detailData.status === 'READY'
                        ? 'default'
                        : detailData.status === 'FAILED'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs uppercase tracking-wider font-semibold"
                  >
                    {detailData.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {detailData.scope}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
                    {detailData.storageLocation}
                  </Badge>
                </div>

                {/* Technical Attributes Table */}
                <div className="rounded-lg border divide-y text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-muted/10">
                    <span className="text-muted-foreground">MIME Type</span>
                    <span className="font-medium text-foreground">{detailData.mimeType}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Uploader</span>
                    <div className="text-right">
                      <div className="font-medium text-foreground">{detailData.uploader?.email || 'System'}</div>
                      {detailData.uploader?.phoneNumber && (
                        <div className="text-[11px] text-muted-foreground">{detailData.uploader.phoneNumber}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/10">
                    <span className="text-muted-foreground">Attachment State</span>
                    <span className="font-medium text-foreground">
                      {detailData.isAttached
                        ? `Attached (ID: ${detailData.attachedToId || 'N/A'})`
                        : 'Unattached Draft'}
                    </span>
                  </div>
                  {detailData.attachedAd && (
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">Attached Ad</span>
                      <div className="text-right">
                        <div className="font-medium text-foreground truncate max-w-44">{detailData.attachedAd.title}</div>
                        <div className="text-[11px] text-emerald-600 font-semibold">₹{detailData.attachedAd.price}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5 bg-muted/10">
                    <span className="text-muted-foreground">Upload Timestamp</span>
                    <span className="text-foreground">{new Date(detailData.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-muted-foreground block text-[11px] mb-1">Physical Storage URI</span>
                    <div className="font-mono text-[11px] bg-muted/50 p-1.5 rounded-md text-foreground break-all select-all">
                      {detailData.diskPath}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => {
                    setPreviewMediaId(null);
                    handleOpenEdit(detailData);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit / Replace</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs gap-1.5 font-semibold"
                  onClick={() => {
                    setPreviewMediaId(null);
                    setDeleteConfirmMedia(detailData);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge Storage</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMediaId(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 2. Edit & Replacement Modal */}
      <Dialog open={Boolean(editMedia)} onOpenChange={(open) => !open && setEditMedia(null)}>
        <DialogHeader>
          <DialogTitle>Edit Media & Replace Asset</DialogTitle>
          <DialogDescription className="text-xs">
            Update metadata or upload a new image. When replacing, old files are purged immediately from local disk storage.
          </DialogDescription>
        </DialogHeader>

        {editMedia && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Original File Name</label>
              <Input
                value={editOriginalName}
                onChange={(e) => setEditOriginalName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Entity Scope</label>
              <select
                value={editScope}
                onChange={(e) => setEditScope(e.target.value as MediaEntityScope)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="LISTING">Listing Ad Image (LISTING)</option>
                <option value="USER">User Avatar (USER)</option>
                <option value="CATEGORY">Category Icon / Banner (CATEGORY)</option>
                <option value="BANNER">Platform Banner (BANNER)</option>
                <option value="CHAT">Chat Attachment (CHAT)</option>
                <option value="SYSTEM">System Asset (SYSTEM)</option>
                <option value="UNATTACHED">Unattached / Draft (UNATTACHED)</option>
              </select>
            </div>

            {/* Replacement Upload Box */}
            <div className="border border-dashed rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Replace Physical Image (Optional)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Select a new JPG, PNG, or WebP image (max 10MB, up to 5000x5000px).
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                className="text-xs h-8"
              />
              {replacementFile && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-500/10 p-2 rounded text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Warning: Old physical variants on disk will be permanently deleted upon saving.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setEditMedia(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveEdit}
            disabled={updateMutation.isPending || replaceMutation.isPending}
            className="font-semibold"
          >
            {updateMutation.isPending || replaceMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirmMedia)} onOpenChange={(open) => !open && setDeleteConfirmMedia(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            <span>Confirm Permanent Storage Deletion</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            This action deletes the database record AND purges all 4 WebP variants from disk to reclaim space.
          </DialogDescription>
        </DialogHeader>

        {deleteConfirmMedia && (
          <div className="py-2 text-xs space-y-2">
            <div className="p-3 border rounded-lg bg-muted/30 space-y-1 font-mono text-[11px]">
              <div><span className="text-muted-foreground font-sans">File:</span> {deleteConfirmMedia.originalName}</div>
              <div><span className="text-muted-foreground font-sans">Storage Path:</span> {deleteConfirmMedia.diskPath}</div>
              <div><span className="text-muted-foreground font-sans">Reclaimed Space:</span> <span className="text-emerald-600 font-bold">{deleteConfirmMedia.fileSizeFormatted}</span></div>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Once purged, this image cannot be restored and any attached listing will lose this photo.
            </p>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmMedia(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
            className="font-semibold"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete & Purge Storage'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 4. Cleanup Orphans Confirmation Dialog */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Clean Up Orphaned Media</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Purge unattached and abandoned media files from database and local disk volume.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 text-xs space-y-3">
          <p className="text-muted-foreground">
            This routine identifies draft uploads that were never attached to an active ad listing or category and permanently deletes both their database records and physical files on storage.
          </p>
          <div className="p-3 border rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200">
            Currently detected unattached files:{' '}
            <span className="font-bold">{overview?.orphanedMedia.count || 0}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-foreground">Reclamation Scope</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCleanupHours(0)}
                className={`p-2 rounded border text-left transition ${
                  cleanupHours === 0
                    ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-100 font-semibold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="text-[11px] font-bold">All Unattached</div>
                <div className="text-[10px] opacity-80">Immediate (0h)</div>
              </button>
              <button
                type="button"
                onClick={() => setCleanupHours(1)}
                className={`p-2 rounded border text-left transition ${
                  cleanupHours === 1
                    ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-100 font-semibold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="text-[11px] font-bold">&gt; 1 Hour Old</div>
                <div className="text-[10px] opacity-80">Safe draft grace</div>
              </button>
              <button
                type="button"
                onClick={() => setCleanupHours(24)}
                className={`p-2 rounded border text-left transition ${
                  cleanupHours === 24
                    ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-100 font-semibold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="text-[11px] font-bold">&gt; 24 Hours Old</div>
                <div className="text-[10px] opacity-80">Legacy uploads</div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setShowCleanupDialog(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleRunCleanup}
            disabled={cleanupMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            {cleanupMutation.isPending ? 'Reclaiming Storage...' : 'Start Reclamation'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
