import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Megaphone, Plus, Sparkles, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BANNERS = [
  { id: '1', title: 'Great Indian Auto Fest 2026', location: 'Home Hero Carousel', targetUrl: '/search?category=cars', status: 'Live' },
  { id: '2', title: 'Top Deals on Verified Mobiles', location: 'Electronics Category Header', targetUrl: '/search?category=mobiles', status: 'Live' },
  { id: '3', title: 'Sell Commercial Vehicles Fast', location: 'Commercial Vehicles Ribbon', targetUrl: '/post-ad', status: 'Scheduled' },
];

export function PromotionsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Promotions & Banners</h2>
          <p className="text-sm text-muted-foreground">
            Content Manager suite for homepage hero announcements, urgent badges, and promotional campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/revenue-policy')}
            className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
          >
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span>Revenue Policy</span>
          </Button>
          <Button className="gap-1.5 h-9 text-xs font-bold cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>New Banner</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {BANNERS.map((banner) => (
          <Card key={banner.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Badge variant={banner.status === 'Live' ? 'success' : 'secondary'}>
                {banner.status}
              </Badge>
              <Megaphone className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="text-base font-semibold">{banner.title}</div>
              <div className="text-xs text-muted-foreground">Placement: {banner.location}</div>
              <div className="text-xs font-mono text-primary truncate">Link: {banner.targetUrl}</div>
              <div className="pt-3 flex gap-2">
                <Button size="sm" variant="outline" className="h-8 flex-1 text-xs">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive">
                  Pause
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

