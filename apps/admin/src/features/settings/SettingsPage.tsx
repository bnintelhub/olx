import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Settings, Save } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Platform Settings</h2>
        <p className="text-sm text-muted-foreground">
          Global marketplace parameters, moderation sensitivity, OTP timeouts, and maintenance triggers.
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <span>Authentication & Security Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">OTP Expiry (Seconds)</label>
              <Input defaultValue="300" type="number" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Resend Cooldown (Seconds)</label>
              <Input defaultValue="45" type="number" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Max Failed OTP Attempts</label>
              <Input defaultValue="3" type="number" />
            </div>

            <Button className="gap-1.5 mt-2">
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
