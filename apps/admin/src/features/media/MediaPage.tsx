import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  HardDrive,
  FileCheck2,
  Layers,
  ZoomIn,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface MediaAsset {
  id: string;
  name: string;
  category: 'VEHICLES' | 'ELECTRONICS' | 'REAL_ESTATE' | 'KYC_DOCS';
  url: string;
  size: string;
  resolution: string;
  uploadDate: string;
  uploader: string;
  listingId: string;
  status: 'Clean' | 'Flagged' | 'Under Review';
  aiConfidence: number;
}

const INITIAL_MEDIA: MediaAsset[] = [
  {
    id: 'med_1',
    name: 'creta_front_angle.jpg',
    category: 'VEHICLES',
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
    size: '2.4 MB',
    resolution: '2400 x 1600',
    uploadDate: '2026-03-02',
    uploader: 'Vikram Motors',
    listingId: 'LST-88291',
    status: 'Clean',
    aiConfidence: 99.4,
  },
  {
    id: 'med_2',
    name: 'iphone15_box_imei.jpg',
    category: 'ELECTRONICS',
    url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    size: '1.8 MB',
    resolution: '1920 x 1440',
    uploadDate: '2026-03-01',
    uploader: 'Priya Verma',
    listingId: 'LST-90142',
    status: 'Clean',
    aiConfidence: 98.7,
  },
  {
    id: 'med_3',
    name: 'flat_hall_balcony.png',
    category: 'REAL_ESTATE',
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
    size: '4.2 MB',
    resolution: '3200 x 2133',
    uploadDate: '2026-03-01',
    uploader: 'Sharma Real Estate',
    listingId: 'LST-77402',
    status: 'Clean',
    aiConfidence: 99.9,
  },
  {
    id: 'med_4',
    name: 'bike_yamaha_r15.jpg',
    category: 'VEHICLES',
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
    size: '3.1 MB',
    resolution: '2560 x 1700',
    uploadDate: '2026-02-28',
    uploader: 'Rohit Deshmukh',
    listingId: 'LST-66319',
    status: 'Clean',
    aiConfidence: 99.1,
  },
  {
    id: 'med_5',
    name: 'macbook_pro_m3.jpg',
    category: 'ELECTRONICS',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    size: '2.9 MB',
    resolution: '2880 x 1800',
    uploadDate: '2026-02-28',
    uploader: 'TechHub Store',
    listingId: 'LST-99120',
    status: 'Clean',
    aiConfidence: 97.8,
  },
  {
    id: 'med_6',
    name: 'living_sofa_set.jpg',
    category: 'REAL_ESTATE',
    url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
    size: '3.6 MB',
    resolution: '2400 x 1600',
    uploadDate: '2026-02-27',
    uploader: 'Ankit Patel',
    listingId: 'LST-55210',
    status: 'Clean',
    aiConfidence: 99.5,
  },
  {
    id: 'med_7',
    name: 'canon_eos_lens.jpg',
    category: 'ELECTRONICS',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    size: '2.1 MB',
    resolution: '2048 x 1365',
    uploadDate: '2026-02-26',
    uploader: 'Studio 4K',
    listingId: 'LST-44109',
    status: 'Under Review',
    aiConfidence: 84.2,
  },
  {
    id: 'med_8',
    name: 'scam_ad_duplicate.jpg',
    category: 'ELECTRONICS',
    url: 'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=800&auto=format&fit=crop&q=80',
    size: '1.2 MB',
    resolution: '1280 x 720',
    uploadDate: '2026-02-25',
    uploader: 'Spam Actor 99',
    listingId: 'LST-11002',
    status: 'Flagged',
    aiConfidence: 42.1,
  },
];

