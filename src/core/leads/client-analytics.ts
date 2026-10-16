import type { FunnelEventName } from "./model";

export function trackFunnelEvent(event: FunnelEventName): void {
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}
