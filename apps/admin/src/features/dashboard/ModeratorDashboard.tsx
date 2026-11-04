import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ModerationItem {
  id: string;
  title: string;
  sellerName: string;
  category: string;
  price: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM';
  submittedTime: string;
  imageUrl: string;
}

const INITIAL_QUEUE: ModerationItem[] = [
  {
    id: 'mod_1',
    title: 'iPhone 15 Pro Max 256GB - Brand New Sealed',
    sellerName: 'Sameer Verma',
    category: 'Mobiles',
    price: '₹22,000',
    reason: 'Price suspiciously low (Possible counterfeit or advance fee scam)',
    severity: 'HIGH',
    submittedTime: '8 mins ago',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=120&auto=format&fit=crop&q=60',
  },
  {
    id: 'mod_2',
    title: 'Royal Enfield Classic 350 - Urgent Cash Sale',
    sellerName: 'Kunal Joshi',
    category: 'Vehicles',
    price: '₹45,000',
    reason: 'Missing RC document / Registration details unverified',
    severity: 'HIGH',
    submittedTime: '18 mins ago',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=60',
  },
  {
    id: 'mod_3',
    title: 'Sony PlayStation 5 Disc Edition + 2 Controllers',
    sellerName: 'Deepak Rao',
    category: 'Electronics',
    price: '₹34,000',
    reason: 'Duplicate listing detected across multiple cities',
    severity: 'MEDIUM',
    submittedTime: '32 mins ago',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=120&auto=format&fit=crop&q=60',
  },
  {
    id: 'mod_4',
    title: '2 BHK Luxury Apartment Whitefield Bangalore',
    sellerName: 'Apex Properties',
    category: 'Real Estate',
    price: '₹75,00,000',
    reason: 'Watermark of competitor classifieds portal on pictures',
    severity: 'MEDIUM',
    submittedTime: '45 mins ago',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&auto=format&fit=crop&q=60',
  },
];

export function ModeratorDashboard() {
  const [queue, setQueue] = useState<ModerationItem[]>(INITIAL_QUEUE);
  const [reviewedToday, setReviewedToday] = useState(186);

  const handleApprove = (id: string, title: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setReviewedToday((c) => c + 1);
    toast.success(`Approved listing: "${title}"`);
  };

  const handleReject = (id: string, title: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setReviewedToday((c) => c + 1);
    toast.error(`Rejected & removed: "${title}"`);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Moderation Queue</h2>
          <p className="text-xs text-muted-foreground">
            Review, approve or reject listings, handle safety reports, and enforce platform trust.
          </p>
        </div>
        <Badge variant="warning" className="px-3 py-1 font-semibold text-xs">
          Safety Shield Active
        </Badge>
      </div>

      {/* 4 Moderation KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">In Review Queue</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{queue.length + 20} Pending</div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires human review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">High Priority Flags</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">8 Flags</div>
            <p className="text-[11px] text-muted-foreground mt-1">User report escalations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Avg Response Time</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14 mins</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Well within SLA (&lt; 30m)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Reviewed Today</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{reviewedToday} Ads</div>
            <p className="text-[11px] text-muted-foreground mt-1">94% automated approvals</p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue Listing Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Pending Items ({queue.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Inspect image, pricing, and seller history before deciding.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-refresh: 15s
          </Badge>
        </CardHeader>

        <CardContent className="divide-y p-0">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              All pending moderation items resolved! Great work keeping the marketplace clean.
            </div>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition">
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-16 w-16 rounded-lg object-cover border shrink-0 bg-muted"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-foreground">{item.title}</h4>
                      <Badge variant={item.severity === 'HIGH' ? 'destructive' : 'warning'} className="text-[9px] px-1.5 py-0">
                        {item.severity}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      <span>Seller: <strong className="text-foreground">{item.sellerName}</strong></span>
                      <span>•</span>
                      <span>Category: <strong className="text-foreground">{item.category}</strong></span>
                      <span>•</span>
                      <span>Price: <strong className="text-foreground">{item.price}</strong></span>
                      <span>•</span>
                      <span>{item.submittedTime}</span>
                    </div>

                    <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      ⚠️ {item.reason}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8"
                    onClick={() => handleApprove(item.id, item.title)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 text-xs h-8"
                    onClick={() => handleReject(item.id, item.title)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

