import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
import { formatCurrency } from '../../lib/utils';
import {
  Check,
  X,
  Search,
  Eye,
  Sparkles,
  MapPin,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdRecord {
  id: string;
  title: string;
  price: number;
  category: string;
  sellerName: string;
  sellerType: 'VERIFIED_DEALER' | 'INDIVIDUAL_SELLER' | 'BUSINESS';
  city: string;
  views: number;
  leads: number;
  imageUrl: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD';
  date: string;
  isFeatured?: boolean;
}

const INITIAL_ADS: AdRecord[] = [
  {
    id: 'ad_101',
    title: 'iPhone 15 Pro Max 256GB - Desert Titanium (Battery 100%)',
    price: 92000,
    category: 'Mobiles',
    sellerName: 'Rahul Sharma',
    sellerType: 'VERIFIED_DEALER',
    city: 'Connaught Place, Delhi',
    views: 1840,
    leads: 34,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    date: 'Today, 10:15 AM',
    isFeatured: true,
  },
  {
    id: 'ad_102',
    title: 'Hyundai Creta SX (O) Diesel Automatic 2023 Single Owner',
    price: 1650000,
    category: 'Vehicles',
    sellerName: 'Bharat Motors',
    sellerType: 'VERIFIED_DEALER',
    city: 'Golf Course Road, Gurugram',
    views: 3420,
    leads: 89,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=100&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    date: 'Yesterday, 4:20 PM',
    isFeatured: true,
  },
  {
    id: 'ad_103',
    title: 'Sony PlayStation 5 Disc Edition + 2 DualSense Controllers',
    price: 38000,
    category: 'Electronics',
    sellerName: 'Amit Verma',
    sellerType: 'INDIVIDUAL_SELLER',
    city: 'Indiranagar, Bengaluru',
    views: 740,
    leads: 18,
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&auto=format&fit=crop&q=60',
    status: 'PENDING',
    date: '2h ago',
  },
  {
    id: 'ad_104',
    title: 'Luxury 3 BHK Flat in Prestige Whitefield with Balcony Garden',
    price: 12500000,
    category: 'Real Estate',
    sellerName: 'Apex Realty Network',
    sellerType: 'BUSINESS',
    city: 'Whitefield, Bengaluru',
    views: 4890,
    leads: 124,
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    date: 'Oct 30, 2026',
    isFeatured: true,
  },
  {
    id: 'ad_105',
    title: 'Royal Enfield Classic 350 Gunmetal Grey - Stealth Black',
    price: 1450000,
    category: 'Vehicles',
    sellerName: 'Kunal Joshi',
    sellerType: 'INDIVIDUAL_SELLER',
    city: 'Andheri West, Mumbai',
    views: 1250,
    leads: 28,
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=100&auto=format&fit=crop&q=60',
    status: 'PENDING',
    date: '45m ago',
  },
  {
    id: 'ad_106',
    title: 'Guaranteed 200% Profit Crypto Investment WhatsApp Group',
    price: 100,
    category: 'Services',
    sellerName: 'Spam Actor 44',
    sellerType: 'INDIVIDUAL_SELLER',
    city: 'Unknown',
    views: 45,
    leads: 0,
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=100&auto=format&fit=crop&q=60',
    status: 'REJECTED',
    date: 'Oct 28, 2026',
  },
  {
    id: 'ad_107',
    title: 'Apple MacBook Pro 16-inch M3 Max 36GB Unified Memory',
    price: 245000,
    category: 'Electronics',
    sellerName: 'TechHub Store',
    sellerType: 'BUSINESS',
    city: 'Salt Lake, Kolkata',
    views: 2190,
    leads: 48,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&auto=format&fit=crop&q=60',
    status: 'SOLD',
    date: 'Oct 26, 2026',
  },
];

export function ListingsPage() {
  const [ads, setAds] = useState<AdRecord[]>(INITIAL_ADS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = ads.filter((ad) => {
    const matchesSearch =
      ad.title.toLowerCase().includes(search.toLowerCase()) ||
      ad.sellerName.toLowerCase().includes(search.toLowerCase()) ||
      ad.city.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || ad.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || ad.status === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const updateStatus = (id: string, newStatus: AdRecord['status']) => {
    setAds((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          toast.success(`Listing "${a.title}" marked as ${newStatus}`);
          return { ...a, status: newStatus };
        }
        return a;
      })
    );
  };

  const getStatusBadge = (status: AdRecord['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </span>
        );
      case 'PENDING':
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Classified Listings & Moderation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor and moderate 8,92,410 active marketplace advertisements, vehicles, properties, and consumer electronics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => toast.success('Exporting active inventory catalog...')}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export Catalog</span>
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
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['ALL', 'Mobiles', 'Vehicles', 'Electronics', 'Real Estate', 'Services'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
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
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
              {['ALL', 'ACTIVE', 'PENDING', 'REJECTED', 'SOLD'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground font-mono">
              Showing {filtered.length} of {ads.length} listings
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
                  <TableHead className="px-4 py-3 min-w-[160px]">Seller & Location</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px] text-center">Performance</TableHead>
                  <TableHead className="px-4 py-3 min-w-[120px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[110px]">Submitted</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[130px]">Moderation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No advertisements match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ad) => (
                    <TableRow key={ad.id} className="transition-colors hover:bg-muted/30">
                      {/* Ad Details with Thumbnail */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 rounded-lg border bg-muted overflow-hidden shrink-0">
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="h-full w-full object-cover"
                            />
                            {ad.isFeatured && (
                              <span className="absolute top-0.5 right-0.5 rounded-full bg-amber-500 p-0.5 text-[8px] text-white">
                                <Sparkles className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-foreground line-clamp-1">
                              {ad.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                              <span>ID: #{ad.id}</span>
                              {ad.isFeatured && (
                                <span className="font-sans font-bold text-amber-600 dark:text-amber-400">
                                  • Featured Boost
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {ad.category}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="px-4 py-3 text-right font-black text-xs text-foreground">
                        {formatCurrency(ad.price)}
                      </TableCell>

                      {/* Seller & Location */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <span className="truncate">{ad.sellerName}</span>
                          {ad.sellerType === 'VERIFIED_DEALER' && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{ad.city}</span>
                        </div>
                      </TableCell>

                      {/* Performance */}
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <span className="font-semibold text-foreground">{ad.views.toLocaleString('en-IN')} views</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-bold text-emerald-600">{ad.leads} leads</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 text-center">
                        {getStatusBadge(ad.status)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {ad.date}
                      </TableCell>

                      {/* Moderation Actions */}
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ad.status === 'PENDING' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateStatus(ad.id, 'ACTIVE')}
                                className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                              >
                                <Check className="h-3 w-3" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus(ad.id, 'REJECTED')}
                                className="h-7 px-2 text-xs gap-1"
                              >
                                <X className="h-3 w-3" />
                                <span>Reject</span>
                              </Button>
                            </>
                          ) : ad.status === 'ACTIVE' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(ad.id, 'REJECTED')}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                            >
                              Take Down
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(ad.id, 'ACTIVE')}
                              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                            >
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{filtered.length}</strong> of{' '}
              <strong className="text-foreground">8,92,410</strong> listings
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground shadow-2xs font-mono">
                {page} / 1,11,551
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