export function MediaPage() {
  const [mediaList, setMediaList] = useState<MediaAsset[]>(INITIAL_MEDIA);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const filteredMedia = mediaList.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uploader.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.listingId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (id: string, name: string) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Asset "${name}" removed from storage.`);
    if (previewAsset?.id === id) {
      setPreviewAsset(null);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: MediaAsset['status']) => {
    setMediaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (previewAsset?.id === id) {
      setPreviewAsset((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    toast.success(`Asset updated to: ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Bar */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Media & Asset Review</h2>
          <p className="text-xs text-muted-foreground">
            Inspect uploaded product pictures, KYC documents, and auto-scanned media assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => toast.success('Vision AI batch scanning completed: All assets synchronized.')}
            className="text-xs h-8 gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Run AI Safety Scan</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Media Files</div>
            <div className="text-2xl font-bold text-foreground mt-1">42,890</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">S3 & CDN synchronized</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <ImageIcon className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">AI Scanned Clean</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">41,200</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">96.1% passing safe filters</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Flagged / Quarantined</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">28</div>
            <div className="text-[11px] text-rose-600 font-semibold mt-0.5">Watermark / duplicate alerts</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Storage Consumed</div>
            <div className="text-2xl font-bold text-foreground mt-1">184.2 GB</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">WebP optimized tier</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <HardDrive className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Assets' },
            { id: 'VEHICLES', label: 'Vehicles' },
            { id: 'ELECTRONICS', label: 'Electronics' },
            { id: 'REAL_ESTATE', label: 'Properties' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file or seller..."
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Media Asset Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredMedia.map((item) => (
          <Card key={item.id} className="overflow-hidden group hover:shadow-md transition duration-200 flex flex-col justify-between">
            {/* Image Preview Container */}
            <div className="relative h-44 bg-muted overflow-hidden cursor-pointer" onClick={() => setPreviewAsset(item)}>
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 shadow-md">
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span>Inspect</span>
                </Button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                {item.status === 'Clean' && (
                  <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[10px] gap-1 shadow-sm">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Safe ({item.aiConfidence}%)</span>
                  </Badge>
                )}
                {item.status === 'Under Review' && (
                  <Badge className="bg-amber-600/90 hover:bg-amber-600 text-white text-[10px] gap-1 shadow-sm">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Review ({item.aiConfidence}%)</span>
                  </Badge>
                )}
                {item.status === 'Flagged' && (
                  <Badge className="bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] gap-1 shadow-sm">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Flagged</span>
                  </Badge>
                )}
              </div>

              {/* Resolution Tag */}
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white">
                {item.resolution}
              </div>
            </div>

            {/* Content & Metadata */}
            <CardContent className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-foreground truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-1">
                  <span>Seller: {item.uploader}</span>
                  <span className="font-mono">{item.listingId}</span>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium">{item.size}</span>
                  <span className="text-[10px]">&bull;</span>
                  <span className="text-[10px]">{item.uploadDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewAsset(item)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Quick Preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                    title="Delete Asset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Preview & Moderation Dialog */}
      {previewAsset && (
        <Dialog
          open={!!previewAsset}
          onOpenChange={(open) => !open && setPreviewAsset(null)}
          className="max-w-3xl p-0 overflow-hidden bg-card text-card-foreground"
        >
          <div className="grid md:grid-cols-12 max-h-[80vh]">
            {/* Media Image Showcase */}
            <div className="md:col-span-7 bg-black/95 flex items-center justify-center p-2 relative min-h-[300px]">
              <img
                src={previewAsset.url}
                alt={previewAsset.name}
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>

            {/* Inspector Panel */}
            <div className="md:col-span-5 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <DialogHeader className="p-0 text-left">
                  <DialogTitle className="text-base font-bold truncate text-foreground">
                    {previewAsset.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Associated with Listing ID: <span className="font-mono font-semibold text-foreground">{previewAsset.listingId}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 text-xs border-y py-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seller / Partner:</span>
                    <span className="font-semibold text-foreground">{previewAsset.uploader}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution:</span>
                    <span className="font-mono text-foreground">{previewAsset.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size:</span>
                    <span className="font-mono text-foreground">{previewAsset.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upload Timestamp:</span>
                    <span className="text-foreground">{previewAsset.uploadDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Vision AI Verdict:</span>
                    <Badge
                      variant={previewAsset.status === 'Clean' ? 'success' : 'destructive'}
                      className="text-[10px]"
                    >
                      {previewAsset.status} ({previewAsset.aiConfidence}%)
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Automated Safety Filters
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="rounded bg-muted/60 p-1.5 text-foreground flex items-center justify-between">
                      <span>Adult / NSFW:</span>
                      <span className="text-emerald-600 font-bold">0.1%</span>
                    </span>
                    <span className="rounded bg-muted/60 p-1.5 text-foreground flex items-center justify-between">
                      <span>Violence:</span>
                      <span className="text-emerald-600 font-bold">0.0%</span>
                    </span>
                    <span className="rounded bg-muted/60 p-1.5 text-foreground flex items-center justify-between">
                      <span>Spoof / Fake:</span>
                      <span className="text-emerald-600 font-bold">0.4%</span>
                    </span>
                    <span className="rounded bg-muted/60 p-1.5 text-foreground flex items-center justify-between">
                      <span>Watermarks:</span>
                      <span className="text-emerald-600 font-bold">Clean</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(previewAsset.id, previewAsset.name)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  {previewAsset.status !== 'Clean' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(previewAsset.id, 'Clean')}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  )}
                  {previewAsset.status === 'Clean' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdateStatus(previewAsset.id, 'Flagged')}
                      className="text-xs"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Flag Asset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
