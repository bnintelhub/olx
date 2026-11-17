import type { RealtimeMetricsData } from '../features/payments/service/payments.service';

export type AdminSseEvent =
  | { type: 'ready'; data: { stream: string; reconnectAfterMs: number } }
  | { type: 'dashboard_stats'; data: Record<string, unknown> }
  | { type: 'reports_update'; data: { openReports: number; emittedAt: string } }
  | { type: 'metrics_update'; data: RealtimeMetricsData };

export function connectAdminEvents(
  role: string | undefined,
  onEvent: (event: AdminSseEvent) => void,
  onStateChange?: (connected: boolean) => void,
): () => void {
  const roleQuery = role ? `?role=${encodeURIComponent(role)}` : '';
  const source = new EventSource(`/api/v1/admin/events/stream${roleQuery}`, {
    withCredentials: true,
  });

  const handle = (type: AdminSseEvent['type']) => (event: MessageEvent<string>) => {
    try {
      onEvent({ type, data: JSON.parse(event.data) });
    } catch (error) {
      console.warn(`[Admin SSE] Invalid ${type} event`, error);
    }
  };

  const readyHandler = handle('ready');
  const statsHandler = handle('dashboard_stats');
  const reportsHandler = handle('reports_update');
  const metricsHandler = handle('metrics_update');
  source.addEventListener('open', () => onStateChange?.(true));
  source.addEventListener('error', () => onStateChange?.(false));
  source.addEventListener('ready', readyHandler);
  source.addEventListener('dashboard_stats', statsHandler);
  source.addEventListener('reports_update', reportsHandler);
  source.addEventListener('metrics_update', metricsHandler);

  return () => {
    source.removeEventListener('ready', readyHandler);
    source.removeEventListener('dashboard_stats', statsHandler);
    source.removeEventListener('reports_update', reportsHandler);
    source.removeEventListener('metrics_update', metricsHandler);
    source.close();
    onStateChange?.(false);
  };
}
