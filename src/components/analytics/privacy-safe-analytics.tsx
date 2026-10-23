"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function removeUrlParameters(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url, window.location.origin);
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function PrivacySafeAnalytics() {
  return <Analytics beforeSend={removeUrlParameters} />;
}
