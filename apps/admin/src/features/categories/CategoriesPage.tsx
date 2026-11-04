import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { FolderTree, Plus, Sparkles } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  adsCount: number;
  featured: boolean;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Cars & Commercial Vehicles', slug: 'cars', adsCount: 2410, featured: true },
  { id: '2', name: 'Mobiles & Tablets', slug: 'mobiles', adsCount: 3120, featured: true },
  { id: '3', name: 'Properties & Real Estate', slug: 'properties', adsCount: 1890, featured: true },
  { id: '4', name: 'Electronics & Appliances', slug: 'electronics', adsCount: 940, featured: false },
  { id: '5', name: 'Bikes & Scooters', slug: 'bikes', adsCount: 1420, featured: true },
  { id: '6', name: 'Furniture & Home Decor', slug: 'furniture', adsCount: 680, featured: false },
];

export function CategoriesPage() {
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Categories & Taxonomy</h2>
          <p className="text-sm text-muted-foreground">
            Configure marketplace hierarchy, dynamic custom fields, and featured taxonomy groups.
          </p>
        </div>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Marketplace Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Active Ads</TableHead>
                <TableHead>Highlight</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium text-foreground flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    <span>{cat.name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">/{cat.slug}</TableCell>
                  <TableCell className="font-semibold">{cat.adsCount.toLocaleString()} ads</TableCell>
                  <TableCell>
                    {cat.featured ? (
                      <Badge variant="success" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Homepage Featured</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline">Standard</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      Edit Attributes
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

