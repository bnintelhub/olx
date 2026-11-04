import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Image,
  Megaphone,
  FolderTree,
  Sparkles,
  Plus,
  Eye,
  MousePointerClick,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BannerItem {
  id: string;
  name: string;
  slot: string;
  views: string;
  clicks: string;
  ctr: string;
  status: 'ACTIVE' | 'PAUSED';
}

const INITIAL_BANNERS: BannerItem[] = [
  { id: 'b_1', name: 'Diwali Electronics Mega Sale', slot: 'Home Top Banner', views: '2.4M', clicks: '142K', ctr: '5.9%', status: 'ACTIVE' },
  { id: 'b_2', name: 'Certified Pre-Owned Cars Festival', slot: 'Vehicles Category Header', views: '980K', clicks: '68K', ctr: '6.9%', status: 'ACTIVE' },
  { id: 'b_3', name: 'Verified Business Seller Program', slot: 'Side Rails & Search', views: '1.1M', clicks: '44K', ctr: '4.0%', status: 'ACTIVE' },
  { id: 'b_4', name: 'Zero Brokerage Homes Campaign', slot: 'Real Estate Header', views: '720K', clicks: '51K', ctr: '7.1%', status: 'ACTIVE' },
];

export function ContentManagerDashboard() {
  const [banners, setBanners] = useState<BannerItem[]>(INITIAL_BANNERS);

  const toggleBanner = (id: string, name: string) => {
    setBanners((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const next = b.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          toast.success(`Banner "${name}" set to ${next}`);
          return { ...b, status: next };
        }
        return b;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Content & CMS Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage banners, featured collections, taxonomy categories, and platform announcements.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </Button>
      </div>

      {/* 4 Content KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Hero Banners</span>
            <Image className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12 Active</div>
            <p className="text-[11px] text-muted-foreground mt-1">4 scheduled for weekend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Announcements</span>
            <Megaphone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">5 Published</div>
            <p className="text-[11px] text-muted-foreground mt-1">Platform-wide broadcasts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Categories</span>
            <FolderTree className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">36 Categories</div>
            <p className="text-[11px] text-muted-foreground mt-1">214 Subcategories active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Featured Collections</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8 Live</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">+14.2% engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Banners & Promotions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Marketing Banners & Campaigns</CardTitle>
            <p className="text-xs text-muted-foreground">Monitor impression delivery and click-through performance.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Live Impressions Counter
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-5 py-3">Slot Placement</th>
                  <th className="px-5 py-3">Impressions</th>
                  <th className="px-5 py-3">Clicks</th>
                  <th className="px-5 py-3">CTR</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-3 font-bold text-foreground">{b.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.slot}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{b.views}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{b.clicks}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{b.ctr}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {b.status === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleBanner(b.id, b.name)}
                        className="h-7 text-xs"
                      >
                        {b.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
