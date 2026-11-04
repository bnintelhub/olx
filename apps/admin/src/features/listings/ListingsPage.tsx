import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency } from '../../lib/utils';
import { Check, X, Search, Eye } from 'lucide-react';

interface AdItem {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  date: string;
}

const MOCK_ADS: AdItem[] = [
  { id: '1', title: 'iPhone 15 Pro Max 256GB Desert Titanium', price: 92000, category: 'Mobiles', seller: 'Rahul S.', status: 'PENDING', date: '2026-03-01' },
  { id: '2', title: 'Hyundai Creta SX (O) Diesel Auto 2023', price: 1650000, category: 'Cars', seller: 'Dealer Prime', status: 'ACTIVE', date: '2026-03-02' },
  { id: '3', title: 'Sony PlayStation 5 Disc Edition + 2 Controllers', price: 38000, category: 'Electronics', seller: 'Amit V.', status: 'PENDING', date: '2026-03-03' },
  { id: '4', title: 'Luxury 3 BHK Flat in Whitefield Bangalore', price: 12500000, category: 'Properties', seller: 'Bangalore Living', status: 'ACTIVE', date: '2026-02-28' },
  { id: '5', title: 'Spam Crypto Scheme Offer', price: 100, category: 'Services', seller: 'Unknown Scammer', status: 'REJECTED', date: '2026-02-27' },
];

export function ListingsPage() {
  const [ads, setAds] = useState<AdItem[]>(MOCK_ADS);
  const [search, setSearch] = useState('');

  const filtered = ads.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = (id: string, status: 'ACTIVE' | 'REJECTED') => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Classified Ads & Moderation</h2>
          <p className="text-sm text-muted-foreground">
            Review submitted advertisements, approve verified listings, and reject spam.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Listings Queue</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by title or category..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{ad.title}</div>
                    <div className="text-xs text-muted-foreground">ID: #{ad.id} • {ad.date}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ad.category}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCurrency(ad.price)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{ad.seller}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ad.status === 'ACTIVE'
                          ? 'success'
                          : ad.status === 'PENDING'
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {ad.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {ad.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(ad.id, 'ACTIVE')}
                          className="h-8 text-emerald-600 hover:text-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(ad.id, 'REJECTED')}
                          className="h-8 text-destructive hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

