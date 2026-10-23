"use client";

import { track } from "@vercel/analytics";

export type ProductEventName =
  | "calculator_used"
  | "report_downloaded"
  | "analysis_order_clicked"
  | "kajabi_redirect_clicked";

export type ProductEventProperties = {
  destination?: "training" | "professional_evaluation";
  placement?: "analysis" | "footer";
};

const lastEventTimes = new Map<string, number>();
const duplicateWindowMs = 1_000;

type EventSender = (
  name: ProductEventName,
  properties?: ProductEventProperties,
) => void;

export function createProductEventTracker(
  send: EventSender,
  now: () => number = Date.now,
): EventSender {
  return (name, properties) => {
    const key = `${name}:${JSON.stringify(properties ?? {})}`;
    const timestamp = now();
    const previous = lastEventTimes.get(key);
    if (
      previous !== undefined &&
      timestamp - previous < duplicateWindowMs
    )
      return;
    lastEventTimes.set(key, timestamp);
    send(name, properties);
  };
}

export const trackProductEvent = createProductEventTracker(track);
