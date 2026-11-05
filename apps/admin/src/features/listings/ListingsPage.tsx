import { useState } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
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
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Check,
  X,
  Search,
  Eye,
  MapPin,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RotateCw,
  Trash2,
  AlertTriangle,
  Phone,
  Mail,
  User,
  Tag,
  ShieldCheck,
  ImageIcon,
} from 'lucide-react';
import { useAdminListings } from './hook/useListingsQuery';
import { useUpdateAdStatusMutation, useDeleteAdMutation } from './hook/useListingsMutation';
import { AdItem, AdStatus } from './service/listings.service';

const POPULAR_CATEGORIES = [
  'ALL',
  'Cars',
  'Mobiles',
  'Properties',
  'Electronics',
  'Bikes',
  'Commercial Vehicles',
  'Furniture',
];

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Expired', value: 'EXPIRED' },
];

export function ListingsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Ad for Detail Inspection Modal
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [activeModalImageIdx, setActiveModalImageIdx] = useState(0);

  // Rejection Dialog State
  const [rejectingAd, setRejectingAd] = useState<AdItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Delete Confirmation State
  const [deletingAd, setDeletingAd] = useState<AdItem | null>(null);

  // Queries & Mutations
  const { data, isLoading, isFetching, refetch } = useAdminListings({
    page,
    limit: pageSize,
    status: statusFilter,
    category: categoryFilter,
    q: search,
  });

  const updateStatusMutation = useUpdateAdStatusMutation();
  const deleteMutation = useDeleteAdMutation();

  const ads = data?.ads || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 };

  const handleStatusChange = (ad: AdItem, newStatus: AdStatus, reason?: string) => {
    updateStatusMutation.mutate(
      { id: ad.id, status: newStatus, rejectionReason: reason },
      {
        onSuccess: (updated) => {
          if (selectedAd?.id === ad.id) {
            setSelectedAd((prev) => (prev ? { ...prev, status: newStatus, rejectionReason: reason || null } : null));
          }
          setRejectingAd(null);
          setRejectionReason('');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingAd) return;
    deleteMutation.mutate(deletingAd.id, {
      onSuccess: () => {
        if (selectedAd?.id === deletingAd.id) {
          setSelectedAd(null);
        }
        setDeletingAd(null);
      },
    });
  };

  const getStatusBadge = (status: AdStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Pending Review</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Rejected</span>
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Sold</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Classified Listings & Moderation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor, inspect, approve, and moderate live classified marketplace advertisements in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs cursor-pointer"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search listings by title, seller, city..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Status Filter */}
          <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    statusFilter === s.value
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground font-mono">
              Total Found: <strong className="text-foreground">{pagination.total.toLocaleString('en-IN')}</strong> items
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3 min-w-[260px]">Advertisement Details</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Category</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px] text-right">Asking Price</TableHead>
                  <TableHead className="px-4 py-3 min-w-[170px]">Seller & Location</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px] text-center">Performance</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px]">Submitted</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[150px]">Moderation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading classified listings from server...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : ads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Tag className="h-8 w-8 text-muted-foreground/40" />
                        <span className="font-medium text-foreground">No advertisements match the selected filters.</span>
                        <span className="text-[11px]">Try modifying your search keywords or switching category/status tabs.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ads.map((ad) => {
                    const coverImage = ad.images?.find((img) => img.isCover) || ad.images?.[0];
                    const thumbnailUrl = coverImage?.thumbnailUrl || coverImage?.displayUrl || coverImage?.originalUrl;

                    return (
                      <TableRow key={ad.id} className="transition-colors hover:bg-muted/30">
                        {/* Ad Details with Thumbnail */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={ad.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-xs text-foreground line-clamp-1 hover:underline cursor-pointer"
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setActiveModalImageIdx(0);
                                }}
                                title={ad.title}
                              >
                                {ad.title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                                <span>ID: #{ad.id.slice(0, 8)}</span>
                                {ad.isNegotiable && (
                                  <span className="font-sans text-[9px] px-1 py-0.2 bg-muted rounded text-muted-foreground">
                                    Negotiable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {ad.category?.name || 'Uncategorized'}
                          </Badge>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="px-4 py-3 text-right font-black text-xs text-foreground">
                          {formatCurrency(Number(ad.price))}
                        </TableCell>

                        {/* Seller & Location */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <span className="truncate">{ad.user?.profile?.name || ad.user?.phoneNumber || 'User'}</span>
                            {(ad.user?.profile?.isIdentityVerified || ad.user?.profile?.isVerified) && (
                              <span title="Verified Seller">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{ad.location?.name || 'India'}</span>
                          </div>
                        </TableCell>

                        {/* Performance */}
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <span className="font-semibold text-foreground">{ad.viewCount || 0} views</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-bold text-emerald-600">{ad.chatCount || 0} chats</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-4 py-3 text-center">
                          {getStatusBadge(ad.status)}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {formatDate(ad.createdAt)}
                        </TableCell>

                        {/* Moderation Actions */}
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Inspect Details"
                              onClick={() => {
                                setSelectedAd(ad);
                                setActiveModalImageIdx(0);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {ad.status === 'PENDING_REVIEW' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(ad, 'ACTIVE')}
                                  disabled={updateStatusMutation.isPending}
                                  className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer"
                                  title="Approve Listing"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Approve</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingAd(ad)}
                                  disabled={updateStatusMutation.isPending}
                                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                                  title="Reject Listing"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Reject</span>
                                </Button>
                              </>
                            ) : ad.status === 'ACTIVE' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingAd(ad)}
                                disabled={updateStatusMutation.isPending}
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 cursor-pointer"
                              >
                                Take Down
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(ad, 'ACTIVE')}
                                disabled={updateStatusMutation.isPending}
                                className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              >
                                Reinstate
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Listing"
                              onClick={() => setDeletingAd(ad)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing{' '}
              <strong className="text-foreground">
                {pagination.total > 0 ? (page - 1) * pageSize + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong className="text-foreground">
                {Math.min(page * pageSize, pagination.total)}
              </strong>{' '}
              of <strong className="text-foreground">{pagination.total.toLocaleString('en-IN')}</strong> listings
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground shadow-2xs font-mono">
                {page} / {Math.max(1, pagination.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Deep Inspection Modal */}
      <Dialog
        open={Boolean(selectedAd)}
        onOpenChange={(open) => !open && setSelectedAd(null)}
        className="max-w-4xl w-full max-h-[92vh] overflow-y-auto"
      >
        {selectedAd && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-base font-bold text-foreground">
                  Listing Moderation Review
                </DialogTitle>
                {getStatusBadge(selectedAd.status)}
              </div>
              <DialogDescription className="text-xs font-mono text-muted-foreground">
                ID: {selectedAd.id} • Slug: {selectedAd.slug}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Image Gallery */}
              <div className="space-y-3">
                <div className="relative aspect-4/3 w-full bg-black/90 rounded-xl overflow-hidden flex items-center justify-center border shadow-inner">
                  {selectedAd.images && selectedAd.images.length > 0 ? (
                    <img
                      src={
                        selectedAd.images[activeModalImageIdx]?.displayUrl ||
                        selectedAd.images[activeModalImageIdx]?.originalUrl ||
                        ''
                      }
                      alt={selectedAd.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                      <ImageIcon className="h-8 w-8 opacity-40" />
                      <span>No images attached</span>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {selectedAd.images && selectedAd.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {selectedAd.images.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveModalImageIdx(idx)}
                        className={`relative h-14 w-14 rounded-md overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                          activeModalImageIdx === idx ? 'border-primary ring-2 ring-primary/20' : 'border-border/60 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img.thumbnailUrl || img.displayUrl} alt="variant" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Performance Banner */}
                <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border text-center text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px]">Total Views</div>
                    <div className="font-bold text-foreground">{selectedAd.viewCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Chat Leads</div>
                    <div className="font-bold text-emerald-600">{selectedAd.chatCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Favourites</div>
                    <div className="font-bold text-foreground">{selectedAd.favouriteCount}</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Listing Details & Seller */}
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedAd.title}</h3>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    {formatCurrency(Number(selectedAd.price))}
                    {selectedAd.isNegotiable && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">(Negotiable)</span>
                    )}
                  </div>
                </div>

                {/* Category & Location */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-muted/20 border rounded-lg">
                    <div className="text-[10px] text-muted-foreground">Category</div>
                    <div className="font-semibold text-foreground mt-0.5">{selectedAd.category?.name || 'N/A'}</div>
                  </div>
                  <div className="p-2.5 bg-muted/20 border rounded-lg">
                    <div className="text-[10px] text-muted-foreground">Location</div>
                    <div className="font-semibold text-foreground mt-0.5">{selectedAd.location?.name || 'N/A'}</div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 bg-muted/20 border rounded-lg space-y-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto pr-1">
                    {selectedAd.description}
                  </p>
                </div>

                {/* Seller Profile Card */}
                <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Seller Information</span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {selectedAd.user?.role || 'USER'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <span>{selectedAd.user?.profile?.name || 'Anonymous User'}</span>
                        {(selectedAd.user?.profile?.isIdentityVerified || selectedAd.user?.profile?.isVerified) && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                        {selectedAd.user?.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedAd.user.phoneNumber}
                          </span>
                        )}
                        {selectedAd.user?.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {selectedAd.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamps & Rejection Reason */}
                {selectedAd.rejectionReason && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-700 dark:text-rose-400">
                    <div className="text-[10px] font-bold uppercase">Rejection Reason:</div>
                    <div className="text-xs mt-0.5">{selectedAd.rejectionReason}</div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {selectedAd.status !== 'ACTIVE' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 cursor-pointer"
                      onClick={() => handleStatusChange(selectedAd, 'ACTIVE')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      <span>Approve / Reinstate</span>
                    </Button>
                  )}
                  {selectedAd.status !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 cursor-pointer"
                      onClick={() => setRejectingAd(selectedAd)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      <span>Reject / Take Down</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => setDeletingAd(selectedAd)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* 2. Rejection Reason Modal */}
      <Dialog
        open={Boolean(rejectingAd)}
        onOpenChange={(open) => !open && setRejectingAd(null)}
        className="max-w-md w-full"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span>Reject / Take Down Advertisement</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Provide a clear justification to inform the seller why this advertisement is taken down.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="font-semibold text-foreground truncate">
            {rejectingAd?.title}
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Select or type rejection reason:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Prohibited item / policy violation',
                'Misleading price / spam listing',
                'Inappropriate / copyrighted image',
                'Duplicate advertisement',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`px-2 py-1 text-[10px] rounded border transition cursor-pointer ${
                    rejectionReason === reason
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-muted/30 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              placeholder="e.g. Violates marketplace electronics policy..."
              className="text-xs h-9 bg-muted/20"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs cursor-pointer"
            onClick={() => {
              setRejectingAd(null);
              setRejectionReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs cursor-pointer"
            disabled={updateStatusMutation.isPending}
            onClick={() => {
              if (rejectingAd) {
                handleStatusChange(rejectingAd, 'REJECTED', rejectionReason);
              }
            }}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingAd)}
        onOpenChange={(open) => !open && setDeletingAd(null)}
        className="max-w-sm w-full"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" />
            <span>Delete Listing</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to delete listing &quot;{deletingAd?.title}&quot;? This action will remove it from the catalog.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3">
          <Button
            size="sm"
            variant="outline"
            className="text-xs cursor-pointer"
            onClick={() => setDeletingAd(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs cursor-pointer"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
