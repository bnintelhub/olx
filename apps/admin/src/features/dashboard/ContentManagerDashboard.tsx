import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  Image,
  FolderTree,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useDashboardStats, useCategoriesList } from './hook/useDashboardQuery';

export function ContentManagerDashboard() {
  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useDashboardStats('CONTENT_MANAGER');
  const { data: categories = [], isLoading: catLoading, isFetching: catFetching, refetch: refetchCats } = useCategoriesList();

  const handleRefresh = () => {
    refetchStats();
    refetchCats();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Content & CMS Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage banners, taxonomy categories, featured collections, and promotional slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsFetching || catFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${statsFetching || catFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold border-primary/20 text-primary">
            CMS Engine Active
          </Badge>
        </div>
      </div>

      {/* 4 Content KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Categories</span>
            <FolderTree className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats?.totalCategories ?? categories.length} Categories
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Marketplace taxonomy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Hero Banners</span>
            <Image className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats?.activeBanners ?? 0} Active
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Platform visual campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Featured Promotions</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats?.activePromotions ?? 0} Live
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Active promoted listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Pending Review</span>
            <ShoppingBag className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats?.pendingAds ?? 0} Ads
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Editorial check queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Taxonomy Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Category Taxonomy & Structure</CardTitle>
            <p className="text-xs text-muted-foreground">Live marketplace categories registered in the database.</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {categories.length} Registered
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-5 py-3">Category Name</TableHead>
                <TableHead className="px-5 py-3">Slug Identifier</TableHead>
                <TableHead className="px-5 py-3">ID</TableHead>
                <TableHead className="px-5 py-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Loading categories...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-xs">
                    No categories configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id} className="hover:bg-muted/30">
                    <TableCell className="px-5 py-3 font-bold text-xs text-foreground">
                      {cat.name}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs font-mono text-muted-foreground">
                      /{cat.slug}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-xs font-mono text-muted-foreground">
                      {cat.id}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
                        ACTIVE
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
