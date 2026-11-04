import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Image as ImageIcon, Trash2, ShieldCheck } from 'lucide-react';

const MOCK_MEDIA = [
  { id: '1', name: 'creta_front_angle.jpg', size: '2.4 MB', uploadDate: '2026-03-02', status: 'Clean' },
  { id: '2', name: 'iphone15_box_imei.jpg', size: '1.8 MB', uploadDate: '2026-03-01', status: 'Clean' },
  { id: '3', name: 'flat_hall_balcony.png', size: '4.2 MB', uploadDate: '2026-03-01', status: 'Clean' },
  { id: '4', name: 'bike_yamaha_r15.jpg', size: '3.1 MB', uploadDate: '2026-02-28', status: 'Clean' },
];

export function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Media & Asset Review</h2>
        <p className="text-sm text-muted-foreground">
          Inspect uploaded product pictures, KYC documents, and auto-scanned media assets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {MOCK_MEDIA.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="h-36 bg-muted/60 flex items-center justify-center border-b">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-semibold truncate">{item.name}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.size}</span>
                <Badge variant="success" className="text-[10px] gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>{item.status}</span>
                </Badge>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">{item.uploadDate}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

