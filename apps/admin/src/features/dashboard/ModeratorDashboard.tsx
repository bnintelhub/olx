import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { useDashboardStats, usePendingAds } from './hook/useDashboardQuery';
import { useReviewAd } from './hook/useDashboardMutation';

export function ModeratorDashboard() {
  const { data: stats, refetch: refetchStats } = useDashboardStats('MODERATOR');
  const { data: pendingAds = [], isLoading, isFetching, refetch: refetchAds } = usePendingAds();
  const reviewMutation = useReviewAd();

  const handleApprove = (id: string) => {
    reviewMutation.mutate({ id, action: 'APPROVE' });
  };

  const handleReject = (id: string) => {
    reviewMutation.mutate({
      id,
      action: 'REJECT',
      rejectionReason: 'Violates marketplace listing guidelines or counterfeit concern',
    });
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchAds();
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="warning" className="px-3 py-1 font-semibold text-xs">
            Safety Shield Active
          </Badge>
        </div>
      </div>

      {/* 4 Moderation KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">In Review Queue</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {stats?.pendingReviews ?? pendingAds.length} Pending
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires human review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">High Priority Flags</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.highRiskItems ?? 0} Flags
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">User report escalations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Safety Reports</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openReports ?? 0} Reports</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Under active monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Reviewed Today</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.reviewedToday ?? 0} Actions
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Staff decisions logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue Listing Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Pending Items ({pendingAds.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Inspect image, pricing, and seller history before deciding.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Live Feed
          </Badge>
        </CardHeader>

        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading moderation queue...</p>
            </div>
          ) : pendingAds.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-1">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
              <p className="font-semibold text-foreground text-sm mt-2">All clear!</p>
              <p>No pending listings awaiting review at this time. All queue items are processed.</p>
            </div>
          ) : (
            pendingAds.map((item) => {
              const imageSrc =
                (item.images?.[0] as any)?.url ||
                item.images?.[0]?.originalUrl ||
                null;
              const seller =
                item.user?.profile?.name || item.user?.phoneNumber || 'Marketplace Seller';
              const category = item.category?.name || 'General';
              const formattedPrice = `₹${Number(item.price || 0).toLocaleString('en-IN')}`;
              const reportReason =
                item.reports?.[0]?.reason
                  ? String(item.reports[0].reason).replace(/_/g, ' ')
                  : 'New listing submission pending review';
              const isUrgent = Boolean(item.reports && item.reports.length > 0);

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg border shrink-0 bg-muted overflow-hidden flex items-center justify-center">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const parent = (e.currentTarget as HTMLElement).parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.mod-thumb-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`mod-thumb-fallback ${imageSrc ? 'hidden' : 'flex'} items-center justify-center text-muted-foreground`}>
                        <ImageIcon className="h-5 w-5 opacity-40" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-foreground">{item.title}</h4>
                        <Badge
                          variant={isUrgent ? 'destructive' : 'warning'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {isUrgent ? 'FLAGGED' : 'PENDING'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        <span>
                          Seller: <strong className="text-foreground">{seller}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Category: <strong className="text-foreground">{category}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Price: <strong className="text-foreground">{formattedPrice}</strong>
                        </span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        ⚠️ {reportReason}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleApprove(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1 text-xs h-8"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReject(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
