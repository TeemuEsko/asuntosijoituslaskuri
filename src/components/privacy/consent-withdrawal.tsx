"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsentWithdrawal() {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  async function revoke() {
    setState("pending");
    try {
      const response = await fetch("/api/consent/revoke", { method: "POST", credentials: "same-origin" });
      setState(response.ok ? "success" : "error");
    } catch { setState("error"); }
  }
  return <div className="space-y-3">
    <Button type="button" variant="outline" disabled={state === "pending" || state === "success"} onClick={revoke}>
      {state === "pending" ? "Peruutetaan…" : state === "success" ? "Markkinointilupa peruutettu" : "Peruuta markkinointilupa"}
    </Button>
    {state === "error" ? <p role="alert" className="text-sm text-danger">Peruuttaminen epäonnistui. Varmista, että käytät samaa selainta, tai ota yhteyttä rekisterinpitäjään.</p> : null}
  </div>;
}
