import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Eye,
  MousePointer,
  Percent,
  Calendar,
  Sparkles,
  Upload,
  FileVideo,
  ImageIcon,
  Loader2,
  X,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface BannerData {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  targetUrl?: string | null;
  position: string;
  mediaType: 'IMAGE' | 'VIDEO';
  desktopMediaUrl?: string | null;
  mobileMediaUrl?: string | null;
  locationText?: string | null;
  categoryText?: string | null;
  priority: number;
  status: string;
  computedStatus: 'ACTIVE' | 'SCHEDULED' | 'PAUSED' | 'EXPIRED' | string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export function PromotionsPage() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerData | null>(null);

  // Direct upload states
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    ctaText: 'Explore Deals',
    targetUrl: '/search',
    position: 'HOME_HERO',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    desktopMediaUrl: '',
    mobileMediaUrl: '',
    locationText: '',
    categoryText: '',
    priority: 10,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/banners/admin');
      if (res.data?.success) {
        setBanners(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setForm({
      title: '',
      subtitle: '',
      ctaText: 'Explore Now',
      targetUrl: '/search',
      position: 'HOME_HERO',
      mediaType: 'IMAGE',
      desktopMediaUrl: '',
      mobileMediaUrl: '',
      locationText: '',
      categoryText: '',
      priority: 10,
      startsAt: new Date().toISOString().slice(0, 16),
      endsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (banner: BannerData) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      ctaText: banner.ctaText || 'Explore Deals',
      targetUrl: banner.targetUrl || '',
      position: banner.position || 'HOME_HERO',
      mediaType: banner.mediaType || 'IMAGE',
      desktopMediaUrl: banner.desktopMediaUrl || '',
      mobileMediaUrl: banner.mobileMediaUrl || '',
      locationText: banner.locationText || '',
      categoryText: banner.categoryText || '',
      priority: banner.priority || 0,
      startsAt: new Date(banner.startsAt).toISOString().slice(0, 16),
      endsAt: new Date(banner.endsAt).toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  };

  /**
   * Direct media file upload with strict 10MB image / 50MB video validation
   */
  const handleFileUpload = async (file: File, target: 'desktop' | 'mobile') => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Only images (JPEG, PNG, WebP) or videos (MP4, WebM) are allowed.');
      return;
    }

    // 50MB video limit & 10MB image limit
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`${isVideo ? 'Video' : 'Image'} exceeds maximum size limit of ${isVideo ? '50MB' : '10MB'}.`);
      return;
    }

    const setUploading = target === 'desktop' ? setUploadingDesktop : setUploadingMobile;
    try {
      setUploading(true);
      const data = new FormData();
      data.append('file', file);

      const res = await apiClient.post('/banners/admin/upload', data);
      if (res.data?.success) {
        const uploadedUrl = res.data.url;
        const uploadedType = res.data.mediaType;

        setForm((prev) => ({
          ...prev,
          mediaType: target === 'desktop' ? uploadedType : prev.mediaType,
          [target === 'desktop' ? 'desktopMediaUrl' : 'mobileMediaUrl']: uploadedUrl,
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.desktopMediaUrl) {
      alert('Please upload a desktop media creative (Image or Video) for the banner.');
      return;
    }

    try {
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };

      if (editingBanner) {
        await apiClient.put(`/banners/admin/${editingBanner.id}`, payload);
      } else {
        await apiClient.post('/banners/admin', payload);
      }
      setDialogOpen(false);
      fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save banner');
    }
  };

  const handleToggleStatus = async (banner: BannerData) => {
    try {
      const nextStatus = banner.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await apiClient.patch(`/banners/admin/${banner.id}/status`, { status: nextStatus });
      fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await apiClient.delete(`/banners/admin/${id}`);
      fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete banner');
    }
  };

  // Performance calculations
  const totalImpressions = banners.reduce((acc, b) => acc + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((acc, b) => acc + (b.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const activeCount = banners.filter((b) => b.computedStatus === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <span>Promotions & Banners</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Directly upload banner creatives (up to 50MB video & 10MB image) with click & view tracking.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-1.5 font-bold cursor-pointer">
          <Plus className="h-4 w-4" />
          <span>New Banner</span>
        </Button>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Campaigns</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{activeCount} / {banners.length}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Views</span>
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{totalImpressions.toLocaleString()}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Clicks</span>
            <MousePointer className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{totalClicks.toLocaleString()}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average CTR</span>
            <Percent className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-600">{avgCtr}%</div>
        </Card>
      </div>

      {/* Banners Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
            Loading promotional banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl bg-card">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-foreground">No banners created yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your first promotional image (max 10MB) or video (max 50MB) for the homepage hero.
            </p>
            <Button onClick={handleOpenCreate} size="sm" className="mt-4">
              Create Banner
            </Button>
          </div>
        ) : (
          banners.map((banner) => {
            const isVideo = banner.mediaType === 'VIDEO';
            const statusVariant =
              banner.computedStatus === 'ACTIVE'
                ? 'success'
                : banner.computedStatus === 'SCHEDULED'
                ? 'secondary'
                : banner.computedStatus === 'PAUSED'
                ? 'outline'
                : 'destructive';

            return (
              <Card key={banner.id} className="overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Creative Preview */}
                  <div className="relative aspect-[16/9] bg-muted overflow-hidden border-b">
                    {banner.desktopMediaUrl ? (
                      isVideo ? (
                        <video
                          src={banner.desktopMediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <img
                          src={banner.desktopMediaUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No Creative Media Uploaded
                      </div>
                    )}
                    <Badge variant={statusVariant as any} className="absolute top-2.5 left-2.5 shadow-sm">
                      {banner.computedStatus}
                    </Badge>
                    <span className="absolute top-2.5 right-2.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs flex items-center gap-1">
                      {isVideo ? <FileVideo className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                      <span>{banner.mediaType}</span>
                    </span>
                  </div>

                  {/* Details */}
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-base text-foreground line-clamp-1">
                        {banner.title}
                      </h4>
                      <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                        Priority: {banner.priority}
                      </span>
                    </div>

                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-muted-foreground">
                      {banner.categoryText && (
                        <span className="bg-muted px-2 py-0.5 rounded">
                          Category: {banner.categoryText}
                        </span>
                      )}
                      {banner.locationText && (
                        <span className="bg-muted px-2 py-0.5 rounded">
                          Location: {banner.locationText}
                        </span>
                      )}
                    </div>

                    {/* Schedule */}
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>
                        {new Date(banner.startsAt).toLocaleDateString()} -{' '}
                        {new Date(banner.endsAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-2 bg-muted/40 p-2 rounded-lg text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Views</div>
                        <div className="text-xs font-bold">{banner.impressions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Clicks</div>
                        <div className="text-xs font-bold">{banner.clicks}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">CTR</div>
                        <div className="text-xs font-bold text-emerald-600">{banner.ctr}%</div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions */}
                <div className="p-3 border-t bg-muted/10 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(banner)}
                    className="h-8 flex-1 text-xs gap-1"
                  >
                    {banner.status === 'ACTIVE' ? (
                      <>
                        <Pause className="h-3 w-3 text-amber-500" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 text-emerald-500" />
                        <span>Resume</span>
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(banner)}
                    className="h-8 px-2.5 text-xs"
                    title="Edit banner"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(banner.id)}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                    title="Delete banner"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create Promotional Banner'}</DialogTitle>
          <DialogDescription>
            Upload direct image (max 10MB) or video (max 50MB) and configure banner scheduling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-3 max-h-[75vh] overflow-y-auto pr-1">
          {/* Direct Desktop Media Upload */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Desktop Creative (Max 50MB Video / 10MB Image) *</span>
              </label>
              {form.desktopMediaUrl && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, desktopMediaUrl: '' }))}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </div>

            {form.desktopMediaUrl ? (
              <div className="relative aspect-[21/9] rounded-lg overflow-hidden border bg-black/50">
                {form.mediaType === 'VIDEO' ? (
                  <video
                    src={form.desktopMediaUrl}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={form.desktopMediaUrl}
                    alt="Desktop preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[10px] text-white font-semibold">
                  {form.mediaType}
                </span>
              </div>
            ) : (
              <div
                onClick={() => desktopInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <input
                  ref={desktopInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 'desktop');
                  }}
                />
                {uploadingDesktop ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading media...</span>
                  </div>
                ) : (
                  <>
                    <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Click to choose or drag & drop Image or Video
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      PNG, JPG, WebP (up to 10MB) or MP4, WebM (up to 50MB)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Optional Mobile Media Upload */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Upload className="h-3 w-3" />
                <span>Mobile Creative (Optional override for mobile view)</span>
              </label>
              {form.mobileMediaUrl && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mobileMediaUrl: '' }))}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </div>

            {form.mobileMediaUrl ? (
              <div className="relative aspect-[16/9] max-w-[200px] rounded-lg overflow-hidden border bg-black/50">
                <img
                  src={form.mobileMediaUrl}
                  alt="Mobile preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                onClick={() => mobileInputRef.current?.click()}
                className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  ref={mobileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 'mobile');
                  }}
                />
                {uploadingMobile ? (
                  <span className="text-xs text-primary flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Upload mobile-optimized creative (Optional)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Title *</label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Festival Mega Clearance"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">CTA Button Text</label>
              <Input
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                placeholder="e.g. Explore Deals"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Subtitle / Tagline</label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Flat 40% OFF on certified pre-owned electronics"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Priority (0 - 100)</label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Target URL</label>
              <Input
                value={form.targetUrl}
                onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                placeholder="/search?category=cars"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Target Category Label</label>
              <Input
                value={form.categoryText}
                onChange={(e) => setForm({ ...form, categoryText: e.target.value })}
                placeholder="e.g. Electronics, Cars"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Target Location Label</label>
              <Input
                value={form.locationText}
                onChange={(e) => setForm({ ...form, locationText: e.target.value })}
                placeholder="e.g. Mumbai, All India"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Start Date & Time *</label>
              <Input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">End Date & Time *</label>
              <Input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
